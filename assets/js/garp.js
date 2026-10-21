// Budget-line task (L06 quiz 3, Can 21.10): did the class choose consistently? GARP + CCEI over the packed answers.
//
// Each student sends ONE answer (MicroPoll.submit) for the whole task:
//   value = 'b' + two digits per line, in the order of the lines; d = 00…99 → share on x: s = d/99,
//   so x = s·X and y = (1 − s)·Y on the line with intercepts (X, Y); '--' = no point on that line.
//   ('b' first: a value of digits only would be read as a number and lose digits.)
// Markup (one results call per [refresh], nothing on a timer):
//   <div class="garp-summary" data-poll="L06-q3" data-lines="100:40,60:90,…"></div>
// Lines are given as X:Y intercepts. Prices are px = 1/X, py = 1/Y, income 1.
// GARP: i is revealed preferred to j if bundle j was affordable when i was chosen (e·p_i·x_i ≥ p_i·x_j), taken
// transitively; a violation is i R j while x_i was strictly cheaper than x_j at j's prices (e·p_j·x_j > p_j·x_i).
// CCEI (Afriat's efficiency index) = the largest e at which there is no violation (1 = fully consistent).
(function () {
  const EPS = 1e-9;

  function decode(value, lines) {
    const v = String(value || '');
    if (v[0] !== 'b') return null;
    return lines.map(([X, Y], i) => {
      const d = v.substr(1 + 2 * i, 2);
      if (!/^\d\d$/.test(d)) return null;
      const s = Number(d) / 99;
      return [s * X, (1 - s) * Y];
    });
  }
  function encode(points, lines) {
    return 'b' + lines.map(([X], i) => points[i] == null ? '--' : String(Math.max(0, Math.min(99, Math.round(99 * points[i][0] / X)))).padStart(2, '0')).join('');
  }

  // P: prices [[px, py]], B: bundles [[x, y]] (lines without a point already dropped)
  function garpOK(P, B, e) {
    const n = P.length, c = [];
    for (let i = 0; i < n; i++) { c.push([]); for (let j = 0; j < n; j++) c[i].push(P[i][0] * B[j][0] + P[i][1] * B[j][1]); }
    const R = c.map((row, i) => row.map((cij) => e * c[i][i] >= cij - EPS));
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) if (R[i][k]) for (let j = 0; j < n; j++) if (R[k][j]) R[i][j] = true;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && R[i][j] && e * c[j][j] > c[j][i] + EPS) return false;
    return true;
  }
  function ccei(P, B) {
    if (garpOK(P, B, 1)) return 1;
    let lo = 0, hi = 1;
    for (let t = 0; t < 25; t++) { const m = (lo + hi) / 2; if (garpOK(P, B, m)) lo = m; else hi = m; }
    return lo;
  }
  // one student: {points, ok, ccei} (null if fewer than 2 lines answered)
  function check(lines, bundles) {
    const P = [], B = [];
    lines.forEach(([X, Y], i) => { if (bundles[i]) { P.push([1 / X, 1 / Y]); B.push(bundles[i]); } });
    if (B.length < 2) return null;
    const ok = garpOK(P, B, 1);
    return { points: B.length, ok: ok, ccei: ok ? 1 : ccei(P, B) };
  }
  // random clicking on the same lines (Bronars): how often would it violate GARP? (fixed seed: same number every time)
  function bronars(lines, T) {
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const P = lines.map(([X, Y]) => [1 / X, 1 / Y]);
    let bad = 0;
    for (let t = 0; t < (T || 1000); t++) {
      const B = lines.map(([X, Y]) => { const s = Math.round(99 * rnd()) / 99; return [s * X, (1 - s) * Y]; });
      if (!garpOK(P, B, 1)) bad++;
    }
    return bad / (T || 1000);
  }
  function summary(lines, responses) {
    const res = [];
    responses.forEach(r => { const b = decode(r.value, lines); const c = b && check(lines, b); if (c) res.push(c); });
    const cc = res.map(r => r.ccei).sort((a, b) => a - b);
    const mean = cc.length ? cc.reduce((a, b) => a + b, 0) / cc.length : null;
    return {
      n: res.length, all: res.filter(r => r.points === lines.length).length,
      violate: res.filter(r => !r.ok).length,
      mean: mean, median: cc.length ? cc[Math.floor((cc.length - 1) / 2)] : null,
      buckets: [['1.00', c => c >= 1 - EPS], ['0.95–0.99', c => c >= 0.95 && c < 1 - EPS], ['0.90–0.94', c => c >= 0.9 && c < 0.95], ['0.80–0.89', c => c >= 0.8 && c < 0.9], ['below 0.80', c => c < 0.8]]
        .map(([l, f]) => [l, cc.filter(f).length]),
      random: bronars(lines)
    };
  }

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
  function parseLines(s) { return String(s || '').split(',').map(t => t.trim().split(':').map(Number)).filter(l => l.length === 2 && l[0] > 0 && l[1] > 0); }

  function initBox(node) {
    const lines = parseLines(node.dataset.lines), poll = node.dataset.poll;
    const out = el('div', 'garp-out'), refresh = el('button', 'btn ghost', 'refresh');
    node.appendChild(refresh); node.appendChild(out);
    async function draw() {
      out.innerHTML = ''; out.appendChild(el('div', 'dim', 'loading…'));
      try {
        const data = await window.MicroPoll.results(poll);
        const s = summary(lines, data.responses || []);
        out.innerHTML = '';
        out.appendChild(el('div', 'answered', s.n + ' answered · ' + s.all + ' on all ' + lines.length + ' lines'));
        if (!s.n) return;
        out.appendChild(el('div', 'garp-line', 'consistent (no GARP violation): ' + (s.n - s.violate) + ' of ' + s.n + ' (' + pct(s.n - s.violate, s.n) + ')'));
        out.appendChild(el('div', 'garp-line', 'at least one violation: ' + s.violate + ' of ' + s.n + ' (' + pct(s.violate, s.n) + ')'));
        out.appendChild(el('div', 'garp-line', 'efficiency (CCEI): mean ' + s.mean.toFixed(2) + ' · median ' + s.median.toFixed(2)));
        s.buckets.forEach(([l, k]) => {
          const row = el('div', 'bar-row'); row.appendChild(el('span', 'bar-label', l));
          const tr = el('span', 'bar-track'), f = el('span', 'bar-fill'); f.style.width = (100 * k / s.n) + '%'; tr.appendChild(f);
          row.appendChild(tr); row.appendChild(el('span', 'bar-n', pct(k, s.n) + ' (' + k + ')')); out.appendChild(row);
        });
        out.appendChild(el('div', 'dim small-line', 'clicking at random on these lines would violate GARP ' + pct(s.random, 1) + ' of the time'));
      } catch (e) { out.innerHTML = ''; out.appendChild(el('div', 'dim', 'could not load results')); }
    }
    refresh.onclick = draw;
    if (node.dataset.auto !== 'off') draw();
  }

  // ---------- one student's own choices (Can via Filiz, 21.10: "your choices on the 12 lines", cycles highlighted) ----------
  // Shortest violating cycles: a chain of "was affordable when I chose" steps i → … → j (directly revealed preferred),
  // closed by a strict step j ≻ i (x_i was strictly cheaper than x_j at j's prices). Lines are numbered 1…n as in the quiz.
  function cycles(lines, bundles, e) {
    e = e == null ? 1 : e;   // e < 1: every budget shrunk to e (Afriat): what is left is a contradiction even with that much slack
    const idx = [], P = [], B = [];
    lines.forEach(([X, Y], i) => { if (bundles[i]) { idx.push(i); P.push([1 / X, 1 / Y]); B.push(bundles[i]); } });
    const n = B.length, c = (i, j) => P[i][0] * B[j][0] + P[i][1] * B[j][1];
    const R = (i, j) => i !== j && e * c(i, i) >= c(i, j) - EPS, S = (i, j) => i !== j && e * c(i, i) > c(i, j) + EPS;
    const found = [], seen = new Set();
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      if (!S(j, i)) continue;               // j strictly revealed preferred to i …
      // … and a chain i → … → j of revealed preference: shortest one (breadth first)
      const prev = new Array(n).fill(-1), q = [i]; prev[i] = i;
      while (q.length && prev[j] < 0) { const u = q.shift(); for (let v = 0; v < n; v++) if (prev[v] < 0 && R(u, v)) { prev[v] = u; q.push(v); } }
      if (prev[j] < 0) continue;
      const path = [j]; while (path[path.length - 1] !== i) path.push(prev[path[path.length - 1]]);
      const cyc = path.reverse().map(k => idx[k]);  // i … j, then back to i
      const key = cyc.slice().sort((a, b) => a - b).join(',');
      if (!seen.has(key)) { seen.add(key); found.push(cyc); }
    }
    return found.sort((a, b) => a.length - b.length);
  }
  const NS = 'http://www.w3.org/2000/svg', RED = '#C92A2A', BLUE = '#0062C4', GREEN = '#1B7F3B', MATH = '"STIX Two Text", "Cambria Math", Georgia, serif';
  const halo = 'paint-order="stroke" stroke="#fff" stroke-width="5" stroke-linejoin="round"';
  // <div class="garp-mine" data-lines="X:Y,…" data-key="micro-l06-done-{session}-q3"></div>: the answer this device sent
  // (stored on the device by the quiz page; {session} = ws26 or test). No API call.
  function initMine(node) {
    const lines = parseLines(node.dataset.lines), key = String(node.dataset.key || '').replace('{session}', (window.MicroPoll || {}).session || 'ws26');
    let v = null; try { v = localStorage.getItem(key); } catch (e) {}
    // data-demo: an example answer, shown (and labelled) where this device has none, e.g. on the lecturer's screen
    const demo = !v && !!node.dataset.demo; if (demo) v = node.dataset.demo;
    const B = v && decode(v, lines);
    node.innerHTML = '';
    if (!B) { node.appendChild(el('div', 'dim', 'no choices from this device yet: do quiz 3 first, on this device')); return; }
    const res = check(lines, B), cyc0 = cycles(lines, B);
    let cyc = cyc0, e = 1, k = 0;
    const W = 600, H = 600, L = 52, Bm = 44, T = 16, Rm = 16, pw = W - L - Rm, ph = H - T - Bm;
    const X = v => L + v / 100 * pw, Y = v => T + ph - v / 100 * ph;
    const head = el('div', 'gm-head'), svg = document.createElementNS(NS, 'svg'), nav = el('div', 'gm-nav'), say = el('div', 'gm-say'), shr = el('div', 'gm-shrink');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'gm-svg');
    node.appendChild(head); node.appendChild(svg); node.appendChild(nav); node.appendChild(say); node.appendChild(shr);
    node.setAttribute('data-prevent-swipe', '');
    const who = demo ? 'these example choices' : 'your choices', yr = demo ? 'the' : 'your';
    const eff = res.ccei >= 1 - EPS ? yr + ' efficiency (CCEI) is 1: no budget wasted'
      : yr + ' efficiency (CCEI) is ' + res.ccei.toFixed(2) + ': shrink every budget to ' + Math.round(100 * res.ccei) + '% and no contradiction is left';
    // shrink slider (idea from the llm-rationality lessons, lab 7): all budgets × e; contradictions that survive stay red
    if (cyc0.length) {
      shr.innerHTML = '<label><b>shrink every budget to</b><input type="range" min="' + Math.max(0.2, Math.floor(100 * res.ccei) / 100 - 0.05).toFixed(2) + '" max="1" step="0.01" value="1"><span class="gm-e">100%</span></label>';
      const inp = shr.querySelector('input');
      inp.addEventListener('input', () => { e = +inp.value; cyc = cycles(lines, B, e); k = 0; shr.querySelector('.gm-e').textContent = Math.round(100 * e) + '%'; draw(); });
      inp.addEventListener('keydown', ev => ev.stopPropagation());
    }
    function draw() {
      head.innerHTML = (demo ? '<div class="dim">an example, not your answer (this device did not do quiz 3)</div>' : '') +
        '<div><b>' + (cyc.length ? who + ' contradict each other in ' + cyc.length + (cyc.length === 1 ? ' place' : ' places') + (e < 1 ? ' (budgets at ' + Math.round(100 * e) + '%)' : '')
          : e < 1 && cyc0.length ? 'at ' + Math.round(100 * e) + '% of every budget, no contradiction is left' : who + ' are consistent: no cycle') + '</b></div><div class="dim">' + eff + '</div>';
      const on = cyc.length ? new Set(cyc[k]) : new Set();
      let s = '<rect x="' + L + '" y="' + T + '" width="' + pw + '" height="' + ph + '" fill="#fff"/>';
      for (let g = 20; g <= 100; g += 20) s += '<line x1="' + X(g) + '" y1="' + Y(0) + '" x2="' + X(g) + '" y2="' + Y(100) + '" stroke="#eee"/><line x1="' + X(0) + '" y1="' + Y(g) + '" x2="' + X(100) + '" y2="' + Y(g) + '" stroke="#eee"/><text x="' + X(g) + '" y="' + (Y(0) + 20) + '" text-anchor="middle" font-size="16" fill="#555">' + g + '</text><text x="' + (X(0) - 7) + '" y="' + (Y(g) + 5) + '" text-anchor="end" font-size="16" fill="#555">' + g + '</text>';
      s += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(100) + '" y2="' + Y(0) + '" stroke="#222"/><line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(0) + '" y2="' + Y(100) + '" stroke="#222"/>';
      s += '<text x="' + X(100) + '" y="' + (Y(0) - 8) + '" text-anchor="end" font-size="17" fill="#555" ' + halo + '>GPU hours <tspan font-family=\'' + MATH + '\' font-style="italic">x</tspan></text><text x="' + (X(0) + 8) + '" y="' + (Y(100) + 16) + '" font-size="17" fill="#555" ' + halo + '>API credits <tspan font-family=\'' + MATH + '\' font-style="italic">y</tspan></text>';
      // all lines faint, the ones in the shown contradiction strong; shrunk budgets dashed
      lines.forEach(([Lx, Ly], i) => {
        const hot = on.has(i);
        s += '<line x1="' + X(Lx) + '" y1="' + Y(0) + '" x2="' + X(0) + '" y2="' + Y(Ly) + '" stroke="' + (hot ? RED : '#9DB7D5') + '" stroke-width="' + (hot ? 3.5 : 1.5) + '" opacity="' + (hot ? (e < 1 ? 0.35 : 1) : 0.7) + '"/>';
        if (e < 1 && hot) s += '<line x1="' + X(e * Lx) + '" y1="' + Y(0) + '" x2="' + X(0) + '" y2="' + Y(e * Ly) + '" stroke="' + RED + '" stroke-width="3" stroke-dasharray="9 6"/>';
      });
      lines.forEach(([Lx, Ly], i) => {
        if (!B[i]) return; const hot = on.has(i), [bx, by] = B[i];
        s += '<circle cx="' + X(bx) + '" cy="' + Y(by) + '" r="' + (hot ? 9 : 6) + '" fill="' + (hot ? RED : cyc.length ? '#7C93AE' : GREEN) + '" stroke="#fff" stroke-width="2"/>';
        if (hot) s += '<text x="' + (X(bx) + 12) + '" y="' + (Y(by) - 10) + '" font-size="17" font-weight="700" fill="' + RED + '" ' + halo + '>line ' + (i + 1) + '</text>';
      });
      svg.innerHTML = s;
      nav.innerHTML = '';
      if (!cyc.length) { say.innerHTML = cyc0.length ? '<div>with that much slack, every bundle fits one ranking: this is what the efficiency score measures</div>' : '<div>every bundle you chose was the best on its line in one consistent ranking</div>'; return; }
      if (cyc.length > 1) {
        const p = el('button', 'btn ghost', '◀'), nx = el('button', 'btn ghost', '▶'); p.type = nx.type = 'button';
        p.onclick = ev => { ev.stopPropagation(); k = (k + cyc.length - 1) % cyc.length; draw(); }; nx.onclick = ev => { ev.stopPropagation(); k = (k + 1) % cyc.length; draw(); };
        nav.appendChild(p); nav.appendChild(el('span', 'gm-n', (k + 1) + ' of ' + cyc.length)); nav.appendChild(nx);
      }
      const c = cyc[k], nm = i => 'line ' + (i + 1);
      say.innerHTML = c.length === 2
        ? '<div>On ' + nm(c[0]) + ' you chose a bundle while your ' + nm(c[1]) + ' bundle was also affordable: so you like the ' + nm(c[0]) + ' bundle at least as much.</div><div>On ' + nm(c[1]) + ' you chose the other way round, and your ' + nm(c[0]) + ' bundle was even cheaper there. Both can’t be your favourite.</div>'
        : '<div>' + c.map(nm).join(' → ') + ': on each line, the next line’s bundle was affordable, so each bundle is at least as good as the next.</div><div>But on ' + nm(c[c.length - 1]) + ' the ' + nm(c[0]) + ' bundle was even cheaper: so the last is strictly better than the first. A cycle, like the money pump.</div>';
    }
    draw();
  }

  window.MicroGARP = { decode: decode, encode: encode, check: check, summary: summary, bronars: bronars, garpOK: garpOK, ccei: ccei, parseLines: parseLines, cycles: cycles };
  const CSS = '.garp-mine{font-size:.55em;text-align:left;margin-top:.4em}.garp-mine .gm-head{line-height:1.6;margin-bottom:.3em}' +
    '.garp-mine .gm-svg{width:100%;max-width:520px;max-height:430px;height:auto;display:block;margin:0 auto}' +
    '.garp-mine .gm-shrink label{display:grid;grid-template-columns:auto 1fr 3.5em;gap:.7em;align-items:center;margin-top:.4em}.garp-mine .gm-shrink input{accent-color:#C92A2A;width:100%}.garp-mine .gm-nav{display:flex;gap:.6em;justify-content:center;align-items:center;margin:.3em 0}.garp-mine .gm-say{line-height:1.6}' +
    'html.mobile .garp-mine{font-size:.9em}';
  function init() {
    if (document.querySelector('.garp-mine') && !document.getElementById('garp-mine-css')) { const st = document.createElement('style'); st.id = 'garp-mine-css'; st.textContent = CSS; document.head.appendChild(st); }
    document.querySelectorAll('.garp-summary').forEach(initBox); document.querySelectorAll('.garp-mine').forEach(initMine);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
