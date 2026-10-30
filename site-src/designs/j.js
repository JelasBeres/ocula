
// ---------- Atlas: the map of Pons ----------
import * as THREE from "three";
{
  const cv = document.getElementById("atlas"), box = document.getElementById("labels");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setClearColor(0xf5f3ec);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
  const globe = new THREE.Group(); scene.add(globe);
  const R = 2.25, INK = 0x161514;
  const dotC = document.createElement("canvas"); dotC.width = dotC.height = 64; { const x = dotC.getContext("2d"); x.fillStyle = "#fff"; x.beginPath(); x.arc(32, 32, 30, 0, Math.PI * 2); x.fill(); }
  const DOT = new THREE.CanvasTexture(dotC);
  // dust: every other launch of the day, a faint point on the sphere
  const N = 2600, p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * 2.399963; p.set([Math.cos(a) * r * R, y * R, Math.sin(a) * r * R], i * 3); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const dust = new THREE.PointsMaterial({ color: INK, size: 0.03, map: DOT, alphaTest: 0.3, transparent: true, opacity: 0.5, depthWrite: false });
  globe.add(new THREE.Points(dg, dust));
  // meridians and the equator, like an atlas
  const lm = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.12 }), eq = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.3 });
  const ring = (rot) => new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, R, R).getPoints(160).map((q) => (rot ? new THREE.Vector3(q.x, 0, q.y) : new THREE.Vector3(q.x, q.y, 0))));
  for (let k = 0; k < 6; k++) { const l = new THREE.Line(ring(false), lm); l.rotation.y = (k / 6) * Math.PI; globe.add(l); }
  globe.add(new THREE.Line(ring(true), eq));
  // the deep field: what you fly through once you zoom into the map
  const M = 2400, q = new Float32Array(M * 3);
  for (let i = 0; i < M; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.cbrt(Math.random()) * R * 0.97, s = Math.sqrt(1 - u * u); q.set([Math.cos(a) * s * r, u * r, Math.sin(a) * s * r], i * 3); }
  const qg = new THREE.BufferGeometry(); qg.setAttribute("position", new THREE.BufferAttribute(q, 3));
  const deep = new THREE.PointsMaterial({ color: INK, size: 0.016, map: DOT, alphaTest: 0.3, transparent: true, opacity: 0, depthWrite: false });
  globe.add(new THREE.Points(qg, deep));
  // the measuring ring: sweeps the globe in step 02
  const scan = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 8, 200), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0 }));
  scan.rotation.x = Math.PI / 2; scene.add(scan);

  // stars: the newest launches, placed by their address; signal ones are bright and named
  const stars = []; let key = "";
  function place(rows) {
    const list = rows.length >= 8 ? rows.slice(0, 22) : [...rows, ...DEMO_STARS.slice(0, 14 - rows.length)];
    const k = list.map((r) => r.token + r.pass).join();
    if (k === key) return; key = k;
    stars.forEach((s) => { globe.remove(s.m); s.el.remove(); }); stars.length = 0;
    list.forEach((r, i) => {
      const h = parseInt(r.token.slice(2, 10), 16) || i * 7919, u = (h % 1000) / 1000, v = ((h >>> 10) % 1000) / 1000;
      const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1) * 0.8 + 0.3, pos = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)).multiplyScalar(R * 1.01);
      const m = new THREE.Mesh(new THREE.SphereGeometry(r.pass ? 0.075 : 0.035, 16, 16), new THREE.MeshBasicMaterial({ color: r.pass ? INK : 0x8a857b }));
      m.position.copy(pos); globe.add(m);
      const el = document.createElement("div"); el.className = "lb " + (r.pass ? "sig" : "no"); el.textContent = (r.pass ? "$" : "") + r.symbol + (r.pass ? "  · signal" : "");
      const why = r.checks?.find((c) => /grow/.test(c.text))?.text || "every check passed"; el.dataset.why = trim2(why);
      box.appendChild(el); stars.push({ m, el, r, born: -9 });
    });
  }
  const DEMO_STARS = ["MBULL", "KABU", "PUPKINU", "FREE", "LOBSTERC", "GLWA", "AVON", "WORM", "ZETA", "NOAN", "CAPY", "HUSH", "TRACER", "ORBIX"].map((s, i) => ({ symbol: s, token: "0x" + ((i + 7) * 2654435761 >>> 0).toString(16).padStart(8, "0"), pass: i % 5 === 1, checks: [] }));
  place([]);
  window.field = { set: place };

  // drag to turn the map (hero and token only, never over the controls)
  let drag = null, dragV = 0;
  addEventListener("pointerdown", (e) => { if (!/hero|token/.test(mode) || e.target.closest("a,button,textarea,input,.convo,.nav,.tc,.drawer,.modal")) return; drag = e.clientX; });
  addEventListener("pointermove", (e) => { if (drag == null) return; dragV = (e.clientX - drag) * 0.005; drag = e.clientX; globe.rotation.y += dragV; }, { passive: true });
  addEventListener("pointerup", () => (drag = null));

  const mob = () => innerWidth < 1000;
  function size() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  addEventListener("resize", size); size();

  // ---------- scroll: zoom into the map, back out to measure, name one star, end where it began ----------
  let mode = "hero", hp = 0, stepN = 0, stepP = 0, focus = null;
  const S = { gx: 3.1, gy: 0, z: 10, cy: 1.1, spin: 0.0016, labels: 1, lines: 1, deep: 0, dust: 0.5, scan: 0 };
  const cur = { ...S };
  const ease = (x) => 1 - Math.pow(1 - x, 3), sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function targets() {
    const m = mob(), step = Math.max(0, stepN);
    if (mode === "hero") {
      const a = ease(Math.min(1, hp / 0.55)), b = Math.pow(Math.max(0, (hp - 0.5) / 0.5), 1.6);
      Object.assign(S, { gx: (m ? 0 : 3.1) * (1 - a), gy: (m ? 1.25 : 0) * (1 - a), z: hp < 0.5 ? 10 - 5.4 * a : 4.6 - 4.25 * b, cy: 1.1 * (1 - a), spin: 0.0016 + hp * 0.006,
        labels: 1 - sstep(0.3, 0.55, hp), lines: 1 - sstep(0.55, 0.85, hp), deep: sstep(0.45, 0.9, hp) * 0.55, dust: 0.5 - sstep(0.6, 0.95, hp) * 0.3, scan: 0 });
    } else if (mode === "band") Object.assign(S, { gx: 0, gy: 0, z: 0.35, cy: 0, spin: 0.004, labels: 0, lines: 0, deep: 0.55, dust: 0.2, scan: 0 });
    else if (mode === "how") Object.assign(S, { gx: m ? 0 : [2.3, 2.3, 1.7][step], gy: m ? 2.4 : 0, z: m ? [13, 12, 10][step] : [12, 9, 7][step], cy: [1.6, 0.9, 0.5][step], spin: [0.014, 0.003, 0][step], labels: 1, lines: 1, deep: 0, dust: [0.55, 0.3, 0.35][step], scan: step === 1 ? 0.55 : 0 });
    else if (mode === "token") Object.assign(S, { gx: m ? 0 : 3.1, gy: m ? 1.4 : 0, z: 10.5, cy: 1.1, spin: 0.0018, labels: 1, lines: 1, deep: 0, dust: 0.5, scan: 0 });
  }
  const v = new THREE.Vector3(), n = new THREE.Vector3(), toCam = new THREE.Vector3(), clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime(); targets();
    for (const k in S) cur[k] += (S[k] - cur[k]) * (k === "z" && mode === "hero" ? 0.2 : 0.07);
    globe.position.set(cur.gx, cur.gy, 0);
    cam.position.set(0, cur.cy, cur.z); cam.lookAt(0, cur.cy * 0.3 + cur.gy * 0.4, cur.z - 10);
    if (mode === "how" && stepN === 2 && focus) {
      // turn the globe so the named star faces us
      const lp = focus.m.position, want = Math.atan2(-cur.gx, cur.z) - Math.atan2(lp.x, lp.z);
      let d = ((want - globe.rotation.y) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; globe.rotation.y += d * 0.06;
      globe.rotation.x += ((Math.asin(Math.max(-1, Math.min(1, lp.y / R))) * 0.6) - globe.rotation.x) * 0.05;
    } else { if (drag == null) { globe.rotation.y += cur.spin + dragV; dragV *= 0.94; } globe.rotation.x += (0 - globe.rotation.x) * 0.05; }
    lm.opacity = 0.12 * cur.lines; eq.opacity = 0.3 * cur.lines; deep.opacity = cur.deep; dust.opacity = cur.dust;
    // the ring sweeps up and down the globe
    const la = Math.sin(t * 1.1) * 1.15; scan.position.set(cur.gx, cur.gy + Math.sin(la) * R, 0); scan.scale.setScalar(Math.cos(la) * R * 1.03 + 0.001); scan.material.opacity = cur.scan;
    stars.forEach((s, i) => {
      const k = Math.min(1, Math.max(0, (t - s.born) / 0.7)), pop = s.born < 0 ? 1 : 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);
      s.m.scale.setScalar(Math.max(0.001, pop * (s === focus && stepN === 2 && mode === "how" ? 1.6 : 1)));
      s.m.getWorldPosition(v); n.copy(v).sub(globe.position).normalize(); toCam.copy(cam.position).sub(v).normalize();
      const front = n.dot(toCam) > 0.05 && cur.z > R + 0.3, measured = mode === "how" && stepN === 1 ? (Math.abs(v.y - scan.position.y) < 0.35 ? 1 : 0.35) : 1;
      // keep the label clear of the dot: its on-screen radius grows as the camera closes in
      const px = (s.m.geometry.parameters.radius * s.m.scale.x) / cam.position.distanceTo(v) / Math.tan((cam.fov * Math.PI) / 360) * (innerHeight / 2);
      v.project(cam);
      s.el.style.transform = `translate(${((v.x * 0.5 + 0.5) * innerWidth + px + (s.r.pass ? 22 : 10)).toFixed(1)}px,${((-v.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px) translateY(-50%)`;
      const hide = mode === "how" && stepN === 2 && focus && s !== focus && !s.r.pass;
      s.el.style.opacity = front && !hide ? (s.r.pass ? 1 : 0.5) * cur.labels * measured * Math.min(1, pop) : 0;
    });
    renderer.render(scene, cam);
  });

  // ---------- GSAP: the zoom, the reveals, the pinned steps ----------
  gsap.registerPlugin(ScrollTrigger);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const split = (h) => (h.innerHTML = h.innerHTML.split(/(<br>|<span>|<\/span>|\s+)/).map((w) => (!w || /^\s+$/.test(w) || /^<\/?(br|span)>$/.test(w) ? w : `<span class="sp"><span>${w}</span></span>`)).join(""));
  $$(".hero h1, .how h2, .token h2").forEach(split);
  $$(".how h2, .token h2").forEach((h) => h.classList.remove("rv"));
  if (!REDUCE) {
    gsap.from(".hero h1 .sp>span", { yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.06, delay: 0.1 });
    gsap.from([".hero .kick", ".hero .convo", ".fieldcap"], { y: 18, opacity: 0, duration: 1.2, ease: "expo.out", stagger: 0.1, delay: 0.45 });
    // 1 · zoom into the map: the hero holds still while the camera dives through the globe
    const tl = gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "+=150%", pin: true, scrub: 0.6, onUpdate: (s) => (hp = s.progress) } });
    tl.to(".hgrid", { y: -80, opacity: 0, filter: "blur(6px)", ease: "power2.in", duration: 0.35 }, 0)
      .to([".fieldcap", ".veil"], { opacity: 0, duration: 0.3 }, 0)
      .fromTo(".dive", { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out" }, 0.4)
      .to(".dive", { opacity: 0, scale: 1.25, filter: "blur(8px)", duration: 0.2, ease: "power2.in" }, 0.8)
      .to({}, { duration: 0 }, 1);
    // 2 · the newest stars slide up over the field
    gsap.from(".band .bh", { y: 50, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".band", start: "top 80%", once: true } });
    // 3 · tools rise in a stagger, the token headline rises out of its mask
    gsap.from(".tgrid a", { y: 40, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: ".tgrid", start: "top 82%", once: true } });
    gsap.from(".token h2 .sp>span", { yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.05, scrollTrigger: { trigger: ".token", start: "top 60%", once: true } });
    gsap.from([".tc .lead", ".tc .cta", ".tc .facts"], { y: 30, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: ".token", start: "top 55%", once: true } });
    gsap.from(".how h2 .sp>span", { yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.05, scrollTrigger: { trigger: ".how", start: "top 70%", once: true } });
  }
  // 4 · how it works: pinned, the steps drive the globe
  const hs = $$(".hs");
  const howST = ScrollTrigger.create({ trigger: ".how", start: "top top", end: REDUCE ? "bottom top" : "+=240%", pin: !REDUCE, scrub: true, onUpdate: (s) => {
    const i = Math.min(2, Math.floor(s.progress * 3));
    if (i !== stepN) {
      stepN = i;
      if (i === 0) stars.forEach((st, k) => (st.born = clock.getElapsedTime() + k * 0.07));
      if (i === 2) focus = stars.find((st) => st.r.pass) || stars[0];
      stars.forEach((st) => st.el.classList.toggle("hot", i === 2 && st === focus));
    }
    hs.forEach((el, k) => el.classList.toggle("on", k === i)); document.querySelector(".meter i").style.transform = `scaleX(${s.progress})`;
  } });
  // which part of the page drives the map
  const secs = ["hero", "band", "how", "tools", "token"].map((k) => [k, document.querySelector(`[data-sec="${k}"]`) || document.getElementById(k)]);
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: () => {
    const mid = innerHeight * 0.5; let m = "hero";
    for (const [k, el] of secs) { const r = (el.parentElement.classList.contains("pin-spacer") ? el.parentElement : el).getBoundingClientRect(); if (r.top < mid) m = k; }
    if (m === "hero" && hp >= 0.999) m = "band";
    if (m === "tools") m = "how";
    if (m === "how" && mode !== "how" && !howST.isActive) stepN = -1;
    mode = m;
  } });
  const fresh = () => ScrollTrigger.refresh();
  addEventListener("load", fresh); document.fonts?.ready.then(fresh); setTimeout(fresh, 1500);
}
