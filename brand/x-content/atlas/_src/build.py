"""Builds scenes.html from the live snapshot (radar.json, status.json) and the logo kit."""
import json, re, datetime
K = "../../../signal-logo/kit/"
inner = lambda f: re.sub(r"<title>.*?</title>", "", open(K + f).read().split(">", 1)[1].rsplit("</svg>", 1)[0])
vb = lambda f: re.search(r'viewBox="([^"]+)"', open(K + f).read()).group(1)
cur = lambda s: s.replace('"#161514"', '"currentColor"')
mark = f'<svg viewBox="{vb("signal-symbol.svg")}">{cur(inner("signal-symbol.svg"))}</svg>'
lockup = f'<svg viewBox="{vb("signal-horizontal.svg")}" style="height:100%;width:auto">{cur(inner("signal-horizontal.svg"))}</svg>'
rows = json.load(open("radar.json"))["rows"]; st = json.load(open("status.json"))
def why(r):
    bad = [c["text"] for c in r["checks"] if not c["ok"]]
    return next((c["text"] for c in r["checks"] if "grow" in c["text"]), "every check passed") if r["pass"] else (bad[0] if bad else "")
for r in rows: r["why"] = re.sub(r"(\d+\.\d{2})\d+", r"\1", why(r))
top = next(r for r in rows if r["pass"])
data = {"rows": [{k: r[k] for k in ("symbol", "token", "pass", "devRugged", "ageSec", "why")} for r in rows], "mark": mark, "lockup": lockup,
        "date": datetime.date.today().strftime("%-d %b %Y"), "launches": f'{st["index"]["recent"]:,}', "dumped": sum(1 for r in rows if r.get("devRugged")),
        "ca": st["novaToken"], "launchCa": "0x6559520903b48582a48C52bB296A449e15Aca000", "launchesN": st["index"]["recent"], "every": round(86400 / max(1, st["index"]["recent"])), "top": {"symbol": top["symbol"], "ageSec": top["ageSec"], "ok": [c["text"] for c in top["checks"] if c["ok"] and not c["text"].startswith("fees")][:6]}}
html = open("scenes.tpl.html").read().replace("{{DATA}}", json.dumps(data)).replace("{{JS}}", open("scenes.js").read())
open("scenes.html", "w").write(html); print("ok", data["date"], data["launches"], data["dumped"], top["symbol"])
