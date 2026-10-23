import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDevServer } from '../scripts/serve.js';
test('server supplies exact byte ranges and rejects invalid requests', async () => {
 const server = createDevServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
 try {
  const base = `http://127.0.0.1:${server.address().port}`;
  const source = await readFile(new URL('../src/index.js', import.meta.url));
  const r = await fetch(base + '/src/index.js', { headers: { Range: 'bytes=10-29' } });
  assert.equal(r.status, 206); assert.equal(r.headers.get('content-range'), `bytes 10-29/${source.length}`);
  assert.deepEqual(Buffer.from(await r.arrayBuffer()), source.subarray(10, 30));
  const suffix = await fetch(base + '/src/index.js', { headers: { Range: 'bytes=-8' } });
  assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), source.subarray(-8));
  assert.equal((await fetch(base + '/src/index.js', { headers: { Range: 'bytes=999999-' } })).status, 416);
  assert.equal((await fetch(base + '/package.json')).status, 404);
  assert.equal((await fetch(base + '/src/index.js', { method: 'POST' })).status, 405);
 } finally { await new Promise(r => server.close(r)); }
});
