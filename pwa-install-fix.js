(()=>{
'use strict';
const FLAG='__sstPwaInstallFixV2';
if(window[FLAG])return;window[FLAG]=true;

function ensureManifest(){
  let link=document.querySelector('link[rel="manifest"]');
  if(!link){link=document.createElement('link');link.rel='manifest';document.head.appendChild(link)}
  link.href='./manifest.json?v=20260909-04';
  if(!document.querySelector('meta[name="mobile-web-app-capable"]')){
    const m=document.createElement('meta');m.name='mobile-web-app-capable';m.content='yes';document.head.appendChild(m);
  }
  if(!document.querySelector('meta[name="apple-mobile-web-app-capable"]')){
    const m=document.createElement('meta');m.name='apple-mobile-web-app-capable';m.content='yes';document.head.appendChild(m);
  }
  if(!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')){
    const m=document.createElement('meta');m.name='apple-mobile-web-app-status-bar-style';m.content='black-translucent';document.head.appendChild(m);
  }
  let icon=document.querySelector('link[rel="apple-touch-icon"]');
  if(!icon){icon=document.createElement('link');icon.rel='apple-touch-icon';document.head.appendChild(icon)}
  icon.href='./icon-192.svg?v=20260909-04';
}

async function registerSW(){
  if(!('serviceWorker' in navigator))return null;
  try{
    const regs=await navigator.serviceWorker.getRegistrations().catch(()=>[]);
    for(const r of regs){if(r.scope.startsWith(location.origin))try{await r.update()}catch(_){ }}
    const reg=await navigator.serviceWorker.register('./service-worker.js?v=20260909-04',{scope:'./',updateViaCache:'none'});
    try{await reg.update()}catch(_){ }
    await navigator.serviceWorker.ready.catch(()=>null);
    return reg;
  }catch(e){console.error('[PWA] Service Worker:',e);return null}
}

let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();deferredPrompt=e;
  window.__sstPwaInstallReady=true;
  document.dispatchEvent(new CustomEvent('sst-pwa-install-ready'));
});
window.addEventListener('appinstalled',()=>{deferredPrompt=null;window.__sstPwaInstalled=true});
window.sstInstallApp=async()=>{
  if(!deferredPrompt)return false;
  await deferredPrompt.prompt();
  const choice=await deferredPrompt.userChoice.catch(()=>null);
  if(choice?.outcome==='accepted')deferredPrompt=null;
  return choice?.outcome==='accepted';
};

async function boot(){ensureManifest();await registerSW();setTimeout(ensureManifest,500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
