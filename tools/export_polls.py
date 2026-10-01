"""Export poll answers (stored as git refs) to JSON files in the data repo.

Run after class:  python tools/export_polls.py ws26
Needs the GitHub CLI logged in (uses `gh auth token`). Writes, in
can-celebi/micro-business-data, one file per poll:
    data/<session>/<poll>.json  = {"poll", "session", "n", "latest": [...], "all": [...]}
"latest" keeps each browser's last answer (what the slides show); "all" keeps every answer.
"""
import base64
import json
import subprocess
import sys
import urllib.request
from collections import defaultdict

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


def main(session):
    status, refs = call("GET", f"{API}/git/matching-refs/heads/v/{session}/")
    polls = defaultdict(list)
    prefix = f"refs/heads/v/{session}/"
    for x in refs or []:
        poll, _, rest = x["ref"][len(prefix):].partition("/")
        parts = rest.split("--")
        if len(parts) < 3:
            continue
        raw = "--".join(parts[2:])
        try:
            value = float(raw) if "." in raw else int(raw)
        except ValueError:
            value = raw
        polls[poll].append({"ts": int(parts[0]), "client": parts[1], "value": value})

    for poll, rows in sorted(polls.items()):
        rows.sort(key=lambda r: r["ts"])
        latest = {}
        for r in rows:
            latest[r["client"]] = r
        doc = {"poll": poll, "session": session, "n": len(latest),
               "latest": list(latest.values()), "all": rows}
        path = f"data/{session}/{poll}.json"
        _, existing = call("GET", f"{API}/contents/{path}")
        body = {"message": f"export {session}/{poll}",
                "content": base64.b64encode(json.dumps(doc, indent=1).encode()).decode()}
        if existing:
            body["sha"] = existing["sha"]
        code, _ = call("PUT", f"{API}/contents/{path}", body)
        print(f"{poll}: n={len(latest)} answers={len(rows)} → {path} ({code})")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "ws26")
