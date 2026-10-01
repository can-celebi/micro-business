"""Make the QR code (SVG) + short-link redirect for a lecture.

Usage: python tools/make_qr.py L01   (needs: pip install segno)
Creates lectures/L01/qr.svg (encodes https://can-celebi.github.io/micro-business/L01)
and L01/index.html (short link → lectures/L01/).
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
# viewBox so the SVG scales cleanly with CSS
svg = root / "lectures" / lec / "qr.svg"
t = svg.read_text()
if "viewBox" not in t:
    import re
    w = re.search(r'width="(\d+)"', t).group(1)
    t = t.replace('<svg ', f'<svg viewBox="0 0 {w} {w}" ', 1)
    svg.write_text(t)
print("QR →", short)
