/**
 * Native types and symbols: TypeScript 6 Type and Symbol instances whose fields read the helper's facts on first use.
 * The base constructors assign flags, escapedName and the rest, so instances skip them to keep the prototype getters
 * visible. Ids are interned so `===` keeps meaning "same type".
 */
import type * as ts from 'typescript';
import { flagValue } from './flags';
import { objectConstructors } from './internals';
import type { SymbolFacts, SymbolId, TypeFacts, TypeId } from './protocol';
import type { HelperSession } from './session';
import type { SourceIndex } from './sourceIndex';

export interface NativeType extends ts.Type {
  readonly nativeId: TypeId;
  readonly facts: TypeFacts;
}

export interface NativeSymbol extends ts.Symbol {
  readonly nativeId: SymbolId;
  readonly facts: SymbolFacts;
}

export interface NativeObjects {
  typeOf: { (id: TypeId): NativeType; (id: TypeId | null | undefined): NativeType | undefined };
  symbolOf: (id: SymbolId | null | undefined) => NativeSymbol | undefined;
  /** Gives every type its `checker`, which TypeScript 6's Type methods forward to; called once, before any `typeOf`. */
  setChecker: (checker: ts.TypeChecker) => void;
}

function defineFields<Facts>(prototype: object, fields: Record<string, (facts: Facts) => unknown>) {
  for (const [name, compute] of Object.entries(fields)) {
    const own = (target: object, value: unknown) => Object.defineProperty(target, name, { value, writable: true, enumerable: true, configurable: true });
    Object.defineProperty(prototype, name, {
      configurable: true,
      get(this: { facts: Facts }) {
        const value = compute(this.facts);
        own(this, value);
        return value;
      },
      set(this: object, value: unknown) {
        own(this, value);
      },
    });
  }
}

export function createNativeObjects(session: HelperSession, index: SourceIndex): NativeObjects {
  const constructors = objectConstructors();
  class TypeFromFacts extends constructors.Type {
    declare nativeId: TypeId;
    get facts(): TypeFacts {
      const value = session.typeFacts(this.nativeId);
      Object.defineProperty(this, 'facts', { value });
      return value;
    }
  }
  class SymbolFromFacts extends constructors.Symbol {
    declare nativeId: SymbolId;
    get facts(): SymbolFacts {
      const value = session.symbolFacts(this.nativeId);
      Object.defineProperty(this, 'facts', { value });
      return value;
    }
    get exports(): ts.SymbolTable {
      const id = this.nativeId;
      return { get: (name: ts.__String) => symbolOf(session.ask({ op: 'exportOf', symbol: id, name: String(name) })) } as ts.SymbolTable;
    }
  }
  defineFields<TypeFacts>(TypeFromFacts.prototype, {
    flags: facts => flagValue('TypeFlags', facts.flags),
    objectFlags: facts => flagValue('ObjectFlags', facts.objectFlags),
    symbol: facts => symbolOf(facts.symbol),
    aliasSymbol: facts => symbolOf(facts.aliasSymbol),
    aliasTypeArguments: facts => facts.aliasTypeArguments?.map(typeOf),
    types: facts => facts.types?.map(typeOf),
    origin: facts => typeOf(facts.origin),
    target: facts => typeOf(facts.target),
    intrinsicName: facts => facts.intrinsicName,
    value: facts => (facts.value && typeof facts.value === 'object' ? { negative: facts.value.negative, base10Value: facts.value.base10Value } : facts.value),
    elementFlags: facts => facts.elementFlags?.map(names => flagValue('ElementFlags', names)),
    resolvedTypeArguments: facts => facts.typeArguments?.map(typeOf),
  });
  defineFields<SymbolFacts>(SymbolFromFacts.prototype, {
    flags: facts => flagValue('SymbolFlags', facts.flags),
    escapedName: facts => facts.escapedName,
    declarations: facts => (facts.declarations.length ? facts.declarations.map(index.fromRef) : undefined),
    valueDeclaration: facts => index.fromRef(facts.valueDeclaration),
    parent: facts => symbolOf(facts.parent),
    links: facts => ({ syntheticOrigin: symbolOf(facts.syntheticOrigin) }),
  });

  let checker: ts.TypeChecker | undefined;
  const types = new Map<TypeId, NativeType>();
  const symbols = new Map<SymbolId, NativeSymbol>();
  function typeOf(id: TypeId): NativeType;
  function typeOf(id: TypeId | null | undefined): NativeType | undefined;
  function typeOf(id: TypeId | null | undefined) {
    if (id === null || id === undefined) return undefined;
    let type = types.get(id);
    if (!type) {
      if (!checker) throw new Error('tsoa compiler helper: types are made before the checker exists');
      type = Object.assign(Object.create(TypeFromFacts.prototype) as NativeType, { checker, nativeId: id });
      types.set(id, type);
    }
    return type;
  }
  function symbolOf(id: SymbolId | null | undefined): NativeSymbol | undefined {
    if (id === null || id === undefined) return undefined;
    let symbol = symbols.get(id);
    if (!symbol) {
      symbol = Object.assign(Object.create(SymbolFromFacts.prototype) as NativeSymbol, { nativeId: id });
      symbols.set(id, symbol);
    }
    return symbol;
  }

  return {
    typeOf,
    symbolOf,
    setChecker: value => {
      checker = value;
    },
  };
}
