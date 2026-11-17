# tsoa compiler helpers

tsoa can take its type information from TypeScript 7's native compilers instead of TypeScript 6. A compiler helper is a small program linked against one of those compilers. It loads the program tsoa asks for and answers type and symbol questions over the tsoa facts protocol ([PROTOCOL.md](PROTOCOL.md)). TypeScript 6 still parses every file in Node. Only the checker is native.

- `go/` links tsgo, the Go compiler from microsoft/TypeScript, pinned at `3e9236361fa97a9e6c685f4833ac457ae2d8c50a` (7.1 beta).
- `rs/` links tsrs, the Rust port from oxc-project/tsrs, pinned at `v0.25.0` (`0f82b670e4ff861840b1315f8610816229e73e3a`).

Neither ships inside `@tsoa/cli`. This directory is not a workspace package, so `yarn build` and lerna do not see it.

## Which compiler tsoa uses

tsoa looks at the packages installed in the directory it runs in (`process.cwd()`, where it also finds `tsconfig.json`), resolving them from there rather than from `@tsoa/cli`:

| The project has                         | tsoa uses                                          |
| --------------------------------------- | -------------------------------------------------- |
| `typescript` 5 or 6                     | TypeScript itself, as before. No helper is loaded. |
| `typescript` 7                          | the tsgo helper from `@tsoa/compiler-helper-tsgo`  |
| `tsrs` (with or without `typescript` 7) | the tsrs helper from `@tsoa/compiler-helper-tsrs`  |
| none of these                           | nothing: tsoa fails and says so                    |

Only TypeScript majors are compared. A tsrs version such as `0.25.0-ts7.1.0-beta` counts as the TypeScript after `-ts`. A helper runs only when the project's compiler has the TypeScript major it was built for. Otherwise tsoa fails and names both versions. tsoa also fails, naming the command to run, when the helper package is missing or has no binary for this platform. `selectCompiler.ts` in `packages/cli/src/metadataGeneration/native/` holds these rules.

`TSOA_COMPILER_HELPER=<path>` overrides the choice with a helper binary you built. tsoa has no config option for this.

## Helper packages

```sh
npm install --save-dev @tsoa/compiler-helper-tsgo   # with typescript 7
npm install --save-dev @tsoa/compiler-helper-tsrs   # with tsrs
```

Each umbrella package (`npm/compiler-helper-*`) lists one package per platform as an exact-version `optionalDependency`, and npm installs only the one whose `os` and `cpu` match. It has no install script. The platforms are `linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64` and `win32-x64`, and the package names follow `@tsoa/compiler-helper-tsgo-linux-x64`. tsrs Linux packages also say `libc: ["glibc"]`. The `tsoaCompilerHelper` field records the compiler, the TypeScript version it was built from, the upstream pin and the protocol revision. tsoa reads its `typescriptVersion` for the major check.

These packages version on their own, outside lerna, and change only when a pin or the protocol changes. Change the version in the umbrella's `version` and in every `optionalDependencies` entry together.

```sh
node packages/cli-native/pack.mjs tsgo out linux-x64=packages/cli-native/go/bin/helper   # umbrella + one platform tarball in out/
node packages/cli-native/check-installed.mjs typescript@7.0.2 tsgo out                   # install them in a temporary project and generate
```

`check-installed.mjs` installs the packed `@tsoa/cli`, the compiler and the tarballs into a temporary project. It checks that tsoa picks the helper there without `TSOA_COMPILER_HELPER`, and that the metadata matches TypeScript 6's after union members are sorted. With only a compiler (`typescript@6`), it checks that tsoa takes the TypeScript path and loads no native code. Plain `npm install` works with the platform packages not on npm yet: npm skips an optional dependency it cannot fetch. CI runs this check in every `compiler-helper` cell.

`.github/workflows/release-compiler-helpers.yml` runs by hand only. It builds every platform's binaries, runs the suite and the installed check on each, and uploads the tarballs. It publishes them with `npm publish --provenance` only when its `publish` input is true, which needs the `NPM_TOKEN` secret.

## Build

`build.mjs` fetches the pinned compiler into a gitignored directory, adds the helper's sources, and builds. It needs only Node, git and the language's toolchain, runs the same on Linux, macOS and Windows, is idempotent, and writes nothing outside this directory unless you pass an output path.

```sh
node packages/cli-native/build.mjs go [output]   # default go/bin/helper; needs go >= the version tsc/go.mod asks for (1.27)
node packages/cli-native/build.mjs rs [output]   # default rs/bin/helper; needs rustup (tsrs pins Rust 1.99.1)
```

On Windows the default output is `bin/helper.exe`.

The Go build fetches a sparse checkout of `tsc/` into `go/upstream/`, copies `go/src/*.go` in as `tsc/cmd/tsoa-facts`, and copies `go/src/checker/tsoa_facts_exports.go` into `tsc/internal/checker`. It changes no existing compiler file.

The Rust build clones tsrs into `rs/tsrs/`, copies `rs/tsrs-patch/tsoa_exports.rs` into the checker crate with one `mod` line, and adds `rs/tsoa_facts` as a crate. A release build takes 2 to 3 minutes. `PROFILE=dev` builds unoptimized. The helper uses the system allocator rather than tsrs's mimalloc, so the build needs no C toolchain beyond what Rust itself needs.

Cross-compiling: `GOOS=windows GOARCH=amd64 node build.mjs go` writes `go/bin/helper.exe`. For Rust, `TARGET=<triple> node build.mjs rs`, which for `x86_64-pc-windows-msvc` needs the MSVC tools and does not build on Linux.

## Run tsoa's suite on a helper

```sh
yarn build
cd tests && TSOA_COMPILER_HELPER=$PWD/../packages/cli-native/go/bin/helper yarn test
```

The repo's own projects have TypeScript 6, so `TSOA_COMPILER_HELPER` is what puts the suite on a helper. The specs in `tests/unit/metadataGeneration/compilerHelperErrors.spec.ts` run only when it is set.

## Compare two helpers

```sh
yarn build
node packages/cli-native/conformance/conformance.cjs packages/cli-native/go/bin/helper packages/cli-native/rs/bin/helper
```

It opens every program `tests/prepare.ts` generates from in both helpers, walks each own file with `prefetchFile`, then asks `type`, `members`, `print` and `typeToString` of every type and `symbol` of every symbol either reaches. It prints each disagreement with both queries and answers and exits 1 on any. Ids are paired by where they appear, not by value. The one allowed difference is described under "Known differences" in PROTOCOL.md.

On Windows the helper serves a named pipe passed as `--pipe <path>` instead of stdio. CI runs the full suite over it on Windows for both helpers.
