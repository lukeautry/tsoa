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

To use a different generation compiler from the TypeScript used to build and
run your tooling, install it in a separate directory:

```sh
npm install --prefix /tmp/tsoa-native typescript@7.1.0-beta
TSOA_COMPILER_ROOT=/tmp/tsoa-native tsoa spec-and-routes
# Or install tsrs there and set TSOA_COMPILER=tsrs as well.
```

`TSOA_COMPILER_ROOT` resolves the selected package from that directory using
Node's `createRequire`; when unset, resolution starts at the CLI itself.
`TSOA_COMPILER=typescript` selects the default peer explicitly. Other values
are errors. No tsoa.json setting is added. The exported async generation
functions support native backends; the synchronous `MetadataGenerator` does not.
The build, ts-node test runner, tsc typecheck and typescript-eslint remain on
TypeScript 6 for native generation jobs. They cannot use TypeScript 7 directly:
the CLI build needs classic API declarations absent from the native peer,
ts-node cannot read `ts.sys.fileExists`, and typescript-eslint rejects the native
API. `TSOA_COMPILER_ROOT` changes only the generation backend, not this toolchain.

## Why the facade

Consumers use `ts.X` as both types and values; only a module supplies both
namespaces. `export type * from 'typescript'` does not work because TypeScript's declarations use `export =`.
Each runtime name is listed once, with lazy dispatch through the
active compiler session. A full collapse to one compiler object remains a
follow-up: it requires changing consumer type imports beyond this change's
production diff budget.

## Experimental native limits

TypeScript 7 and tsrs support is experimental.

The existing CI `build` job runs the existing `yarn test` suite with each of
TypeScript 7.0.2, TypeScript 7.1.0-beta and tsrs 0.20.0-ts7.1.0-beta as the
generation backend, on Ubuntu with Node 22 and a TypeScript 6.0.3 toolchain.
The original TypeScript 5.7 and 6 build matrix is unchanged.

Known limits are enforced by tests, not skipped: 15 cases on TypeScript 7.0.2
and 11 cases each on TypeScript 7.1.0-beta and tsrs must fail with their documented
error or assertion message. If a case passes or fails differently, CI fails.
Other tests must pass normally.

- TypeScript 7.0.2, 7.1.0-beta and tsrs: in non-strict mode, an optional member
  that also allows `null` can produce an empty object schema without an error.
- TypeScript 7.0.2, 7.1.0-beta and tsrs: project types named `Array` or
  `ReadonlyArray` can use the printed alias name, such as `FrozenChain_Leaf_`
  instead of `ReadonlyArray_Leaf_`.
- TypeScript 7.0.2, 7.1.0-beta and tsrs: an inferred return type printed as
  `import('...').Type` fails with `Unknown type`.
- TypeScript 7.0.2, 7.1.0-beta and tsrs: the printer can crash on unions mixing
  package and namespaced members with `Offset is outside the bounds of the DataView`.
- TypeScript 7.0.2, 7.1.0-beta and tsrs: annotation errors report absolute file
  paths rather than relative paths.
- TypeScript 7.0.2 only: invalid tsconfig files can return no diagnostics.
- TypeScript 7.0.2, 7.1.0-beta and tsrs: discovered compiler options lack the
  classic `configFile` object, so the classic module resolver cannot use that
  metadata for package self-name resolution.

On TypeScript 7 and tsrs, numeric compiler-option overrides without an exported
native enum are unsupported unless inherited unchanged from tsconfig.json.
Prefer tsconfig.json for these settings.

The tests ignore the order of enum values, union members, `required` lists and
object keys because TypeScript 7 orders union members differently. Generated
output is otherwise unchanged.
