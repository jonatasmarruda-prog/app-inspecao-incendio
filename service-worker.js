const CACHE='inspecao-incendio-v6';
const ASSETS=['./','./index.html','./manifest.json','./service-worker.js','./assinatura.js','./empresa.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function enhance(response){
 try{
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const text=await response.text();
  let out=text;
  if(!out.includes('assinatura.js'))out=out.replace('</body>','<script src="assinatura.js?v=6"></script></body>');
  if(!out.includes('empresa.js'))out=out.replace('</body>','<script src="empresa.js?v=6"></script></body>');
  return new Response(out,{headers:{'Content-Type':'text/html; charset=UTF-8','Cache-Control':'no-cache'}});
 }catch(_){return response}
}
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith((async()=>{
  try{
   const r=await fetch(e.request,{cache:'no-store'});
   const out=await enhance(r.clone());
   caches.open(CACHE).then(c=>c.put(e.request,out.clone())).catch(()=>{});
   return out;
  }catch(_){
   const cached=await caches.match(e.request);
   if(cached)return enhance(cached);
   const home=await caches.match('./index.html');
   return home?enhance(home):new Response('Offline',{status:503});
  }
 })());
});