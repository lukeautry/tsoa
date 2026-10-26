# Compiler backends

The CLI loads the installed `typescript` peer lazily. TypeScript 5.7+ and 6 use
its in-process compiler API. TypeScript 7 uses its native synchronous API over
IPC. The CLI closes the native process and removes its temporary project after
generation, including failures.
Supported TypeScript 7 versions: 7.0.2 and 7.1.0-beta.

To opt into the optional `tsrs` peer, install it and run:

```sh
TSOA_COMPILER=tsrs tsoa spec-and-routes
```

`TSOA_COMPILER=typescript` selects the default peer explicitly. Other values
are errors. No tsoa.json setting is added. The exported async generation
functions support native backends; the synchronous `MetadataGenerator` does not.
The repository still builds and runs its main tests with TypeScript 6.

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
used TypeScript 6.0.3, TypeScript 7.0.2 and tsrs 0.18.0-ts7.1.0-dev.20260929:

| Backend          | Passed | Failed | Controllers compared with classic | Byte-different files | Semantic differences in Swagger | Native limits on baseline-valid controllers |
| ---------------- | -----: | -----: | --------------------------------: | -------------------: | ------------------------------: | ------------------------------------------: |
| TypeScript 6.0.3 |     44 |     13 |                                 — |                    — |                               — |                                           — |
| TypeScript 7.0.2 |     43 |     14 |                                43 |                   26 |                               0 |                                           1 |
| tsrs             |     43 |     14 |                                43 |                   26 |                               0 |                                           1 |

Both native comparison commands pass. Each compares 86 files across 43
controllers: 13 Swagger files and 13 route files differ byte-for-byte. All 43
Swagger files match by meaning under the accepted differences below. The two
native backends produce byte-identical output to each other in all 86 files.
Routes are reported as byte differences, not semantically gated. This is not a
claim of full runtime equivalence. The full default fixture was not rechecked.
Optional interface, class and compiler-built type properties are supported;
`complexTypeController` GET `/ComplexType/PaginationQuery` now reports both
`sortBy` and `sortOrder` as `required: false` on all three backends.

`yarn build` and `yarn lint` pass with TypeScript 6. Lint reports three existing
unused-variable warnings. Run lint after the main tests finish regenerating
fixture routes; an overlapping run reported three transient unresolved-call
errors, while the subsequent serial run passed. `yarn test` passes 2,441 tests
(2,439 main and two ESM). Nx also printed its flaky-task advisory for the ESM
target despite that successful run. The backend test suite passes eight tests on
each compiler, including the compiler-built optional-property regression. The
generation comparator's two focused tests also pass.

Run the comparison after building, choosing separate output directories at the
same depth so relative route imports do not add byte differences:

```sh
node --test tests/compiler/generation.test.cjs
node --test tests/compiler/compiler.test.cjs
node tests/compiler/generation.cjs "$CLASSIC_OUTPUT"
# Install/select the native peer, then:
node --test tests/compiler/compiler.test.cjs
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
