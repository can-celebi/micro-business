// Pulse, class chat and sign-in, the same deck and link for everyone.
//  · desktop (wide screen): a RIGHT SIDEBAR with the pulse (your 1–5 taps + the class over time) and the class chat;
//    » folds it away (remembered), « brings it back. Sign-in sits in the top-right corner.
//  · phone / narrow window: three small buttons top right (◐ pulse · 💬 chat · 👤 me), each opens a panel;
//    panels close when you tap the slide or change slides.
// Sign-in: name + surname + nickname. Others only ever see the nickname. Name and surname are ENCRYPTED on the
// student's device with the public key in config.js (namesKey); only Can's private key (00_admin/keys, never in a
// repo) can read them: tools/names.py. Every answer already carries this device's random id, so after decrypting,
// answers, questions and chat can be credited to students (participation points).
// Teacher mode: press T and type the teacher code (remembered on that device; ?teacher opens the box on phones): chat refresh every 20 s, [answered ✓] on messages,
// pulse refresh every 60 s, poll [results] without voting. Students' screens refresh the chat every 3 min, plus
// on open, on send and on [refresh] (all devices share one GitHub budget of 5,000 calls an hour).
(function () {
  const LEC = document.body.dataset.lecture;
  const MP = window.MicroPoll, CFG = window.MICRO_CONFIG || {};
  if (!LEC || /print-pdf/.test(location.search) || !MP) return;
  const W = window.innerWidth, H = window.innerHeight;
  const WIDE = W >= 900 && !document.documentElement.classList.contains('mobile');
  const ITEMS = [
    { id: 'understand', name: 'understanding', q: 'how well do you understand today\'s concepts?', lo: 'lost', hi: 'got it', col: '#3f7f2e' },
    { id: 'tired', name: 'tiredness', q: 'how tired are you?', lo: 'fresh', hi: 'exhausted', col: '#b8432f' },
    { id: 'pace', name: 'pace', q: 'the pace is …', lo: 'too slow', hi: 'too fast', col: '#2f63a8' },
  ];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hm = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const stop = el => el.addEventListener('keydown', e => e.stopPropagation());
  const slideNo = () => window.Reveal && Reveal.getIndex ? String(Reveal.getIndex().h + 1) : '';

  // Teacher mode: T (or ?teacher in the URL, for phones) opens a code box; the right teacher code switches it on for
  // this device (remembered). In teacher mode, T switches it off again. Students without the code get nothing.
  const codePanel = mk('div', 'pulse-panel side-panel code-panel');
  codePanel.hidden = true; stop(codePanel);
  codePanel.innerHTML = '<h3>&gt; teacher code</h3>';
  const codeIn = mk('input'); codeIn.type = 'password'; codeIn.autocomplete = 'off'; codeIn.placeholder = 'code';
  const codeGo = mk('button', 'btn', 'enter'), codeSt = mk('div', 'st');
  codePanel.appendChild(codeIn); codePanel.appendChild(codeGo); codePanel.appendChild(codeSt);
  document.body.appendChild(codePanel);
  codeGo.onclick = () => { if (MP.teacherLogin(codeIn.value)) location.reload(); else { codeSt.textContent = 'wrong code'; codeIn.value = ''; } };
  codeIn.addEventListener('keydown', e => { if (e.key === 'Enter') codeGo.click(); });
  const askCode = () => { closeAll(); codePanel.hidden = false; codeSt.textContent = ''; setTimeout(() => codeIn.focus(), 30); };
  document.addEventListener('keydown', e => {
    if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey && !/input|textarea/i.test(e.target.tagName)) {
      if (MP.teacher) { MP.teacherLogout(); location.reload(); } else askCode();
    }
  });

  // ---------- me (sign-in) ----------
  let me = {}; try { me = JSON.parse(ls.get('micro-me') || '{}'); } catch (e) {}
  const WHERE_KEY = 'micro-where-' + LEC;
  let where = ls.get(WHERE_KEY) || '';
  // signed in but not yet said where they are today: the button asks
  const meLabel = () => me.nick ? '👤 ' + me.nick + (where ? '' : ' · where?') : '👤 sign in';
  const meSec = mk('div', 'sp-sec me-sec');
  async function encryptName(obj) {
    const der = Uint8Array.from(atob(CFG.namesKey), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    const ct = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(JSON.stringify(obj)));
    return btoa(String.fromCharCode(...new Uint8Array(ct)));
  }
  function drawMe() {
    meSec.innerHTML = '<h3>&gt; who are you?</h3><div class="dim sp-note">others only see your <b>nickname</b>. Your name is encrypted on this device; only the teacher can read it (for participation points).</div>';
    const f = (lab, k, ph) => { const l = mk('label', 'sp-field', '<span>' + lab + '</span>'); const i = mk('input'); i.value = me[k] || ''; i.placeholder = ph; i.maxLength = 40; i.dataset.k = k; stop(i); l.appendChild(i); meSec.appendChild(l); return i; };
    const fn = f('first name', 'name', 'e.g. Lena'), sn = f('surname', 'surname', 'e.g. Huber'), nn = f('nickname', 'nick', 'shown in chat');
    // in class or at home (Can, 07.10): asked every lecture; stored per lecture as poll <LEC>-where (+ in the reg record)
    const wf = mk('div', 'sp-field', '<span>today I\'m …</span>'), ws = mk('div', 'scale');
    const go = mk('button', 'btn', me.nick ? 'update' : 'save'), st = mk('div', 'st');
    ['in class', 'at home'].forEach(v => {
      const b = mk('button', where === v ? 'on' : '', v);
      b.onclick = async () => {
        ws.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        where = v; ls.set(WHERE_KEY, v);
        if (!me.nick) { st.textContent = 'now fill in your names and press save'; return; }
        st.textContent = 'saving…';
        try { await MP.submit(LEC + '-where', v); st.textContent = 'saved_ ' + v; meBtn.textContent = meLabel(); }
        catch (e) { st.textContent = 'not saved (offline?) · try again'; }
      };
      ws.appendChild(b);
    });
    wf.appendChild(ws); meSec.appendChild(wf);
    meSec.appendChild(go); meSec.appendChild(st);
    go.onclick = async () => {
      const rec = { name: fn.value.trim(), surname: sn.value.trim(), nick: nn.value.trim() };
      if (!rec.name || !rec.surname || !rec.nick) { st.textContent = 'please fill in all three'; return; }
      if (!where) { st.textContent = 'please pick: in class or at home'; return; }
      go.disabled = true; st.textContent = 'saving…';
      try {
        const enc = await encryptName({ name: rec.name, surname: rec.surname });
        await MP.submitText('reg', { nick: rec.nick, enc: enc, lecture: LEC, where: where });
        await MP.submit(LEC + '-where', where);
        me = rec; ls.set('micro-me', JSON.stringify(me));
        st.textContent = 'saved_ hi ' + rec.nick; meBtn.textContent = meLabel();
        setTimeout(closeAll, 1200);
      } catch (e) { st.textContent = 'not saved (offline?) · try again'; }
      go.disabled = false;
    };
  }
  drawMe();

  // ---------- pulse ----------
  const pSec = mk('div', 'sp-sec pulse-sec');
  const KEY = 'micro-pulse-' + LEC;
  let mine = {}; try { mine = JSON.parse(ls.get(KEY) || '{}'); } catch (e) {}
  // the three questions fold away (accordion, remembered on this device); the class graph stays visible
  const pHead = mk('h3', 'sp-toggle', '');
  const pQs = mk('div', 'pulse-qs');
  const setQs = open => { pQs.hidden = !open; pHead.innerHTML = (open ? '▾' : '▸') + ' how are you doing? <span class="dim sp-note">' + (open ? 'tap any time' : 'tap to answer') + '</span>'; ls.set('micro-pulse-open', open ? '1' : '0'); };
  pHead.onclick = () => setQs(pQs.hidden);
  pSec.appendChild(pHead); pSec.appendChild(pQs);
  const pst = mk('div', 'st');
  ITEMS.forEach(it => {
    const row = mk('div', 'sp-prow');
    row.appendChild(mk('div', 'q', esc(it.q)));
    const sc = mk('div', 'scale');
    ['1', '2', '3', '4', '5'].forEach(v => {
      const b = mk('button', mine[it.id] === v ? 'on' : '', v);
      b.title = v === '1' ? it.lo : v === '5' ? it.hi : '';
      b.onclick = async () => {
        sc.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        pst.textContent = 'saving…';
        try { await MP.submit(LEC + '-pulse-' + it.id, v); mine[it.id] = v; ls.set(KEY, JSON.stringify(mine)); pst.textContent = 'saved_'; drawClass(); }
        catch (e) { pst.textContent = 'not saved (offline?)'; }
      };
      sc.appendChild(b);
    });
    row.appendChild(sc);
    row.appendChild(mk('div', 'ends', '<span>1 ' + it.lo + '</span><span>5 ' + it.hi + '</span>'));
    pQs.appendChild(row);
  });
  pQs.appendChild(pst);
  setQs(ls.get('micro-pulse-open') !== '0');
  const graph = mk('div', 'pulse-graph');
  const prf = mk('button', 'btn ghost', 'refresh'); prf.onclick = () => drawClass();
  pSec.appendChild(graph); pSec.appendChild(prf);

  let classBusy = false;
  async function drawClass() {
    if (classBusy) return; classBusy = true;
    let all;
    try { all = await MP.allAnswers(LEC + '-pulse-'); } catch (e) { graph.innerHTML = '<div class="dim">could not load</div>'; classBusy = false; return; }
    classBusy = false;
    // class time only (Can, 08.10): taps before 18:30 or after 20:00 of the lecture day are ignored
    const win = MP.classWindow(LEC), inClass = r => !win || (r.ts >= win[0] && r.ts <= win[1]);
    const series = ITEMS.map(it => ({ it: it, rows: (all[LEC + '-pulse-' + it.id] || []).filter(r => isFinite(r.value) && inClass(r)).sort((a, b) => a.ts - b.ts) }));
    const tsAll = series.flatMap(s => s.rows.map(r => r.ts));
    if (!tsAll.length) { graph.innerHTML = '<div class="dim sp-note">the class, over time: ' + (win && Date.now() < win[0] ? 'starts at ' + hm(win[0]) : 'no answers yet') + '</div>'; return; }
    const t0 = win ? win[0] : Math.min(...tsAll), t1 = win ? Math.max(Math.min(Date.now(), win[1]), Math.max(...tsAll)) : Math.max(Date.now(), t0 + 60000), step = Math.max(60000, Math.ceil((t1 - t0) / 40 / 60000) * 60000);
    const GW = 280, GH = 120, L = 18, R = 8, T = 6, B = 16;
    const x = t => L + (GW - L - R) * (t - t0) / (t1 - t0), y = v => T + (GH - T - B) * (5 - v) / 4;
    let svg = `<svg viewBox="0 0 ${GW} ${GH}" width="100%" role="img" aria-label="class pulse over time">`;
    [1, 2, 3, 4, 5].forEach(v => svg += `<line x1="${L}" x2="${GW - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e6e6e1" stroke-width="1"/><text x="${L - 5}" y="${y(v) + 3.5}" font-size="9" text-anchor="end" fill="#888">${v}</text>`);
    svg += `<text x="${L}" y="${GH - 3}" font-size="9" fill="#888">${hm(t0)}</text><text x="${GW - R}" y="${GH - 3}" font-size="9" fill="#888" text-anchor="end">${t1 >= Date.now() - 60000 ? 'now ' : ''}${hm(t1)}</text>`;
    const legend = [];
    series.forEach(s => {
      if (!s.rows.length) return;
      const pts = [];
      const times = []; for (let t = t0; t < t1; t += step) times.push(t); times.push(t1);  // always end exactly at t1
      times.forEach(t => {
        const latest = {}; s.rows.forEach(r => { if (r.ts <= t) latest[r.client] = r.value; });
        const v = Object.values(latest);
        if (v.length) { const m = v.reduce((a, b) => a + b, 0) / v.length; pts.push([x(t), y(m), m, v.length]); }
      });
      if (!pts.length) return;
      const p = pts[pts.length - 1];
      svg += `<polyline points="${pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}" fill="none" stroke="${s.it.col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${s.it.col}" stroke="#fff" stroke-width="1.5"/>`;
      legend.push(`<span><i style="background:${s.it.col}"></i>${s.it.name} <b>${p[2].toFixed(1)}</b></span>`);
    });
    svg += '</svg>';
    graph.innerHTML = '<div class="dim sp-note">the class, over time (n = ' + new Set(series.flatMap(s => s.rows.map(r => r.client))).size + ')</div>' + svg + `<div class="pulse-legend">${legend.join('')}</div>`;
  }

  // ---------- chat ----------
  const cSec = mk('div', 'sp-sec chat-sec');
  cSec.appendChild(mk('h3', null, '&gt; class chat <span class="dim sp-note">questions welcome</span>'));
  const msgs = mk('div', 'chat-msgs');
  const ta = mk('textarea'); ta.rows = 2; ta.maxLength = 400; ta.placeholder = 'what don\'t you understand?'; stop(ta);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send.click(); } });
  const send = mk('button', 'btn', 'send'), crf = mk('button', 'btn ghost', 'refresh'), cst = mk('span', 'st');
  const cbar = mk('div', 'chat-bar'); cbar.appendChild(send); cbar.appendChild(crf); cbar.appendChild(cst);
  cSec.appendChild(msgs); cSec.appendChild(ta); cSec.appendChild(cbar);
  let chat = [], done = new Set(), gone = new Set(), chatBusy = false, firstChat = true;
  const keyOf = m => m.ts + '-' + m.client;
  async function loadChat() {
    if (chatBusy) return; chatBusy = true;
    try {
      const refs = await MP.tagRefs(LEC + '-ask');
      refs.filter(r => r.poll.startsWith(LEC + '-askdone-')).forEach(r => done.add(r.poll.slice((LEC + '-askdone-').length)));
      // hidden by the teacher: a mark <LEC>-askhide-<id>; the message itself stays stored (Can: never delete)
      refs.filter(r => r.poll.startsWith(LEC + '-askhide-')).forEach(r => gone.add(r.poll.slice((LEC + '-askhide-').length)));
      const have = new Set(chat.map(keyOf));
      const live = new Set(refs.map(r => r.ts + '-' + r.client));
      chat = chat.filter(m => live.has(keyOf(m)) && !gone.has(keyOf(m)));
      const fresh = refs.filter(r => r.poll.startsWith(LEC + '-ask-') && !have.has(r.ts + '-' + r.client) && !gone.has(r.ts + '-' + r.client));
      for (let i = 0; i < fresh.length; i += 8) {
        const got = await Promise.all(fresh.slice(i, i + 8).map(r => MP.blob(r.sha).then(j => Object.assign({ ts: r.ts, client: r.client }, j)).catch(() => null)));
        chat.push(...got.filter(m => m && m.text));
      }
      const seen = new Set(); chat = chat.filter(m => { const k = keyOf(m); if (seen.has(k)) return false; seen.add(k); return true; });
      chat.sort((a, b) => a.ts - b.ts);
      drawChat();
    } catch (e) { cst.textContent = 'could not load'; }
    chatBusy = false;
  }
  function drawChat() {
    const atBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 30;
    msgs.innerHTML = chat.length ? chat.map(m => {
      const k = keyOf(m), ans = done.has(k), own = m.client === MP.cid;
      return `<div class="chat-m${ans ? ' done' : ''}${own ? ' own' : ''}"><div class="chat-h"><b>${esc(m.nick || 'anonymous')}</b> <span class="dim">${hm(m.ts)}${m.slide ? ' · slide ' + esc(m.slide) : ''}${ans ? ' · ✓ answered' : ''}</span></div><div>${esc(m.text)}</div>` +
        (MP.teacher ? (ans ? '' : `<button class="btn ghost" data-k="${k}">answered ✓</button>`) + `<button class="btn ghost del" data-d="${k}">hide</button>` : '') + '</div>';
    }).join('') : '<div class="dim sp-note">no messages yet: ask anything</div>';
    msgs.querySelectorAll('button[data-k]').forEach(b => b.onclick = async () => {
      done.add(b.dataset.k); drawChat(); badge();
      try { await MP.submitText(LEC + '-askdone-' + b.dataset.k, { by: 'teacher' }); } catch (e) {}
    });
    // hide: first tap asks, second tap hides the message on every screen (teacher only).
    // Nothing is deleted: the message stays in the data repo, only a hide mark is added (export_text.py still gets it).
    msgs.querySelectorAll('button[data-d]').forEach(b => b.onclick = async () => {
      if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'sure? hide'; return; }
      const m = chat.find(x => keyOf(x) === b.dataset.d); if (!m) return;
      b.textContent = 'hiding…';
      try { await MP.submitText(LEC + '-askhide-' + b.dataset.d, { by: 'teacher' }); gone.add(b.dataset.d); chat = chat.filter(x => x !== m); drawChat(); }
      catch (e) { b.textContent = 'could not hide'; }
    });
    if (atBottom || firstChat) msgs.scrollTop = msgs.scrollHeight;
    firstChat = false; badge();
  }
  function badge() {
    const open = chat.filter(m => !done.has(keyOf(m))).length;
    if (chatBtn) { chatBtn.textContent = MP.teacher && open ? '💬 ' + open : '💬 chat'; chatBtn.classList.toggle('has', MP.teacher && open > 0); }
    const h = cSec.querySelector('h3'); if (h) h.classList.toggle('has', MP.teacher && open > 0);
  }
  send.onclick = async () => {
    const q = ta.value.trim(); if (!q) return;
    if (!me.nick) { cst.textContent = 'please sign in first (👤, top right)'; openMe(); return; }
    send.disabled = true; cst.textContent = 'sending…';
    try {
      await MP.submitText(LEC + '-ask-' + Date.now(), { text: q, nick: me.nick, slide: slideNo() }, n => cst.textContent = 'busy, retry ' + n + '…');
      // no local copy (its time stamp differs from the stored one, so it showed twice): reload from the store
      ta.value = ''; cst.textContent = 'sent_'; await loadChat(); setTimeout(loadChat, 3000);
    } catch (e) { cst.textContent = 'not sent (offline?)'; }
    send.disabled = false;
  };
  crf.onclick = () => loadChat();

  // ---------- layout ----------
  let chatBtn = null, meBtn = mk('button', 'side-btn me-btn', esc(meLabel()));
  const top = mk('div', 'side-btns');
  if (MP.teacher) {
    top.appendChild(mk('span', 'side-mode', 'teacher'));
    // teacher only: the name wheel over the slide (same browser, so a list loaded there once stays there)
    const wBtn = mk('button', 'side-btn wheel-btn', '🎡 names'); wBtn.title = 'name wheel';
    const wBox = mk('div', 'wheel-overlay'); wBox.hidden = true;
    const wClose = mk('button', 'side-btn wheel-close', '✕ back to the slides');
    wBox.appendChild(wClose);
    wBtn.onclick = () => {
      if (!wBox.querySelector('iframe')) { const f = mk('iframe'); f.src = '../../wheel/index.html' + (/[?&]test\b/.test(location.search) ? '?test' : ''); f.title = 'name wheel'; wBox.appendChild(f); }
      wBox.hidden = false;
    };
    wClose.onclick = () => { wBox.hidden = true; };
    document.body.appendChild(wBox); top.appendChild(wBtn);
  }
  const mePanel = mk('div', 'pulse-panel side-panel'); mePanel.hidden = true; mePanel.appendChild(meSec);
  document.body.appendChild(mePanel);
  const panels = [mePanel, codePanel];
  const closeAll = () => panels.forEach(p => p.hidden = true);
  const toggle = (p, onOpen) => { const open = p.hidden; closeAll(); p.hidden = !open; if (open && onOpen) onOpen(); };
  function openMe() { if (mePanel.hidden) toggle(mePanel); }
  meBtn.onclick = () => toggle(mePanel);

  if (WIDE) {
    // right sidebar on desktop; the slides shrink to the remaining width
    const side = mk('aside', 'sidebar');
    const head = mk('div', 'sb-head', '<span>◐ pulse · 💬 chat</span>');
    const fold = mk('button', 'sb-fold', '»'); fold.title = 'fold the sidebar away';
    head.appendChild(fold); side.appendChild(head); side.appendChild(pSec); side.appendChild(cSec);
    const tab = mk('button', 'sb-tab', '«'); tab.title = 'show pulse and chat';
    document.body.appendChild(side); document.body.appendChild(tab);
    const setOpen = open => {
      document.body.classList.toggle('sb-open', open); ls.set('micro-sidebar', open ? '1' : '0');
      if (window.Reveal && Reveal.layout) setTimeout(() => Reveal.layout(), 30);
    };
    fold.onclick = () => setOpen(false); tab.onclick = () => setOpen(true);
    setOpen(ls.get('micro-sidebar') !== '0');
    top.appendChild(meBtn);
  } else {
    // phones: three buttons, one panel at a time
    const pPanel = mk('div', 'pulse-panel side-panel'), cPanel = mk('div', 'pulse-panel side-panel chat-panel');
    pPanel.hidden = cPanel.hidden = true; pPanel.appendChild(pSec); cPanel.appendChild(cSec);
    document.body.appendChild(pPanel); document.body.appendChild(cPanel); panels.push(pPanel, cPanel);
    const pBtn = mk('button', 'side-btn pulse-btn', '◐ pulse'); chatBtn = mk('button', 'side-btn chat-btn', '💬 chat');
    pBtn.onclick = () => toggle(pPanel, drawClass); chatBtn.onclick = () => toggle(cPanel, loadChat);
    top.appendChild(pBtn); top.appendChild(chatBtn); top.appendChild(meBtn);
  }
  document.body.appendChild(top);
  if (/[?&]teacher\b/.test(location.search) && !MP.teacher) askCode();
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.side-panel, .side-btns')) closeAll(); });
  if (window.Reveal) Reveal.on('slidechanged', closeAll);
  panels.forEach(stop);

  // ---------- refresh rhythm (one shared budget: keep students' calls low) ----------
  const visible = () => !document.hidden && (WIDE ? document.body.classList.contains('sb-open') : true);
  if (WIDE) { drawClass(); loadChat(); }
  else if (MP.teacher) loadChat();
  setInterval(() => { if (visible() && (WIDE || MP.teacher)) loadChat(); }, MP.teacher ? 20000 : 180000);
  setInterval(() => { if (visible() && WIDE) drawClass(); }, MP.teacher ? 60000 : 300000);
})();
