// CryptoYar · Vox paper-cutout player. Same contract as template/player.js:
//   build(episode, brand) -> { total, voLead, overflow, scenes:[{start,dur,type}] }
//   seek(t)               -> puts the page at time t (seconds). No wall-clock anywhere.
// Look: text-free AI paper-collage frame per scene (ep.voxFrames[i]), slow push-in, paper sheet slides in
// over the previous scene, every moving piece steps at 12 fps (stop-motion), Persian text on torn strips.
(() => {
  const W = 1080, STEP = 12, VO_LEAD = 0.2, SLIDE = 0.55;
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const rich = (s) => esc(s).replace(/\*(.+?)\*/g, "<mark>$1</mark>");
  const plain = (s) => String(s || "").replace(/\*/g, "");
  const wc = (s) => plain(s).split(/\s+/).filter(Boolean).length;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const back = (p) => { const c = 1.6; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const jag = (seed) => {   // torn-paper outline, in % so it scales with the strip
    const p = [], n = 9;
    for (let i = 0; i <= n; i++) p.push(`${(i / n * 100).toFixed(1)}% ${(hash(seed, i) * 4).toFixed(1)}%`);
    for (let i = 1; i <= n; i++) p.push(`${(100 - hash(seed, 20 + i) * 2.2).toFixed(1)}% ${(i / n * 100).toFixed(1)}%`);
    for (let i = n - 1; i >= 0; i--) p.push(`${(i / n * 100).toFixed(1)}% ${(100 - hash(seed, 40 + i) * 4).toFixed(1)}%`);
    for (let i = n - 1; i >= 1; i--) p.push(`${(hash(seed, 60 + i) * 2.2).toFixed(1)}% ${(i / n * 100).toFixed(1)}%`);
    return `polygon(${p.join(",")})`;
  };

  // when the narrator reaches word `before` of `total` (proportional), or a fallback time
  const at = (s, before, total, fb) => (s.voDur ? +(VO_LEAD + s.voDur * (before / Math.max(1, total)) - 0.1).toFixed(2) : fb);

  let scenes = [], total = 0, seed = 1;

  // ---- piece builders: each returns html; timing/motion is registered in `P` ----
  let P = [];
  const piece = (kind, t0, html, o = {}) => {
    const id = `p${seed++}`;
    P.push({ id, kind, t0, r: o.r ?? (hash(seed, 3) - 0.5) * 3.2, dx: o.dx ?? 0, dy: o.dy ?? 60, s0: o.s0 ?? 1.08, seed });
    return { id, html };
  };
  const strip = (t0, y, cls, html, o = {}) => {
    const p = piece("strip", t0, "", o);
    return `<div class="sw" id="${p.id}" style="top:${y}px"><div class="strip ${cls}" style="clip-path:${jag(seed)}">${html}</div></div>`;
  };
  const stamp = (t0, x, y, ok) => {
    const p = piece("stamp", t0, "", { r: ok ? -8 : 10, dy: 0, s0: 2.2 });
    return `<div class="stamp ${ok ? "ok" : "x"}" id="${p.id}" style="left:${x}px;top:${y}px">${ok ? "✓" : "✕"}</div>`;
  };

  const R = {
    hook: (s, b, ep) => {
      const y = s.y ?? 1370;
      return { fb: 3.6 + wc(s.text) * 0.22, html:
        strip(0.25, 190, "tape", esc(s.kicker || ep.series), { r: -2.5, dy: -40 }) +
        strip(0.5, y, "big", rich(s.text), { r: 1.4 }) };
    },
    define: (s) => {
      const tot = wc(s.vo || s.text), head = Math.min(4, wc(s.term));
      return { fb: 3.4 + wc(s.text) * 0.3, html:
        strip(0.3, s.y0 ?? 180, "teal mid", rich(s.term), { r: -1.5, dy: -50 }) +
        (s.en ? strip(0.7, (s.y0 ?? 180) + 175, "en", esc(s.en), { r: 2, dy: -30 }) : "") +
        strip(Math.max(0.9, at(s, head, tot, 0.9)), s.y ?? 1410, "", rich(s.text), { r: 0.8 }) };
    },
    number: (s) => {
      const tot = wc(s.vo), glyphs = `${s.value}${s.suffix || ""}`.split("");
      const tg = Math.max(0.8, at(s, 2, tot, 0.8));
      const tiles = glyphs.map((g, i) => { const p = piece("tile", tg + i * 0.17, "", { r: (hash(i, 9) - 0.5) * 12, dy: -120, s0: 1.4 });
        return `<div class="tile" id="${p.id}">${esc(g)}</div>`; }).join("");
      return { fb: 5.5, html:
        strip(0.3, s.y0 ?? 180, "teal mid", rich(s.caption), { r: -1.2, dy: -50 }) +
        `<div class="tiles" style="top:${s.yt ?? 1150}px">${tiles}</div>` +
        strip(tg + 0.9, (s.yt ?? 1150) + 250, "small", rich(s.label), { r: 2 }) +
        strip(Math.max(tg + 1.4, at(s, Math.round(tot * 0.55), tot, 3)), s.y ?? 1500, "", rich(s.note), { r: -0.8 }) };
    },
    versus: (s) => {
      const tot = wc(s.vo), blk = (x, cls) => `<b style="font-size:58px;font-weight:900">${rich(x.title)}</b><br><span style="font-size:42px;font-weight:600">${x.items.map(rich).join(" · ")}</span>`;
      const tb = Math.max(0.8, at(s, 3, tot, 0.9)), tg = Math.max(tb + 1, at(s, Math.round(tot * 0.42), tot, 2.6));
      return { fb: 6.5, html:
        strip(0.3, s.y0 ?? 170, "teal mid", rich(s.title), { r: -1.2, dy: -50 }) +
        strip(tb, s.yb ?? 840, "bad", blk(s.bad), { r: 1.6, dx: -80, dy: 0 }) + stamp(tb + 0.35, 850, (s.yb ?? 840) - 90, false) +
        strip(tg, s.yg ?? 1500, "good", blk(s.good), { r: -1.4, dx: 80, dy: 0 }) + stamp(tg + 0.35, 850, (s.yg ?? 1500) - 90, true) };
    },
    bullets: (s) => {
      const w = s.items.map(wc), head = wc(s.title) + 1, tot = head + w.reduce((a, b) => a + b, 0);
      let acc = head;
      const ys = s.ys || [620, 900, 1180];
      const rows = s.items.map((it, i) => { const t = Math.max(0.8 + i * 0.5, at(s, acc, tot, 0.8 + i * 0.8)); acc += w[i];
        return strip(t, ys[i], "", `<span style="color:var(--teal)">${"۱۲۳"[i]}.</span> ${rich(it)}`, { r: (i % 2 ? -1 : 1) * 1.3, dx: i % 2 ? -60 : 60, dy: 0 }); });
      return { fb: 2.8 + w.reduce((a, b) => a + b, 0) * 0.3, html: strip(0.3, s.y0 ?? 210, "teal mid", rich(s.title), { r: -1.2, dy: -50 }) + rows.join("") };
    },
    takeaway: (s) => ({ fb: 3.6, html:
      strip(0.25, s.y0 ?? 330, "tape", esc(s.kicker || ""), { r: -3, dy: -40 }) +
      strip(Math.max(0.6, at(s, 3, wc(s.vo), 0.6)), s.y ?? 470, "big", rich(s.text), { r: 1.2 }) }),
    cta: (s, b) => {
      const t0 = 1.7, send = Math.max(3.3, (s.voDur || 4) * 0.82);
      const p = piece("bubble", 1.2, "", { r: -1, dy: 80 });
      return { fb: 5, html:
        strip(0.25, 230, "teal mid", "برای تحلیل هوشمند بازار", { r: -1.5, dy: -50 }) +
        strip(0.6, 420, "big", `بنویس «<mark>${esc(b.keyword)}</mark>»`, { r: 1.5 }) +
        `<div class="bubble" id="${p.id}" style="top:650px"><span class="typed" data-kw="${esc(b.keyword)}" data-t0="${t0}" data-send="${send}"></span><i class="cur"></i><span class="ph">یه کامنت بنویس…</span><span class="send">➤</span></div>` +
        strip(send + 0.1, 1590, "small", "تا لینک ربات رو برات بفرستیم", { r: 1.5 }) };
    },
    lockup: (s, b) => {
      const p = piece("lock", 0.15, "", { r: -1.5, dy: 140, s0: 1.1 });
      return { fb: 3.4, dim: true, html: `<div class="lock" id="${p.id}"><img class="sym" src="../assets/brand/cryptoyar-symbol-gold.svg" alt="">` +
        `<span class="wm"><img src="../assets/brand/cryptoyar-wordmark-gold.svg" alt="" style="width:100%"></span>` +
        `<div class="tl">${esc(b.tagline)}</div><div class="disc">${esc(b.disclaimer)}</div></div>` };
    },
  };

  window.build = (ep, brand) => {
    const $ = (id) => document.getElementById(id);
    document.body.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" style="position:absolute">${window.VOX_DEFS}</svg>`);
    $("brandName").textContent = brand.name; $("handle").textContent = brand.handle;
    const end = ep.voEnd || [];
    const list = [...ep.scenes, { type: "cta", voDur: end[0] }, { type: "lockup", voDur: end[1] }];
    const frames = ep.voxFrames || [];
    let t = 0;
    scenes = list.map((s, i) => {
      P = [];
      const q = R[s.type](s, brand, ep);
      const dur = +Math.max(s.dur || q.fb, s.voDur ? VO_LEAD + s.voDur + 0.45 : 0).toFixed(2);
      const el = document.createElement("section");
      el.className = `scene ${s.type}`;
      // backdrop: a text-free image (ep.voxFrames[i], optional) or the code-drawn paper collage (art.js, default)
      const src = frames.length ? frames[i] || frames[frames.length - 1] : null;
      const art = !src && window.VOX_ART[s.art || s.type] ? window.VOX_ART[s.art || s.type](17 + i * 13) : null;
      const svg = (inner, cls, id, style = "") => `<svg class="${cls}"${id ? ` id="${id}"` : ""} style="${style}" width="1080" height="1920" viewBox="0 0 1080 1920">${inner}</svg>`;
      const artParts = art ? art.parts.map((a) => { const p = piece("art", q.artT?.[a.t0] ?? a.t0, "", { r: a.r, dx: a.dx, dy: a.dy, s0: a.s0 });
        return svg(a.g, "art", p.id, `transform-origin:${a.cx}px ${a.cy}px`); }).join("") : "";
      el.innerHTML = (src ? `<img class="img" src="${src}" alt="">` : art ? svg(art.bg, "img bgart") : "") + artParts +
        `<div class="shade"${q.dim ? ' style="background:rgba(22,51,58,.35)"' : ""}></div><div class="layer">${q.html}</div>`;
      $("stage").appendChild(el);
      const pieces = P.map((p) => ({ ...p, el: el.querySelector("#" + p.id) }));
      pieces.forEach((p) => { p.marks = [...p.el.querySelectorAll("mark")]; });
      const sc = { el, img: el.querySelector(".img"), pieces, start: t, dur, type: s.type, i }; t += dur; return sc;
    });
    total = t;
    return Promise.all([document.fonts.ready, ...[...document.images].map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))]).then(() => {
      window.seek(total - 0.01);
      const overflow = [];
      scenes.forEach((s) => { s.el.style.visibility = "visible"; s.el.style.transform = "none";
        s.pieces.forEach((p) => { const r = p.el.getBoundingClientRect(); if (r.bottom > 1740 && s.type !== "lockup") overflow.push({ scene: s.i, type: s.type, piece: p.kind, bottom: Math.round(r.bottom) }); }); });
      window.seek(0);
      return { total, overflow, voLead: VO_LEAD, scenes: scenes.map(({ start, dur, type }) => ({ start, dur, type })) };
    });
  };

  const place = (sc, local) => {
    const lt = Math.floor(local * STEP) / STEP, k = Math.floor(local * STEP);   // stop-motion clock
    // background: slow push-in + tiny per-step jitter (paper on a table, shot frame by frame)
    if (sc.img) {
      const pr = clamp(lt / sc.dur), jx = (hash(k, sc.i) - 0.5) * 4, jy = (hash(k, sc.i + 7) - 0.5) * 4, jr = (hash(k, sc.i + 3) - 0.5) * 0.3;
      const slide = sc.i > 0 ? (1 - easeOut(clamp(lt / SLIDE))) * 140 : 0;
      sc.img.style.transform = `translate(${(jx + slide).toFixed(1)}px,${jy.toFixed(1)}px) scale(${(1.07 - 0.06 * pr).toFixed(4)}) rotate(${jr.toFixed(2)}deg)`;
    }
    for (const p of sc.pieces) {
      const q = clamp((lt - p.t0) / 0.34);
      if (q <= 0) { p.el.style.opacity = 0; continue; }
      const e = p.kind === "stamp" || p.kind === "tile" || p.kind === "art" ? back(q) : easeOut(q);
      const wob = q >= 1 ? (hash(k, p.seed) - 0.5) * 0.5 : 0;   // paper crinkle while resting
      const s = p.s0 + (1 - p.s0) * e;
      p.el.style.opacity = Math.min(1, q * 2.5);
      p.el.style.transform = `translate(${(p.dx * (1 - e)).toFixed(1)}px,${(p.dy * (1 - e)).toFixed(1)}px) rotate(${(p.r * (0.4 + 0.6 * e) + wob).toFixed(2)}deg) scale(${s.toFixed(3)})`;
      p.marks.forEach((m, j) => m.style.setProperty("--m", easeOut(clamp((lt - p.t0 - 0.35 - j * 0.2) / 0.4)).toFixed(3)));
    }
    sc.el.querySelectorAll(".spin").forEach((g) => g.setAttribute("transform", `rotate(${(lt * +g.dataset.rate).toFixed(2)} ${g.dataset.cx} ${g.dataset.cy})`));
    sc.el.querySelectorAll(".fly").forEach((g) => { const e = clamp((lt - +g.dataset.t0) / +g.dataset.dur), f = e * e;
      g.setAttribute("transform", `translate(${(+g.dataset.dx * f).toFixed(1)} ${(+g.dataset.dy * f).toFixed(1)})`); });
    sc.el.querySelectorAll(".typed").forEach((el) => {
      const kw = el.dataset.kw, t0 = +el.dataset.t0, sent = local >= +el.dataset.send;
      const n = Math.max(0, Math.min(kw.length, Math.floor((lt - t0) * 6)));
      el.textContent = kw.slice(0, n);
      const bub = el.parentNode;
      bub.querySelector(".ph").style.display = n ? "none" : "";
      bub.querySelector(".cur").style.visibility = !sent && local > t0 - 0.5 && k % 8 < 4 ? "visible" : "hidden";
      bub.querySelector(".send").style.background = sent ? "var(--green)" : "var(--teal)";
      bub.querySelector(".send").textContent = sent ? "✓" : "➤";
    });
  };

  window.seek = (t) => {
    const ci = Math.max(0, scenes.findIndex((s) => t >= s.start && t < s.start + s.dur));
    const idx = scenes.findIndex((s) => t >= s.start && t < s.start + s.dur);
    const cur = scenes[idx < 0 ? scenes.length - 1 : idx], local = t - cur.start;
    const lt = Math.floor(local * STEP) / STEP;
    const sliding = cur.i > 0 && lt < SLIDE;
    scenes.forEach((s) => { s.el.style.visibility = s === cur || (sliding && s.i === cur.i - 1) ? "visible" : "hidden"; s.el.style.zIndex = s === cur ? 2 : 1; });
    if (sliding) {
      const e = easeOut(clamp(lt / SLIDE)), prev = scenes[cur.i - 1];
      cur.el.style.transform = `translateX(${((1 - e) * W * 1.05).toFixed(1)}px) rotate(${((1 - e) * 2.5).toFixed(2)}deg)`;
      prev.el.style.transform = `translateX(${(-e * 90).toFixed(1)}px)`;
      place(prev, prev.dur - 0.01);
    } else cur.el.style.transform = "none";
    place(cur, local);
    document.getElementById("tag").style.opacity = cur.type === "lockup" ? 0 : 1;
    void ci;
  };
})();
