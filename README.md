# wasm-exe

JavaScript package and browser test lab researching local execution of Windows programs through WebAssembly. **The target is GTA V Legacy Story Mode in Chrome, including on macOS.**

## Current status

**GTA V does not run. General Windows executable execution is not implemented.** This is the first compiler and inspection milestone, not a playable game demo.

Implemented:
- Bounds-checked PE32 / PE32+ header, section and static DLL-import inspection.
- A restricted x86-64 arithmetic-function compiler that emits actual WebAssembly.
- Browser UI for local executable inspection, JSON report export and a working CPU probe.
- Dependency-free Node test suite and GitHub Actions CI.

The compiler supports only `MOV EAX, imm32`, `ADD EAX, imm32`, `SUB EAX, imm32`, `NOP`, and terminal `RET` in a restricted function model. It does not implement flags, guest memory, stack operations, Windows entry-point semantics or an x86 CPU. Unsupported instructions fail explicitly. The probe compiles machine-code bytes, not an arbitrary PE executable.

## Develop on macOS

Node.js 22 or newer. No dependency installation required.

```sh
npm test
npm run dev
```

Open http://127.0.0.1:5173. Choose an EXE to inspect, or run the CPU probe. The probe translates `mov eax, 40; add eax, 2; ret` and executes the resulting Wasm in the browser, returning 42.

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

No open-source license has been selected yet. Public source visibility alone does not grant reuse rights.
