"""Signal Atlas logo concepts. Run: python3 concepts.py FONT.ttf"""
import os, sys, math
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
INK = "#161514"; H = os.path.dirname(os.path.abspath(__file__))
f = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")
inst = lambda w: instantiateVariableFont(TTFont(sys.argv[1]), {"wght": w}, inplace=False)
F500, F380 = inst(560), inst(380)
def text(fnt, s, size, x, base, track=-0.035):
    gs, cmap, hm, upm = fnt.getGlyphSet(), fnt.getBestCmap(), fnt["hmtx"].metrics, fnt["head"].unitsPerEm
    k = size / upm; out = []
    for ch in s:
        g = cmap[ord(ch)]; pen = SVGPathPen(gs); gs[g].draw(TransformPen(pen, (k, 0, 0, -k, x, base)))
        if pen.getCommands(): out.append(pen.getCommands())
        x += hm[g][0] * k + track * size
    return out, x
def word(fill, x, base, size=128):
    a, x2 = text(F500, "signal", size, x, base); b, x3 = text(F380, "agent", size, x2 + size * 0.24, base)
    return f'<g fill="{fill}">' + "".join(f'<path d="{d}"/>' for d in a + b) + "</g>", x3
S = lambda d, w: f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
def arc_pts(cx, cy, r, a0, a1):  # degrees, clockwise in screen space
    p = lambda a: (cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
    (x0, y0), (x1, y1) = p(a0), p(a1); large = 1 if (a1 - a0) % 360 > 180 else 0
    return f"M{f(x0)} {f(y0)}A{r} {r} 0 {large} 1 {f(x1)} {f(y1)}"
# A · Latitude S: the s is a bent latitude line running edge to edge of the globe
yA, rA = 80, 24; xr = 128 + math.sqrt(104**2 - 48**2)
A = S(f"M128 128m0 -104a104 104 0 1 1 0 208a104 104 0 1 1 0 -208", 14) + S(f"M{f(xr)} {yA}H128a{rA} {rA} 0 0 0 0 {2*rA}a{rA} {rA} 0 0 1 0 {2*rA}H{f(256-xr)}", 16)
# B · Named star: the globe outline breaks open where one star is named
g = 27
B = S(arc_pts(128, 128, 96, -45 + g, -45 - g + 360), 14) + \
    f'<ellipse cx="128" cy="128" rx="84" ry="28" transform="rotate(-18 128 128)" fill="none" stroke="{INK}" stroke-width="10"/>' + \
    f'<circle cx="{f(128 + 96*math.cos(math.radians(-45)))}" cy="{f(128 + 96*math.sin(math.radians(-45)))}" r="22" fill="{INK}"/>'
# C · Meridian S: one meridian bends into an s; a star sits in the upper hemisphere
C = S("M128 128m0 -100a100 100 0 1 1 0 200a100 100 0 1 1 0 -200", 14) + S("M128 28a50 50 0 0 0 0 100a50 50 0 0 1 0 100", 14) + f'<circle cx="176" cy="84" r="15" fill="{INK}"/>'
for k, body in [("a-latitude", A), ("b-named-star", B), ("c-meridian", C)]:
    open(f"{H}/{k}.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">{body}</svg>\n')
    wm, w = word(INK, 290, 176)
    open(f"{H}/{k}-lockup.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w+30)} 256">{body}{wm}</svg>\n')
print("ok")
