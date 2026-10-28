# Security Policy

If you have a security issue to report, please contact us at [security@woh.is](mailto:security@woh.is).

## Dependency review

`socket.yml` enables Socket dependency alerts and check runs without excluding test manifests or suppressing findings. It does not install the app. A repository owner must [install the Socket GitHub app](https://docs.socket.dev/docs/socket-for-github-installation) or grant it repository access. Confirm a real Socket check on a pull request that changes dependencies before making the check required. No live Socket result has been verified yet.

## Locked dependency inventory

The separate `sbom.yml` workflow installs the committed Yarn lockfile with lifecycle scripts disabled and builds that tree. It verifies the pinned cdxgen v13.5.0 binary's checksum, generates schema-validated CycloneDX 1.6, and rejects tracked-file changes. Download `sbom-<commit>` from the workflow artifacts. For pull requests, the commit is the checked-out merge commit.

The repo-owned checker verifies workspace identities and manifest versions, root-to-workspace edges, declared dependency edges, and reference integrity. Dependency names include development and optional dependencies, but not peer-only declarations. The private root need not have a version.

This is a locked source and build inventory, including development, test, and cross-platform packages such as `@nx/nx-darwin-arm64`. It is not the existing TypeScript matrix's `--no-lockfile` tree, an npm consumer's resolution, or a published-tarball inventory. Validation does not prove complete external-package coverage, exact transitive versions, vulnerability absence, or license compliance. A passing inventory job is not a Socket security verdict.

After a frozen install and `yarn build`, rerun the checker with `yarn ts-node --project tests/tsconfig.json tests/sbom/checkInventory.ts <sbom.json>`. Its tests run with the existing `yarn test` suite.
