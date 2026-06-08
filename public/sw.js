const CACHE = 'fund-helper-v1';
const urls = ['index.html','manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(urls)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('gtimg.cn') || e.request.url.includes('eastmoney.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}',{status:200,headers:{'Content-Type':'application/json'}})));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => new Response('offline',{status:503})))
  );
});
