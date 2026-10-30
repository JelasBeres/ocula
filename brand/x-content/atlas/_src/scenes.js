// Signal Agent · Atlas: X content scenes. Every scene is a pure function of time t, so PNG = seek(dur), MP4 = seek every frame.
const D = window.DATA, $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (x) => Math.max(0, Math.min(1, x)), ease = (x) => 1 - Math.pow(1 - clamp(x), 3), eio = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const show = (el, t, a, d = 0.7, dy = 16) => { if (!el) return; const k = ease((t - a) / d); el.style.opacity = k; el.style.transform = `translateY(${(1 - k) * dy}px)`; };
const hide = (el, t, a, d = 0.5) => { if (!el) return; const k = ease((t - a) / d); el.style.opacity = Math.min(+el.style.opacity || 1, 1 - k); };
const INK = "#161514", PAPER = "#F5F3EC", FAINT = "#9A958B";
const mark = (c, s) => `<span class="mk" style="width:${s}px;height:${s}px;color:${c}">${D.mark}</span>`;
const lock = (c, h) => `<span class="lk" style="height:${h}px;color:${c}">${D.lockup}</span>`;
const foot = (dark) => `<div class="foot" style="color:${dark ? PAPER : INK}">${mark(dark ? PAPER : INK, 30)}<span class="wm"><b>signal</b> agent</span><span class="dom">signalaiagent.com</span></div>`;

// ---------- the globe: orthographic dots, meridians, named stars ----------
const DUST = []; { const n = 1700; for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * 2.399963; DUST.push([Math.cos(a) * r, y, Math.sin(a) * r]); } }
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
function starOf(r, i) {
  const h = parseInt((r.token || "").slice(2, 10), 16) || hash(r.symbol + i), u = (h % 1000) / 1000, v = ((h >>> 10) % 1000) / 1000;
  const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1) * 0.8 + 0.3;
  return { p: [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)], r };
}
// the live launches, plus anonymous dust stars so the map never looks empty
const STARS = [...D.rows.map((r, i) => starOf({ ...r, symbol: "", anon: true }, i)), ...Array.from({ length: 22 }, (_, i) => starOf({ symbol: "", token: "0x" + (hash("dust" + i)).toString(16).padStart(8, "0"), pass: false, anon: true }, i))];
function rot([x, y, z], ry, rx) { const c = Math.cos(ry), s = Math.sin(ry); let X = x * c + z * s, Z = -x * s + z * c; const c2 = Math.cos(rx), s2 = Math.sin(rx); const Y = y * c2 - Z * s2; Z = y * s2 + Z * c2; return [X, Y, Z]; }
function globe(cv, o) {
  const dpr = devicePixelRatio, W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
  const x = cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  const { cx, cy, R, ry = 0, rx = -0.32, dust = 1, lines = 1, ink = INK, labels = 1, pop = () => 1, named = null, ring = null, measure = null, fallen = null, fk = 0, nt = null } = o;
  const P = (p) => { const q = rot(p, ry, rx); return [cx + q[0] * R, cy - q[1] * R, q[2]]; };
  // meridians and the equator
  const circle = (fn, a, w) => { let prev = null; for (let i = 0; i <= 140; i++) { const q = P(fn((i / 140) * Math.PI * 2)); if (prev) { x.globalAlpha = (q[2] > 0 ? a : a * 0.35) * lines; x.beginPath(); x.moveTo(prev[0], prev[1]); x.lineTo(q[0], q[1]); x.strokeStyle = ink; x.lineWidth = w; x.stroke(); } prev = q; } };
  for (let k = 0; k < 6; k++) { const lo = (k / 6) * Math.PI; circle((t) => [Math.cos(t) * Math.cos(lo), Math.sin(t), Math.cos(t) * Math.sin(lo)], 0.13, 1); }
  circle((t) => [Math.cos(t), 0, Math.sin(t)], 0.32, 1.2);
  if (ring != null) circle((t) => [Math.cos(t) * Math.cos(ring), Math.sin(ring), Math.sin(t) * Math.cos(ring)], 0.7, 2.2);
  // dust
  x.fillStyle = ink;
  for (const d of DUST) { const q = P(d); x.globalAlpha = (q[2] > 0 ? 0.5 : 0.1) * dust; x.beginPath(); x.arc(q[0], q[1], Math.min(6, R / 230), 0, 7); x.fill(); }
  // stars and their labels
  const out = [];
  STARS.forEach((s, i) => {
    const q = P(s.p.map((v) => v * 1.01)), k = pop(i); if (k <= 0.001 || i === fallen) return;
    const sig = s.r.pass, rad = (sig ? R / 30 : R / 64) * k * (named === i ? 1.5 : 1);
    x.globalAlpha = q[2] > 0 ? 1 : 0.18; x.fillStyle = sig ? ink : "#8a857b"; x.beginPath(); x.arc(q[0], q[1], rad, 0, 7); x.fill();
    if (q[2] > 0.08 && (!s.r.anon || named === i)) out.push({ q, s, i, rad, k });
  });
  // a fallen star: it turns red and drops off the map, with the reason
  if (fallen != null) {
    const q0 = P(STARS[fallen].p.map((v) => v * 1.01)), dy = fk * R * 0.55, rr = R / 26;
    x.globalAlpha = 0.35 * Math.min(1, fk * 3); x.strokeStyle = "#B5432E"; x.setLineDash([4, 6]); x.lineWidth = 1.5; x.beginPath(); x.moveTo(q0[0], q0[1]); x.lineTo(q0[0], q0[1] + dy); x.stroke(); x.setLineDash([]);
    x.globalAlpha = 1 - fk * 0.55; x.fillStyle = fk > 0.02 ? "#B5432E" : ink; x.beginPath(); x.arc(q0[0], q0[1] + dy, rr, 0, 7); x.fill();
    if (fk > 0.15) {
      const t1 = "Fallen", t2 = "the dev sold the whole bag", lx = q0[0] + rr + 14, ly = q0[1] + dy;
      x.globalAlpha = Math.min(1, (fk - 0.15) * 4); x.font = `600 ${R / 13}px "Inter Tight"`; const w1 = x.measureText(t1).width; x.font = `400 ${R / 26}px "JetBrains Mono"`; const w2 = x.measureText(t2).width;
      const bw = Math.max(w1, w2) + 28, bh = R / 13 + R / 26 + 30, by = ly - bh / 2;
      x.fillStyle = PAPER; x.strokeStyle = "#B5432E"; x.lineWidth = 1.5; x.beginPath(); x.roundRect(lx, by, bw, bh, 6); x.fill(); x.stroke();
      x.fillStyle = "#B5432E"; x.textBaseline = "top"; x.font = `600 ${R / 13}px "Inter Tight"`; x.fillText(t1, lx + 14, by + 10);
      x.fillStyle = "#6a665f"; x.font = `400 ${R / 26}px "JetBrains Mono"`; x.fillText(t2, lx + 14, by + 16 + R / 13);
    }
  }
  x.globalAlpha = 1;
  for (const { q, s, i, rad, k } of out) {
    let a = labels * Math.min(1, k); if (measure != null) a *= Math.abs(Math.asin(Math.max(-1, Math.min(1, (cy - q[1]) / R))) - measure) < 0.18 ? 1 : 0.3;
    if (named != null && named !== i && !s.r.pass) a *= 0.25;
    x.globalAlpha = a; const lx = q[0] + rad + 10;
    if (named === i) {
      const t1 = nt ? nt[0] : "Named · signal", t2 = nt ? nt[1] : "every check passed";
      x.font = `600 ${R / 13}px "Inter Tight"`; const w1 = x.measureText(t1).width; x.font = `400 ${R / 26}px "JetBrains Mono"`; const w2 = x.measureText(t2).width;
      const bw = Math.max(w1, w2) + 28, bh = R / 13 + R / 26 + 30, by = q[1] - bh / 2;
      x.fillStyle = PAPER; x.strokeStyle = ink; x.lineWidth = 1.5; x.beginPath(); x.roundRect(lx, by, bw, bh, 6); x.fill(); x.stroke();
      x.fillStyle = ink; x.textBaseline = "top"; x.font = `600 ${R / 13}px "Inter Tight"`; x.fillText(t1, lx + 14, by + 10);
      x.fillStyle = "#6a665f"; x.font = `400 ${R / 26}px "JetBrains Mono"`; x.fillText(t2, lx + 14, by + 16 + R / 13);
    } else if (s.r.pass) { x.fillStyle = ink; x.font = `600 ${Math.max(13, R / 20)}px "Inter Tight"`; x.textBaseline = "middle"; x.fillText("$" + s.r.symbol + "  · signal", lx, q[1]); }
    else { x.fillStyle = "#7a766f"; x.font = `500 ${Math.max(11, R / 28)}px "JetBrains Mono"`; x.textBaseline = "middle"; x.fillText(s.r.symbol, lx, q[1]); }
  }
  x.globalAlpha = 1;
}
const NAMED = STARS.findIndex((s) => s.r.pass);
// rotation that brings star i to the front, slightly left of centre
const faceY = (i, off = -0.25) => { const p = STARS[i].p; return off - Math.atan2(p[0], p[2]); };
const FX = Math.asin(STARS[NAMED].p[1]) * 0.85 - 0.2;  // tilt so the named star sits a little above the equator

const ROWS = D.rows.map((r) => ({ ...r, st: r.pass ? "Named" : r.devRugged ? "Fallen" : "Dust" }));
const SCENES = {
  intro: { dur: 11, html: () => `<canvas class="gl"></canvas>
      <div class="abs" style="left:130px;top:230px;width:760px"><p class="mono f" id="a">Meet</p>
      <div class="f" id="b" style="margin-top:22px">${lock(INK, 96)}</div>
      <h2 class="f" id="c" style="margin-top:46px">Every Pons launch, charted.<br><span>Only the signal gets a name.</span></h2>
      <p class="url f" id="d">signalaiagent.com</p></div>`,
    at(t) {
      const k = eio(t / 3.2);
      globe($(".gl"), { cx: 800 + 420 * eio((t - 2.2) / 2), cy: 450, R: 120 + 240 * k, ry: t * 0.22, dust: clamp(t / 1.5), named: t > 6.5 ? NAMED : null, rx: -0.32 + (FX + 0.32) * eio((t - 5) / 2) });
      show($("#a"), t, 3.6); show($("#b"), t, 4.0, 0.9, 24); show($("#c"), t, 5.4); show($("#d"), t, 7.4);
    } },
  signal: { dur: 9, html: () => `<canvas class="gl"></canvas>
      <div class="abs" style="left:110px;top:150px;width:700px"><p class="mono f" id="k">What a name means</p>
      <h2 class="f" id="h" style="margin-top:16px">A name is earned.<br><span>Every check, passed.</span></h2>
      <ul class="ok">${["The dev still holds", "No bundled wallets at launch", "A fair creator tax", "A real X account behind it", "New buyers still arriving"].map((l) => `<li class="f"><i></i>${l}</li>`).join("")}</ul>
      <p class="fine f" id="n">Miss one, and the star stays dust. A name is a reading of the chain, not advice.</p></div>${foot()}`,
    at(t) {
      globe($(".gl"), { cx: 1260, cy: 450, R: 310, ry: faceY(NAMED, -0.4) - 1.4 + 1.4 * eio(t / 4.5), named: t > 5 ? NAMED : null, rx: FX });
      show($("#k"), t, 0.2); show($("#h"), t, 0.6); $$(".ok li").forEach((el, i) => show(el, t, 1.8 + i * 0.5, 0.6, 12)); show($("#n"), t, 5.4);
    } },
  ask: { html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:140px;width:720px"><p class="mono">Ask the map</p>
      <h2 style="margin-top:16px">Paste any CA.<br><span>Get a reading.</span></h2>
      <div class="chat"><div class="u">0x… paste a Pons token</div>
      <div class="a"><span class="av">${D.mark}</span><p>The dev sold the whole bag four minutes after launch and holds nothing. Six bundled wallets bought 18% of the supply. This one stays dust.</p></div>
      <div class="box">Ask Signal, or paste a token CA<i>→</i></div></div></div>${foot()}`,
    at() { globe($(".gl"), { cx: 1370, cy: 450, R: 300, ry: 2.1, dust: 0.8 }); } },

  // ---------- profile ----------
  avatar: { w: 400, h: 400, bg: INK, html: () => `<div class="center">${mark(PAPER, 250)}</div>`, at() {} },
  banner: { w: 1500, h: 500, html: () => `<canvas class="gl"></canvas>
      <div class="abs" style="left:110px;top:118px">${lock(INK, 74)}<p class="tag" style="margin-top:30px">Map the noise. <span>Name the signal.</span></p>
      <p class="mono" style="margin-top:18px">Every Pons launch on Robinhood Chain · signalaiagent.com</p></div>`,
    at() { globe($(".gl"), { cx: 1190, cy: 262, R: 300, ry: faceY(NAMED, -0.55), named: NAMED, rx: FX }); } },
  og: { w: 1200, h: 630, html: () => `<canvas class="gl"></canvas>
      <div class="abs" style="left:80px;top:200px">${lock(INK, 66)}<p class="tag" style="margin-top:28px;font-size:40px">Map the noise.<br><span>Name the signal.</span></p></div>`,
    at() { globe($(".gl"), { cx: 950, cy: 315, R: 270, ry: faceY(NAMED, -0.5), named: NAMED, rx: FX }); } },

  // ---------- videos ----------
  how: { dur: 15, html: () => `<canvas class="gl"></canvas>
      <div class="abs" style="left:110px;top:150px;width:600px"><p class="mono">How Signal Agent reads Pons</p><h2 style="margin-top:16px">Map the noise.<br><span>Name the signal.</span></h2>
      <div class="steps">${[["Chart", "Every Pons launch appears on the map the block it happens."], ["Measure", "Did the dev dump? Bundled wallets? A fake X? Are buyers still arriving?"], ["Name", "Only the ones that truly shine get a name, with every reason."]].map(([a, b], i) => `<div class="st"><span>0${i + 1}</span><b>${a}</b><p>${b}</p></div>`).join("")}</div><div class="meter"><i></i></div></div>${foot()}`,
    at(t) {
      const step = Math.min(2, Math.floor(t / 5)), lt = t - step * 5;
      $$(".st").forEach((el, i) => el.classList.toggle("on", i === step)); $(".meter i").style.transform = `scaleX(${clamp(t / 14.5)})`;
      const ry0 = t * 0.5, ry2 = faceY(NAMED, -0.3);
      const ryF = step < 2 ? ry0 : (() => { const a = 10 * 0.5, d = ((ry2 - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * eio(lt / 2); })();
      globe($(".gl"), { cx: 1150, cy: 470, R: step === 2 ? 330 + 40 * eio(lt / 2) : 330, ry: ryF,
        pop: (i) => (step === 0 ? clamp((lt - 0.3 - i * 0.12) / 0.5) * (1 + 0.3 * Math.sin(clamp((lt - 0.3 - i * 0.12) / 0.5) * Math.PI)) : 1),
        ring: step === 1 ? Math.sin(lt * 1.3) * 1.1 : null, measure: step === 1 ? Math.sin(lt * 1.3) * 1.1 : null, dust: step === 1 ? 0.6 : 1, named: step === 2 && lt > 1.6 ? NAMED : null, rx: step === 2 ? -0.32 + (FX + 0.32) * eio(lt / 2) : -0.32 });
    } },
  lore: { w: 1600, h: 900, bg: INK, html: () => `<canvas class="gl"></canvas><div class="center" style="text-align:center"><h1 style="color:${PAPER}">Every launch is a star.<br><span style="color:#8F8A81">Only a few get a name.</span></h1></div>${foot(true)}`,
    at() { globe($(".gl"), { cx: 800, cy: 450, R: 400, ry: 0.6, ink: PAPER, dust: 0.55, lines: 0.6, labels: 0 }); } },
  stats: { html: () => `<div class="abs" style="left:110px;top:110px;right:110px"><p class="mono">Today on the map · ${D.date}</p><h2 style="margin-top:16px">${D.launches} launches charted.<br><span>Most will never get a name.</span></h2>
      <div class="tiles">${[[D.launches, "Pons launches charted today, every one read the block it happened"], [`${D.dumped} of ${ROWS.length}`, "of the newest launches: the dev already sold the whole bag"], [`${ROWS.filter((r) => r.pass).length} of ${ROWS.length}`, "of the newest launches passed every check and got a name"]].map(([a, b]) => `<div><b>${a}</b><p>${b}</p></div>`).join("")}</div></div>${foot()}`, at() {} },
  domain: { html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:270px"><p class="mono">Where the map lives</p><p class="url" style="font-size:96px;margin-top:22px">signalaiagent.com</p><p class="tag" style="margin-top:26px">Every Pons launch, charted. <span>Only the signal gets a name.</span></p></div>${foot()}`,
    at() { globe($(".gl"), { cx: 1420, cy: 450, R: 360, ry: faceY(NAMED, -0.9), named: null }); } },
  token: { html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:140px;width:720px"><p class="mono">Token</p><h2 style="margin-top:16px">Own a piece<br><span>of the map.</span></h2>
      <p class="lead">Hold 0.1% of the token supply and sign once with your wallet: every tool opens. Signing is free and sends nothing. The Pons Launchpad stays free for everyone.</p>
      <dl class="facts"><div><dt>Chain</dt><dd>Robinhood Chain</dd></div><div><dt>Launched on</dt><dd>Pons</dd></div><div><dt>Unlock</dt><dd>0.1% of supply</dd></div><div><dt>Contract</dt><dd>${D.ca}</dd></div></dl></div>${foot()}`,
    at() { globe($(".gl"), { cx: 1330, cy: 450, R: 300, ry: faceY(NAMED, -0.5), named: NAMED, rx: FX }); } },
  tools: { bg: INK, html: () => `<div class="abs" style="left:110px;top:100px;right:110px;color:${PAPER}"><p class="mono" style="color:#8F8A81">Tools</p><h2 style="margin-top:16px;color:${PAPER}">Seven instruments <span style="color:#8F8A81">for the map.</span></h2>
      <div class="tg">${[["Scanner", "A full report on any token: rug risk, bundles, X check."], ["Launch Radar", "Every new launch, filtered live."], ["Sniper", "Manual, or let the agent buy the signal."], ["Fee Claimer", "Creator fees from one wallet or 200 accounts."], ["Pons Launchpad", "Launch from your own wallet. Always free."], ["Launch Kit", "Lore, bio, thread and launch post, written for you."], ["Agent Studio", "Design the AI agent of your own token."], ["Ask Signal →", "Not sure where to start? Ask the map."]].map(([a, b], i) => `<div><span>0${i + 1}</span><b>${a}</b><p>${b}</p></div>`).join("")}</div></div>${foot(true)}`, at() {} },
  dust: { bg: INK, html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:150px;width:760px;color:${PAPER}"><p class="mono" style="color:#8F8A81">What keeps a star from a name</p><h2 style="margin-top:16px;color:${PAPER}">Most stars stay dust.<br><span style="color:#8F8A81">Here is why.</span></h2>
      <ul class="whyl">${["The dev sold the whole bag", "Bundled wallets bought the supply at launch", "A fake or empty X account", "New buyers stopped arriving"].map((l, i) => `<li><span>0${i + 1}</span>${l}</li>`).join("")}</ul></div>${foot(true)}`,
    at() { globe($(".gl"), { cx: 1350, cy: 450, R: 330, ry: 1.4, ink: PAPER, dust: 0.6, lines: 0.6, labels: 0 }); } },
  // ---------- batch 2 ----------
  live: { html: () => `<canvas class="gl"></canvas>
      <div class="abs" style="left:110px;top:170px;width:760px"><p class="mono">Now live · Robinhood Chain</p>
      <div style="margin-top:26px">${lock(INK, 92)}</div>
      <h2 style="margin-top:44px">The token is live on Pons.<br><span>The map is open.</span></h2>
      <div class="pill">CA in the post <i>↓</i></div></div>${foot()}`,
    at() { globe($(".gl"), { cx: 1300, cy: 450, R: 340, ry: faceY(NAMED, -0.45), named: NAMED, rx: FX }); } },
  zoom: { dur: 10, html: () => `<canvas class="gl"></canvas><div class="center" style="text-align:center"><h1 class="f" id="h">Every launch is a star.<br><span>Only a few get a name.</span></h1></div>
      <div class="abs f" id="u" style="left:0;right:0;bottom:120px;text-align:center"><p class="url" style="margin:0">signalaiagent.com</p></div>`,
    at(t) {
      const z = Math.pow(eio(t / 6), 2.2), fade = 1 - clamp((t - 4.5) / 1.5);
      globe($(".gl"), { cx: 800, cy: 450, R: 300 + 4200 * z, ry: t * 0.18, lines: fade, labels: 0, dust: 0.25 + 0.5 * fade });
      show($("#h"), t, 5.6, 0.9, 24); show($("#u"), t, 7.2);
    } },
  pulse: { dur: 12, html: () => `<canvas class="gl"></canvas>
      <div class="abs" style="left:110px;top:200px;width:640px"><p class="mono">Pons today · ${D.date}</p>
      <div class="big" id="n">0</div><p class="tag" style="margin-top:10px">launches charted. <span>One new star about every ${D.every} seconds.</span></p></div>${foot()}`,
    at(t) {
      $("#n").textContent = Math.round(D.launchesN * eio(t / 9)).toLocaleString("en-US");
      globe($(".gl"), { cx: 1220, cy: 450, R: 330, ry: t * 0.12, labels: 0, pop: (i) => clamp((t - 0.4 - i * 0.3) / 0.4) });
    } },
  checks: { html: () => `<div class="abs" style="left:110px;top:110px;right:110px"><p class="mono">On every launch, the block it happens</p>
      <h2 style="margin-top:16px">Four questions. <span>Every star.</span></h2>
      <div class="q4">${[["The dev", "Did the dev sell the bag? A dev who sold and still holds is fine. A dev who sold everything is not."], ["The bundles", "Did a handful of wallets buy the supply in the first blocks?"], ["The X", "Is there a real account behind it, or an empty one made today?"], ["The buyers", "Are new buyers still arriving, or did it stop growing?"]].map(([a, b], i) => `<div><span>0${i + 1}</span><b>${a}</b><p>${b}</p></div>`).join("")}</div></div>${foot()}`, at() {} },
  growth: { html: () => `<div class="abs" style="left:110px;top:110px;right:110px"><p class="mono">How the radar ranks</p>
      <h2 style="margin-top:16px">Not how many.<br><span>How fast.</span></h2>
      <div class="gr">${[["10 minutes old", "20 buyers", "Two new wallets a minute, still arriving.", "Signal", 20, 1], ["45 minutes old", "43 buyers", "No new buyer in the last 15 minutes.", "Dust", 43, 0]].map(([a, b, c, d, n, ok]) => `<div class="${ok ? "ok" : ""}"><p class="mono">${a}</p><b>${b}</b><div class="dots">${Array.from({ length: n }, (_, i) => `<i style="opacity:${ok ? 1 : i < 35 ? 1 : 0.2}"></i>`).join("")}</div><p>${c}</p><span>${d}</span></div>`).join("")}</div></div>${foot()}`, at() {} },
  unlock: { html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:130px;width:760px"><p class="mono">Holder access</p>
      <h2 style="margin-top:16px">Three steps.<br><span>Every tool opens.</span></h2>
      <ol class="steps3">${[["Hold 0.1%", "of the token supply in one wallet."], ["Connect", "that wallet on signalaiagent.com."], ["Sign once", "a short message. Free, and it sends nothing."]].map(([a, b], i) => `<li><span>0${i + 1}</span><b>${a}</b> ${b}</li>`).join("")}</ol>
      <p class="fine">Signal Agent never asks for your keys or seed phrase.</p></div>${foot()}`,
    at() { globe($(".gl"), { cx: 1360, cy: 450, R: 300, ry: 3.2, labels: 0 }); } },
  free: { bg: INK, html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:260px;width:820px;color:${PAPER}"><p class="mono" style="color:#8F8A81">Pons Launchpad</p>
      <h1 style="margin-top:18px;color:${PAPER}">Launch on Pons.<br><span style="color:#8F8A81">Free. Always.</span></h1>
      <p class="tag" style="margin-top:28px;color:#A39E94;font-size:26px">From your own wallet. No token needed, no fee from us.</p></div>${foot(true)}`,
    at() { globe($(".gl"), { cx: 1380, cy: 450, R: 300, ry: 0.9, ink: PAPER, dust: 0.55, lines: 0.6, labels: 0 }); } },
  agent: { html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:230px;width:780px"><p class="mono">What Signal Agent is</p>
      <h1 style="margin-top:18px">An agent,<br><span>not a feed.</span></h1>
      <p class="lead" style="font-size:24px;max-width:640px">It reads the chain, weighs every launch, and tells you why. In plain words, with every reason.</p></div>${foot()}`,
    at() { globe($(".gl"), { cx: 1330, cy: 450, R: 320, ry: faceY(NAMED, -0.45), named: NAMED, rx: FX }); } },
  never: { bg: INK, html: () => `<canvas class="gl"></canvas><div class="center" style="text-align:center"><h1 style="color:${PAPER}">The map never sleeps.<br><span style="color:#8F8A81">Every block. Every launch.</span></h1></div>${foot(true)}`,
    at() { globe($(".gl"), { cx: 800, cy: 450, R: 380, ry: 2.4, ink: PAPER, dust: 0.45, lines: 0.5, labels: 0 }); } },
  after: { html: () => `<canvas class="gl"></canvas>
      <div class="abs" style="left:110px;top:120px;width:780px"><p class="mono">Launched · Pons · Robinhood Chain</p>
      <h1 style="margin-top:20px">We're live.<br><span>The map is open.</span></h1>
      <ol class="steps3" style="margin-top:44px">${[["Buy", "on Pons. CA in the post."], ["Hold 0.1%", "of the supply in one wallet."], ["Sign once", "on signalaiagent.com. Every tool opens."]].map(([a, b], i) => `<li><span>0${i + 1}</span><b>${a}</b> ${b}</li>`).join("")}</ol>
      <div class="pill" style="margin-top:40px">CA in the post <i>↓</i></div></div>${foot()}`,
    at() { globe($(".gl"), { cx: 1320, cy: 450, R: 340, ry: faceY(NAMED, -0.45), named: NAMED, rx: FX }); } },
  // ---------- batch 3 ----------
  scanner: { html: () => `<div class="abs" style="left:110px;top:110px;width:640px"><p class="mono">Scanner</p><h2 style="margin-top:16px">One CA.<br><span>One reading.</span></h2>
      <p class="lead">Paste any Pons token and get the full picture in seconds: the dev, the bundles, the X account, the buyers, and a rug risk score from 0 to 100.</p></div>
      <div class="card"><div class="ch"><span class="mono">Reading · a Pons token · 6 min old</span><b class="rk">rug risk <i>82</i>/100</b></div>
      <div class="bar"><i style="width:82%"></i></div>
      <ul>${[["cb", "Dev", "sold the whole bag 4 minutes in, holds 0%"], ["cb", "Bundles", "6 wallets bought 18% in the first block"], ["cg", "X", "a real account, 2 years old"], ["cb", "Buyers", "no new buyer in 15 minutes"]].map(([c, a, b]) => `<li class="${c}"><i></i><b>${a}</b><span>${b}</span></li>`).join("")}</ul>
      <p class="vd">Verdict · <b>Fallen</b></p></div>${foot()}`, at() {} },
  sniper: { bg: INK, html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:150px;width:760px;color:${PAPER}"><p class="mono" style="color:#8F8A81">Sniper</p>
      <h2 style="margin-top:16px;color:${PAPER}">Let the agent<br><span style="color:#8F8A81">buy the signal.</span></h2>
      <ul class="whyl">${["Manual: paste a CA and buy in one click", "Agent mode: it buys only what passes every check", "Your wallet, your size, your limits"].map((l, i) => `<li><span>0${i + 1}</span>${l}</li>`).join("")}</ul></div>${foot(true)}`,
    at() { globe($(".gl"), { cx: 1360, cy: 450, R: 320, ry: 2.8, ink: PAPER, dust: 0.55, lines: 0.6, labels: 0 }); } },
  fees: { html: () => `<div class="abs" style="left:110px;top:150px;right:110px"><p class="mono">Fee Claimer</p><h2 style="margin-top:16px">Creator fees,<br><span>from every wallet at once.</span></h2>
      <div class="tiles">${[["1 click", "to claim the creator fees of one wallet"], ["200", "accounts from one seed, scanned and claimed in one go"], ["Yours", "every claim goes straight to your own wallet"]].map(([a, b]) => `<div><b>${a}</b><p>${b}</p></div>`).join("")}</div></div>${foot()}`, at() {} },
  kit: { html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:140px;width:760px"><p class="mono">Launch Kit</p><h2 style="margin-top:16px">Your launch,<br><span>written for you.</span></h2>
      <div class="chips">${["Lore", "Tagline", "Bio", "X thread", "Launch post"].map((c) => `<span>${c}</span>`).join("")}</div>
      <p class="lead">Tell Signal Agent the idea. Get everything a Pons launch needs to say, in one voice.</p></div>${foot()}`,
    at() { globe($(".gl"), { cx: 1360, cy: 450, R: 300, ry: 1.7, labels: 0 }); } },
  studio: { html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:150px;width:760px"><p class="mono">Agent Studio</p><h2 style="margin-top:16px">Give your token<br><span>its own agent.</span></h2>
      <p class="lead">Name it, give it a voice and a lore, and let it answer for your launch. Built on the same engine that reads every Pons launch.</p></div>${foot()}`,
    at() { globe($(".gl"), { cx: 1330, cy: 450, R: 320, ry: faceY(NAMED, -0.45), named: NAMED, rx: FX }); } },
  noise: { html: () => `<div class="abs" style="left:110px;top:110px;width:620px"><p class="mono">What the map sees</p><h2 style="margin-top:16px">Most launches<br><span>are noise.</span></h2>
      <p class="lead">Every dot is a launch. The dark ones passed every check. Signal Agent finds them so you don't have to read them all.</p></div>
      <div class="grid100">${Array.from({ length: 140 }, (_, i) => `<i class="${[17, 58, 103].includes(i) ? "on" : ""}"></i>`).join("")}</div>${foot()}`, at() {} },
  fallen: { dur: 9, html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:170px;width:640px"><p class="mono f" id="k">Fallen</p>
      <h2 class="f" id="h" style="margin-top:16px">The dev sold.<br><span>The star falls.</span></h2>
      <p class="lead f" id="l">When a dev sells the whole bag, Signal Agent marks the launch as fallen at once, with the reason, the block it happens.</p></div>${foot()}`,
    at(t) {
      globe($(".gl"), { cx: 1250, cy: 430, R: 320, ry: faceY(NAMED, -0.35) - 0.6 + 0.6 * eio(t / 3), rx: FX, fallen: NAMED, fk: eio((t - 3) / 2.5) });
      show($("#k"), t, 0.3); show($("#h"), t, 0.7); show($("#l"), t, 5.6);
    } },
  hype: { bg: INK, html: () => `<canvas class="gl"></canvas><div class="center" style="text-align:center"><h1 style="color:${PAPER}">Read the chain.<br><span style="color:#8F8A81">Not the hype.</span></h1></div>${foot(true)}`,
    at() { globe($(".gl"), { cx: 800, cy: 450, R: 390, ry: 4.1, ink: PAPER, dust: 0.45, lines: 0.5, labels: 0 }); } },
  faq: { html: () => `<div class="abs" style="left:110px;top:110px;right:110px"><p class="mono">Do I need to hold?</p><h2 style="margin-top:16px">Start free.<br><span>Hold to open everything.</span></h2>
      <div class="tiles">${[["Free", "The Pons Launchpad, for everyone, always"], ["3 / day", "free reads from the agent, no wallet needed"], ["0.1%", "of the supply, held and signed once: every tool opens"]].map(([a, b]) => `<div><b>${a}</b><p>${b}</p></div>`).join("")}</div></div>${foot()}`, at() {} },
  safe: { bg: INK, html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:200px;width:820px;color:${PAPER}"><p class="mono" style="color:#8F8A81">Safety</p>
      <h1 style="margin-top:18px;color:${PAPER}">Never your keys.</h1>
      <p class="tag" style="margin-top:26px;color:#A39E94;font-size:28px;max-width:720px">Signal Agent never asks for your seed phrase or private key. Unlocking is one signature that sends nothing and costs nothing.</p></div>${foot(true)}`,
    at() { globe($(".gl"), { cx: 1400, cy: 450, R: 300, ry: 5.2, ink: PAPER, dust: 0.5, lines: 0.55, labels: 0 }); } },
  // ---------- launch: the real token ----------
  launched: { dur: 13, html: () => `<canvas class="gl"></canvas>
      <div class="abs" style="left:110px;top:150px;width:820px"><p class="mono f" id="k">Live now · Pons · Robinhood Chain</p>
      <h1 class="f" id="h" style="margin-top:22px;font-size:120px">$SIGNAL<br><span>is live.</span></h1>
      <p class="tag f" id="t" style="margin-top:26px">The map is open. <span>Every Pons launch, charted.</span></p>
      <div class="caw f" id="c"><span class="mono">CA</span><b id="ca"></b></div>
      <p class="mono f" id="f" style="margin-top:26px;letter-spacing:.08em">Hold 0.1% · sign once · every tool opens · signalaiagent.com</p></div>${foot()}`,
    at(t) {
      const k = eio(t / 3);
      globe($(".gl"), { cx: 1300, cy: 450, R: 160 + 180 * k, ry: t * 0.16 + faceY(NAMED, -0.45) - 13 * 0.16, rx: FX, dust: clamp(t / 1.2), labels: clamp((t - 3.4) / 0.6),
        named: t > 3.4 ? NAMED : null, nt: ["$SIGNAL · live", "Signal Agent · on Pons"] });
      show($("#k"), t, 1.6); show($("#h"), t, 2.2, 0.9, 30); show($("#t"), t, 3.6); show($("#c"), t, 4.6); show($("#f"), t, 9.6);
      const CA = D.launchCa, n = Math.round(CA.length * clamp((t - 5) / 3.5)); $("#ca").textContent = CA.slice(0, n) + (n < CA.length && t > 5 ? "▍" : "");
    } },
  // ---------- batch 4: gimmicks + paydex ----------
  dropca: { html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:170px;width:820px"><p class="mono">Open call</p>
      <h1 style="margin-top:18px">Drop your CA.<br><span>We read it.</span></h1>
      <p class="tag" style="margin-top:28px;font-size:28px">Reply with any Pons token. <span>Signal Agent answers with the reading: dev, bundles, X, buyers.</span></p>
      <div class="pill" style="margin-top:40px">Reply below <i>↓</i></div></div>${foot()}`,
    at() { globe($(".gl"), { cx: 1360, cy: 450, R: 320, ry: 0.4, labels: 0 }); } },
  quiz: { html: () => `<div class="abs" style="left:110px;top:100px;right:110px"><p class="mono">Quiz</p><h2 style="margin-top:16px">Signal or dust? <span>Reply A or B.</span></h2>
      <div class="ab">${[["A", [["Age", "12 min"], ["Buyers", "31, still arriving"], ["Dev", "sold 40%, still holds"], ["Bundles", "none"], ["X", "8 months old"]]], ["B", [["Age", "12 min"], ["Buyers", "88, none new in 10 min"], ["Dev", "holds 0%"], ["Bundles", "5 wallets, 22%"], ["X", "made yesterday"]]]].map(([k, rows]) => `<div><b class="k">${k}</b><dl>${rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("")}</dl></div>`).join("")}</div>
      <p class="fine" style="margin-top:28px">Answer tomorrow. Illustration, not a real token.</p></div>${foot()}`, at() {} },
  gm: { bg: INK, html: () => `<canvas class="gl"></canvas><div class="center" style="text-align:center"><div><h1 style="color:${PAPER};font-size:150px">gm.</h1><p class="tag" style="margin-top:18px;color:#8F8A81">The map didn't sleep. <span style="color:${PAPER}">Did you?</span></p></div></div>${foot(true)}`,
    at() { globe($(".gl"), { cx: 800, cy: 450, R: 400, ry: 3.6, ink: PAPER, dust: 0.4, lines: 0.45, labels: 0 }); } },
  timeline: { html: () => `<div class="abs" style="left:110px;top:100px;right:110px"><p class="mono">Pick one</p><h2 style="margin-top:16px">Your timeline <span>vs. the map.</span></h2>
      <div class="vs"><div><p class="mono">Your timeline</p><ul>${["100x incoming 🚀", "dev is based trust", "LFG ser", "this one is different", "last chance before CEX"].map((l) => `<li>${l}</li>`).join("")}</ul></div>
      <div class="on"><p class="mono">Signal Agent</p><ul>${["Dev still holds 3.6%", "No bundled wallets", "23 new buyers in 15 min", "Real X account, 8 months", "Named · every check passed"].map((l) => `<li>${l}</li>`).join("")}</ul></div></div></div>${foot()}`, at() {} },
  lost: { html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:200px;width:820px"><p class="mono">Daily report</p>
      <h1 style="margin-top:18px;font-size:78px">Lost: 1,000 launches.<br><span>Found: the few that matter.</span></h1>
      <p class="tag" style="margin-top:28px;font-size:28px">Signal Agent reads all of them, <span>so you don't have to.</span></p></div>${foot()}`,
    at() { globe($(".gl"), { cx: 1420, cy: 450, R: 330, ry: faceY(NAMED, -0.8), named: NAMED, rx: FX }); } },
  paydex: { bg: INK, html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:220px;width:860px;color:${PAPER}"><p class="mono" style="color:#8F8A81">$SIGNAL</p>
      <h1 style="margin-top:18px;color:${PAPER};font-size:140px">Paydex.<br><span style="color:#8F8A81">Soon.</span></h1>
      <p class="tag" style="margin-top:30px;color:#A39E94;font-size:28px">Profile, banner and socials on the charts. The map gets its page.</p></div>${foot(true)}`,
    at() { globe($(".gl"), { cx: 1380, cy: 450, R: 330, ry: faceY(NAMED, -0.5), rx: FX, ink: PAPER, dust: 0.5, lines: 0.55, labels: 0 }); } },
  loading: { dur: 10, bg: INK, html: () => `<div class="center" style="color:${PAPER}"><div style="width:900px"><p class="mono" style="color:#8F8A81">$SIGNAL · paydex</p>
      <p class="ld" id="p">0%</p><div class="lbar"><i id="b"></i></div><p class="mono f" id="s" style="margin-top:28px;color:${PAPER};font-size:22px">Soon.</p></div></div>${foot(true)}`,
    at(t) { const p = t < 6 ? 99 * eio(t / 6) : 99; $("#p").textContent = (t > 7.2 ? "99%" : Math.floor(p) + "%"); $("#b").style.width = p + "%";
      $("#b").style.opacity = t > 6 ? 0.55 + 0.45 * Math.abs(Math.cos((t - 6) * 3)) : 1; show($("#s"), t, 7); } },
  // ---------- batch 5: gimmicks ----------
  bingo: { html: () => `<div class="abs" style="left:110px;top:90px;width:560px"><p class="mono">Pons edition</p><h2 style="margin-top:16px">Rug bingo.<br><span>How many did you get this week?</span></h2>
      <p class="tag" style="margin-top:26px;font-size:24px">Quote with your score. <span>Signal Agent flags every one of these before you buy.</span></p></div>
      <div class="bingo">${["Dev sold the whole bag", "X made yesterday", "5 wallets, 22% at launch", "“dev is based, trust”", "Buyers stopped at 10 min", "“100x incoming 🚀”", "Tax raised after launch", "“just a dip, hold”", "FREE · read the chain first"].map((l, i) => `<div class="${[0, 4, 8].includes(i) ? "x" : ""}${i === 8 ? " fr" : ""}">${l}</div>`).join("")}</div>${foot()}`, at() {} },
  devtext: { html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:100px;width:760px"><p class="mono">What they say vs. what the chain says</p>
      <div class="dm"><p class="me">ser are you selling?</p><p class="dv">never. i'm here for the long run 🫡</p><p class="dv">locked in. trust</p><p class="tm">12:04</p></div>
      <div class="rd"><i>${D.mark}</i><div><p class="mono">Signal Agent · 12:05</p><b>Dev holds 0%.</b><span>Sold the whole bag, 40 seconds ago.</span></div></div></div>${foot()}`,
    at() { globe($(".gl"), { cx: 1290, cy: 450, R: 290, ry: 0.9, labels: 0, dust: 0.8 }); } },
  receipt: { bg: INK, html: () => `<div class="abs" style="left:110px;top:200px;width:620px;color:${PAPER}"><p class="mono" style="color:#8F8A81">Be honest</p>
      <h1 style="margin-top:18px;color:${PAPER}">Your week,<br><span style="color:#8F8A81">itemised.</span></h1>
      <p class="tag" style="margin-top:28px;font-size:26px;color:#A39E94">Post yours. Next week, read the chain first.</p></div>
      <div class="rc"><p class="c">PONS · ROBINHOOD CHAIN<br>RECEIPT #0001</p><hr>
      ${[["Bought the top", "x3"], ["Trusted “dev is based”", "x4"], ["Ignored a fresh X", "x2"], ["Aped a bundled launch", "x1"], ["Checked the CA first", "x0"]].map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join("")}<hr>
      <div class="tot"><span>TOTAL</span><span>-87%</span></div><hr><p class="c">THANK YOU FOR BEING EXIT LIQUIDITY<br>next time: signalaiagent.com</p><p class="bc">${"|||| ||| | |||| || ||| | || |||| |".repeat(2)}</p></div>${foot(true)}`, at() {} },
  whichstar: { html: () => `<div class="abs" style="left:110px;top:90px;right:110px"><p class="mono">Tag yourself</p><h2 style="margin-top:16px">Which star are you? <span>Quote with yours.</span></h2>
      <div class="st3">${[["dust", "Dust", "Buys every launch. Reads none of them.", 0], ["fallen", "Fallen", "Was early. Then the dev sold.", 1], ["named", "Named", "Read the chain. Held the signal.", 2]].map(([c, n, d]) => `<div class="${c}"><i></i><b>${n}</b><p>${d}</p></div>`).join("")}</div></div>${foot()}`, at() {} },
  nobody: { bg: INK, html: () => `<canvas class="gl"></canvas><div class="abs" style="left:110px;top:220px;width:860px;color:${PAPER}">
      <p class="tag" style="color:#8F8A81;font-size:40px">nobody:</p><p class="tag" style="margin-top:24px;color:#8F8A81;font-size:40px">literally nobody:</p>
      <h1 style="margin-top:34px;color:${PAPER};font-size:76px">Signal Agent at 4 am,<br><span style="color:#8F8A81">reading launch #1,000.</span></h1></div>${foot(true)}`,
    at() { globe($(".gl"), { cx: 1360, cy: 450, R: 320, ry: faceY(NAMED, -0.6), rx: FX, ink: PAPER, dust: 0.5, lines: 0.5, named: NAMED, labels: 0, ring: 0.35 }); } },
};
const S = SCENES[new URLSearchParams(location.search).get("s")];
const W = S.w || 1600, Hh = S.h || 900;
document.body.style.cssText = `width:${W}px;height:${Hh}px;background:${S.bg || PAPER};color:${S.bg === INK ? PAPER : INK}`;
document.body.innerHTML = S.html();
window.SCENE = { dur: S.dur || 0, w: W, h: Hh, seek: (t) => S.at(t) };
document.fonts.ready.then(() => S.at(S.dur || 99));
