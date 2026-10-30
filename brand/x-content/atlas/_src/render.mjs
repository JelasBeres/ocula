// node render.mjs png|mp4 scene...   -> ../png/<scene>.png, ../video/<scene>.mp4
import { chromium } from "/Users/sergiodyegogmail.com/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const [mode, ...names] = process.argv.slice(2), here = new URL(".", import.meta.url).pathname;
const K = here + "../../../../konten-x-signal-agent/", NUM = { avatar: "00", banner: "00", intro: "01", lore: "02", how: "03", dust: "04", signal: "05", stats: "06", ask: "07", tools: "08", domain: "09", token: "10", live: "11", zoom: "12", checks: "13", growth: "14", pulse: "15", unlock: "16", agent: "17", free: "18", never: "19", after: "20", scanner: "21", sniper: "22", fees: "23", kit: "24", studio: "25", noise: "26", fallen: "27", hype: "28", faq: "29", safe: "30", launched: "31", dropca: "32", quiz: "33", gm: "34", timeline: "35", lost: "36", paydex: "37", loading: "38", bingo: "39", devtext: "40", receipt: "41", whichstar: "42", nobody: "43" };
const fileOf = (s, ext) => (s === "og" ? here + "og." + ext : `${K}${NUM[s] || "99"}-${s}.${ext}`);
const b = await chromium.launch(); const errs = [];
const SIZE = { avatar: [400, 400, 2], banner: [1500, 500, 2], og: [1200, 630, 1] };
for (const s of names) {
  const [w, h, dpr] = SIZE[s] || [1600, 900, mode === "png" ? 1.5 : 1.2];
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr }); p.on("pageerror", (e) => errs.push(s + ": " + e.message));
  await p.goto(`file://${here}scenes.html?s=${s}`); await p.waitForLoadState("networkidle"); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  if (mode === "png") { await p.evaluate(() => window.SCENE.seek(window.SCENE.dur || 99)); await p.screenshot({ path: fileOf(s, "png") }); console.log("png", s); }
  else {
    const dur = await p.evaluate(() => window.SCENE.dur), fps = 30, dir = `${here}.frames-${s}`;
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    const total = Math.round((dur + 1.5) * fps);
    for (let i = 0; i < total; i++) { await p.evaluate((t) => window.SCENE.seek(t), Math.min(dur, i / fps)); await p.screenshot({ path: `${dir}/${String(i).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 }); }
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", `${dir}/%04d.jpg`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", fileOf(s, "mp4")]);
    fs.rmSync(dir, { recursive: true, force: true }); console.log("mp4", s, dur + "s");
  }
  await p.close();
}
console.log("errors", errs); await b.close();
