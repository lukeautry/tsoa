# Compiler backends

The CLI loads the installed `typescript` peer lazily. TypeScript 5.7+ and 6 use
its in-process compiler API. TypeScript 7 uses its native synchronous API over
IPC. The CLI closes the native process and removes its temporary project after
generation, including failures.
Supported TypeScript 7 versions: 7.0.2 and 7.1.0-beta.
The optional tsrs peer is `^0.20.0-ts7.1.0-beta`; 0.18 is no longer supported.
TypeScript 7.1 and tsrs use `sync` and `ast` exports and `createSnapshot` with
`createPrograms`. Only TypeScript 7.0 uses `unstable/sync`, `unstable/ast` and
`updateSnapshot` with `openProject`. tsrs 0.20 also supplies Windows x64 and
Darwin x64 binaries in addition to its Linux and Darwin arm64 binaries.

To opt into the optional `tsrs` peer, install it and run:

```sh
TSOA_COMPILER=tsrs tsoa spec-and-routes
```

`TSOA_COMPILER=typescript` selects the default peer explicitly. Other values
are errors. No tsoa.json setting is added. The exported async generation
functions support native backends; the synchronous `MetadataGenerator` does not.
The repository still builds and runs its main tests with TypeScript 6.
Setting the existing CI resolution to either TypeScript 7 version currently
fails: the CLI build requires classic API declarations absent from the native
peer, ts-node cannot read `ts.sys.fileExists`, and typescript-eslint rejects the
native API. Native backend specs can run with a separate classic ts-node
compiler via `TS_NODE_COMPILER`; this does not make the full TS7 build job pass.
The CI matrix direction is pending; the existing native job has not yet been
updated to the migrated mocha specs or the new tsrs peer.

## Why the facade

Consumers use `ts.X` as both types and values; only a module supplies both
namespaces. `export type * from 'typescript'` does not work because TypeScript's declarations use `export =`.
Each runtime name is listed once, with lazy dispatch through the
active compiler session. A full collapse to one compiler object remains a
follow-up: it requires changing consumer type imports beyond this change's
production diff budget.

## Experimental native limits

Native support is incomplete. These operations fail explicitly:

- Synthetic reference lookup when the compiler cannot resolve a printed type
  name in its original source context.
- Numeric compiler-option overrides without an exported native enum (except
  values inherited unchanged from tsconfig.json). Prefer tsconfig.json for these
  settings.

The generation comparison isolates each fixture controller. The measured runs
used TypeScript 6.0.3, TypeScript 7.0.2 and TypeScript 7.1.0-beta. The tsrs row
was rechecked with 0.20.0-ts7.1.0-beta:

| Backend               | Passed | Failed | Controllers compared with classic | Byte-different files | Semantic differences in Swagger | Native limits on baseline-valid controllers |
| --------------------- | -----: | -----: | --------------------------------: | -------------------: | ------------------------------: | ------------------------------------------: |
| TypeScript 6.0.3      |     44 |     13 |                                 — |                    — |                               — |                                           — |
| TypeScript 7.0.2      |     43 |     14 |                                43 |                   26 |                               0 |                                           1 |
| TypeScript 7.1.0-beta |     43 |     14 |                                43 |                   26 |                               0 |                                           1 |
| tsrs                  |     43 |     14 |                                43 |                   26 |                               0 |                                           1 |

All three native comparison commands pass. Each compares 86 files across 43
controllers: 13 Swagger files and 13 route files differ byte-for-byte. All 43
Swagger files match by meaning under the accepted differences below. The three
native backends produce byte-identical output to each other in all 86 files.
A fresh TypeScript 6 run of `tests/prepare.ts` produces 18 generated spec and
route files byte-identical to rebased master when both runs freeze the existing
`getController` default `new Date()` initializer to the same clock.
Routes are reported as byte differences, not semantically gated. This is not a
claim of full runtime equivalence. The full default fixture was rechecked on
TypeScript 6, not on native backends.
Optional interface, class and compiler-built type properties are supported;
`complexTypeController` GET `/ComplexType/PaginationQuery` now reports both
`sortBy` and `sortOrder` as `required: false` on all three backends.

`yarn build`, `yarn test`, then `yarn lint` pass serially with TypeScript 6.
Lint reports zero errors and the same three unused-variable warnings as fresh
master. The migrated compiler specs live in `tests/unit/compiler/` and are part
of `yarn test`: 15 pass on TypeScript 6, TypeScript 7.1 and tsrs 0.20;
TypeScript 7.0 passes 14 and skips the invalid-tsconfig regression because its
config response has no `errors` field. The full test run passes 2,456 tests
(2,454 main and two ESM).

Run the focused mocha specs from the tests workspace. The existing generation
comparison still requires a build and separate output directories at the same
depth so relative route imports do not add byte differences:

```sh
(cd tests && yarn mocha 'unit/compiler/*.spec.ts')
node tests/compiler/generation.cjs "$CLASSIC_OUTPUT"
# Install/select the native peer, preserving a classic compiler for ts-node:
(cd tests && TS_NODE_COMPILER="$CLASSIC_TYPESCRIPT" yarn mocha 'unit/compiler/*.spec.ts')
node tests/compiler/generation.cjs "$NATIVE_OUTPUT" "$CLASSIC_OUTPUT"
```

Use `TSOA_COMPILER=tsrs` for the optional peer's backend tests and comparison.
The comparison JSON retains `differences` for exact bytes, adds
`semanticDifferences` for the Swagger gate, and identifies its semantic scope in
`semanticFiles`. Unexpected exclusions fail; `getController` remains the one
accepted native limit.

### Differences

Both native backends differ from classic in both `swagger.json` and `routes.ts`
for each controller below (26 files across 13 controllers):

- `complexTypeController`
- `deleteController`
- `deprecatedController`
- `hiddenController`
- `hiddenMethodController`
- `injectParameterController`
- `methodController`
- `patchController`
- `pathlessGetController`
- `postController`
- `putController`
- `rootController`
- `testController`

Known native output differences:

- Enum and union member order, mapped-property key order and `required` list order can differ because native compilers use their own type ids and enumeration order.
- `DanglingContext_number_` descriptions render `{@link TSameNameDifferentValue}` as `TSameNameDifferentValue` because the native documentation API returns rendered link text.

The Swagger gate ignores object-key order and array order only for `enum`,
`required`, `anyOf`, `oneOf` and `allOf`. It accepts the known link rendering only
in `components.schemas.DanglingContext_number_.description`. Other text changes,
array member changes and optionality changes still fail.

The route differences are enum arrays, union `subSchemas` order and
mapped-property object-key order. Route models and per-method parameter schemas
are embedded TypeScript object literals, not a single JSON document; sorting
only enum arrays would leave other differences, and sorting validation unions
would assume runtime behavior the Swagger comparison does not establish.
Routes therefore remain informational rather than adding a parser or asserting
runtime equivalence.

### Excluded fixture controllers

The only baseline-valid controller excluded by each native backend is
`getController`, with these errors:

- TypeScript 7.0.2: `Synthetic type reference lookup is not supported with the typescript compiler backend.`
- tsrs: `Synthetic type reference lookup is not supported with the tsrs compiler backend.`

The TypeScript 7 stack for this remaining failure is below; tsrs follows the
same call chain:

```text
Error: Synthetic type reference lookup is not supported with the typescript compiler backend.
    at Proxy.<anonymous> (packages/cli/dist/compiler/native.js:194:31)
    at TypeResolver.getSymbolAtLocation (packages/cli/dist/metadataGeneration/typeResolver.js:963:49)
    at TypeResolver.getModelTypeDeclarations (packages/cli/dist/metadataGeneration/typeResolver.js:926:27)
    at TypeResolver.calcRefTypeName (packages/cli/dist/metadataGeneration/typeResolver.js:554:39)
    at TypeResolver.calcTypeReferenceTypeName (packages/cli/dist/metadataGeneration/typeResolver.js:764:34)
    at TypeResolver.getReferenceType (packages/cli/dist/metadataGeneration/typeResolver.js:773:35)
    at TypeResolver.resolveTypeReferenceNode (packages/cli/dist/metadataGeneration/typeResolver.js:474:21)
    at TypeResolver.resolve (packages/cli/dist/metadataGeneration/typeResolver.js:301:21)
    at packages/cli/dist/metadataGeneration/typeResolver.js:126:84
    at Array.reduce (<anonymous>)
```

Baseline-invalid controllers (13, not counted as native exclusions):

- `duplicateMethodsController`
- `incorrectResponseHeaderController`
- `invalidExampleController`
- `invalidExtensionController`
- `invalidExtensionModelController`
- `invalidGetController`
- `invalidHeaderController`
- `invalidNestedQueriesController`
- `invalidPostController`
- `invalidQueriesController`
- `invalidQueryController`
- `invalidTagController`
- `unsupportedIndexedTypeController`

All 13 also fail on both native backends. `duplicateMethodsController` and
`invalidNestedQueriesController` hit each backend's synthetic reference lookup
error instead of their classic validation error. The other 11 first-line errors
match classic.

### Synthetic locations and diagnostics

Synthetic nodes arise when the resolver asks the checker to turn inferred or
mapped types back into type nodes. `TypeResolver.resolve` eagerly constructs
`GenerateMetadataError("Unknown type: TypeReference", node)` as an argument to
`throwUnless`, even when its TypeReference check succeeds. This is neither an
emitted warning nor a caught fallback. Classic builds and discards the same
error. Native location formatting previously threw while building that unused
error, before `throwUnless` could inspect its successful condition.

Earlier temporary tracing across the isolated suite recorded 283 synthetic error
constructions on classic and 245 on each native backend. Every corresponding
`throwUnless` condition was true; no synthetic warning was constructed. Classic
also eagerly constructs two unused module-kind errors in `calcRefTypeName`.
`prettyTroubleCause` did not throw after location formatting was corrected, so
it is unchanged.

The harness writes result and comparison JSON, but does not save stdout or
stderr itself. Both streams were captured separately for these runs. There
were no warnings on stdout, only result summaries and comparison reports.
Diffing stderr diagnostics against classic showed:

- Classic prints 28 copies of `The type Object is discouraged. Please consider using an interface such as:` with the suggested interfaces; each native backend prints 26. Two otherwise identical warning blocks are absent on native.
- All three print the same six duplicate/overlapping path-parameter warnings.
- All three print the same two type-resolution diagnostics, for `InvalidExtension` and `ForeignIndexedValue`.
- The remaining diagnostic text matches byte-for-byte, except for one `context canceled` line from TypeScript 7 during cleanup. The successful comparisons no longer print a byte-parity assertion failure.

The intermittent `context canceled` diagnostic was also observed in an earlier
instrumented TypeScript 7 run. The latest TypeScript 7 comparison still exited
successfully; tsrs did not print it. No cleanup behavior was changed.
