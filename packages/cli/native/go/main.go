// Command tsoa-metadata generates tsoa's controller metadata inside the TypeScript 7 compiler.
//
// It reads one JSON request from stdin and writes the metadata, or an error, as JSON to stdout. Metadata objects
// are JSON objects in the shape of @tsoa/runtime's `Tsoa.Metadata`. Reference types are written once, in
// `referenceTypeMap`; everywhere else they are `{"$tsoaRef": refName}`, which the JavaScript side links back to
// the shared objects of the map.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"runtime/debug"
	"runtime/pprof"
	"time"

	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/bundled"
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
	g := &generator{defaultNumberType: req.DefaultNumberType, ignorePaths: req.IgnorePaths, rootSecurity: req.RootSecurity}
	defer func() {
		warnings = g.warnings
		checks = g.checks
		if r := recover(); r != nil {
			if metadataError, ok := r.(*MetadataError); ok {
				err = metadataError
				return
			}
			err = fmt.Errorf("%v\n%s", r, debug.Stack())
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
	checker, done := program.GetTypeChecker(context.Background())
	defer done()

	g.program = program
	g.checker = checker
	result := g.Generate(program.GetSourceFiles())
	generated := time.Now()
	metadata, err = encodeMetadata(result, g.referenceTypeMap)
	if os.Getenv("TSOA_NATIVE_TIMING") != "" {
		fmt.Fprintf(os.Stderr, "program %v, generate %v, encode %v\n", parsed.Sub(start), generated.Sub(parsed), time.Since(generated))
	}
	return metadata, g.warnings, g.checks, err
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
	out, err := json.Marshal(r)
	if err != nil {
		fail(err.Error())
	}
	_, _ = os.Stdout.Write(out)
}

func fail(message string) {
	fmt.Fprintln(os.Stderr, message)
	os.Exit(1)
}
