// Deterministic player: build(episode, brand) lays out every scene once,
// seek(t) puts the whole page at time t (seconds). No wall-clock anywhere.
// Visual language = CryptoYar story-kit (caption / card / brand pill) + the launch-film logo motion.
(() => {
  const W = 1080, H = 1920;
  const fa = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const rich = (s) => esc(s).replace(/\*(.+?)\*/g, "<em>$1</em>");   // *word* -> gold
  const plain = (s) => String(s).replace(/\*/g, "");
  const wc = (s) => String(s || "").split(/\s+/).filter(Boolean).length;
  const rnd = (seed) => { let r = seed * 9301 + 49297; return () => ((r = (r * 9301 + 49297) % 233280) / 233280); };

  // real symbol paths (assets/brand/cryptoyar-symbol-gold.svg)
  const LG = ["M222 511C243 439 301 391 378 391H546L627.5 524L709 391H879C954 391 1012 439 1033 511H963C944 476 912 455 874 455H744L627.5 646L510 455H381C341 455 310 476 293 511Z",
    "M222 588H291C308 630 341 656 381 656H543L583 719H381C304 719 244 666 222 588Z",
    "M1033 588H964C947 630 914 656 874 656H712L672 719H874C951 719 1011 666 1033 588Z"];
  const LW = ["M383 524H464Q482 524 491 540L529 598H419Q403 598 391 586L367 562C350 545 358 524 383 524Z",
    "M872 524H791Q773 524 764 540L727 598H836Q852 598 864 586L888 562C905 545 897 524 872 524Z"];
  const logo = (w, anim, t = 0) => `<svg class="logo${anim ? " anim" : ""}" style="--t:${t}" viewBox="180 349 895 412" width="${w}" height="${(w * 412) / 895}">` +
    LG.map((d) => `<path class="g" pathLength="1" d="${d}"/>`).join("") + LW.map((d) => `<path class="wh" d="${d}"/>`).join("") + `</svg>`;

  // caption: word-by-word, keywords gold (story-kit Caption). caps = [{at, text}]
  const caption = (caps, dur) => caps.map((c, i) => {
    let k = 0, on = false;
    const html = String(c.text).split(/\s+/).map((tok) => {
      let hi = on;
      if (tok.startsWith("*")) { hi = true; on = true; }
      if (/\*[؟?!،.:؛»]*$/.test(tok)) on = false;
      const w = tok.replace(/\*/g, "");
      return `<span class="w" style="--d:${(c.at + 0.1 * k++).toFixed(2)}">${hi ? `<em>${esc(w)}</em>` : esc(w)}</span>`;
    }).join("");
    return `<div class="cap" style="--out:${caps[i + 1]?.at ?? dur}">${html}</div>`;
  }).join("");
  const a = (d, cls, html) => `<div class="a ${cls}" style="--d:${d}">${html}</div>`;
  const deco = (seed, d0) => { const r = rnd(seed); return `<div class="deco">` + Array.from({ length: 15 }, (_, i) =>
    `<i class="${r() > 0.45 ? "" : "down"}" style="--h:${50 + Math.round(r() * 150)}px;--d:${(d0 + i * 0.05).toFixed(2)}"></i>`).join("") + `</div>`; };

  // narration pacing: when a scene has a voice line (s.voDur seconds, starting at VO_LEAD), list items appear
  // when the narrator reaches them. at(s, before, total, fallback) -> seconds, proportional to word counts.
  const VO_LEAD = 0.2;
  const at = (s, before, total, fb) => (s.voDur ? +(VO_LEAD + s.voDur * (before / Math.max(1, total)) - 0.15).toFixed(2) : fb);
  const items = (s) => s.items.map(plain);

  // each renderer returns { dur, caps, body (inside .stage > .in), in (card entrance delay), pre (extra html) }
  const R = {
    hook: (s, b, ep) => ({
      dur: 3.6 + wc(s.text) * 0.22, in: 1.25, caps: [{ at: 0.5, text: s.text }],
      pre: `<div class="stage"><div class="sting"><div class="box">${logo(430, true)}<i class="ring" style="--t:.55"></i><i class="ring" style="--t:.8"></i></div></div></div>`,
      body: `<div class="card title-card"><div class="ct">${esc(ep.series)}</div><div class="tt">${esc(ep.title)}</div>${deco(wc(s.text) + 3, 1.6)}</div>`,
    }),
    define: (s) => ({
      dur: 3.4 + wc(s.text) * 0.3, caps: [{ at: 0.15, text: `*${s.term}* ${s.kicker ? "" : "یعنی چی؟"}`.trim() }],
      body: `<div class="card">${s.kicker ? `<div class="ct">${rich(s.kicker)}</div>` : ""}${s.en ? `<div class="en">${esc(s.en)}</div>` : ""}${a(0.45, "p", rich(s.text))}</div>`,
    }),
    bullets: (s) => {
      const w = items(s).map(wc), head = wc(plain(s.title)) + 1, tot = head + w.reduce((a, b) => a + b, 0);
      let acc = head;
      const d = w.map((n, i) => { const v = Math.max(0.5, at(s, acc, tot, 0.5 + i * 0.7)); acc += n; return v; });
      return {
        dur: 2.8 + s.items.reduce((n, x) => n + wc(x), 0) * 0.3 + s.items.length * 0.4, caps: [{ at: 0.15, text: s.title }],
        body: `<div class="card" style="padding:26px 40px 40px">` + s.items.map((x, i) =>
          `<div class="row" style="--d:${d[i].toFixed(2)}"><div class="n">${fa(i + 1)}</div><div class="t">${rich(x)}</div></div>`).join("") + `</div>`,
      };
    },
    number: (s) => ({
      dur: 4.4 + wc(s.note) * 0.25, caps: [{ at: 0.15, text: s.caption || s.label }],
      body: `<div class="card">${s.caption ? `<div class="lab">${rich(s.label)}</div>` : ""}<div class="big ${s.tone || ""}" data-count="${s.value}" data-from="${s.from ?? 0}" data-dec="${s.decimals ?? 0}" data-pre="${esc(s.prefix || "")}" data-suf="${esc(s.suffix || "")}" data-t0="0.35" data-cd="1.5"></div></div>` +
        (s.note ? a(1.5, "under", rich(s.note)) : ""),
    }),
    bars: (s) => ({
      dur: 4.8 + s.rows.length * 0.5 + wc(s.note) * 0.25, caps: [{ at: 0.15, text: s.title }],
      body: `<div class="card">` + s.rows.map((r, i) => { const d = (0.5 + i * 0.28).toFixed(2);
        return a(d, "bar", `<div class="lab">${esc(r.label)}</div><div class="track"><div class="fill ${r.tone || ""}" style="--pct:${r.pct};--d:${d}"></div></div><div class="val ${r.tone || ""}">${esc(r.value)}</div>`); }).join("") + `</div>` +
        (s.note ? a((0.9 + s.rows.length * 0.28).toFixed(2), "under s", rich(s.note)) : ""),
    }),
    versus: (s) => {
      const side = (x, cls, icon, d) => a(d, `card side ${cls}`, `<div class="tt"><span>${icon}</span>${esc(x.title)}</div><ul>${x.items.map((i) => `<li>${rich(i)}</li>`).join("")}</ul>`);
      const wb = wc(s.bad.title) + s.bad.items.reduce((n, x) => n + wc(x), 0), wg = wc(s.good.title) + s.good.items.reduce((n, x) => n + wc(x), 0);
      return {
        dur: 3.6 + [...s.bad.items, ...s.good.items].reduce((n, x) => n + wc(x), 0) * 0.3,
        caps: [{ at: 0.15, text: s.title || `${s.bad.title} یا *${s.good.title}*؟` }],
        body: side(s.bad, "bad", "✕", 0.3) + side(s.good, "good", "✓", Math.max(1.3, at(s, wb, wb + wg, 1.3))),
      };
    },
    chart: (s) => {
      const cw = 788, ch = 520, n = s.points.length;
      const all = [...s.points, ...(s.levels || []).map((l) => l.y)];
      const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.14;
      const x = (i) => (i / (n - 1)) * cw, y = (v) => ch - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * ch;
      const pts = s.points.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
      const lv = (s.levels || []).map((l, i) => {
        const c = l.tone === "down" ? "var(--red)" : l.tone === "up" ? "var(--green)" : "var(--muted)", d = (1.3 + i * 0.5).toFixed(2);
        return `<line class="lvl" style="--d:${d}" x1="0" x2="${cw}" y1="${y(l.y)}" y2="${y(l.y)}" stroke="${c}"/>` +
          `<text class="lvlt" style="--d:${d}" x="${cw}" y="${y(l.y) - 14}" fill="${c}" text-anchor="start" direction="rtl">${esc(l.label)}</text>`;
      }).join("");
      return {
        dur: 5.4 + wc(s.caption) * 0.28, caps: [{ at: 0.15, text: s.title }],
        body: `<div class="card"><span class="demo">نمودار نمایشی</span><svg viewBox="0 0 ${cw} ${ch}" direction="ltr">` +
          `<defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc21a" stop-opacity=".26"/><stop offset="1" stop-color="#ffc21a" stop-opacity="0"/></linearGradient></defs>` +
          `<path class="area" d="M0,${ch} L${pts.join(" L")} L${cw},${ch} Z" fill="url(#ar)"/>${lv}<path class="line" pathLength="1" d="M${pts.join(" L")}"/>` +
          `<circle class="dot" cx="${x(n - 1)}" cy="${y(s.points[n - 1])}" r="15"/></svg></div>` + (s.caption ? a(2.3, "under", rich(s.caption)) : ""),
      };
    },
    // Telegram-style chat with the brand bot: msgs = [{from: "me"|"bot", text, rows?}]
    chat: (s, b) => {
      const n = s.msgs.length, span = s.voDur ? s.voDur * 0.85 : n * 1.1;
      const d = s.msgs.map((m, i) => +(0.6 + (span - 0.6) * (i / n)).toFixed(2));
      const msg = (m, i) => `<div class="msg ${m.from}" style="--d:${d[i]}"><div class="bub">${rich(m.text)}` +
        (m.rows ? `<ul>${m.rows.map((x, k) => `<li style="--d:${(d[i] + 0.35 + k * 0.3).toFixed(2)}">${rich(x)}</li>`).join("")}</ul>` : "") + `</div></div>`;
      return {
        dur: 2.4 + n * 1.2, caps: [{ at: 0.15, text: s.title }],
        body: `<div class="card tg"><div class="head"><img src="../assets/brand/cryptoyar-symbol-gold.svg" alt=""><div><b>${esc(b.name)}</b><small>ربات تلگرام <span dir="ltr">${esc(b.handle)}</span></small></div></div>` +
          `<div class="msgs">${s.msgs.map(msg).join("")}</div></div>`,
      };
    },
    takeaway: (s) => ({
      dur: 3.2 + wc(s.text) * 0.3, caps: [{ at: 0.15, text: s.kicker ? s.kicker + ": یادت بمونه" : "یادت بمونه" }],
      body: `<div class="card">${a(0.4, "q", rich(s.text))}${deco(wc(s.text) + 11, 0.7)}</div>`,
    }),
    cta: (s, b) => ({
      dur: 4.6, caps: [{ at: 0.15, text: `بنویس *«${b.keyword}»*` }, { at: 2.5, text: `تا لینک *ربات* رو برات بفرستیم` }],
      body: `<div class="card" style="--send:1.9;--reply:2.5"><div class="head">کامنت‌ها</div><div class="empty">هنوز کامنتی نیست؛ اولی تو باش</div>` +
        `<div class="cm"><div class="av"></div><div><small>شما</small><b>${esc(b.keyword)}</b></div></div>` +
        `<div class="reply"><img src="../assets/brand/cryptoyar-symbol-gold.svg" alt=""><div><div class="r1">${esc(b.name)} · دایرکت</div><div class="r2">${esc(b.replyTitle)}</div><div class="r3">${esc(b.handle)}</div></div></div>` +
        `<div class="input"><span class="typed" data-type="${esc(b.keyword)}" data-t0="0.9" data-send="1.9"></span><span class="cur">|</span><span class="ph">یه کامنت بذار...</span></div></div>`,
    }),
    lockup: (s, b) => ({
      dur: 2.4, caps: [], body: "",
      pre: `<div class="wrap"><div class="box">${logo(520, true)}<i class="ring" style="--t:.5"></i><i class="ring" style="--t:.8"></i></div>` +
        `<img class="wm" src="../assets/brand/cryptoyar-wordmark-gold.svg" alt="">${a(0.95, "tag", esc(b.tagline))}${a(1.15, "disc", esc(b.disclaimer))}</div>`,
    }),
  };

  let scenes = [], total = 0, ghosts = [], dust = [];

  window.build = (ep, brand) => {
    const $ = (id) => document.getElementById(id);
    $("brandName").textContent = brand.name; $("chip").textContent = ep.series;
    // background ghosts + dust (same recipe as launch-film Bg)
    const r = rnd(7);
    ghosts = Array.from({ length: 7 }, () => { const s = 260 + r() * 520, g = { s, x: r() * W, y0: r() * H, v: 0.25 + r() * 0.5, o: 0.05 + r() * 0.06, b: 6 + r() * 14, rot: -18 + r() * 36 };
      const el = document.createElement("div"); el.className = "ghost"; el.style.cssText = `opacity:${g.o};filter:blur(${g.b}px)`; el.innerHTML = logo(s, false); $("ghosts").appendChild(el); g.el = el; return g; });
    dust = Array.from({ length: 60 }, (_, i) => { const d = { x: r() * W, y0: r() * H, v: 0.5 + r() * 1.8, i };
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("r", (1.2 + r() * 2.6).toFixed(1)); c.setAttribute("fill", "#ffc21a"); $("dust").appendChild(c); d.el = c; return d; });

    const end = ep.voEnd || [];
    const list = [...ep.scenes, { type: "cta", voDur: end[0] }, { type: "lockup", voDur: end[1] }];
    let t = 0;
    scenes = list.map((s) => {
      const q = R[s.type](s, brand, ep);
      // a narrated scene lasts at least as long as its voice line (+ a short breath)
      const dur = +Math.max(s.dur || q.dur, s.voDur ? VO_LEAD + s.voDur + 0.45 : 0).toFixed(2);
      const el = document.createElement("section");
      el.className = `scene ${s.type}`; el.style.setProperty("--dur", dur);
      el.innerHTML = caption(q.caps, dur) + (q.pre || "") + (q.body ? `<div class="stage"><div class="in" style="--in:${q.in || 0}">${q.body}</div></div>` : "");
      $("stage").appendChild(el);
      const sc = { el, start: t, dur, type: s.type }; t += dur; return sc;
    });
    total = t;
    document.querySelectorAll("[data-count]").forEach((el) => {
      const dec = +el.dataset.dec, fin = el.dataset.pre + (+el.dataset.count).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + el.dataset.suf;
      el.style.fontSize = Math.min(160, Math.floor(760 / (fin.length * 0.58))) + "px";
    });
    return document.fonts.ready.then(() => {
      // captions must stay above the card: shrink long ones (76 -> 52)
      document.querySelectorAll(".cap").forEach((c) => { let fs = 76; while (c.scrollHeight > 215 && fs > 52) { fs -= 4; c.style.fontSize = fs + "px"; } });
      window.seek(total - 0.01);
      const overflow = scenes.map((s, i) => {
        s.el.style.visibility = "visible";
        const st = s.el.querySelector(".stage > .in"), cap = s.el.querySelector(".cap");
        const h = st ? st.getBoundingClientRect().height : 0, ch = cap ? cap.scrollHeight : 0;
        return h > 1090 || ch > 250 ? { scene: i, type: s.type, card: Math.round(h), cap: ch } : null;
      }).filter(Boolean);
      window.seek(0);
      return { total, overflow, voLead: VO_LEAD, scenes: scenes.map(({ start, dur, type }) => ({ start, dur, type })) };
    });
  };

  const easeOut = (p) => 1 - Math.pow(1 - p, 4);

  window.seek = (t) => {
    const f = t * 30;
    const cur = scenes.find((s) => t >= s.start && t < s.start + s.dur) || scenes[scenes.length - 1];
    for (const s of scenes) s.el.style.visibility = s === cur ? "visible" : "hidden";
    for (const an of document.getAnimations()) {
      const sc = an.effect.target.closest(".scene");
      const owner = sc && scenes.find((s) => s.el === sc);
      an.pause();
      an.currentTime = Math.max(0, (owner ? t - owner.start : t) * 1000);
    }
    const local = t - cur.start;
    cur.el.querySelectorAll("[data-count]").forEach((el) => {
      const to = +el.dataset.count, from = +el.dataset.from, dec = +el.dataset.dec;
      const p = Math.min(1, Math.max(0, (local - +el.dataset.t0) / +el.dataset.cd));
      const v = from + (to - from) * easeOut(p);
      el.textContent = el.dataset.pre + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + el.dataset.suf;
    });
    cur.el.querySelectorAll("[data-type]").forEach((el) => {
      const kw = el.dataset.type, sent = local >= +el.dataset.send;
      const typed = sent ? "" : kw.slice(0, Math.max(0, Math.min(kw.length, Math.floor((local - +el.dataset.t0) * 7.5))));
      el.textContent = typed;
      el.parentNode.querySelector(".ph").style.display = typed || sent ? "none" : "";
      el.parentNode.querySelector(".cur").style.visibility = !sent && local > +el.dataset.t0 - 0.45 && Math.floor(f / 8) % 2 === 0 ? "visible" : "hidden";
    });
    document.getElementById("pill").style.opacity = cur.type === "lockup" ? 0 : 1;
    document.querySelector(".chip").style.opacity = cur.type === "lockup" ? 0 : 1;
    for (const g of ghosts) {
      const y = ((((g.y0 - f * g.v) % (H + 600)) + H + 600) % (H + 600)) - 300;
      g.el.style.transform = `translate(${g.x - g.s / 2}px,${y}px) rotate(${g.rot}deg)`;
    }
    for (const d of dust) {
      d.el.setAttribute("cx", (d.x + Math.sin(f / 40 + d.i) * 14).toFixed(1));
      d.el.setAttribute("cy", ((((d.y0 - f * d.v) % H) + H) % H).toFixed(1));
      d.el.setAttribute("opacity", (0.12 + 0.3 * Math.abs(Math.sin(f / 14 + d.i))).toFixed(2));
    }
  };
})();
