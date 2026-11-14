// f8 · the Arena draws your run (Oyun, 14.11.2026). Spec: practice/fun-test/SPECS.md, section 8.
// Records each first try in Arena mode as 1 (right) or 0 (wrong) in today's run of the topic, and draws the latest run
// as a small rising line in the slot "arena-top" of the topic page. Reads no question, adds no points.
// Stored with fun.set('f8', …): { sd: [ { d: '2026-11-14', a: [1, 0, 1] }, … ] }, at most 2 runs per topic, 60 answers per run.
(function () {
  'use strict';
  const F = window.MicroFun; if (!F) return;
  const RUNS = 2, KEEP = 60, SHOWN = 24, X0 = 6, Y0 = 38, STEP = 12, RISE = 5, ROOM = 30;
  const two = n => (n < 10 ? '0' : '') + n;
  // the device's local day; a test may set MicroFun._today (a string or a function)
  const today = () => { const t = F._today; if (t) return typeof t === 'function' ? t() : t; const d = new Date(); return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()); };
  // whatever is stored (nothing, an old shape, rubbish) becomes a valid, small object
  const clean = g => {
    const out = {}; if (!g || typeof g !== 'object' || Array.isArray(g)) return out;
    Object.keys(g).forEach(t => {
      if (!Array.isArray(g[t])) return;
      const runs = g[t].filter(r => r && /^\d{4}-\d\d-\d\d$/.test(r.d) && Array.isArray(r.a) && r.a.length)
        .map(r => ({ d: r.d, a: r.a.slice(-KEEP).map(x => x ? 1 : 0) })).slice(-RUNS);
      if (runs.length) out[t] = runs;
    });
    return out;
  };
  const load = api => { try { return clean(api.get('f8')); } catch (e) { return {}; } };
  const right = a => a.reduce((s, x) => s + x, 0);
  const count = r => right(r.a) + ' of ' + r.a.length;

  F.style('f8', '.fun-run{display:block;margin:10px 0 2px}.fun-run svg{display:block;width:100%;max-width:420px;height:44px}' +
    '.fun-run .base{stroke:var(--line,#e3e5e8)}.fun-run .line{stroke:var(--ink,#1d1d1f)}.fun-run .fun-dim{display:block}');

  F.on('answer', d => {
    const api = F.api(), topic = d.item && d.item.topic;
    if (!api || !api.user() || d.mode !== 'arena' || d.attempt !== 1 || !topic) return;
    const g = load(api), runs = g[topic] || [], day = today();
    let run = runs[runs.length - 1];
    if (!run || run.d !== day) runs.push(run = { d: day, a: [] });
    run.a.push(d.ok ? 1 : 0);
    g[topic] = runs;
    api.set('f8', clean(g));
  });

  F.on('screen', d => {
    const slot = F.slot('arena-top'); if (!slot) return;
    slot.innerHTML = '';
    const api = F.api();
    if (!api || !api.user() || d.name !== 'topic' || d.mode !== 'arena' || !d.topic) return;
    const runs = load(api)[d.topic]; if (!runs) return;
    const run = runs[runs.length - 1], before = runs[runs.length - 2], shown = run.a.slice(-SHOWN);
    const s = Math.min(RISE, ROOM / (right(shown) || 1)), anim = F.still() ? '' : ' fun-draw';
    let x = X0, y = Y0, path = 'M' + X0 + ' ' + Y0;
    shown.forEach(a => { if (a) { y = Math.round((y - s) * 100) / 100; path += 'V' + y; } x += STEP; path += 'H' + x; });
    const text = 'First tries right: ' + count(run) + (run.d !== today() ? ' last time.' : before ? ' today, ' + count(before) + ' last time.' : ' today.');
    slot.innerHTML = '<span class="fun-run"><svg viewBox="0 0 320 44" preserveAspectRatio="xMinYMid meet" role="img" aria-label="Your run: ' + count(run) + ' first tries right.">' +
      '<path class="base" d="M6 38H314" fill="none" stroke-width="1"/>' +
      '<path class="line' + anim + '" d="' + path + '" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>' +
      '<circle class="' + anim.trim() + '" cx="' + x + '" cy="' + y + '" r="3" fill="#D9480F"/></svg>' +
      '<span class="fun-dim">' + F.esc(text) + '</span></span>';
  });
})();
