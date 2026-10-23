// Local integration patch for the GPL-2.0 upstream launcher. Never changes the
// pinned upstream file on disk. App archive contents remain byte-for-byte intact.
export function patchLauncher(source) {
  const edits = [
    ['var names = [GLIBC_ZIP, WINE_ZIP];', 'var names = [GLIBC_ZIP, WINE_ZIP]; if (param("fixture") === "blender") names.push("blender-2.79b-windows64.zip");'],
    ['if (USE_PREFIX) args.push("-zip", PREFIX_ZIP);', 'if (USE_PREFIX) args.push("-zip", PREFIX_ZIP); if (param("fixture") === "blender") args.push("-zip", "blender-2.79b-windows64.zip", "-w", "/blender-2.79b-windows64");'],
    ['function fetchZipBytes(name, onProgress) {', 'function fetchZipBytes(name, onProgress) { if (name === "blender-2.79b-windows64.zip") return fetchBytes(BASE + name, name, onProgress);']
  ];
  for (const [before, after] of edits) {
    if (source.split(before).length !== 2) throw new Error('Unsupported upstream launcher revision');
    source = source.replace(before, after);
  }
  return source;
}
