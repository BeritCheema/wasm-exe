import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { patchLauncher } from '../scripts/patch-launcher.js';
const path = new URL('../vendor/windowsappplayer/64/wine64-launcher.js', import.meta.url);
test('Blender mount patch rejects unknown upstream code', () => assert.throws(() => patchLauncher(''), /revision/));
test('Blender fixture is mounted and fetched before guest startup', { skip: !existsSync(path) }, async () => {
 const source = await readFile(path, 'utf8'); const patched = patchLauncher(source);
 assert.ok(patched.includes('args.push("-zip", "blender-2.79b-windows64.zip", "-w", "/blender-2.79b-windows64")'));
 assert.ok(patched.includes('names.push("blender-2.79b-windows64.zip")'));
 new Function(patched); // validates syntax, never executes guest or launcher
});
