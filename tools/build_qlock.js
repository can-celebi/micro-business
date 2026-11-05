#!/usr/bin/env node
// Encrypt a lecture's question cards into the public file lectures/<Lxx>/locked.json, read by assets/js/qlock.js.
// Usage: node tools/build_qlock.js <cards.json> <Lxx> <file holding the lecturer code> [--out path]
// The cards and the code stay local. The code is read from the file, never printed, and isn't in the output.
// Each question gets its own random key. Question 1's key is in the file (it's open from the start). The rest, and all solutions and pictures,
// are only readable with the lecturer code. The run stops if any plain text of a card would be in the output.
const fs = require('fs'), path = require('path');
const { webcrypto: { subtle, getRandomValues } } = require('crypto');
const crypto = require('crypto').webcrypto;
const [cardsPath, lec, codePath] = process.argv.slice(2);
if (!cardsPath || !/^L\d{2}$/.test(lec || '') || !codePath) { console.error('usage: build_qlock.js <cards.json> <Lxx> <code file> [--out path]'); process.exit(2); }
const outArg = process.argv.indexOf('--out');
const out = outArg > 0 ? process.argv[outArg + 1] : path.join(__dirname, '..', 'lectures', lec, 'locked.json');
const b64 = u => Buffer.from(u).toString('base64');
const seal = async (key, text) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { iv: b64(iv), ct: b64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, typeof text === 'string' ? new TextEncoder().encode(text) : text))) };
};
(async () => {
  const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8')).cards;
  const code = fs.readFileSync(codePath, 'utf8').trim();
  if (!code) throw new Error('empty code file');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iterations = 200000;
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
  const tKey = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  let firstKey = null;
  const questions = [];
  const plain = [];
  for (const c of cards) {
    const raw = crypto.getRandomValues(new Uint8Array(16));
    if (c.question === 1) firstKey = b64(raw);
    const qKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
    const student = { parts: c.parts.map(p => ({ n: p.part, utility: p.student.utility, budget: p.student.budget })) };
    const teacher = { parts: c.parts.map(p => ({ n: p.part, caption: p.teacher.caption, solution: p.teacher.solution, picture: p.teacher.picture, picture_note: p.teacher.picture_note })) };
    questions.push({ student: await seal(qKey, JSON.stringify(student)), keyForTeacher: await seal(tKey, raw), teacher: await seal(tKey, JSON.stringify(teacher)) });
    c.parts.forEach(p => plain.push(p.student.utility, p.student.budget, p.teacher.solution, p.teacher.picture));
  }
  const text = JSON.stringify({ lecture: lec, salt: b64(salt), iterations, firstKey, questions });
  if (text.includes(code)) throw new Error('the code would be in the output');
  for (const s of plain) if (s && s.length > 12 && text.includes(s)) throw new Error('plain card text would be in the output');
  if (/<math|<svg|Answer/.test(text)) throw new Error('plain markup would be in the output');
  fs.writeFileSync(out, text + '\n');
  console.log(out.split('/').slice(-3).join('/') + ':', questions.length, 'questions,', cards.reduce((a, c) => a + c.parts.length, 0), 'parts,', Math.round(text.length / 1024), 'KB');
})().catch(e => { console.error('stopped:', e.message); process.exit(1); });
