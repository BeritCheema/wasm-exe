#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
engine_dir="${BOXEDWINE_SOURCE_DIR:-$project_dir/vendor/Boxedwine64-source}"
# Reuse browser object files; link a Node entry point without OffscreenCanvas.
make -C "$engine_dir/project/emscripten" -j"${BUILD_JOBS:-8}" \
  BUILD_DIR=Build/Wasm64Mt TARGET_EXEC=cpu-selftest.js \
  EXTRA_CPP_FLAGS='-DBOXEDWINE_GUEST_X64=1 -DBOXEDWINE_MULTI_THREADED -DBOXEDWINE_OPENGL -DGLH=<SDL_opengl.h> -DDISABLE_GL_EXTENSIONS -pthread -DNDEBUG' \
  EXTRA_LD_FLAGS='-pthread -sPTHREAD_POOL_SIZE=32 -sENVIRONMENT=node -sEXIT_RUNTIME=1 -sALLOW_MEMORY_GROWTH=1 -sMAXIMUM_MEMORY=4294967296 -sLEGACY_GL_EMULATION=1 -sMAX_WEBGL_VERSION=2 --js-library=boxedwine-multithreaded-audio.js'
node "$engine_dir/project/emscripten/Build/Wasm64Mt/cpu-selftest.js" --x64-selftest
