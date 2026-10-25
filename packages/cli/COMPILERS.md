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

Native support is incomplete. These features fail explicitly rather than emit
incorrect output:

- Synthetic reference lookup when the compiler cannot resolve a printed type
  name in its original source context.
- Synthetic node source locations that the backend cannot decode.
- Numeric compiler-option overrides without an exported native enum (except
  values inherited unchanged from tsconfig.json). Prefer tsconfig.json for these
  settings.

The generation comparison isolates each fixture controller. In the checked
TypeScript 7.0.2 and tsrs 0.18.0-ts7.1.0-dev.20260929 runs, each backend compared
30 controllers with identical specs and routes (zero differences); 14
otherwise-valid controllers hit the synthetic node source location limit.
The TypeScript 6 baseline passed 44 controllers and failed 13. Each native run
passed 30 and failed 27 (14 native limits plus the 13 baseline-invalid controllers).
Optional interface and class properties are supported. The full default fixture
remains unsupported because of the synthetic node source location limit.

Run the comparison after building:

```sh
node tests/compiler/generation.cjs /tmp/tsoa-classic
# Install/select the native peer, then:
node --test tests/compiler/compiler.test.cjs
node tests/compiler/generation.cjs /tmp/tsoa-native /tmp/tsoa-classic
```

### Excluded fixture controllers

Both native backends exclude these 14 controllers with the error
`Synthetic node source locations are not supported with the typescript compiler backend.`
for TypeScript 7, or
`Synthetic node source locations are not supported with the tsrs compiler backend.`
for tsrs:

- `complexTypeController`
- `deleteController`
- `deprecatedController`
- `getController`
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
