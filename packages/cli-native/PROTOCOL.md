# tsoa facts protocol, revision 8

This is the contract between tsoa (`packages/cli/src/metadataGeneration/native/protocol.ts`) and a native compiler helper (`go/`, `rs/`).

tsoa starts one short-lived helper process per generation. The helper loads one program with one checker and answers type and symbol questions about it. tsoa's resolver and all tsoa policy stay in Node.

**Syntax stays in Node.** Node parses every file with TypeScript 6's parser (`ts.createSourceFile`, `setParentNodes: true`). JSDoc, decorators, `getText`, `forEachChild` and every `ts.isX` guard keep running on TypeScript 6 nodes. The helper never sends a syntax tree. A node crosses the boundary only as a `NodeRef`, which the helper resolves in its own tree.

## Transport and framing

Each message is a 4-byte little-endian length followed by that many bytes of UTF-8 JSON. Node writes a request and blocks reading one response. One request is in flight at a time.

- By default the helper reads requests from stdin and writes responses to stdout. stderr is free for logs.
- With `--pipe <path>` the helper listens on that named pipe (Windows) or Unix domain socket, accepts one connection, and serves the same framing over it. Node uses this on Windows, where it cannot read a child's stdout synchronously.

```ts
type Request = { op: 'batch'; queries: Query[] } | Query;
type Response =
  | { ok: true; result: unknown; facts?: { types?: Record<TypeId, TypeFacts>; symbols?: Record<SymbolId, SymbolFacts> } }
  | { ok: false; error: string };
```

A batch answers with `ok: true` and `result: Response[]`, one per query in the same order. One failing query fails only its own slot.

## Identity

- `TypeId` and `SymbolId` are integers the helper assigns, starting at 1. The same checker type or symbol always gets the same id within a session. Node interns one JS object per id, so `===` comparisons in the resolver keep working. Ids mean nothing across sessions.
- `FileId` comes from `open`. Ids follow the program's source file order, starting at 1.
- `NodeRef = { file: FileId; pos: number; end: number; kind: string }`.
  - `pos` and `end` are UTF-16 offsets with TypeScript's meaning: `pos` is the full start, leading trivia included, as in `node.pos`.
  - `kind` is the TypeScript 6 SyntaxKind name, for example `"TypeReference"`, never a number.
  - When several nodes share `pos`, `end` and `kind`, the helper takes the first one in `forEachChild` preorder. JSDoc nodes are not visited.
  - Kinds that differ between parsers: tsgo and tsrs parse an interface's `extends X` and a class's `implements X` element as `TypeReference` where TypeScript 6 has `ExpressionWithTypeArguments`. Every NodeRef and prefetch entry a helper sends names such a node `ExpressionWithTypeArguments`, as TypeScript 6 does. When a NodeRef from Node names a kind on the left, a helper also accepts a node of the kind on the right at the same `pos` and `end`.

    | TypeScript 6 kind | helper may match |
    |---|---|
    | `ExpressionWithTypeArguments` | `TypeReference` |

- Flags cross as lists of enum member names, such as `["Object"]` or `["Union"]`, never as numbers. Node maps names to TypeScript 6 numbers. A helper sends only single-bit members that are set, never aliases or masks (`First*`, `Last*`, `Literal`, `Narrowable`).
- A helper sends only names TypeScript 6 has. Members the native compiler adds for its own bookkeeping (tsgo and tsrs have `MembersResolved`, `FromTypeNode`, `ConstEnumOnlyModule`, `ReplaceableByMethod`) are left out of its flag tables. Node fails on any unknown name with `unknown <TypeFlags|ObjectFlags|SymbolFlags|ElementFlags> name <n> from tsoa compiler helper`.

## Inline facts

Every top-level response may carry `facts`. It holds the `TypeFacts` or `SymbolFacts` of every type and symbol id that this request returned to Node and whose facts the helper has not sent before in the session. Ids that appear only inside the facts themselves (a `TypeFacts.aliasSymbol`, a `SymbolFacts.parent`) are not expanded. Each id's facts are sent at most once per session. The `type` and `symbol` ops keep returning the same facts and do not add their own id to `facts`.

A helper records each id an op returns to Node. After the op, it computes facts for the recorded ids not sent yet; ids that only appear inside facts are not recorded. Facts are computed under the op's own panic handling: a panic while computing them fails that query with an error, as a panic in the op does.

## Operations

| op | input | result |
|---|---|---|
| `open` | `Open` (below) | `{ protocol: 8, files: FileInfo[], undefinedType: TypeId }` |
| `fileText` | `{ file }` | the file's text as the helper's compiler read it, lib files included |
| `prefetchFile` | `{ file }` | `PrefetchResult` (below) |
| `typeAtLocation` | `{ node }` | `TypeId` (`getTypeAtLocation`) |
| `typeFromTypeNode` | `{ node }` | `TypeId` |
| `symbolAtLocation` | `{ node }` | `SymbolId \| null` |
| `symbolOfDeclaration` | `{ node }` | `SymbolId \| null`, the binder's own unmerged symbol of a declaration node |
| `returnTypeOfDeclaration` | `{ node }` | `TypeId \| null` (`getSignatureFromDeclaration` then `getReturnTypeOfSignature`; null when the node is not function-like) |
| `constantValue` | `{ node }` | `string \| number \| null` (`getConstantValue` on an enum member) |
| `resolveName` | `{ name, node, meaning: string[] }` | `SymbolId \| null` (`resolveName(name, location, meaning, excludeGlobals=false)`; `meaning` is SymbolFlags names) |
| `type` | `{ type }` | `TypeFacts` |
| `symbol` | `{ symbol }` | `SymbolFacts` |
| `typeOfSymbol` | `{ symbol }` | `TypeId` |
| `exportOf` | `{ symbol, name }` | `SymbolId \| null`, member `name` of the symbol's own `exports` table (not `export *`) |
| `members` | `{ type }` | `{ properties: [SymbolId, TypeId][], indexInfos: IndexInfo[] }` |
| `property` | `{ type, name }` | `SymbolId \| null` (`getPropertyOfType`) |
| `callSignatures` | `{ type }` | `{ returnType: TypeId }[]` (`getSignaturesOfType(type, Call)`) |
| `nonNullable` | `{ type }` | `TypeId` |
| `union` | `{ types: TypeId[] }` | `TypeId`, built as the checker's `getUnionType` builds it |
| `assignable` | `{ source, target }` | `boolean` (`isTypeAssignableTo`) |
| `typeToString` | `{ type }` | `string`, default flags |
| `print` | `{ type }` | `{ text: string, identifiers: (SymbolId \| null)[] } \| null` |
| `close` | `{}` | `null`, then the helper exits |

### `open`

```ts
type Open = {
  op: 'open';
  cwd: string;
  rootFiles: string[];
  compilerOptions: Record<string, unknown>;   // tsconfig.json `compilerOptions` form: names, not enum numbers ("es2021", ["es2021"], "node16")
};
```

The helper parses `{ compilerOptions, files: rootFiles }` as tsconfig JSON with the compiler's own config parser (tsgo `tsoptions.ParseJsonConfigFileContent`, tsrs `parse_json_config_file_content`), base path `cwd`, config file name `<cwd>/tsconfig.json`. Relative paths in options (`typeRoots`, `paths`, `baseUrl`) resolve against `cwd`. Option diagnostics other than 18002 and 18003 ("no inputs") fail `open` with their messages. Node produces `compilerOptions` from TypeScript 6 options with `ts.convertToTSConfig`.

`protocol` is the revision this document describes. Node refuses any other value, a missing one included, with `tsoa compiler helper speaks protocol <n>, this tsoa needs 8`. Any change to a shape in this document bumps the number in the document, both helpers and `native/program.ts`.

### `prefetchFile`

```ts
type Entry = [pos: number, end: number, kind: string, id: number | null];   // UTF-16 pos/end, TypeScript 6 kind name
type PrefetchResult = { symbolAt: Entry[]; typeFrom: Entry[]; declared: Entry[]; typeOfSymbol: [SymbolId, TypeId][] };
```

The helper walks the file in `forEachChild` preorder, JSDoc not included, visiting every node once.

- `symbolAt`: one entry per `Identifier`, the answer `symbolAtLocation` gives for that node.
- `typeFrom`: one entry per type node (the kinds TypeScript 6's `isTypeNode` accepts), the answer `typeFromTypeNode` gives.
- `declared`: one entry per node that has a binder symbol, the answer `symbolOfDeclaration` gives.
- `typeOfSymbol`: for every distinct symbol in `symbolAt` and `declared` whose flags include `Property`, the pair `[symbol, typeOfSymbol(symbol)]`.
- When two nodes share `pos`, `end` and kind, only the first in preorder is reported.
- Kinds are TypeScript 6 kind names, the kind table under Identity applied, so Node matches entries to its nodes by `pos`, `end` and kind alone.

The answers are the values the single ops return for the same node. Node calls `prefetchFile` once per non-declaration file, the first time it asks about a node in that file. When the answer is `ok: false`, Node stops with `tsoa compiler helper failed on <fileName>: <error>`. Helpers still serve every single op for any node.

### `members`

`properties` is `getPropertiesOfType(type)` in checker order, each paired with `getTypeOfSymbol(property)`. `indexInfos` lists the type's index signatures as `IndexInfo`s. Node calls `members` once per type, the first time it needs properties, a property, index infos, or the type of one of the type's properties. It answers `property(type, name)` from the list by `escapedName`, and falls back to the `property` op when the name is not listed, because `getPropertyOfType` also synthesizes properties on unions and intersections that `getPropertiesOfType` does not list.

### Shapes

```ts
type FileInfo = { id: FileId; fileName: string; isDeclarationFile: boolean; isDefaultLibrary: boolean };

type IndexInfo = { keyType: TypeId; type: TypeId; isReadonly: boolean; declaration?: NodeRef };

type TypeFacts = {
  id: TypeId;
  flags: string[];            // TypeFlags names
  objectFlags: string[];      // ObjectFlags names when flags include Object, [] otherwise
  intrinsicName?: string;     // 'true', 'false', 'error', 'undefined', ...
  value?: string | number | { negative: boolean; base10Value: string };  // literal types only
  symbol?: SymbolId;
  aliasSymbol?: SymbolId;
  aliasTypeArguments?: TypeId[];
  typeArguments?: TypeId[];   // getTypeArguments, for type references only
  types?: TypeId[];           // union and intersection members, checker order
  origin?: TypeId;            // the union as written, when the checker kept one
  target?: TypeId;            // a type reference's generic target
  elementFlags?: string[][];  // tuple targets only: ElementFlags names per element
  isArray: boolean;           // checker isArrayType
  isTuple: boolean;           // checker isTupleType
  baseLiteral?: TypeId;       // getBaseTypeOfLiteralType, for literal and enum-literal types
};

type SymbolFacts = {
  id: SymbolId;
  name: string;
  escapedName: string;        // TypeScript 6 __String form: internal names read "__x", a user "__x" reads "___x"
  flags: string[];            // SymbolFlags names
  declarations: NodeRef[];
  valueDeclaration?: NodeRef;
  parent?: SymbolId;
  aliased?: SymbolId;         // getAliasedSymbol, when flags include Alias
  syntheticOrigin?: SymbolId; // a mapped or spread property's original property
};
```

`true` and `false` carry `intrinsicName` and no `value`, as in TypeScript 6. A BigInt literal zero has `base10Value: "0"`. `elementFlags` appear only on tuple targets: an object type with the `Tuple` object flag that is not a tuple target (a mapped type over a tuple) has none of its own.

## Printing

`print` runs `typeToTypeNode(type, undefined, NoTruncation)`, then the printer with comments removed and LF newlines, and returns the text. `identifiers` lists, in preorder of the printed node, the symbol the node builder attached to each identifier, or `null`. Node re-parses `text` as a type with the TypeScript 6 parser, marks every node synthetic (`pos = end = -1`), and binds its identifiers in preorder to `identifiers`. Node fails when the two preorders differ in length or when an identifier's text differs from its bound symbol's name.

## Name resolution in JSDoc

TypeScript 6 resolves `{@link X}` with `getSymbolAtLocation` on a JSDoc identifier. Helpers do not visit JSDoc nodes, so Node uses `resolveName` with the nearest enclosing non-JSDoc node as the location.

## Known differences between helpers

`conformance/conformance.cjs` compares the two helpers' answers and allows exactly this difference, counting it.

- **Tuple target element type parameters (tsrs).** TypeScript 6 (`createTupleTargetType`) and tsgo mint new element type parameters for each tuple target. tsrs shares one type parameter per element index across all tuple targets (tsrs `crates/tsrs_checker/src/checker_12.rs`, `create_tuple_target_type`; `notes/perf-shared-tuple-elements.md`). So two tuple targets of the same arity have the same `typeArguments` ids in tsrs and different ones in tsgo. The same holds for the types in a tuple target's `members` answer: element property types, Array methods such as `at` instantiated over the element parameters, and the index type. Property symbols are per target in both. tsoa does not observe this, because it reads element types from tuple references (`getTypeArguments` of the reference), whose arguments are the written element types, never from the target.

## Not in the protocol

- Documentation. Node reads JSDoc from TypeScript 6 declaration nodes itself.
- Syntax trees, config parsing details, diagnostics. When `open` fails, `ok: false` carries the message.

## Changelog

1. `ExpressionWithTypeArguments` may match `TypeReference`.
2. `resolveName`.
3. Unknown flag names allowed (closed again in 8).
4. Inline facts and `prefetchFile`.
5. `members`.
6. `open` takes full `compilerOptions`; `tsconfig` and `strictNullChecks` dropped.
7. `IndexInfo.declaration`; element flags on tuple targets only.
8. `open` reports `protocol`; `prefetchFile` failures stop Node; `objectFlags` on object types only; the closed list of flag names without a TypeScript 6 member. Later, without a number change: helpers stop sending the names in that list; the `--pipe` transport; helpers send `ExpressionWithTypeArguments` for heritage-clause type references.
