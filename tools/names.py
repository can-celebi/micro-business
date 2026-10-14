#!/usr/bin/env python3
"""Who is who, and who took part: decrypts the sign-ins and counts each student's activity.

    python tools/names.py ws26            # the real class
    python tools/names.py test            # rehearsals

Students sign in on the slides (👤): nickname in clear, name + surname encrypted on their device with the
public key in assets/js/config.js. Only the private key (MICRO-CAN/00_admin/keys/micro-names-private.pem,
never in a repo) can read them. Every answer carries the device id, so activity can be credited.

Writes MICRO-CAN/06_moodle/participation_<session>.csv (outside the public site repo: it holds real names), one row
per student, and participation_<session>_log.csv: every single answer with its time (Vienna) and whether it was made
in class time (lecture day, 18:00–20:15), before or after class, or on another day (Can, 14.10: participation points
must show if buttons were clicked after class).
If the u:space list (List of participants_….csv) is in MICRO-CAN/ or 06_moodle/, each sign-in is matched to the
official name + matriculation number (exact / close: check / not on the list).
"""
import base64, csv, json, os, re, sys, urllib.request
from collections import defaultdict
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ROOT = os.environ.get('MICRO_ROOT') or os.path.dirname(SITE)  # MICRO-CAN (MICRO_ROOT: when run from a copy of the site)
KEY = os.path.join(ROOT, '00_admin', 'keys', 'micro-names-private.pem')
OUT = os.path.join(ROOT, '06_moodle')
# real names never inside a repo (Murat, 14.10): run from a worktree copy without MICRO_ROOT, OUT would sit in the site folder
def _in_repo(path):
    d = os.path.abspath(path)
    while d != os.path.dirname(d):
        if os.path.exists(os.path.join(d, '.git')):
            return d
        d = os.path.dirname(d)
    return None
if _in_repo(OUT):
    sys.exit(f'refusing to write real names inside the repo {_in_repo(OUT)}: set MICRO_ROOT=<MICRO-CAN folder>')

cfg = open(os.path.join(SITE, 'assets', 'js', 'config.js')).read()
owner = re.search(r'owner:\s*"([^"]+)"', cfg).group(1)
repo = re.search(r'repo:\s*"([^"]+)"', cfg).group(1)
parts = re.findall(r'"([^"]+)"', re.search(r'tokenParts:\s*\[([^\]]*)\]', cfg).group(1))
TOKEN = base64.b64decode(''.join(parts)).decode()
API = f'https://api.github.com/repos/{owner}/{repo}'

# Which lecture a tap counts for (a reused slide keeps its old id, e.g. L02-m5-split60 sits only in the L03 deck):
# 1. the id is in exactly one deck → that deck; 2. several decks → the one whose class window (Vienna time, ± 30 min,
# from config.js) the tap falls in; 3. otherwise the id prefix.
import glob
from datetime import datetime
from zoneinfo import ZoneInfo
DAYS = {d: l for l, d in re.findall(r'(L\d+):\s*"(\d{4}-\d\d-\d\d)"', cfg)}
T0, T1 = (int(h) * 60 + int(m) for h, m in re.findall(r'(\d\d):(\d\d)', re.search(r'classTime:[^\]]*', cfg).group(0)))
DECKS = defaultdict(set)  # poll id -> lectures whose deck contains it
for f in glob.glob(os.path.join(SITE, 'lectures', 'L*', 'index.html')):
    for pid in set(re.findall(r'data-poll="([^"]+)"', open(f).read())):
        DECKS[pid].add(os.path.basename(os.path.dirname(f)))


def lecture(poll, ts):
    decks = DECKS.get(poll, set())
    if len(decks) == 1:
        return next(iter(decks))
    t = datetime.fromtimestamp(int(ts) / (1000 if int(ts) > 1e11 else 1), ZoneInfo('Europe/Vienna'))
    lec = DAYS.get(t.strftime('%Y-%m-%d'))
    if lec and (not decks or lec in decks) and T0 - 30 <= t.hour * 60 + t.minute <= T1 + 30:
        return lec
    return poll.split('-')[0]


def when(lec, ts):
    """Vienna time of a tap and where it falls: 'in class time' (its lecture's day, class start − 30 min … end + 15 min),
    'before class', 'after class' (same day) or 'other day'."""
    t = datetime.fromtimestamp(int(ts) / (1000 if int(ts) > 1e11 else 1), ZoneInfo('Europe/Vienna'))
    day = {l: d for d, l in DAYS.items()}.get(lec)
    m = t.hour * 60 + t.minute
    if day != t.strftime('%Y-%m-%d'):
        tag = 'other day'
    elif m < T0 - 30:
        tag = 'before class'
    elif m > T1 + 15:
        tag = 'after class'
    else:
        tag = 'in class time'
    return t.strftime('%Y-%m-%d %H:%M:%S'), tag


def get(url):
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + TOKEN, 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def refs(kind, session):
    out = get(f'{API}/git/matching-refs/{kind}/{"v" if kind == "heads" else "t"}/{session}/')
    return out if isinstance(out, list) else []


def roster():
    """The official u:space list (List of participants_….csv in MICRO-CAN/ or 06_moodle/): [(first, last, matrikel)]."""
    import glob, unicodedata
    files = sorted(glob.glob(os.path.join(ROOT, 'List of participants_*.csv')) + glob.glob(os.path.join(OUT, 'List of participants_*.csv')), key=os.path.getmtime)
    if not files:
        return []
    out = []
    for line in open(files[-1], encoding='utf-8-sig').read().splitlines():
        c = line.split('\t')
        if len(c) >= 2 and c[0].strip().isdigit():
            p = [s.strip() for s in c[1].split(',')]
            if len(p) >= 3:
                out.append((p[1], p[0], p[2]))
    return out


def norm(s):
    import unicodedata
    s = unicodedata.normalize('NFKD', s.lower())
    return ' '.join(''.join(ch for ch in s if ch.isalpha() or ch == ' ').split())


def match(first, last, ros):
    """Best official name for a typed sign-in: exact, else close (typos, swapped order, missing middle names)."""
    import difflib
    if not ros or not (first or last):
        return None, ''
    typed = norm(first + ' ' + last)
    best, score = None, 0
    for r in ros:
        for cand in (norm(r[0] + ' ' + r[1]), norm(r[1] + ' ' + r[0])):
            s = difflib.SequenceMatcher(None, typed, cand).ratio()
            if norm(last) and norm(last) in cand.split() and norm(first).split()[:1] and norm(first).split()[0] in cand.split():
                s = max(s, 0.95)
            if s > score:
                best, score = r, s
    if score >= 0.99:
        return best, 'exact'
    if score >= 0.8:
        return best, 'close: check'
    return None, 'not on the list'


def main():
    session = sys.argv[1] if len(sys.argv) > 1 else 'ws26'
    key = serialization.load_pem_private_key(open(KEY, 'rb').read(), password=None)
    who = {}
    acts = defaultdict(lambda: defaultdict(int))  # client -> kind -> count
    lects = defaultdict(set)
    present = defaultdict(set)  # student device -> days marked 'here' on the wheel
    where = defaultdict(dict)   # student device -> {lecture: (ts, 'in class' | 'at home')}
    log = []                    # every student answer: (device, lecture, kind, poll, ts, value)
    inclass = defaultdict(lambda: [0, 0])  # device -> [polls first answered in class time, polls first answered outside]
    base_t = f'refs/tags/t/{session}/'
    for r in refs('tags', session):
        rest = r['ref'][len(base_t):]
        poll, last = rest.rsplit('/', 1)
        ts, client = last.split('--')[:2]
        lec = lecture(poll, ts)
        if poll == 'reg':
            blob = get(f'{API}/git/blobs/{r["object"]["sha"]}')
            rec = json.loads(base64.b64decode(blob['content']))
            try:
                plain = json.loads(key.decrypt(base64.b64decode(rec['enc']), padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None)))
            except Exception:
                plain = {'name': '?', 'surname': '?'}
            if client not in who or who[client]['ts'] < int(ts):
                who[client] = {'ts': int(ts), 'name': plain.get('name', ''), 'surname': plain.get('surname', ''), 'nick': rec.get('nick', '')}
            continue
        if poll.startswith('att-'):
            sid = poll[len('att-'):]  # YYYY-MM-DD-<student device id>
            day, stud = sid[:10], sid[11:]
            blob = get(f'{API}/git/blobs/{r["object"]["sha"]}')
            if json.loads(base64.b64decode(blob['content'])).get('status') == 'here':
                present[stud].add(day)
            continue
        kind = 'chat' if '-ask-' in poll else 'askdone' if '-askdone-' in poll else 'askhide' if '-askhide-' in poll else 'own words' if '-ow-' in poll else 'survey' if 'survey' in poll else 'text'
        if kind not in ('askdone', 'askhide'):  # teacher marks, not student activity
            acts[client][kind] += 1
            lects[client].add(lec)
            log.append((client, lec, kind, poll, ts, ''))  # texts: time only, never the text itself
    base_h = f'refs/heads/v/{session}/'
    seen = set()
    for r in refs('heads', session):
        rest = r['ref'][len(base_h):]
        poll, last = rest.rsplit('/', 1)
        ts, client = last.split('--')[:2]
        if poll.endswith('-where'):  # 'today I'm: in class / at home', latest answer per lecture
            ts, val = int(last.split('--')[0]), last.split('--', 2)[2]
            lec = poll.split('-')[0]
            if lec not in where[client] or where[client][lec][0] < ts:
                where[client][lec] = (ts, val.replace('_', ' '))
            log.append((client, lec, 'where', poll, ts, val))
            continue
        kind = 'pulse' if '-pulse-' in poll else 'poll'
        log.append((client, lecture(poll, ts), kind, poll, ts, last.split('--', 2)[2] if last.count('--') >= 2 else ''))
        if kind == 'poll':
            if (client, poll) in seen:
                continue  # count each poll once per student (changes of mind don't add points)
            seen.add((client, poll))
            inclass[client][0 if when(lecture(poll, ts), ts)[1] == 'in class time' else 1] += 1
        acts[client][kind] += 1
        lects[client].add(lecture(poll, ts))
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'participation_{session}.csv')
    kinds = ['poll', 'pulse', 'chat', 'own words', 'survey', 'text']
    with open(path, 'w', newline='') as f:
        w = csv.writer(f)
        ros = roster()
        w.writerow(['official name', 'matrikel', 'match', 'surname', 'name', 'nickname', 'device id', 'lectures', 'present (wheel)', 'in class (said)', 'at home (said)'] + kinds + ['polls in class time', 'polls outside class time'])
        clients = sorted(set(acts) | set(who) | set(present) | set(where), key=lambda c: (who.get(c, {}).get('surname', '~').lower(), c))
        for c in clients:
            p = who.get(c, {})
            r, how = match(p.get('name', ''), p.get('surname', ''), ros) if p else (None, '')
            w.writerow([(r[0] + ' ' + r[1]) if r else '', r[2] if r else '', how, p.get('surname', ''), p.get('name', ''), p.get('nick', ''), c, ' '.join(sorted(lects[c])), ' '.join(sorted(present[c])), ' '.join(sorted(l for l, v in where[c].items() if v[1] == 'in class')), ' '.join(sorted(l for l, v in where[c].items() if v[1] == 'at home'))] + [acts[c][k] for k in kinds] + inclass[c])
    # every answer with its time: one row each (the first answer to a poll is the one that counts above)
    lpath = os.path.join(OUT, f'participation_{session}_log.csv')
    with open(lpath, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['name (official if matched)', 'nickname', 'device id', 'lecture', 'kind', 'poll', 'time (Vienna)', 'class time', 'answer'])
        names = {}
        for c in set(x[0] for x in log):
            p = who.get(c, {})
            r = match(p.get('name', ''), p.get('surname', ''), ros)[0] if p else None
            names[c] = (r[0] + ' ' + r[1]) if r else (p.get('name', '') + ' ' + p.get('surname', '')).strip()
        for c, lec, kind, poll, ts, val in sorted(log, key=lambda x: (who.get(x[0], {}).get('surname', '~').lower(), x[0], int(x[4]))):
            t, tag = when(lec, ts)
            w.writerow([names[c], who.get(c, {}).get('nick', ''), c, lec, kind, poll, t, tag, val])
    print(f'{len(log)} answers with time → {lpath}')
    print(f'{len(who)} signed in · {len(acts)} devices active → {path}')


if __name__ == '__main__':
    main()
