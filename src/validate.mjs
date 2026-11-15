// Lays out every episode without rendering; reports duration and any scene that overflows the safe area.
import puppeteer from "puppeteer-core";
import fs from "node:fs"; import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findChrome } from "./render.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8"));
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "episodes.json"), "utf8"));
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--no-sandbox", "--allow-file-access-from-files"] });
let bad = 0;
for (const ep of bank) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920 });
  await page.goto(pathToFileURL(path.join(ROOT, "template", "index.html")).href);
  const r = await page.evaluate((e, b) => window.build(e, b), ep, cfg.brand);
  const flag = r.overflow.length ? "  ⚠ " + JSON.stringify(r.overflow) : "";
  if (r.overflow.length || r.total > 59) bad++;
  console.log(`${ep.id}  ${r.total.toFixed(1)}s  ${ep.title}${flag}`);
  await page.close();
}
await browser.close();
console.log(bad ? `\n${bad} اپیزود مشکل دارد` : "\nهمه سالم ✓");
process.exit(bad ? 1 : 0);
