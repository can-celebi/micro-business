"""Make the QR code (SVG) + short-link redirect for a lecture.

Usage: python tools/make_qr.py L01   (needs: pip install segno)
Creates lectures/L01/qr.svg (encodes https://can-celebi.github.io/micro-business/L01)
and L01/index.html (short link → lectures/L01/).
Also the opening survey: lectures/L01/qr-survey.svg (encodes …/S01) and S01/index.html (short link → survey/L01/),
when survey/L01/index.html exists.
"""
import pathlib
import sys

import segno

BASE = "https://can-celebi.github.io/micro-business"
root = pathlib.Path(__file__).resolve().parent.parent
lec = sys.argv[1]
short = f"{BASE}/{lec}"

segno.make(short, error="m").save(
    root / "lectures" / lec / "qr.svg", scale=10, border=2, dark="#111111", light=None
)

redirect = root / lec / "index.html"
redirect.parent.mkdir(exist_ok=True)
redirect.write_text(
    f'<!doctype html><meta charset="utf-8"><title>{lec}</title>'
    f'<meta http-equiv="refresh" content="0; url=../lectures/{lec}/">'
    f'<a href="../lectures/{lec}/">{lec}</a>\n'
)
def viewbox(svg):
    """viewBox so the SVG scales cleanly with CSS"""
    import re
    t = svg.read_text()
    if "viewBox" not in t:
        w = re.search(r'width="(\d+)"', t).group(1)
        svg.write_text(t.replace('<svg ', f'<svg viewBox="0 0 {w} {w}" ', 1))

viewbox(root / "lectures" / lec / "qr.svg")
print("QR →", short)

# opening survey: S03 → survey/L03/
sn = "S" + lec[1:]
if (root / "survey" / lec / "index.html").exists():
    segno.make(f"{BASE}/{sn}", error="m").save(
        root / "lectures" / lec / "qr-survey.svg", scale=10, border=2, dark="#111111", light=None
    )
    viewbox(root / "lectures" / lec / "qr-survey.svg")
    (root / sn).mkdir(exist_ok=True)
    (root / sn / "index.html").write_text(
        f'<!doctype html><meta charset="utf-8"><title>{sn}</title>'
        f'<meta http-equiv="refresh" content="0; url=../survey/{lec}/index.html">'
        f'<a href="../survey/{lec}/index.html">{sn}</a>\n'
    )
    print("survey QR →", f"{BASE}/{sn}")
