import { getApi, type CompilerOptions } from '@tsoa/cli/ts';

/** The messages of the syntactic, semantic and global diagnostics that the TypeScript 7 compiler reports for a program, or for one file of it. */
export function compilerDiagnostics(rootFiles: string[], compilerOptions: CompilerOptions, file?: string): string[] {
  const program = getApi().createProgram(rootFiles, compilerOptions);
  try {
    const diagnostics = [...program.getSyntacticDiagnostics(file), ...program.getSemanticDiagnostics(file), ...(file ? [] : program.getGlobalDiagnostics())];
    return diagnostics.map(diagnostic => diagnostic.text);
  } finally {
    program.dispose();
  }
}
