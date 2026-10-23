import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const lock = JSON.parse(await readFile(new URL(process.argv.includes('--64') ? './backend64-lock.json' : './backend-lock.json', import.meta.url)));
for (const file of lock.files) {
  const dest = resolve(root, 'vendor/windowsappplayer', file.path);
  const hash = b => createHash('sha256').update(b).digest('hex');
  try { if (hash(await readFile(dest)) === file.sha256) { console.log('Verified ' + file.path); continue; } } catch {}
  const url = `https://raw.githubusercontent.com/bassdrum4/windowsappplayer/${lock.commit}/${file.path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${file.path}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (hash(bytes) !== file.sha256) throw new Error('Checksum mismatch: ' + file.path);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest + '.tmp', bytes); await rename(dest + '.tmp', dest);
  console.log('Downloaded and verified ' + file.path);
}
console.log('External backend ready. Run npm run dev, then open /backend/.');
