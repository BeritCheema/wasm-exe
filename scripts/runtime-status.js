import { readdir, readFile, stat } from 'node:fs/promises';
const dir = new URL('../vendor/runtime-logs/', import.meta.url);
const files = await readdir(dir).catch(() => []);
const logs = await Promise.all(files.filter(f => f.endsWith('.jsonl')).map(async name => ({name, time:(await stat(new URL(name, dir))).mtimeMs})));
logs.sort((a,b) => b.time-a.time);
if (!logs.length) { console.log('No runtime logs yet. Open a browser test.'); process.exit(0); }
const latest = logs[0];
const entries = (await readFile(new URL(latest.name, dir), 'utf8')).trim().split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
const last = entries.at(-1), heartbeat = entries.findLast(e => e.level === 'heartbeat');
console.log(`Run ${latest.name}\nElapsed ${last.seconds}s · last report ${Math.round((Date.now()-Date.parse(last.at))/1000)}s ago\nStage: ${heartbeat?.text ?? 'starting'}`);
const errors = entries.filter(e => /unimpl opcode|RuntimeError|Aborted\(|Boot failed|Exception:/.test(e.text));
for (const e of errors.slice(-3)) console.log(`ERROR [${e.seconds}s] ${e.text}`);
const threads = new Map();
for (const e of entries) { const match = /RIPSAMPLE HB slot=\d+ pid=(\d+) tid=(\d+)/.exec(e.text); if (match) threads.set(`${match[1]}:${match[2]}`, e); }
for (const e of [...threads.values()].filter(e => last.seconds-e.seconds < 10)) console.log(`[${e.seconds}s] ${e.text}`);
for (const e of entries.filter(e => e.level !== 'heartbeat' && e.text.trim() && !/RIPSAMPLE|KUSER clock:|sys_openat64|loadProgram64/.test(e.text)).slice(-6)) console.log(`[${e.seconds}s] ${e.text}`);
