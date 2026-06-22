/* ============================================================
   Service Worker：アプリの部品をキャッシュして、
   オフラインでも開けるようにします。
   ファイルを更新したら、下の CACHE の数字（v1→v2…）を上げてください。
   ============================================================ */
const CACHE = "katazuke-app-v5";

const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/data.js",
  "./js/storage.js",
  "./js/config.js",
  "./js/sync.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request).then(function (res) {
        // 同一オリジンのものだけキャッシュに追加
        if (res && res.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        // オフラインかつ未キャッシュ：トップを返す
        return caches.match("./index.html");
      });
    })
  );
});
