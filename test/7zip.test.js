import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectPE } from '../src/index.js';
const zip = fileURLToPath(new URL('../vendor/windowsappplayer/demo/7-zip.zip', import.meta.url));
test('inspect downloaded 7-Zip Windows GUI executable', { skip: !existsSync(zip) && 'Run npm run setup:backend to download the real application' }, () => {
 const result = spawnSync('unzip', ['-p', zip, '7zFM.exe'], { maxBuffer: 4 * 1024 * 1024 });
 assert.equal(result.status, 0, result.stderr?.toString());
 const pe = inspectPE(result.stdout);
 assert.equal(pe.architecture, 'x86'); assert.equal(pe.subsystem, 2);
 assert.equal(pe.imports.length, 11); assert.ok(pe.imports.includes('KERNEL32.dll')); assert.ok(pe.imports.includes('USER32.dll'));
});
