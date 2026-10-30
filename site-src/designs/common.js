// holder pass: sent with every request to this site (the server decides what it unlocks)
(() => {
  const f = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url, same = url.startsWith("/") || url.startsWith(location.origin);
    let pass = null; try { pass = localStorage.getItem("signal.pass"); } catch {}
    if (same && pass) { const h = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined)); h.set("x-signal-pass", pass); init = { ...init, headers: h }; }
    return f(input, init);
  };
})();
// ---------- shared page behaviour (every design) ----------
const g = (id) => document.getElementById(id), nf = (n) => Number(n).toLocaleString("en-US");
const hesc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const setText = (id, v) => { const el = g(id); if (el) el.textContent = v; };

// split headlines into masked lines; reveal everything once, staggered per section
document.querySelectorAll("[data-split]").forEach((el) => { el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map((l) => `<span class="ln"><span>${l}</span></span>`).join(""); });
document.querySelectorAll("main section").forEach((sec) => sec.querySelectorAll(".rv,[data-split]").forEach((el, i) => el.style.setProperty("--d", Math.min(i, 9) * 80 + "ms")));
const rio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } }), { threshold: 0.12 });
document.querySelectorAll(".rv,[data-split]").forEach((el) => (RM ? el.classList.add("in") : rio.observe(el)));

// manifesto: words light up with scroll
const mani = g("mani"), KEY = /^(noise|traps|on-chain|plain|words|never|watches)/i;
let words = [];
if (mani) {
  mani.innerHTML = mani.textContent.trim().split(/(\s+)/).map((w) => (/\s/.test(w) ? w : `<span class="w${KEY.test(w.replace(/[.,—]/g, "")) ? " k" : ""}">${hesc(w)}</span>`)).join("");
  words = [...mani.querySelectorAll(".w")];
}
const maniSec = g("manifesto");
function maniScroll() {
  if (!maniSec || !words.length) return;
  const r = maniSec.getBoundingClientRect(), span = r.height - innerHeight;
  const p = Math.max(0, Math.min(1, -r.top / (span || 1)));
  const n = RM ? words.length : Math.round(p * 1.2 * words.length);
  words.forEach((w, i) => w.classList.toggle("on", i < n));
}

// page scroll: progress, header state, velocity (some designs feed it to the 3D object)
let lastY = scrollY, velocity = 0;
function pageScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  document.documentElement.style.setProperty("--sp", max > 0 ? (scrollY / max).toFixed(4) : 0);
  document.body.classList.toggle("scrolled", scrollY > 40);
  velocity = Math.min(1, Math.abs(scrollY - lastY) / 60); lastY = scrollY;
  maniScroll();
  window.onDesignScroll?.();
}
addEventListener("scroll", pageScroll, { passive: true });

// live numbers
async function status() {
  try {
    const j = await (await fetch("/api/status")).json();
    for (const id of ["nLaunch", "nLaunch2"]) setText(id, nf(j.index.recent));
    for (const id of ["nPicks", "nPicks2"]) setText(id, j.picks);
    if (j.index.indexedTo) for (const id of ["nBlock", "nBlock2"]) setText(id, "#" + nf(j.index.indexedTo));
    setText("hdrStat", j.index.ready ? "Online" : "Syncing");
  } catch { setText("hdrStat", "Offline"); }
}
status(); setInterval(() => !document.hidden && status(), 6000);
async function ticker() {
  try {
    const j = await (await fetch("/api/radar")).json(), rows = j.rows || [];
    if (!rows.length) return;
    setText("nPass", Math.round((rows.filter((r) => r.pass).length / rows.length) * 100) + "%");
    // radar pictures: every blip is a real launch (angle from its address, distance from its age)
    document.querySelectorAll("[data-blips]").forEach((box) => {
      box.innerHTML = rows.slice(0, 14).map((r) => {
        const ang = (parseInt(r.token.slice(2, 8), 16) % 360) * Math.PI / 180, rad = 8 + Math.min(1, r.ageSec / 3600) * 34;
        return `<i class="blip${r.pass ? "" : " bad"}" style="left:${50 + Math.cos(ang) * rad * 0.66}%;top:${50 + Math.sin(ang) * rad}%;animation-delay:${((ang / (2 * Math.PI)) * 3.2).toFixed(2)}s" title="$${hesc(r.symbol)}"></i>`;
      }).join("");
    });
    const tk = g("tick"); if (!tk) return;
    const items = rows.slice(0, 18).map((r) => {
      const age = r.ageSec < 3600 ? Math.max(1, Math.round(r.ageSec / 60)) + "m" : Math.round(r.ageSec / 3600) + "h";
      return `<span><b>$${hesc(r.symbol)}</b> ${age} · tax ${r.taxPct}% · curve ${r.progressPct.toFixed(1)}% · ${r.pass ? "<i>passed</i>" : `<em>${hesc(r.checks.find((c) => !c.ok)?.text || "flagged")}</em>`}</span>`;
    }).join("");
    tk.innerHTML = items + items;
  } catch {}
}
ticker(); setInterval(() => !document.hidden && ticker(), 15000);

// command bar: a CA scans, a word opens a tool
const WORDS = [[/scan|check|rug|report/, "scan"], [/radar|new|launches|feed/, "radar"], [/snip|buy|bot|pick/, "snipe"], [/fee|claim|seed/, "fees"], [/kit|lore|tagline|bio|post/, "kit"], [/agent|chat|persona/, "agent"], [/launch|create|deploy|token/, "launch"]];
g("cmd")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const v = g("cmdIn").value.trim(), low = v.toLowerCase(), tab = (t) => document.querySelector(`#tabs [data-t="${t}"]`)?.click();
  if (/^0x[0-9a-f]{40}$/i.test(v)) { tab("scan"); g("app").scrollIntoView({ behavior: "smooth" }); g("scanCa").value = v; g("scanForm").requestSubmit(); return; }
  const hit = WORDS.find(([re]) => re.test(low));
  if (hit) { tab(hit[1]); g("app").scrollIntoView({ behavior: "smooth" }); }
  else { g("cmdIn").value = ""; g("cmdIn").placeholder = "Try a 0x… address, or: radar, snipe, claim"; }
});
addEventListener("keydown", (e) => { if (e.key === "/" && g("cmdIn") && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); g("cmdIn").focus(); } });

// workspace title follows the open tool
const wsT = () => { const b = document.querySelector("#tabs button.on"); if (b && g("wsTitle")) g("wsTitle").textContent = b.querySelector(".tn")?.textContent || b.textContent; };
new MutationObserver(wsT).observe(g("tabs"), { attributes: true, subtree: true, attributeFilter: ["class"] });
