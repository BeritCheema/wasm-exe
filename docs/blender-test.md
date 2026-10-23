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
The rebuilt CPU self-test reports **239 passed, 0 failed**. This alone does not
establish Blender compatibility; browser testing is ongoing.

To reproduce the runtime build, activate Emscripten **4.0.23**, then run
`npm run build:backend64` after `npm run setup:backend64`. The script downloads
pinned source, applies the patch and installs the rebuilt JS/Wasm locally.
Running `setup:backend64` again restores the original upstream binaries.
Run `npm run test:backend64` with the same SDK active to run the CPU tests.
Blender's official archive and executable are unchanged.
