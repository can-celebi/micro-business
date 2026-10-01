// Interactive pieces for the slides: live polls and personalise-prompt boxes.
//
// Poll markup:
//   <div class="poll" data-poll="L01-c2-subscribe" data-type="choice" data-options="yes,no"></div>
//   <div class="poll" data-poll="L01-c3-resprice" data-type="number" data-unit="€" data-mark="20"></div>
// Prompt markup:
//   <details class="prompt"><summary>personalise</summary><pre>…prompt…</pre></details>
(function () {
  const cfg = window.MICRO_CONFIG || {};
  const ENDPOINT = cfg.pollEndpoint || '';
  const SESSION = cfg.session || '';

  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  let CID = load('micro-cid');
  if (!CID) {
    CID = Math.random().toString(36).slice(2) + Date.now().toString(36);
    store('micro-cid', CID);
  }

  async function submit(poll, value) {
    const payload = { poll: poll, value: value, client: CID, session: SESSION };
    if (!ENDPOINT) {
      const all = JSON.parse(load('micro-poll-' + poll) || '{}');
      all[CID] = { value: value, time: new Date().toISOString() };
      store('micro-poll-' + poll, JSON.stringify(all));
      return;
    }
    // text/plain avoids a CORS preflight; Apps Script still receives the body
    await fetch(ENDPOINT, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  }

  async function results(poll) {
    if (!ENDPOINT) {
      const all = JSON.parse(load('micro-poll-' + poll) || '{}');
      const responses = Object.values(all);
      return { poll: poll, mode: 'local demo (no endpoint)', n: responses.length, responses: responses };
    }
    const url = ENDPOINT + '?poll=' + encodeURIComponent(poll) +
      '&session=' + encodeURIComponent(SESSION) + '&_=' + Date.now();
    const r = await fetch(url);
    return r.json();
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function bar(label, value, max, cls) {
    const row = el('div', 'bar-row');
    row.appendChild(el('span', 'bar-label', label));
    const track = el('span', 'bar-track');
    const fill = el('span', 'bar-fill ' + (cls || ''));
    fill.style.width = (max > 0 ? (100 * value / max) : 0) + '%';
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('span', 'bar-n', String(value)));
    return row;
  }

  function renderChoice(box, data, options) {
    const counts = {};
    options.forEach(o => counts[o] = 0);
    data.responses.forEach(r => { if (r.value in counts) counts[r.value]++; });
    const max = Math.max(1, ...Object.values(counts));
    options.forEach(o => box.appendChild(bar(o, counts[o], max)));
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
        try { await submit(poll, Number(f.value)); status.textContent = 'saved_'; }
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
          try { await submit(poll, o); status.textContent = 'saved_'; }
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

  function init() {
    document.querySelectorAll('.poll').forEach(initPoll);
    document.querySelectorAll('details.prompt').forEach(initPrompt);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
