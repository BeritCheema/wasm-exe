import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectPE, compileArithmeticX64, runArithmeticProbe } from '../src/index.js';

function peFixture() {
  const b = new Uint8Array(1024), v = new DataView(b.buffer);
  const u16 = (p, n) => v.setUint16(p, n, true), u32 = (p, n) => v.setUint32(p, n, true);
  u16(0, 0x5a4d); u32(0x3c, 0x80); u32(0x80, 0x4550);
  u16(0x84, 0x8664); u16(0x86, 1); u16(0x94, 240);
  const o = 0x98;
  u16(o, 0x20b); u32(o + 16, 0x1000); u32(o + 56, 0x2000); u32(o + 60, 512); u16(o + 68, 3); u32(o + 108, 16);
  u32(o + 120, 0x1100); u32(o + 124, 40);
  const s = o + 240;
  b.set(new TextEncoder().encode('.text'), s); u32(s + 8, 512); u32(s + 12, 0x1000); u32(s + 16, 512); u32(s + 20, 512); u32(s + 36, 0x60000020);
  u32(0x300 + 12, 0x1140); u32(0x300 + 16, 0x1180);
  b.set(new TextEncoder().encode('KERNEL32.dll\0'), 0x340);
  return b;
}
test('PE32+ inspection maps import RVAs to raw file offsets', () => {
  const result = inspectPE(peFixture());
  assert.equal(result.architecture, 'x86-64'); assert.equal(result.entryRva, 4096);
  assert.deepEqual(result.imports, ['KERNEL32.dll']); assert.equal(result.sections[0].name, '.text');
});
test('reject truncated, invalid signatures, malformed section data and directories', () => {
  for (const n of [0, 2, 63, 128, 400, 900]) assert.throws(() => inspectPE(peFixture().slice(0, n)));
  const b = peFixture(), v = new DataView(b.buffer);
  b[0] = 0; assert.throws(() => inspectPE(b), /MZ/);
  b[0] = 0x4d; v.setUint32(0x98 + 120, 0xffff0000, true); assert.throws(() => inspectPE(b), /RVA/);
});
test('inspection supports byte views with nonzero offsets', () => {
  const b = new Uint8Array(1100); b.set(peFixture(), 20);
  assert.equal(inspectPE(b.subarray(20, 1044)).architecture, 'x86-64');
});
test('actual WebAssembly execution returns 42', async () => assert.equal((await runArithmeticProbe()).result, 42));
async function run(code) { return (await WebAssembly.instantiate(compileArithmeticX64(new Uint8Array(code)))).instance.exports.run(); }
const immediate = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
test('arithmetic preserves EAX wrapping, signed constants and overwrite semantics', async () => {
  assert.equal(await run([0xb8,...immediate(-1),0x05,...immediate(1),0xc3]), 0);
  assert.equal(await run([0xb8,...immediate(0x7fffffff),0x05,...immediate(1),0xc3]), -2147483648);
  assert.equal(await run([0xb8,...immediate(10),0x2d,...immediate(13),0xc3]), -3);
  assert.equal(await run([0xb8,...immediate(42),0xb8,...immediate(7),0x90,0xc3]), 7);
});
test('unsupported code fails before execution', () => {
  for (const code of [[], [0xc3], [0xb8,1], [0xeb,0xfe], [0xb8,1,0,0,0], [0xb8,1,0,0,0,0xc3,0x90]]) assert.throws(() => compileArithmeticX64(new Uint8Array(code)));
});
