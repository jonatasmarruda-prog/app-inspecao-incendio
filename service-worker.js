const CACHE='inspecao-incendio-v5';
const ASSETS=['./','./index.html','./manifest.json','./service-worker.js','./assinatura.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function withSignatureScript(response){
  try{
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html')) return response;
    const text=await response.text();
    if(text.includes('assinatura.js')) return new Response(text,{headers:{'Content-Type':'text/html; charset=UTF-8'}});
    const injected=text.replace('</body>','<script src="assinatura.js"></script></body>');
    return new Response(injected,{headers:{'Content-Type':'text/html; charset=UTF-8','Cache-Control':'no-cache'}});
  }catch(_){return response}
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith((async()=>{
    try{
      const r=await fetch(e.request,{cache:'no-store'});
      const out=await withSignatureScript(r.clone());
      caches.open(CACHE).then(c=>c.put(e.request,out.clone())).catch(()=>{});
      return out;
    }catch(_){
      const cached=await caches.match(e.request);
      if(cached)return withSignatureScript(cached);
      const home=await caches.match('./index.html');
      return home?withSignatureScript(home):new Response('Offline',{status:503});
    }
  })());
});
