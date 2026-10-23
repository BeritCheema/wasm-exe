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

test('runtime diagnostics persist local events and reject foreign origins', async () => {
 const { mkdtemp, rm } = await import('node:fs/promises');
 const { tmpdir } = await import('node:os');
 const { join } = await import('node:path');
 const logDir = await mkdtemp(join(tmpdir(), 'wasm-exe-logs-'));
 const server = createDevServer({ logDir });
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 try {
  const base = `http://127.0.0.1:${server.address().port}`;
  const run = '11111111-1111-1111-1111-111111111111';
  const body = JSON.stringify({run, events:[{seconds:1, level:'runtime', text:'CPU64: unimpl opcode'}]});
  const post = origin => fetch(base + '/api/runtime-log', {method:'POST', headers:{Origin:origin, 'Content-Type':'application/json'}, body});
  assert.equal((await post('https://example.com')).status, 403);
  assert.equal((await post(base)).status, 204);
  assert.equal(JSON.parse((await readFile(join(logDir, run + '.jsonl'), 'utf8')).trim()).text, 'CPU64: unimpl opcode');
  assert.equal((await fetch(base + '/api/runtime-log', {method:'POST', headers:{Origin:base}, body:'not json'})).status, 400);
 } finally { await new Promise(r => server.close(r)); await rm(logDir, {recursive:true}); }
});
