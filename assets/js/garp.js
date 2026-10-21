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

  window.MicroGARP = { decode: decode, encode: encode, check: check, summary: summary, bronars: bronars, garpOK: garpOK, ccei: ccei, parseLines: parseLines };
  function init() { document.querySelectorAll('.garp-summary').forEach(initBox); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
