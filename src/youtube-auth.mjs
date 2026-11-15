// One-time helper: prints a YouTube refresh token.  Run:  npm run yt-auth
// (OAuth client type must be "Desktop app"; set YT_CLIENT_ID / YT_CLIENT_SECRET first.)
import http from "node:http";
const { YT_CLIENT_ID, YT_CLIENT_SECRET } = process.env;
if (!YT_CLIENT_ID || !YT_CLIENT_SECRET) { console.error("اول YT_CLIENT_ID و YT_CLIENT_SECRET را تنظیم کنید."); process.exit(1); }
const redirect = "http://127.0.0.1:8765";
const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
  client_id: YT_CLIENT_ID, redirect_uri: redirect, response_type: "code", access_type: "offline", prompt: "consent",
  scope: "https://www.googleapis.com/auth/youtube.upload" });
console.log("این آدرس را در مرورگر باز کنید و با اکانتِ کانال وارد شوید:\n\n" + url + "\n");
http.createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get("code");
  if (!code) { res.end("no code"); return; }
  const tok = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET, redirect_uri: redirect, grant_type: "authorization_code" }) }).then((r) => r.json());
  res.end("OK - به ترمینال برگردید.");
  console.log(tok.refresh_token ? "\nYT_REFRESH_TOKEN=" + tok.refresh_token : "\nخطا: " + JSON.stringify(tok));
  process.exit(0);
}).listen(8765, "127.0.0.1");
