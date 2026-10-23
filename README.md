# wasm-exe

JavaScript package and browser test lab researching local execution of Windows programs through WebAssembly. **The target is GTA V Legacy Story Mode in Chrome, including on macOS.**

## Current status

**GTA V does not run.** The custom compiler remains a restricted arithmetic milestone. A separate, optional Boxedwine/Wine backend now supports testing classic 32-bit Windows applications; see [backend setup and test results](docs/external-backend.md).

Implemented:
- Bounds-checked PE32 / PE32+ header, section and static DLL-import inspection.
- A restricted x86-64 arithmetic-function compiler that emits actual WebAssembly.
- Browser UI for local executable inspection, JSON report export and a working CPU probe.
- Dependency-free Node test suite and GitHub Actions CI.

The compiler supports only `MOV EAX, imm32`, `ADD EAX, imm32`, `SUB EAX, imm32`, `NOP`, and terminal `RET` in a restricted function model. It does not implement flags, guest memory, stack operations, Windows entry-point semantics or an x86 CPU. Unsupported instructions fail explicitly. The probe compiles machine-code bytes, not an arbitrary PE executable.

## Develop on macOS

Node.js 22 or newer. No npm dependency installation required. The optional Windows backend downloads approximately 60 MiB of pinned external assets.

```sh
npm test
npm run dev
```

Open http://127.0.0.1:5173. Choose an EXE to inspect, or run the CPU probe. The probe translates `mov eax, 40; add eax, 2; ret` and executes the resulting Wasm in the browser, returning 42.

## Run a real Windows application

```sh
npm run setup:backend
npm run dev
```

Open http://127.0.0.1:5173/backend/ and click **Try demo (7-Zip)**. This launches the original Windows file manager through the external Boxedwine/Wine backend. It does not use the custom arithmetic compiler. Files remain local; no game binaries are included.

## GTA V / 64-bit preparation

See [GTA V launch status](docs/gta-v-status.md) for blockers and the optional 64-bit baseline (`npm run setup:backend64`). GTA V has not been launched; the backend lacks the required graphics/authentication integration.

## Blender Windows test

An official Blender 2.79b x64 archive can now be mounted with all its dependencies. Run `npm run setup:backend64`, `npm run setup:blender`, then `npm run dev`. The lab has separate version-check and GUI launch links. See [Blender test details](docs/blender-test.md); **startup is currently blocked by an unsupported instruction in the external x64 emulator**. No working Blender UI was reached; current Blender versions are not tested.

## Package API

```js
import { inspectPE, compileArithmeticX64, runArithmeticProbe } from './src/index.js';

const report = inspectPE(await file.arrayBuffer());
const result = await runArithmeticProbe(); // { result: 42, wasmBytes: ... }
```

The repository is named `wasm-exe`; this package has not been published to npm and registry name availability has not been established.

## Files and privacy

Selected files stay on the device. There is no upload endpoint, telemetry or third-party page asset. The initial inspector accepts individual EXE/DLL files up to 256 MiB; folder/ZIP mounting is future work. Imported DLL names are not a complete dependency inventory: delay imports and libraries loaded at runtime are not currently enumerated.

An EXE is usually a program entry point. GTA V also needs its DLLs, RPF asset archives, configuration and supported Rockstar authentication flow. This repository includes no game files or credentials. Do not commit proprietary executables, assets or diagnostic reports containing personal information.

## Target and roadmap

Target the Windows x86-64 **Legacy** edition, DirectX 11 renderer and Story Mode. Rockstar officially permits disabling BattlEye for Story Mode. GTA Online and the Enhanced DX12 edition are outside the initial target. Ownership verification remains required; disabling Story Mode anti-cheat does not remove authentication.

See [architecture and milestones](docs/architecture.md). A successful arithmetic probe says nothing yet about GTA V compatibility or frame rate.

## References

- [Microsoft PE/COFF format](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format)
- [Rockstar BattlEye FAQ](https://support.rockstargames.com/articles/1nenwhZlVrJY6CTFeSS2Fx/grand-theft-auto-online-battleye-faq)
- [GTA V Legacy requirements](https://help.steampowered.com/en/wizard/HelpWithGameTechnicalIssue/?appid=271590)
- [Boxedwine64](https://github.com/andrewnakas/Boxedwine64): candidate upstream for evaluation; no code or runtime is incorporated here.

No license has been selected for the original wasm-exe code yet. Downloaded third-party code retains its own licenses; see [backend provenance](docs/external-backend.md). Public visibility alone does not grant reuse rights to original code.


### Runtime debugging

`npm run build:backend64` builds our CPU fixes from pinned Boxedwine64 source
(requires activated Emscripten 4.0.23). `npm run test:backend64` runs the engine
CPU suite. The original Blender EXE remains unchanged.

The browser test now shows elapsed time, startup stages and timestamped events.
`npm run runtime:status` reads the latest local run log and shows thread activity
and errors. Use `npm run runtime:status -- <run-id>` to inspect a particular run.
Full logs are saved under ignored `vendor/runtime-logs/`.
