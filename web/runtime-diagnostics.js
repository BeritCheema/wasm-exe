(() => {
  const started = performance.now();
  const run = crypto.randomUUID();
  let lastOutput = started, lastProgress = started, stage = 'Downloading runtime', failure = '', queue = [], busy = false;
  const recent = [];
  const stages = ['Downloading runtime', 'Application files mounted', 'Starting Wine', 'Starting Windows services', 'Display connected', 'Blender initialization', 'Graphics initialization', 'Loading Blender Python', 'Stopped on runtime error'];
  let lastGuestExecution = null;
  const panel = document.createElement('section');
  panel.style.cssText = 'margin:16px 0;padding:14px;background:#101923;border:1px solid #526478;border-radius:8px;font:14px monospace;color:#e0edf7';
  const title = document.createElement('strong');
  title.textContent = 'Live runtime diagnostics';
  const status = document.createElement('div'), events = document.createElement('pre');
  events.style.cssText = 'white-space:pre-wrap;max-height:180px;overflow:auto;margin-bottom:0';
  panel.append(title, status, events);
  document.body.prepend(panel);
  const elapsed = () => (performance.now() - started) / 1000;
  function record(text, level = 'runtime') {
    text = String(text).slice(0, 16000);
    const now = performance.now();
    if (level === 'runtime' && !/^(RIPSAMPLE|KUSER clock:)/.test(text)) lastOutput = now;
    const sample = /RIPSAMPLE HB .*dIns=(\d+)/.exec(text);
    if (sample && Number(sample[1]) > 0) lastGuestExecution = now;
    let next;
    if (/Loaded .*\.zip/.test(text)) next = 'Application files mounted';
    if (/Launching.*wine64/.test(text)) next = 'Starting Wine';
    if (/wineboot|services\.exe|winedevice\.exe/.test(text)) next = 'Starting Windows services';
    if (/XWire: handshake complete/.test(text)) next = 'Display connected';
    if (/\.thumbnails|Blender 2\.|found bundled python|Read prefs/.test(text)) next = 'Blender initialization';
    if (/gl64.*(context|host GL up)|GL_VENDOR/i.test(text)) next = 'Graphics initialization';
    if (/found bundled python/.test(text)) next = 'Loading Blender Python';
    if (/unimpl opcode|RuntimeError|Aborted\(|Boot failed|Exception:/.test(text)) {
      failure = text; next = 'Stopped on runtime error';
    }
    if (next && stages.indexOf(next) >= stages.indexOf(stage)) {
      if (next !== stage) lastProgress = now;
      stage = next;
    }
    const entry = { run, at: new Date().toISOString(), seconds: +elapsed().toFixed(3), level, text };
    queue.push(entry);
    if (queue.length > 2000) queue.splice(0, queue.length - 2000);
    if (next || /unimplemented syscall/i.test(text) || level === 'error') {
      recent.push(`[${entry.seconds.toFixed(1)}s] ${text}`);
      if (recent.length > 12) recent.shift();
      events.textContent = recent.join('\n');
    }
    render();
    return `[${entry.seconds.toFixed(3)}s] ${text}`;
  }
  function render() {
    const quiet = (performance.now() - lastOutput) / 1000;
    status.textContent = `${stage} · elapsed ${elapsed().toFixed(0)}s · last runtime output ${quiet.toFixed(0)}s ago · stage unchanged ${((performance.now()-lastProgress)/1000).toFixed(0)}s${lastGuestExecution === null ? '' : ' · guest instructions last advanced ' + ((performance.now()-lastGuestExecution)/1000).toFixed(0) + 's ago'}${quiet > 20 ? ' · waiting for guest output' : ''}`;
    status.style.color = failure ? '#ff9b9b' : '#a5d6ff';
  }
  async function flush() {
    if (busy || !queue.length) return;
    busy = true;
    const batch = []; let size = 0;
    while (queue.length && batch.length < 64 && size + queue[0].text.length < 100000) { const item = queue.shift(); size += item.text.length; batch.push(item); }
    try {
      const response = await fetch('/api/runtime-log', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({run, events:batch})});
      if (!response.ok) throw new Error('HTTP ' + response.status);
    } catch {
      queue.unshift(...batch);
      title.textContent = 'Live runtime diagnostics · local log connection unavailable';
    } finally { busy = false; }
  }
  window.runtimeDiagnostics = { record };
  window.addEventListener('error', event => record(event.message, 'error'));
  window.addEventListener('unhandledrejection', event => record(String(event.reason), 'error'));
  record('Run started: ' + new URL(location.href).searchParams.get('p'), 'status');
  setInterval(render, 1000);
  setInterval(flush, 1000);
  setInterval(() => { queue.push({run, at:new Date().toISOString(), seconds:+elapsed().toFixed(3), level:'heartbeat', text:stage, quietSeconds:+((performance.now()-lastOutput)/1000).toFixed(1)}); }, 5000);
})();
