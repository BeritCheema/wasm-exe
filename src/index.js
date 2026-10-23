/** Bounds-checked PE inspection. Does not execute the supplied program. */
export function inspectPE(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  function check(p, n) {
    if (!Number.isSafeInteger(p) || p < 0 || p + n > bytes.length) throw new Error('Truncated or invalid PE file');
  }
  const u16 = p => { check(p, 2); return v.getUint16(p, true); };
  const u32 = p => { check(p, 4); return v.getUint32(p, true); };
  if (u16(0) !== 0x5a4d) throw new Error('Not a Windows MZ executable');
  const pe = u32(0x3c);
  if (u32(pe) !== 0x4550) throw new Error('Not a PE executable (DOS-only files are unsupported)');
  const machine = u16(pe + 4), count = u16(pe + 6), optSize = u16(pe + 20);
  const opt = pe + 24;
  check(opt, optSize);
  const magic = u16(opt), is64 = magic === 0x20b;
  if (magic !== 0x10b && !is64) throw new Error('Unsupported optional header');
  const directoryStart = is64 ? 112 : 96;
  if (optSize < directoryStart || count > 96) throw new Error('Invalid PE header size or section count');
  const directoryCount = u32(opt + directoryStart - 4);
  if (directoryCount > (optSize - directoryStart) / 8) throw new Error('Invalid data directory count');
  const sections = [];
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    const p = opt + optSize + i * 40; check(p, 40);
    const rawSize = u32(p + 16), rawOffset = u32(p + 20);
    if (rawSize) check(rawOffset, rawSize);
    sections.push({ name: decoder.decode(bytes.subarray(p, p + 8)).replace(/\0.*$/, ''),
      rva: u32(p + 12), virtualSize: u32(p + 8), rawSize, rawOffset, characteristics: u32(p + 36) });
  }
  const headerSize = u32(opt + 60);
  function offset(rva, n = 1) {
    if (rva < headerSize && rva + n <= headerSize) { check(rva, n); return rva; }
    const s = sections.find(s => rva >= s.rva && rva - s.rva + n <= s.rawSize);
    if (!s) throw new Error('RVA does not map to file-backed data');
    const p = s.rawOffset + rva - s.rva; check(p, n); return p;
  }
  function stringAt(rva) {
    const out = [];
    for (let i = 0; i < 4096; i++) {
      const c = bytes[offset(rva + i)];
      if (!c) return decoder.decode(new Uint8Array(out));
      out.push(c);
    }
    throw new Error('Unterminated import name');
  }
  const imports = [];
  if (directoryCount > 1) {
    const directory = opt + directoryStart + 8;
    const rva = u32(directory), size = u32(directory + 4);
    if (rva && size) {
      let terminated = false;
      for (let i = 0; i < Math.min(Math.floor(size / 20), 4096); i++) {
        const p = offset(rva + i * 20, 20);
        if ([0, 4, 8, 12, 16].every(n => u32(p + n) === 0)) { terminated = true; break; }
        imports.push(stringAt(u32(p + 12)));
      }
      if (!terminated) throw new Error('Unterminated or oversized import directory');
    }
  }
  const entryRva = u32(opt + 16);
  return { format: is64 ? 'PE32+' : 'PE32', architecture: ({ 0x8664: 'x86-64', 0x14c: 'x86', 0xaa64: 'arm64' })[machine] ?? 'unknown',
    machine, entryRva, imageSize: u32(opt + 56), subsystem: u16(opt + 68),
    imports, sections, managed: directoryCount > 14 && u32(opt + directoryStart + 14 * 8) !== 0,
    inspectionLimits: ['Imports list DLL names only; delay-loaded and dynamically loaded libraries are not enumerated.', 'Inspection does not establish runtime compatibility.'] };
}

/** Tiny compiler milestone: mov eax, imm32; [add/sub eax, imm32 | nop]*; ret.
 * These instructions have no memory, OS, flag-consuming, branch, or stack effects
 * within this deliberately restricted function model. This is NOT a Windows runtime.
 */
export function compileArithmeticX64(code) {
  const bytes = code instanceof Uint8Array ? code : new Uint8Array(code);
  if (bytes.length > 65536) throw new Error('Arithmetic probe exceeds 64 KiB');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 0, initialized = false, returned = false;
  const instructions = [];
  function imm() {
    if (p + 4 > bytes.length) throw new Error('Truncated immediate');
    const n = v.getInt32(p, true); p += 4; return signedLeb(n);
  }
  while (p < bytes.length) {
    const start = p, op = bytes[p++];
    if (op === 0xb8) {
      if (initialized) instructions.push(0x1a); // discard previous EAX
      instructions.push(0x41, ...imm()); initialized = true;
    } else if ((op === 0x05 || op === 0x2d) && initialized) {
      instructions.push(0x41, ...imm(), op === 0x05 ? 0x6a : 0x6b);
    } else if (op === 0x90) {
      // nop
    } else if (op === 0xc3 && initialized) {
      returned = true;
      if (p !== bytes.length) throw new Error('Trailing bytes after RET are unsupported');
    } else throw new Error(`Unsupported instruction or state at byte ${start}: 0x${op.toString(16)}`);
  }
  if (!returned) throw new Error('Probe must initialize EAX and end with RET');
  const section = (id, data) => [id, ...unsignedLeb(data.length), ...data];
  const body = [0, ...instructions, 0x0b];
  return new Uint8Array([0,97,115,109,1,0,0,0,
    ...section(1, [1,0x60,0,1,0x7f]), ...section(3, [1,0]),
    ...section(7, [1,3,114,117,110,0,0]),
    ...section(10, [1,...unsignedLeb(body.length),...body])]);
}
function unsignedLeb(value) {
  const out = []; do { const b = value & 127; value >>>= 7; out.push(b | (value ? 128 : 0)); } while (value); return out;
}
function signedLeb(value) {
  const out = []; let more;
  do { const b = value & 127; value >>= 7; more = !((value === 0 && !(b & 64)) || (value === -1 && (b & 64))); out.push(b | (more ? 128 : 0)); } while (more);
  return out;
}
export async function runArithmeticProbe() {
  // x86-64 machine code: mov eax, 40; add eax, 2; ret
  const wasm = compileArithmeticX64(new Uint8Array([0xb8,40,0,0,0,0x05,2,0,0,0,0xc3]));
  const { instance } = await WebAssembly.instantiate(wasm);
  return { result: instance.exports.run(), wasmBytes: wasm.length };
}
