// snap.js: one click saves one PNG of the whole screen (Can, 04.11: "the entire windows view so that it also captures what i
// wrote digitially on the screen"). Lecturer only: students never load this file, and it does nothing if loaded anyway.
// The browser's picker appears once per page load; after that the stream stays open and each click saves a picture without asking.
// The picture goes to the browser's download folder first, always. Then, in the background, it is ENCRYPTED on this computer and stored in the
// data repo (Can, 04.11). The repo's token is in public code, so anyone who digs it out can read that repo: without the encryption the
// pictures, which can show chat or names, would be readable. The key comes from the lecturer code, so they open only in teacher mode.
// It can hide only its own button: the browser's "sharing" bar and the deck's other tools appear as they are on screen.
(function () {
  const LOCALTEST = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && /[?&]snaptest\b/.test(location.search);
  if (!((window.MicroPoll && window.MicroPoll.teacher === true) || LOCALTEST)) return;
  const md = navigator.mediaDevices;
  if (!md || !md.getDisplayMedia || !document.querySelector('.reveal') || document.getElementById('snap-box')) return;

  const SETTLE = 350;      // ms between hiding the button and taking the frame, so that the frame no longer shows it
  const FIRST_SETTLE = 800; // the first time, the browser's picker must also have left the screen
  const START_LIMIT = 6000; // ms to wait for the first frame of a new stream

  // The one call that captures. Replaceable, so the checks can run without a screen.
  const api = window.MicroSnap = {
    getStream: () => navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'monitor', cursor: 'never', frameRate: { ideal: 15 } }, audio: false,
    }),
  };

  const style = document.createElement('style');
  style.textContent = `
  /* in the bottom row with the menu and pen buttons, out of the slide's writing area; it moves up only while the pen's toolbar needs that spot */
  #snap-box { position: fixed; left: 214px; bottom: 10px; z-index: 62; display: flex; align-items: center; gap: 8px; font: 13px "Inter", system-ui, sans-serif; }
  html:has(.ink-bar.on) #snap-box { bottom: 44px; }
  @media (max-width: 760px) { #snap-box { display: none; } }
  #snap-btn { font: inherit; background: #fff; color: #333; border: 1.5px solid #bbb; border-radius: 4px; padding: 4px 9px; cursor: pointer; }
  #snap-btn:hover { border-color: #333; }
  #snap-say { position: absolute; left: 0; bottom: 32px; white-space: nowrap; background: #fff; color: #111; border: 1px solid #ddd; border-radius: 4px; padding: 3px 8px; }
  #snap-thumbs { display: flex; gap: 4px; max-width: 34vw; overflow-x: auto; }
  #snap-thumbs:empty { display: none; }
  .snap-th { flex: none; width: 46px; height: 26px; padding: 0; background: #f4f4f1 center / cover no-repeat; color: #333; font: inherit; font-size: 11px; border: 1px solid #bbb; border-radius: 3px; cursor: pointer; }
  .snap-th:hover { border-color: #333; }
  #snap-state { color: #555; font-size: 12px; white-space: nowrap; }
  #snap-state:empty { display: none; }
  #snap-state.bad { color: #B71C1C; }
  #snap-view { position: fixed; inset: 0; z-index: 80; background: rgba(0,0,0,.9); display: flex; align-items: center; justify-content: center; }
  #snap-view img { max-width: 97vw; max-height: 94vh; object-fit: contain; background: #fff; }
  #snap-view p { color: #fff; font: 15px "Inter", system-ui, sans-serif; margin: 0; }
  #snap-close { position: fixed; right: 14px; top: 12px; font: 15px "Inter", system-ui, sans-serif; background: #fff; color: #111; border: 0; border-radius: 4px; padding: 6px 14px; cursor: pointer; }
  #snap-say:empty { display: none; }
  #snap-say.bad { color: #B71C1C; border-color: #B71C1C; }
  html.print-pdf #snap-box { display: none; }`;
  document.head.appendChild(style);

  const box = document.createElement('div'); box.id = 'snap-box';
  const btn = document.createElement('button'); btn.id = 'snap-btn'; btn.type = 'button'; btn.textContent = 'save screen';
  btn.title = 'Save a picture of the whole screen to Downloads';
  const said = document.createElement('span'); said.id = 'snap-say';
  const thumbs = document.createElement('span'); thumbs.id = 'snap-thumbs';
  const stateEl = document.createElement('span'); stateEl.id = 'snap-state';
  box.append(btn, thumbs, stateEl, said);
  document.body.appendChild(box);

  let stream = null, video = null, busy = false, sayTimer = null;
  const nextTick = () => new Promise(r => setTimeout(r, 0));

  // ---------- storing the pictures: everything here runs in the background, and nothing here may ever reach the lecture ----------
  const Store = (function () {
    const cfg = window.MICRO_CONFIG || {}, GH = cfg.github || {}, MP = window.MicroPoll || {};
    let TOKEN = '';
    try { TOKEN = (GH.tokenParts || []).length ? atob(GH.tokenParts.join('')) : ''; } catch (e) {}
    const API = 'https://api.github.com/repos/' + GH.owner + '/' + GH.repo;
    const BRANCH = 'ink';  // its own branch of the data repo: polls and exports don't see it
    const session = MP.session;
    const ROOT = 'ink/' + session + '/' + lecture() + '/';
    const MAX_W = 1920, QUALITY = 0.85, THUMB_W = 160, RETRY = 60000;
    // The test session always uses a fixed test key, so the real code never enters a test. Real pictures need teacher mode and its code.
    let secret = null;
    if (session === 'test') secret = 'local-test-only';
    else if (MP.teacher === true && session) { try { secret = localStorage.getItem('micro-teacher-code'); } catch (e) {} }
    const usable = !!(TOKEN && secret && window.crypto && crypto.subtle);
    const entries = [];  // {sid, base, stamp, url, thumbUrl, thumbTried, queued}
    let keyP = null, draining = null, retryTimer = null, branchOk = false;

    function state(text, bad) { stateEl.textContent = text; stateEl.className = bad ? 'bad' : ''; }
    const heads = extra => Object.assign({ Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json' }, extra || {});
    const enc = t => new TextEncoder().encode(t);

    function key() {
      if (!keyP) keyP = crypto.subtle.importKey('raw', enc(secret), 'PBKDF2', false, ['deriveKey']).then(k => crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc('micro-ink-v1'), iterations: 200000, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']));
      return keyP;
    }
    // A file = 12 bytes of random IV + the encrypted data. Its path is bound in, so a file moved to another slide won't open.
    async function seal(buf, path) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc(path) }, await key(), buf);
      const out = new Uint8Array(12 + ct.byteLength); out.set(iv); out.set(new Uint8Array(ct), 12);
      return out;
    }
    async function open_(buf, path) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(buf.slice(0, 12)), additionalData: enc(path) }, await key(), buf.slice(12));
    }
    function encode(canvas, width, q) {
      const scale = Math.min(1, width / canvas.width);
      const c = document.createElement('canvas');
      c.width = Math.round(canvas.width * scale); c.height = Math.round(canvas.height * scale);
      c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
      return new Promise((res, rej) => c.toBlob(b => {
        if (b && b.type === 'image/webp') return res(b);
        c.toBlob(j => j ? res(j) : rej(new Error('no image')), 'image/jpeg', q);
      }, 'image/webp', q));
    }
    function b64(bytes) {
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(s);
    }

    // The waiting line survives a reload (IndexedDB). It holds only encrypted files. Without IndexedDB it lives in memory, and the download is still there.
    let dbP = null; const memQ = new Map();
    function db() {
      if (!dbP) dbP = new Promise(res => {
        try {
          const r = indexedDB.open('micro-snap', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('queue', { keyPath: 'base' });
          r.onsuccess = () => res(r.result);
          r.onerror = () => res(null);
          r.onblocked = () => res(null);
        } catch (e) { res(null); }
      });
      return dbP;
    }
    function tx(mode, fn) {
      return db().then(d => d ? new Promise((res, rej) => {
        const t = d.transaction('queue', mode), r = fn(t.objectStore('queue'));
        t.oncomplete = () => res(r && r.result);
        t.onerror = t.onabort = () => rej(t.error);
      }) : null);
    }
    const qPut = it => tx('readwrite', o => o.put(it)).catch(() => null).then(v => { memQ.set(it.base, it); return v; });
    const qDel = base => { memQ.delete(base); return tx('readwrite', o => o.delete(base)).catch(() => null); };
    const qAll = () => tx('readonly', o => o.getAll()).catch(() => null);

    async function ensureBranch() {
      if (branchOk) return;
      const r = await fetch(API + '/git/ref/heads/' + BRANCH, { headers: heads(), cache: 'no-store' });
      if (r.ok) { branchOk = true; return; }
      if (r.status !== 404) throw new Error('branch ' + r.status);
      const main = await fetch(API + '/git/ref/heads/main', { headers: heads(), cache: 'no-store' });
      if (!main.ok) throw new Error('main ' + main.status);
      const sha = (await main.json()).object.sha;
      const c = await fetch(API + '/git/refs', { method: 'POST', headers: heads(), body: JSON.stringify({ ref: 'refs/heads/' + BRANCH, sha }) });
      if (!c.ok && c.status !== 422) throw new Error('create ' + c.status);  // 422: it exists by now
      branchOk = true;
    }
    async function putFile(path, bytes) {
      const r = await fetch(API + '/contents/' + path, { method: 'PUT', headers: heads(), body: JSON.stringify({ message: 'picture', content: b64(bytes), branch: BRANCH }) });
      if (r.ok) return;
      if (r.status === 422) {  // already there: an earlier try worked but its answer was lost
        const c = await fetch(API + '/contents/' + path + '?ref=' + BRANCH, { method: 'HEAD', headers: heads(), cache: 'no-store' });
        if (c.ok) return;
      }
      throw new Error('put ' + r.status);
    }
    async function drain() {
      for (const it of [...memQ.values()]) {
        state('storing…');
        await ensureBranch();
        await putFile(it.base + '.pic', new Uint8Array(it.pic));
        await putFile(it.base + '.thumb', new Uint8Array(it.thumb));
        await qDel(it.base);
        const e = entries.find(x => x.base === it.base);
        if (e) e.queued = false;
      }
    }
    function kick() {
      if (!usable) return Promise.resolve();
      if (draining) return draining;
      clearTimeout(retryTimer);
      if (!memQ.size) return Promise.resolve();
      draining = drain().then(() => {
        draining = null;
        if (memQ.size) return kick();
        state('stored');
        setTimeout(() => { if (stateEl.textContent === 'stored') state(''); }, 5000);
      }, () => {
        draining = null;
        state('not stored yet (' + memQ.size + '): will retry; the download is safe', true);
        retryTimer = setTimeout(kick, RETRY);
      });
      return draining;
    }

    function render() {
      const sid = slideId();
      thumbs.textContent = '';
      entries.filter(e => e.sid === sid).sort((a, b) => a.stamp < b.stamp ? -1 : 1).forEach((e, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'snap-th'; b.title = 'Open the picture of ' + when(e.stamp);
        if (e.thumbUrl) b.style.backgroundImage = 'url("' + e.thumbUrl + '")'; else b.textContent = String(i + 1);
        b.addEventListener('click', ev => { ev.stopPropagation(); b.blur(); view(e); });
        thumbs.appendChild(b);
        if (!e.thumbUrl && !e.thumbTried) { e.thumbTried = true; loadThumb(e).catch(() => {}); }
      });
    }
    const when = st => st.slice(9, 11) + ':' + st.slice(11, 13) + ':' + st.slice(13, 15);
    async function fetchOpen(path) {
      const r = await fetch(API + '/contents/' + path + '?ref=' + BRANCH, { headers: heads({ Accept: 'application/vnd.github.raw+json' }), cache: 'no-store' });
      if (!r.ok) throw new Error('get ' + r.status);
      return open_(await r.arrayBuffer(), path);
    }
    async function loadThumb(e) {
      const q = memQ.get(e.base);
      const buf = q ? await open_(q.thumb, e.base + '.thumb') : await fetchOpen(e.base + '.thumb');
      e.thumbUrl = URL.createObjectURL(new Blob([buf], { type: 'image/webp' }));
      render();
    }

    // the large view: closes with its button, a click beside the picture or Esc, and the deck is where it was
    let viewer = null;
    function closeView() {
      if (!viewer) return;
      viewer.remove(); viewer = null;
      document.removeEventListener('keydown', viewKeys, true);
    }
    function viewKeys(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeView(); return; }
      if (e.key === 't' || e.key === 'T') { closeView(); return; }  // T is the lecturer login: it passes untouched, and its box mustn't open behind this view
      if (/^(Arrow|Page|Home$|End$| $)/.test(e.key)) { e.preventDefault(); e.stopPropagation(); }  // the slide stays where it was; every other key, T included, passes
    }
    async function view(e) {
      closeView();
      const v = viewer = document.createElement('div'); v.id = 'snap-view';
      const close_ = document.createElement('button'); close_.id = 'snap-close'; close_.type = 'button'; close_.textContent = 'close';
      close_.addEventListener('click', ev => { ev.stopPropagation(); closeView(); });
      const msg = document.createElement('p'); msg.textContent = 'opening…';
      v.append(msg, close_);
      ['pointerdown', 'mousedown', 'touchstart'].forEach(t => v.addEventListener(t, ev => ev.stopPropagation()));
      v.addEventListener('click', ev => { ev.stopPropagation(); if (ev.target === v) closeView(); });
      document.body.appendChild(v);
      document.addEventListener('keydown', viewKeys, true);
      try {
        if (!e.url) {
          const q = memQ.get(e.base);
          const buf = q ? await open_(q.pic, e.base + '.pic') : await fetchOpen(e.base + '.pic');
          e.url = URL.createObjectURL(new Blob([buf], { type: 'image/webp' }));
        }
        if (viewer !== v) return;
        const img = document.createElement('img'); img.alt = 'Picture of the screen, ' + when(e.stamp); img.src = e.url;
        msg.replaceWith(img);
      } catch (err) {
        if (viewer === v) msg.textContent = 'This picture could not be opened here. The copy in Downloads is not affected.';
      }
    }

    async function keep(canvas, sid) {
      if (!usable) { if (session !== 'test' && MP.teacher === true) state('not stored: no key here; the download is safe', true); return; }
      try {
        state('storing…');
        await nextTick();  // the click has finished; the deck goes first
        const d = new Date(), p = x => String(x).padStart(2, '0');
        const stamp = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
        const base = ROOT + sid + '/' + stamp + '-' + Math.random().toString(36).slice(2, 6);
        const [pic, thumb] = await Promise.all([encode(canvas, MAX_W, QUALITY), encode(canvas, THUMB_W, 0.6)]);
        const e = { sid, base, stamp, url: URL.createObjectURL(pic), thumbUrl: URL.createObjectURL(thumb), queued: true, picBytes: pic.size };
        entries.push(e); render();
        const [sp, st] = await Promise.all([pic.arrayBuffer().then(b => seal(b, base + '.pic')), thumb.arrayBuffer().then(b => seal(b, base + '.thumb'))]);
        await qPut({ base, sid, stamp, pic: sp.buffer, thumb: st.buffer });
        kick();
      } catch (err) {
        state('not stored; the download is safe', true);
      }
    }
    async function start() {
      if (!usable) return;
      try { (await qAll() || []).forEach(it => { memQ.set(it.base, it); if (!entries.some(e => e.base === it.base)) entries.push({ sid: it.sid, base: it.base, stamp: it.stamp, queued: true }); }); } catch (e) {}
      render();
      kick();
      try {
        const r = await fetch(API + '/git/trees/' + BRANCH + '?recursive=1', { headers: heads(), cache: 'no-store' });
        if (!r.ok) return;
        branchOk = true;
        ((await r.json()).tree || []).forEach(t => {
          if (t.type !== 'blob' || !t.path.startsWith(ROOT) || !t.path.endsWith('.pic')) return;
          const base = t.path.slice(0, -4), parts = base.slice(ROOT.length).split('/');
          if (parts.length === 2 && !entries.some(e => e.base === base)) entries.push({ sid: parts[0], base, stamp: parts[1] });
        });
        render();
      } catch (e) {}
    }
    return { keep, start, render, idle: () => draining || Promise.resolve(), pending: () => memQ.size, entries };
  })();

  function say(text, bad) {
    clearTimeout(sayTimer);
    said.textContent = text;
    said.className = bad ? 'bad' : '';
    if (text) sayTimer = setTimeout(() => { said.textContent = ''; }, bad ? 12000 : 6000);
  }
  function close(s, v) {  // always safe to call, and leaves nothing running
    s = s || stream; v = v || video;
    if (s) s.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
    if (v) { try { v.pause(); } catch (e) {} v.srcObject = null; v.remove(); }
    if (s === stream) { stream = null; video = null; }
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // Is this the whole screen? The browser usually says so; if it doesn't, compare the shape with the screen's (a window of the
  // same shape as the screen can't be told apart this way).
  function isWholeScreen(track, v) {
    const set = track.getSettings ? track.getSettings() : {};
    if (set.displaySurface) return set.displaySurface === 'monitor';
    const w = screen.width, h = screen.height;
    if (!w || !h || !v.videoWidth || !v.videoHeight) return false;
    return Math.abs(v.videoWidth / v.videoHeight - w / h) < 0.02 * (w / h);
  }

  async function open() {
    let s;
    try {
      s = await api.getStream();
    } catch (e) {
      const cancelled = e && (e.name === 'NotAllowedError' || e.name === 'AbortError');
      say(cancelled ? 'No picture saved: screen sharing was cancelled or not allowed.' : 'No picture saved: this browser could not share the screen (' + ((e && e.name) || 'error') + ').', true);
      return false;
    }
    const track = s && s.getVideoTracks && s.getVideoTracks()[0];
    if (!track) { if (s && s.getTracks) close(s); say('No picture saved: the browser gave no screen picture.', true); return false; }
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.srcObject = s;
    v.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';  // in the page, so that the browser keeps it running
    v.setAttribute('aria-hidden', 'true');
    document.body.appendChild(v);
    const started = await Promise.race([v.play().then(() => true, () => false), wait(START_LIMIT).then(() => false)]);
    if (!started || !v.videoWidth) {
      if (started) await wait(300);
      if (!started || !v.videoWidth) { close(s, v); say('No picture saved: the screen picture did not start. Click again to retry.', true); return false; }
    }
    if (!isWholeScreen(track, v)) {
      close(s, v);
      say('No picture saved: pick Entire screen.', true);  // a window or tab can't show the pen app's layer on top of the browser
      return false;
    }
    track.addEventListener('ended', () => {  // "Stop sharing" in the browser: the next click asks again
      if (s === stream) { close(s, v); say('Screen sharing stopped: the next click asks again.'); }
    });
    stream = s; video = v;
    return true;
  }

  function lecture() {
    const m = location.pathname.match(/lectures\/([^/]+)/);
    return m ? m[1].replace(/[^A-Za-z0-9-]/g, '') : 'deck';
  }
  function slideId() {  // the slide's stable id, so that a picture stays with its slide when slides are added or moved
    const R = window.Reveal;
    try {
      const c = R.getCurrentSlide();
      const sid = c && (c.dataset.sid || (c.closest('section[data-sid]') || { dataset: {} }).dataset.sid);
      if (sid) return String(sid).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60);
      const i = R.getIndices();
      return 'h' + i.h + '-v' + (i.v || 0);
    } catch (e) { return 'unknown'; }
  }

  function fileName() {
    const lec = lecture();
    const R = window.Reveal;
    let n = '';
    try { n = R && R.getSlidePastCount ? String(R.getSlidePastCount() + 1) : ''; } catch (e) {}
    const d = new Date(), p = x => String(x).padStart(2, '0');
    const when = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds());
    return lec + (n ? '_slide' + n : '') + '_' + when + '.png';
  }

  function grab(name) {
    return new Promise((resolve, reject) => {
      const c = document.createElement('canvas');
      c.width = video.videoWidth; c.height = video.videoHeight;
      if (!c.width || !c.height) return reject(new Error('no frame'));
      c.getContext('2d').drawImage(video, 0, 0);
      c.toBlob(blob => {
        if (!blob) return reject(new Error('no image'));
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; a.style.display = 'none';
        a.addEventListener('click', e => e.stopPropagation());  // the deck shouldn't see this click
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        resolve(c);
      }, 'image/png');
    });
  }

  async function shoot() {
    if (busy) return;
    busy = true;
    say('');
    try {
      if (stream && !stream.getVideoTracks().some(t => t.readyState === 'live')) close();  // sharing stopped without an "ended" event
      const first = !stream;
      if (first && !(await open())) return;
      const name = fileName(), sid = slideId();  // the slide as it was at the click
      box.style.visibility = 'hidden';
      await wait(first ? FIRST_SETTLE : SETTLE);
      if (stream && !stream.getVideoTracks().some(t => t.readyState === 'live')) close();  // stopped during the wait: the last frame would be stale
      if (!stream) { say('No picture saved: screen sharing stopped. Click again.', true); return; }
      const canvas = await grab(name);
      say('Saved to Downloads: ' + name);
      Store.keep(canvas, sid);  // in the background; it can't fail this click
    } catch (e) {
      close();
      say('No picture saved. Click again: it will ask for the screen once more.', true);
    } finally {
      box.style.visibility = '';
      busy = false;
    }
  }

  // No keyboard shortcut, and keys pass through untouched: T is the lecturer login (Can, 04.11)
  ['pointerdown', 'mousedown', 'touchstart'].forEach(t => box.addEventListener(t, e => e.stopPropagation()));
  btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); btn.blur(); shoot(); });
  api.store = Store;  // for the checks
  try { ['slidechanged', 'ready'].forEach(t => window.Reveal.on(t, () => Store.render())); } catch (e) {}
  Store.start().catch(() => {});
  window.addEventListener('pagehide', () => close());
})();
