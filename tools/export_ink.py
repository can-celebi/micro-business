#!/usr/bin/env python3
"""The lecturer's class ink → a small public file per lecture, ink/<Lxx>.json, that every student's deck can show on its own slides.
Ali (Main coder), 05.11.2026 (Can: "impose the pen data into the slides and maybe have a button that toggles showing the pen data").

Input: a "save pen data" file from the pen (assets/js/ink.js), or any JSON with strokesSavedPerSlide.
Output keeps ONLY what stayed visible, per slide id: colour, width, the tidy shape if any, and the points as 0–1 slide coordinates rounded to
4 decimals. Erasures are baked in (Celebi, 05.11: erased writing must not be readable in the public file): every point a later erasure
covered is removed, a stroke is split where it was erased, and the eraser paths themselves are left out. No browser string, no timing,
no pressure, no other field. Anything unexpected, including a number that isn't finite or lies far off the slide, stops the export.
Usage: python3 tools/export_ink.py <pen-data.json> <Lxx> [--deck lectures/Lxx/index.html]   → ink/<Lxx>.json, and a list of slides for Can
"""
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COLOURS = {"black", "blue", "red", "green"}   # ink.js COLS
WIDTHS = {"thin", "medium"}                    # ink.js WIDTH
STROKE_KEYS = {"c", "w", "e", "es", "p", "t", "k"}
ROUND = 4
SLIDE_W, SLIDE_H = 1280, 720               # Reveal.initialize width and height in the decks; ink.js widths are in these units
INK_W = {"thin": 1.6, "medium": 3.2}       # ink.js WIDTH × (0.6 + 0.8 × 0.5), the factor when there's no pressure
OLD_ERASER = 22                            # ink.js: erasures saved before 04.11 have no size


def pts(lst, where):
    out = []
    for q in lst:
        if not (isinstance(q, list) and len(q) >= 2 and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in q[:2])):
            sys.exit(f"{where}: a point that isn't [u, v]: {str(q)[:40]}")
        u, v = float(q[0]), float(q[1])
        if not (math.isfinite(u) and math.isfinite(v) and -1 <= u <= 2 and -1 <= v <= 2):
            sys.exit(f"{where}: a point that isn't a finite number near the slide: {str(q)[:40]}: nothing written")
        out.append([round(u, ROUND), round(v, ROUND)])
    return out


def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def bake(strokes):
    """The visible result: ink strokes only, with every point a LATER erasure covered removed, split where it was erased.
    A point counts as erased when its whole ink disc lay inside the eraser's path: distance ≤ eraser radius − ink radius."""
    out = []
    for i, st in enumerate(strokes):
        if st.get("e"):
            continue
        later = [e for e in strokes[i + 1:] if e.get("e")]
        r_ink = INK_W[st["w"]] / 2
        def gone(q):
            x, y = q[0] * SLIDE_W, q[1] * SLIDE_H
            for e in later:
                r = (e.get("es") or OLD_ERASER) / 2 - r_ink
                if r <= 0:
                    continue
                pe = [(a * SLIDE_W, b * SLIDE_H) for a, b in e["p"]]
                if len(pe) == 1 and math.hypot(x - pe[0][0], y - pe[0][1]) <= r:
                    return True
                if any(seg_dist(x, y, *pe[k], *pe[k + 1]) <= r for k in range(len(pe) - 1)):
                    return True
            return False
        if not later:
            out.append(st)
            continue
        if st.get("t"):
            if any(gone(q) for q in (st.get("k") or []) + st["p"]):   # both the tidied shape and its raw points (Utku 05.11)
                sys.exit("a tidied stroke under an eraser isn't supported yet: nothing written")
            out.append(st)
            continue
        piece = []
        for q in st["p"]:
            if gone(q):
                if piece:
                    out.append({"c": st["c"], "w": st["w"], "p": piece})
                piece = []
            else:
                piece.append(q)
        if piece:
            out.append({"c": st["c"], "w": st["w"], "p": piece})
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
        raw = [clean(s, f"{sid} stroke {i}") for i, s in enumerate(strokes)]
        out = bake(raw)
        erased = sum(len(s["p"]) for s in raw if not s.get("e")) - sum(len(s["p"]) for s in out)
        ink = out
        if out:
            slides[sid] = out
        flag = []
        if sid not in sids:
            flag.append("NOT IN THE DECK: the slide id isn't in " + str(deck.relative_to(ROOT)))
        if not ink:
            flag.append("nothing left after erasing: left out of the file")
        elif len(ink) == 1 and len(ink[0]["p"]) <= 2:
            flag.append("a single dot: maybe a test")
        notes.append(f"  {sid:12} {len(ink):4} strokes, {sum(s.get('e', False) for s in raw)} erasures baked in, {erased:4} erased points left out, {sum(len(s['p']) for s in out):5} points" + ("   ← " + "; ".join(flag) if flag else ""))
    out = {"about": "The lecturer's writing from class, per slide: colour, width and 0–1 slide points only. Shown on the deck with 'show class ink'.",
           "lecture": lec, "slides": slides}
    dest = ROOT / "ink" / f"{lec}.json"
    dest.parent.mkdir(exist_ok=True)
    text = json.dumps(out, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    if '"e":' in text or '"es":' in text:
        sys.exit("an erasure would be published: nothing written")
    for bad in ("Mozilla", "Windows", "timeStamp", "started", "samples", "browser", "platform", "screen", "devicePixelRatio", "token", "micro-teacher"):
        if bad in text:
            sys.exit(f"'{bad}' would be published: nothing written")
    dest.write_text(text + "\n", encoding="utf-8")
    print(f"{dest.relative_to(ROOT)}: {len(slides)} slides, {len(text) // 1024} KB")
    print("\n".join(notes))


if __name__ == "__main__":
    main(sys.argv[1:])
