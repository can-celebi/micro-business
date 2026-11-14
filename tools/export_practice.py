"""Export the practice page's time records (Can 12.11, Practice-arena.md Addition 3; Hande's format) to the data repo.

Run:  python tools/export_practice.py ws26        (needs the GitHub CLI logged in; uses `gh auth token`)
Reads every batch ref refs/tags/t/<session>/practice-times/<ts>--<client> (each a blob {v, session, client, records: [...]}) and writes
    data/<session>/practice.jsonl   one record per line, sorted by ts:
    {ts, client, nick, run, item, template, slot, mirrors, level, points, attempt, seconds, capped, correct, lecturer}
A record sent twice (a batch retried after a lost answer) is kept once: the same client, item, attempt and ts.
Also prints counts. Nothing is deleted.
"""
import base64, json, re, subprocess, sys, urllib.request, urllib.error

OWNER, REPO = "can-celebi", "micro-business-data"
API = f"https://api.github.com/repos/{OWNER}/{REPO}"
TOKEN = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, check=True).stdout.strip()

def call(method, url, body=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, None

def all_refs(url):
    """Every ref, following GitHub's Link: rel="next" pages if there are any (Utku 12.11: never lose batches silently)."""
    out, nxt = [], url + "?per_page=100"
    while nxt:
        req = urllib.request.Request(nxt, headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json"})
        try:
            with urllib.request.urlopen(req) as r:
                out += json.loads(r.read() or b"[]")
                m = re.search(r'<([^>]+)>;\s*rel="next"', r.headers.get("Link") or "")
                nxt = m.group(1) if m else None
        except urllib.error.HTTPError as e:
            sys.exit(f"could not list the batches ({e.code})")
    return out

def main(session):
    refs = all_refs(f"{API}/git/matching-refs/tags/t/{session}/practice-times/")
    seen, rows, bad = set(), [], 0
    for x in refs or []:
        code, blob = call("GET", f"{API}/git/blobs/{x['object']['sha']}")
        if code != 200:
            bad += 1; continue
        try:
            doc = json.loads(base64.b64decode(blob["content"]).decode("utf-8"))
            recs = doc["records"]
        except Exception:
            bad += 1; continue
        for r in recs:
            k = (r.get("client"), r.get("item"), r.get("attempt"), r.get("ts"))
            if k in seen:
                continue
            seen.add(k); rows.append(r)
    rows.sort(key=lambda r: r.get("ts") or "")
    text = "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows)
    path = f"data/{session}/practice.jsonl"
    _, existing = call("GET", f"{API}/contents/{path}")
    body = {"message": f"export {session}/practice", "content": base64.b64encode(text.encode()).decode()}
    if existing:
        body["sha"] = existing["sha"]
    code, _ = call("PUT", f"{API}/contents/{path}", body)
    clients = len({r.get("client") for r in rows})
    print(f"practice: {len(refs or [])} batches, {len(rows)} records, {clients} devices, {bad} unreadable → {path} ({code})")
    if code not in (200, 201):
        sys.exit(f"the file was NOT written ({code})")
    if bad:
        sys.exit(f"{bad} batches could not be read: the export is incomplete")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "ws26")
