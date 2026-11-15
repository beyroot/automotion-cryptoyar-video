// Uploads a video with the YouTube Data API (resumable upload). Needs:
// YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN  (see README, "یوتوب")
import fs from "node:fs";

export async function publishYouTube({ file, title, description, tags, cfg }) {
  const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN } = process.env;
  if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) return { skipped: "کلیدهای یوتوب تنظیم نشده" };

  const tok = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET, refresh_token: YT_REFRESH_TOKEN, grant_type: "refresh_token" }),
  }).then((r) => r.json());
  if (!tok.access_token) throw new Error("YouTube token: " + JSON.stringify(tok));

  const bytes = fs.readFileSync(file);
  const want = cfg.youtube.privacyStatus;
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { authorization: `Bearer ${tok.access_token}`, "content-type": "application/json; charset=UTF-8",
      "x-upload-content-type": "video/mp4", "x-upload-content-length": String(bytes.length) },
    body: JSON.stringify({
      snippet: { title: title.slice(0, 100), description, tags, categoryId: cfg.youtube.categoryId, defaultLanguage: "fa", defaultAudioLanguage: "fa" },
      status: { privacyStatus: want, selfDeclaredMadeForKids: false },
    }),
  });
  const loc = init.headers.get("location");
  if (!init.ok || !loc) throw new Error("YouTube init: " + init.status + " " + (await init.text()));

  const up = await fetch(loc, { method: "PUT", headers: { "content-type": "video/mp4", "content-length": String(bytes.length) }, body: bytes });
  const res = await up.json();
  if (!up.ok) throw new Error("YouTube upload: " + JSON.stringify(res));
  const got = res.status?.privacyStatus;
  if (want === "public" && got !== "public")
    console.warn("⚠ یوتوب ویدیو را «" + got + "» نگه داشت. پروژهٔ API هنوز ممیزی (audit) نشده است؛ README را ببینید.");
  return { id: res.id, url: `https://youtube.com/shorts/${res.id}`, privacy: got };
}
