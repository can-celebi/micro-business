#!/usr/bin/env python3
"""The lecturer's class ink → a small public file per lecture, ink/<Lxx>.json, that every student's deck can show on its own slides.
Ali (Main coder), 05.11.2026 (Can: "impose the pen data into the slides and maybe have a button that toggles showing the pen data").

Input: a "save pen data" file from the pen (assets/js/ink.js), or any JSON with strokesSavedPerSlide.
Output keeps ONLY what drawing needs, per slide id: colour, width, eraser flag and size, the tidy shape if any, and the points as 0–1
slide coordinates rounded to 4 decimals. No browser string, no timing, no pressure, no other field. Anything unexpected stops the export.
Strokes stay in their saved order, so erasures wipe exactly what they wiped in class.
Usage: python3 tools/export_ink.py <pen-data.json> <Lxx> [--deck lectures/Lxx/index.html]   → ink/<Lxx>.json, and a list of slides for Can
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COLOURS = {"black", "blue", "red", "green"}   # ink.js COLS
WIDTHS = {"thin", "medium"}                    # ink.js WIDTH
STROKE_KEYS = {"c", "w", "e", "es", "p", "t", "k"}
ROUND = 4


def pts(lst, where):
    out = []
    for q in lst:
        if not (isinstance(q, list) and len(q) >= 2 and all(isinstance(v, (int, float)) for v in q[:2])):
            sys.exit(f"{where}: a point that isn't [u, v]: {str(q)[:40]}")
        out.append([round(float(q[0]), ROUND), round(float(q[1]), ROUND)])
    return out


def clean(st, where):
    extra = set(st) - STROKE_KEYS
    if extra:
        sys.exit(f"{where}: unexpected fields {sorted(extra)}: nothing written")
    if st.get("c") not in COLOURS or st.get("w") not in WIDTHS:
        sys.exit(f"{where}: unknown colour or width {st.get('c')!r} {st.get('w')!r}: nothing written")
    out = {"c": st["c"], "w": st["w"]}
    if st.get("e"):
        out["e"] = True
        if st.get("es") is not None:
            if not isinstance(st["es"], (int, float)) or not 1 <= st["es"] <= 200:
                sys.exit(f"{where}: odd eraser size {st['es']!r}")
            out["es"] = st["es"]
    if st.get("t") in ("line", "curve"):
        out["t"] = st["t"]
        if st["t"] == "curve" and st.get("k"):
            out["k"] = pts(st["k"], where)
    elif st.get("t") is not None:
        sys.exit(f"{where}: unknown stroke shape {st['t']!r}")
    out["p"] = pts(st.get("p") or [], where)
    if not out["p"]:
        sys.exit(f"{where}: a stroke without points")
    return out


def main(argv):
    if len(argv) < 2:
        sys.exit(__doc__)
    src, lec = Path(argv[0]), argv[1]
    if not re.fullmatch(r"L\d{2}[a-z]?", lec):
        sys.exit("lecture: like L10")
    deck = ROOT / (argv[argv.index("--deck") + 1] if "--deck" in argv else f"lectures/{lec}/index.html")
    data = json.loads(src.read_text(encoding="utf-8"))
    saved = data.get("strokesSavedPerSlide")
    if not isinstance(saved, dict):
        sys.exit("no strokesSavedPerSlide in the input")
    sids = set(re.findall(r'data-sid="([^"]+)"', deck.read_text(encoding="utf-8"))) if deck.exists() else set()
    slides, notes = {}, []
    for key, strokes in saved.items():
        if not key.startswith("sid:"):
            notes.append(f"  skipped {key!r}: no slide id (an old index key), so it can't be placed safely")
            continue
        sid = key[4:]
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,60}", sid):
            sys.exit(f"odd slide id {sid!r}")
        out = [clean(s, f"{sid} stroke {i}") for i, s in enumerate(strokes)]
        if not out:
            continue
        slides[sid] = out
        ink = [s for s in out if not s.get("e")]
        flag = []
        if sid not in sids:
            flag.append("NOT IN THE DECK: the slide id isn't in " + str(deck.relative_to(ROOT)))
        if not ink:
            flag.append("only erasures: shows nothing")
        elif len(ink) == 1 and len(ink[0]["p"]) <= 2:
            flag.append("a single dot: maybe a test")
        notes.append(f"  {sid:12} {len(ink):4} strokes, {sum(s.get('e', False) for s in out)} erasures, {sum(len(s['p']) for s in out):5} points" + ("   ← " + "; ".join(flag) if flag else ""))
    out = {"about": "The lecturer's writing from class, per slide: colour, width and 0–1 slide points only. Shown on the deck with 'show class ink'.",
           "lecture": lec, "slides": slides}
    dest = ROOT / "ink" / f"{lec}.json"
    dest.parent.mkdir(exist_ok=True)
    text = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    for bad in ("Mozilla", "Windows", "timeStamp", "started", "samples", "browser", "platform", "screen", "devicePixelRatio", "token", "micro-teacher"):
        if bad in text:
            sys.exit(f"'{bad}' would be published: nothing written")
    dest.write_text(text + "\n", encoding="utf-8")
    print(f"{dest.relative_to(ROOT)}: {len(slides)} slides, {len(text) // 1024} KB")
    print("\n".join(notes))


if __name__ == "__main__":
    main(sys.argv[1:])
