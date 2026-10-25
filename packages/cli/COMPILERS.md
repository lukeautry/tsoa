# Compiler backends

The CLI loads the installed `typescript` peer lazily. TypeScript 5.7+ and 6 use
its in-process compiler API. TypeScript 7 uses its native synchronous API over
IPC. The CLI closes the native process and removes its temporary project after
generation, including failures.

To opt into the optional `tsrs` peer, install it and run:

```sh
TSOA_COMPILER=tsrs tsoa spec-and-routes
```

`TSOA_COMPILER=typescript` selects the default peer explicitly. Other values
are errors. No tsoa.json setting is added. The exported async generation
functions support native backends; the synchronous `MetadataGenerator` does not.
The repository still builds and runs its main tests with TypeScript 6.

## Experimental native limits

Native support is incomplete. These operations fail explicitly:

- Synthetic reference lookup when the compiler cannot resolve a printed type
  name in its original source context.
- Numeric compiler-option overrides without an exported native enum (except
  values inherited unchanged from tsconfig.json). Prefer tsconfig.json for these
  settings.

The generation comparison isolates each fixture controller. The measured runs
used TypeScript 6.0.3, TypeScript 7.0.2 and tsrs 0.18.0-ts7.1.0-dev.20260929:

| Backend | Passed | Failed | Compared with classic | Differing files | Native limits on baseline-valid controllers |
| --- | ---: | ---: | ---: | ---: | ---: |
| TypeScript 6.0.3 | 44 | 13 | — | — | — |
| TypeScript 7.0.2 | 43 | 14 | 43 | 26 | 1 |
| tsrs | 43 | 14 | 43 | 26 | 1 |

Both native comparison commands exit unsuccessfully because generated outputs
differ. These are measured failures, not parity claims. Optional interface and
class properties are supported. The full default fixture was not rechecked.

`yarn build` and `yarn lint` pass with TypeScript 6. Lint reports three existing
unused-variable warnings. `yarn test` passes 2,441 tests (2,439 main and two ESM).
The backend test suite passes seven tests on each of the three compilers.

Run the comparison after building:

```sh
node tests/compiler/generation.cjs /tmp/tsoa-classic
# Install/select the native peer, then:
node --test tests/compiler/compiler.test.cjs
node tests/compiler/generation.cjs /tmp/tsoa-native /tmp/tsoa-classic
```

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

The newly exposed differences include mapped-property and enum ordering. They
also include a semantic difference: `complexTypeController` query parameters
`sortOrder` and `sortBy` are optional on classic but required on both native
backends. These differences have not been fixed or exhaustively classified.

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

Temporary tracing across the isolated suite recorded 283 synthetic error
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
- The remaining diagnostic text matches byte-for-byte between the final runs. Both native runs additionally print the harness assertion `Generated outputs must match the classic compiler` with `26 !== 0`.

One earlier instrumented TypeScript 7 run also printed `context canceled` during
generation cleanup; neither final uninstrumented native run printed it. No
cleanup behavior was changed.
