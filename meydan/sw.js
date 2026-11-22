// Meydan service worker: сначала сеть, без интернета — кэш (оболочка приложения)
const C='meydan-v1';
const SHELL=['./','index.html','app.js','i18n.js','data.js','manifest.webmanifest','icons/icon-192.png','icons/icon.svg'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).catch(()=>{})); self.skipWaiting() });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())) });
self.addEventListener('fetch',e=>{ const r=e.request, u=new URL(r.url); if(r.method!=='GET'||u.origin!==location.origin) return;
  e.respondWith(fetch(r).then(res=>{ if(res.ok){ const cp=res.clone(); caches.open(C).then(c=>c.put(r,cp)) } return res })
    .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):undefined)))) });
