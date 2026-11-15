// Daily run: pick today's episode -> render -> publish to YouTube + Instagram.
//   node src/daily.mjs [--date 2026-11-20] [--id ep07] [--no-publish]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { renderEpisode } from "./render.mjs";
import { buildPulse } from "./pulse.mjs";
import { publishYouTube } from "./publish-youtube.mjs";
import { publishInstagram } from "./publish-instagram.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8"));
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "episodes.json"), "utf8"));
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

const today = arg("--date") || new Intl.DateTimeFormat("en-CA", { timeZone: cfg.schedule.timezone }).format(new Date());
const dow = (d) => new Date(d + "T12:00:00Z").getUTCDay();
const days = Math.max(0, Math.round((Date.parse(today) - Date.parse(cfg.schedule.startDate)) / 864e5));
let bankIdx = 0; // number of non-pulse days before today
for (let i = 0; i < days; i++) {
  const d = new Date(Date.parse(cfg.schedule.startDate) + i * 864e5).toISOString().slice(0, 10);
  if (!cfg.schedule.pulseWeekdays.includes(dow(d))) bankIdx++;
}

let ep = null;
if (arg("--id")) ep = bank.find((e) => e.id === arg("--id"));
else if (cfg.schedule.pulseWeekdays.includes(dow(today))) ep = await buildPulse(cfg, today, days);
if (!ep) {
  if (bankIdx >= bank.length) console.warn(`⚠ بانک اپیزود تمام شده (${bank.length})؛ از اول تکرار می‌شود. اپیزود جدید به content/episodes.json اضافه کنید.`);
  ep = bank[bankIdx % bank.length];
}
console.log(`▶ ${today}  ${ep.id}  «${ep.title}»`);

const { out, cover, info } = await renderEpisode(ep);
const seriesTag = "#" + ep.series.replace(/[،,.]/g, "").trim().replace(/\s+/g, "_");
const tags = [...cfg.tags.brand, seriesTag, ...cfg.tags.general];
const caption = `${ep.title}\n\n${ep.caption}\n\n${cfg.brand.cta}: ${cfg.brand.handle}\n${cfg.brand.disclaimer}\n\n${tags.join(" ")}`;
const meta = { date: today, id: ep.id, title: ep.title, seconds: +info.total.toFixed(1), file: out, cover, caption, tags, results: {} };

if (!process.argv.includes("--no-publish")) {
  for (const [name, fn] of [
    ["youtube", () => publishYouTube({ file: out, title: `${ep.title} | ${cfg.brand.name} #Shorts`, description: caption, tags: tags.map((t) => t.replace("#", "")), cfg })],
    ["instagram", () => publishInstagram({ file: out, caption, cfg })],
  ]) {
    try { meta.results[name] = await fn(); } catch (e) { meta.results[name] = { error: e.message }; process.exitCode = 1; }
    console.log(`  ${name}:`, JSON.stringify(meta.results[name]));
  }
}
fs.writeFileSync(out.replace(/\.mp4$/, ".json"), JSON.stringify(meta, null, 2));
console.log("✓ " + out);
