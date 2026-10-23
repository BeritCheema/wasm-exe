import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const name = 'blender-2.79b-windows64.zip';
const expected = 'b88d78c7f10bdb532ef511cdf770081eecc983ddc95a08ae96a1f7a77658b55e';
// Official checksum: https://download.blender.org/release/Blender2.79/release279b.sha256
const dir = new URL('../vendor/windowsappplayer/64/', import.meta.url);
const dest = new URL(name, dir);
const hash = b => createHash('sha256').update(b).digest('hex');
let bytes;
try { bytes = await readFile(dest); } catch {}
if (!bytes || hash(bytes) !== expected) {
  const r = await fetch('https://download.blender.org/release/Blender2.79/' + name);
  if (!r.ok) throw new Error('Blender download failed: ' + r.status);
  bytes = Buffer.from(await r.arrayBuffer());
  if (hash(bytes) !== expected) throw new Error('Blender official SHA-256 mismatch');
  await mkdir(dir, { recursive: true });
  const temp = new URL(name + '.tmp', dir);
  await writeFile(temp, bytes); await rename(temp, dest);
}
console.log('Verified official Blender 2.79b Windows x64 archive (110 MiB).');
