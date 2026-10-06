// Interactive pieces for the slides: live polls (stored as git refs in a GitHub data repo) and personalise-prompt boxes.
//
// Poll markup:
//   <div class="poll" data-poll="L01-c2-subscribe" data-type="choice" data-options="yes,no"></div>
//   <div class="poll" data-poll="L01-c3-resprice" data-type="number" data-unit="€" data-mark="20"></div>
//   <div class="poll" data-poll="L02-ow-pc" data-type="text" data-max="300"></div>   (free text, e.g. own words)
// Every choice/number poll gets a "no idea" button (data-noidea="off" to drop it).
// After answering, the results open by themselves; [refresh] reloads them (no auto-update, on purpose).
// Prompt markup:
//   <details class="prompt"><summary>personalise</summary><pre>…prompt…</pre></details>
(function () {
  const cfg = window.MICRO_CONFIG || {};
  const GH = cfg.github || {};
  const TOKEN = (GH.tokenParts || []).length ? atob(GH.tokenParts.join('')) : '';
  // ?test in the URL writes to session "test" (for load tests and rehearsals)
  const SESSION = /[?&]test\b/.test(location.search) ? 'test' : (cfg.session || 'default');
  const NOIDEA = 'no idea';
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

  // Free text (own-words answers, survey comments): one git blob per answer + one tag ref pointing to it:
  //   refs/tags/t/<session>/<poll>/<ts>--<client>
  // Two API calls, no write conflicts, any length / any characters. tools/export_text.py exports them.
  async function submitText(poll, payload, onRetry) {
    const ts = Date.now();
    const content = JSON.stringify(Object.assign({ poll: poll, ts: ts, client: CID }, payload));
    if (!TOKEN) { store('micro-text-' + poll + '-' + ts, content); return; }
    const ref = 'refs/tags/t/' + SESSION + '/' + poll + '/' + ts + '--' + CID;
    let blob = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        if (!blob) {
          const b = await fetch(API + '/git/blobs', { method: 'POST', headers: headers(), body: JSON.stringify({ content: content, encoding: 'utf-8' }) });
          if (b.status === 201) blob = (await b.json()).sha;
        }
        if (blob) {
          const r = await fetch(API + '/git/refs', { method: 'POST', headers: headers(), body: JSON.stringify({ ref: ref, sha: blob }) });
          if (r.status === 201) return;
          if (r.status === 422) {
            const g = await fetch(API + '/git/' + ref, { headers: headers(), cache: 'no-store' });
            if (g.status === 200) return;
          }
        }
      } catch (e) { /* retry */ }
      if (onRetry) onRetry(attempt + 1);
      await sleep(Math.min(30000, 800 * 2 ** attempt) * (0.5 + Math.random()));
    }
    throw new Error('could not save');
  }

  // count only (texts are read by the teacher page / export script, not shown on slides)
  async function textCount(poll) {
    if (!TOKEN) return { n: 0 };
    const r = await fetch(API + '/git/matching-refs/tags/t/' + SESSION + '/' + poll + '/', { headers: headers(), cache: 'no-store' });
    const refs = await r.json();
    const clients = new Set((Array.isArray(refs) ? refs : []).map(x => x.ref.split('--').pop()));
    return { n: clients.size };
  }

  // all latest texts of polls starting with prefix (teacher page): [{poll, client, ts, text, skipped, ...}]
  async function textResults(prefix) {
    const r = await fetch(API + '/git/matching-refs/tags/t/' + SESSION + '/' + prefix, { headers: headers(), cache: 'no-store' });
    const refs = await r.json();
    const latest = {};
    (Array.isArray(refs) ? refs : []).forEach(x => {
      const rest = x.ref.slice(('refs/tags/t/' + SESSION + '/').length);
      const cut = rest.lastIndexOf('/'), poll = rest.slice(0, cut), parts = rest.slice(cut + 1).split('--');
      const key = poll + '|' + parts[1], ts = Number(parts[0]);
      if (!latest[key] || latest[key].ts < ts) latest[key] = { poll: poll, ts: ts, sha: x.object.sha };
    });
    const list = Object.values(latest), out = [];
    for (let i = 0; i < list.length; i += 8) {
      const chunk = await Promise.all(list.slice(i, i + 8).map(async it => {
        try {
          const b = await fetch(API + '/git/blobs/' + it.sha, { headers: headers(), cache: 'force-cache' });
          const j = await b.json();
          const txt = new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\n/g, '')), c => c.charCodeAt(0)));
          return JSON.parse(txt);
        } catch (e) { return { poll: it.poll, ts: it.ts, text: '(could not read)' }; }
      }));
      out.push(...chunk);
    }
    return out;
  }

  // all choice/number answers of polls starting with prefix (teacher page): {poll: [{client, ts, value}]}
  async function allResults(prefix) {
    const base = 'refs/heads/v/' + SESSION + '/';
    const r = await fetch(API + '/git/matching-refs/heads/v/' + SESSION + '/' + prefix, { headers: headers(), cache: 'no-store' });
    const refs = await r.json();
    const latest = {};
    (Array.isArray(refs) ? refs : []).forEach(x => {
      const rest = x.ref.slice(base.length), cut = rest.lastIndexOf('/');
      const poll = rest.slice(0, cut), parts = rest.slice(cut + 1).split('--');
      if (parts.length < 3) return;
      const ts = Number(parts[0]), client = parts[1], raw = parts.slice(2).join('--');
      const value = raw !== '' && isFinite(Number(raw)) ? Number(raw) : raw;
      const k = poll + '|' + client;
      if (!latest[k] || latest[k].ts < ts) latest[k] = { poll: poll, client: client, ts: ts, value: value };
    });
    const by = {};
    Object.values(latest).forEach(x => (by[x.poll] = by[x.poll] || []).push(x));
    return by;
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
    if (options.indexOf(NOIDEA) < 0 && data.responses.some(r => String(r.value) === safe(NOIDEA))) options = options.concat([NOIDEA]);
    options.forEach(o => counts[o] = 0);
    data.responses.forEach(r => { const o = options.find(x => safe(x) === String(r.value)); if (o) counts[o]++; });
    const n = Object.values(counts).reduce((a, b) => a + b, 0);
    options.forEach(o => box.appendChild(bar(o, counts[o], n, o === NOIDEA ? 'noidea' : '')));
    box.appendChild(el('div', 'dim small-line', 'n = ' + n));
  }

  function renderNumber(box, data, unit, mark) {
    const vals = data.responses.map(r => Number(r.value)).filter(v => isFinite(v)).sort((a, b) => b - a);
    const noIdea = data.responses.filter(r => String(r.value) === safe(NOIDEA)).length;
    if (!vals.length) { box.appendChild(el('div', 'dim', 'no answers yet' + (noIdea ? ' · no idea: ' + noIdea : ''))); return; }
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
    if (noIdea) line += ' · no idea: ' + noIdea;
    box.appendChild(el('div', 'dim small-line', line));
  }

  function initPoll(node) {
    const poll = node.dataset.poll;
    const type = node.dataset.type || 'choice';
    const unit = node.dataset.unit || '';
    const mark = node.dataset.mark !== undefined ? Number(node.dataset.mark) : null;
    const options = (node.dataset.options || '').split(',').map(s => s.trim()).filter(Boolean);
    const withNoIdea = node.dataset.noidea !== 'off' && type !== 'text';
    let afterSave = () => {};

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
        try { await submit(poll, Number(f.value), n => status.textContent = 'busy, retry ' + n + '…'); status.textContent = 'saved_'; afterSave(); }
        catch (e) { status.textContent = 'not saved (offline?)'; }
      };
      f.addEventListener('keydown', ev => { if (ev.key === 'Enter') go.click(); ev.stopPropagation(); });
      if (unit) input.appendChild(el('span', 'unit', unit));
      input.appendChild(f);
      input.appendChild(go);
      if (withNoIdea) {
        const ni = el('button', 'btn noidea', NOIDEA);
        ni.onclick = async () => {
          status.textContent = '…';
          try { await submit(poll, NOIDEA, n => status.textContent = 'busy, retry ' + n + '…'); status.textContent = 'saved_'; afterSave(); }
          catch (e) { status.textContent = 'not saved (offline?)'; }
        };
        input.appendChild(ni);
      }
    } else if (type === 'text') {
      const max = Number(node.dataset.max || 300);
      const f = el('textarea'); f.maxLength = max; f.rows = 2; f.placeholder = 'in your own words…';
      const cnt = el('span', 'dim small-line', '0 / ' + max);
      f.oninput = () => cnt.textContent = f.value.length + ' / ' + max;
      f.addEventListener('keydown', ev => ev.stopPropagation());
      const go = el('button', 'btn', 'submit'), skip = el('button', 'btn ghost', 'skip');
      const send = async (payload) => {
        status.textContent = '…';
        try { await submitText(poll, payload, n => status.textContent = 'busy, retry ' + n + '…'); status.textContent = 'saved_'; afterSave(); }
        catch (e) { status.textContent = 'not saved (offline?)'; }
      };
      go.onclick = () => { if (!f.value.trim()) { status.textContent = 'write something or skip'; return; } send({ text: f.value.trim(), skipped: false }); };
      skip.onclick = () => send({ text: '', skipped: true });
      input.appendChild(f); input.appendChild(cnt); input.appendChild(go); input.appendChild(skip);
    } else {
      options.forEach(o => {
        const b = el('button', 'btn', o);
        b.onclick = async () => {
          input.querySelectorAll('.btn').forEach(x => x.classList.remove('chosen'));
          b.classList.add('chosen');
          status.textContent = '…';
          try { await submit(poll, o, n => status.textContent = 'busy, retry ' + n + '…'); status.textContent = 'saved_'; afterSave(); }
          catch (e) { status.textContent = 'not saved (offline?)'; }
        };
        input.appendChild(b);
      });
      if (withNoIdea && options.indexOf(NOIDEA) < 0) {
        const b = el('button', 'btn noidea', NOIDEA);
        b.onclick = async () => {
          input.querySelectorAll('.btn').forEach(x => x.classList.remove('chosen'));
          b.classList.add('chosen');
          status.textContent = '…';
          try { await submit(poll, NOIDEA, n => status.textContent = 'busy, retry ' + n + '…'); status.textContent = 'saved_'; afterSave(); }
          catch (e) { status.textContent = 'not saved (offline?)'; }
        };
        input.appendChild(b);
      }
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
        const viz = el('div', 'viz');
        if (type === 'text') { const c = await textCount(poll); out.innerHTML = ''; viz.appendChild(el('div', 'dim small-line', c.n + ' answers so far (the texts are read after class)')); out.appendChild(viz); return; }
        const data = await results(poll);
        out.innerHTML = '';
        if (type === 'number') renderNumber(viz, data, unit, mark);
        else renderChoice(viz, data, withNoIdea && options.indexOf(NOIDEA) < 0 ? options.concat([NOIDEA]) : options);
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
    // after your own answer: open the results once (no auto-update; [refresh] for new answers)
    afterSave = () => { out.classList.add('open'); refresh.style.display = ''; draw(); };
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

  window.MicroPoll = { submit: submit, results: results, submitText: submitText, textResults: textResults, allResults: allResults, session: SESSION, cid: CID };

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
