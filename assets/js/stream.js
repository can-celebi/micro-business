// Live-stream link with a "live now" badge (Can, 08.10). Fills every <span class="stream-link"></span> on the page.
// "Live" is the schedule, not a check of the stream: lecture days from config.js (lectures) between classTime
// (18:30–20:00, Vienna time). Outside it: the next lecture's start. Needs config.js (window.MICRO_CONFIG).
(function () {
  const cfg = window.MICRO_CONFIG || {}, URL = cfg.stream;
  if (!URL) return;
  const tt = cfg.classTime || ['18:30', '20:00'];
  const vienna = (day, hhmm) => {
    const [y, mo, d] = day.split('-').map(Number), [h, mi] = hhmm.split(':').map(Number), guess = Date.UTC(y, mo - 1, d, h, mi), p = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(guess)).forEach(x => p[x.type] = Number(x.value));
    return guess - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - guess);
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function render() {
    const now = Date.now(), days = Object.values(cfg.lectures || {});
    const live = days.some(d => now >= vienna(d, tt[0]) && now <= vienna(d, tt[1]));
    const next = days.map(d => vienna(d, tt[0])).filter(t => t > now).sort((a, b) => a - b)[0];
    const part = (t, o) => new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: 'Europe/Vienna' }, o)).format(new Date(t));
    const nx = next ? part(next, { weekday: 'short' }) + ' ' + part(next, { day: '2-digit' }) + '.' + part(next, { month: '2-digit' }) + ', ' + tt[0] : '';
    document.querySelectorAll('.stream-link').forEach(el => {
      el.innerHTML = live
        ? `<a class="stream-live" href="${esc(URL)}" target="_blank" rel="noopener">● live now (${tt[0]}–${tt[1]})</a>`
        : `<a href="${esc(URL)}" target="_blank" rel="noopener">live stream</a><span class="dim"> · ${nx ? 'next: ' + nx : 'Wed &amp; Thu ' + tt[0] + '–' + tt[1]}</span>`;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
  setInterval(render, 60000);
})();
