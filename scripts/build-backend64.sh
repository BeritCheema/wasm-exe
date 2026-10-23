#!/usr/bin/env bash
set -euo pipefail
# Requires Emscripten 4.0.23 (emcc on PATH), git and make.
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
engine_dir="${BOXEDWINE_SOURCE_DIR:-$project_dir/vendor/Boxedwine64-source}"
revision=dee2ff3f08d9b5bdfe78c15bdefbf8f89b4f1639
command -v emcc >/dev/null || { echo 'Activate Emscripten 4.0.23 first.' >&2; exit 1; }
if [ ! -d "$engine_dir/.git" ]; then
  git init "$engine_dir"
  git -C "$engine_dir" remote add origin https://github.com/andrewnakas/Boxedwine64.git
  git -C "$engine_dir" fetch --depth 1 origin "$revision"
  git -C "$engine_dir" checkout --detach FETCH_HEAD
fi
[ "$(git -C "$engine_dir" rev-parse HEAD)" = "$revision" ] || { echo 'Unexpected engine revision' >&2; exit 1; }
if git -C "$engine_dir" apply --check "$project_dir/patches/boxedwine64-blender-cpu.patch" 2>/dev/null; then
  git -C "$engine_dir" apply "$project_dir/patches/boxedwine64-blender-cpu.patch"
else
  git -C "$engine_dir" apply --reverse --check "$project_dir/patches/boxedwine64-blender-cpu.patch"
fi
make -C "$engine_dir/project/emscripten" -j"${BUILD_JOBS:-8}" wasm64-mt
mkdir -p "$project_dir/vendor/windowsappplayer/64"
cp "$engine_dir/project/emscripten/Build/Wasm64Mt/boxedwine64.js" "$engine_dir/project/emscripten/Build/Wasm64Mt/boxedwine64.wasm" "$project_dir/vendor/windowsappplayer/64/"
echo 'Installed locally rebuilt Boxedwine64 runtime. Reload the browser test.'
