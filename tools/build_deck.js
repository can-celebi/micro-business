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
const V = '20261006a';
const NUM = { L02: 2, L03: 3 }[LEC];

const esc = s => String(s);
const strip = s => String(s).replace(/<[^>]+>/g, '');
const safeId = s => String(s).replace(/[^A-Za-z0-9-]/g, '-');

// ---------- graphs ----------
function svgSteps() {
  const W = 520, H = 300, L = 48, B = 34, T = 10, R = 14, pw = W - L - R, ph = H - T - B, qm = 42, pm = 60;
  const x = q => L + q / qm * pw, y = p => T + ph - p / pm * ph;
  const pts = [[60, 1], [50, 4], [40, 6], [30, 9], [25, 14], [20, 20], [15, 21], [10, 30], [5, 38], [0, 41]];
  let d = 'M' + x(0) + ',' + y(60), q0 = 0;
  pts.forEach(([p, n]) => { d += ' L' + x(q0) + ',' + y(p) + ' L' + x(n) + ',' + y(p); q0 = n; });
  let s = `<svg class="graph" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Mono,monospace" font-size="13"><line x1="${L}" y1="${T}" x2="${L}" y2="${T + ph}" stroke="#222"/><line x1="${L}" y1="${T + ph}" x2="${L + pw}" y2="${T + ph}" stroke="#222"/><path d="${d}" fill="none" stroke="#0074D9" stroke-width="3"/>`;
  [0, 20, 40, 60].forEach(p => s += `<text x="${L - 6}" y="${y(p) + 4}" text-anchor="end" fill="#777">€${p}</text>`);
  [0, 10, 20, 30, 40].forEach(q => s += `<text x="${x(q)}" y="${T + ph + 18}" text-anchor="middle" fill="#777">${q}</text>`);
  s += `<circle cx="${x(20)}" cy="${y(20)}" r="5" fill="#111"/><text x="${x(20) + 10}" y="${y(20) - 8}">20 buy at €20</text><text x="${L + pw}" y="${T + ph + 32}" text-anchor="end" fill="#777">how many of you buy</text></svg>`;
  return s;
}
function svgLines(g) {
  const W = 520, H = 320, L = 56, B = 34, T = 10, R = 14, pw = W - L - R, ph = H - T - B;
  const x = q => L + q / g.qmax * pw, y = p => T + ph - p / g.pmax * ph;
  let s = `<svg class="graph" viewBox="0 0 ${W} ${H}" font-family="IBM Plex Mono,monospace" font-size="13"><line x1="${L}" y1="${T}" x2="${L}" y2="${T + ph}" stroke="#222"/><line x1="${L}" y1="${T + ph}" x2="${L + pw}" y2="${T + ph}" stroke="#222"/><text x="${L - 8}" y="${T + 12}" text-anchor="end" fill="#777">P</text><text x="${L + pw}" y="${T + ph + 18}" text-anchor="end" fill="#777">Q</text>`;
  (g.hl || []).forEach(p => { s += `<line x1="${L}" y1="${y(p)}" x2="${L + pw}" y2="${y(p)}" stroke="#bbb" stroke-dasharray="4 4"/><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end" fill="#777">€${p}</text>`; });
  g.lines.forEach(l => {
    let q1 = g.qmax, p1 = l.p0 + l.s * q1;
    if (p1 < 0) { q1 = -l.p0 / l.s; p1 = 0; }
    if (p1 > g.pmax) { q1 = (g.pmax - l.p0) / l.s; p1 = g.pmax; }
    const c = l.n === 'demand' ? '#0074D9' : '#eb6834';
    s += `<line x1="${x(0)}" y1="${y(l.p0)}" x2="${x(q1)}" y2="${y(p1)}" stroke="${c}" stroke-width="3"/><text x="${x(q1) - 4}" y="${y(p1) - 8}" text-anchor="end" fill="${c}">${l.n}</text><text x="${L - 6}" y="${y(l.p0) + 4}" text-anchor="end" fill="#777">€${l.p0}</text>`;
  });
  if (g.mark) { const [q, p] = g.mark; s += `<line x1="${x(q)}" y1="${y(p)}" x2="${x(q)}" y2="${T + ph}" stroke="#bbb" stroke-dasharray="3 3"/><line x1="${L}" y1="${y(p)}" x2="${x(q)}" y2="${y(p)}" stroke="#bbb" stroke-dasharray="3 3"/><circle cx="${x(q)}" cy="${y(p)}" r="5" fill="#111"/><text x="${x(q)}" y="${T + ph + 18}" text-anchor="middle" fill="#777">${q}</text><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end" fill="#777">€${p}</text>`; }
  return s + '</svg>';
}
function graph(g) {
  if (!g) return '';
  if (g.type === 'steps') return svgSteps();
  if (g.type === 'lines') return svgLines(g);
  if (g.type === 'slider') return `<div class="sd-slider" data-kind="${g.kind}" data-a="${g.a}" data-b="${g.b}" data-amin="${g.amin}" data-amax="${g.amax}" data-astep="${g.astep || 1}" data-bmin="${g.bmin}" data-bmax="${g.bmax}" data-qmax="${g.qmax}" data-pmax="${g.pmax}"></div>`;
  if (g.type === 'bars') return '<div class="hbars">' + g.data.map(([l, v]) => `<div class="hb"><span class="hb-l">${l}</span><span class="hb-t"><span class="hb-f" style="width:${v}%"></span></span><span class="hb-n">${v}${g.unit || ''}</span></div>`).join('') + (g.note ? `<div class="dim hb-note">${g.note}</div>` : '') + '</div>';
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
function tableHTML(tbl, frag, start) {
  let k = start;
  return '<table class="console step-table">' + tbl.map((r, i) => {
    const cells = r.map((c, j) => (i === 0 || j === 0) ? `<th>${c}</th>` : `<td>${c}</td>`).join('');
    if (i === 0 || !frag) return `<tr>${cells}</tr>`;
    k++; return `<tr class="pf-row fragment" data-fragment-index="${k}">${cells}</tr>`;
  }).join('') + '</table>';
}
function miniTable(tbl) { return '<table class="mini">' + tbl.map((r, i) => '<tr>' + r.map((c, j) => (i === 0 || j === 0) ? `<th>${c}</th>` : `<td>${c}</td>`).join('') + '</tr>').join('') + '</table>'; }
function answerHTML(ans, extraTbl) {
  if (!ans) return '';
  return `<details class="answer"><summary>show answer</summary><div class="answer-body"><div class="ans">${ans.a}</div>` + (ans.w || []).map(w => `<div class="why">${w}</div>`).join('') + (extraTbl ? miniTable(extraTbl) : '') + (ans.m ? `<pre class="math">${ans.m}</pre>` : '') + '</div></details>';
}
function pollHTML(p, frag, type) {
  if (!p || !p.o || !p.o.length) return '';
  const id = safeId(p.id && !/[ /*]/.test(p.id) ? p.id : '');
  if (!id) return '';
  const opts = p.o.map(o => strip(o).replace(/,/g, '‚')).join(',');
  return `<div class="poll fragment" data-fragment-index="${frag}" data-poll="${id}" data-type="${p.multi ? 'multi' : (type || 'choice')}" data-options="${opts}"></div>`;
}

// ---------- slide builders ----------
const CONCEPT_OF = { 'L02-13': 'perfect competition', 'L02-21': 'demand', 'L02-26': 'supply', 'L02-09': 'allocation mechanisms' };
const OW = { alloc: 'an allocation mechanism', pc: 'perfect competition', barr: 'a barrier to entry', dem: 'demand', invdem: 'inverse demand', lawdem: 'the law of demand', sup: 'supply', invsup: 'inverse supply' };
const AFTER = [['alloc', 'allocation mechanisms'], ['pc', 'perfect competition'], ['barr', 'barriers to entry'], ['dec', 'decentralisation'], ['dem', 'demand'], ['invdem', 'inverse demand'], ['sup', 'supply'], ['invsup', 'inverse supply']];

function section(s) {
  const notes = s.notes ? `<aside class="notes">${strip(s.notes)}</aside>` : '';
  const sid = `data-sid="${s.id}"`;
  if (s.tag === 'qr') return `<section ${sid}><div class="qr-slide"><img src="qr.svg" alt="QR code to these slides"><div class="qr-link">${s.qr}</div><div class="dim small">${s.sub}</div></div><aside class="notes">Everyone opens the slides on their own device: polls, the pulse button and the own-words boxes are inside.</aside></section>`;
  if (s.tag === 'title') return `<section ${sid}><div class="title-block"><div class="t">microeconomics<span class="cursor"></span></div><div class="s">040184 · ws 2026/27 · lecture ${NUM}</div><div class="a">${s.tb[2]}</div></div></section>`;
  if (s.tag === 'survey' && s.id.endsWith('-03')) {
    const sn = 'S0' + NUM;
    return `<section ${sid}><h2>${s.title}</h2><div class="qr-slide" style="height:auto;margin-top:1em"><img src="qr-survey.svg" alt="QR code to the survey" style="width:300px;height:300px"><div class="qr-link">can-celebi.github.io/micro-business/${sn}</div><div class="dim small">anonymous · about 3 minutes · <a href="../../survey/${LEC}/" target="_blank">open the survey</a></div></div>${notes}</section>`;
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
  let body = `<h2>${s.title}</h2>` + (s.sub ? `<p class="sub">${s.sub}</p>` : '');
  let k = 0;
  const hasRows = s.rows && s.rows.length;
  if (s.big || s.def) body += `<div class="center" style="margin-top:${hasRows || s.graph ? '3%' : '12%'}"><div class="big">${s.big || ''}</div>${s.def ? `<div class="def">${s.def}</div>` : ''}</div>`;
  const isEx = s.tag === 'example';
  const g = graph(s.graph);
  let main = '';
  if (isEx && s.tbl) { main += tableHTML(s.tbl, true, k); k += s.tbl.length - 1; }
  if (hasRows) { main += rowsHTML(s.rows, k, s.q ? 'story' : ''); k += s.rows.filter(r => r[0] !== '' || r[1] !== '').length; }
  if (!isEx && s.tbl && !s.ans) { main += tableHTML(s.tbl, false, k); }
  body += g ? `<div class="split"><div>${main}</div><div class="split-g">${g}</div></div>` : main;
  if (s.q) { k++; body += `<div class="big q fragment" data-fragment-index="${k}">${s.q}</div>`; }
  if (s.poll && s.poll.o && s.poll.o.length && !/tap options|one tap|free text/.test(s.poll.o[0])) body += pollHTML(s.poll, s.q ? k : ++k);
  body += answerHTML(s.ans, (!isEx && s.tbl && s.ans) ? s.tbl : null);
  if (s.personalise && CONCEPT_OF[s.id]) body += prompt(CONCEPT_OF[s.id]);
  return `<section ${sid}>${body}${notes}</section>`;
}
function ownWords() {
  return Object.entries(OW).map(([id, l], i) => `<section data-sid="${LEC}-ow-${id}"><h2>in your own words · ${i + 1}/${Object.keys(OW).length}</h2><div class="big" style="margin-top:6%">what is ${l}?</div><p class="dim small">(English, 1–2 sentences, without looking at the slides)</p><div class="poll" data-poll="${LEC}-ow-${id}" data-type="text" data-max="300"></div>${i === 0 ? '<p class="dim small" style="margin-top:1.2em">anonymous · your text is checked by an AI model (Jev, TypeSafe, USA) · don\'t write your name · ungraded</p>' : ''}<aside class="notes">Own words → Jev after class (Cevdet). Concept id ${id}.</aside></section>`).join('\n');
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
<link rel="stylesheet" href="../../vendor/reveal/reset.css">
<link rel="stylesheet" href="../../vendor/reveal/reveal.css">
<link rel="stylesheet" href="../../assets/css/console-light.css?v=${V}">
<style>
  /* deck-specific layout (generated by tools/build_deck.js from the storyboard) */
  .split { display: grid; grid-template-columns: 1fr 0.85fr; gap: 1.2em; align-items: start; margin-top: 0.8em; }
  .split .rows { margin-top: 0.4em; }
  .graph { width: 100%; height: auto; }
  .graph-desc { font-size: 0.6em; border: 1.5px dashed #bbb; padding: 0.5em; }
  .reveal table.step-table tr.fragment.visible.past { opacity: 0.55; }
  .reveal table.step-table { font-size: 0.72em; border-collapse: collapse; margin-top: 0.8em; width: 100%; }
  .reveal table.step-table th, .reveal table.step-table td { border: 1px solid #ddd; padding: 0.35em 0.6em; text-align: left; vertical-align: top; }
  .reveal table.step-table th { color: var(--dim); font-weight: 400; }
  .rows.after { gap: 0.15em 1.2em; margin-top: 0.6em; }
  .rows.after .k { font-size: 0.6em; align-self: center; }
  .poll.compact { margin-top: 0; font-size: 0.7em; }
  .poll.compact .poll-controls, .poll.compact .poll-results { display: none; }
  .hbars { font-size: 0.6em; margin-top: 0.4em; }
  .hb { display: grid; grid-template-columns: 7em 1fr 3.5em; gap: 0.5em; align-items: center; margin: 0.18em 0; }
  .hb-t { height: 0.9em; background: #f1f1ee; border: 1px solid #ddd; }
  .hb-f { display: block; height: 100%; background: var(--p-green); border-right: 1.5px solid var(--line); }
  .hb-n { text-align: right; }
  .hb-note { margin-top: 0.5em; font-size: 0.85em; }
  html.mobile .split { grid-template-columns: 1fr; }
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
<script src="../../assets/js/mining-demo.js?v=${V}"></script>
<script src="../../assets/js/menu.js?v=${V}"></script>
<script src="../../assets/js/pulse.js?v=${V}"></script>
<script>
  const MOBILE = Math.min(window.innerWidth, window.innerHeight) < 600 || window.innerWidth < 760;
  if (MOBILE) document.documentElement.classList.add('mobile');
  Reveal.initialize({
    hash: true, disableLayout: MOBILE, fragments: !MOBILE, pdfSeparateFragments: false, touch: true,
    width: 1280, height: 720, margin: 0.08, center: false, transition: 'none', backgroundTransition: 'none',
    slideNumber: 'c/t', controls: false, progress: true, plugins: [ RevealNotes ]
  });
  // step tables: only the current row is in focus, earlier rows fade
  function focusRows() {
    document.querySelectorAll('table.step-table').forEach(t => {
      const shown = [...t.querySelectorAll('tr.pf-row.visible')];
      shown.forEach((r, i) => r.classList.toggle('past', i < shown.length - 1));
    });
  }
  Reveal.on('fragmentshown', focusRows); Reveal.on('fragmenthidden', focusRows); Reveal.on('slidechanged', focusRows);
</script>
</body>
</html>
`;
const dir = path.join(__dirname, '..', 'lectures', LEC);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`${LEC}: ${out.length} blocks from ${slides.length} storyboard slides → lectures/${LEC}/index.html`);
