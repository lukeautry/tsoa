# Releasing

lerna publishes every package at one version: `tsoa`, `@tsoa/cli`, `@tsoa/runtime`, `@tsoa/compiler-helper-tsgo` and `@tsoa/compiler-helper-tsrs`. Each helper umbrella also brings five platform packages, such as `@tsoa/compiler-helper-tsgo-linux-x64`, which hold the helper binaries. They are not in the repository. The umbrella's `prepublishOnly` creates them from the binaries in `TSOA_HELPER_BINARIES` and publishes them before lerna publishes the umbrella (`packages/cli-native/pack.mjs`).

The binaries are built and tested on each platform by `.github/workflows/release.yml`, which then runs `lerna publish from-git`. So the version bump stays on your machine and the publish runs in CI.

## Once: npm trusted publishing

The workflow publishes with npm trusted publishing (OIDC). It has no npm token. An npm owner of the `@tsoa` scope and of `tsoa` sets up a trusted publisher on npmjs.com, under each package's Settings, with these values:

- Publisher: GitHub Actions
- Organization or user: `lukeautry`, repository: `tsoa`
- Workflow filename: `release.yml`
- Environment: `release`
- Allowed actions: check "Allow npm publish", leave "Allow npm dist-tag" unchecked. Without "Allow npm publish", npm only stages a release, and an owner approves each package on npmjs.com before it goes live; the workflow does not handle that.

It is needed for every package the workflow publishes:

- `tsoa`, `@tsoa/cli`, `@tsoa/runtime`
- `@tsoa/compiler-helper-tsgo` and `@tsoa/compiler-helper-tsgo-{linux-x64,linux-arm64,darwin-x64,darwin-arm64,win32-x64}`
- `@tsoa/compiler-helper-tsrs` and `@tsoa/compiler-helper-tsrs-{linux-x64,linux-arm64,darwin-x64,darwin-arm64,win32-x64}`

npm marks a new trusted publisher "Pending validation" and drops it unless a publish through it succeeds within 48 hours. GitHub only runs a manual workflow once its file is on the default branch. So set the trusted publishers up on release day, after `release.yml` is on `master` and the `release` environment exists, then run the release the same day.

The 12 helper packages are not on npm yet. npm configures trusted publishing per package, so an owner must publish each name once by hand before it can have a trusted publisher. Any version works, for example a `0.0.0` with only a package.json. A maintainer of the GitHub repository also creates the `release` environment under Settings, Environments, and can require a reviewer there.

## Each release

```sh
yarn bump                                               # lerna version: runs the tests, bumps, commits "Release v<version>", tags v<version>, pushes
gh workflow run release.yml --ref v<version>            # a dry run: builds, tests, and runs lerna publish with npm --dry-run
gh workflow run release.yml --ref v<version> -f dry_run=false   # publishes
```

`dist_tag` (default `latest`) sets the npm dist-tag of every package, for example `-f dist_tag=next` for a release candidate.

The workflow fails before it publishes anything when the ref has no release tag. A rerun after a partial publish skips what is already on npm. lerna skips its packages and `pack.mjs` skips the platform packages.

`yarn deploy` still runs `yarn bump` and then `lerna publish from-git` on your machine. Without `TSOA_HELPER_BINARIES`, the helper umbrellas' `prepublishOnly` fails while lerna packs, before anything is published. lerna leaves the `gitHead` fields and `LICENSE` copies it wrote in the packages: `git checkout -- packages && git clean -f packages`. Then run the workflow on the tag `yarn bump` pushed.

## Publishing from your machine

Merge the `helper-binaries-*` artifacts of a `release.yml` run into one directory, so that it holds `<tsgo|tsrs>/<os>-<cpu>/helper[.exe]` with `LICENSE` and `NOTICE` beside each binary, then:

```sh
TSOA_HELPER_BINARIES=<dir> yarn lerna publish from-git
```

npm settings that `lerna publish` takes as flags do not reach `prepublishOnly`. Set them in the environment, which both read: `NPM_CONFIG_TAG=next`, `NPM_CONFIG_DRY_RUN=true`, `NPM_CONFIG_PROVENANCE=true` (provenance only works in CI).
