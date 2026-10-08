// Animated supply/demand graphs (Tolga, 08.10): one step per click, each step slides in over ~1.2 s.
// Markup (written by tools/build_deck.js): <div class="agraph" data-mode="frag|card" data-spec='{…}'></div>
// spec = Sinan's format: {axes: {qmax, pmax, qlabel, plabel}, curves: [{id, p0, s, side?}], steps: [...], base?: [...]}
// steps: {show:[ids]} · {point:[q,p], label} · {mark:"eq", of:[id,id]} · {shift:id, to:{id,p0,s}} · {price_line:p}
//        {gap:{at,qd,qs}} · {wedge:{T,on}} · {alt:[{label, shift, to, eq}, …]} (= one step per ending) · {hl:p} · {mark_at:[q,p]}
// base = steps drawn before the first click (no animation). bg = {vals, side} faint unit bars (solid at/above the price line).
// Modes: "frag" = driven by the slide's fragments (<span class="fragment gstep" data-g="<id>">: n visible = step n);
//        "card" = inside an answer card: step 1 when the card opens, then → / space / clicker or [next step ▶].
(function () {
  const NS = 'http://www.w3.org/2000/svg', DUR = 1200;
  const W = 560, H = 340, L = 64, B = 40, T = 22, R = 18, pw = W - L - R, ph = H - T - B;
  const BLUE = '#0062C4', ORANGE = '#D9480F', PURPLE = '#7A3DB8';  // Can, 08.10: stronger colours
  const fmt = v => String(Math.round(v * 100) / 100);
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const isD = c => (c.side || (/^d/i.test(c.id) ? 'demand' : 'supply')) === 'demand';

  // ---------- scenes: one map of items per step ----------
  function scenes(spec) {
    const cur = {};            // id → {key, p0, s, side}
    const orig = {};           // first demand / first supply (for the tax wedge)
    spec.curves.forEach(c => { cur[c.id] = { key: 'c-' + c.id, p0: +c.p0, s: +c.s, side: isD(c) ? 'demand' : 'supply', label: c.label || c.id }; if (isD(c) && !orig.d) orig.d = cur[c.id]; if (!isD(c) && !orig.s) orig.s = cur[c.id]; });
    let items = {}, n = 0, lastEq = null, dirs = {};
    const curveItem = (c, extra) => Object.assign({ kind: 'curve', p0: c.p0, s: c.s, side: c.side, label: c.label, op: 1 }, extra || {});
    const eqOf = (a, b) => { const q = (a.p0 - b.p0) / (b.s - a.s); return [q, a.p0 + a.s * q]; };
    const dim = () => Object.values(items).forEach(it => { if (it.kind === 'eq') it.op = 0.35; });
    const clone = o => JSON.parse(JSON.stringify(o));
    function apply(st) {
      if (st.show) st.show.forEach(id => { const c = cur[id]; if (c) items[c.key] = curveItem(c); });
      if (st.point) items['pt' + (n++)] = { kind: 'point', q: +st.point[0], p: +st.point[1], label: st.label || '', op: 1 };
      // a new equilibrium after an earlier one: arrows on the axes from the old P and Q to the new ones (Can, 08.10)
      const eqArrows = (q, p) => { if (lastEq && (Math.abs(lastEq[0] - q) > 1e-9 || Math.abs(lastEq[1] - p) > 1e-9)) items.axarr = { kind: 'axarr', q0: lastEq[0], q1: q, p0: lastEq[1], p1: p, op: 1 }; };
      if (st.mark === 'eq' && st.of) { const [a, b] = st.of.map(id => cur[id]); if (a && b) { const [q, p] = eqOf(a, b); eqArrows(q, p); lastEq = [q, p]; items['eq' + (n++)] = { kind: 'eq', q, p, op: 1 }; } }
      if (st.mark_at) { const [q, p] = st.mark_at.map(Number); if (!st.quiet) eqArrows(q, p); lastEq = [q, p]; items['eq' + (n++)] = { kind: 'eq', q, p, op: 1 }; }
      if (st.shift) {
        const c = cur[st.shift]; if (!c) return;
        // the old curve stays faint where it was; the curve itself slides to its new place
        items['g-' + st.shift] = curveItem(c, { ghost: 1, op: 0.3, label: c.label });
        const nid = st.to.id || st.shift, nc = { key: c.key, p0: +st.to.p0, s: st.to.s != null ? +st.to.s : c.s, side: c.side, label: st.to.label || st.to.id || c.label };
        if (nid !== st.shift) cur[st.shift] = Object.assign({}, c, { key: 'g-' + st.shift });
        cur[nid] = nc;
        items[c.key] = curveItem(nc);
        // the direction only as a small tag in the top-left corner (Can, 08.10: arrows on the curves overlap and confuse)
        const pa = ((spec.axes || {}).pmax || 1) * 0.5, qa = (pa - c.p0) / c.s, qb = (pa - nc.p0) / nc.s;
        if (isFinite(qa) && isFinite(qb) && Math.abs(qa - qb) > 1e-9) { dirs[c.side] = qb > qa ? '→' : '←'; items.tag = { kind: 'tag', text: ['demand', 'supply'].filter(k => dirs[k]).map(k => k + ' ' + dirs[k]).join(' · '), op: 1 }; }
        dim();
      }
      if (st.price_line != null) items.price = { kind: 'price', p: +st.price_line, op: 1, label: st.label || '', solid: st.solid ? 1 : 0 };
      if (st.hl != null) items['hl' + (n++)] = { kind: 'hl', p: +st.hl, op: 1 };
      // gap: the two points (+ dashed lines down); bar: 0 → the highlighted gap comes with a later {gapbar: true} step
      if (st.gap) Object.keys(items).forEach(k => { if (items[k].kind === 'gap') delete items[k]; });  // a new gap replaces the old one
      if (st.gap) items['gap' + (n++)] = { kind: 'gap', p: +st.gap.at, qd: +st.gap.qd, qs: +st.gap.qs, op: 1, bar: st.gap.bar != null ? +st.gap.bar : 1, label: st.gap.label || '' };
      if (st.gapbar) Object.values(items).forEach(it => { if (it.kind === 'gap') it.bar = 1; });
      if (st.wedge && lastEq) { const q = lastEq[0]; items['wedge' + (n++)] = { kind: 'wedge', q, pb: orig.d.p0 + orig.d.s * q, ps: orig.s.p0 + orig.s.s * q, T: +st.wedge.T, op: 1 }; }
      if (st.note) items.note = { kind: 'note', text: st.note, op: 1 };
    }
    (spec.base || []).forEach(apply);
    const out = [clone(items)];
    (spec.steps || []).forEach(st => {
      if (st.alt) {
        // "cannot be determined": each ending from the same starting point, one per click
        const keepItems = clone(items), keepCur = clone(cur), keepN = n, keepEq = lastEq, keepDirs = clone(dirs);
        st.alt.forEach(a => {
          items = clone(keepItems); Object.keys(cur).forEach(k => delete cur[k]); Object.assign(cur, clone(keepCur)); n = keepN; lastEq = keepEq; dirs = clone(keepDirs);
          apply({ shift: a.shift, to: a.to });
          if (a.eq) apply({ mark_at: a.eq }); else { const d = Object.values(cur).find(c => c.side === 'demand' && !/^g-/.test(c.key)), s = Object.values(cur).find(c => c.side === 'supply' && !/^g-/.test(c.key)); if (d && s) apply({ mark_at: eqOf(d, s) }); }
          items.note = { kind: 'note', text: a.label || '', op: 1 };
          out.push(clone(items));
        });
        return;
      }
      apply(st); out.push(clone(items));
    });
    return out;
  }

  // ---------- tween between two scenes ----------
  function mix(A, B, t) {
    const o = {};
    new Set([...Object.keys(A), ...Object.keys(B)]).forEach(k => {
      const a = A[k], b = B[k];
      if (a && b) { const m = Object.assign({}, b); Object.keys(b).forEach(f => { if (typeof b[f] === 'number' && typeof a[f] === 'number') m[f] = a[f] + (b[f] - a[f]) * t; }); if (a.kind === 'note' && a.text !== b.text) m.op = t; o[k] = m; }
      else if (b) o[k] = Object.assign({}, b, { op: (b.op == null ? 1 : b.op) * t });
      else o[k] = Object.assign({}, a, { op: (a.op == null ? 1 : a.op) * (1 - t) });
    });
    return o;
  }

  // curve names (Can + Kemal, 08.10): demand 15 % along the line from its left end, above it; supply 85 %, below/right
  // of it; a second line of the same side at 30 % / 70 %; always inside the plot; bold, with a white halo so no line crosses it
  function curveLabel(x0, y0, x1, y1, side, nth, text, col, L, T, pw, ph, cw) {
    const t = side === 'demand' ? (nth ? 0.30 : 0.15) : (nth ? 0.70 : 0.85);
    let lx = x0 + t * (x1 - x0), ly = y0 + t * (y1 - y0);
    if (side === 'demand') { lx += 6; ly -= 8; } else { lx += 8; ly += 16; }
    lx = Math.max(L + 4, Math.min(lx, L + pw - String(text).length * cw)); ly = Math.max(T + 10, Math.min(ly, T + ph - 4));
    return `<text x="${lx}" y="${ly}" text-anchor="start" fill="${col}" font-weight="600" stroke="#fff" stroke-width="3" paint-order="stroke">${text}</text>`;
  }
  // ---------- draw one scene ----------
  function draw(spec, sc) {
    const ax = spec.axes, x = q => L + q / ax.qmax * pw, y = p => T + ph - p / ax.pmax * ph;
    const eur = ax.eur != null ? ax.eur : (/€/.test(ax.plabel || '€') ? '€' : '');
    const P = v => eur + fmt(v);
    // axis numbers: collected first, then drawn without overlaps (the more important one wins)
    const yl = [], xl = [];
    const PL = (p, text, fill, pri, op) => yl.push({ y: y(p) + 5, text, fill, pri, op });
    const QL = (q, text, fill, pri, op) => xl.push({ x: x(q), text, fill, pri, op });
    let s = `<svg class="graph" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Mono,monospace" font-size="14">`;
    s += `<line x1="${L}" y1="${T}" x2="${L}" y2="${T + ph}" stroke="#222"/><line x1="${L}" y1="${T + ph}" x2="${L + pw}" y2="${T + ph}" stroke="#222"/>`;
    s += `<text x="${L - 8}" y="${T - 8}" fill="#777" font-size="12">${ax.plabel || 'P'}</text><text x="${L + pw}" y="${T + ph + 34}" text-anchor="end" fill="#777" font-size="12">${ax.qlabel || 'Q'}</text>`;
    const price = sc.price && sc.price.op > 0.01 ? sc.price.p : null;
    if (spec.bg) {
      const vals = spec.bg.vals, c = spec.bg.side === 'supply' ? ORANGE : BLUE;
      vals.forEach((v, i) => { const vv = Math.min(v, ax.pmax), on = price != null && (spec.bg.side === 'supply' ? v <= price : v >= price); s += `<rect x="${x(i) + 0.5}" y="${y(vv)}" width="${Math.max(x(i + 1) - x(i) - 1, 1)}" height="${T + ph - y(vv)}" fill="${c}" opacity="${on ? 0.42 : 0.13}"/>`; });
      if (price != null) { const k = vals.filter(v => spec.bg.side === 'supply' ? v <= price : v >= price).length; s += `<text x="${L + pw}" y="${T + 4}" text-anchor="end" font-size="16">at ${P(price)}: <tspan font-weight="600">${k} of you buy</tspan></text>`; }
    }
    const items = Object.values(sc);
    const byKind = k => items.filter(it => it.kind === k && it.op > 0.01);
    byKind('hl').forEach(it => { s += `<g opacity="${it.op}"><line x1="${L}" y1="${y(it.p)}" x2="${L + pw}" y2="${y(it.p)}" stroke="#bbb" stroke-dasharray="4 4"/></g>`; PL(it.p, P(it.p), '#777', 1, it.op); });
    // curves (ghosts first); names drawn after all lines
    const nth = { demand: 0, supply: 0 }, names = [];
    byKind('curve').sort((a, b) => (b.ghost || 0) - (a.ghost || 0)).forEach(c => {
      let q0 = 0, p0 = c.p0;
      if (p0 > ax.pmax) { q0 = (ax.pmax - c.p0) / c.s; p0 = ax.pmax; }
      if (p0 < 0) { q0 = -c.p0 / c.s; p0 = 0; }
      let q1 = ax.qmax, p1 = c.p0 + c.s * q1;
      if (p1 < 0) { q1 = -c.p0 / c.s; p1 = 0; }
      if (p1 > ax.pmax) { q1 = (ax.pmax - c.p0) / c.s; p1 = ax.pmax; }
      const col = c.side === 'demand' ? BLUE : ORANGE;
      s += `<g opacity="${c.op}"><line x1="${x(q0)}" y1="${y(p0)}" x2="${x(q1)}" y2="${y(p1)}" stroke="${col}" stroke-width="${c.ghost ? 2 : 3.5}"${c.ghost ? ' stroke-dasharray="7 5"' : ''}/>` +
        '</g>';
      if (!c.ghost) names.push(`<g opacity="${c.op}">` + curveLabel(x(q0), y(p0), x(q1), y(p1), c.side, nth[c.side]++, c.label, col, L, T, pw, ph, 8.6) + '</g>');
      if (spec.ticks && q0 === 0) PL(p0, P(p0), c.ghost ? '#aaa' : col, c.ghost ? 0 : 2, c.op);
      if (spec.ticks && !c.ghost && p1 === 0 && c.s < 0) QL(q1, fmt(q1), col, 2, c.op);
    });
    s += names.join('');
    if (sc.price && sc.price.op > 0.01) { const it = sc.price; s += `<g opacity="${it.op}"><line x1="${L}" y1="${y(it.p)}" x2="${L + pw}" y2="${y(it.p)}" stroke="#111" stroke-width="${it.solid ? 2.5 : 1.5}"${it.solid ? '' : ' stroke-dasharray="7 5"'}/>` + (it.label ? `<text x="${L + pw}" y="${y(it.p) - 10}" text-anchor="end" font-weight="600" stroke="#fff" stroke-width="3" paint-order="stroke">${it.label}</text>` : '') + '</g>'; PL(it.p, P(it.p), '#111', 4, it.op); }
    byKind('eq').forEach(it => s += `<g opacity="${it.op}"><line x1="${x(it.q)}" y1="${y(it.p)}" x2="${x(it.q)}" y2="${T + ph}" stroke="#888" stroke-dasharray="3 3"/><line x1="${L}" y1="${y(it.p)}" x2="${x(it.q)}" y2="${y(it.p)}" stroke="#888" stroke-dasharray="3 3"/><circle cx="${x(it.q)}" cy="${y(it.p)}" r="6" fill="#111"/></g>`);
    byKind('eq').forEach(it => { const pri = it.op > 0.6 ? 5 : 1; PL(it.p, P(it.p), '#111', pri, it.op); QL(it.q, fmt(it.q), '#111', pri, it.op); });
    byKind('point').forEach(it => {
      // on the price axis: left of it if short, else right of the point (long labels like "20 cents" were cut off)
      const long = String(it.label).length > 5;
      const lx = it.q === 0 ? (long ? L + 12 : L - 8) : x(it.q), ly = it.p === 0 ? T + ph + 18 : y(it.p) + 5, an = it.q === 0 ? (long ? 'start' : 'end') : 'middle';
      s += `<g opacity="${it.op}"><circle cx="${x(it.q)}" cy="${y(it.p)}" r="6" fill="#111"/><text x="${lx}" y="${it.q !== 0 && it.p !== 0 ? y(it.p) - 10 : (it.q === 0 && long ? y(it.p) - 10 : ly)}" text-anchor="${an}" font-weight="600" stroke="#fff" stroke-width="3" paint-order="stroke">${it.label}</text></g>`;
    });
    byKind('gap').forEach(it => {
      const short = it.qd > it.qs, yy = y(it.p), col = PURPLE, bo = it.op * (it.bar == null ? 1 : it.bar), a = Math.min(x(it.qs), x(it.qd)), b = Math.max(x(it.qs), x(it.qd));
      // the gap highlighted on the price line (Can, 08.10: "much more than a dashed line"), then its label below
      s += `<g opacity="${bo}"><rect x="${a}" y="${yy - 7}" width="${b - a}" height="14" fill="${col}" opacity="0.4"/>` +
        `<text x="${(a + b) / 2}" y="${yy + 30}" text-anchor="middle" fill="${col}" font-weight="600" font-size="16" stroke="#fff" stroke-width="3" paint-order="stroke">${it.label || (short ? 'shortage ' : 'surplus ') + fmt(Math.abs(it.qd - it.qs))}</text></g>` +
        `<g opacity="${it.op}"><line x1="${x(it.qs)}" y1="${yy}" x2="${x(it.qs)}" y2="${T + ph}" stroke="${ORANGE}" stroke-dasharray="3 3"/><line x1="${x(it.qd)}" y1="${yy}" x2="${x(it.qd)}" y2="${T + ph}" stroke="${BLUE}" stroke-dasharray="3 3"/>` +
        `<circle cx="${x(it.qs)}" cy="${yy}" r="7" fill="${ORANGE}"/><circle cx="${x(it.qd)}" cy="${yy}" r="7" fill="${BLUE}"/></g>`; QL(it.qs, fmt(it.qs), ORANGE, 6, it.op); QL(it.qd, fmt(it.qd), BLUE, 6, it.op);
    });
    // arrows: the shift of a curve, and old → new equilibrium on both axes
    const head = (x1, y1, x2, y2, c) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 9; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2.5"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(a - 0.45)},${y2 - h * Math.sin(a - 0.45)} ${x2 - h * Math.cos(a + 0.45)},${y2 - h * Math.sin(a + 0.45)}" fill="${c}"/>`; };
    if (sc.tag && sc.tag.op > 0.01) s += `<text x="${L + 10}" y="${T + 14}" fill="#555" font-size="13" opacity="${sc.tag.op}">${sc.tag.text}</text>`;
    byKind('axarr').forEach(it => {
      let g = '';
      if (Math.abs(x(it.q1) - x(it.q0)) > 12) g += head(x(it.q0), T + ph - 9, x(it.q1), T + ph - 9, '#111');
      if (Math.abs(y(it.p1) - y(it.p0)) > 12) g += head(L + 9, y(it.p0), L + 9, y(it.p1), '#111');
      s += `<g opacity="${it.op}">${g}</g>`;
    });
    byKind('wedge').forEach(it => {
      const xx = x(it.q);
      s += `<g opacity="${it.op}"><line x1="${xx}" y1="${y(it.pb)}" x2="${xx}" y2="${y(it.ps)}" stroke="${PURPLE}" stroke-width="5"/><circle cx="${xx}" cy="${y(it.pb)}" r="5" fill="${BLUE}"/><circle cx="${xx}" cy="${y(it.ps)}" r="5" fill="${ORANGE}"/>` +
        `<line x1="${L}" y1="${y(it.pb)}" x2="${xx}" y2="${y(it.pb)}" stroke="${BLUE}" stroke-dasharray="3 3"/><line x1="${L}" y1="${y(it.ps)}" x2="${xx}" y2="${y(it.ps)}" stroke="${ORANGE}" stroke-dasharray="3 3"/>` +
        `<text x="${xx + 14}" y="${y(it.pb) - 12}" fill="${BLUE}" font-weight="600">buyers pay ${P(it.pb)}</text><text x="${xx + 14}" y="${y(it.ps) + 24}" fill="${ORANGE}" font-weight="600">sellers keep ${P(it.ps)}</text><text x="${xx - 14}" y="${(y(it.pb) + y(it.ps)) / 2 + 5}" text-anchor="end" fill="${PURPLE}" font-weight="600">tax ${P(it.T)}</text></g>`;
      PL(it.pb, P(it.pb), BLUE, 7, it.op); PL(it.ps, P(it.ps), ORANGE, 7, it.op);
    });
    const put = (arr, key, gap, draw) => { const done = []; arr.filter(a => a.op > 0.01).sort((a, b) => b.pri - a.pri).forEach(a => { if (done.some(d => Math.abs(d[key] - a[key]) < gap)) return; done.push(a); s += draw(a); }); };
    put(yl, 'y', 15, a => `<text x="${L - 6}" y="${a.y}" text-anchor="end" fill="${a.fill}" opacity="${Math.min(1, a.op)}"${a.pri >= 4 ? ' font-weight="600"' : ''}>${a.text}</text>`);
    put(xl, 'x', 26, a => `<text x="${a.x}" y="${T + ph + 18}" text-anchor="middle" fill="${a.fill}" opacity="${Math.min(1, a.op)}"${a.pri >= 4 ? ' font-weight="600"' : ''}>${a.text}</text>`);
    if (sc.note && sc.note.op > 0.01 && sc.note.text) s += `<text x="${L + pw}" y="${T + 4}" text-anchor="end" font-size="16" font-weight="600" opacity="${sc.note.op}">${sc.note.text}</text>`;
    return s + '</svg>';
  }

  // ---------- one graph ----------
  const all = [];
  function setup(el) {
    let spec; try { spec = JSON.parse(el.dataset.spec); } catch (e) { return; }
    const sc = scenes(spec), box = document.createElement('div'); box.className = 'ag-svg';
    el.appendChild(box);
    const g = { el, spec, sc, step: 0, shown: sc[0], raf: 0, max: sc.length - 1 };
    const paint = s => { g.shown = s; box.innerHTML = draw(spec, s); };
    g.go = (n, instant) => {
      n = Math.max(0, Math.min(g.max, n)); cancelAnimationFrame(g.raf);
      const from = g.shown, to = sc[n]; g.step = n; upd();
      if (instant || from === to) { paint(to); return; }
      const t0 = performance.now();
      const tick = now => { const t = Math.min(1, (now - t0) / DUR); paint(t < 1 ? mix(from, to, ease(t)) : to); if (t < 1) g.raf = requestAnimationFrame(tick); };
      g.raf = requestAnimationFrame(tick);
    };
    // buttons: [◀ step] [next step ▶] [↺ replay] (card mode; frag mode only ↺)
    const bar = document.createElement('div'); bar.className = 'ag-bar';
    const prev = mkb('◀', 'step back'), next = mkb('next step ▶', 'next step (→ / space)'), again = mkb('↺ replay', 'play all steps again'), cnt = document.createElement('span'); cnt.className = 'dim ag-n';
    function mkb(t, title) { const b = document.createElement('button'); b.className = 'btn ghost'; b.textContent = t; b.title = title; return b; }
    const card = el.dataset.mode !== 'frag';  // card and poll mode: stepped by the presenter
    if (card) { bar.appendChild(prev); bar.appendChild(next); }
    bar.appendChild(again); bar.appendChild(cnt);
    if (g.max > 0) el.appendChild(bar);
    function upd() { prev.disabled = g.step <= 1; next.disabled = g.step >= g.max; cnt.textContent = card ? 'step ' + g.step + ' / ' + g.max : ''; }
    prev.onclick = () => g.go(g.step - 1); next.onclick = () => g.go(g.step + 1);
    again.onclick = () => {
      // replay: back to the start, then every step again, one by one
      const end = card ? g.step || g.max : g.step || g.max; g.go(card ? 0 : 0, true);
      let i = 0; const run = () => { if (++i > end) return; g.go(i); setTimeout(run, DUR + 300); }; setTimeout(run, 150);
    };
    paint(sc[0]); upd();
    all.push(g); el.__ag = g;
    return g;
  }

  // ---------- drivers ----------
  const PRINT = /print-pdf/.test(location.search);
  const visibleGraphs = () => {
    const cur = window.Reveal && Reveal.getCurrentSlide && Reveal.getCurrentSlide();
    return all.filter(g => cur && cur.contains(g.el) && g.el.offsetParent !== null);
  };
  // frag mode: the number of visible gstep fragments = the step
  function syncFrag(animate) {
    all.filter(g => g.el.dataset.mode === 'frag').forEach(g => {
      const sec = g.el.closest('section'); if (!sec) return;
      const n = sec.querySelectorAll('.gstep.fragment.visible[data-g="' + g.el.id + '"]').length;
      if (n !== g.step) g.go(n, !animate);
    });
  }
  // card mode: step 1 when the answer card opens
  function openCards() {
    all.filter(g => g.el.dataset.mode === 'card' && g.step === 0 && g.el.offsetParent !== null).forEach(g => g.go(1));
  }
  // → / space / page down (clicker) go through the open graph's steps before the deck moves on; ← / page up go back
  window.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    const fwd = ['ArrowRight', 'PageDown', ' ', 'n', 'ArrowDown'].includes(e.key), back = ['ArrowLeft', 'PageUp', 'p', 'ArrowUp'].includes(e.key);
    if (!fwd && !back) return;
    const g = visibleGraphs().find(g => g.el.dataset.mode !== 'frag' && g.step > 0);
    if (!g) return;
    if (fwd && g.step < g.max) { g.go(g.step + 1); e.preventDefault(); e.stopImmediatePropagation(); }
    else if (back && g.step > 1) { g.go(g.step - 1); e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  function init() {
    document.querySelectorAll('.agraph').forEach(setup);
    if (PRINT) { all.forEach(g => g.go(g.max, true)); return; }
    // phones (no fragments): show the end state; ↺ replays it
    if (window.MICRO_MOBILE) all.filter(g => g.el.dataset.mode === 'frag').forEach(g => g.go(g.max, true));
    const hook = () => {
      if (!window.Reveal || !Reveal.on) return;
      Reveal.on('fragmentshown', () => syncFrag(true)); Reveal.on('fragmenthidden', () => syncFrag(true));
      Reveal.on('slidechanged', () => { if (!window.MICRO_MOBILE) syncFrag(false); });
      Reveal.on('ready', () => { if (!window.MICRO_MOBILE) syncFrag(false); });
    };
    hook();
    // poll mode: the first step plays after this person's choice on the same slide / variant (also a remembered one)
    document.addEventListener('micropoll:saved', e => {
      const box = e.target.closest('.set-v') || e.target.closest('section'); if (!box) return;
      box.querySelectorAll('.agraph[data-mode="poll"]').forEach(el => { const g = el.__ag; if (g && g.step === 0) g.go(1, !!(e.detail && e.detail.restored)); });
    });
    // answer cards open by a class/attribute change: watch them
    new MutationObserver(() => openCards()).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['hidden', 'class'] });
  }
  window.MicroGraph = { scenes, draw, setup, all };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
