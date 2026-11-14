// Fun modules for the midterm practice arena: shared helpers (Oyun, 14.11.2026).
// The modules only listen to the arena's events and fill the empty slots practice.js renders (<span class="fun" data-fun="NAME">).
// They never read a question's text, options or key, never run before the verdict, and add no points (only f7 calls award('Q0')).
// Bridge (practice.js): window.MicroPractice.fun; events on document: arena:screen, arena:answer, arena:total, arena:board.
(function () {
  'use strict';
  const F = window.MicroFun = window.MicroFun || {};
  F.api = () => (window.MicroPractice && window.MicroPractice.fun) || null;
  F.still = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } };
  F.esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  F.style = (id, css) => { if (document.getElementById('fun-css-' + id)) return; const s = document.createElement('style'); s.id = 'fun-css-' + id; s.textContent = css; document.head.appendChild(s); };
  F.slot = (name, topic) => document.querySelector('[data-fun="' + name + '"]' + (topic ? '[data-topic="' + topic + '"]' : ''));
  F.slots = name => [...document.querySelectorAll('[data-fun="' + name + '"]')];
  // a module must never break the arena: every handler is wrapped
  F.on = (evt, fn) => document.addEventListener('arena:' + evt, e => { try { fn(e.detail || {}); } catch (err) { if (window.console) console.warn('fun module', evt, err); } });
  F.isPrime = n => { if (!Number.isInteger(n) || n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
  F.factors = n => { const out = []; if (!Number.isInteger(n) || n < 2) return out; for (let d = 2; d * d <= n; d++) while (n % d === 0) { out.push(d); n /= d; } if (n > 1) out.push(n); return out; };
  F.num = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');   // 1 487 with a narrow space

  // ---------- mastery: the one definition every module uses ----------
  // A question type is mastered when 2 of its questions are answered right at the first try (a type with one question needs 1).
  // F.mastery(api, topicId) -> { m: mastered types, n: types, f: questions right at the first try, step: 0…3 for the diagram }
  F.mastery = (api, topic) => {
    const items = api.items(topic) || [], done = api.done() || {}, types = {};
    items.forEach(it => { const t = types[it.type] = types[it.type] || { all: 0, first: 0 }; t.all++; const d = done[it.id]; if (d && d.p > 0 && !d.w && !d.gave) t.first++; });
    const list = Object.values(types), n = list.length, m = list.filter(t => t.first >= Math.min(2, t.all)).length, f = list.reduce((a, t) => a + t.first, 0);
    return { m, n, f, step: !n || !f ? 0 : m === n ? 3 : m / n >= 0.5 ? 2 : 1 };
  };
  // the student's answered questions in time order, as { id, topic, first: right at the first try }
  F.history = api => { const topicOf = {}; (api.topics() || []).forEach(t => (api.items(t.id) || []).forEach(it => { topicOf[it.id] = t.id; }));
    return Object.entries(api.done() || {}).filter(([id]) => topicOf[id]).map(([id, d]) => ({ id, topic: topicOf[id], at: d.at || '', first: !!(d.p > 0 && !d.w && !d.gave) })).sort((x, y) => x.at < y.at ? -1 : x.at > y.at ? 1 : 0); };

  // ---------- the six topic diagrams: one tiny picture per topic, drawn in three steps ----------
  // viewBox 0 0 64 64; the axes are step 0; steps 1 to 3 add the elements below. Colours: indifference curves and demand blue,
  // budget lines orange (R76), supply red as in the solution figures.
  const IC = '#0062C4', BUD = '#D9480F', SUP = '#c0392b', INK = '#1d1d1f';
  const P = (d, c) => ({ t: 'path', d, c }), DOT = (x, y) => ({ t: 'dot', x, y });
  const bars = (a, b) => { let d = ''; for (let i = a; i < b; i++) d += 'M' + (13.5 + i * 5) + ' 56V30'; return { t: 'path', d, c: INK, w: 3, o: .75 }; };
  F.DIAGRAMS = {
    sd: [[P('M12 14L54 50', IC)], [P('M12 50L54 14', SUP)], [DOT(33, 32)]],                                           // demand, supply, equilibrium
    pc: [[bars(0, 3)], [bars(3, 6)], [bars(6, 9), P('M10 30H58', BUD)]],                                              // many small sellers, one price
    pref: [[P('M12 22Q14 48 40 50', IC)], [P('M20 14Q22 42 50 44', IC)], [P('M28 8Q30 36 58 38', IC)]],               // three indifference curves
    rc: [[P('M8 16L44 56', BUD)], [P('M8 34L58 56', BUD)], [DOT(18, 27.1), DOT(48, 51.6)]],                           // two budgets, two choices
    words: [[P('M8 12L30 30', BUD)], [P('M30 30L42 56', BUD)], [DOT(30, 30)]],                                        // a kinked budget line
    opt: [[P('M8 14L50 56', BUD)], [P('M28.5 7.5Q26.3 33.7 52.5 31.5', IC, 1)], [P('M22.1 13.9Q19.9 40.1 46.1 37.9', IC), DOT(27, 33)]]   // budget, a curve, the tangency
  };
  // what a wrong answer shows instead of step 3: the last element misses (hollow dots, a faint line); never the finished picture
  const HOLLOW = (x, y) => ({ t: 'hollow', x, y }), FAINT = (d, c) => ({ t: 'path', d, c, o: .4 });
  F.MISSES = { sd: [HOLLOW(40, 25)], pc: [FAINT('M10 22H58', BUD)], pref: [FAINT('M28 8Q30 36 58 38', IC)], rc: [HOLLOW(24, 21), HOLLOW(53, 46)], words: [HOLLOW(36, 24)], opt: [HOLLOW(27, 33)] };
  const draw = (e, cls) => e.t === 'dot' ? '<circle cx="' + e.x + '" cy="' + e.y + '" r="3" fill="' + INK + '" class="' + cls + '"/>'
    : e.t === 'hollow' ? '<circle cx="' + e.x + '" cy="' + e.y + '" r="3" fill="#fff" stroke="' + INK + '" stroke-width="1.4" class="' + cls + '"/>'
    : '<path d="' + e.d + '" fill="none" stroke="' + e.c + '" stroke-width="' + (e.w || 2) + '" stroke-linecap="round" pathLength="1" opacity="' + (e.o || 1) + '" class="' + cls + '"/>';
  // F.diagram(topicId, step, {size, animate, miss, label})
  //   step 0…3; animate: the newest step draws itself (once); miss: steps 1 and 2 plus the topic's "miss" mark (a wrong answer)
  F.diagram = (topic, step, o) => {
    o = o || {}; const D = F.DIAGRAMS[topic]; if (!D) return '';
    step = Math.max(0, Math.min(3, step | 0));
    const anim = o.animate && !F.still();
    let g = '';
    for (let s = 0; s < (o.miss ? 2 : step); s++) {
      if (topic === 'opt' && s === 1 && step === 3 && !o.miss) continue;     // the far curve gives way to the tangent one
      g += D[s].map(e => draw(e, anim && s === step - 1 && !o.miss ? 'fun-draw' : '')).join('');
    }
    if (o.miss) g += F.MISSES[topic].map(e => draw(e, anim ? 'fun-draw' : '')).join('');
    const size = o.size || 48;
    return '<svg class="fun-dg" viewBox="0 0 64 64" width="' + size + '" height="' + size + '" role="img" aria-label="' + F.esc(o.label || '') + '"' + (o.label ? '' : ' aria-hidden="true"') + '>' +
      '<path d="M8 6V56H60" fill="none" stroke="#9aa0a8" stroke-width="1"/>' + g + '</svg>';
  };
  F.style('core', '.fun{display:contents}.fun:empty{display:none}.fun-dg{display:block;flex:none}' +
    '.fun-dim{color:#6b6f76;font-size:.85rem}' +
    '@media (prefers-reduced-motion: no-preference){' +
    'path.fun-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:fun-draw .45s ease-out forwards}' +
    'circle.fun-draw{opacity:0;animation:fun-in .2s ease-out .3s forwards}' +
    '@keyframes fun-draw{to{stroke-dashoffset:0}}@keyframes fun-in{to{opacity:1}}}');
})();
