# External Windows execution backend

The `wasm-exe` custom compiler still only handles a restricted arithmetic probe.
To test a real application now, the local lab can download and serve the separate
WindowsAppPlayer / Boxedwine / Wine backend. This is an upstream integration, not
an application compiled by our custom translator.

```sh
npm run setup:backend
npm run dev
```

Open http://127.0.0.1:5173/backend/ and click **Try demo (7-Zip)**.

## Reproducibility and provenance

- Source: https://github.com/bassdrum4/windowsappplayer
- Pinned revision: `97c6294d84f7008fe8f96ab2ee686d7eab25b923`
- `scripts/backend-lock.json` records SHA-256 for each downloaded file.
- `setup:backend` verifies existing files and verifies downloads before writing.
- Downloaded files stay in ignored `vendor/windowsappplayer`; they are not republished in this repository.
- Upstream LICENSE (GPL-2.0) and NOTICE are downloaded alongside its sources.
- The backend includes Boxedwine (GPL), Wine (LGPL), JSZip (MIT), and the 7-Zip demo (LGPL/BSD; see upstream notices).
- The local page inserts a separate wasm-exe banner/input bridge. Upstream file checksums remain unchanged.

Only the 32-bit backend is installed. The upstream 64-bit control is disabled and
the launch button rejects 64-bit selections. No GTA V compatibility follows from
this test. This old runtime is intended for classic Win32 applications; it is not
a general solution for modern applications.

## Why 7-Zip

The supplied demo contains `7zFM.exe` (421,888 bytes), `7z.exe`, `7zG.exe` and
`7z.dll`. The file manager is a real PE32/x86 GUI application. Our inspector finds
11 DLL imports including USER32, GDI32, COMCTL32, COMDLG32, OLE32, SHELL32 and
KERNEL32. It exercises substantially more functionality than the arithmetic probe.

The dev server now supports HTTP byte ranges so Wine can load sections of its
filesystem archive without retransmitting the entire archive for each request.
Node tests cover exact ranges, suffix ranges and invalid requests.

## Observed test results — 2026-10-22, Chrome on macOS

| Test | Result |
| --- | --- |
| Inspect original `7zFM.exe` with wasm-exe | PASS: PE32/x86, GUI subsystem, 11 imported DLLs |
| Start `7zFM.exe` in external backend | PASS: actual 7-Zip File Manager rendered |
| Mouse interaction | PASS: Computer view and Tools menu opened |
| Open compression benchmark | PASS: benchmark dialog rendered; dictionary size changed from 32 MiB to 2 MiB |
| Complete compression/decompression benchmark | FAIL/INCOMPLETE: no completed pass; a `RuntimeError: null function` occurred during the stop/close interaction sequence |

The benchmark failure occurred in the downloaded Boxedwine Wasm module, with
frames including wasm-function[544] at 0x16329 and [535] at 0x1512c. This does not
identify the root cause; it could involve an unsupported guest operation or an
upstream runtime bug. Do not report this application as fully compatible.

Startup also logs a missing `wineboot.exe` warning, although the GUI launches
using the supplied prefix. No successful archive round-trip or saved-file export
has yet been established. GUI startup is evidence of executable execution, not
evidence of correct compression, broad Windows support, x64 support or GTA V
performance.

A second clean session confirmed the **About 7-Zip** dialog identifies version
**9.20**, copyright Igor Pavlov. See [Chrome screenshot](screenshots/7zip-chrome.png).
Text input reaches the guest after the canvas focus adjustment, but modifier-key
translation is still unreliable in the automated macOS input path (Ctrl+A and
Shift+semicolon did not produce the intended selection/colon). File browsing of
`D:\userapp` therefore remains unverified. Do not treat the focus adjustment as a
complete keyboard compatibility fix.
