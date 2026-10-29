package main

import (
	"bytes"
	"encoding/json"

	"github.com/microsoft/TypeScript/tsc/internal/api"
	"github.com/microsoft/TypeScript/tsc/internal/ast"
	"github.com/microsoft/TypeScript/tsc/internal/bundled"
	"github.com/microsoft/TypeScript/tsc/internal/diagnosticwriter"
	"github.com/microsoft/TypeScript/tsc/internal/tsoptions"
	"github.com/microsoft/TypeScript/tsc/internal/tspath"
	"github.com/microsoft/TypeScript/tsc/internal/vfs/osvfs"
)

type configResponse struct {
	// Options are the configuration's compiler options, in the shape the compiler's API gives them.
	Options json.RawMessage `json:"options,omitempty"`
	// Errors are the configuration's diagnostics, formatted as `tsc` prints them.
	Errors string `json:"errors,omitempty"`
}

// Diagnostics that a configuration lists no input files: they only matter when the configuration itself is built.
var noInputDiagnostics = map[int32]bool{18002: true, 18003: true}

// parseConfig parses a tsconfig.json file the way the compiler's API does (`parseConfigFile`).
func parseConfig(configFile, currentDirectory string) configResponse {
	fs := bundled.WrapFS(osvfs.FS())
	cwd := tspath.RootedDirectoryPathFromAbsolute(currentDirectory)
	fileName := tspath.ToRootedFilePath(configFile, cwd)
	text, ok := fs.ReadFile(fileName)
	if !ok {
		return configResponse{Errors: "Cannot read file '" + string(fileName) + "'."}
	}
	source := tsoptions.NewTsconfigSourceFileFromFilePath(fileName, fs.CaseSensitivity().PathKey(tspath.RootedPath(fileName)), text)
	parsed := tsoptions.ParseJsonSourceFileConfigFileContent(source, fs, fileName.Directory(), nil, nil, nil, nil)

	var errors []*ast.Diagnostic
	for _, diagnostic := range parsed.Errors {
		if !noInputDiagnostics[diagnostic.Code()] {
			errors = append(errors, diagnostic)
		}
	}
	if len(errors) > 0 {
		var out bytes.Buffer
		diagnosticwriter.WriteFormatDiagnostics(&out, diagnosticwriter.FromASTDiagnostics(errors), &diagnosticwriter.FormattingOptions{
			CaseSensitivity:  fs.CaseSensitivity(),
			CurrentDirectory: cwd,
			NewLine:          "\n",
		})
		return configResponse{Errors: out.String()}
	}
	options, err := json.Marshal(api.NewConfigFileResponse(parsed).Options)
	if err != nil {
		return configResponse{Errors: err.Error()}
	}
	return configResponse{Options: options}
}
