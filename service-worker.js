const CACHE='inspecao-incendio-v11';
const ASSETS=['./','./index.html','./manifest.json','./service-worker.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith((async()=>{
  try{
   const r=await fetch(e.request,{cache:'no-store'});
   if(e.request.url.includes('/index.html')||e.request.mode==='navigate')caches.open(CACHE).then(c=>c.put(e.request,r.clone())).catch(()=>{});
   return r;
  }catch(_){
   const cached=await caches.match(e.request);
   if(cached)return cached;
   const home=await caches.match('./index.html');
   return home?home:new Response('Offline',{status:503});
  }
 })());
});