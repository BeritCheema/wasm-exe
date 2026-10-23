import { inspectPE, runArithmeticProbe } from '/src/index.js';
const output = document.querySelector('#output');
const download = document.querySelector('#download');
let report;
function show(value) { report = value; output.textContent = JSON.stringify(value, null, 2); download.disabled = false; }
document.querySelector('#exe').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  output.textContent = 'Inspecting local executable…';
  try {
    if (file.size > 256 * 1024 * 1024) throw new Error('Inspector limit: 256 MiB. Select the executable, not the full game archive.');
    show({ file: file.name, size: file.size, ...inspectPE(await file.arrayBuffer()), execution: 'Not implemented for Windows applications or GTA V' });
  } catch (error) { show({ file: file.name, error: error.message }); }
});
document.querySelector('#probe').addEventListener('click', async () => {
  try { show({ probe: 'x86-64 arithmetic → WebAssembly', ...await runArithmeticProbe(), scope: 'Restricted arithmetic function only; no Windows APIs or game execution.' }); }
  catch (error) { show({ error: error.message }); }
});
download.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'wasm-exe-report.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
