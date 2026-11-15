// "نبض بازار": builds an episode from live CoinGecko prices. Returns null if data is unavailable
// (the caller then falls back to the evergreen bank; we never publish stale or made-up numbers).
const TIPS = [
  "این فقط *گزارشِ قیمته*، نه سیگنالِ خرید و فروش.",
  "یک روزِ سبز یا قرمز، *روند* نیست.",
  "قبل از هر معامله، *حد ضرر* رو مشخص کن.",
  "خبر رو بخون؛ ولی با *برنامهٔ خودت* معامله کن.",
];
const SYM = { bitcoin: "BTC", ethereum: "ETH", solana: "SOL", binancecoin: "BNB", ripple: "XRP" };

export async function buildPulse(cfg, dateStr, dayIndex) {
  let data;
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${cfg.pulse.coins.join(",")}&price_change_percentage=24h`;
    const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    data = await r.json();
    if (!Array.isArray(data) || !data.length) throw new Error("empty");
  } catch (e) {
    console.warn("نبض بازار: دادهٔ قیمت در دسترس نیست →", e.message);
    return null;
  }
  const rows = cfg.pulse.coins.map((id) => data.find((d) => d.id === id)).filter(Boolean)
    .map((d) => ({ sym: SYM[d.id] || d.symbol.toUpperCase(), chg: d.price_change_percentage_24h ?? 0, price: d.current_price }));
  const max = Math.max(...rows.map((r) => Math.abs(r.chg)), 0.5);
  const upCount = rows.filter((r) => r.chg >= 0).length;
  const mood = upCount > rows.length / 2 ? "بیشترِ بازار *سبز* بود" : upCount === 0 ? "بازار امروز *قرمز* بود" : "بازار امروز *دودل* بود";
  const btc = rows.find((r) => r.sym === "BTC") || rows[0];
  const faDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "long", timeZone: cfg.schedule.timezone }).format(new Date(dateStr + "T12:00:00Z"));
  const sign = (n) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
  return {
    id: `pulse-${dateStr}`, series: "نبض بازار", title: `نبض بازار، ${faDate}`,
    caption: `نبض بازار در ${faDate}: ${rows.map((r) => `${r.sym} ${sign(r.chg)}`).join(" · ")}\nمنبع قیمت: CoinGecko`,
    scenes: [
      { type: "hook", kicker: `نبض بازار · ${faDate}`, text: `${mood}؛ در ۲۰ ثانیه ببین` },
      { type: "bars", title: "تغییرِ ۲۴ ساعته", note: "منبع: CoinGecko",
        rows: rows.map((r) => ({ label: r.sym, pct: Math.max(4, Math.round((Math.abs(r.chg) / max) * 100)), value: sign(r.chg), tone: r.chg >= 0 ? "up" : "down" })) },
      { type: "number", label: `قیمتِ ${btc.sym} به دلار`, value: Math.round(btc.price), prefix: "$", tone: btc.chg >= 0 ? "up" : "down", note: `تغییرِ ۲۴ ساعته: *\u2066${sign(btc.chg)}\u2069*` },
      { type: "takeaway", kicker: "یادآوری", text: TIPS[dayIndex % TIPS.length] },
    ],
  };
}
