(()=>{
'use strict';
const FLAG='__sstPwaInstallFixV3';
if(window[FLAG])return;window[FLAG]=true;
const VERSION='20260909-05';

function ensureManifest(){
  let link=document.querySelector('link[rel="manifest"]');
  if(!link){link=document.createElement('link');link.rel='manifest';document.head.appendChild(link)}
  link.href='./manifest.json?v='+VERSION;
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
  icon.href='./icon-192.png?v='+VERSION;
}

async function registerSW(){
  if(!('serviceWorker' in navigator))return null;
  try{
    const regs=await navigator.serviceWorker.getRegistrations().catch(()=>[]);
    for(const r of regs){if(r.scope.startsWith(location.origin))try{await r.update()}catch(_){ }}
    const reg=await navigator.serviceWorker.register('./service-worker.js?v='+VERSION,{scope:'./',updateViaCache:'none'});
    try{await reg.update()}catch(_){ }
    await navigator.serviceWorker.ready.catch(()=>null);
    return reg;
  }catch(e){console.error('[PWA] Service Worker:',e);return null}
}

function ensureInstallButton(){
  let btn=document.getElementById('sstPwaInstallBtn');
  if(btn)return btn;
  const host=document.querySelector('#sstDemoWelcome .sd-body')||document.querySelector('#home .hero');
  if(!host)return null;
  btn=document.createElement('button');
  btn.type='button';btn.id='sstPwaInstallBtn';btn.className='sd-primary sd-wide';
  btn.style.marginTop='12px';btn.style.display='none';btn.textContent='📲 Instalar aplicativo';
  btn.onclick=async()=>{const ok=await window.sstInstallApp?.();if(!ok)alert('A instalação ainda não foi liberada pelo navegador. Abra pelo Google Chrome, toque em Entrar no sistema e permaneça nesta página por pelo menos 30 segundos antes de tentar novamente.')};
  host.appendChild(btn);return btn;
}

let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();deferredPrompt=e;window.__sstPwaInstallReady=true;
  const btn=ensureInstallButton();if(btn)btn.style.display='block';
  document.dispatchEvent(new CustomEvent('sst-pwa-install-ready'));
});
window.addEventListener('appinstalled',()=>{deferredPrompt=null;window.__sstPwaInstalled=true;const b=document.getElementById('sstPwaInstallBtn');if(b)b.style.display='none'});
window.sstInstallApp=async()=>{
  if(!deferredPrompt)return false;
  await deferredPrompt.prompt();
  const choice=await deferredPrompt.userChoice.catch(()=>null);
  if(choice?.outcome==='accepted')deferredPrompt=null;
  return choice?.outcome==='accepted';
};

async function boot(){
  ensureManifest();ensureInstallButton();
  const reg=await registerSW();
  setTimeout(ensureManifest,500);
  if(reg&&!navigator.serviceWorker.controller){
    const key='sst_pwa_control_reload_'+VERSION;
    if(!sessionStorage.getItem(key)){
      sessionStorage.setItem(key,'1');
      setTimeout(()=>location.reload(),900);
    }
  }
}
ensureManifest();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
