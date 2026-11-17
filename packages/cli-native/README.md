# tsoa compiler helpers

tsoa can take its type information from TypeScript 7's native compilers instead of TypeScript 6. A compiler helper is a small program linked against one of those compilers. It loads the program tsoa asks for and answers type and symbol questions over the tsoa facts protocol ([PROTOCOL.md](PROTOCOL.md)). TypeScript 6 still parses every file in Node. Only the checker is native.

- `go/` links tsgo, the Go compiler from microsoft/TypeScript, pinned at `3e9236361fa97a9e6c685f4833ac457ae2d8c50a` (7.1 beta).
- `rs/` links tsrs, the Rust port from oxc-project/tsrs, pinned at `v0.25.0` (`0f82b670e4ff861840b1315f8610816229e73e3a`).

Neither is published with `@tsoa/cli`. This directory is not a workspace package, so `yarn build` and lerna do not see it.

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

`TSOA_COMPILER_HELPER` is the switch: when it is set, tsoa's metadata generation uses that helper. The specs in `tests/unit/metadataGeneration/compilerHelperErrors.spec.ts` run only when it is set.

## Compare two helpers

```sh
yarn build
node packages/cli-native/conformance/conformance.cjs packages/cli-native/go/bin/helper packages/cli-native/rs/bin/helper
```

It opens every program `tests/prepare.ts` generates from in both helpers, walks each own file with `prefetchFile`, then asks `type`, `members`, `print` and `typeToString` of every type and `symbol` of every symbol either reaches. It prints each disagreement with both queries and answers and exits 1 on any. Ids are paired by where they appear, not by value. The one allowed difference is described under "Known differences" in PROTOCOL.md.

On Windows the helper serves a named pipe passed as `--pipe <path>` instead of stdio. That path is cross-compiled but untested.
