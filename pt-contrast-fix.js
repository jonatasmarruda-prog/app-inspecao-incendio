(()=>{
'use strict';

/*
 * Recuperação cirúrgica do módulo PT – Trabalho em Altura.
 * Também garante salvamento robusto da PT no Firestore com compactação
 * automática de fotos e assinaturas antes de gravar em relatorios_sst.
 */
let ptRecoveryPromise=null;

const clone=value=>JSON.parse(JSON.stringify(value??null));
function byteSize(text){try{return new Blob([text]).size}catch(_){return String(text||'').length*2}}

async function compactPTDataImage(dataUrl,max=800,quality=0.56){
  const value=String(dataUrl||'');
  if(!/^data:image\//i.test(value)||value.length<60000)return value;
  try{
    const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=value});
    const w0=img.naturalWidth||img.width,h0=img.naturalHeight||img.height;
    if(!w0||!h0)return value;
    const scale=Math.min(1,max/Math.max(w0,h0));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(w0*scale));
    canvas.height=Math.max(1,Math.round(h0*scale));
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',quality);
  }catch(_){return value}
}

async function compactPTSnapshot(snapshot,maxPhoto=800,photoQuality=0.56,maxSign=600,signQuality=0.5){
  const x=clone(snapshot)||{};
  if(Array.isArray(x.evidencePhotos)){
    for(let i=0;i<x.evidencePhotos.length;i++)x.evidencePhotos[i]=await compactPTDataImage(x.evidencePhotos[i],maxPhoto,photoQuality);
  }
  if(Array.isArray(x.checklistPT)){
    for(const item of x.checklistPT)if(item?.fotoEvidencia)item.fotoEvidencia=await compactPTDataImage(item.fotoEvidencia,maxPhoto,photoQuality);
  }
  if(x.issuer?.signature)x.issuer.signature=await compactPTDataImage(x.issuer.signature,maxSign,signQuality);
  if(Array.isArray(x.workers)){
    for(const worker of x.workers)if(worker?.signature)worker.signature=await compactPTDataImage(worker.signature,maxSign,signQuality);
  }
  return x;
}

async function preparePTSnapshot(snapshot){
  let x=clone(snapshot)||{};
  let json=JSON.stringify(x);
  if(byteSize(json)>700000){x=await compactPTSnapshot(x,800,0.56,600,0.5);json=JSON.stringify(x)}
  if(byteSize(json)>820000){x=await compactPTSnapshot(x,600,0.46,520,0.42);json=JSON.stringify(x)}
  if(byteSize(json)>900000)throw new Error('A PT ficou muito grande para salvar na nuvem. Reduza a quantidade de fotos e tente novamente.');
  return x;
}

function installPTSaveBridge(){
  if(typeof window.cloudSetReport!=='function')return false;
  const current=window.tbmHistoricoSalvar;
  if(current?.__tbmPTCompactSaveBridge)return true;
  const fallback=typeof current==='function'?current:null;

  const bridge=async function(snapshot,meta={}){
    if(snapshot?.type==='pt-altura'){
      const clean=await preparePTSnapshot(snapshot);
      const saved=await window.cloudSetReport(clean);
      try{window.dispatchEvent(new CustomEvent('tbm-cloud-history-saved',{detail:{id:clean.id,type:clean.type}}))}catch(_){ }
      return saved;
    }
    if(fallback)return await fallback(snapshot,meta);
    return await window.cloudSetReport(snapshot);
  };
  bridge.__tbmPTCompactSaveBridge=true;
  window.tbmHistoricoSalvar=bridge;
  window.__tbmPTCloudSaveBound=true;
  window.__tbmPTSaveFixVersion='2026.09.08.1-compact-firestore';
  return true;
}

function injectPTContrast(){
  if(document.getElementById('tbm-pt-contrast-fix-style'))return;
  const s=document.createElement('style');
  s.id='tbm-pt-contrast-fix-style';
  s.textContent=`
    #ptAlturaOverlay .pt-check-group,
    #ptAlturaOverlay .pt-check-item,
    #ptAlturaOverlay .pt-worker,
    #ptAlturaOverlay .pt-fixed-issuer{
      color:#17202b!important;
    }

    #ptAlturaOverlay .pt-check-group,
    #ptAlturaOverlay .pt-check-item,
    #ptAlturaOverlay .pt-worker{
      background:#ffffff!important;
      border-color:#d9e0e8!important;
    }

    #ptAlturaOverlay .pt-fixed-issuer{
      background:#f0fdfa!important;
      border-color:#99d9cf!important;
      border-left-color:#0f4c5c!important;
    }

    #ptAlturaOverlay .pt-check-title,
    #ptAlturaOverlay .pt-check-item b,
    #ptAlturaOverlay .pt-worker-head b,
    #ptAlturaOverlay .pt-worker .field label,
    #ptAlturaOverlay .pt-fixed-issuer .sectionTitle,
    #ptAlturaOverlay .pt-fixed-issuer .field label,
    #ptAlturaOverlay .pt-fixed-issuer .mini{
      color:#17202b!important;
    }

    #ptAlturaOverlay .pt-worker input,
    #ptAlturaOverlay .pt-fixed-issuer input{
      background:#ffffff!important;
      color:#111827!important;
      border-color:#cbd5e1!important;
      -webkit-text-fill-color:#111827!important;
      opacity:1!important;
    }

    #ptAlturaOverlay .pt-check-actions button{
      background:#e9edf2!important;
      color:#111827!important;
      -webkit-text-fill-color:#111827!important;
    }

    /* Solid Badges Premium validados */
    #ptAlturaOverlay .pt-check-actions button.ok{
      background:#198754!important;
      color:#ffffff!important;
      -webkit-text-fill-color:#ffffff!important;
    }

    #ptAlturaOverlay .pt-check-actions button.no{
      background:#dc3545!important;
      color:#ffffff!important;
      -webkit-text-fill-color:#ffffff!important;
    }

    #ptAlturaOverlay .pt-check-actions button.na{
      background:#6c757d!important;
      color:#ffffff!important;
      -webkit-text-fill-color:#ffffff!important;
    }

    #ptAlturaOverlay .pt-sign,
    #ptAlturaOverlay .pt-sign canvas{
      background:#ffffff!important;
      color:#111827!important;
    }

    #ptAlturaOverlay .pt-worker .secondary,
    #ptAlturaOverlay #ptAddWorker{
      color:#f4f6f8!important;
      -webkit-text-fill-color:#f4f6f8!important;
    }
  `;
  document.head.appendChild(s);
}

function patchPTRuntimeSource(source){
  let src=String(source||'');
  if(!src.includes("window.openPTAltura=openPTAltura")){
    throw new Error('Arquivo pt-altura.js incompleto: exportação principal não encontrada.');
  }

  if(!src.includes('function openPTAltura(data)')){
    const marker='async function imageToDataUrl(src){';
    if(!src.includes(marker))throw new Error('Ponto de restauração da PT não encontrado.');

    const runtime=`function openPTAltura(data){
  injectStyle();
  const overlay=ensureOverlay();
  ptState=normalizeState(data||freshState());
  if(!overlay)throw new Error('Container da Permissão de Trabalho indisponível.');
  overlay.classList.remove('hidden');
  document.body.style.overflow='hidden';
  renderPT();
  return ptState;
}
function closePTAltura(){
  if(ptState)savePT(false,false).catch(()=>{});
  const overlay=$('ptAlturaOverlay');
  if(overlay)overlay.classList.add('hidden');
  document.body.style.overflow='';
}

`;
    src=src.replace(marker,runtime+marker);
  }

  /* PDF: prioriza a logo corporativa carregada pela URL oficial. */
  const oldLogo="const logo=window.logoTBM||await imageToDataUrl(LOGO);const emitido=new Date().toLocaleString('pt-BR');\n  const content=[{image:logo,width:100,alignment:'center',margin:[0,0,0,10]}];";
  const newLogo="let logo='';\n  try{if(typeof window.carregarLogo==='function')logo=await window.carregarLogo(window.LOGO_TBM_URL)}catch(err){console.warn('[PT LOGO]',err)}\n  if(!logo)logo=window.logoTBM||await imageToDataUrl(LOGO);\n  const emitido=new Date().toLocaleString('pt-BR');\n  const content=[{image:logo,width:100,alignment:'center',margin:[0,0,0,10]}];";
  if(src.includes(oldLogo))src=src.replace(oldLogo,newLogo);

  return src;
}

async function recoverPTRuntime(){
  if(typeof window.openPTAltura==='function'&&typeof window.makePTAlturaPdf==='function')return true;
  if(ptRecoveryPromise)return ptRecoveryPromise;

  ptRecoveryPromise=(async()=>{
    const response=await fetch('./pt-altura.js?pt-runtime-recovery='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error(`Falha HTTP ${response.status} ao carregar pt-altura.js.`);
    const source=patchPTRuntimeSource(await response.text());

    /* Executa o módulo completo já reparado no mesmo contexto da página. */
    new Function(source+'\n//# sourceURL=pt-altura-runtime-restored.js')();

    if(typeof window.openPTAltura!=='function'){
      throw new Error('openPTAltura continua indisponível após a restauração.');
    }
    if(typeof window.makePTAlturaPdf!=='function'){
      throw new Error('Gerador PDF da PT continua indisponível após a restauração.');
    }

    installPTSaveBridge();
    injectPTContrast();
    window.__tbmPTRuntimeRecovered='2026.09.08.2-save-fixed';
    window.dispatchEvent(new CustomEvent('tbm-pt-runtime-restored'));
    console.info('[PT] Runtime restaurado com sucesso.');
    return true;
  })().catch(err=>{
    console.error('[PT RUNTIME RESTORE]',err);
    ptRecoveryPromise=null;
    return false;
  });

  return ptRecoveryPromise;
}

function installContrastObserver(){
  injectPTContrast();
  const root=document.getElementById('ptAlturaOverlay');
  if(root&&!root.dataset.tbmContrastObserved){
    root.dataset.tbmContrastObserved='1';
    new MutationObserver(injectPTContrast).observe(root,{childList:true,subtree:true});
  }
}

async function install(){
  injectPTContrast();
  installPTSaveBridge();
  await recoverPTRuntime();
  installPTSaveBridge();
  installContrastObserver();
}

/*
 * Barreira de segurança: se o usuário tocar na PT antes da recuperação
 * automática terminar, recupera o módulo e abre a PT na mesma ação.
 */
document.addEventListener('click',async e=>{
  const tile=e.target.closest?.('#ptAlturaTile');
  if(!tile||typeof window.openPTAltura==='function')return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  const ok=await recoverPTRuntime();
  installPTSaveBridge();
  if(ok)window.openPTAltura();
  else alert('Não foi possível restaurar o módulo de Permissão de Trabalho. Verifique a conexão e tente novamente.');
},true);

window.addEventListener('tbm-firestore-ready',installPTSaveBridge);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,500);
setTimeout(install,1500);
setTimeout(installPTSaveBridge,3000);

window.tbmFixPTContrast=installContrastObserver;
window.tbmRecoverPTRuntime=recoverPTRuntime;
window.tbmInstallPTSaveBridge=installPTSaveBridge;
window.__tbmPTContrastFixVersion='2026.09.08.3-save-fix';
})();

(()=>{
'use strict';
function loadPTRenovacaoNR35(){
  if(window.__tbmPTRenewalNR35Version)return Promise.resolve(true);
  const old=document.getElementById('tbm-pt-renovacao-nr35');if(old)old.remove();
  const s=document.createElement('script');
  s.id='tbm-pt-renovacao-nr35';
  s.src='./pt-renovacao-nr35.js?v=20260909-02&cb='+Date.now();
  s.async=false;
  document.body.appendChild(s);
  return new Promise(resolve=>{s.onload=()=>resolve(true);s.onerror=()=>resolve(false)});
}
window.tbmLoadPTRenovacaoNR35=loadPTRenovacaoNR35;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>loadPTRenovacaoNR35(),{once:true});else loadPTRenovacaoNR35();
window.addEventListener('tbm-pt-runtime-restored',()=>loadPTRenovacaoNR35());
setTimeout(loadPTRenovacaoNR35,700);
setTimeout(loadPTRenovacaoNR35,1800);
})();