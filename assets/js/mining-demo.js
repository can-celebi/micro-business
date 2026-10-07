// "The guessing race": a tiny proof-of-work demo for the slides. Students change one number (the nonce) and see
// the hash (SHA-256 of: previous block's hash + the payments + the number). The page counts only if the hash
// starts with enough zeros. By hand it is hopeless; [let my computer guess] shows why machines win.
// Markup: <div class="mine-demo" data-zeros="4"></div>   (real bitcoin needs ~19 zeros in this hex notation)
(function () {
  const enc = new TextEncoder();
  async function sha(s) { const b = await crypto.subtle.digest('SHA-256', enc.encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  function init(box) {
    const Z = +(box.dataset.zeros || 4), target = '0'.repeat(Z);
    const prev = '0000000000000000000a3f9c', pay = 'Anna → Ben 0.10 · Cem → Dana 0.05 · Eva → Finn 0.20';
    let n = Math.floor(Math.random() * 1e6), tries = 0, found = false, running = false;
    box.innerHTML = `<div class="md-block"><div><span class="k">previous page</span> ${prev}…</div><div><span class="k">payments</span> ${pay}</div><div><span class="k">your number</span> <b class="md-n"></b></div></div>
      <div class="md-hash"><span class="k">hash</span> <code class="md-h"></code></div>
      <div class="md-goal dim">goal: the hash must start with ${Z} zeros (${target}…)</div>
      <div class="md-btns"><button class="btn md-one">try the next number</button><button class="btn md-auto">let my computer guess</button></div>
      <div class="md-st dim"></div>`;
    const $ = s => box.querySelector(s);
    async function show() {
      const h = await sha(prev + pay + n);
      let z = 0; while (z < h.length && h[z] === '0') z++;
      $('.md-n').textContent = n;
      $('.md-h').innerHTML = '<span class="md-z">' + h.slice(0, z) + '</span>' + h.slice(z, 40) + '…';
      return h;
    }
    async function one() {
      if (found) return; n++; tries++;
      const h = await show();
      if (h.startsWith(target)) win(); else $('.md-st').textContent = tries + ' tries · not yet';
    }
    function win() { found = true; running = false; $('.md-st').innerHTML = '<b>✓ found it after ' + tries.toLocaleString('en') + ' tries</b> · this page now counts · raise your hand!'; box.classList.add('md-won'); $('.md-auto').textContent = 'let my computer guess'; }
    async function auto() {
      if (found) return; if (running) { running = false; return; }
      running = true; $('.md-auto').textContent = 'stop'; const t0 = performance.now();
      while (running && !found) {
        // guess in parallel batches (much faster than one by one)
        const base = n, hs = await Promise.all(Array.from({ length: 2000 }, (_, k) => sha(prev + pay + (base + k + 1))));
        const k = hs.findIndex(h => h.startsWith(target));
        if (k >= 0) { n = base + k + 1; tries += k + 1; await show(); win(); break; }
        n = base + 2000; tries += 2000;
        if (!found) { await show(); const s = (performance.now() - t0) / 1000; $('.md-st').textContent = tries.toLocaleString('en') + ' tries · ' + Math.round(tries / Math.max(s, 0.001)).toLocaleString('en') + ' per second'; await new Promise(r => setTimeout(r, 0)); }
      }
      if (!found) $('.md-auto').textContent = 'let my computer guess';
    }
    $('.md-one').onclick = one; $('.md-auto').onclick = auto;
    show();
  }
  function go() { if (!window.crypto || !crypto.subtle) return; document.querySelectorAll('.mine-demo').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
