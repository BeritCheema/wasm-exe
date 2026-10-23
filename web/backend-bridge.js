// wasm-exe additions to the unmodified external backend page.
const canvas = document.querySelector('#canvas');
canvas.tabIndex = 0;
canvas.addEventListener('mousedown', () => canvas.focus({ preventScroll: true }));
for (const event of ['keydown', 'keyup']) {
  document.addEventListener(event, e => { if (document.activeElement === canvas) e.preventDefault(); });
}
const arch64 = document.querySelector('#arch64');
arch64.disabled = true;
arch64.closest('label')?.setAttribute('title', '64-bit backend is not installed in wasm-exe');
const banner = document.createElement('div');
banner.textContent = 'wasm-exe external backend test · Boxedwine / Wine · 32-bit only · GTA V is not supported';
banner.style.cssText = 'padding:12px;background:#243d2b;color:white;text-align:center';
document.body.prepend(banner);
// Refuse automatic switching into an uninstalled engine.
document.querySelector('#runBtn').addEventListener('click', event => {
  if (arch64.checked) {
    event.stopImmediatePropagation();
    document.querySelector('#bootStatus').textContent = 'This test backend only supports 32-bit programs. Select a 32-bit EXE.';
  }
}, true);
