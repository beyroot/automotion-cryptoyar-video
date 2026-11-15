// Renders one episode to out/<id>.mp4 (+ .jpg cover).
// One encoded file per scene, joined with -c copy, then sound is muxed with -c:v copy.
import puppeteer from "puppeteer-core";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8"));

export function findChrome() {
  const c = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA || ""}/Google/Chrome/Application/chrome.exe`,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  const hit = c.find((p) => fs.existsSync(p));
  if (!hit) throw new Error("Chrome پیدا نشد. متغیر CHROME_PATH را تنظیم کنید.");
  return hit;
}

function ff(args, input) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { input, maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error("ffmpeg: " + (r.stderr?.toString() || r.error));
}

export async function renderEpisode(ep, { frames = null, outDir = path.join(ROOT, "out") } = {}) {
  const { width, height, fps } = cfg.video;
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = path.join(outDir, `.tmp-${ep.id}`);
  fs.mkdirSync(tmp, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: findChrome(), headless: true,
    args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb", "--font-render-hinting=none", "--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(ROOT, "template", "index.html")).href);
    const info = await page.evaluate((e, b) => window.build(e, b), ep, cfg.brand);
    const shot = async (t) => {
      await page.evaluate((x) => window.seek(x), t);
      return page.screenshot({ type: "jpeg", quality: 92, optimizeForSpeed: true });
    };

    // preview mode: a few stills only
    if (frames) {
      const files = [];
      for (const t of frames) {
        const f = path.join(outDir, `${ep.id}-t${String(t).replace(".", "_")}.jpg`);
        fs.writeFileSync(f, await shot(t)); files.push(f);
      }
      return { info, files };
    }

    const parts = [];
    for (const [i, sc] of info.scenes.entries()) {
      const n = Math.round(sc.dur * fps);
      const part = path.join(tmp, `s${String(i).padStart(2, "0")}.mp4`), work = part.replace(".mp4", ".part.mp4");
      const enc = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(fps), "-i", "-",
        "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", String(fps), work], { stdio: ["pipe", "inherit", "inherit"] });
      const done = new Promise((res, rej) => enc.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg exit " + c)))));
      for (let f = 0; f < n; f++) {
        const buf = await shot(sc.start + f / fps);
        if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once("drain", r));
      }
      enc.stdin.end(); await done;
      fs.renameSync(work, part); parts.push(part);
      process.stdout.write(`  صحنه ${i + 1}/${info.scenes.length} (${sc.type}) ✓\n`);
    }

    // cover = the hook, fully revealed
    const cover = path.join(outDir, `${ep.id}.jpg`);
    fs.writeFileSync(cover, await shot(Math.min(info.scenes[0].dur - 0.5, 3.4)));

    const list = path.join(tmp, "list.txt");
    fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
    const silent = path.join(tmp, "silent.mp4");
    ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);

    const out = path.join(outDir, `${ep.id}.mp4`);
    // brand music (original track from insta-motion), looped to length, faded at both ends
    const music = path.join(ROOT, "assets", "audio", "music-viral.mp3");
    if (fs.existsSync(music)) {
      const T = info.total;
      ff(["-i", silent, "-stream_loop", "-1", "-i", music, "-filter_complex",
        `[1:a]atrim=0:${T},volume=0.6,afade=t=in:d=0.27,afade=t=out:st=${(T - 0.8).toFixed(2)}:d=0.8[a]`,
        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-t", T.toFixed(2), "-movflags", "+faststart", out]);
    } else {
      ff(["-i", silent, "-c", "copy", "-movflags", "+faststart", out]);
    }
    fs.rmSync(tmp, { recursive: true, force: true });
    return { info, out, cover };
  } finally {
    await browser.close();
  }
}

// CLI: node src/render.mjs <episodeId> [--frames 1,5,9]
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const id = process.argv[2];
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "episodes.json"), "utf8"));
  const ep = bank.find((e) => e.id === id);
  if (!ep) { console.error("اپیزود پیدا نشد:", id); process.exit(1); }
  const fi = process.argv.indexOf("--frames");
  const frames = fi > 0 ? process.argv[fi + 1].split(",").map(Number) : null;
  const r = await renderEpisode(ep, { frames });
  console.log(JSON.stringify(r, null, 1));
}
