// snap.js: one click saves one PNG of the whole screen (Can, 04.11: "the entire windows view so that it also captures what i
// wrote digitially on the screen"). Lecturer only: students never load this file, and it does nothing if loaded anyway.
// The browser's picker appears once per page load; after that the stream stays open and each click saves a picture without asking.
// The picture goes to the browser's download folder and nowhere else: this file makes no network call (the screen can show chat or names).
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
  #snap-say { background: #fff; color: #111; border: 1px solid #ddd; border-radius: 4px; padding: 3px 8px; max-width: 46vw; }
  #snap-say:empty { display: none; }
  #snap-say.bad { color: #B71C1C; border-color: #B71C1C; }
  html.print-pdf #snap-box { display: none; }`;
  document.head.appendChild(style);

  const box = document.createElement('div'); box.id = 'snap-box';
  const btn = document.createElement('button'); btn.id = 'snap-btn'; btn.type = 'button'; btn.textContent = 'save screen';
  btn.title = 'Save a picture of the whole screen to Downloads';
  const said = document.createElement('span'); said.id = 'snap-say';
  box.append(btn, said);
  document.body.appendChild(box);

  let stream = null, video = null, busy = false, sayTimer = null;

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

  function fileName() {
    const m = location.pathname.match(/lectures\/([^/]+)/);
    const lec = m ? m[1].replace(/[^A-Za-z0-9-]/g, '') : 'deck';
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
        resolve();
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
      const name = fileName();  // the slide as it was at the click
      box.style.visibility = 'hidden';
      await wait(first ? FIRST_SETTLE : SETTLE);
      if (!stream) { say('No picture saved: screen sharing stopped. Click again.', true); return; }
      await grab(name);
      say('Saved to Downloads: ' + name);
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
  window.addEventListener('pagehide', () => close());
})();
