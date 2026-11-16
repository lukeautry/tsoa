#!/usr/bin/env bash
# Builds the Go helper: ./src placed in a sparse checkout of the pinned TypeScript 7 (tsgo) compiler as
# tsc/cmd/tsoa-facts, plus one accessor file in tsc/internal/checker. Idempotent.
# Usage: build.sh [output path]   (default: bin/helper next to this script)
# Set GOOS/GOARCH to cross-compile, for example GOOS=windows GOARCH=amd64 build.sh bin/helper.exe
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
output="$(realpath -m "${1:-$here/bin/helper}")"
revision=3e9236361fa97a9e6c685f4833ac457ae2d8c50a
upstream="$here/upstream"
export GOTOOLCHAIN=local GOWORK=off CGO_ENABLED=0

command -v go >/dev/null || { echo "go is not on PATH; install the version tsc/go.mod asks for (see README.md)" >&2; exit 1; }

if [ ! -d "$upstream/.git" ]; then
  mkdir -p "$upstream"
  git -C "$upstream" init -q
  git -C "$upstream" remote add origin https://github.com/microsoft/TypeScript.git
  git -C "$upstream" sparse-checkout set tsc
fi
if [ "$(git -C "$upstream" rev-parse HEAD 2>/dev/null || true)" != "$revision" ]; then
  git -C "$upstream" fetch -q --depth 1 --filter=blob:none origin "$revision"
  git -C "$upstream" checkout -q --force FETCH_HEAD
fi

wanted="$(awk '$1 == "go" { print $2; exit }' "$upstream/tsc/go.mod")"
have="$(go env GOVERSION | sed 's/^go//')"
if [ "$(printf '%s\n%s\n' "$wanted" "$have" | sort -V | head -n1)" != "$wanted" ]; then
  echo "go $have is older than go $wanted, which tsc/go.mod at $revision requires" >&2
  exit 1
fi

rm -rf "$upstream/tsc/cmd/tsoa-facts"
mkdir -p "$upstream/tsc/cmd/tsoa-facts"
cp "$here"/src/*.go "$upstream/tsc/cmd/tsoa-facts/"
cp "$here"/src/checker/*.go "$upstream/tsc/internal/checker/"

mkdir -p "$(dirname "$output")"
(cd "$upstream/tsc" && go build -trimpath -ldflags='-s -w' -o "$output" ./cmd/tsoa-facts)
echo "built $output"
