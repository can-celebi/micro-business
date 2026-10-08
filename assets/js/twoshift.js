// "Both curves shift" (Can, 08.10: "I need a graphical interface that does this for me").
// Markup (tools/build_deck.js, graph type "twoshift"): <div class="twoshift" data-spec='{demand:{p0,s}, supply:{p0,s}, qmax, pmax, maxshift}'>
// Per curve: ← / none / → and a size slider (0 … maxshift); or drag the curve sideways (snaps to whole steps).
// A shift of size k moves the curve k units along Q: P = p0 + s·(Q − k) for →, (Q + k) for ←.
// The old curves stay faint, the new ones slide in (0.8 s); old equilibrium hollow, new one filled, arrows on the axes.
// The readout says what happened now, and what is CERTAIN over all sizes 1 … maxshift of both shifts.
// The slide's 2×2 table (table.step-table in the same section) lights up the matching cell.
(function () {
  const BLUE = '#0062C4', ORANGE = '#D9480F', PURPLE = '#7A3DB8', GREEN = '#1B7F3B';
  const W = 560, H = 340, L = 56, B = 40, T = 22, R = 18, pw = W - L - R, ph = H - T - B;
  const r1 = v => Math.round(v * 10) / 10;
  const arrow = d => d > 1e-9 ? '↑' : d < -1e-9 ? '↓' : '=';

  function setup(box) {
    let S; try { S = JSON.parse(box.dataset.spec); } catch (e) { return; }
    const M = S.maxshift || 10, x = q => L + q / S.qmax * pw, y = p => T + ph - p / S.pmax * ph;
    const st = { demand: { dir: 0, k: 0 }, supply: { dir: 0, k: 0 } };
    const p0 = c => S[c].p0 - S[c].s * st[c].dir * st[c].k;          // intercept after the shift
    const eqOf = (pd, ps) => { const q = (pd - ps) / (S.supply.s - S.demand.s); return [q, pd + S.demand.s * q]; };
    const E0 = eqOf(S.demand.p0, S.supply.p0);
    let shown = { demand: S.demand.p0, supply: S.supply.p0 }, raf = 0, ends = false;

    // graph on the left, controls + readout on the right (Kemal, 08.10: the certainty lines must be on screen at 720 px)
    box.innerHTML = '<div class="ts-g"><svg class="graph" viewBox="0 0 ' + W + ' ' + H + '" font-family="IBM Plex Mono,monospace" font-size="14"></svg></div><div class="ts-c">' +
      ['demand', 'supply'].map(c => '<div class="ts-row" data-c="' + c + '"><span class="ts-name" style="color:' + (c === 'demand' ? BLUE : ORANGE) + '">' + c + '</span>' +
        '<button class="btn" data-d="-1">←</button><button class="btn chosen" data-d="0">none</button><button class="btn" data-d="1">→</button>' +
        '<input type="range" min="0" max="' + M + '" step="1" value="0"><b class="ts-k">0</b></div>').join('') +
      '<div class="ts-out"></div><div class="ts-certain"></div><button class="btn ghost ts-ends">show both endings</button></div>';
    box.setAttribute('data-prevent-swipe', '');
    const svg = box.querySelector('svg');

    function line(pz, s, col, extra) {
      let q0 = 0, a = pz; if (a > S.pmax) { q0 = (S.pmax - pz) / s; a = S.pmax; } if (a < 0) { q0 = -pz / s; a = 0; }
      let q1 = S.qmax, b = pz + s * q1; if (b < 0) { q1 = -pz / s; b = 0; } if (b > S.pmax) { q1 = (S.pmax - pz) / s; b = S.pmax; }
      return { d: `<line x1="${x(q0)}" y1="${y(a)}" x2="${x(q1)}" y2="${y(b)}" stroke="${col}" ${extra}/>`, q0, a, q1, b };
    }
    const head = (x1, y1, x2, y2, c) => { const an = Math.atan2(y2 - y1, x2 - x1), h = 9; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2.5"/><polygon points="${x2},${y2} ${x2 - h * Math.cos(an - 0.45)},${y2 - h * Math.sin(an - 0.45)} ${x2 - h * Math.cos(an + 0.45)},${y2 - h * Math.sin(an + 0.45)}" fill="${c}"/>`; };
    const label = (ln, side, text, col) => {
      const t = side === 'demand' ? 0.15 : 0.85; let lx = x(ln.q0) + t * (x(ln.q1) - x(ln.q0)), ly = y(ln.a) + t * (y(ln.b) - y(ln.a));
      if (side === 'demand') { lx += 6; ly -= 8; } else { lx += 8; ly += 16; }
      lx = Math.max(L + 4, Math.min(lx, L + pw - text.length * 8.6)); ly = Math.max(T + 10, Math.min(ly, T + ph - 4));
      return `<text x="${lx}" y="${ly}" fill="${col}" font-weight="600" stroke="#fff" stroke-width="3" paint-order="stroke">${text}</text>`;
    };

    function draw(pd, ps) {
      let s = `<line x1="${L}" y1="${T}" x2="${L}" y2="${T + ph}" stroke="#222"/><line x1="${L}" y1="${T + ph}" x2="${L + pw}" y2="${T + ph}" stroke="#222"/>` +
        `<text x="${L - 8}" y="${T + 4}" text-anchor="end" fill="#777">P</text><text x="${L + pw}" y="${T + ph + 34}" text-anchor="end" fill="#777">Q</text>`;
      const moved = Math.abs(pd - S.demand.p0) > 1e-9 || Math.abs(ps - S.supply.p0) > 1e-9;
      // the two endings (a small and a big second shift), faint, for "it can shift like this, or like this"
      if (ends && st.demand.dir && st.supply.dir) {
        [1, M].forEach((k, i) => {
          const pS = S.supply.p0 - S.supply.s * st.supply.dir * k, e = eqOf(pd, pS);
          s += line(pS, S.supply.s, ORANGE, 'stroke-width="2" stroke-dasharray="3 4" opacity="0.6"').d +
            `<circle cx="${x(e[0])}" cy="${y(e[1])}" r="5" fill="${PURPLE}"/><text x="${Math.max(L + 120, x(e[0]) - 10)}" y="${y(e[1]) + (i ? 22 : -10)}" text-anchor="end" fill="${PURPLE}" font-weight="600" stroke="#fff" stroke-width="3" paint-order="stroke">${i ? 'big' : 'small'}: P ${r1(e[1])}</text>`;
        });
      }
      // old curves faint; new curves solid
      const oD = line(S.demand.p0, S.demand.s, BLUE, 'stroke-width="2" stroke-dasharray="7 5" opacity="0.35"'), oS = line(S.supply.p0, S.supply.s, ORANGE, 'stroke-width="2" stroke-dasharray="7 5" opacity="0.35"');
      const nD = line(pd, S.demand.s, BLUE, 'stroke-width="3.5"'), nS = line(ps, S.supply.s, ORANGE, 'stroke-width="3.5"');
      if (moved) s += oD.d + oS.d;
      s += nD.d + nS.d;
      const E1 = eqOf(pd, ps);
      // old equilibrium (hollow) and the new one (filled), dashed to the axes, values labelled; arrows old → new
      const labs = [];
      if (moved) {
        s += `<circle cx="${x(E0[0])}" cy="${y(E0[1])}" r="6" fill="#fff" stroke="#111" stroke-width="2"/>`;
        labs.push([E0[1], E0[0], '#999', 400]);
        if (Math.abs(x(E1[0]) - x(E0[0])) > 12) s += head(x(E0[0]), T + ph - 9, x(E1[0]), T + ph - 9, '#111');
        if (Math.abs(y(E1[1]) - y(E0[1])) > 12) s += head(L + 9, y(E0[1]), L + 9, y(E1[1]), '#111');
      }
      s += `<line x1="${x(E1[0])}" y1="${y(E1[1])}" x2="${x(E1[0])}" y2="${T + ph}" stroke="#888" stroke-dasharray="3 3"/><line x1="${L}" y1="${y(E1[1])}" x2="${x(E1[0])}" y2="${y(E1[1])}" stroke="#888" stroke-dasharray="3 3"/><circle cx="${x(E1[0])}" cy="${y(E1[1])}" r="6" fill="#111"/>`;
      labs.unshift([E1[1], E1[0], '#111', 600]);
      const doneY = [], doneX = [];
      labs.forEach(([p, q, c, w]) => {
        if (doneY.every(v => Math.abs(v - y(p)) > 15)) { doneY.push(y(p)); s += `<text x="${L - 6}" y="${y(p) + 5}" text-anchor="end" fill="${c}" font-weight="${w}">${r1(p)}</text>`; }
        if (doneX.every(v => Math.abs(v - x(q)) > 26)) { doneX.push(x(q)); s += `<text x="${x(q)}" y="${T + ph + 18}" text-anchor="middle" fill="${c}" font-weight="${w}">${r1(q)}</text>`; }
      });
      s += label(nD, 'demand', moved && st.demand.dir ? 'new demand' : 'demand', BLUE) + label(nS, 'supply', moved && st.supply.dir ? 'new supply' : 'supply', ORANGE);
      svg.innerHTML = s;
      return E1;
    }

    // the text under the graph: what happened now, and what is certain whatever the sizes
    function readout() {
      const E1 = eqOf(p0('demand'), p0('supply')), dP = E1[1] - E0[1], dQ = E1[0] - E0[0];
      const say = (n, a, b, d) => `${n}: ${r1(a)} → ${r1(b)} ${Math.abs(d) < 1e-9 ? '(unchanged)' : arrow(d)}`;
      box.querySelector('.ts-out').textContent = say('P', E0[1], E1[1], dP) + ' · ' + say('Q', E0[0], E1[0], dQ);
      const dD = st.demand.dir, dS = st.supply.dir, cert = box.querySelector('.ts-certain');
      if (!dD && !dS) { cert.innerHTML = '<span class="dim">pick a direction for demand, supply, or both</span>'; return; }
      // every size 1 … M of each chosen shift (a curve with "none" stays put)
      const ks = d => d ? Array.from({ length: M }, (_, i) => i + 1) : [0];
      const sP = new Set(), sQ = new Set();
      ks(dD).forEach(a => ks(dS).forEach(b => {
        const e = eqOf(S.demand.p0 - S.demand.s * dD * a, S.supply.p0 - S.supply.s * dS * b);
        sP.add(arrow(e[1] - E0[1])); sQ.add(arrow(e[0] - E0[0]));
      }));
      const one = (n, set, dNow) => {
        if (set.size === 1) return `<div class="ts-sure">${n}: always ${[...set][0] === '=' ? 'unchanged' : [...set][0]} ✓</div>`;
        // which shift decides: the direction when demand's shift is the bigger one, and when supply's is
        const big = (a, b) => { const e = eqOf(S.demand.p0 - S.demand.s * dD * a, S.supply.p0 - S.supply.s * dS * b); return arrow(n === 'P' ? e[1] - E0[1] : e[0] - E0[0]); };
        return `<div class="ts-dep">${n}: depends: ${big(M, 1)} when demand's shift is bigger, ${big(1, M)} when supply's is bigger · now ${Math.abs(dNow) < 1e-9 ? 'unchanged' : arrow(dNow)} (${st.demand.k} vs ${st.supply.k})</div>`;
      };
      cert.innerHTML = one('Q', sQ, dQ) + one('P', sP, dP);
      // the 2×2 table on the slide: the cell for these two directions
      const sec = box.closest('section'), tb = sec && sec.querySelector('table.step-table');
      if (tb) {
        tb.querySelectorAll('td').forEach(td => td.classList.remove('ts-hit'));
        if (dD && dS) { const row = tb.rows[dD > 0 ? 1 : 2], cell = row && row.cells[dS > 0 ? 1 : 2]; if (cell) cell.classList.add('ts-hit'); }
      }
    }

    // animate the curves to their new place (0.8 s)
    function update(instant) {
      const to = { demand: p0('demand'), supply: p0('supply') }, from = Object.assign({}, shown), t0 = performance.now();
      cancelAnimationFrame(raf); readout();
      box.querySelectorAll('.ts-row').forEach(r => { const c = r.dataset.c; r.querySelectorAll('button').forEach(b => b.classList.toggle('chosen', +b.dataset.d === st[c].dir)); r.querySelector('input').value = st[c].k; r.querySelector('.ts-k').textContent = st[c].k; });
      box.querySelector('.ts-ends').hidden = !(st.demand.dir && st.supply.dir);
      if (instant) { shown = to; draw(to.demand, to.supply); return; }
      const tick = now => {
        const t = Math.min(1, (now - t0) / 800), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        shown = { demand: from.demand + (to.demand - from.demand) * e, supply: from.supply + (to.supply - from.supply) * e };
        draw(shown.demand, shown.supply); if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    box.querySelectorAll('.ts-row').forEach(r => {
      const c = r.dataset.c, rng = r.querySelector('input');
      r.querySelectorAll('button').forEach(b => b.onclick = () => { st[c].dir = +b.dataset.d; if (st[c].dir && !st[c].k) st[c].k = Math.round(M / 2); if (!st[c].dir) st[c].k = 0; update(); });
      rng.oninput = () => { st[c].k = +rng.value; if (!st[c].dir && st[c].k) st[c].dir = 1; if (!st[c].k) st[c].dir = 0; update(); };
      rng.addEventListener('keydown', e => e.stopPropagation());
    });
    box.querySelector('.ts-ends').onclick = e => { ends = !ends; e.target.textContent = ends ? 'hide the endings' : 'show both endings'; update(true); };

    // drag a curve sideways (mouse or finger): snaps to whole steps; the buttons and sliders follow
    let drag = null;
    const qAt = ev => { const r = svg.getBoundingClientRect(), sx = (ev.clientX - r.left) / r.width * W, sy = (ev.clientY - r.top) / r.height * H; return [(sx - L) / pw * S.qmax, (T + ph - sy) / ph * S.pmax, sx, sy]; };
    svg.addEventListener('pointerdown', ev => {
      const [q, p, sx, sy] = qAt(ev);
      // the nearer curve (horizontal distance in pixels at this price)
      const dist = c => { const pz = shown[c], qq = (p - pz) / S[c].s; return Math.abs(x(qq) - sx); };
      const c = dist('demand') < dist('supply') ? 'demand' : 'supply';
      if (dist(c) > 40) return;
      drag = { c, q0: q, k0: st[c].dir * st[c].k }; svg.setPointerCapture(ev.pointerId); ev.preventDefault();
    });
    svg.addEventListener('pointermove', ev => {
      if (!drag) return;
      const [q] = qAt(ev), v = Math.max(-M, Math.min(M, Math.round(drag.k0 + q - drag.q0)));
      const c = drag.c; if (v === st[c].dir * st[c].k) return;
      st[c].dir = Math.sign(v); st[c].k = Math.abs(v); update(true);
    });
    const end = () => { drag = null; };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.style.touchAction = 'none'; svg.style.cursor = 'ew-resize';
    update(true);
  }
  function go() { document.querySelectorAll('.twoshift').forEach(setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
