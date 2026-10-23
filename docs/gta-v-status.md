# GTA V Legacy launch status

## 2026-10-22 attempt preparation

**GTA V itself has not been launched.** No GTA5.exe, GTAVLauncher.exe, or
PlayGTAV.exe was found by Spotlight; a focused search of Downloads, Projects and
Applications also found no game installation. The user must identify their
installed Windows Legacy game folder before a binary-specific attempt can occur.

The initial 32-bit backend cannot execute GTA V's x86-64 code. An optional pinned
64-bit backend is now available for baseline testing:

```sh
npm run setup:backend64
npm run dev
```

Open http://127.0.0.1:5173/backend/64/?chunked=1&p=notepad.exe

The separate `backend64-lock.json` pins files from the same upstream revision as
the 32-bit experiment. Downloaded assets are ignored by Git. This is a separate
baseline page; the 32-bit upload page still rejects x64 programs.

## Known blockers, independent of game files

1. The upstream backend interprets x86-64; it has no x86-64 JIT.
2. Its documented graphics support is basic D3D9 via Wine/OpenGL/WebGL2. It does
   not provide the DirectX 11 implementation targeted for this project.
3. The upstream guest has no network support, which blocks the planned supported
   Rockstar authentication path. Existing offline entitlement behavior has not
   been tested.
4. The upload flow copies whole files into memory. It is unsuitable for importing
   an entire GTA installation. Directory-backed lazy access still needs work.

Source: https://github.com/andrewnakas/Boxedwine64#browser-compatibility
The downloaded launcher's own UI explicitly excludes D3D games from its upload
recommendations. Successful Notepad execution must not be presented as evidence
that GTA V can launch or run at playable speed.
