import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectPE } from '../src/index.js';
const zip = fileURLToPath(new URL('../vendor/windowsappplayer/64/blender-2.79b-windows64.zip', import.meta.url));
test('inspect official Blender executable and its bundled native dependencies', { skip: !existsSync(zip) }, () => {
 const result = spawnSync('unzip', ['-p', zip, 'blender-2.79b-windows64/blender.exe'], { maxBuffer: 100 * 1024 * 1024 });
 assert.equal(result.status, 0); const pe = inspectPE(result.stdout);
 assert.equal(pe.architecture, 'x86-64'); assert.equal(pe.imports.length, 25);
 assert.ok(pe.imports.includes('python35.dll')); assert.ok(pe.imports.includes('OPENGL32.dll'));
 const files = spawnSync('unzip', ['-Z1', zip], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
 assert.equal(files.status, 0); assert.match(files.stdout, /python35\.dll/); assert.match(files.stdout, /SDL2\.dll/);
});
