/* 每日喵喵 工作台 Service Worker v3 —— 离线可访问 + 可安装为 App
   策略：只处理同源请求，绝不拦截外部 API（api.github.com 等） */
const CACHE = 'daily-meow-v3';
const CORE = ['./', 'index.html', 'manifest.json', 'sw.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // 只处理 GET 方法
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // ⚠️ 关键修复：只处理同源请求，外部 API 一律放行！
  if (url.origin !== location.origin) return;

  // 导航/页面请求：网络优先（永远拿最新页面）
  if (e.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('./')))
    );
    return;
  }

  // 同源静态资源：缓存优先 + 后台更新
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      }).catch(() => cached)
    )
  );
});
