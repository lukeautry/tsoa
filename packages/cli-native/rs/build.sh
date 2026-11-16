#!/usr/bin/env bash
# Builds the Rust helper: clone tsrs at the pin into ./tsrs, add the accessor file to its checker crate, add the
# helper crate, build. Idempotent.
# Usage: build.sh [output path]   (default: bin/helper next to this script)
# PROFILE=dev builds unoptimized; TARGET=<triple> cross-compiles.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
output="$(realpath -m "${1:-$here/bin/helper}")"
cd "$here"

TSRS_TAG=v0.25.0
TSRS_REV=0f82b670e4ff861840b1315f8610816229e73e3a
PROFILE=${PROFILE:-release}
TARGET=${TARGET:-}

command -v cargo >/dev/null || { echo "cargo is not on PATH; install rustup (see README.md)" >&2; exit 1; }

# libmimalloc-sys2's build script runs cmake; keep a pinned copy in .tools when the machine has none.
if ! command -v cmake >/dev/null; then
  if [ ! -x .tools/bin/cmake ]; then
    command -v uv >/dev/null || { echo "cmake is not on PATH, and uv is not either to fetch one" >&2; exit 1; }
    uv venv -q .tools && VIRTUAL_ENV=$PWD/.tools uv pip install -q cmake==3.31.6
  fi
  export PATH=$PWD/.tools/bin:$PATH
fi

if [ ! -d tsrs/.git ]; then
  git clone --quiet --depth 1 --branch "$TSRS_TAG" https://github.com/oxc-project/tsrs.git tsrs
fi
actual=$(git -C tsrs rev-parse HEAD)
[ "$actual" = "$TSRS_REV" ] || { echo "tsrs is at $actual, want $TSRS_REV" >&2; exit 1; }

cp tsrs-patch/tsoa_exports.rs tsrs/crates/tsrs_checker/src/tsoa_exports.rs
grep -qx 'mod tsoa_exports;' tsrs/crates/tsrs_checker/src/lib.rs || echo 'mod tsoa_exports;' >> tsrs/crates/tsrs_checker/src/lib.rs

rm -rf tsrs/crates/tsoa_facts
cp -R tsoa_facts tsrs/crates/tsoa_facts

target_args=()
[ -n "$TARGET" ] && target_args=(--target "$TARGET")
(cd tsrs && cargo build --profile "$PROFILE" "${target_args[@]}" -p tsoa_facts)
dir=$PROFILE; [ "$PROFILE" = dev ] && dir=debug
exe=tsoa-facts; [[ "$TARGET" == *windows* ]] && exe=tsoa-facts.exe
mkdir -p "$(dirname "$output")"
cp "tsrs/target/${TARGET:+$TARGET/}$dir/$exe" "$output"
echo "built $output ($PROFILE${TARGET:+, $TARGET})"
