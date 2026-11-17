/**
 * A TypeScript 6 Program and TypeChecker whose semantics come from a native helper (tsgo or tsrs) over the tsoa
 * facts protocol (./protocol.ts). Syntax stays on TypeScript 6: every source file is parsed with
 * `ts.createSourceFile`, and its nodes are the ones tsoa walks. Types and symbols are TypeScript 6 objects whose fields
 * come from the helper's facts and whose `checker` is the native checker, so their own methods forward to it.
 */
import type * as ts from 'typescript';
import type { MetadataProgram } from '../metadataProgram';
import { openChannel, type Channel } from './channel';
import { createNativeChecker } from './checker';
import { createNativeObjects } from './objects';
import { openHelperSession } from './session';
import { createSourceIndex } from './sourceIndex';

export function createNativeProgram(helperPath: string, rootFiles: readonly string[], compilerOptions: ts.CompilerOptions): MetadataProgram {
  return createProgramOverChannel(openChannel(helperPath), rootFiles, compilerOptions);
}

/** Closes the channel if the program cannot be made. */
export function createProgramOverChannel(channel: Channel, rootFiles: readonly string[], compilerOptions: ts.CompilerOptions): MetadataProgram {
  try {
    const session = openHelperSession(channel, rootFiles, compilerOptions);
    const index = createSourceIndex(session, rootFiles, compilerOptions);
    const objects = createNativeObjects(session, index);
    index.bindDeclarationSymbols(objects.symbolOf);
    const checker = createNativeChecker(session, index, objects) as unknown as ts.TypeChecker;
    objects.setChecker(checker);
    return {
      getTypeChecker: () => checker,
      getSourceFiles: index.ownFiles,
      isSourceFileDefaultLibrary: index.isDefaultLibrary,
      close: session.close,
    };
  } catch (error) {
    channel.close();
    throw error;
  }
}
