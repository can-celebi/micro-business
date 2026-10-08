// Build a lecture deck (reveal.js) from the storyboard page.
// Usage: node tools/build_deck.js L02 [path/to/storyboard.html]
// Reads the S array (slides) of the storyboard, skips removed slides (min 0 / tag "removed"),
// uses the first variant where a slide offers several (Can's later choices are applied by editing the storyboard),
// and writes lectures/<L>/index.html. Polls, show-answer boxes, notes, sliders and graphs follow CLAUDE.md's recipe.
const fs = require('fs'), path = require('path');
const LEC = process.argv[2] || 'L02';
const SB = process.argv[3] || path.join(__dirname, '..', '..', '02_overview-html', 'W02_storyboard_v2_L02-L03.html');
const h = fs.readFileSync(SB, 'utf8');
const S = eval(h.slice(h.indexOf('const S = [') + 10, h.indexOf('// ---------- state')).trim().replace(/;\s*$/, ''));
const V = '20261009c';
const NUM = parseInt(LEC.slice(1), 10);  // L03 → 3

const esc = s => String(s);
const strip = s => String(s).replace(/<[^>]+>/g, '');
const safeId = s => String(s).replace(/[^A-Za-z0-9-]/g, '-');

// ---------- graphs ----------
// the class's demand curve: one step per person, exactly from the 41 answers (Kemal, 08.10: the bars and the steps
// coincide); price = a price line and a dot where it meets the staircase, with the count
function svgSteps(g, price) {
  const W = 520, H = 300, L = 48, B = 34, T = 22, R = 14, pw = W - L - R, ph = H - T - B, qm = 42, pm = 60, V = CLASS_VALS;
  const x = q => L + q / qm * pw, y = p => T + ph - Math.min(p, pm) / pm * ph;
  let d = 'M' + x(0) + ',' + y(V[0]);
  V.forEach((v, i) => { d += ' L' + x(i) + ',' + y(v) + ' L' + x(i + 1) + ',' + y(v); });
  d += ' L' + x(V.length) + ',' + y(0);
  let s = `<svg class="graph" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Mono,monospace" font-size="13"><line x1="${L}" y1="${T}" x2="${L}" y2="${T + ph}" stroke="#222"/><line x1="${L}" y1="${T + ph}" x2="${L + pw}" y2="${T + ph}" stroke="#222"/>`;
  // bars: true (Kemal, 08.10): the class's 41 answers as faded bars behind the staircase (one bar = one of you)
  if (g && g.bars) V.forEach((v, i) => { s += `<rect x="${x(i) + 0.5}" y="${y(v)}" width="${x(i + 1) - x(i) - 1}" height="${T + ph - y(v)}" fill="#0062C4" opacity="0.15"/>`; });
  s += `<path d="${d}" fill="none" stroke="#0062C4" stroke-width="3"/>`;
  [0, 20, 40, 60].forEach(p => s += `<text x="${L - 6}" y="${y(p) + 4}" text-anchor="end" fill="#777">€${p}</text>`);
  [0, 10, 20, 30, 40].forEach(q => s += `<text x="${x(q)}" y="${T + ph + 18}" text-anchor="middle" fill="#777">${q}</text>`);
  const p = price == null ? 20 : price, n = V.filter(v => v >= p).length;
  if (price != null) s += `<line x1="${L}" y1="${y(p)}" x2="${L + pw}" y2="${y(p)}" stroke="#111" stroke-dasharray="6 4"/>`;
  s += `<circle cx="${x(n)}" cy="${y(p)}" r="6" fill="#111"/><text x="${L + pw}" y="${T - 6}" text-anchor="end" font-size="15">at €${p}: <tspan font-weight="600">${n} of you buy</tspan></text>`;
  s += `<text x="${L + pw}" y="${T + ph + 32}" text-anchor="end" fill="#777">how many of you buy</text></svg>`;
  return s;
}
// a price slider (Kemal, 08.10: slides 8 and 9): one picture per price, the slider shows one (no data, no API)
function priceSlider(min, max, step, start, pic) {
  const ps = []; for (let p = min; p <= max + 1e-9; p += step) ps.push(Math.round(p * 100) / 100);
  const i0 = Math.max(0, ps.indexOf(start));
  return `<div class="cd-pick cd-slide" data-prevent-swipe>` + ps.map((p, i) => `<div class="cd-g"${i === i0 ? '' : ' hidden'}>${pic(p)}</div>`).join('') +
    `<div class="cd-range"><span>€${min}</span><input type="range" min="0" max="${ps.length - 1}" step="1" value="${i0}" oninput="const w=this.closest('.cd-pick');w.querySelectorAll('.cd-g').forEach((g,j)=>g.hidden=j!==+this.value);this.nextElementSibling.textContent='€'+[${ps.join(',')}][+this.value]" onkeydown="event.stopPropagation()"><b>€${ps[i0]}</b><span>€${max}</span></div></div>`;
}
// the class's ChatGPT reservation prices (L02 poll, 41 answers): used by classdemand and lines.bg = "class"
const CLASS_VALS = [100, 60, 50, 50, 40, 40, 35, 30, 30, 29, 28, 25, 25, 25, 20, 20, 20, 20, 20, 20, 15, 13, 12, 10, 10, 10, 10, 10, 10, 10, 9, 8, 8, 5, 5, 5, 5, 5, 1, 0, 0];
// colours (Can, 08.10: stronger, visible on video; checked for colour-blind viewers): demand blue, supply orange, purple = third
const COL = side => side === 'demand' ? '#0062C4' : '#D9480F';
const fmt = v => String(Math.round(v * 100) / 100);
function axes(W, H, L, T, pw, ph) {
  return `<svg class="graph" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Mono,monospace" font-size="13"><line x1="${L}" y1="${T}" x2="${L}" y2="${T + ph}" stroke="#222"/><line x1="${L}" y1="${T + ph}" x2="${L + pw}" y2="${T + ph}" stroke="#222"/>`;
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
// straight demand/supply lines: lines [{n, p0, s, side?, dash?}], qmax, pmax, hl [prices], mark [q, p],
// bg "class" | {side, vals} (faint unit bars behind), read {across: p} | {up: q} (reading the first line)
function svgLines(g) {
  const W = 520, H = 320, L = 56, B = 34, T = 10, R = 14, pw = W - L - R, ph = H - T - B;
  const x = q => L + q / g.qmax * pw, y = p => T + ph - p / g.pmax * ph;
  let s = axes(W, H, L, T, pw, ph) + `<text x="${L - 8}" y="${T + 12}" text-anchor="end" fill="#777">P</text><text x="${L + pw}" y="${T + ph + 18}" text-anchor="end" fill="#777">Q</text>`;
  if (g.bg) {
    const vals = g.bg === 'class' ? CLASS_VALS : g.bg.vals, cc = COL(g.bg === 'class' ? 'demand' : g.bg.side);
    vals.forEach((v, i) => { const vv = Math.min(v, g.pmax); s += `<rect x="${x(i) + 0.5}" y="${y(vv)}" width="${Math.max(x(i + 1) - x(i) - 1, 1)}" height="${T + ph - y(vv)}" fill="${cc}" opacity="0.13"/>`; });
    // curve: true (Kemal, 08.10): the staircase as a thin step line too (its right corners lie on the straight line)
    if (g.bg.curve) { let d = ''; vals.forEach((v, i) => { const vv = Math.min(v, g.pmax); d += (i ? ' L' : 'M') + x(i) + ',' + y(vv) + ' L' + x(i + 1) + ',' + y(vv); }); s += `<path d="${d}" fill="none" stroke="${cc}" stroke-width="1.8"/>`; }
  }
  (g.hl || []).forEach(p => { s += `<line x1="${L}" y1="${y(p)}" x2="${L + pw}" y2="${y(p)}" stroke="#bbb" stroke-dasharray="4 4"/><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end" fill="#777">€${p}</text>`; });
  const nth = { demand: 0, supply: 0 }, names = [];
  g.lines.forEach(l => {
    let q1 = g.qmax, p1 = l.p0 + l.s * q1;
    if (p1 < 0) { q1 = -l.p0 / l.s; p1 = 0; }
    if (p1 > g.pmax) { q1 = (g.pmax - l.p0) / l.s; p1 = g.pmax; }
    let q0 = 0, p0 = l.p0;
    if (p0 > g.pmax) { q0 = (g.pmax - l.p0) / l.s; p0 = g.pmax; }
    const c = COL(l.side || l.n), sd = (l.side || l.n) === 'demand' ? 'demand' : 'supply';
    names.push(curveLabel(x(q0), y(p0), x(q1), y(p1), sd, nth[sd]++, l.n, c, L, T, pw, ph, 8));
    s += `<line x1="${x(q0)}" y1="${y(p0)}" x2="${x(q1)}" y2="${y(p1)}" stroke="${c}" stroke-width="3"${l.dash ? ' stroke-dasharray="8 5"' : ''}/>` + (q0 === 0 ? `<text x="${L - 6}" y="${y(l.p0) + 4}" text-anchor="end" fill="#777">€${l.p0}</text>` : '');
    // where the line meets the Q axis (Kemal, 08.10: both intercepts labelled)
    if (p1 === 0 && l.s < 0) s += `<text x="${x(q1)}" y="${T + ph + 18}" text-anchor="middle" fill="${c}">${fmt(q1)}</text>`;
  });
  s += names.join('');
  if (g.mark) { const [q, p] = g.mark; s += `<line x1="${x(q)}" y1="${y(p)}" x2="${x(q)}" y2="${T + ph}" stroke="#bbb" stroke-dasharray="3 3"/><line x1="${L}" y1="${y(p)}" x2="${x(q)}" y2="${y(p)}" stroke="#bbb" stroke-dasharray="3 3"/><circle cx="${x(q)}" cy="${y(p)}" r="5" fill="#111"/><text x="${x(q)}" y="${T + ph + 18}" text-anchor="middle" fill="#777">${q}</text><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end" fill="#777">€${p}</text>`; }
  if (g.read) {
    const l = g.lines[0];
    if (g.read.across != null) { const p = g.read.across, q = (p - l.p0) / l.s; s += `<line x1="${L}" y1="${y(p)}" x2="${x(q)}" y2="${y(p)}" stroke="#111" stroke-width="2"/><line x1="${x(q)}" y1="${y(p)}" x2="${x(q)}" y2="${T + ph}" stroke="#111" stroke-dasharray="4 3"/><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end" font-weight="600">€${p}</text><text x="${x(q)}" y="${T + ph + 18}" text-anchor="middle" font-weight="600">${fmt(q)}</text><text x="${x(q / 2)}" y="${y(p) - 6}" text-anchor="middle">→</text>`; }
    if (g.read.up != null) { const q = g.read.up, p = l.p0 + l.s * q; s += `<line x1="${x(q)}" y1="${T + ph}" x2="${x(q)}" y2="${y(p)}" stroke="#111" stroke-width="2"/><line x1="${x(q)}" y1="${y(p)}" x2="${L}" y2="${y(p)}" stroke="#111" stroke-dasharray="4 3"/><text x="${x(q)}" y="${T + ph + 18}" text-anchor="middle" font-weight="600">${q}</text><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end" font-weight="600">€${fmt(p)}</text><text x="${x(q) + 8}" y="${(y(p) + T + ph) / 2}">↑</text>`; }
  }
  return s + '</svg>';
}
// one step per unit (Kemal, 08.10): vals [8,6,4,…], side demand (blue) | supply (orange), price (dashed line; units that
// clear it solid, the others faint), labels (value above each step), xlabel, ylabel, unit (default €)
function svgStairs(g) {
  const W = 520, H = 320, L = 56, B = 40, T = 22, R = 14, pw = W - L - R, ph = H - T - B, u = g.unit || '€';
  const n = g.vals.length, pm = Math.max(...g.vals) * 1.15, x = q => L + q / (n + 0.5) * pw, y = p => T + ph - p / pm * ph, c = COL(g.side);
  let s = axes(W, H, L, T, pw, ph);
  // as: "curve" (Kemal, 08.10): the staircase as one step line instead of bars
  if (g.as === 'curve') {
    let d = 'M' + x(0) + ',' + y(g.vals[0]);
    g.vals.forEach((v, i) => { d += (i ? ' L' + x(i) + ',' + y(v) : '') + ' L' + x(i + 1) + ',' + y(v); });
    d += ' L' + x(n) + ',' + (T + ph);
    s += `<path d="${d}" fill="none" stroke="${c}" stroke-width="3"/>`;
  }
  g.vals.forEach((v, i) => {
    const on = g.price == null || (g.side === 'demand' ? v >= g.price : v <= g.price);
    if (g.as === 'curve') {
      s += (g.labels ? `<text x="${x(i + 0.5)}" y="${y(v) - 7}" text-anchor="middle" fill="#333">${u}${v}</text>` : '') + `<text x="${x(i + 0.5)}" y="${T + ph + 17}" text-anchor="middle" fill="#777">${i + 1}</text>`;
      return;
    }
    s += `<rect x="${x(i) + 1.5}" y="${y(v)}" width="${x(1) - x(0) - 3}" height="${T + ph - y(v)}" fill="${c}" opacity="${on ? 0.75 : 0.18}"/>` +
      (g.labels ? `<text x="${x(i + 0.5)}" y="${y(v) - 5}" text-anchor="middle" fill="#333">${u}${v}</text>` : '') +
      `<text x="${x(i + 0.5)}" y="${T + ph + 17}" text-anchor="middle" fill="#777">${i + 1}</text>`;
  });
  if (g.price != null) s += `<line x1="${L}" y1="${y(g.price)}" x2="${L + pw}" y2="${y(g.price)}" stroke="#111" stroke-dasharray="6 4"/><text x="${L - 6}" y="${y(g.price) + 4}" text-anchor="end">${u}${g.price}</text>`;
  s += `<text x="${L + pw}" y="${T + ph + 34}" text-anchor="end" fill="#777">${g.xlabel || 'Q'}</text>`;
  if (g.ylabel) s += `<text x="${L}" y="${T - 8}" fill="#777">${g.ylabel}</text>`;
  // fit: {p0, s} (Kemal, 08.10): one more click draws the straight demand line through the bars (Q in units)
  if (g.fit) {
    const q1 = Math.min(n + 0.3, g.fit.s < 0 ? -g.fit.p0 / g.fit.s : n + 0.3), p1 = g.fit.p0 + g.fit.s * q1;
    s += `<g class="fragment fitstep"><line x1="${x(0)}" y1="${y(g.fit.p0)}" x2="${x(q1)}" y2="${y(p1)}" stroke="#111" stroke-width="3"/><text x="${L + pw}" y="${T + 4}" text-anchor="end" font-weight="600">P = ${fmt(g.fit.p0)} − ${fmt(-g.fit.s)}Q</text></g>`;
  }
  return s + '</svg>';
}
// the class's reservation prices as bars, the units that buy at a price solid; prices [..] = buttons to pick a price
function svgClassDemand(g) {
  const W = 520, H = 300, L = 48, B = 34, T = 26, R = 14, pw = W - L - R, ph = H - T - B, V = CLASS_VALS, bw = pw / V.length;
  const y = v => T + ph - Math.min(v, 60) / 60 * ph;
  const one = p => {
    const k = V.filter(v => v >= p).length;
    let s = axes(W, H, L, T, pw, ph);
    V.forEach((v, i) => s += `<rect x="${L + i * bw + 0.5}" y="${y(v)}" width="${bw - 1}" height="${T + ph - y(v)}" fill="#0062C4" opacity="${v >= p ? 0.8 : 0.15}"/>`);
    s += `<line x1="${L}" y1="${y(p)}" x2="${L + pw}" y2="${y(p)}" stroke="#111" stroke-dasharray="6 4"/><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end">€${p}</text>`;
    return s + `<text x="${L + pw}" y="${T - 8}" text-anchor="end" font-size="15">at €${p}: <tspan font-weight="600">${k} of you buy</tspan></text><text x="${L + pw}" y="${T + ph + 20}" text-anchor="end" fill="#777">each bar = one of you</text></svg>`;
  };
  // sync: "pick" (Kemal, 08.10): no own buttons; the table's price buttons on the same slide switch the picture
  if (g.sync === 'pick') return `<div class="cd-pick cd-sync">` + (g.prices || []).map((p, i) => `<div class="cd-g" data-p="${p}"${i ? ' hidden' : ''}>${one(p)}</div>`).join('') + `</div>`;
  if (g.control === 'slider') return priceSlider(g.min || 0, g.max || 60, g.step || 10, g.start != null ? g.start : (g.prices || [50])[0], one);
  const ps = g.prices || [g.price];
  if (ps.length === 1) return one(ps[0]);
  // several prices: one picture per price, buttons switch between them (no data, no API)
  return `<div class="cd-pick">` + ps.map((p, i) => `<div class="cd-g"${i ? ' hidden' : ''}>${one(p)}</div>`).join('') +
    `<div class="cd-btns">` + ps.map((p, i) => `<button class="btn${i ? '' : ' chosen'}" onclick="const w=this.closest('.cd-pick');w.querySelectorAll('.cd-g').forEach((g,j)=>g.hidden=j!==${i});w.querySelectorAll('.cd-btns .btn').forEach((b,j)=>b.classList.toggle('chosen',j===${i}))">€${p}</button>`).join('') + `</div></div>`;
}
// buyers'/sellers' staircases (Kemal + Can, 08.10: the same look as the demand/supply slides): buy [values high → low],
// sell [costs low → high]; band [lo, hi] = the range of equilibrium prices (shaded), or price = one dashed line;
// the steps that trade are solid, the others faded; marginal: the last buyer and seller who trade, thicker + labelled;
// thin straight lines through the step corners when the steps are evenly spaced (their crossing is not marked)
function svgMarket(g) {
  const W = 560, H = 340, L = 56, B = 40, T = 22, R = 18, pw = W - L - R, ph = H - T - B;
  const n = g.buy.length, pm = Math.max(...g.buy, ...g.sell) * 1.12, x = q => L + q / (n + 0.5) * pw, y = p => T + ph - p / pm * ph;
  const cB = COL('demand'), cS = COL('supply');
  let s = axes(W, H, L, T, pw, ph) + `<text x="${L - 8}" y="${T + 4}" text-anchor="end" fill="#777">P</text><text x="${L + pw}" y="${T + ph + 34}" text-anchor="end" fill="#777">Q</text>`;
  const mid = g.band ? (g.band[0] + g.band[1]) / 2 : g.price;
  const nb = mid == null ? n : Math.min(g.buy.filter(v => v >= mid).length, g.sell.filter(v => v <= mid).length);
  const ticks = [];
  if (g.band) {
    const [lo, hi] = g.band;
    s += `<rect x="${L}" y="${y(hi)}" width="${pw}" height="${y(lo) - y(hi)}" fill="#7A3DB8" opacity="0.12"/>`;
    ticks.push([lo, '#7A3DB8', 600], [hi, '#7A3DB8', 600]);
  } else if (g.price != null) {
    s += `<line x1="${L}" y1="${y(g.price)}" x2="${L + pw}" y2="${y(g.price)}" stroke="#111" stroke-width="1.5" stroke-dasharray="7 5"/>`;
    ticks.push([g.price, '#111', 600]);
  }
  [0, 50, 100].filter(p => p <= pm && ticks.every(t => Math.abs(y(t[0]) - y(p)) > 15)).forEach(p => ticks.push([p, '#999', 400]));
  ticks.forEach(([p, c, w]) => s += `<text x="${L - 6}" y="${y(p) + 5}" text-anchor="end" fill="${c}" font-weight="${w}">€${p}</text>`);
  for (let i = 0; i < n; i++) s += `<text x="${x(i + 0.5)}" y="${T + ph + 17}" text-anchor="middle" fill="#999" font-size="12">${i + 1}</text>`;
  // straight lines through the right corners (i + 1, v_i), only when the steps are even
  const lin = vals => { const d = vals[1] - vals[0]; return vals.every((v, i) => !i || Math.abs(v - vals[i - 1] - d) < 1e-9) ? { p0: vals[0] - d, s: d } : null; };
  if (g.lines !== false) [[g.buy, cB], [g.sell, cS]].forEach(([vals, c]) => {
    const l = lin(vals); if (!l) return;
    let q0 = 0, p0 = l.p0; if (p0 < 0) { q0 = -l.p0 / l.s; p0 = 0; } if (p0 > pm) { q0 = (pm - l.p0) / l.s; p0 = pm; }
    let q1 = n + 0.4, p1 = l.p0 + l.s * q1; if (p1 < 0) { q1 = -l.p0 / l.s; p1 = 0; } if (p1 > pm) { q1 = (pm - l.p0) / l.s; p1 = pm; }
    s += `<line x1="${x(q0)}" y1="${y(p0)}" x2="${x(q1)}" y2="${y(p1)}" stroke="${c}" stroke-width="1.5" opacity="0.55"/>`;
  });
  // staircases as step lines: trading steps solid, the rest faded
  const stair = (vals, c) => {
    const seg = (a, b) => { let d = ''; for (let i = a; i < b; i++) d += (i === a ? 'M' + x(i) + ',' + (a ? y(vals[a - 1]) : y(vals[0])) + ' L' + x(i) + ',' + y(vals[i]) : ' L' + x(i) + ',' + y(vals[i])) + ' L' + x(i + 1) + ',' + y(vals[i]); return d; };
    return (nb ? `<path d="${seg(0, nb)}" fill="none" stroke="${c}" stroke-width="3"/>` : '') + (nb < n ? `<path d="${seg(nb, n)}" fill="none" stroke="${c}" stroke-width="3" opacity="0.28"/>` : '');
  };
  s += stair(g.buy, cB) + stair(g.sell, cS);
  s += `<text x="${x(0.1)}" y="${y(g.buy[0]) - 8}" fill="${cB}" font-weight="600" stroke="#fff" stroke-width="3" paint-order="stroke">buyers</text><text x="${x(n) - 2}" y="${y(g.sell[n - 1]) - 8}" fill="${cS}" text-anchor="end" font-weight="600" stroke="#fff" stroke-width="3" paint-order="stroke">sellers</text>`;
  if (g.marginal && nb) {
    const k = nb - 1, vb = g.buy[k], vs = g.sell[k];
    s += `<line x1="${x(k)}" y1="${y(vb)}" x2="${x(k + 1)}" y2="${y(vb)}" stroke="${cB}" stroke-width="7"/><line x1="${x(k)}" y1="${y(vs)}" x2="${x(k + 1)}" y2="${y(vs)}" stroke="${cS}" stroke-width="7"/>` +
      `<text x="${x(k + 0.5)}" y="${y(vb) - 12}" text-anchor="end" fill="${cB}" font-weight="600" stroke="#fff" stroke-width="3" paint-order="stroke">marginal buyer €${vb}</text><text x="${x(k + 0.5)}" y="${y(vs) + 24}" text-anchor="start" fill="${cS}" font-weight="600" stroke="#fff" stroke-width="3" paint-order="stroke">marginal seller €${vs}</text>`;
  }
  if (nb && mid != null) s += `<text x="${L + pw}" y="${T + 4}" text-anchor="end" fill="#777">${nb} buyers and ${nb} sellers trade (solid steps)</text>`;
  return s + '</svg>';
}
// lines + anim (Kemal, 08.10) → an animated graph (assets/js/anim-graph.js): {line: i, to: p0} slides line i,
// {price: [a, b]} slides the price line; one click (fragment) = the animation. `mark` and `hl` belong to the end state
// when the mark is not on the starting lines (e.g. a tax: the new equilibrium).
let AG = 0;
function animSpec(g) {
  const side = l => l.side || (l.n === 'demand' ? 'demand' : 'supply');
  const curves = g.lines.map(l => ({ id: l.n, p0: l.p0, s: l.s, side: side(l) }));
  const base = [{ show: curves.map(c => c.id) }], steps = [], a = g.anim || {};
  const onBase = g.mark && g.lines.every(l => Math.abs(l.p0 + l.s * g.mark[0] - g.mark[1]) < 1e-6 * Math.max(1, g.pmax));
  const extra = [];
  if (g.mark) (onBase ? base : extra).push({ mark_at: g.mark });
  (g.hl || []).forEach(p => (onBase || !g.mark ? base : extra).push({ hl: p }));
  if (a.price) { base.push({ price_line: a.price[0] }); steps.push({ price_line: a.price[1] }); }
  if (a.line != null) { const l = g.lines[a.line]; steps.push({ shift: l.n, to: { id: l.n, p0: a.to, s: l.s } }); }
  if (extra.length && steps.length) Object.assign(steps[steps.length - 1], ...extra);
  // gap: {p, label, cap} (Can, 08.10, shortage / surplus): one click each: the price line (solid, labelled cap) ·
  // the two quantities on it (dashed down, bold) · the gap highlighted with its label
  if (g.gap) {
    const d = g.lines.find(l => side(l) === 'demand'), sp = g.lines.find(l => side(l) === 'supply');
    const qd = (g.gap.p - d.p0) / d.s, qs = (g.gap.p - sp.p0) / sp.s;
    steps.push({ price_line: g.gap.p, label: g.gap.cap || '', solid: true }, { gap: { at: g.gap.p, qd, qs, label: g.gap.label, bar: 0 } }, { gapbar: true });
  }
  const bg = g.bg ? (g.bg === 'class' ? { vals: CLASS_VALS, side: 'demand' } : g.bg) : undefined;
  return { axes: { qmax: g.qmax, pmax: g.pmax, plabel: 'P', qlabel: 'Q', eur: '€' }, curves, base, steps, bg, ticks: true };
}
const AGN = {};  // graph id → number of click steps
function agraphHTML(spec, mode, id) {
  AGN[id] = (spec.steps || []).length;
  return `<div class="agraph" id="${id}" data-mode="${mode}" data-spec='${JSON.stringify(spec).replace(/&/g, '&amp;').replace(/'/g, '&#39;')}'></div>`;
}
function graph(g) {
  if (!g) return '';
  if (g.type === 'market') return svgMarket(g);
  // both curves shift, by hand (Can, 08.10): assets/js/twoshift.js
  if (g.type === 'twoshift') return `<div class="twoshift" data-spec='${JSON.stringify(g).replace(/&/g, '&amp;').replace(/'/g, '&#39;')}'></div>`;
  if (g.type === 'lines' && (g.anim || g.gap)) return agraphHTML(animSpec(g), 'frag', 'ag' + (++AG));
  if (g.type === 'steps') return g.control === 'slider' ? priceSlider(g.min || 0, g.max || 60, g.step || 5, g.start != null ? g.start : 20, p => svgSteps(g, p)) : svgSteps(g);
  if (g.type === 'lines') return svgLines(g);
  if (g.type === 'stairs') return svgStairs(g);
  if (g.type === 'classdemand') return svgClassDemand(g);
  if (g.type === 'slider') return `<div class="sd-slider" data-kind="${g.kind}" data-a="${g.a}" data-b="${g.b}" data-amin="${g.amin}" data-amax="${g.amax}" data-astep="${g.astep || 1}" data-bmin="${g.bmin}" data-bmax="${g.bmax}" data-bstep="${g.bstep || 1}" data-q="${g.q || 40}" data-qmax="${g.qmax}" data-pmax="${g.pmax}"></div>`;
  if (g.type === 'bars') return '<div class="hbars">' + g.data.map(([l, v]) => `<div class="hb"><span class="hb-l">${l}</span><span class="hb-t"><span class="hb-f" style="width:${v}%"></span></span><span class="hb-n">${v}${g.unit || ''}</span></div>`).join('') + (g.note ? `<div class="dim hb-note">${g.note}</div>` : '') + '</div>';
  if (g.type === 'floor') return `<div class="floor-embed"><iframe src="floor.html" title="AI trading floor" loading="lazy"></iframe><a class="btn" href="floor.html" target="_blank">open full screen ↗</a></div>`;
  if (g.type === 'mine') return `<div class="mine-demo" data-zeros="${g.zeros || 4}"></div>`;
  return `<div class="graph-desc dim">${esc(g.d)}</div>`;
}

// ---------- personalise prompts ----------
const MAKE = {
  'allocation mechanisms': 'something scarce I want, the rule that decides who gets it, and who gets left out',
  'perfect competition': 'a market I buy in and which of the five conditions hold or fail there',
  'demand': 'something I buy, how many I would buy at a few different prices, and why I buy fewer when it gets pricier',
  'supply': 'something I could sell or offer, the lowest price at which I would offer it, and why I would offer more at a higher price',
};
function prompt(concept) {
  const mk = MAKE[concept] || 'how the concept shows up in my own life';
  return `<details class="prompt"><summary>personalise</summary><pre>Personalize this concept using what you know about me.
Based on everything you know about me from our past conversations, give me a 1–2 sentence example of ${concept} from my own life, using the basic concept of ${concept} from an introductory microeconomics class. Choose an example that is genuinely specific to my life rather than a generic example. Make clear ${mk}. Do not explain the concept abstractly—make it concrete and personal to me.

(Your chatbot can draw? Add: "Then draw a simple picture of it.")</pre></details>`;
}

// ---------- pieces ----------
function rowsHTML(rows, start, cls) {
  let k = start;
  return `<div class="rows ${cls || ''}">` + rows.filter(r => r[0] !== '' || r[1] !== '').map(([a, b]) => { k++; return `<div class="k fragment" data-fragment-index="${k}">${a}</div><div class="v fragment" data-fragment-index="${k}">${b}</div>`; }).join('') + '</div>';
}
// plain lines (Can, 08.10: graph slides and exercise sets: text full width on top, no label column)
function linesHTML(rows, start, off) {
  let k = start;
  return '<div class="plain-lines">' + rows.filter(r => r[0] !== '' || r[1] !== '').map(([a, b]) => { k++; return `<div class="pl ${off ? 'frag-off' : 'fragment'}" data-fragment-index="${k}">${a ? `<b>${a}</b> · ` : ''}${b}</div>`; }).join('') + '</div>';
}
// hdr: more rows that are column names (Kemal, 08.10: hdrRows [0, 2, 4] on the 41 reservation prices), styled like the header
function tableHTML(tbl, frag, start, hdr) {
  let k = start;
  const H = new Set([0].concat(hdr || []));
  return '<table class="console step-table">' + tbl.map((r, i) => {
    const cells = r.map((c, j) => (H.has(i) || j === 0) ? `<th>${c}</th>` : `<td>${c}</td>`).join('');
    if (H.has(i) || !frag) return `<tr${H.has(i) && i ? ' class="hdr"' : ''}>${cells}</tr>`;
    k++; return `<tr class="pf-row fragment" data-fragment-index="${k}">${cells}</tr>`;
  }).join('') + '</table>';
}
function miniTable(tbl) { return '<table class="mini">' + tbl.map((r, i) => '<tr>' + r.map((c, j) => (i === 0 || j === 0) ? `<th>${c}</th>` : `<td>${c}</td>`).join('') + '</tr>').join('') + '</table>'; }
function answerHTML(ans, extraTbl, hasPoll, frag) {
  if (!ans) return '';
  // the answer sits on the slide itself, in its own green card below the question (no pop-up).
  // [show answer] appears only after this person has answered the poll on the slide (for everyone).
  // no [show answer] button (Can, 08.10): with a poll the card opens by itself after this person's choice (also after a
  // reload, from the remembered answer); without a poll the card is one more click (a fragment).
  return `<div class="ans-wrap${hasPoll ? ' wait' : ' fragment'}"${!hasPoll && frag != null ? ` data-fragment-index="${frag}"` : ''}><div class="ans-card"${hasPoll ? ' hidden' : ''}><div class="ans-label">answer</div><div class="ans">${ans.a}</div>` + (ans.w || []).map(w => `<div class="why">${w}</div>`).join('') + (extraTbl ? miniTable(extraTbl) : '') + (ans.m ? `<pre class="math">${ans.m}</pre>` : '') + (ans.graph ? `<div class="ans-graph${ans.graph.big || ans.big ? ' big' : ''}">${graph(ans.graph).replace('class="fragment fitstep"', 'class="fitstep"')}</div>` : '') + (ans.agraph ? `<div class="ans-graph ans-ag${ans.big ? ' big' : ''}">${agraphHTML(ans.agraph, 'card', 'ag' + (++AG))}</div>` : '') + '</div></div>';
}
function pollHTML(p, frag, type, cls) {
  if (!p || !p.o || !p.o.length) return '';
  const id = safeId(p.id && !/[ /*]/.test(p.id) ? p.id : '');
  if (!id) return '';
  const opts = p.o.map(o => strip(o).replace(/,/g, '‚')).join(',');
  // stored values are cut to 40 characters (interactive.js safe()): two options must still differ
  const sv = p.o.map(o => strip(o).replace(/,/g, '‚').trim().replace(/[^A-Za-z0-9.\-]/g, '_').slice(0, 40));
  if (new Set(sv).size < sv.length) console.warn('warning: ' + id + ': two options are the same in their first 40 characters');
  return `<div class="poll ${cls == null ? 'fragment' : cls}"${frag != null ? ` data-fragment-index="${frag}"` : ''} data-poll="${id}" data-type="${p.multi ? 'multi' : (type || 'choice')}" data-options="${opts}"></div>`;
}

// ---------- slide builders ----------
const CONCEPT_OF = { 'L02-13': 'perfect competition', 'L02-21': 'demand', 'L02-26': 'supply', 'L02-09': 'allocation mechanisms' };
// Per lecture: own-words concepts ("what is …?") and the end-of-class check (same ids as the opening survey's "today").
// A storyboard slide can override them: own-words slide `ow: {id: 'label'}`, before-you-go slide `concepts: [[id, label], …]`.
const PER_LECTURE = {
  // L02 (Can, 07.10): only these two concepts
  L02: { ow: { pc: 'perfect competition', barr: 'a barrier to entry' }, after: [['pc', 'perfect competition'], ['barr', 'barriers to entry']] },
  // L03 (storyboard L03-29, L03-30, decision T5): 7 concepts at the end, 4 in own words (Cevdet's ids)
  L03: { ow: { invdem: 'inverse demand', invsup: 'inverse supply', eq: 'equilibrium', shift: 'the difference between a shift of a curve and a movement along it' },
         after: [['dem', 'demand'], ['invdem', 'inverse demand'], ['law', 'law of demand'], ['sup', 'supply'], ['invsup', 'inverse supply'], ['eq', 'equilibrium'], ['shift', 'shift vs movement']] },
};
const SB_OW = S.find(x => x.tag === 'own words' && x.ow), SB_AFTER = S.find(x => x.tag === 'survey' && x.concepts);
const OW = (SB_OW && SB_OW.ow) || (PER_LECTURE[LEC] || {}).ow || {};
const AFTER = (SB_AFTER && SB_AFTER.concepts) || (PER_LECTURE[LEC] || {}).after || [];
if (!Object.keys(OW).length || !AFTER.length) console.warn('warning: no own-words or before-you-go concepts for ' + LEC + ' (add them to PER_LECTURE or the storyboard)');

function section(s) {
  const notes = s.notes ? `<aside class="notes">${strip(s.notes)}</aside>` : '';
  const sid = `data-sid="${s.id}"`;
  if (s.tag === 'qr') return `<section ${sid}><div class="qr-slide"><img src="qr.svg" alt="QR code to these slides"><div class="qr-link">${s.qr}</div><div class="dim small">${s.sub}</div><div class="small stream-line">can't come? <span class="stream-link"></span></div></div><aside class="notes">Everyone opens the slides on their own device: polls, the pulse button and the own-words boxes are inside.</aside></section>`;
  if (s.tag === 'title') return `<section ${sid}><div class="title-block"><div class="t">microeconomics<span class="cursor"></span></div><div class="s">040184 · ws 2026/27 · lecture ${NUM}</div><div class="a">${s.tb[2]}</div></div></section>`;
  if (s.results) {
    // live summary of the opening survey (Can, 07.10): filled by assets/js/survey-live.js on the teacher screen
    const row = (attr, l) => `<div class="bar-row" ${attr}><span class="bar-label">${l}</span><span class="bar-track"><span class="bar-fill" style="width:0"></span></span><span class="bar-n">–</span></div>`;
    // compare (Can, 08.10): two surveys side by side per row (e.g. Wednesday | today); share or mean (+ how many tried it)
    const crow = (attr, l, n) => `<div class="bar-row cmp" ${attr}><span class="bar-label">${l}</span>` + Array.from({ length: n }, (_, i) => `<span class="bar-track c${i}"><span class="bar-fill" style="width:0"></span></span><span class="bar-n" data-i="${i}">–</span>`).join('') + `</div>`;
    const cbox = b => `<div class="sv-box cmp-box" data-cmp="${b.compare.join(',')}"><div class="sv-t">${b.t}</div><div class="svl-scale dim">${b.s}</div>` +
      `<div class="bar-row cmp cmp-head"><span></span>` + b.compare.map((p, i) => `<span class="cmp-l c${i}">${(b.labels || [])[i] || p} <span class="cmp-n" data-i="${i}"></span></span><span></span>`).join('') + `</div>` +
      (b.mean ? b.mean.map(([k, l]) => crow(`data-cmean="${k}"${b.tried ? ` data-tried="${b.tried}${k.replace(/^d/, '')}"` : ''}`, l, b.compare.length))
              : b.opts.map(([v, l]) => crow(`data-cshare="${b.share}" data-v="${v}"`, l, b.compare.length))).join('') + `</div>`;
    const box = (b, frag) => `<div class="sv-box${frag ? ' fragment' : ''}"${frag ? ` data-fragment-index="${frag}"` : ''}><div class="sv-t">${b.t}</div><div class="svl-scale dim">${b.s}</div>` +
      (b.mean ? b.mean.map(([k, l]) => row(`data-mean="${k}"`, l)) : b.opts.map(([v, l]) => row(`data-share="${b.share}" data-v="${v}"`, l))).join('') + `</div>`;
    // clicks: the first block on the slide, then one click per group (blocks about the interface together; the compare
    // blocks together, full width, in place of the others)
    const [first, ...rest] = s.results.blocks, plain = rest.filter(b => !b.compare), cmp = rest.filter(b => b.compare);
    const fam = b => (b.mean || []).concat(b.opts ? [[b.share]] : []).some(([k]) => /^ui_/.test(k)) || /^ui_/.test(b.share || '') ? 'ui' : 'x';
    let f = 0, prev = null;
    const right = plain.map(b => { const fm = fam(b); if (fm === 'x' || fm !== prev) f++; prev = fm; return box(b, f); }).join('');
    const cmpHTML = cmp.length ? `<div class="cmp-wrap fragment" data-fragment-index="${f + 1}">${cmp.map(cbox).join('')}</div>` : '';
    return `<section ${sid} class="sv-live" data-poll="${s.results.poll}"><h2>${s.title}</h2><p class="sub">${s.sub} · <span class="svl-n"></span> <button class="btn ghost svl-refresh">refresh</button></p>` +
      `<div class="svl-grid"><div>${box(first, 0)}</div><div>${right}</div></div>${cmpHTML}${notes}</section>`;
  }
  if (s.tag === 'survey' && s.id.endsWith('-03')) {
    const sn = 'S' + String(NUM).padStart(2, '0');
    return `<section ${sid}><h2>${s.title}</h2><div class="qr-slide" style="height:auto;margin-top:1em"><img src="qr-survey.svg" alt="QR code to the survey" style="width:300px;height:300px"><div class="qr-link">can-celebi.github.io/micro-business/${sn}</div><div class="dim small">anonymous · about 3 minutes · <a href="../../survey/${LEC}/index.html" target="_blank">open the survey</a></div></div>${notes}</section>`;
  }
  if (s.tag === 'survey') {
    // end-of-class check: one tap per concept, same concepts as the opening survey
    const list = AFTER.map(([id, l]) => `<div class="k">${l}</div><div class="v"><div class="poll compact" data-poll="${LEC}-after-${id}" data-type="choice" data-options="1,2,3,4,5" data-noidea="off"></div></div>`).join('');
    return `<section ${sid}><h2>${s.title}</h2><div class="sub">how well do you know it now? <span class="dim">1 · not at all … 5 · very well</span></div><div class="rows after">${list}</div>${notes}</section>`;
  }
  if (s.tag === 'overview') return `<section ${sid}><h2>today</h2><div class="concept-list">` + s.list.map((x, i) => `<div><span class="dim">${i + 1}</span> ${x}</div>`).join('') + `</div>${notes}</section>`;
  if (s.tag === 'own words') {
    return ''; // expanded separately
  }
  let head = `<h2>${s.title}</h2>` + (s.sub ? `<p class="sub">${s.sub}</p>` : '');
  if (s.set) {
    const vs = setVariants(s);
    // answer graphs are small (Can, 08.10), except on the "… then draw it" banks, where the graph is the drawing to check
    const big = !!(s.set.big || /draw/.test(s.set.kind || ''));
    if (vs.length > 1) return `<section ${sid} class="set-slide">${head}${setNav(s, vs)}` + vs.map((v, i) => `<div class="set-v${i ? '' : ' on'}" data-v="${i}"${i ? ' hidden' : ''}>${i ? variantBody(v, i, big) : slideBody(big && s.ans ? Object.assign({}, s, { ans: Object.assign({}, s.ans, { big: true }) }) : s)}</div>`).join('') + `${notes}</section>`;
  }
  return `<section ${sid}>${head}${slideBody(s)}${notes}</section>`;
}
// the body of a normal slide: key line, rows/table, graph BELOW the text (Can, 08.10), question, poll, answer card
function slideBody(s) {
  let body = '', k = 0;
  const hasRows = s.rows && s.rows.length;
  // the key line of a slide: left-aligned, normal weight, a bit larger than body text (Can, 07.10: no huge centred bold lines)
  if (s.big || s.def) body += `<div class="lead-block">${s.big ? `<div class="lead">${s.big}</div>` : ''}${s.def ? `<div class="def">${s.def}</div>` : ''}</div>`;
  const isEx = s.tag === 'example';
  const g = graph(s.graph), plain = !!(g || s.set), aid = g && /class="agraph"/.test(g) ? 'ag' + AG : null;
  if (isEx && s.tbl) { body += tableHTML(s.tbl, true, k); k += s.tbl.length - 1; }
  if (hasRows) { body += plain ? linesHTML(s.rows, k) : rowsHTML(s.rows, k, s.q ? 'story' : ''); k += s.rows.filter(r => r[0] !== '' || r[1] !== '').length; }
  if (!isEx && s.tbl && !s.ans) { body += tableHTML(s.tbl, false, k, s.hdrRows); }
  // pick: {prices, say} (Kemal, 08.10, slide 7): price buttons under the table light up the € cells at or above the price
  if (s.pick && s.tbl) body += `<div class="tbl-pick" data-say="${(s.pick.say || 'buy').replace(/"/g, '&quot;')}">` + s.pick.prices.map(p => `<button class="btn" data-p="${p}">€${p}</button>`).join('') + `<span class="tp-n"></span></div>`;
  if (g) {
    // a fitted line on a staircase (fit): one more click
    const gg = /fragment fitstep/.test(g) ? g.replace('class="fragment fitstep"', `class="fragment fitstep" data-fragment-index="${++k}"`) : g;
    body += `<div class="gwrap">${formulas(s.graph)}${gg}${s.below ? `<div class="below">${s.below}</div>` : ''}</div>`;
    // an animated graph: one more click plays it
    if (aid) for (let i = 0; i < (AGN[aid] || 1); i++) { k++; body += `<span class="fragment gstep" data-g="${aid}" data-fragment-index="${k}"></span>`; }
  }
  if (s.q) { k++; body += `<div class="big q fragment" data-fragment-index="${k}">${s.q}</div>`; }
  const hasPoll = !!(s.poll && s.poll.o && s.poll.o.length && !/tap options|one tap|free text/.test(s.poll.o[0]));
  // poll2 (Kemal, 08.10): a second question that appears after the first choice, with its own answer card
  const two = hasPoll && s.poll2 && s.poll2.o;
  if (two) body += '<div class="qa">';
  if (hasPoll) body += pollHTML(s.poll, s.q ? k : ++k);
  body += answerHTML(s.ans, (!isEx && s.tbl && s.ans) ? s.tbl : null, hasPoll, hasPoll ? null : k + 1);
  if (two) body += `</div><div class="qa qa2" hidden><div class="big q">${s.poll2.q}</div>` + pollHTML({ id: s.poll2.id, o: s.poll2.o }, null, null, '') + answerHTML(s.poll2.ans, null, true) + '</div>';
  // a slide with a poll (Can, 08.10): the setup (rows, table) and the question come at once, no click per row;
  // only an animated graph or a fitted line stays a click
  if (hasPoll) body = body.replace(/class="(k|v|pl|big q|poll|pf-row) fragment"/g, 'class="$1"');
  // personalise prompts: switched off (Can, 07.10: he has other plans for personalising)
  return body;
}
// the curves' equations over a graph with both demand and supply (Can, 08.10: "I need to always see the demand and
// supply formulas"), in the curves' colours, visible from the start (not a click)
function formulas(g) {
  if (!g || g.type !== 'lines' || !g.lines) return '';
  const side = l => l.side || (l.n === 'demand' ? 'demand' : 'supply');
  if (!g.lines.some(l => side(l) === 'demand') || !g.lines.some(l => side(l) === 'supply')) return '';
  const eq = l => 'P = ' + fmt(l.p0) + (l.s < 0 ? ' − ' : ' + ') + (Math.abs(l.s) === 1 ? '' : fmt(Math.abs(l.s))) + 'Q';
  return '<div class="formulas">' + g.lines.map(l => `<span style="color:${COL(side(l))}"><b>${l.n}</b> ${eq(l)}</span>`).join('<span class="dim"> · </span>') + '</div>';
}
// ---------- exercise sets (Can, 08.10): ◀ ▶ through variants of the same exercise type ----------
// storyboard: set: {kind, file: "15_practice/out/L03_sets.json", key: "<slide id>"}; the slide itself is variant 0,
// the file's instances (Alper; checked by Sinan) follow. Each variant: own poll id, answer after a choice,
// its graph (Sinan's steps) inside the last answer card, one step per click.
const SETS = {};
function setVariants(s) {
  const f = path.join(__dirname, '..', '..', s.set.file);
  if (!SETS[f]) { try { SETS[f] = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.warn('warning: cannot read ' + s.set.file); SETS[f] = {}; } }
  const list = SETS[f][s.set.key || s.id] || [];
  if (!list.length) console.warn('warning: ' + s.id + ': no variants in ' + s.set.file);
  return [s].concat(list);
}
function setNav(s, vs) {
  // only "◀ 2 / 4 ▶" (Can, 08.10: no level, no kind, nothing else; the level stays in the JSON)
  return `<div class="set-nav"><button class="btn ghost set-prev" title="previous one">◀</button><span class="set-n">1 / ${vs.length}</span><button class="btn ghost set-next" title="next one: same kind, new story">▶</button></div>`;
}
function variantBody(v, i, big) {
  let body = '', k = 0;
  const rows = (v.rows || []).filter(r => r[0] !== '' || r[1] !== '');
  // the setup and the question at once (Can, 08.10): no click steps in the variants
  body += linesHTML(rows, k, true).replace(/class="pl frag-off"/g, 'class="pl"'); k += rows.length;
  // shifts, taxes, both-shift (Can, 08.10: "always graphs to understand what is going on"): the graph is big on the
  // slide, showing the market before the news; after the student's choice the rest plays on it, one step per click
  let onSlide = null;
  const st = (v.graph && v.graph.steps) || [], cut = st.findIndex(x => x.shift || x.alt || x.wedge);
  if (cut > 0) {
    onSlide = Object.assign({}, v.graph, { base: st.slice(0, cut), steps: st.slice(cut) });
    body += `<div class="gwrap">${agraphHTML(onSlide, 'poll', 'ag' + (++AG))}</div>`;
  }
  if (v.q) { k++; body += `<div class="big q">${v.q}</div>`; }
  const last = v.poll2 ? v.poll2 : v;
  const withG = (a, g) => Object.assign({}, a || { a: '' }, g ? { agraph: g } : {}, big ? { big: true } : {});
  const p1 = { id: v.poll, o: v.o };
  body += `<div class="qa">` + pollHTML(p1, null, null, '') + answerHTML(withG(v.ans, last === v && !onSlide ? v.graph : null), null, true) + `</div>`;
  if (v.poll2) {
    const p = v.poll2;
    body += `<div class="qa qa2" hidden><div class="big q">${p.q}</div>` + pollHTML({ id: p.poll, o: p.o }, null, null, '') + answerHTML(withG(p.ans, onSlide ? null : v.graph), null, true) + `</div>`;
  }
  return body;
}
// own words (Can, 08.10): first the text ("what is …?"), then one slider afterwards, "how well do you think you
// described …?" (0–100 %, id <LEC>-fit-<c>; Cevdet compares it with Jev's score). No "before" slider and no privacy
// line any more (Can). A storyboard own-words slide with conf: false switches the slider off.
function ownWords() {
  const ids = Object.keys(OW), conf = NUM >= 3 && !(SB_OW && SB_OW.conf === false);
  const sl = (id, q) => `<div class="ow-conf"><div class="ow-q">${q}</div><div class="poll" data-poll="${id}" data-type="slider" data-min="0" data-max="100" data-step="10" data-unit="%" data-noidea="off"></div></div>`;
  return Object.entries(OW).map(([id, l], i) => `<section data-sid="${LEC}-ow-${id}" class="ow-slide"><h2>in your own words · ${i + 1}/${ids.length}</h2>` +
    (conf ? `<div class="ow-q"><span class="dim">1 ·</span> what is ${l}?</div>` : `<div class="big" style="margin-top:6%">what is ${l}?</div>`) +
    `<p class="dim small">(English, 1–2 sentences, without looking at the slides)</p><div class="poll" data-poll="${LEC}-ow-${id}" data-type="text" data-max="300"></div>` +
    (conf ? sl(`${LEC}-fit-${id}`, `<span class="dim">2 ·</span> how well do you think you described ${l}?`) : '') +
    `<aside class="notes">Own words${conf ? ' + how well described' : ''} → Jev after class (Cevdet). Concept id ${id}.</aside></section>`).join('\n');
}

const slides = S.filter(s => s.lec === LEC && s.min > 0 && s.tag !== 'removed');
let out = [], owDone = false;
slides.forEach(s => {
  if (s.tag === 'own words') { if (!owDone) { out.push(ownWords()); owDone = true; } return; }
  out.push(section(s));
});

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Micro ${LEC} Markets</title>
<script>
  // phone layout only on real phones / very narrow windows. The lecture-hall PC (mouse, a short browser window,
  // Windows scaling) used to fall into the phone layout: everything at once, full-width boxes, a huge QR code.
  // ?desktop or ?mobile in the URL forces a layout.
  (function () {
    const W = window.innerWidth, H = window.innerHeight, q = location.search;
    const touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    let m = W < 760 || (touch && Math.min(W, H) < 600);
    if (/[?&]desktop\b/.test(q)) m = false; if (/[?&]mobile\b/.test(q)) m = true;
    window.MICRO_MOBILE = m; if (m) document.documentElement.classList.add('mobile');
  })();
</script>
<link rel="stylesheet" href="../../vendor/reveal/reset.css">
<link rel="stylesheet" href="../../vendor/reveal/reveal.css">
<link rel="stylesheet" href="../../assets/css/console-light.css?v=${V}">
<style>
  /* deck-specific layout (generated by tools/build_deck.js from the storyboard) */
  /* graph slides (Can, 08.10): text full width on top, the graph below, centred, as big as fits */
  .gwrap { display: flex; flex-direction: column; align-items: center; margin-top: 0.5em; }
  .gwrap > svg.graph, .gwrap .agraph svg.graph, .gwrap .cd-pick svg.graph { height: 380px; width: auto; max-width: 100%; }
  .gwrap > .hbars, .gwrap > .floor-embed, .gwrap > .graph-desc { width: 100%; }
  .gwrap > .sd-slider { width: 100%; max-width: 760px; }
  .gwrap > .twoshift { width: 100%; font-size: 0.55em; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 1.2em; align-items: start; }
  .twoshift svg.graph { height: 320px; width: auto; max-width: 100%; display: block; }
  .ts-row { display: grid; grid-template-columns: 5em auto auto auto 1fr 2em; gap: 0.35em; align-items: center; margin: 0.25em 0; }
  section:has(.twoshift) table.step-table { font-size: 0.55em; margin-top: 0.4em; } section:has(.twoshift) table.step-table td, section:has(.twoshift) table.step-table th { padding: 0.15em 0.6em; white-space: nowrap; }
  .ts-row .btn { font-size: 1em; padding: 0.1em 0.7em; } .ts-row .ts-name { font-weight: 600; }
  .ts-row input[type=range] { accent-color: #0062C4; width: 100%; height: 1.6em; } .ts-row .ts-k { text-align: right; }
  .ts-out { margin-top: 0.4em; font-size: 1.25em; font-weight: 600; }
  .ts-certain { margin-top: 0.2em; font-size: 1.15em; line-height: 1.5; }
  .ts-certain .ts-sure { color: #1B7F3B; font-weight: 600; } .ts-certain .ts-dep { color: #7A3DB8; font-weight: 600; }
  .twoshift .ts-ends { font-size: 0.9em; margin-top: 0.3em; }
  .reveal table.step-table td.ts-hit { background: #EFE6F8; outline: 2.5px solid #7A3DB8; font-weight: 600; }
  html.mobile .gwrap > .twoshift { font-size: 0.85em; grid-template-columns: 1fr; } html.mobile .twoshift svg.graph { height: auto; width: 100%; }
  .ts-row .btn { white-space: nowrap; }
  html.mobile .ts-row { display: flex; flex-wrap: wrap; gap: 0.3em; }
  html.mobile .ts-row .ts-name { width: 4.5em; } html.mobile .ts-row input[type=range] { flex: 1 1 70%; } html.mobile .ts-row .ts-k { width: 1.6em; }
  .gwrap .formulas { font-size: 0.7em; margin-bottom: 0.2em; }
  .gwrap .below { font-size: 0.55em; color: var(--dim); text-align: center; margin-top: 0.3em; }
  .plain-lines { margin-top: 0.7em; }
  .plain-lines .pl { font-size: 0.75em; line-height: 1.4; margin: 0.15em 0; }
  .plain-lines .pl b { font-weight: 600; color: var(--dim); }
  .graph { width: 100%; height: auto; }
  .agraph { display: flex; flex-direction: column; align-items: center; width: 100%; }
  .agraph .ag-svg { width: 100%; display: flex; justify-content: center; }
  .ag-bar { display: flex; gap: 0.4em; align-items: center; justify-content: center; margin-top: 0.2em; }
  .ag-bar .btn { font-size: 0.5em; padding: 0.15em 0.6em; } .ag-bar .ag-n { font-size: 0.45em; }
  .ans-graph.ans-ag.big { margin-left: auto; margin-right: auto; }
  .ans-graph.ans-ag.big svg.graph { height: 360px; width: auto; max-width: 100%; }
  .ans-graph.ans-ag .ag-bar .btn { font-size: 0.4em; }
  /* exercise sets: ◀ ▶ through variants of the same kind */
  .set-nav { display: flex; align-items: center; gap: 0.5em; margin: 0.2em 0 0.3em; font-size: 0.6em; }
  .set-nav .btn { font-size: 1em; padding: 0.1em 0.7em; } .set-nav .set-n { font-weight: 600; }
  .set-nav .set-kind { margin-left: auto; font-size: 0.85em; }
  .qa2 { margin-top: 0.8em; border-top: 1px dashed #ccc; padding-top: 0.3em; }
  html.mobile .ans-graph { width: 100%; min-width: 0; }
  html.mobile .gwrap > svg.graph, html.mobile .gwrap .agraph svg.graph, html.mobile .ans-graph.ans-ag svg.graph, html.mobile .gwrap .cd-pick svg.graph { height: auto; width: 100%; }
  html.mobile .plain-lines .pl { font-size: 0.9em; }
  html.mobile .set-nav { font-size: 0.8em; flex-wrap: wrap; } html.mobile .set-nav .set-kind { margin-left: 0; width: 100%; }
  .graph-desc { font-size: 0.6em; border: 1.5px dashed #bbb; padding: 0.5em; }
  .reveal table.step-table tr.fragment.visible.past { opacity: 0.55; }
  .reveal table.step-table { font-size: 0.72em; border-collapse: collapse; margin-top: 0.8em; width: 100%; }
  .reveal table.step-table th, .reveal table.step-table td { border: 1px solid #ddd; padding: 0.35em 0.6em; text-align: left; vertical-align: top; }
  .reveal table.step-table th { color: var(--dim); font-weight: 400; }
  .rows.after { gap: 0.15em 1.2em; margin-top: 0.6em; }
  .rows.after .k { font-size: 0.6em; align-self: center; }
  .poll.compact { margin-top: 0; font-size: 0.7em; }
  .poll.compact .poll-controls, .poll.compact .poll-results { display: none; }
  .floor-embed iframe { width: 100%; height: 360px; border: 1.5px solid var(--line); background: #fff; }
  .floor-embed .btn { font-size: 0.55em; margin-top: 0.3em; display: inline-block; }
  .hbars { font-size: 0.6em; margin-top: 0.4em; }
  .hb { display: grid; grid-template-columns: 7em 1fr 3.5em; gap: 0.5em; align-items: center; margin: 0.18em 0; }
  .hb-t { height: 0.9em; background: #f1f1ee; border: 1px solid #ddd; }
  .hb-f { display: block; height: 100%; background: #7A3DB8; }
  .hb-n { text-align: right; }
  .hb-note { margin-top: 0.5em; font-size: 0.85em; }
  .svl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6em; align-items: start; margin-top: 0.5em; }
  .svl-grid .sv-box { margin-bottom: 0.9em; }
  .svl-grid .bar-row { font-size: 0.6em; grid-template-columns: 12em 1fr 4.6em; margin: 0.22em 0; }
  .svl-grid .sv-t { color: var(--ink); margin-bottom: 0; }
  .svl-scale { font-size: 0.5em; margin-bottom: 0.3em; }
  .sv-live .svl-refresh { font-size: 0.8em; padding: 0.1em 0.6em; }
  html.mobile .svl-grid { grid-template-columns: 1fr; }
  /* compare blocks (Wednesday | today): full width, in place of the other blocks once shown */
  .sv-live:has(.cmp-wrap.visible) .svl-grid { display: none; }
  .cmp-wrap { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 1.6em; align-items: start; margin-top: 0.5em; }
  .cmp-wrap .bar-row.cmp { display: grid; grid-template-columns: 11em 1fr 5.2em 1fr 5.2em; gap: 0.2em 0.5em; align-items: center; font-size: 0.55em; margin: 0.25em 0; }
  .cmp-wrap .bar-row.cmp .bar-track { height: 0.9em; } .cmp-wrap .bar-row.cmp .c0 .bar-fill { background: #B79ADB; }
  .cmp-wrap .cmp-head { font-size: 0.5em !important; color: var(--dim); } .cmp-wrap .cmp-head .c1 { color: #7A3DB8; font-weight: 600; }
  html.mobile .sv-live:has(.cmp-wrap.visible) .svl-grid { display: grid; }
  html.mobile .cmp-wrap { grid-template-columns: 1fr; } html.mobile .cmp-wrap .bar-row.cmp { font-size: 0.75em; grid-template-columns: 7em 1fr 4em 1fr 4em; }
  html.mobile .svl-grid .bar-row { font-size: 0.8em; }
  .ow-slide .ow-q { font-size: 0.85em; margin-top: 0.7em; }
  .ow-slide .ow-conf .poll { margin-top: 0.2em; }
  .ow-slide .poll[data-type="text"] { margin-top: 0.3em; }
  .lead-block { margin-top: 0.7em; text-align: left; }
  .lead-block .lead { font-size: 0.9em; font-weight: 400; line-height: 1.35; }
  .lead-block .def { font-size: 0.65em; margin: 0.5em 0 0; max-width: none; text-align: left; }
  html.mobile .lead-block .lead { font-size: 1.05em; }
  /* answers: on the slide, in a green card; the slide scrolls down to it */
  .reveal .slides > section.present { height: 100%; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; }
  .ans-wrap { margin-top: 0.6em; }
  .ans-graph { margin-top: 0.5em; width: 40%; min-width: 300px; } .ans-graph svg.graph { width: 100%; height: auto; }
  .ans-graph.big { width: auto; max-width: 680px; }
  .gwrap .cd-sync svg.graph { height: 270px; }
  html.mobile .gwrap .cd-sync svg.graph { height: auto; }
  .cd-range { display: flex; align-items: center; gap: 0.5em; justify-content: center; font-size: 0.55em; margin-top: 0.3em; }
  .cd-range input[type=range] { width: 22em; max-width: 60vw; accent-color: #0062C4; height: 1.6em; } .cd-range b { min-width: 3em; font-size: 1.3em; }
  .tbl-pick { display: flex; gap: 0.4em; align-items: center; flex-wrap: wrap; margin-top: 0.6em; font-size: 0.8em; }
  .tbl-pick .tp-n { margin-left: 0.6em; font-weight: 600; font-size: 1.2em; }
  .reveal table.step-table td.pk-on { background: #DCE8F7; color: #0062C4; font-weight: 600; }
  .cd-btns { display: flex; gap: 0.4em; justify-content: center; margin-top: 0.3em; } .cd-btns .btn { font-size: 0.55em; white-space: nowrap; }
  .ans-wrap.wait .ans-btn { display: none; }
  .ans-btn { font-size: 0.6em; background: var(--p-green); }
  .ans-card { margin-top: 0.5em; background: #eef6ea; border-left: 6px solid #4f8a3c; border-radius: 3px; padding: 0.6em 0.9em 0.5em; }
  .ans-card .ans-label { font-size: 0.5em; letter-spacing: 0.12em; text-transform: uppercase; color: #4f8a3c; font-weight: 700; margin-bottom: 0.2em; }
  .ans-card .ans { font-weight: 600; font-size: 0.95em; margin-bottom: 0.35em; }
  .ans-card .why { font-size: 0.62em; line-height: 1.45; margin-bottom: 0.3em; }
  .ans-card pre.math { font-family: var(--mono); font-size: 0.55em; line-height: 1.5; margin: 0.6em 0 0; padding: 0.5em; background: var(--p-yellow); box-shadow: none; white-space: pre; overflow-x: auto; }
  html.print-pdf .ans-btn { display: none; }
  html.print-pdf .ans-card { display: block !important; }
</style>
</head>
<body data-lecture="${LEC}">
<div class="reveal"><div class="slides">

${out.join('\n\n')}

</div></div>

<script src="../../vendor/reveal/reveal.js"></script>
<script src="../../vendor/reveal/plugin/notes/notes.js"></script>
<script src="../../assets/js/config.js?v=${V}"></script>
<script src="../../assets/js/interactive.js?v=${V}"></script>
<script src="../../assets/js/sd-graph.js?v=${V}"></script>
<script src="../../assets/js/anim-graph.js?v=${V}"></script>
<script src="../../assets/js/twoshift.js?v=${V}"></script>
<script src="../../assets/js/mining-demo.js?v=${V}"></script>
<script src="../../assets/js/menu.js?v=${V}"></script>
<script src="../../assets/js/side-panels.js?v=${V}"></script>
<script src="../../assets/js/survey-live.js?v=${V}"></script>
<script src="../../assets/js/stream.js?v=${V}"></script>
<script>
  const MOBILE = window.MICRO_MOBILE;
  Reveal.initialize({
    hash: true, disableLayout: MOBILE, fragments: !MOBILE, pdfSeparateFragments: false, touch: true,
    width: 1280, height: 720, margin: 0.08, center: false, transition: 'none', backgroundTransition: 'none',
    slideNumber: 'c/t', controls: false, progress: true, plugins: [ RevealNotes ]
  });
  // QR codes: click to switch between big and small (the hall PC's browser had no way to shrink it)
  document.querySelectorAll('.qr-slide img').forEach(img => { img.style.cursor = 'zoom-out'; img.title = 'click: smaller / bigger'; img.addEventListener('click', () => { const s = img.classList.toggle('qr-small'); img.style.cursor = s ? 'zoom-in' : 'zoom-out'; }); });
  // step tables: only the current row is in focus, earlier rows fade
  function focusRows() {
    document.querySelectorAll('table.step-table').forEach(t => {
      const shown = [...t.querySelectorAll('tr.pf-row.visible')];
      shown.forEach((r, i) => r.classList.toggle('past', i < shown.length - 1));
    });
  }
  // [show answer]: hidden until this person answered the slide's poll (everyone, teacher too: Can, 07.10)
  // after your own choice the solution opens by itself (Can, 07.10), under the results; [hide answer] folds it
  document.addEventListener('micropoll:saved', e => {
    const s = e.target.closest('section'); if (!s) return;
    // exercise sets: the answer that belongs to this poll (a variant can have two questions; the second shows after the first)
    const box = e.target.closest('.qa') || e.target.closest('.set-v') || s;
    const nx = box.classList.contains('qa') && !box.classList.contains('qa2') ? box.parentElement.querySelector('.qa2') : null;
    if (nx) nx.hidden = false;
    box.querySelectorAll(':scope > .ans-wrap, :scope > .poll ~ .ans-wrap').forEach(w => {
      w.classList.remove('wait');
      const card = w.querySelector('.ans-card');
      if (!card || !card.hidden) return;
      card.hidden = false;
      // answered earlier on this device: open again, without jumping down the slide
      if (!(e.detail && e.detail.restored)) setTimeout(() => s.scrollTo({ top: s.scrollHeight }), 400);
    });
  });
  // exercise sets: ◀ ▶ switch the variant; only the shown variant's steps are clicks (fragments)
  function setVariant(sec, d) {
    const vs = [...sec.querySelectorAll(':scope > .set-v')], cur = vs.findIndex(v => v.classList.contains('on'));
    const i = (cur + d + vs.length) % vs.length, a = vs[cur], b = vs[i];
    a.querySelectorAll('.fragment').forEach(f => { f.classList.remove('fragment', 'visible', 'current-fragment'); f.classList.add('frag-off'); });
    a.classList.remove('on'); a.hidden = true;
    b.querySelectorAll('.frag-off').forEach(f => { f.classList.remove('frag-off'); f.classList.add('fragment'); });
    b.classList.add('on'); b.hidden = false;
    sec.querySelector('.set-nav .set-n').textContent = (i + 1) + ' / ' + vs.length;
    if (!MOBILE) { Reveal.syncFragments(); Reveal.navigateFragment(-1); }
    sec.scrollTop = 0;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('.set-prev, .set-next'); if (!b) return;
    setVariant(b.closest('section'), b.classList.contains('set-next') ? 1 : -1); b.blur();
  });
  // table price buttons: cells (rows labelled €) at or above the price light up, with the count
  document.addEventListener('click', e => {
    const b = e.target.closest('.tbl-pick .btn'); if (!b) return;
    const box = b.closest('.tbl-pick'), tb = box.closest('section').querySelector('table.step-table'), p = +b.dataset.p;
    box.querySelectorAll('.btn').forEach(x => x.classList.toggle('chosen', x === b));
    let n = 0;
    tb.querySelectorAll('tr').forEach(tr => { if ((tr.cells[0] || {}).textContent !== '€') return; [...tr.cells].slice(1).forEach(td => { const v = td.textContent.trim(), on = v !== '' && +v >= p; td.classList.toggle('pk-on', on); if (on) n++; }); });
    box.querySelector('.tp-n').textContent = 'at €' + p + ', ' + box.dataset.say + ': ' + n;
    box.closest('section').querySelectorAll('.cd-sync .cd-g').forEach(g => g.hidden = +g.dataset.p !== p);
  });
  // a new slide always starts at its top
  Reveal.on('slidechanged', e => { e.currentSlide.scrollTop = 0; });
  // long slides: each new line that appears scrolls into view (no manual scrolling while presenting)
  Reveal.on('fragmentshown', e => { (e.fragments || [e.fragment]).forEach(f => { if (f && f.scrollIntoView) f.scrollIntoView({ block: 'nearest' }); }); });
  Reveal.on('fragmentshown', focusRows); Reveal.on('fragmenthidden', focusRows); Reveal.on('slidechanged', focusRows);
</script>
</body>
</html>
`;
const dir = path.join(__dirname, '..', 'lectures', LEC);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`${LEC}: ${out.length} blocks from ${slides.length} storyboard slides → lectures/${LEC}/index.html`);
