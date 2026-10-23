# Blender Windows executable experiment

Target: **Blender 2.79b, Windows x64**, an older compatibility baseline. This is not
a test of current Blender releases. The original executable runs through external
Boxedwine64/Wine, not the custom arithmetic compiler.

## Reproduce

```sh
npm run setup:backend64
npm run setup:blender
npm run dev
```

Use **Test Blender version** on http://127.0.0.1:5173/ first. This launches the
actual Windows executable with `--version`; it does not require a Blender UI.
The separate **Try Blender GUI** link attempts normal startup.

The official ZIP is mounted as an additional guest filesystem at its original
folder path. All bundled DLLs, Python resources and licenses remain together;
the EXE alone is not sufficient. The local server applies a small, checked patch
to the downloaded upstream launcher when serving it. The pinned source file is
unchanged on disk. Blender runs with its working directory set to the mounted
application folder. Persistence is disabled for these tests.

## Download provenance

- Archive: https://download.blender.org/release/Blender2.79/blender-2.79b-windows64.zip
- Official checksums: https://download.blender.org/release/Blender2.79/release279b.sha256
- SHA-256: `b88d78c7f10bdb532ef511cdf770081eecc983ddc95a08ae96a1f7a77658b55e`
- ZIP: 115,536,799 bytes; blender.exe: 80,737,280 bytes.
- PE inspection: x86-64, 25 static DLL imports, including Python 3.5, OpenGL,
  SDL2, OpenAL, FFmpeg and Windows system libraries.
- Game/app binaries remain in ignored vendor directories; none are committed.

## Observed result (Chrome on macOS)

**Blocked: Blender did not produce version output or reach a usable UI.**

- Control: the same x64 backend ran `wine64 --version`, printed
  `wine-8.0 (Debian 8.0~repack-4)`, and exited with status 0.
- Blender: the original ZIP mounted successfully and Wine opened `blender.exe`
  plus bundled Python, SDL, OpenAL and FFmpeg DLLs.
- Startup then reported:

```text
ksyscall64: unimplemented syscall #100 (?) at RIP=0x7000d3b37
CPU64: unimpl opcode at RIP=0x140132780 bytes=c2 00 00 cc cc cc cc (rex=0x00 osz=0 asz=0 seg=00 rep=00)
```

The unsupported instruction is a concrete emulator blocker. No Blender version
text appeared; helper-process exit codes of zero do not establish app success.
The GUI link is provided for reproduction but was not validated as working.
This test does not establish viewport, rendering or current Blender support.
Fixing this requires work on the external CPU/runtime implementation followed by
another startup test; supporting this one instruction may reveal further gaps.

[Captured browser output](blender-browser-output.txt) and
[startup screenshot](screenshots/blender-startup.png) preserve the observation.
The upstream splash says “Launching Notepad” even for this custom command;
the launch arguments in the log identify the actual Blender test.

## Runtime repair in progress

The original `RET imm16` failure has a source fix in
[the engine patch](../patches/boxedwine64-blender-cpu.patch), applied to
[Boxedwine64](https://github.com/andrewnakas/Boxedwine64) revision
`dee2ff3f08d9b5bdfe78c15bdefbf8f89b4f1639` (GPL-2.0-or-later).
This adds RET imm16 to dispatch and implements return-address pop followed by
unsigned 16-bit stack adjustment. Tests cover zero, 16, and 32768 bytes.
The next browser run passed that point and reported `0F 5A C1` (CVTPS2PD)
at `0x1429538bd`. The patch now also converts the low two float lanes to
doubles, with register and memory source tests.
The rebuilt CPU self-test reports **246 passed, 0 failed**. This alone does not
establish Blender compatibility; browser testing is ongoing.

To reproduce the runtime build, activate Emscripten **4.0.23**, then run
`npm run build:backend64` after `npm run setup:backend64`. The script downloads
pinned source, applies the patch and installs the rebuilt JS/Wasm locally.
Running `setup:backend64` again restores the original upstream binaries.
Run `npm run test:backend64` with the same SDK active to run the CPU tests.
Blender's official archive and executable are unchanged.


## Runtime diagnostics

Each browser run now has timestamped output, a stage/activity panel and a UUID.
The local dev server saves events to ignored `vendor/runtime-logs/<UUID>.jsonl`.
Use `npm run runtime:status` for the latest run's stage, instruction failure and
thread samples. Add `&ripsample=1` to a test URL to record guest thread RIP and
instruction deltas every two seconds. A live browser heartbeat is distinct from
guest CPU progress; absence of output alone does not prove a deadlock.
The log remains local. On-screen raw output is capped at 64 KiB.

A subsequent GUI launch reached Blender thumbnail setup and stopped on
`66 0F 5A C1` at `0x14083175d` (CVTPD2PS). The CPU patch now also supports this
conversion and tests register/memory sources plus cleared upper lanes.


The graphics bridge now accepts explicit default attenuation and disabled
spotlight state; non-default attenuation/spotlight requests remain unsupported.
This follows Blender 2.79b's `GPU_basic_shader_light_set` initialization path.
Some reloads after a runtime abort stalled during archive scanning. Until the
cause is resolved, close the failed test tab and open a fresh test tab. Archive
metadata checks now report the exact ZIP being scanned.


Thread samples then located a prolonged loop in Wine's `GetTickCount64` at
`kernel32.dll` address `0x7b625a70`. The shared-file mmap path excluded mappings
with an automatically chosen address, so a wineserver writer could get private
pages while clients expected a live shared clock. The patch removes that
exclusion. Tests verify visibility from a pre-reserved writer to a fixed reader
and execute Wine's high/low/high clock-reading sequence. The browser now shows the writer and reader aliasing the same shared page,
consistent clock words, and Blender moving beyond the clock loop into Python
initialization. The Blender UI is not yet verified. Trace mode includes the
shared clock words, excluded from the application-output inactivity timer.


With the clock fix, Blender passed Python initialization after roughly six
minutes, then stopped on `0F 0D 4E 32` at `0x140b0f6e9` (PREFETCHW). The
emulator now decodes this cache hint without accessing guest memory, matching
its existing treatment of PREFETCH. Three tests cover displacement/SIB lengths,
unmapped targets, and preserved registers/flags. See [AMD's instruction
reference](https://www.amd.com/content/dam/amd/en/documents/archived-tech-docs/programmer-references/21928.pdf).
Trace mode also reports opened Python and Blender files, and the diagnostics
panel identifies the main thread's current module. A further GUI test is ongoing.


The PREFETCHW fix let the next run reach its first `glDrawElements` call at
about 404 seconds. At 410 seconds the upstream legacy GL emulation aborted on
`GL_POLYGON` (mode 9). The bridge now maps filled convex immediate-mode polygons
to `GL_TRIANGLE_FAN`; legacy polygon wireframe and flat-shading provoking-vertex
semantics remain limitations. The diagnostics layout reserves canvas space and
scrolls instead of squeezing the canvas below the log panel.
