---
name: cryptoyar-vox-episode
description: Build a Vox-style paper-cutout reel (9:16) for one CryptoYar episode with the user's own motion engine; use when Soroush asks for a "Vox" / کاغذی / paper-cutout version of an episode (ep31, ep32, …).
---

# CryptoYar · Vox paper-cutout episode

Turns one episode from the bank into a vertical 9:16 reel in the Vox explainer look: layered paper collage, archival
newspaper clippings, halftone, warm off-white + muted teal, Persian text typeset on torn paper strips, 12 fps
stop-motion feel, the episode's existing narration and the brand music underneath.

## Two hard rules

1. **No paid credits without Soroush's yes.** Frames are drawn in code by default (template-vox/art.js).
   ElevenLabs, Higgsfield or any other paid generation (images, voice, video, music) needs his explicit yes
   in this conversation first, naming the tool and roughly how many credits.
2. **Never put Persian text inside an image.** All on-screen text comes from `content/episodes.json` and is
   typeset by the template with Vazirmatn. Images and art are text-free.

## Inputs

- `id`: episode id in `content/episodes.json` (e.g. `ep31`). Scene types supported: hook, define, number,
  versus, bullets, takeaway; CTA and lockup are added automatically from `config.json → brand`.
- Narration: `assets/vo/<id>/sNN.m4a` (one per scene) + `assets/vo/_shared/{cta,lockup}.m4a`.
  - If they exist, reuse them (scenes stretch to the voice line).
  - If not: do **not** generate TTS on your own. Give Soroush the `vo` lines of each scene to record
    (his own voice, or a voice he approves; never the ElevenLabs voice "amir"), then clean each take with
    `node src/voice.mjs process <raw> assets/vo/<id>/sNN.m4a`.

## Where things live (repo beyroot/automotion-cryptoyar-video)

| Path | What |
| --- | --- |
| `template-vox/index.html` | page shell, grain + halftone overlays, persistent brand tag (logo + handle) |
| `template-vox/art.js` | paper-collage illustrations per scene type, drawn in SVG (backdrop + cut-out parts) |
| `template-vox/vox.js` | deterministic player: `build(ep, brand)`, `seek(t)`; strip/stamp/tile/bubble layout per scene type |
| `template-vox/vox.css` | palette, torn strips, marker highlight, stamps, CTA bubble, lockup card |
| `src/render-vox.mjs` | CLI; reuses `src/render.mjs` (puppeteer frames → ffmpeg, narrated mix with ducked music) |
| `.github/workflows/vox-render.yml` | render-only workflow on `claude/vox-*` branches; no secrets, no publishing |
| `vox-job.json` | what the workflow renders: `{ "id": "ep31", "frames": "4.2,11", "full": true }` |
| `assets/vox/<id>/sNN.jpg` | optional text-free 9:16 frames; if present they replace the code-drawn backdrop |

Per-scene layout overrides go on the scene in `episodes.json`: `y`, `y0`, `yt`, `yb`, `yg`, `ys: [..]`,
`art` (use another scene's illustration), `dur`.

## Steps

1. Check the episode exists and has narration (see Inputs). Missing narration → ask for the recording, keep going
   with visuals (scenes fall back to word-count timing).
2. Branch from the branch that has the narration (currently `claude/trading-crypto-videos-eg9h3p`) or from the
   latest vox branch: `claude/vox-<id>`. Never push to `main`, never touch `daily.yml` or secrets.
3. If the episode uses a new metaphor, add an illustration to `art.js` (paper parts: torn shapes, clippings,
   pins, marker swipes; each part slides in at its own `t0`). Keep art text-free.
4. Preview: set `vox-job.json` to `{ "id": "<id>", "frames": "<a time in each scene>", "full": false }`, commit,
   push. The workflow commits stills to `out-vox/<id>/` on the branch (`[skip ci]`). Fetch and look at every still:
   no text overlapping art, nothing below y=1740 (brand tag), Persian joins intact.
5. Full render: `"full": true`, push again → `out-vox/<id>/<id>-vox.mp4` + `<id>-vox.jpg`.
6. Copy the MP4 and cover to `/mnt/project-files/cryptoyar-vox/<id>/` and report the path. Do not post or publish
   anywhere; the channel session sends it to the محتوا channel.

Local run (Windows, Node 22 + ffmpeg + Chrome): `npm install` then `node src/render-vox.mjs ep31`.
The cloud container can't run Chrome or npm, so there it always goes through the workflow.

## Master style (for any approved image generation, and the reference for code-drawn art)

> Vox explainer style, layered paper cutout collage, archival financial newspaper clippings, subtle halftone dot
> texture, warm off-white and muted teal color palette, crisp drop shadows, vertical 9:16 aspect ratio portrait
> composition, clean empty space at the center for text, no text, no letters, no numbers, no watermarks

Scene prompt template: `<one concrete paper-craft metaphor for the scene>. <master style>`.
Note: ElevenLabs' gpt-image models returned 16:9 (1280×720) even with "9:16" in the prompt, and their file host is
blocked from the cloud container; another reason to keep frames in code.

## Motion spec

- Everything that moves steps at 12 fps (stop-motion); video is 30 fps.
- New scene = a paper sheet sliding in from the right over the previous one (RTL forward), 0.55 s.
- Backdrop: slow push-in (1.07 → 1.01) with tiny per-step jitter. Cut-out parts drop in with a small overshoot.
- Text strips appear when the narrator reaches them (word-proportional timing), yellow marker swipes over `*keywords*`.
- Audio: narration on top, brand music at 0.3 ducked under the voice, soft whoosh on scene change, sparkle on the logo.
