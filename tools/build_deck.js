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
const V = '20261008j';
const NUM = parseInt(LEC.slice(1), 10);  // L03 → 3

const esc = s => String(s);
const strip = s => String(s).replace(/<[^>]+>/g, '');
const safeId = s => String(s).replace(/[^A-Za-z0-9-]/g, '-');

// ---------- graphs ----------
function svgSteps(g) {
  const W = 520, H = 300, L = 48, B = 34, T = 10, R = 14, pw = W - L - R, ph = H - T - B, qm = 42, pm = 60;
  const x = q => L + q / qm * pw, y = p => T + ph - p / pm * ph;
  const pts = [[60, 1], [50, 4], [40, 6], [30, 9], [25, 14], [20, 20], [15, 21], [10, 30], [5, 38], [0, 41]];
  let d = 'M' + x(0) + ',' + y(60), q0 = 0;
  pts.forEach(([p, n]) => { d += ' L' + x(q0) + ',' + y(p) + ' L' + x(n) + ',' + y(p); q0 = n; });
  let s = `<svg class="graph" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Mono,monospace" font-size="13"><line x1="${L}" y1="${T}" x2="${L}" y2="${T + ph}" stroke="#222"/><line x1="${L}" y1="${T + ph}" x2="${L + pw}" y2="${T + ph}" stroke="#222"/>`;
  // bars: true (Kemal, 08.10): the class's 41 answers as faded bars behind the staircase (one bar = one of you)
  if (g && g.bars) CLASS_VALS.forEach((v, i) => { const vv = Math.min(v, pm); s += `<rect x="${x(i) + 0.5}" y="${y(vv)}" width="${x(i + 1) - x(i) - 1}" height="${T + ph - y(vv)}" fill="#0074D9" opacity="0.15"/>`; });
  s += `<path d="${d}" fill="none" stroke="#0074D9" stroke-width="3"/>`;
  [0, 20, 40, 60].forEach(p => s += `<text x="${L - 6}" y="${y(p) + 4}" text-anchor="end" fill="#777">€${p}</text>`);
  [0, 10, 20, 30, 40].forEach(q => s += `<text x="${x(q)}" y="${T + ph + 18}" text-anchor="middle" fill="#777">${q}</text>`);
  s += `<circle cx="${x(20)}" cy="${y(20)}" r="5" fill="#111"/><text x="${x(20) + 10}" y="${y(20) - 8}">20 buy at €20</text><text x="${L + pw}" y="${T + ph + 32}" text-anchor="end" fill="#777">how many of you buy</text></svg>`;
  return s;
}
// the class's ChatGPT reservation prices (L02 poll, 41 answers): used by classdemand and lines.bg = "class"
const CLASS_VALS = [100, 60, 50, 50, 40, 40, 35, 30, 30, 29, 28, 25, 25, 25, 20, 20, 20, 20, 20, 20, 15, 13, 12, 10, 10, 10, 10, 10, 10, 10, 9, 8, 8, 5, 5, 5, 5, 5, 1, 0, 0];
const COL = side => side === 'demand' ? '#0074D9' : '#eb6834';
const fmt = v => String(Math.round(v * 100) / 100);
function axes(W, H, L, T, pw, ph) {
  return `<svg class="graph" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Mono,monospace" font-size="13"><line x1="${L}" y1="${T}" x2="${L}" y2="${T + ph}" stroke="#222"/><line x1="${L}" y1="${T + ph}" x2="${L + pw}" y2="${T + ph}" stroke="#222"/>`;
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
  }
  (g.hl || []).forEach(p => { s += `<line x1="${L}" y1="${y(p)}" x2="${L + pw}" y2="${y(p)}" stroke="#bbb" stroke-dasharray="4 4"/><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end" fill="#777">€${p}</text>`; });
  g.lines.forEach(l => {
    let q1 = g.qmax, p1 = l.p0 + l.s * q1;
    if (p1 < 0) { q1 = -l.p0 / l.s; p1 = 0; }
    if (p1 > g.pmax) { q1 = (g.pmax - l.p0) / l.s; p1 = g.pmax; }
    const c = COL(l.side || l.n);
    s += `<line x1="${x(0)}" y1="${y(l.p0)}" x2="${x(q1)}" y2="${y(p1)}" stroke="${c}" stroke-width="3"${l.dash ? ' stroke-dasharray="8 5"' : ''}/><text x="${x(q1) - 4}" y="${y(p1) - 8}" text-anchor="end" fill="${c}">${l.n}</text><text x="${L - 6}" y="${y(l.p0) + 4}" text-anchor="end" fill="#777">€${l.p0}</text>`;
    // where the line meets the Q axis (Kemal, 08.10: both intercepts labelled)
    if (p1 === 0 && l.s < 0) s += `<text x="${x(q1)}" y="${T + ph + 18}" text-anchor="middle" fill="${c}">${fmt(q1)}</text>`;
  });
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
  g.vals.forEach((v, i) => {
    const on = g.price == null || (g.side === 'demand' ? v >= g.price : v <= g.price);
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
    s += `<g class="fragment fitstep"><line x1="${x(0)}" y1="${y(g.fit.p0)}" x2="${x(q1)}" y2="${y(p1)}" stroke="#111" stroke-width="3"/><text x="${L + pw}" y="${T + 4}" text-anchor="end" font-weight="600">demand: P = ${fmt(g.fit.p0)} − ${fmt(-g.fit.s)}Q</text></g>`;
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
    V.forEach((v, i) => s += `<rect x="${L + i * bw + 0.5}" y="${y(v)}" width="${bw - 1}" height="${T + ph - y(v)}" fill="#0074D9" opacity="${v >= p ? 0.8 : 0.15}"/>`);
    s += `<line x1="${L}" y1="${y(p)}" x2="${L + pw}" y2="${y(p)}" stroke="#111" stroke-dasharray="6 4"/><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end">€${p}</text>`;
    return s + `<text x="${L + pw}" y="${T - 8}" text-anchor="end" font-size="15">at €${p}: <tspan font-weight="600">${k} of you buy</tspan></text><text x="${L + pw}" y="${T + ph + 20}" text-anchor="end" fill="#777">each bar = one of you</text></svg>`;
  };
  const ps = g.prices || [g.price];
  if (ps.length === 1) return one(ps[0]);
  // several prices: one picture per price, buttons switch between them (no data, no API)
  return `<div class="cd-pick">` + ps.map((p, i) => `<div class="cd-g"${i ? ' hidden' : ''}>${one(p)}</div>`).join('') +
    `<div class="cd-btns">` + ps.map((p, i) => `<button class="btn${i ? '' : ' chosen'}" onclick="const w=this.closest('.cd-pick');w.querySelectorAll('.cd-g').forEach((g,j)=>g.hidden=j!==${i});w.querySelectorAll('.cd-btns .btn').forEach((b,j)=>b.classList.toggle('chosen',j===${i}))">€${p}</button>`).join('') + `</div></div>`;
}
// buyers'/sellers' staircases crossing (Kemal, 08.10): buy [values high → low], sell [costs low → high], price,
// marginal (boxes on the last buyer and seller who trade); dots = the units that trade at the price
function svgMarket(g) {
  const W = 560, H = 340, L = 56, B = 40, T = 22, R = 18, pw = W - L - R, ph = H - T - B;
  const n = g.buy.length, pm = Math.max(...g.buy, ...g.sell) * 1.1, x = q => L + q / (n + 0.5) * pw, y = p => T + ph - p / pm * ph;
  let s = axes(W, H, L, T, pw, ph);
  const step = (vals, c, on) => { let d = ''; vals.forEach((v, i) => d += (i ? ' L' : 'M') + x(i) + ',' + y(v) + ' L' + x(i + 1) + ',' + y(v)); return `<path d="${d}" fill="none" stroke="${c}" stroke-width="3"/>` + vals.map((v, i) => on(v) ? `<circle cx="${x(i + 0.5)}" cy="${y(v)}" r="5.5" fill="${c}"/>` : '').join(''); };
  s += step(g.buy, COL('demand'), v => g.price == null || v >= g.price) + step(g.sell, COL('supply'), v => g.price == null || v <= g.price);
  if (g.price != null) s += `<line x1="${L}" y1="${y(g.price)}" x2="${L + pw}" y2="${y(g.price)}" stroke="#111" stroke-width="1.5" stroke-dasharray="7 5"/><text x="${L - 6}" y="${y(g.price) + 5}" text-anchor="end" font-weight="600">€${g.price}</text>`;
  s += `<text x="${x(1)}" y="${y(g.buy[0]) - 8}" fill="${COL('demand')}" font-weight="600">buyers</text><text x="${x(n - 1)}" y="${y(g.sell[n - 1]) - 8}" fill="${COL('supply')}" text-anchor="end" font-weight="600">sellers</text>`;
  [0, Math.round(pm / 2 / 10) * 10, Math.round(pm / 10) * 10].forEach(p => { if (p <= pm && (g.price == null || Math.abs(y(p) - y(g.price)) > 16)) s += `<text x="${L - 6}" y="${y(p) + 5}" text-anchor="end" fill="#999" font-size="12">€${p}</text>`; });
  for (let i = 0; i < n; i++) s += `<text x="${x(i + 0.5)}" y="${T + ph + 17}" text-anchor="middle" fill="#999" font-size="12">${i + 1}</text>`;
  const nb = g.price == null ? 0 : Math.min(g.buy.filter(v => v >= g.price).length, g.sell.filter(v => v <= g.price).length);
  if (g.marginal && nb) {
    const bw = x(1) - x(0);
    s += `<rect x="${x(nb - 1)}" y="${y(g.buy[nb - 1]) - 13}" width="${bw}" height="26" fill="none" stroke="${COL('demand')}" stroke-width="2.5"/><text x="${x(nb - 0.5)}" y="${y(g.buy[nb - 1]) - 19}" text-anchor="middle" fill="${COL('demand')}" font-weight="600">€${g.buy[nb - 1]}</text>` +
      `<rect x="${x(nb - 1)}" y="${y(g.sell[nb - 1]) - 13}" width="${bw}" height="26" fill="none" stroke="${COL('supply')}" stroke-width="2.5"/><text x="${x(nb - 0.5)}" y="${y(g.sell[nb - 1]) + 32}" text-anchor="middle" fill="${COL('supply')}" font-weight="600">€${g.sell[nb - 1]}</text>`;
  }
  if (nb) s += `<text x="${L + pw}" y="${T + ph + 34}" text-anchor="end" fill="#777">${nb} pairs trade (dots)</text>`;
  return s + '</svg>';
}
// lines + anim (Kemal, 08.10) → an animated graph (assets/js/anim-graph.js): {line: i, to: p0} slides line i,
// {price: [a, b]} slides the price line; one click (fragment) = the animation. `mark` and `hl` belong to the end state
// when the mark is not on the starting lines (e.g. a tax: the new equilibrium).
let AG = 0;
function animSpec(g) {
  const side = l => l.side || (l.n === 'demand' ? 'demand' : 'supply');
  const curves = g.lines.map(l => ({ id: l.n, p0: l.p0, s: l.s, side: side(l) }));
  const base = [{ show: curves.map(c => c.id) }], steps = [], a = g.anim;
  const onBase = g.mark && g.lines.every(l => Math.abs(l.p0 + l.s * g.mark[0] - g.mark[1]) < 1e-6 * Math.max(1, g.pmax));
  const extra = [];
  if (g.mark) (onBase ? base : extra).push({ mark_at: g.mark });
  (g.hl || []).forEach(p => (onBase || !g.mark ? base : extra).push({ hl: p }));
  if (a.price) { base.push({ price_line: a.price[0] }); steps.push({ price_line: a.price[1] }); }
  if (a.line != null) { const l = g.lines[a.line]; steps.push({ shift: l.n, to: { id: l.n, p0: a.to, s: l.s } }); }
  if (extra.length && steps.length) Object.assign(steps[steps.length - 1], ...extra);
  const bg = g.bg ? (g.bg === 'class' ? { vals: CLASS_VALS, side: 'demand' } : g.bg) : undefined;
  return { axes: { qmax: g.qmax, pmax: g.pmax, plabel: 'P', qlabel: 'Q', eur: '€' }, curves, base, steps, bg, ticks: true };
}
function agraphHTML(spec, mode, id) {
  return `<div class="agraph" id="${id}" data-mode="${mode}" data-spec='${JSON.stringify(spec).replace(/&/g, '&amp;').replace(/'/g, '&#39;')}'></div>`;
}
function graph(g) {
  if (!g) return '';
  if (g.type === 'market') return svgMarket(g);
  if (g.type === 'lines' && g.anim) return agraphHTML(animSpec(g), 'frag', 'ag' + (++AG));
  if (g.type === 'steps') return svgSteps(g);
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
function tableHTML(tbl, frag, start) {
  let k = start;
  return '<table class="console step-table">' + tbl.map((r, i) => {
    const cells = r.map((c, j) => (i === 0 || j === 0) ? `<th>${c}</th>` : `<td>${c}</td>`).join('');
    if (i === 0 || !frag) return `<tr>${cells}</tr>`;
    k++; return `<tr class="pf-row fragment" data-fragment-index="${k}">${cells}</tr>`;
  }).join('') + '</table>';
}
function miniTable(tbl) { return '<table class="mini">' + tbl.map((r, i) => '<tr>' + r.map((c, j) => (i === 0 || j === 0) ? `<th>${c}</th>` : `<td>${c}</td>`).join('') + '</tr>').join('') + '</table>'; }
function answerHTML(ans, extraTbl, hasPoll) {
  if (!ans) return '';
  // the answer sits on the slide itself, in its own green card below the question (no pop-up).
  // [show answer] appears only after this person has answered the poll on the slide (for everyone).
  return `<div class="ans-wrap${hasPoll ? ' wait' : ''}"><button class="btn ans-btn">show answer ↓</button><div class="ans-card" hidden><div class="ans-label">answer</div><div class="ans">${ans.a}</div>` + (ans.w || []).map(w => `<div class="why">${w}</div>`).join('') + (extraTbl ? miniTable(extraTbl) : '') + (ans.m ? `<pre class="math">${ans.m}</pre>` : '') + (ans.graph ? `<div class="ans-graph">${graph(ans.graph).replace('class="fragment fitstep"', 'class="fitstep"')}</div>` : '') + (ans.agraph ? `<div class="ans-graph ans-ag">${agraphHTML(ans.agraph, 'card', 'ag' + (++AG))}</div>` : '') + '</div></div>';
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
  if (s.tag === 'qr') return `<section ${sid}><div class="qr-slide"><img src="qr.svg" alt="QR code to these slides"><div class="qr-link">${s.qr}</div><div class="dim small">${s.sub}</div></div><aside class="notes">Everyone opens the slides on their own device: polls, the pulse button and the own-words boxes are inside.</aside></section>`;
  if (s.tag === 'title') return `<section ${sid}><div class="title-block"><div class="t">microeconomics<span class="cursor"></span></div><div class="s">040184 · ws 2026/27 · lecture ${NUM}</div><div class="a">${s.tb[2]}</div></div></section>`;
  if (s.results) {
    // live summary of the opening survey (Can, 07.10): filled by assets/js/survey-live.js on the teacher screen
    const row = (attr, l) => `<div class="bar-row" ${attr}><span class="bar-label">${l}</span><span class="bar-track"><span class="bar-fill" style="width:0"></span></span><span class="bar-n">–</span></div>`;
    const box = (b, i) => `<div class="sv-box${i ? ' fragment' : ''}"${i ? ` data-fragment-index="${i}"` : ''}><div class="sv-t">${b.t}</div><div class="svl-scale dim">${b.s}</div>` +
      (b.mean ? b.mean.map(([k, l]) => row(`data-mean="${k}"`, l)) : b.opts.map(([v, l]) => row(`data-share="${b.share}" data-v="${v}"`, l))).join('') + `</div>`;
    const [first, ...rest] = s.results.blocks;
    return `<section ${sid} class="sv-live" data-poll="${s.results.poll}"><h2>${s.title}</h2><p class="sub">${s.sub} · <span class="svl-n"></span> <button class="btn ghost svl-refresh">refresh</button></p>` +
      `<div class="svl-grid"><div>${box(first, 0)}</div><div>${rest.map((b, i) => box(b, i + 1)).join('')}</div></div>${notes}</section>`;
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
    if (vs.length > 1) return `<section ${sid} class="set-slide">${head}${setNav(s, vs)}` + vs.map((v, i) => `<div class="set-v${i ? '' : ' on'}" data-v="${i}"${i ? ' hidden' : ''}>${i ? variantBody(v, i) : slideBody(s)}</div>`).join('') + `${notes}</section>`;
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
  if (!isEx && s.tbl && !s.ans) { body += tableHTML(s.tbl, false, k); }
  if (g) {
    // a fitted line on a staircase (fit): one more click
    const gg = /fragment fitstep/.test(g) ? g.replace('class="fragment fitstep"', `class="fragment fitstep" data-fragment-index="${++k}"`) : g;
    body += `<div class="gwrap">${gg}${s.below ? `<div class="below">${s.below}</div>` : ''}</div>`;
    // an animated graph: one more click plays it
    if (aid) { k++; body += `<span class="fragment gstep" data-g="${aid}" data-fragment-index="${k}"></span>`; }
  }
  if (s.q) { k++; body += `<div class="big q fragment" data-fragment-index="${k}">${s.q}</div>`; }
  const hasPoll = !!(s.poll && s.poll.o && s.poll.o.length && !/tap options|one tap|free text/.test(s.poll.o[0]));
  if (hasPoll) body += pollHTML(s.poll, s.q ? k : ++k);
  body += answerHTML(s.ans, (!isEx && s.tbl && s.ans) ? s.tbl : null, hasPoll);
  // personalise prompts: switched off (Can, 07.10: he has other plans for personalising)
  return body;
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
  const lv = vs.map((v, i) => i ? (v.level || '') : 'from the slide');
  return `<div class="set-nav" data-levels='${JSON.stringify(lv).replace(/'/g, '&#39;')}'><button class="btn ghost set-prev" title="previous variant">◀</button><span class="set-n">1 / ${vs.length}</span><button class="btn ghost set-next" title="next variant: same kind, new story">▶</button><span class="set-lv dim">${lv[0]}</span><span class="set-kind dim">${s.set.kind || ''}</span></div>`;
}
function variantBody(v, i) {
  let body = '', k = 0;
  const rows = (v.rows || []).filter(r => r[0] !== '' || r[1] !== '');
  body += linesHTML(rows, k, true); k += rows.length;
  if (v.q) { k++; body += `<div class="big q frag-off" data-fragment-index="${k}">${v.q}</div>`; }
  const last = v.poll2 ? v.poll2 : v;
  const withG = (a, g) => Object.assign({}, a || { a: '' }, g ? { agraph: g } : {});
  const p1 = { id: v.poll, o: v.o };
  body += `<div class="qa">` + pollHTML(p1, v.q ? k : ++k, null, 'frag-off') + answerHTML(withG(v.ans, last === v ? v.graph : null), null, true) + `</div>`;
  if (v.poll2) {
    const p = v.poll2;
    body += `<div class="qa qa2" hidden><div class="big q">${p.q}</div>` + pollHTML({ id: p.poll, o: p.o }, null, null, '') + answerHTML(withG(p.ans, v.graph), null, true) + `</div>`;
  }
  return body;
}
// own words (+ from L03, Cevdet with Can's go, 08.10: "before" and "after" confidence sliders, 0–100 %, ids
// <LEC>-conf-<c> and <LEC>-fit-<c>; Cevdet compares them with Jev's score). A storyboard own-words slide with conf: false switches them off.
function ownWords() {
  const ids = Object.keys(OW), conf = NUM >= 3 && !(SB_OW && SB_OW.conf === false);
  const sl = (id, q) => `<div class="ow-conf"><div class="ow-q">${q}</div><div class="poll" data-poll="${id}" data-type="slider" data-min="0" data-max="100" data-step="10" data-unit="%" data-noidea="off"></div></div>`;
  return Object.entries(OW).map(([id, l], i) => `<section data-sid="${LEC}-ow-${id}" class="ow-slide"><h2>in your own words · ${i + 1}/${ids.length}</h2>` +
    (conf ? sl(`${LEC}-conf-${id}`, `<span class="dim">1 ·</span> how well do you know ${l}?`) + `<div class="ow-q"><span class="dim">2 ·</span> what is ${l}?</div>` : `<div class="big" style="margin-top:6%">what is ${l}?</div>`) +
    `<p class="dim small">(English, 1–2 sentences, without looking at the slides)</p><div class="poll" data-poll="${LEC}-ow-${id}" data-type="text" data-max="300"></div>` +
    (conf ? sl(`${LEC}-fit-${id}`, `<span class="dim">3 ·</span> how much of ${l} does your text capture: everything there is to it?`) : '') +
    `<p class="dim small" style="margin-top:1em">anonymous · your text is checked by an AI model (Jev, TypeSafe, USA) · don't write your name · ungraded</p><aside class="notes">Own words${conf ? ' + confidence' : ''} → Jev after class (Cevdet). Concept id ${id}.</aside></section>`).join('\n');
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
  .gwrap > .hbars, .gwrap > .floor-embed, .gwrap > .graph-desc, .gwrap > .sd-slider { width: 100%; }
  .gwrap .below { font-size: 0.55em; color: var(--dim); text-align: center; margin-top: 0.3em; }
  .plain-lines { margin-top: 0.7em; }
  .plain-lines .pl { font-size: 0.75em; line-height: 1.4; margin: 0.15em 0; }
  .plain-lines .pl b { font-weight: 600; color: var(--dim); }
  .graph { width: 100%; height: auto; }
  .agraph { display: flex; flex-direction: column; align-items: center; width: 100%; }
  .agraph .ag-svg { width: 100%; display: flex; justify-content: center; }
  .ag-bar { display: flex; gap: 0.4em; align-items: center; justify-content: center; margin-top: 0.2em; }
  .ag-bar .btn { font-size: 0.5em; padding: 0.15em 0.6em; } .ag-bar .ag-n { font-size: 0.45em; }
  .ans-graph.ans-ag { max-width: 680px; margin-left: auto; margin-right: auto; }
  .ans-graph.ans-ag svg.graph { height: 360px; width: auto; max-width: 100%; }
  /* exercise sets: ◀ ▶ through variants of the same kind */
  .set-nav { display: flex; align-items: center; gap: 0.5em; margin: 0.2em 0 0.3em; font-size: 0.6em; }
  .set-nav .btn { font-size: 1em; padding: 0.1em 0.7em; } .set-nav .set-n { font-weight: 600; }
  .set-nav .set-kind { margin-left: auto; font-size: 0.85em; }
  .qa2 { margin-top: 0.8em; border-top: 1px dashed #ccc; padding-top: 0.3em; }
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
  .hb-f { display: block; height: 100%; background: var(--p-green); border-right: 1.5px solid var(--line); }
  .hb-n { text-align: right; }
  .hb-note { margin-top: 0.5em; font-size: 0.85em; }
  .svl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6em; align-items: start; margin-top: 0.5em; }
  .svl-grid .sv-box { margin-bottom: 0.9em; }
  .svl-grid .bar-row { font-size: 0.6em; grid-template-columns: 12em 1fr 4.6em; margin: 0.22em 0; }
  .svl-grid .sv-t { color: var(--ink); margin-bottom: 0; }
  .svl-scale { font-size: 0.5em; margin-bottom: 0.3em; }
  .sv-live .svl-refresh { font-size: 0.8em; padding: 0.1em 0.6em; }
  html.mobile .svl-grid { grid-template-columns: 1fr; }
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
  .ans-graph { margin-top: 0.5em; max-width: 520px; } .ans-graph svg.graph { width: 100%; height: auto; }
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
<script src="../../assets/js/mining-demo.js?v=${V}"></script>
<script src="../../assets/js/menu.js?v=${V}"></script>
<script src="../../assets/js/side-panels.js?v=${V}"></script>
<script src="../../assets/js/survey-live.js?v=${V}"></script>
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
      if (e.detail && e.detail.restored) return;  // answered earlier on this device: [show answer] is available, card stays closed
      const card = w.querySelector('.ans-card'), b = w.querySelector('.ans-btn');
      if (card && card.hidden) { card.hidden = false; b.textContent = 'hide answer ↑'; setTimeout(() => s.scrollTo({ top: s.scrollHeight }), 400); }
    });
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('.ans-btn'); if (!b) return;
    const card = b.nextElementSibling, open = card.hidden;
    card.hidden = !open; b.textContent = open ? 'hide answer ↑' : 'show answer ↓';
    const sec = b.closest('section');
    if (open && sec) setTimeout(() => sec.scrollTo({ top: sec.scrollHeight }), 30);
  });
  // exercise sets: ◀ ▶ switch the variant; only the shown variant's steps are clicks (fragments)
  function setVariant(sec, d) {
    const vs = [...sec.querySelectorAll(':scope > .set-v')], cur = vs.findIndex(v => v.classList.contains('on'));
    const i = (cur + d + vs.length) % vs.length, a = vs[cur], b = vs[i];
    a.querySelectorAll('.fragment').forEach(f => { f.classList.remove('fragment', 'visible', 'current-fragment'); f.classList.add('frag-off'); });
    a.classList.remove('on'); a.hidden = true;
    b.querySelectorAll('.frag-off').forEach(f => { f.classList.remove('frag-off'); f.classList.add('fragment'); });
    b.classList.add('on'); b.hidden = false;
    const nav = sec.querySelector('.set-nav'), lv = JSON.parse(nav.dataset.levels || '[]');
    nav.querySelector('.set-n').textContent = (i + 1) + ' / ' + vs.length; nav.querySelector('.set-lv').textContent = lv[i] || '';
    if (!MOBILE) { Reveal.syncFragments(); Reveal.navigateFragment(-1); }
    sec.scrollTop = 0;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('.set-prev, .set-next'); if (!b) return;
    setVariant(b.closest('section'), b.classList.contains('set-next') ? 1 : -1); b.blur();
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
