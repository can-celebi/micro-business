#!/usr/bin/env python3
"""Export the students' feedback on practice questions (Can, Practice-arena Addition 20) for Hande's report.
Each report is a blob under refs/tags/fb/<session>/<item id>/<nickname key> in can-celebi/micro-business-data:
{v, item, topic, nick, key, opts: ["text" | "math" | "hard"], text, ts}. One per question per account (the latest version).
Usage: python3 -B tools/export_feedback.py <session> [--csv] [--out FILE]      (session: ws26 or test; uses your gh login)
Output: JSON lines (default) or CSV, sorted by item then time; free text exactly as typed (plain text, never interpreted).
Written by Ali (Main coder)."""
import base64, csv, io, json, subprocess, sys, urllib.request, urllib.error

REPO = "can-celebi/micro-business-data"
def cell(v):   # a text that starts like a spreadsheet formula (= + - @, or a tab/CR) gets a leading ' (Utku: "=HYPERLINK(…)")
    v = str(v)
    return "'" + v if v[:1] in ("=", "+", "-", "@", "\t", "\r") else v
LABEL = {"text": "the text is confusing", "math": "the math or the answer seems wrong", "hard": "too hard for me"}

def api(path, token):
    r = urllib.request.Request("https://api.github.com/repos/" + REPO + path, headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(r, timeout=30) as x: return json.load(x), x.headers.get("Link", "")

def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    if len(args) < 1: print(__doc__); return 2
    session = args[0]; out = argv[argv.index("--out") + 1] if "--out" in argv else None
    token = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True).stdout.strip()
    if not token: print("STOPPED: not logged in to GitHub (gh auth login)", file=sys.stderr); return 1
    try:
        refs, _ = api(f"/git/matching-refs/tags/fb/{session}/", token)
    except urllib.error.HTTPError as e:
        print(f"STOPPED: GitHub answered {e.code}", file=sys.stderr); return 1
    rows = []
    for x in refs:
        try:
            b, _ = api("/git/blobs/" + x["object"]["sha"], token)
            d = json.loads(base64.b64decode(b["content"]).decode("utf-8"))
        except Exception as e:
            print(f"unreadable report {x['ref']}: {type(e).__name__}", file=sys.stderr); continue
        rows.append({"item": str(d.get("item", "")), "topic": str(d.get("topic", "")), "nick": str(d.get("nick", "")), "ts": str(d.get("ts", "")),
                     "opts": [o for o in d.get("opts", []) if o in LABEL], "text": str(d.get("text", ""))[:300]})
    rows.sort(key=lambda r: (r["item"], r["ts"]))
    if "--csv" in argv:
        buf = io.StringIO(); w = csv.writer(buf)
        w.writerow(["item", "topic", "nick", "time", "text confusing", "math or answer wrong", "too hard", "free text"])
        for r in rows: w.writerow([cell(r["item"]), cell(r["topic"]), cell(r["nick"]), cell(r["ts"]), int("text" in r["opts"]), int("math" in r["opts"]), int("hard" in r["opts"]), cell(r["text"])])
        text = buf.getvalue()
    else:
        text = "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows)
    if out: open(out, "w", encoding="utf-8").write(text); print(f"{len(rows)} reports → {out}", file=sys.stderr)
    else: sys.stdout.write(text)
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
