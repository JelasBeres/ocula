// ---------- Signal · Signal ----------
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const el = (id) => document.getElementById(id);
const GLYPH = document.querySelector(".brand .glyph").outerHTML;
const CA_RE = /^0x[0-9a-fA-F]{40}$/;
const shortCa = (a) => a.slice(0, 6) + "…" + a.slice(-4);
const ageOf = (s) => (s < 60 ? Math.max(1, Math.round(s)) + "s" : s < 3600 ? Math.round(s / 60) + "m" : Math.round(s / 3600) + "h");
const trim2 = (t) => String(t).replace(/(\d+\.\d{2})\d+/g, "$1");
const TOOLS = ["scan", "radar", "snipe", "fees", "launch", "kit", "agent"];

// ---------- conversation ----------
const thread = el("thread"), input = el("askIn"), send = el("send"), chatLog = [];
const grow = () => { input.style.height = "auto"; input.style.height = Math.min(160, input.scrollHeight) + "px"; send.disabled = !input.value.trim(); };
input.addEventListener("input", grow);
input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el("ask").requestSubmit(); } });
const scrollThread = () => thread.scrollTo({ top: thread.scrollHeight, behavior: REDUCE ? "auto" : "smooth" });
function addUser(text) { thread.insertAdjacentHTML("beforeend", `<div class="msg u"><div class="t">${hesc(text)}</div></div>`); }
function addAgent() { thread.insertAdjacentHTML("beforeend", `<div class="msg a"><span class="av">${GLYPH}</span><div class="t"><span class="typing"><i></i><i></i><i></i></span></div></div>`); scrollThread(); return thread.lastElementChild; }
const actBtn = (a) => a.unlock ? `<button class="btn solid" type="button" data-unlock>${hesc(a.label)}</button>` : a.scan ? `<a class="btn line" href="#app" data-scan="${hesc(a.scan)}">${hesc(a.label)}</a>`
  : a.snipe ? `<a class="btn line" href="#app" data-open="snipe" data-snipe-ca="${hesc(a.snipe)}">${hesc(a.label)}</a>`
  : `<a class="btn line" href="#app" data-open="${hesc(a.tool)}">${hesc(a.label)}</a>`;
function fill(m, text, actions = [], extra = "") {
  m.querySelector(".t").textContent = text;
  if (extra) m.insertAdjacentHTML("beforeend", extra);
  if (actions.length) m.insertAdjacentHTML("beforeend", `<div class="acts">${actions.map(actBtn).join("")}</div>`);
  scrollThread();
}
async function scanFlow(ca) {
  addUser(ca); const m = addAgent();
  try {
    const r = await fetch("/api/scan?ca=" + ca), j = await r.json();
    if (r.status === 402) { fill(m, j.error, [{ unlock: true, label: "Unlock as a holder" }]); refreshMe(); return; }
    if (!r.ok) throw new Error(j.error || "Scan failed.");
    const t = j.facts?.token || {}, order = ["high", "watch", "ok", "info"], flags = (j.flags || []).slice().sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level)).slice(0, 4);
    const logo = String(t.logo || "").replace(/^ipfs:\/\//, "https://gateway.pinata.cloud/ipfs/");
    const card = `<div class="rep"><div class="hd">${/^https:\/\//.test(logo) ? `<img src="${hesc(logo)}" alt="" onerror="this.remove()">` : ""}<div><b>${hesc(t.name || "Token")} · $${hesc(t.symbol || "?")}</b><br><span>${shortCa(ca)}</span></div>${j.risk ? `<span class="rk ${j.risk.level}">risk ${j.risk.score}</span>` : ""}</div>
      <ul>${flags.map((f) => `<li class="${hesc(f.level)}"><i></i><span><b>${hesc(f.title)}</b> · ${hesc(f.detail)}</span></li>`).join("")}</ul></div>`;
    const text = j.summary || (flags[0] ? `${flags[0].title}.` : "Here is what the chain shows.");
    fill(m, text, [{ scan: ca, label: "Full report" }, { snipe: ca, label: "Snipe it" }], card); refreshMe();
    chatLog.push({ role: "user", content: "Scan " + ca }, { role: "assistant", content: `${t.symbol}: ${text}` });
  } catch (e) { fill(m, e.message || "Signal could not read that token."); }
}
async function chatFlow(text) {
  addUser(text); chatLog.push({ role: "user", content: text }); const m = addAgent();
  try {
    const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: chatLog }) }), j = await r.json();
    if (r.status === 402) { fill(m, j.error, [{ unlock: true, label: "Unlock as a holder" }]); chatLog.pop(); refreshMe(); return; }
    if (!r.ok) throw new Error(j.error || "Signal could not answer.");
    fill(m, j.reply, j.actions || []); chatLog.push({ role: "assistant", content: j.reply }); refreshMe();
  } catch (e) { fill(m, e.message); chatLog.pop(); }
}
el("ask").addEventListener("submit", (e) => { e.preventDefault(); const v = input.value.trim(); if (!v) return; input.value = ""; grow(); CA_RE.test(v) ? scanFlow(v) : chatFlow(v); });
document.querySelectorAll("[data-ask]").forEach((c) => c.addEventListener("click", () => { input.value = c.dataset.ask; grow(); el("ask").requestSubmit(); }));
document.addEventListener("click", (e) => { const a = e.target.closest("[data-snipe-ca]"); if (a) setTimeout(() => { const mb = el("mbToken"); if (mb) mb.value = a.dataset.snipeCa; }, 50); });
function toChat(fn) { scrollTo({ top: 0, behavior: REDUCE ? "auto" : "smooth" }); setTimeout(fn, REDUCE ? 0 : 450); }

// ---------- tools open in a drawer ----------
const drawer = el("drawer");
function showDrawer() { if (!drawer.hidden) return; drawer.hidden = false; document.body.classList.add("drawer-open"); }
function closeDrawer() { if (drawer.hidden) return; drawer.hidden = true; document.body.classList.remove("drawer-open"); }
document.addEventListener("click", (e) => { if (e.target.closest('[data-open],[data-scan],a[href="#app"]') && !e.target.closest(".drawer")) showDrawer(); }, true);
el("dClose").addEventListener("click", closeDrawer);
drawer.addEventListener("click", (e) => { if (e.target === drawer) closeDrawer(); });
new MutationObserver(() => { const b = document.querySelector("#tabs button.on"); if (b) el("dTitle").textContent = b.querySelector(".tn")?.textContent || "Tools"; }).observe(el("tabs"), { attributes: true, subtree: true, attributeFilter: ["class"] });
if (TOOLS.includes(location.hash.slice(1)) || new URLSearchParams(location.search).get("ca")) showDrawer();
el("home").addEventListener("click", (e) => { e.preventDefault(); closeDrawer(); toChat(() => input.focus()); });

// ---------- holder access ----------
const LOCK_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>';
let me = { holder: false, launched: false, trialsLeft: 3 };
const store = { set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
document.querySelectorAll(".ws .tool[data-p]").forEach((t) => {
  if (t.dataset.p === "launch") return;
  const name = document.querySelector(`#tabs [data-t="${t.dataset.p}"] .tn`)?.textContent || "This tool";
  t.insertAdjacentHTML("afterbegin", `<div class="lock"><div>${LOCK_SVG}<b>${hesc(name)} is for token holders</b><p>Hold at least 0.1% of the token and unlock it with your wallet. The Pons Launchpad stays free for everyone.</p><button class="btn" type="button" data-unlock>Unlock</button></div></div>`);
});
async function refreshMe() {
  try { me = await (await fetch("/api/me")).json(); } catch {}
  document.body.classList.toggle("holder", !!me.holder);
  const hb = el("holderBtn");
  hb.textContent = me.holder ? (me.owner ? "Owner access" : "Holder · " + shortCa(me.address || "0x0000000000")) : "Holder access";
  hb.classList.toggle("on", !!me.holder);
  el("hint").textContent = me.holder ? "Full access. Ask Signal anything." : `${me.trialsLeft} free read${me.trialsLeft === 1 ? "" : "s"} left today. Hold the token for the full receiver.`;
}
const modal = el("modal");
function openModal() {
  el("mErr").textContent = "";
  el("mText").textContent = me.launched
    ? "Hold at least 0.1% of the token supply. Connect the wallet that holds it and sign a short message. Signing is free and sends nothing."
    : "Holder access opens when the token launches. The Pons Launchpad is free for everyone, today.";
  el("mSign").hidden = !me.launched || !window.ethereum;
  if (me.launched && !window.ethereum) el("mErr").textContent = "No browser wallet found. Open this page in MetaMask, Rabby or another wallet browser.";
  if (me.holder) { el("mText").textContent = "You're unlocked. Every tool is open in this browser for 24 hours."; el("mSign").hidden = true; }
  modal.hidden = false;
}
const closeModal = () => (modal.hidden = true);
el("holderBtn").addEventListener("click", openModal);
el("mClose").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
addEventListener("keydown", (e) => { if (e.key === "Escape") { modal.hidden ? closeDrawer() : closeModal(); } });
document.addEventListener("click", (e) => { if (e.target.closest("[data-unlock]")) { e.preventDefault(); openModal(); } });
async function unlockWith(body) {
  const r = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Could not unlock.");
  store.set("signal.pass", j.pass); await refreshMe(); openModal();
}
el("mSign").addEventListener("click", async () => {
  el("mErr").textContent = "";
  try {
    const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
    const message = `Unlock Signal Agent\nWallet: ${address}\nIssued: ${Date.now()}`;
    const signature = await window.ethereum.request({ method: "personal_sign", params: [message, address] });
    await unlockWith({ address, message, signature });
  } catch (e) { el("mErr").textContent = e.message || "Signing was cancelled."; }
});
el("ownerForm").addEventListener("submit", async (e) => { e.preventDefault(); el("mErr").textContent = ""; try { await unlockWith({ ownerKey: el("ownerKey").value.trim() }); el("ownerKey").value = ""; } catch (er) { el("mErr").textContent = er.message; } });
refreshMe().then(() => { if (!me.holder && !TOOLS.includes(location.hash.slice(1))) document.querySelector('#tabs [data-t="launch"]')?.click(); });

// buy buttons and the contract address once the token is set on the server
function buyButtons(tries = 0) { fetch("/api/status").then((r) => r.json()).then((j) => {
  if (!j.novaToken) return;
  // the ticker comes from the chain; the server reads it in the background the first time
  if (!j.tokenSymbol) { if (tries < 20) setTimeout(() => buyButtons(tries + 1), 2500); return; }
  const sym = "$" + j.tokenSymbol;
  if (el("tkSym")) el("tkSym").textContent = sym;
  for (const id of ["buyNova", "buy2"]) { const b = el(id); b.textContent = "Buy " + sym; b.removeAttribute("aria-disabled"); b.href = "https://ponsfamily.com/launchpad/" + j.novaToken; b.target = "_blank"; b.rel = "noopener"; }
  const c = el("caCopy"); c.textContent = shortCa(j.novaToken); c.title = "Copy " + j.novaToken;
  if (!c.dataset.on) c.dataset.on = 1, c.addEventListener("click", async () => { try { await navigator.clipboard.writeText(j.novaToken); c.textContent = "Copied"; setTimeout(() => (c.textContent = shortCa(j.novaToken)), 1400); } catch {} });
}).catch(() => {}); }
buyButtons();

// ---------- the live band: every launch as a line, signal bright, noise faint ----------
function wave(r) {
  // a deterministic shape per token: noise is jagged and flat, signal is a clean rising pulse
  let h = parseInt(r.token.slice(2, 10), 16); const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296);
  const W = 200, pts = [];
  for (let i = 0; i <= 40; i++) {
    const x = (i / 40) * W, u = i / 40;
    const y = r.pass ? 14 - Math.sin(u * Math.PI * 3) * Math.exp(-Math.pow((u - 0.6) * 3.2, 2)) * 11 : 14 + (rnd() - 0.5) * (r.devRugged ? 9 : 4);
    pts.push(`${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `<svg viewBox="0 0 200 28" preserveAspectRatio="none" aria-hidden="true"><path d="${pts.join("")}"/></svg>`;
}
const rowsEl = el("rows"), shown = new Set();
function paintBand(rows) {
  const fresh = new Set(rows.filter((r) => !shown.has(r.token)).map((r) => r.token));
  const first = !shown.size;
  rowsEl.innerHTML = rows.slice(0, 14).map((r) => {
    const bad = r.checks.filter((c) => !c.ok), why = r.pass ? (r.checks.find((c) => /grow/.test(c.text))?.text || "every check passed") : bad[0]?.text || "";
    const cls = r.pass ? "sig" : r.devRugged ? "int" : "";
    return `<button class="row ${cls}${!first && fresh.has(r.token) ? " fresh" : ""}" type="button" data-row="${r.token}"><span class="sym">$${hesc(r.symbol)}</span><span class="age">${ageOf(r.ageSec)}</span>${wave(r)}<span class="why">${hesc(trim2(why))}</span><span class="st">${r.pass ? "Signal" : r.devRugged ? "Interference" : "Noise"}</span></button>`;
  }).join("");
  rows.forEach((r) => shown.add(r.token));
  const sig = rows.filter((r) => r.pass).length;
  el("tRx").textContent = rows.length; el("tSig").textContent = sig; el("tNoise").textContent = rows.length - sig;
}
rowsEl.addEventListener("click", (e) => { const r = e.target.closest("[data-row]"); if (r) toChat(() => scanFlow(r.dataset.row)); });
async function pull() {
  try { const j = await (await fetch("/api/radar")).json(); const rows = j.rows || []; paintBand(rows); window.field?.set(rows); } catch {}
}
pull(); setInterval(() => !document.hidden && pull(), 12000);

el("askCell").addEventListener("click", (e) => { e.preventDefault(); toChat(() => input.focus()); });

// ---------- light concept: the tape and the scope counters ----------
const _paintBand = paintBand;
paintBand = function (rows) {
  _paintBand(rows);
  const sig = rows.filter((r) => r.pass).length; el("scSig").textContent = sig; el("scNoise").textContent = rows.length - sig;
  const top = rows.find((r) => r.pass), cap = document.querySelector(".sc.bl");
  cap.innerHTML = top ? `Signal · <b>$${hesc(top.symbol)}</b> · ${ageOf(top.ageSec)}` : "One line per launch";
  cap.classList.toggle("hot", !!top);
  const items = rows.slice(0, 16).map((r) => `<span><b>$${hesc(r.symbol)}</b> ${ageOf(r.ageSec)}${r.pass ? "<em>SIGNAL</em>" : r.devRugged ? "<i>INTERFERENCE</i>" : ""}</span>`).join("");
  if (items) el("tape").innerHTML = items + items;
};
