"""Signal Agent logo kit, "Named Star": the map of Pons breaks open where one star gets a name.
Wordmark "signal agent" outlined from Inter Tight (SIL OFL 1.1, logo use allowed). Run: python3 build.py FONT.ttf"""
import os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

INK, PAPER = "#161514", "#F5F3EC"
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "..", "signal-logo", "kit"); os.makedirs(OUT, exist_ok=True)
FONT = sys.argv[1]
f = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")

# ---- symbol: a globe (ring + tilted equator); the ring opens where one star is named ----
import math
def mark(ring=14, eq=10, dot=23, gap=27, rx=84, ry=28):
    a0, a1, r = math.radians(-45 + gap), math.radians(-45 - gap + 360), 96
    p = lambda a: (128 + r * math.cos(a), 128 + r * math.sin(a))
    (x0, y0), (x1, y1) = p(a0), p(a1); dx, dy = p(math.radians(-45))
    return (f'<path d="M{f(x0)} {f(y0)}A{r} {r} 0 1 1 {f(x1)} {f(y1)}" fill="none" stroke="C" stroke-width="{ring}" stroke-linecap="round"/>'
            f'<ellipse cx="128" cy="128" rx="{rx}" ry="{ry}" transform="rotate(-18 128 128)" fill="none" stroke="C" stroke-width="{eq}"/>'
            f'<circle cx="{f(dx)}" cy="{f(dy)}" r="{dot}" fill="C"/>')
MASTER = mark()
SMALL = mark(ring=22, eq=16, dot=30, gap=34, rx=78, ry=30)  # 16-32 px: heavier lines, bigger star

def sym(fill, path=MASTER, dx=0, dy=0, k=1):
    t = f' transform="translate({f(dx)} {f(dy)}) scale({f(k)})"' if (dx or dy or k != 1) else ""
    return f'<g{t}>' + path.replace('"C"', f'"{fill}"') + '</g>'

# ---- wordmark ----
def instance(w):
    fnt = TTFont(FONT); return instantiateVariableFont(fnt, {"wght": w}, inplace=False)
F500, F380 = instance(560), instance(380)
def text(fnt, s, size, x, base, track=-0.035):
    gs, cmap, hm, upm = fnt.getGlyphSet(), fnt.getBestCmap(), fnt["hmtx"].metrics, fnt["head"].unitsPerEm
    k = size / upm; out = []
    for ch in s:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs); gs[g].draw(TransformPen(pen, (k, 0, 0, -k, x, base)))
        if pen.getCommands(): out.append(pen.getCommands())
        x += hm[g][0] * k + track * size
    return out, x
def word(fill, x, base, size=150, agent=True):
    a, x2 = text(F500, "signal", size, x, base)
    b, x3 = text(F380, "agent", size, x2 + size * 0.24, base) if agent else ([], x2)
    return f'<g fill="{fill}">' + "".join(f'<path d="{d}"/>' for d in a + b) + "</g>", x3

def svg(w, h, body, title="signal agent"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}"><title>{title}</title>{body}</svg>\n'
def write(name, text_): open(os.path.join(OUT, name), "w").write(text_); print("wrote", name)

write("signal-symbol.svg", svg(256, 256, sym(INK)))
write("signal-symbol-small.svg", svg(256, 256, sym(INK, SMALL)))
write("signal-symbol-paper.svg", svg(256, 256, f'<rect width="256" height="256" fill="{INK}"/>' + sym(PAPER)))
wm, w = word(INK, 0, 150, 150); write("signal-wordmark.svg", svg(w + 4, 190, wm))
# horizontal lockup: symbol 256 tall, wordmark baseline on the s's lower tail
for name, fg, bg in [("signal-horizontal.svg", INK, None), ("signal-horizontal-paper.svg", PAPER, INK)]:
    wm, w = word(fg, 280, 182, 128)
    body = (f'<rect width="{f(w + 40)}" height="256" fill="{bg}"/>' if bg else "") + sym(fg) + wm
    write(name, svg(w + 40, 256, body))
# stacked
wm, w = word(INK, 0, 0, 96)
write("signal-stacked.svg", svg(max(w, 256) + 40, 400, sym(INK, MASTER, (max(w, 256) + 40) / 2 - 128, 10) + word(INK, (max(w, 256) + 40 - w) / 2, 360, 96)[0]))
# X avatar and banner, OG image
write("signal-x-avatar.svg", svg(400, 400, f'<rect width="400" height="400" fill="{INK}"/>' + sym(PAPER, MASTER, 72, 70, 1.0)))
wm, w = word(INK, 0, 0, 110)
write("signal-x-banner.svg", svg(1500, 500, f'<rect width="1500" height="500" fill="{PAPER}"/>' + sym(INK, MASTER, 1500 / 2 - (256 * 0.9 + 40 + w) / 2, 140, 0.9) + word(INK, 1500 / 2 - (256 * 0.9 + 40 + w) / 2 + 256 * 0.9 + 40, 302, 110)[0]))
wm, w = word(PAPER, 0, 0, 110)
write("signal-og.svg", svg(1200, 630, f'<rect width="1200" height="630" fill="{INK}"/>' + sym(PAPER, MASTER, 600 - (230 + 40 + w) / 2, 200, 0.9) + word(PAPER, 600 - (230 + 40 + w) / 2 + 270, 362, 110)[0]))
