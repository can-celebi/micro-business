#!/usr/bin/env python3
"""Export free-text answers (own words, survey records) from the private data repo.

Each answer is a git blob + a tag ref  refs/tags/t/<session>/<poll>/<ts>--<client>  (see assets/js/interactive.js).
Usage:  python tools/export_text.py ws26 L02-ow-      → MICRO-CAN/06_moodle/results_L02/own-words_L02.json
        python tools/export_text.py ws26 L02-survey   → MICRO-CAN/06_moodle/results_L02/survey_L02.json
Rows (Cevdet's format for own words): {session, lecture, concept, slide, browser, ts, text, skipped}
All answers are kept (several per browser possible); the consumer uses the latest.
Needs `gh auth login` (uses `gh auth token`).
"""
import base64, json, os, subprocess, sys, urllib.request

OWNER_REPO = "can-celebi/micro-business-data"

def api(path, token):
    req = urllib.request.Request("https://api.github.com/repos/" + OWNER_REPO + path,
                                 headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

def main():
    session, prefix = sys.argv[1], sys.argv[2]
    token = subprocess.check_output(["gh", "auth", "token"], text=True).strip()
    refs = api("/git/matching-refs/tags/t/%s/%s" % (session, prefix), token)
    rows = []
    for x in refs:
        rest = x["ref"][len("refs/tags/t/%s/" % session):]
        poll, last = rest.rsplit("/", 1)
        ts, client = last.split("--", 1)
        blob = api("/git/blobs/" + x["object"]["sha"], token)
        rec = json.loads(base64.b64decode(blob["content"]).decode("utf-8"))
        lecture = poll.split("-")[0]
        if "-ow-" in poll:
            rows.append({"session": session, "lecture": lecture, "concept": poll.split("-ow-", 1)[1], "slide": poll,
                         "browser": client, "ts": int(ts), "text": rec.get("text", ""), "skipped": bool(rec.get("skipped"))})
        else:
            rec.update({"session": session, "lecture": lecture, "poll": poll, "browser": client, "ts": int(ts)})
            rows.append(rec)
    rows.sort(key=lambda r: r["ts"])
    lecture = prefix.split("-")[0]
    kind = "own-words" if "-ow" in prefix else prefix.split("-", 1)[1].rstrip("-") or "text"
    here = os.path.dirname(os.path.abspath(__file__))
    outdir = os.path.join(here, "..", "..", "06_moodle", "results_" + lecture)
    os.makedirs(outdir, exist_ok=True)
    path = os.path.normpath(os.path.join(outdir, "%s_%s.json" % (kind, lecture)))
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
    print("%d rows → %s" % (len(rows), path))

if __name__ == "__main__":
    main()
