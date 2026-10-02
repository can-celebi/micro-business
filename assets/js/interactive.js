// Interactive pieces for the slides: live polls (stored as git refs in a GitHub data repo) and personalise-prompt boxes.
//
// Poll markup:
//   <div class="poll" data-poll="L01-c2-subscribe" data-type="choice" data-options="yes,no"></div>
//   <div class="poll" data-poll="L01-c3-resprice" data-type="number" data-unit="€" data-mark="20"></div>
// Prompt markup:
//   <details class="prompt"><summary>personalise</summary><pre>…prompt…</pre></details>
(function () {
  const cfg = window.MICRO_CONFIG || {};
  const GH = cfg.github || {};
  const TOKEN = (GH.tokenParts || []).length ? atob(GH.tokenParts.join('')) : '';
  const SESSION = cfg.session || 'default';
  const API = 'https://api.github.com/repos/' + GH.owner + '/' + GH.repo;

  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  let CID = load('micro-cid');
  if (!CID) {
    CID = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    store('micro-cid', CID);
  }

  // Each answer is stored as its own git ref (a branch name) in the data repo:
  //   refs/heads/v/<session>/<poll>/<ts>--<client>--<value>
  // Separate refs never conflict (one shared file would, with ~90 people voting at
  // once), and results are a single API call. tools/export_polls.py turns them into JSON files.
  const safe = v => String(v).replace(/[^A-Za-z0-9.-]/g, '_').replace(/\.+$/, '').slice(0, 40);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const headers = () => ({ 'Authorization': 'Bearer ' + TOKEN, 'Accept': 'application/vnd.github+json' });
  let headSha = null;

  async function baseSha() {
    if (headSha) return headSha;
    const r = await fetch(API + '/git/ref/heads/' + (GH.branch || 'main'), { headers: headers(), cache: 'no-store' });
    headSha = (await r.json()).object.sha;
    return headSha;
  }

  async function submit(poll, value, onRetry) {
    const ts = Date.now();
    if (!TOKEN) {
      const all = JSON.parse(load('micro-poll-' + poll) || '{}');
      all[CID] = { value: value, time: new Date(ts).toISOString() };
      store('micro-poll-' + poll, JSON.stringify(all));
      return;
    }
    const ref = 'refs/heads/v/' + SESSION + '/' + poll + '/' + ts + '--' + CID + '--' + safe(value);
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const r = await fetch(API + '/git/refs', {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ ref: ref, sha: await baseSha() })
        });
        if (r.status === 201) return;
        // under load GitHub can answer 422 without creating the ref: check before trusting it
        if (r.status === 422) {
          const g = await fetch(API + '/git/' + ref, { headers: headers(), cache: 'no-store' });
          if (g.status === 200) return;
        }
        const ra = r.headers.get('retry-after');
        if (ra) await sleep(1000 * Number(ra));
      } catch (e) { /* network hiccup: retry */ }
      if (onRetry) onRetry(attempt + 1);
      await sleep(Math.min(30000, 800 * 2 ** attempt) * (0.5 + Math.random()));
    }
    throw new Error('could not save');
  }

  async function results(poll) {
    if (!TOKEN) {
      const all = JSON.parse(load('micro-poll-' + poll) || '{}');
      const responses = Object.values(all);
      return { poll: poll, mode: 'local demo (no token)', n: responses.length, responses: responses };
    }
    const prefix = 'refs/heads/v/' + SESSION + '/' + poll + '/';
    const r = await fetch(API + '/git/matching-refs/heads/v/' + SESSION + '/' + poll + '/', { headers: headers(), cache: 'no-store' });
    const refs = await r.json();
    const latest = {};
    (Array.isArray(refs) ? refs : []).forEach(x => {
      const parts = x.ref.slice(prefix.length).split('--');
      if (parts.length < 3) return;
      const ts = Number(parts[0]), client = parts[1], raw = parts.slice(2).join('--');
      const value = raw !== '' && isFinite(Number(raw)) ? Number(raw) : raw;
      if (!latest[client] || latest[client].ts < ts) latest[client] = { ts: ts, value: value };
    });
    const responses = Object.values(latest).map(x => ({ value: x.value, time: new Date(x.ts).toISOString() }));
    return { poll: poll, session: SESSION, n: responses.length, responses: responses };
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // bar length = share of all answers (n); label "57% (32)"
  function bar(label, value, total, cls) {
    const row = el('div', 'bar-row');
    row.appendChild(el('span', 'bar-label', label));
    const track = el('span', 'bar-track');
    const fill = el('span', 'bar-fill ' + (cls || ''));
    const pct = total > 0 ? 100 * value / total : 0;
    fill.style.width = pct + '%';
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('span', 'bar-n', Math.round(pct) + '% (' + value + ')'));
    return row;
  }

  function renderChoice(box, data, options) {
    const counts = {};
    options.forEach(o => counts[o] = 0);
    data.responses.forEach(r => { const o = options.find(x => safe(x) === String(r.value)); if (o) counts[o]++; });
    const n = Object.values(counts).reduce((a, b) => a + b, 0);
    options.forEach(o => box.appendChild(bar(o, counts[o], n)));
    box.appendChild(el('div', 'dim small-line', 'n = ' + n));
  }

  function renderNumber(box, data, unit, mark) {
    const vals = data.responses.map(r => Number(r.value)).filter(v => isFinite(v)).sort((a, b) => b - a);
    if (!vals.length) { box.appendChild(el('div', 'dim', 'no answers yet')); return; }
    const max = Math.max(...vals);
    const wrap = el('div', 'vbars');
    vals.forEach(v => {
      const b = el('span', 'vbar' + (mark !== null && v >= mark ? ' hit' : ''));
      b.style.height = (100 * v / max) + '%';
      b.title = unit + v;
      wrap.appendChild(b);
    });
    box.appendChild(wrap);
    const mid = vals[Math.floor((vals.length - 1) / 2)];
    let line = 'n = ' + vals.length + ' · median ' + unit + mid;
    if (mark !== null) line += ' · ≥ ' + unit + mark + ': ' + vals.filter(v => v >= mark).length;
    box.appendChild(el('div', 'dim small-line', line));
  }

  function initPoll(node) {
    const poll = node.dataset.poll;
    const type = node.dataset.type || 'choice';
    const unit = node.dataset.unit || '';
    const mark = node.dataset.mark !== undefined ? Number(node.dataset.mark) : null;
    const options = (node.dataset.options || '').split(',').map(s => s.trim()).filter(Boolean);

    const input = el('div', 'poll-input');
    const status = el('span', 'poll-status');

    if (type === 'number') {
      const f = el('input');
      f.type = 'number'; f.min = node.dataset.min || '0'; f.step = 'any';
      f.placeholder = unit || '#';
      const go = el('button', 'btn', 'submit');
      go.onclick = async () => {
        if (f.value === '' || !isFinite(Number(f.value))) { status.textContent = 'enter a number'; return; }
        status.textContent = '…';
        try { await submit(poll, Number(f.value), n => status.textContent = 'busy, retry ' + n + '…'); status.textContent = 'saved_'; }
        catch (e) { status.textContent = 'not saved (offline?)'; }
      };
      f.addEventListener('keydown', ev => { if (ev.key === 'Enter') go.click(); ev.stopPropagation(); });
      if (unit) input.appendChild(el('span', 'unit', unit));
      input.appendChild(f);
      input.appendChild(go);
    } else {
      options.forEach(o => {
        const b = el('button', 'btn', o);
        b.onclick = async () => {
          input.querySelectorAll('.btn').forEach(x => x.classList.remove('chosen'));
          b.classList.add('chosen');
          status.textContent = '…';
          try { await submit(poll, o, n => status.textContent = 'busy, retry ' + n + '…'); status.textContent = 'saved_'; }
          catch (e) { status.textContent = 'not saved (offline?)'; }
        };
        input.appendChild(b);
      });
    }
    input.appendChild(status);
    node.appendChild(input);

    const controls = el('div', 'poll-controls');
    const show = el('button', 'btn ghost', 'results');
    const refresh = el('button', 'btn ghost', 'refresh');
    refresh.style.display = 'none';
    controls.appendChild(show);
    controls.appendChild(refresh);
    node.appendChild(controls);

    const out = el('div', 'poll-results');
    node.appendChild(out);

    async function draw() {
      out.innerHTML = '';
      out.appendChild(el('div', 'dim', 'loading…'));
      try {
        const data = await results(poll);
        out.innerHTML = '';
        const viz = el('div', 'viz');
        if (type === 'number') renderNumber(viz, data, unit, mark);
        else renderChoice(viz, data, options);
        out.appendChild(viz);
        const raw = el('details', 'raw');
        raw.appendChild(el('summary', null, 'json'));
        raw.appendChild(el('pre', null, JSON.stringify(data, null, 2)));
        out.appendChild(raw);
      } catch (e) {
        out.innerHTML = '';
        out.appendChild(el('div', 'dim', 'could not load results'));
      }
    }
    show.onclick = () => {
      const open = out.classList.toggle('open');
      refresh.style.display = open ? '' : 'none';
      if (open) draw();
    };
    refresh.onclick = draw;
  }

  function initPrompt(d) {
    const pre = d.querySelector('pre');
    if (!pre || d.querySelector('.copy')) return;
    const b = el('button', 'btn ghost copy', 'copy');
    b.onclick = async () => {
      try { await navigator.clipboard.writeText(pre.textContent.trim()); b.textContent = 'copied_'; }
      catch (e) { b.textContent = 'select + copy'; }
      setTimeout(() => b.textContent = 'copy', 1800);
    };
    d.appendChild(b);
  }

  window.MicroPoll = { submit: submit, results: results };

  function init() {
    // PDF export (?print-pdf): show answers, polls become plain text
    if (/print-pdf/.test(location.search)) {
      document.querySelectorAll('details.answer').forEach(d => d.open = true);
      return;
    }
    document.querySelectorAll('.poll').forEach(initPoll);
    document.querySelectorAll('details.prompt').forEach(initPrompt);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
