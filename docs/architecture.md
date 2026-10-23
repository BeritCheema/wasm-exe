# GTA V Legacy runtime research

## Intended execution path

Local game directory → virtual filesystem → PE loader → x86-64 execution engine → Windows API layer → browser GPU/audio/input/storage.

The current source implements PE inspection and a separate tiny arithmetic compiler probe only. Neither is a game loader. Chrome on Apple Silicon cannot directly call guest x86-64 instructions or macOS Rosetta from WebAssembly.

## Next milestones and acceptance criteria

1. **PE loader:** map sections, zero-fill virtual tails, apply relocations, enumerate imported symbols, and validate entry points against executable sections. Test using redistributable fixtures built from our own source.
2. **Execution-engine decision:** compare a dynamic x86-64→Wasm translator with an upstream Boxedwine64 integration. Measure arithmetic, memory access, branch-heavy code, exceptions, atomics and threads. The tiny compiler is a correctness probe, not a claim that five instructions can grow cheaply into game compatibility. Review upstream licensing before incorporation.
3. **Windows process:** execute an owned, source-built x64 program using allocation, file I/O, timing, threads and a small window. Define ABI, TLS, exception handling, imports and address-space requirements. Successful PE parsing alone is insufficient.
4. **D3D11 proof:** render an owned textured rotating scene via WebGPU, with depth, shader translation and a repeatable frame-time report. Ordinary native DXVK cannot simply be dropped into Chrome; browser GPU APIs require their own integration.
5. **Game filesystem:** directory selection and lazy reads of large archives, normalized paths, save overlays and a persistent storage quota strategy. Avoid loading a complete GTA installation into JS memory.
6. **GTA V launch:** use the user's legitimately installed Legacy files and supported authentication. Record first failing instruction/API and resource usage. No launcher/DRM bypass is proposed. No GTA installation is currently available in this repository or tested.
7. **Playable scene:** load a Story Mode save, render correctly and accept input. Record Mac model, Chrome version, resolution, memory use and frame-time percentiles. Target 30 FPS at low settings as a future experiment, not a current prediction.

## Browser architecture decisions still to validate

- Run guest execution in a Worker; keep the UI responsive and allow termination.
- Cross-origin isolation for SharedArrayBuffer/threads. The local server already sends COOP/COEP headers.
- Sparse guest address space: a guest 64-bit address cannot be treated as an arbitrary JavaScript Number or directly allocated as contiguous Wasm memory.
- Explicit guest filesystem/network capabilities and resource limits.
- Stable failure reports for unsupported instructions/APIs instead of fake loading progress.
- Test arm64 macOS and x86-64 hosts separately; host performance does not imply equal guest performance.

## Out of scope for the initial target

GTA Online, anti-cheat emulation, Enhanced/DX12, macOS Mach-O/DMG execution, arbitrary EXE compatibility, server streaming, and bundled commercial game assets.
