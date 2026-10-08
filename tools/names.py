#!/usr/bin/env python3
"""Who is who, and who took part: decrypts the sign-ins and counts each student's activity.

    python tools/names.py ws26            # the real class
    python tools/names.py test            # rehearsals

Students sign in on the slides (👤): nickname in clear, name + surname encrypted on their device with the
public key in assets/js/config.js. Only the private key (MICRO-CAN/00_admin/keys/micro-names-private.pem,
never in a repo) can read them. Every answer carries the device id, so activity can be credited.

Writes MICRO-CAN/06_moodle/participation_<session>.csv (outside the public site repo: it holds real names).
If the u:space list (List of participants_….csv) is in MICRO-CAN/ or 06_moodle/, each sign-in is matched to the
official name + matriculation number (exact / close: check / not on the list).
"""
import base64, csv, json, os, re, sys, urllib.request
from collections import defaultdict
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ROOT = os.path.dirname(SITE)  # MICRO-CAN
KEY = os.path.join(ROOT, '00_admin', 'keys', 'micro-names-private.pem')
OUT = os.path.join(ROOT, '06_moodle')

cfg = open(os.path.join(SITE, 'assets', 'js', 'config.js')).read()
owner = re.search(r'owner:\s*"([^"]+)"', cfg).group(1)
repo = re.search(r'repo:\s*"([^"]+)"', cfg).group(1)
parts = re.findall(r'"([^"]+)"', re.search(r'tokenParts:\s*\[([^\]]*)\]', cfg).group(1))
TOKEN = base64.b64decode(''.join(parts)).decode()
API = f'https://api.github.com/repos/{owner}/{repo}'


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
    base_t = f'refs/tags/t/{session}/'
    for r in refs('tags', session):
        rest = r['ref'][len(base_t):]
        poll, last = rest.rsplit('/', 1)
        ts, client = last.split('--')[:2]
        lec = poll.split('-')[0]
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
    base_h = f'refs/heads/v/{session}/'
    seen = set()
    for r in refs('heads', session):
        rest = r['ref'][len(base_h):]
        poll, last = rest.rsplit('/', 1)
        client = last.split('--')[1]
        if poll.endswith('-where'):  # 'today I'm: in class / at home', latest answer per lecture
            ts, val = int(last.split('--')[0]), last.split('--', 2)[2]
            lec = poll.split('-')[0]
            if lec not in where[client] or where[client][lec][0] < ts:
                where[client][lec] = (ts, val.replace('_', ' '))
            continue
        kind = 'pulse' if '-pulse-' in poll else 'poll'
        if kind == 'poll':
            if (client, poll) in seen:
                continue  # count each poll once per student (changes of mind don't add points)
            seen.add((client, poll))
        acts[client][kind] += 1
        lects[client].add(poll.split('-')[0])
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'participation_{session}.csv')
    kinds = ['poll', 'pulse', 'chat', 'own words', 'survey', 'text']
    with open(path, 'w', newline='') as f:
        w = csv.writer(f)
        ros = roster()
        w.writerow(['official name', 'matrikel', 'match', 'surname', 'name', 'nickname', 'device id', 'lectures', 'present (wheel)', 'in class (said)', 'at home (said)'] + kinds)
        clients = sorted(set(acts) | set(who) | set(present) | set(where), key=lambda c: (who.get(c, {}).get('surname', '~').lower(), c))
        for c in clients:
            p = who.get(c, {})
            r, how = match(p.get('name', ''), p.get('surname', ''), ros) if p else (None, '')
            w.writerow([(r[0] + ' ' + r[1]) if r else '', r[2] if r else '', how, p.get('surname', ''), p.get('name', ''), p.get('nick', ''), c, ' '.join(sorted(lects[c])), ' '.join(sorted(present[c])), ' '.join(sorted(l for l, v in where[c].items() if v[1] == 'in class')), ' '.join(sorted(l for l, v in where[c].items() if v[1] == 'at home'))] + [acts[c][k] for k in kinds])
    print(f'{len(who)} signed in · {len(acts)} devices active → {path}')


if __name__ == '__main__':
    main()
