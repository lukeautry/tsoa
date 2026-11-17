/** TypeScript 6 enum names as the protocol sends them, and their values. */
import * as ts from 'typescript';

type FlagTable = Record<string, string | number>;

/**
 * TypeScript enums declare several names for one value (`Alias = AliasExcludes`, `QualifiedName = FirstNode`).
 * The first declared name is the member's own name; the protocol uses only those.
 */
export function ownNames(table: FlagTable): Map<number, string> {
  const names = new Map<number, string>();
  for (const [name, value] of Object.entries(table)) {
    if (typeof value === 'number' && !names.has(value)) names.set(value, name);
  }
  return names;
}

export function singleBitNames(table: FlagTable, mask: number): string[] {
  return [...ownNames(table)].filter(([value]) => value && (value & (value - 1)) === 0 && (mask & value) === value).map(([, name]) => name);
}

type FlagEnum = 'TypeFlags' | 'ObjectFlags' | 'SymbolFlags' | 'ElementFlags';

const flagTables: Record<FlagEnum, FlagTable> = {
  TypeFlags: ts.TypeFlags,
  ObjectFlags: ts.ObjectFlags,
  SymbolFlags: ts.SymbolFlags,
  ElementFlags: ts.ElementFlags,
};

export function flagValue(flagEnum: FlagEnum, names: string[]): number {
  const table = flagTables[flagEnum];
  let value = 0;
  for (const name of names) {
    const bit = table[name];
    if (typeof bit === 'number') value |= bit;
    else throw new Error(`unknown ${flagEnum} name ${name} from tsoa compiler helper`);
  }
  return value;
}

const kindNames = ownNames(ts.SyntaxKind);
export const kindName = (kind: ts.SyntaxKind) => kindNames.get(kind) ?? String(kind);
