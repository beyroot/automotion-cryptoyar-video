// CryptoYar · Vox paper-cutout illustrations, drawn in code (no paid image generation, no text inside art).
// window.VOX_ART[name](seed) -> { bg: svg markup (static backdrop), parts: [{ g, cx, cy, t0, dx, dy, r, s0 }] }
// Every part is one cut-out piece of paper; the player slides it in at t0 (stop-motion, 12 fps).
// Special classes inside a part: .spin (data-cx/cy/rate deg/s), .fly (data-t0/dur/dx/dy) are moved by the player.
(() => {
  const C = { paper: "#f3ecdc", paper2: "#e8dfca", news: "#ece5d3", line: "#b9b1a0", ink: "#16333a", teal: "#2e6a6c",
    teal2: "#1f4f52", tealL: "#cfe0da", kraft: "#c99d64", kraft2: "#a97d47", gold: "#e8b23a", gold2: "#c88d1f",
    red: "#c8362f", green: "#2f8f5b", blue: "#3b7fc4", marker: "rgba(255,213,0,.75)" };
  const h = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const SH = 'filter="url(#ds)"';

  // torn rectangle (jagged edges) as a polygon
  const torn = (x, y, w, hgt, seed, fill, extra = "") => {
    const p = [], n = Math.max(6, Math.round(w / 45)), m = Math.max(6, Math.round(hgt / 45)), j = 7;
    for (let i = 0; i <= n; i++) p.push([x + (w * i) / n, y + h(seed, i) * j]);
    for (let i = 1; i <= m; i++) p.push([x + w - h(seed, 30 + i) * j, y + (hgt * i) / m]);
    for (let i = n - 1; i >= 0; i--) p.push([x + (w * i) / n, y + hgt - h(seed, 60 + i) * j]);
    for (let i = m - 1; i >= 1; i--) p.push([x + h(seed, 90 + i) * j, y + (hgt * i) / m]);
    return `<polygon points="${p.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="${fill}" ${extra}/>`;
  };
  // newspaper clipping: headline bar, columns of grey "text" lines, one halftone photo block
  const clip = (x, y, w, hgt, seed, rot = 0) => {
    let s = `<g transform="rotate(${rot} ${x + w / 2} ${y + hgt / 2})">` + torn(x, y, w, hgt, seed, C.news, SH);
    s += `<rect x="${x + 28}" y="${y + 30}" width="${w - 56}" height="26" fill="${C.ink}" opacity=".75"/>`;
    s += `<rect x="${x + 28}" y="${y + 66}" width="${(w - 56) * 0.6}" height="18" fill="${C.ink}" opacity=".45"/>`;
    const cols = w > 380 ? 2 : 1, cw = (w - 56 - (cols - 1) * 24) / cols;
    for (let c = 0; c < cols; c++) for (let r = 0; y + 110 + r * 20 < y + hgt - 30; r++) {
      if (c === 0 && r >= 2 && r <= 6 && w > 300) continue;
      s += `<rect x="${x + 28 + c * (cw + 24)}" y="${y + 110 + r * 20}" width="${cw * (0.75 + h(seed, r + c * 50) * 0.25)}" height="8" fill="${C.line}"/>`;
    }
    if (w > 300) s += `<rect x="${x + 28}" y="${y + 146}" width="${cw}" height="92" fill="url(#ht)"/>`;
    return s + "</g>";
  };
  const pin = (x, y, c = C.red) => `<circle cx="${x}" cy="${y + 4}" r="15" fill="rgba(0,0,0,.25)"/><circle cx="${x}" cy="${y}" r="15" fill="${c}"/><circle cx="${x - 5}" cy="${y - 5}" r="5" fill="#fff" opacity=".6"/>`;
  const marker = (x, y, w, hgt = 40, rot = -2) => `<rect x="${x}" y="${y}" width="${w}" height="${hgt}" rx="10" fill="${C.marker}" transform="rotate(${rot} ${x} ${y})"/>`;
  const grid = (x, y, w, hgt, seed, fill) => {
    let s = torn(x, y, w, hgt, seed, fill, SH);
    for (let gx = x + 30; gx < x + w - 10; gx += 44) s += `<line x1="${gx}" y1="${y + 12}" x2="${gx}" y2="${y + hgt - 12}" stroke="${C.teal}" stroke-opacity=".18" stroke-width="2"/>`;
    for (let gy = y + 30; gy < y + hgt - 10; gy += 44) s += `<line x1="${x + 12}" y1="${gy}" x2="${x + w - 12}" y2="${gy}" stroke="${C.teal}" stroke-opacity=".18" stroke-width="2"/>`;
    return s;
  };
  const base = (seed, tint) => {   // shared backdrop: paper + two tilted clippings + a teal torn block
    return `<rect width="1080" height="1920" fill="${C.paper2}"/>` +
      torn(-30, 1380 + h(seed, 1) * 60, 1140, 620, seed + 3, tint || C.tealL) +
      clip(-60, 120 + h(seed, 2) * 40, 470, 520, seed + 5, -6 + h(seed, 3) * 4) +
      clip(690, 1420 + h(seed, 4) * 40, 460, 420, seed + 7, 5 + h(seed, 5) * 4);
  };
  const part = (g, cx, cy, t0, o = {}) => ({ g, cx, cy, t0, dx: o.dx ?? 0, dy: o.dy ?? 90, r: o.r ?? 0, s0: o.s0 ?? 1.06 });

  const A = {
    // hook: bitcoin under the magnifying glass on torn newspaper, red yarn between pins
    hook: (sd) => {
      const coin = (cx, cy, r) => `<g ${SH}><circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.gold2}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.86}" fill="${C.gold}"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="none" stroke="${C.gold2}" stroke-width="6" stroke-dasharray="4 10"/>` +
        `<path d="M${cx - 48} ${cy - 80}h70a42 38 0 0 1 0 76h-70zM${cx - 48} ${cy - 4}h82a46 42 0 0 1 0 84h-82z" fill="none" stroke="#fff6dc" stroke-width="22" stroke-linejoin="round"/>` +
        `<path d="M${cx - 20} ${cy - 104}v28M${cx + 12} ${cy - 104}v28M${cx - 20} ${cy + 80}v28M${cx + 12} ${cy + 80}v28" stroke="#fff6dc" stroke-width="16" stroke-linecap="round"/></g>`;
      const pins = [[170, 640], [900, 600], [930, 1230], [150, 1260]];
      return { bg: base(sd), parts: [
        part(clip(130, 600, 820, 700, sd + 11, -3), 540, 950, 0.05, { dy: 140 }),
        part(pins.map(([x, y]) => `<path d="M${x} ${y}L540 940" stroke="${C.red}" stroke-width="5" fill="none" opacity=".9"/>`).join("") + pins.map(([x, y]) => pin(x, y)).join(""), 540, 940, 0.55, { dy: 0, s0: 1.15 }),
        part(coin(540, 940, 200), 540, 940, 0.3, { dy: -160, r: -10, s0: 1.2 }),
        part(`<g ${SH}><rect x="760" y="1050" width="44" height="230" rx="18" fill="${C.ink}" transform="rotate(-40 782 1050)"/>` +
          `<circle cx="690" cy="900" r="170" fill="rgba(220,240,240,.28)" stroke="${C.teal2}" stroke-width="34"/>` +
          `<path d="M600 820a120 120 0 0 1 90 -60" stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round" opacity=".7"/></g>`, 700, 960, 0.8, { dx: 200, dy: 120, r: 12 }),
      ] };
    },
    // define: chain of kraft-paper blocks with padlocks on a grid sheet
    define: (sd) => {
      const blocks = [[170, 640], [370, 800], [570, 960], [770, 1120]];
      const block = (x, y, i) => `<g ${SH}><polygon points="${x},${y} ${x + 150},${y} ${x + 180},${y - 30} ${x + 30},${y - 30}" fill="#dcb886"/>` +
        `<polygon points="${x + 150},${y} ${x + 180},${y - 30} ${x + 180},${y + 120} ${x + 150},${y + 150}" fill="${C.kraft2}"/>` +
        `<rect x="${x}" y="${y}" width="150" height="150" fill="${C.kraft}"/>` +
        `<path d="M${x + 55} ${y + 62}v-16a20 20 0 0 1 40 0v16" stroke="${C.ink}" stroke-width="9" fill="none"/>` +
        `<rect x="${x + 42}" y="${y + 60}" width="66" height="54" rx="8" fill="${C.teal}"/><circle cx="${x + 75}" cy="${y + 84}" r="7" fill="${C.paper}"/>` +
        `${marker(x - 10, y + 128, 170, 26, -3)}</g>`;
      return { bg: base(sd) + grid(70, 520, 940, 860, sd + 9, "#e3ece6"), parts: [
        part(blocks.slice(0, -1).map(([x, y], i) => `<path d="M${x + 150} ${y + 75}C${x + 200} ${y + 80} ${blocks[i + 1][0] - 40} ${blocks[i + 1][1] + 60} ${blocks[i + 1][0]} ${blocks[i + 1][1] + 75}" stroke="${C.ink}" stroke-width="12" fill="none" stroke-dasharray="26 12" stroke-linecap="round"/>`).join(""), 540, 900, 1.6, { dy: 0, s0: 1 }),
        ...blocks.map(([x, y], i) => part(block(x, y, i), x + 75, y + 75, 0.4 + i * 0.3, { dy: -120, r: (i % 2 ? 6 : -6), s0: 1.25 })),
      ] };
    },
    // number 24/7: clock on a split day/night card, paper sun and crescent moon
    number: (sd) => {
      let ticks = "";
      for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ticks += `<line x1="${540 + Math.sin(a) * 175}" y1="${960 - Math.cos(a) * 175}" x2="${540 + Math.sin(a) * (i % 3 ? 195 : 205)}" y2="${960 - Math.cos(a) * (i % 3 ? 195 : 205)}" stroke="${C.ink}" stroke-width="${i % 3 ? 6 : 12}"/>`; }
      let rays = "";
      for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5; rays += `<polygon points="${220 + Math.sin(a - 0.12) * 92},${650 - Math.cos(a - 0.12) * 92} ${220 + Math.sin(a) * 135},${650 - Math.cos(a) * 135} ${220 + Math.sin(a + 0.12) * 92},${650 - Math.cos(a + 0.12) * 92}" fill="#f2a93b"/>`; }
      return { bg: base(sd) + torn(60, 520, 480, 900, sd + 21, "#f7f0dc", SH) + torn(540, 520, 480, 900, sd + 22, C.teal2, SH), parts: [
        part(`<g ${SH}>${rays}<circle cx="220" cy="650" r="80" fill="#f6c445"/></g>`, 220, 650, 0.3, { dx: 120, dy: -80, r: -20, s0: 1.3 }),
        part(`<g ${SH}><path d="M890 1230a110 110 0 1 1 -40 -190a85 85 0 1 0 40 190z" fill="#f4e3a1"/></g>` +
          [[700, 1300], [960, 1080], [760, 1120]].map(([x, y]) => `<polygon points="${x},${y - 18} ${x + 6},${y - 6} ${x + 18},${y} ${x + 6},${y + 6} ${x},${y + 18} ${x - 6},${y + 6} ${x - 18},${y} ${x - 6},${y - 6}" fill="#f4e3a1"/>`).join(""), 860, 1150, 0.5, { dx: -120, dy: 80, r: 20, s0: 1.3 }),
        part(`<g ${SH}><circle cx="540" cy="960" r="235" fill="${C.ink}"/><circle cx="540" cy="960" r="212" fill="${C.paper}"/>${ticks}</g>` +
          `<g class="spin" data-cx="540" data-cy="960" data-rate="90"><rect x="533" y="790" width="14" height="180" rx="7" fill="${C.teal2}"/></g>` +
          `<g class="spin" data-cx="540" data-cy="960" data-rate="7.5"><rect x="531" y="850" width="18" height="120" rx="9" fill="${C.ink}"/></g>` +
          `<circle cx="540" cy="960" r="18" fill="${C.red}"/>`, 540, 960, 0.15, { dy: 160, r: -8, s0: 1.15 }),
      ] };
    },
    // versus: crowded bank (top) vs hardware wallet (bottom)
    versus: (sd) => {
      let pillars = "";
      for (let i = 0; i < 5; i++) pillars += `<rect x="${330 + i * 92}" y="470" width="46" height="250" fill="${C.paper}"/><rect x="${322 + i * 92}" y="462" width="62" height="16" fill="${C.paper2}"/>`;
      let crowd = "";
      for (let i = 0; i < 9; i++) { const x = 250 + i * 72 + h(sd, i) * 20, y = 770 + (i % 2) * 18, c = [C.teal, C.kraft2, C.ink, C.red][i % 4];
        crowd += `<circle cx="${x}" cy="${y - 52}" r="22" fill="${c}"/><path d="M${x - 32} ${y + 40}v-34a32 32 0 0 1 64 0v34z" fill="${c}"/>`; }
      return { bg: base(sd) + torn(60, 330, 960, 520, sd + 31, "#efe3cf", SH) + torn(60, 1010, 960, 470, sd + 32, "#dcebe3", SH), parts: [
        part(`<g ${SH}><polygon points="290,450 540,340 790,450" fill="${C.paper}"/><rect x="290" y="440" width="500" height="26" fill="${C.paper2}"/>${pillars}<rect x="270" y="720" width="540" height="40" fill="${C.paper2}"/><circle cx="540" cy="405" r="22" fill="${C.gold}"/></g>`, 540, 560, 0.15, { dy: -120, s0: 1.1 }),
        part(`<g ${SH}>${crowd}</g>`, 540, 780, 0.5, { dy: 80, s0: 1 }),
        part(`<g ${SH}><rect x="330" y="1080" width="420" height="250" rx="44" fill="${C.ink}"/><rect x="740" y="1170" width="70" height="70" rx="10" fill="#8a9a9c"/>` +
          `<rect x="380" y="1125" width="230" height="110" rx="14" fill="#9fd3c1"/><rect x="405" y="1155" width="120" height="16" rx="8" fill="${C.teal2}"/><rect x="405" y="1185" width="80" height="16" rx="8" fill="${C.teal2}"/>` +
          `<circle cx="665" cy="1150" r="26" fill="${C.teal}"/><circle cx="665" cy="1240" r="26" fill="${C.teal}"/>${marker(350, 1300, 380, 30, -1)}</g>`, 540, 1200, 0.3, { dy: 140, r: 6, s0: 1.15 }),
      ] };
    },
    // bullets: three notebook strips are the text strips themselves; shield + stop sign cut-outs
    bullets: (sd) => ({ bg: base(sd) + grid(80, 520, 920, 920, sd + 41, "#f6f1e4"), parts: [
      part(`<g ${SH}><path d="M200 1500l110 -40l110 40v90c0 80 -60 130 -110 150c-50 -20 -110 -70 -110 -150z" fill="${C.teal}"/><path d="M262 1590l36 36l70 -76" stroke="${C.paper}" stroke-width="22" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`, 310, 1600, 0.4, { dx: 160, r: -12, s0: 1.3 }),
      part(`<g ${SH}><rect x="783" y="1600" width="22" height="200" fill="#8a9a9c"/><polygon points="740,1480 850,1480 905,1535 905,1645 850,1700 740,1700 685,1645 685,1535" fill="${C.red}"/><polygon points="755,1505 835,1505 878,1548 878,1632 835,1675 755,1675 712,1632 712,1548" fill="none" stroke="#fff" stroke-width="8"/><rect x="735" y="1578" width="120" height="24" rx="6" fill="#fff"/></g>`, 795, 1590, 0.6, { dx: -160, r: 14, s0: 1.3 }),
    ] }),
    // takeaway: graduation cap on an open book of chart paper, paper rocket ready to launch
    takeaway: (sd) => {
      const page = (x, flip) => { let s = `<polygon points="${flip ? `${x},1180 ${x + 330},1160 ${x + 330},1460 ${x},1480` : `${x},1160 ${x + 330},1180 ${x + 330},1480 ${x},1460`}" fill="${C.paper}"/>`;
        for (let gy = 1210; gy < 1450; gy += 34) s += `<line x1="${x + 20}" y1="${gy}" x2="${x + 310}" y2="${gy}" stroke="${C.teal}" stroke-opacity=".2" stroke-width="2"/>`;
        const pts = [0, 1, 2, 3, 4, 5].map((i) => `${x + 30 + i * 55},${1420 - i * 32 - (i % 2) * 40}`).join(" ");
        return s + `<polyline points="${pts}" fill="none" stroke="${flip ? C.green : C.teal}" stroke-width="10" stroke-linejoin="round"/>`; };
      return { bg: base(sd), parts: [
        part(`<g ${SH}><polygon points="180,1170 540,1200 900,1170 900,1510 540,1540 180,1510" fill="${C.teal2}"/>${page(200, false)}${page(540, true)}</g>`, 540, 1340, 0.15, { dy: 160, s0: 1.08 }),
        part(`<g ${SH}><path d="M440 1110v60c0 30 200 30 200 0v-60z" fill="${C.ink}"/><polygon points="540,1010 740,1080 540,1150 340,1080" fill="${C.ink}"/><path d="M540 1080l150 30v70" stroke="${C.gold}" stroke-width="8" fill="none"/><circle cx="690" cy="1190" r="16" fill="${C.gold}"/></g>`, 540, 1100, 0.55, { dy: -220, r: -14, s0: 1.2 }),
        part(`<g class="fly" data-t0="2.2" data-dur="1.4" data-dx="60" data-dy="-900"><g ${SH}><path d="M860 1290c0 -90 30 -150 50 -170c20 20 50 80 50 170z" fill="${C.paper}"/><circle cx="910" cy="1200" r="16" fill="${C.blue}"/>` +
          `<path d="M860 1250l-30 60h30zM960 1250l30 60h-30z" fill="${C.red}"/><path d="M885 1290l25 70l25 -70z" fill="#f2a93b"/></g></g>`, 910, 1250, 0.85, { dy: 120, s0: 1.3 }),
      ] };
    },
    // cta: paper smartphone with chat bubbles, paper airplane flying out
    cta: (sd) => ({ bg: base(sd, "#d6e6df"), parts: [
      part(`<g ${SH} transform="rotate(-7 400 1200)"><rect x="200" y="760" width="400" height="760" rx="56" fill="${C.ink}"/><rect x="226" y="830" width="348" height="620" rx="18" fill="${C.paper}"/>` +
        `<rect x="250" y="870" width="220" height="70" rx="30" fill="${C.tealL}"/><rect x="330" y="960" width="220" height="70" rx="30" fill="#ffe27a"/><rect x="250" y="1050" width="180" height="70" rx="30" fill="${C.tealL}"/></g>`, 400, 1140, 0.15, { dx: 180, dy: 140, r: -6, s0: 1.08 }),
      part(`<g class="fly" data-t0="2.6" data-dur="1.6" data-dx="420" data-dy="-520"><g ${SH}><polygon points="560,1180 760,1090 640,1250" fill="${C.blue}"/><polygon points="640,1250 760,1090 660,1200" fill="#2a5f94"/><polygon points="560,1180 640,1250 620,1200" fill="#cfe2f5"/></g></g>`, 660, 1170, 0.7, { dx: -120, dy: 60, r: -10, s0: 1.4 }),
    ] }),
    lockup: (sd) => ({ bg: `<rect width="1080" height="1920" fill="${C.teal2}"/>` + clip(-60, 200, 470, 520, sd + 5, -8) + clip(700, 1350, 460, 420, sd + 7, 6), parts: [] }),
  };
  window.VOX_ART = A;
  window.VOX_DEFS = `<defs><filter id="ds" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#2a1e0e" flood-opacity=".32"/></filter>` +
    `<pattern id="ht" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#d8d0bc"/><circle cx="5" cy="5" r="3" fill="#6f6a5c"/></pattern></defs>`;
})();
