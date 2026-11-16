/** One conversation with a compiler helper: the `open` handshake, requests, and the facts its answers carry. */
import * as path from 'node:path';
import type * as ts from 'typescript';
import type { Channel } from './channel';
import { optionsDirectory, tsconfigCompilerOptions } from './internals';
import type { Answer, OpenResult, Op, Query, SymbolFacts, SymbolId, TypeFacts, TypeId } from './protocol';

/** The protocol revision (packages/cli-native/PROTOCOL.md) this session speaks; `open` must report the same. */
const protocolRevision = 8;

/** Node queries, answered per node by the source index. */
export type NodeOp = 'symbolAtLocation' | 'typeFromTypeNode' | 'symbolOfDeclaration';

/** Ops `ask` does not cache: they change the session, or their answer is cached where it is used. */
type UncachedOp = 'open' | 'close' | 'prefetchFile' | 'fileText' | 'members' | 'type' | 'symbol' | 'typeOfSymbol' | NodeOp;
export type CachedOp = Exclude<Op, UncachedOp>;

export interface HelperSession {
  readonly opened: OpenResult;
  /** Asks once per distinct query; the answer is a pure function of the query within one session. */
  ask: <O extends CachedOp>(query: Query<O>) => Answer<O>;
  askHelper: <O extends Op>(query: Query<O>, failure?: string) => Answer<O>;
  typeFacts: (type: TypeId) => TypeFacts;
  symbolFacts: (symbol: SymbolId) => SymbolFacts;
  typeOfSymbol: (symbol: SymbolId) => TypeId;
  /** Records `typeOfSymbol` answers that came with another answer (`prefetchFile`, `members`). */
  learnTypesOfSymbols: (pairs: ReadonlyArray<[SymbolId, TypeId]>) => void;
  close: () => void;
}

export function openHelperSession(channel: Channel, rootFiles: readonly string[], compilerOptions: ts.CompilerOptions): HelperSession {
  const inlineTypes = new Map<TypeId, TypeFacts>();
  const inlineSymbols = new Map<SymbolId, SymbolFacts>();
  const typesOfSymbols = new Map<SymbolId, TypeId>();

  const askHelper = <O extends Op>(query: Query<O>, failure = `tsoa compiler helper: ${query.op} failed`): Answer<O> => {
    const response = channel.request(query as Query);
    if (!response.ok) throw new Error(`${failure}: ${response.error}`);
    for (const [id, facts] of Object.entries(response.facts?.types ?? {})) inlineTypes.set(Number(id) as TypeId, facts);
    for (const [id, facts] of Object.entries(response.facts?.symbols ?? {})) inlineSymbols.set(Number(id) as SymbolId, facts);
    return response.result as Answer<O>;
  };
  const memo = new Map<string, unknown>();
  const ask = <O extends CachedOp>(query: Query<O>): Answer<O> => {
    const key = JSON.stringify(query);
    if (memo.has(key)) return memo.get(key) as Answer<O>;
    const result = askHelper(query);
    memo.set(key, result);
    return result;
  };

  const directory = optionsDirectory(compilerOptions) ?? process.cwd();
  const opened = askHelper({
    op: 'open',
    cwd: directory,
    rootFiles: rootFiles.map(file => path.resolve(file)),
    compilerOptions: tsconfigCompilerOptions(compilerOptions, directory),
  });
  if (opened.protocol !== protocolRevision) throw new Error(`tsoa compiler helper speaks protocol ${opened.protocol}, this tsoa needs ${protocolRevision}`);

  return {
    opened,
    ask,
    askHelper,
    typeFacts: type => inlineTypes.get(type) ?? askHelper({ op: 'type', type }),
    symbolFacts: symbol => inlineSymbols.get(symbol) ?? askHelper({ op: 'symbol', symbol }),
    typeOfSymbol: symbol => {
      let type = typesOfSymbols.get(symbol);
      if (type === undefined) {
        type = askHelper({ op: 'typeOfSymbol', symbol });
        typesOfSymbols.set(symbol, type);
      }
      return type;
    },
    learnTypesOfSymbols: pairs => {
      for (const [symbol, type] of pairs) typesOfSymbols.set(symbol, type);
    },
    // A session that is never closed (a MetadataGenerator built but never `Generate()`d) keeps its helper until this
    // process exits.
    close: () => {
      try {
        askHelper({ op: 'close' });
      } catch {
        // A helper that already exited cannot answer; it is killed below either way.
      }
      channel.close();
    },
  };
}
