// Narration ("voice studio") helpers. The voice itself is generated in a Claude session with the Higgsfield
// voice studio (config.voice: elevenlabs_v4 · Kevin · stability 0.3), because Actions has no access to it.
// Finished lines live in assets/vo/<episode>/sNN.m4a (+ assets/vo/_shared/{cta,lockup}.m4a) and are committed;
// render.mjs picks them up automatically, so a narrated episode stays narrated in the daily run.
//
//   node src/voice.mjs plan [--all]            lines still missing (JSON: key, text, file)
//   node src/voice.mjs process <raw> <out.m4a> [tempo]   clean a raw take: trim silence, speed up, EQ, compress, -15 LUFS
import fs from "node:fs"; import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8"));
export const VO_DIR = path.join(ROOT, "assets", "vo");
const pad = (i) => String(i).padStart(2, "0");

export function voLines(bank) {
  const out = [
    { key: "_shared/cta", text: cfg.brand.voCta },
    { key: "_shared/lockup", text: cfg.brand.voLockup },
  ];
  for (const ep of bank) ep.scenes.forEach((s, i) => s.vo && out.push({ key: `${ep.id}/s${pad(i)}`, text: s.vo }));
  return out.map((l) => ({ ...l, file: path.join(VO_DIR, l.key + ".m4a") }));
}

export function probe(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return +r.stdout.toString().trim();
}

// Voice durations for one episode: { scenes: [sec|undefined], end: [cta, lockup] } or null if not narrated.
export function voFor(ep) {
  const scenes = ep.scenes.map((_, i) => {
    const f = path.join(VO_DIR, ep.id, `s${pad(i)}.m4a`);
    return fs.existsSync(f) ? { file: f, dur: probe(f) } : null;
  });
  if (!scenes.some(Boolean)) return null;
  const end = ["cta", "lockup"].map((k) => {
    const f = path.join(VO_DIR, "_shared", k + ".m4a");
    return fs.existsSync(f) ? { file: f, dur: probe(f) } : null;
  });
  return { scenes, end };
}

// Post chain from the Jobs- news reels: trim silence at both ends, atempo, highpass 90, +3 dB @3.2 kHz, compressor, -15 LUFS.
export function processTake(raw, out, tempo = cfg.voice?.tempo || 1.15) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const trim = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05";
  const af = [trim, "areverse", trim, "areverse", `atempo=${tempo}`, "highpass=f=90",
    "equalizer=f=3200:t=q:w=1.0:g=3", "acompressor=threshold=-18dB:ratio=3:attack=5:release=80:makeup=2",
    "loudnorm=I=-15:TP=-1.5:LRA=7", "aresample=48000"].join(",");
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af", af, "-ac", "1", "-c:a", "aac", "-b:a", "160k", out]);
  if (r.status !== 0) throw new Error("ffmpeg: " + r.stderr.toString());
  return probe(out);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === "plan") {
    const bank = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "episodes.json"), "utf8"));
    const all = process.argv.includes("--all");
    const rows = voLines(bank).filter((l) => all || !fs.existsSync(l.file)).map((l) => ({ ...l, file: path.relative(ROOT, l.file) }));
    console.log(JSON.stringify({ voice: cfg.voice, lines: rows }, null, 1));
  } else if (cmd === "process") {
    console.log(processTake(a, b, c ? +c : undefined).toFixed(2) + "s  " + b);
  } else {
    console.log("usage: node src/voice.mjs plan [--all] | process <raw> <out.m4a> [tempo]");
  }
}
