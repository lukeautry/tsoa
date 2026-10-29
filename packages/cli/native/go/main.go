// Command tsoa-metadata generates tsoa's controller metadata inside the TypeScript 7 compiler.
//
// It reads one JSON request from stdin and writes the metadata, or an error, as JSON to stdout. Metadata objects
// are JSON objects in the shape of @tsoa/runtime's `Tsoa.Metadata`. Reference types are written once, in
// `referenceTypeMap`; everywhere else they are `{"$tsoaRef": refName}`, which the JavaScript side links back to
// the shared objects of the map.
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"runtime"
	"runtime/debug"
	"runtime/pprof"
	"strconv"
	"sync"
	"time"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/bundled"
	"github.com/microsoft/TypeScript/tsc/internal/checker"
	"github.com/microsoft/TypeScript/tsc/internal/compiler"
	"github.com/microsoft/TypeScript/tsc/internal/tsoptions"
	"github.com/microsoft/TypeScript/tsc/internal/tspath"
	"github.com/microsoft/TypeScript/tsc/internal/vfs/osvfs"
)

type request struct {
	// Command is "metadata" (the default) or "parseConfig".
	Command           string                        `json:"command"`
	ConfigFile        string                        `json:"configFile"`
	CurrentDirectory  string                        `json:"currentDirectory"`
	RootFiles         []string                      `json:"rootFiles"`
	CompilerOptions   *tsoptions.RawCompilerOptions `json:"compilerOptions"`
	IgnorePaths       []string                      `json:"ignorePaths"`
	RootSecurity      []any                         `json:"rootSecurity"`
	DefaultNumberType string                        `json:"defaultNumberType"`
}

type response struct {
	Metadata json.RawMessage `json:"metadata,omitempty"`
	Error    string          `json:"error,omitempty"`
	Warnings []string        `json:"warnings,omitempty"`
	Checks   []check         `json:"checks,omitempty"`
}

func main() {
	// A generation is short-lived: collect garbage only when memory gets tight, not as the heap grows.
	debug.SetGCPercent(-1)
	debug.SetMemoryLimit(2 << 30)
	if profile := os.Getenv("TSOA_NATIVE_CPUPROFILE"); profile != "" {
		if file, err := os.Create(profile); err == nil {
			_ = pprof.StartCPUProfile(file)
			defer pprof.StopCPUProfile()
		}
	}
	input, err := io.ReadAll(os.Stdin)
	if err != nil {
		fail(err.Error())
	}
	var req request
	if err := json.Unmarshal(input, &req); err != nil {
		fail("invalid request: " + err.Error())
	}
	if req.Command == "parseConfig" {
		out, err := json.Marshal(parseConfig(req.ConfigFile, req.CurrentDirectory))
		if err != nil {
			fail(err.Error())
		}
		_, _ = os.Stdout.Write(out)
		return
	}
	metadata, warnings, checks, err := generate(&req)
	if err != nil {
		write(response{Error: err.Error(), Warnings: warnings, Checks: checks})
		return
	}
	write(response{Metadata: metadata, Warnings: warnings, Checks: checks})
}

func generate(req *request) (metadata json.RawMessage, warnings []string, checks []check, err error) {
	newGenerator := func() *generator {
		g := &generator{defaultNumberType: req.DefaultNumberType, ignorePaths: req.IgnorePaths, rootSecurity: req.RootSecurity}
		g.init()
		return g
	}
	g := newGenerator()
	defer func() {
		warnings = g.warnings
		checks = g.checks
		if r := recover(); r != nil {
			err = recoveredError(r)
		}
	}()

	cwd := tspath.RootedDirectoryPathFromAbsolute(req.CurrentDirectory)
	options, _ := req.CompilerOptions.Finalize(cwd)
	rootFiles := make([]tspath.RootedFilePath, len(req.RootFiles))
	for i, file := range req.RootFiles {
		rootFiles[i] = tspath.ToRootedFilePath(file, cwd)
	}
	fs := bundled.WrapFS(osvfs.FS())
	config := tsoptions.NewParsedCommandLine(options, rootFiles, nil, cwd, fs.CaseSensitivity())
	host := compiler.NewCompilerHost(fs, bundled.LibPath(), nil, nil, nil)
	start := time.Now()
	program := compiler.NewProgram(compiler.ProgramOptions{Host: host, Config: config})
	parsed := time.Now()
	g.program = program
	controllerNodes := g.findControllers(program.GetSourceFiles())

	// Consecutive runs of controllers are generated in parallel, each by a generator with a checker of its own:
	// a checker serves one goroutine at a time. The generators then merge in the order of their controllers.
	workers := workerCount(len(controllerNodes))
	generators := make([]*generator, workers)
	results := make([][]any, workers)
	failures := make([]error, workers)
	durations := make([]string, workers)
	var wg sync.WaitGroup
	for i := range workers {
		worker := g
		if i > 0 {
			worker = newGenerator()
			worker.program = program
		}
		generators[i] = worker
		wg.Go(func() {
			defer func() {
				if r := recover(); r != nil {
					failures[i] = recoveredError(r)
				}
			}()
			began := time.Now()
			worker.checker, _ = checker.NewChecker(program, nil)
			checking := time.Now()
			results[i] = worker.generateControllers(controllerNodes[i*len(controllerNodes)/workers : (i+1)*len(controllerNodes)/workers])
			durations[i] = fmt.Sprintf("%.0f+%.0f", checking.Sub(began).Seconds()*1000, time.Since(checking).Seconds()*1000)
		})
	}
	wg.Wait()
	controllers := []any{}
	for i, worker := range generators {
		if i > 0 {
			g.merge(worker)
		}
		if failures[i] != nil {
			return nil, g.warnings, g.checks, failures[i]
		}
		controllers = append(controllers, results[i]...)
	}
	generated := time.Now()
	metadata, err = encodeMetadata(controllers, g.referenceTypeMap)
	if os.Getenv("TSOA_NATIVE_TIMING") != "" {
		fmt.Fprintf(os.Stderr, "program %v, generate %v (%d workers: %v ms), encode %v\n", parsed.Sub(start), generated.Sub(parsed), workers, durations, time.Since(generated))
	}
	return metadata, g.warnings, g.checks, err
}

// workerCount is the number of generators for a number of controllers: a checker of its own costs a generator
// the types other generators resolve too, which pays off for runs of controllersPerWorker controllers.
// TSOA_NATIVE_WORKERS sets the number.
func workerCount(controllers int) int {
	if n, err := strconv.Atoi(os.Getenv("TSOA_NATIVE_WORKERS")); err == nil && n > 0 {
		return min(n, controllers)
	}
	const controllersPerWorker = 16
	return max(1, min(runtime.GOMAXPROCS(0), controllers/controllersPerWorker))
}

// recoveredError is the error of a recovered panic: a metadata error as it is, anything else with its stack.
func recoveredError(r any) error {
	if metadataError, ok := r.(*MetadataError); ok {
		return metadataError
	}
	return fmt.Errorf("%v\n%s", r, debug.Stack())
}

// MetadataError is tsoa's GenerateMetadataError: a problem in the user's code, reported with its location.
type MetadataError struct {
	Message string
}

func (e *MetadataError) Error() string { return e.Message }

// throwError reports a metadata error at a node, like `throw new GenerateMetadataError(message, node)`.
func throwError(message string, node *ast.Node) {
	panic(&MetadataError{Message: metadataErrorMessage(message, node, false)})
}

func write(r response) {
	// The metadata is written as it is: marshalling the response would validate and copy all of it again.
	metadata := r.Metadata
	r.Metadata = nil
	out, err := json.Marshal(r)
	if err != nil {
		fail(err.Error())
	}
	if metadata != nil {
		_, _ = os.Stdout.Write(append([]byte(`{"metadata":`), metadata...))
		if len(out) > 2 {
			out[0] = ','
		} else {
			out = []byte{'}'}
		}
	}
	_, _ = os.Stdout.Write(out)
}

func fail(message string) {
	fmt.Fprintln(os.Stderr, message)
	os.Exit(1)
}
