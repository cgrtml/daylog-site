// ormaio servis calisani: cevrimdisi kabuk ve statik veri onbellegi.
// HTML ve env.js once agdan (guncel surum), statik veri ve gorseller once onbellekten (arkada tazelenir).
// Supabase, hava ve yol servisleri onbellege alinmaz.
const SURUM = "ormaio-v1";
const KABUK = ["./", "index.html", "env.js", "manifest.webmanifest", "favicon.svg", "favicon-32.png", "apple-touch-icon.png", "icon-192.png"];
const DIS_ONBELLEK = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\//;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SURUM).then(c => Promise.all(KABUK.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SURUM).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function agOnce(req) {
  const c = await caches.open(SURUM);
  try {
    const r = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error("zaman")), 5000))]);
    if (r && r.ok) c.put(req, r.clone());
    return r;
  } catch {
    return (await c.match(req, { ignoreSearch: true })) || (await c.match("index.html")) || Response.error();
  }
}
async function onbellekOnce(req) {
  const c = await caches.open(SURUM);
  const eski = await c.match(req);
  const taze = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => null);
  return eski || (await taze) || Response.error();
}
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (req.mode === "navigate" || /\/(index\.html|env\.js)?$/.test(u.pathname)) return e.respondWith(agOnce(req));
    if (/\.(json|jpg|jpeg|png|svg|webp|webmanifest)$/i.test(u.pathname)) return e.respondWith(onbellekOnce(req));
    return;
  }
  if (DIS_ONBELLEK.test(req.url)) e.respondWith(onbellekOnce(req));
});
