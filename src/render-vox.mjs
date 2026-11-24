// Vox paper-cutout version of an episode: same narration, timing and audio mix as render.mjs,
// visuals from template-vox/ (paper collage drawn in code + Persian text typeset on torn strips).
//
//   node src/render-vox.mjs ep31                    -> out-vox/ep31/ep31-vox.mp4 (+ cover .jpg)
//   node src/render-vox.mjs ep31 --frames 2,9,20    -> stills only, for a quick look
//
// Optional: drop text-free frames in assets/vox/<id>/s00.jpg … (one per scene, 9:16) and they replace the
// code-drawn backdrop. Never generate Persian text inside images; text always comes from episodes.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderEpisode } from "./render.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2];
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "episodes.json"), "utf8"));
const ep = bank.find((e) => e.id === id);
if (!ep) { console.error("اپیزود پیدا نشد:", id); process.exit(1); }

const fi = process.argv.indexOf("--frames");
const frames = fi > 0 ? process.argv[fi + 1].split(",").map(Number) : null;
const outDir = path.join(ROOT, "out-vox", id);

const dir = path.join(ROOT, "assets", "vox", id);
const voxFrames = fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => /^s\d\d\.(jpe?g|png|webp)$/i.test(f)).sort().map((f) => `../assets/vox/${id}/${f}`)
  : [];

const r = await renderEpisode(ep, {
  frames, outDir, template: "template-vox", musicVol: 0.3,
  prep: (e) => ({ ...e, voxFrames }),
});
if (r.out) {
  for (const [k, v] of [["out", `${id}-vox.mp4`], ["cover", `${id}-vox.jpg`]]) {
    const dst = path.join(outDir, v); fs.renameSync(r[k], dst); r[k] = dst;
  }
}
console.log(JSON.stringify({ ...r, info: { total: r.info.total, overflow: r.info.overflow, scenes: r.info.scenes } }, null, 1));
if (r.info.overflow?.length) console.warn("هشدار: متن از کادر بیرون زده", r.info.overflow);
