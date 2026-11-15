// Publishes a Reel with the Instagram Graph API (resumable upload, no public file URL needed). Needs:
// IG_USER_ID, IG_ACCESS_TOKEN  (see README, "اینستاگرام")
import fs from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function publishInstagram({ file, caption, cfg }) {
  const { IG_USER_ID, IG_ACCESS_TOKEN } = process.env;
  if (!IG_USER_ID || !IG_ACCESS_TOKEN) return { skipped: "کلیدهای اینستاگرام تنظیم نشده" };
  const G = `https://graph.facebook.com/${cfg.instagram.apiVersion}`;
  const j = async (r) => { const b = await r.json(); if (!r.ok || b.error) throw new Error("Instagram: " + JSON.stringify(b.error || b)); return b; };

  // 1) container
  const c = await j(await fetch(`${G}/${IG_USER_ID}/media`, { method: "POST",
    body: new URLSearchParams({ media_type: "REELS", upload_type: "resumable", caption, share_to_feed: String(cfg.instagram.shareToFeed), access_token: IG_ACCESS_TOKEN }) }));
  // 2) bytes -> rupload host (use the uri Meta returns)
  const bytes = fs.readFileSync(file);
  await j(await fetch(c.uri || `https://rupload.facebook.com/ig-api-upload/${cfg.instagram.apiVersion}/${c.id}`, { method: "POST",
    headers: { authorization: `OAuth ${IG_ACCESS_TOKEN}`, offset: "0", file_size: String(bytes.length) }, body: bytes }));
  // 3) wait for processing
  for (let i = 0; i < 60; i++) {
    const s = await j(await fetch(`${G}/${c.id}?fields=status_code,status&access_token=${IG_ACCESS_TOKEN}`));
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error("Instagram processing: " + JSON.stringify(s));
    if (i === 59) throw new Error("Instagram: پردازش ویدیو بیش از ۵ دقیقه طول کشید");
    await sleep(5000);
  }
  // 4) publish
  const p = await j(await fetch(`${G}/${IG_USER_ID}/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: c.id, access_token: IG_ACCESS_TOKEN }) }));
  return { id: p.id };
}
