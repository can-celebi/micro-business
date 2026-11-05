#!/usr/bin/env node
// Encrypt the attendance overview for the lecturer's slide (Can, 05.11: "ok just the first name"). Temporary: the link comes off after the class.
// Usage: node tools/build_attendance.js <attendance html> <file holding the passphrase> <out.json> "<data note>"
// Goes in: first name (a surname initial only for students who share a first name), the per-lecture marks, attended, and the per-lecture chart.
// Never goes in, not even encrypted: surnames, matrikel numbers, polls, devices, answers, notes. The passphrase is read from the file, never printed,
// and no hash of it is stored. The run stops if a matrikel number or a whole surname would be in the data.
const fs = require('fs'), C = require('crypto').webcrypto;
const [src, phraseFile, out, noteText] = process.argv.slice(2);
if (!src || !phraseFile || !out || !noteText) { console.error('usage: build_attendance.js <html> <phrase file> <out.json> "<data note>"'); process.exit(2); }
const ITER = 2000000;
const strip = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").trim();
(async () => {
  const html = fs.readFileSync(src, 'utf8');
  const table = html.match(/<table.*?<\/table>/s)[0];
  const rows = table.match(/<tr.*?<\/tr>/gs);
  const heads = (rows[0].match(/<th[^>]*>.*?<\/th>/gs) || []).map(strip);
  if (heads[0] !== 'name' || heads[1] !== 'matrikel') throw new Error('unexpected columns');
  const lecCols = heads.map((h, i) => /^L\d\d$/.test(h) ? i : -1).filter(i => i >= 0);
  const att = heads.indexOf('attended');
  if (att < 0 || !lecCols.length) throw new Error('unexpected columns');
  const people = rows.slice(1).map(r => {
    const tds = r.match(/<td[^>]*>.*?<\/td>/gs);
    const raw = strip(tds[0]);
    const m = raw.match(/^(.*?),\s*(.+)$/);
    if (!m) throw new Error('a name that is not "Surname, First"');
    const a = strip(tds[att]).match(/\d+/);
    if (!a) throw new Error('no attended number');
    return { surname: m[1].trim(), first: m[2].trim().split(/\s+/)[0], matrikel: strip(tds[1]), marks: lecCols.map(i => strip(tds[i])), attended: +a[0] };
  });
  const count = {};
  people.forEach(p => { count[p.first] = (count[p.first] || 0) + 1; });
  people.forEach(p => { p.label = count[p.first] > 1 ? p.first + ' ' + p.surname[0] + '.' : p.first; });
  const inClass = p => p.marks.filter(x => x === 'C').length;
  people.sort((a, b) => b.attended - a.attended || inClass(b) - inClass(a) || a.label.localeCompare(b.label));
  const markKinds = {};
  people.forEach(p => p.marks.forEach(x => { markKinds[x || '(empty)'] = (markKinds[x || '(empty)'] || 0) + 1; }));
  console.log('marks in the data:', JSON.stringify(markKinds));
  const chart = (html.match(/<div class="row".*?<\/span><\/div>/gs) || []).join('\n');
  const payload = JSON.stringify({
    note: noteText, lectures: lecCols.map(i => heads[i]),
    rows: people.map(p => ({ n: p.label, m: p.marks, a: p.attended })), chart,
  });
  for (const p of people) {
    if (p.matrikel && payload.includes(p.matrikel)) throw new Error('a matrikel number would be in the data');
    const firsts = new Set(people.map(q => q.first));
    for (const part of p.surname.split(/[\s-]+/)) {
      if (part.length > 2 && !firsts.has(part) && new RegExp('(^|[^\\p{L}])' + part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^\\p{L}]|$)', 'u').test(payload)) throw new Error('a surname would be in the data');
    }
  }
  if (/matrikel|please check|polls|devices/i.test(chart)) throw new Error('unexpected words in the chart');
  const phrase = fs.readFileSync(phraseFile, 'utf8').trim();
  if (!phrase) throw new Error('empty passphrase file');
  const salt = C.getRandomValues(new Uint8Array(16)), iv = C.getRandomValues(new Uint8Array(12));
  const base = await C.subtle.importKey('raw', new TextEncoder().encode(phrase), 'PBKDF2', false, ['deriveKey']);
  const key = await C.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await C.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(payload)));
  const b64 = u => Buffer.from(u).toString('base64');
  fs.writeFileSync(out, JSON.stringify({ salt: b64(salt), iterations: ITER, iv: b64(iv), ct: b64(ct) }) + '\n');
  const dup = people.filter(p => count[p.first] > 1).length, same = new Set(people.map(p => p.label)).size;
  console.log(`rows ${people.length}, lectures ${lecCols.length}, chart rows ${(chart.match(/class="row"/g) || []).length}, students sharing a first name ${dup}, labels still identical ${people.length - same}, payload ${payload.length} bytes`);
})().catch(e => { console.error('stopped:', e.message); process.exit(1); });
