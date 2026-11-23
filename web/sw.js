/* Service worker: o app abre instantâneo e funciona sem internet.
 * - Casca (HTML/CSS/JS/dados): responde do cache na hora e atualiza em segundo plano.
 * - Tiles, pins e fotos: cache primeiro (guardados quando vistos ou pelo botão "Baixar mapa").
 * Mude VERSION quando trocar app.js/style.css para forçar atualização.
 */
const VERSION = "9";
const CORE = "leonida-core-v" + VERSION;
const MEDIA = "leonida-media-v3";
const SHELL = [
  "./", "index.html", "style.css", "app.js", "manifest.webmanifest",
  "vendor/leaflet/leaflet.js", "vendor/leaflet/leaflet.css",
  "data/mapa.json", "data/tiles.json", "data/rotulos.json", "data/rotas.json", "data/icones.json",
  "fonts/roboto-latin-400-normal.woff2", "fonts/roboto-latin-500-normal.woff2", "fonts/roboto-latin-700-normal.woff2",
  "img/icon-180.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CORE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CORE && k !== MEDIA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (/\/(tiles|pins|screenshots)\//.test(url.pathname)) {
    e.respondWith(
      caches.open(MEDIA).then(async (c) => {
        const hit = await c.match(req, { ignoreSearch: true });
        if (hit) return hit;
        const r = await fetch(req);
        if (r.ok) c.put(req, r.clone());
        return r;
      }),
    );
    return;
  }

  // stale-while-revalidate para a casca do app
  e.respondWith(
    caches.open(CORE).then(async (c) => {
      const key = req.mode === "navigate" ? "index.html" : req;
      const hit = await c.match(key, { ignoreSearch: true });
      const net = fetch(req).then((r) => {
        if (r.ok) c.put(key, r.clone());
        return r;
      }).catch(() => hit);
      if (hit) { e.waitUntil(net); return hit; }
      return net;
    }),
  );
});
