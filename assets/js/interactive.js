// Interactive pieces for the slides: live polls (stored as git refs in a GitHub data repo) and personalise-prompt boxes.
//
// Poll markup:
//   <div class="poll" data-poll="L01-c2-subscribe" data-type="choice" data-options="yes,no"></div>
//   <div class="poll" data-poll="L01-c3-resprice" data-type="number" data-unit="€" data-mark="20"></div>
//   <div class="poll" data-poll="L02-ow-pc" data-type="text" data-max="300"></div>   (free text, e.g. own words)
//   <div class="poll" data-poll="L02-q" data-type="multi" data-options="a,b,c"></div>   (tap all that apply, then submit)
// Every choice/number poll gets a "no idea" button (data-noidea="off" to drop it).
// After answering, the results open by themselves; [refresh] reloads them (no auto-update, on purpose).
// Prompt markup:
//   <details class="prompt"><summary>personalise</summary><pre>…prompt…</pre></details>
(function () {
  const cfg = window.MICRO_CONFIG || {};
  const GH = cfg.github || {};
  const TOKEN = (GH.tokenParts || []).length ? atob(GH.tokenParts.join('')) : '';
  // ?test in the URL writes to session "test" (for load tests and rehearsals)
  // a page served from this computer (a local preview) always writes to the test session, so previews never reach the
  // class data (Kemal, 08.10: Can's preview taps landed in ws26). ?live forces the real session on localhost.
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && !/[?&]live\b/.test(location.search);
  const SESSION = /[?&]test\b/.test(location.search) || LOCAL ? 'test' : (cfg.session || 'default');
  // ?fresh (Kemal, 08.10): forget this device's remembered TEST answers, so a preview starts clean. Never the real session.
  if (SESSION === 'test' && /[?&]fresh\b/.test(location.search)) {
    try { Object.keys(localStorage).filter(k => k.indexOf('micro-voted-test-') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }
  const NOIDEA = 'no idea';
  const API = 'https://api.github.com/repos/' + GH.owner + '/' + GH.repo;

  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  // teacher mode, same deck and same link for everyone: press T on the teacher's laptop (remembered on that
  // device, T again switches it off), or ?teacher in the URL. It adds class views: poll results without voting,
  // the class pulse inputs hidden, the question list.
  // ?teacher once (e.g. on the phone, no keyboard) switches it on for that device too
  // Teacher mode needs the teacher code: its SHA-256 must match cfg.teacherHash (the code itself is never in
  // the site). The device keeps the code, so it stays in teacher mode until T switches it off.
  function sha256hex(str) {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const b = new TextEncoder().encode(str), l = b.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
    m.set(b); m[l] = 0x80; const dv = new DataView(m.buffer); dv.setUint32(n - 4, l * 8); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
    let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const w = new Uint32Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + 4 * i);
      for (let i = 16; i < 64; i++) { const s0 = r(w[i-15],7) ^ r(w[i-15],18) ^ (w[i-15] >>> 3), s1 = r(w[i-2],17) ^ r(w[i-2],19) ^ (w[i-2] >>> 10); w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0; }
      let [a, bb, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (r(e,6) ^ r(e,11) ^ r(e,25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0, t2 = ((r(a,2) ^ r(a,13) ^ r(a,22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
      }
      h = h.map((x, i) => (x + [a, bb, c, d, e, f, g, hh][i]) >>> 0);
    }
    return h.map(x => x.toString(16).padStart(8, '0')).join('');
  }
  const checkCode = code => !!cfg.teacherHash && sha256hex('micro-teacher:' + String(code || '').trim()) === cfg.teacherHash;
  const TEACHER = checkCode(load('micro-teacher-code'));
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

  // class window of a lecture: [start, end] in ms (18:30–20:00 Vienna time on its date, config.js), or null if unknown
  function classWindow(lec) {
    // the test session has no class window (Can, 08.10: "for now we are testing it so please show me"): every tap counts
    if (SESSION === 'test') return null;
    const day = (cfg.lectures || {})[lec], tt = cfg.classTime || ['18:30', '20:00'];
    if (!day) return null;
    const vienna = (hhmm) => {
      const [y, mo, d] = day.split('-').map(Number), [h, mi] = hhmm.split(':').map(Number);
      const guess = Date.UTC(y, mo - 1, d, h, mi);
      // Vienna's offset from UTC at that moment (CET +1 / CEST +2), whatever the device's own time zone is
      const p = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        .formatToParts(new Date(guess)).forEach(x => p[x.type] = Number(x.value));
      return guess - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - guess);
    };
    return [vienna(tt[0]), vienna(tt[1])];
  }
  // no delete function on purpose (Can, 08.10): stored answers are never removed; the chat hides with a mark instead
  // try a teacher code: right → remembered on this device
  function teacherLogin(code) { if (!checkCode(code)) return false; store('micro-teacher-code', String(code).trim()); return true; }
  function teacherLogout() { store('micro-teacher-code', ''); }

  // raw text refs under a prefix (no blob downloads): [{poll, ts, client, sha}]
  async function tagRefs(prefix) {
    const base = 'refs/tags/t/' + SESSION + '/';
    const r = await fetch(API + '/git/matching-refs/tags/t/' + SESSION + '/' + prefix, { headers: headers(), cache: 'no-store' });
    const refs = await r.json();
    return (Array.isArray(refs) ? refs : []).map(x => {
      const rest = x.ref.slice(base.length), cut = rest.lastIndexOf('/'), parts = rest.slice(cut + 1).split('--');
      return { poll: rest.slice(0, cut), ts: Number(parts[0]), client: parts[1], sha: x.object.sha };
    });
  }
  // one stored text (JSON), cached on this device so each message is downloaded once
  async function blob(sha) {
    const k = 'micro-blob-' + sha, c = load(k);
    if (c) { try { return JSON.parse(c); } catch (e) {} }
    const b = await fetch(API + '/git/blobs/' + sha, { headers: headers(), cache: 'force-cache' });
    const j = await b.json();
    const txt = new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\n/g, '')), ch => ch.charCodeAt(0)));
    store(k, txt);
    return JSON.parse(txt);
  }

  // every answer (not only the latest per person) of polls starting with prefix: {poll: [{client, ts, value}]}
  async function allAnswers(prefix) {
    const base = 'refs/heads/v/' + SESSION + '/';
    const r = await fetch(API + '/git/matching-refs/heads/v/' + SESSION + '/' + prefix, { headers: headers(), cache: 'no-store' });
    const refs = await r.json(), by = {};
    (Array.isArray(refs) ? refs : []).forEach(x => {
      const rest = x.ref.slice(base.length), cut = rest.lastIndexOf('/');
      const poll = rest.slice(0, cut), parts = rest.slice(cut + 1).split('--');
      if (parts.length < 3) return;
      const raw = parts.slice(2).join('--');
      (by[poll] = by[poll] || []).push({ client: parts[1], ts: Number(parts[0]), value: raw !== '' && isFinite(Number(raw)) ? Number(raw) : raw });
    });
    return by;
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
      if (preClass(poll, ts)) return;
      const k = poll + '|' + client;
      if (!latest[k] || latest[k].ts < ts) latest[k] = { poll: poll, client: client, ts: ts, value: value };
    });
    const by = {};
    Object.values(latest).forEach(x => (by[x.poll] = by[x.poll] || []).push(x));
    return by;
  }

  // slide polls count from 30 minutes before their class on (config.js dates): earlier taps are previews
  // (Kemal, 08.10). Nothing is deleted; the exports still have every answer.
  function preClass(poll, ts) {
    const m = /^(L\d\d)-/.exec(poll), w = m && classWindow(m[1]);
    return !!w && ts < w[0] - 30 * 60000;
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
      if (preClass(poll, ts)) return;
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

  // multi: each answer is a string of letters (A = 1st option, B = 2nd …); bar = share of respondents who ticked it
  function renderMulti(box, data, options) {
    const letters = 'ABCDEFGHIJ';
    const rows = data.responses.map(r => String(r.value)).filter(v => v !== safe(NOIDEA));
    const n = data.responses.length;
    options.forEach((o, i) => box.appendChild(bar(o, rows.filter(v => v.indexOf(letters[i]) >= 0).length, n)));
    const ni = data.responses.length - rows.length;
    box.appendChild(el('div', 'dim small-line', 'n = ' + n + ' · bars = share who ticked it' + (ni ? ' · no idea: ' + ni : '')));
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
    let afterSave = () => {}, sliderVal = null, setSlider = null;

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
    } else if (type === 'slider') {
      // slider (Cevdet, 08.10): starts with no value (no thumb), so an untouched slider is never read as an answer;
      // [save] stores the number (same ref format as number polls). Students see no class results.
      const mn = Number(node.dataset.min || 0), mx = Number(node.dataset.max || 100), st = Number(node.dataset.step || 10);
      const f = el('input', 'slider untouched'); f.type = 'range'; f.min = mn; f.max = mx; f.step = st; f.value = mn;
      const shown = el('span', 'slider-val', '–'), go = el('button', 'btn', 'save');
      setSlider = v => { f.value = v; f.classList.remove('untouched'); shown.textContent = f.value + unit; sliderVal = Number(f.value); };
      f.oninput = () => setSlider(f.value);
      f.addEventListener('keydown', ev => ev.stopPropagation());
      node.setAttribute('data-prevent-swipe', '');
      go.onclick = async () => {
        if (sliderVal === null) { status.textContent = 'move the slider first'; return; }
        status.textContent = '…';
        try { await submit(poll, sliderVal, n => status.textContent = 'busy, retry ' + n + '…'); status.textContent = 'saved_'; afterSave(); }
        catch (e) { status.textContent = 'not saved (offline?)'; }
      };
      input.appendChild(el('span', 'dim slider-end', mn + unit)); input.appendChild(f); input.appendChild(el('span', 'dim slider-end', mx + unit));
      input.appendChild(shown); input.appendChild(go);
    } else if (type === 'multi') {
      const letters = 'ABCDEFGHIJ', picked = new Set();
      options.forEach((o, i) => {
        const b = el('button', 'btn', o);
        b.onclick = () => { if (picked.has(i)) { picked.delete(i); b.classList.remove('chosen'); } else { picked.add(i); b.classList.add('chosen'); } };
        input.appendChild(b);
      });
      const go = el('button', 'btn go', 'submit');
      go.onclick = async () => {
        if (!picked.size) { status.textContent = 'tick at least one (or no idea)'; return; }
        const v = [...picked].sort((a, b) => a - b).map(i => letters[i]).join('');
        status.textContent = '…';
        try { await submit(poll, v, n => status.textContent = 'busy, retry ' + n + '…'); status.textContent = 'saved_'; afterSave(); }
        catch (e) { status.textContent = 'not saved (offline?)'; }
      };
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

    // no [results] button for anyone (Can, 07.10): the only trigger is your own answer; then [refresh] appears.
    const controls = el('div', 'poll-controls');
    const show = el('button', 'btn ghost', 'results');
    const refresh = el('button', 'btn ghost', 'refresh');
    refresh.style.display = 'none';
    controls.appendChild(refresh);
    node.appendChild(controls);

    const out = el('div', 'poll-results');
    node.appendChild(out);

    async function draw() {
      out.innerHTML = '';
      out.appendChild(el('div', 'dim', 'loading…'));
      try {
        const viz = el('div', 'viz');
        if (type === 'slider' && !TEACHER) { out.innerHTML = ''; viz.appendChild(el('div', 'dim small-line', 'your answer: ' + sliderVal + unit + ' · saved')); out.appendChild(viz); return; }
        if (type === 'text') { const c = await textCount(poll); out.innerHTML = ''; viz.appendChild(el('div', 'dim small-line', c.n + ' answers so far (the texts are read after class)')); out.appendChild(viz); return; }
        const data = await results(poll);
        out.innerHTML = '';
        if (type === 'number' || type === 'slider') renderNumber(viz, data, unit, mark);
        else if (type === 'multi') renderMulti(viz, data, options);
        else renderChoice(viz, data, withNoIdea && options.indexOf(NOIDEA) < 0 ? options.concat([NOIDEA]) : options);
        out.appendChild(viz);
        if (TEACHER) {
          const raw = el('details', 'raw');
          raw.appendChild(el('summary', null, 'json'));
          raw.appendChild(el('pre', null, JSON.stringify(data, null, 2)));
          out.appendChild(raw);
        }
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
    // The choice is remembered on this device (micro-voted-<session>-<poll>), so after a reload or the next day
    // the results and the answer stay open without voting again (Can, 08.10).
    const VK = 'micro-voted-' + SESSION + '-' + poll;
    afterSave = () => {
      const c = input.querySelector('.btn.chosen');
      store(VK, type === 'choice' && c ? c.textContent : type === 'slider' ? String(sliderVal) : '1');
      out.classList.add('open'); refresh.style.display = type === 'slider' && !TEACHER ? 'none' : ''; draw();
      // tells the slide that this person has decided (the deck then shows its [show answer] button)
      node.dispatchEvent(new CustomEvent('micropoll:saved', { bubbles: true, detail: { poll: poll } }));
    };
    const prev = load(VK);
    if (prev) {
      input.querySelectorAll('.btn').forEach(b => { if (b.textContent === prev) b.classList.add('chosen'); });
      if (setSlider && isFinite(Number(prev))) setSlider(Number(prev));
      status.textContent = 'answered_';
      out.classList.add('open'); refresh.style.display = type === 'slider' && !TEACHER ? 'none' : '';
      // results are loaded only when the slide is on screen (one call, not one per answered poll at page load)
      let drawn = false;
      const drawIfHere = () => { if (drawn) return; const cur = window.Reveal && Reveal.getCurrentSlide && Reveal.getCurrentSlide(); if (cur && (cur === node.closest('section') || cur.contains(node) || node.closest('section').contains(cur))) { drawn = true; draw(); } };
      if (window.Reveal && Reveal.on) Reveal.on('slidechanged', drawIfHere);
      // the deck may not be ready yet when polls are set up: check again until it is (max ~6 s)
      let tries = 0; const wait = () => { if (window.Reveal && Reveal.isReady && Reveal.isReady()) drawIfHere(); else if (tries++ < 20) setTimeout(wait, 300); }; wait();
      setTimeout(() => node.dispatchEvent(new CustomEvent('micropoll:saved', { bubbles: true, detail: { poll: poll, restored: true } })), 0);
    }
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

  window.MicroPoll = { teacher: TEACHER, submit: submit, results: results, submitText: submitText, textResults: textResults, allResults: allResults, allAnswers: allAnswers, tagRefs: tagRefs, blob: blob, classWindow: classWindow, teacherLogin: teacherLogin, teacherLogout: teacherLogout, safe: safe, hasToken: !!TOKEN, session: SESSION, cid: CID };

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
