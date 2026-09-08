(()=>{
'use strict';

/*
 * Recuperação cirúrgica do módulo PT – Trabalho em Altura.
 * A migração Firestore removeu acidentalmente openPTAltura/closePTAltura
 * do pt-altura.js. Esta camada restaura SOMENTE essas funções dentro do
 * escopo original do módulo, sem reintroduzir localStorage, IndexedDB ou
 * a antiga coleção Firestore "inspections".
 */
let ptRecoveryPromise=null;

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

    injectPTContrast();
    window.__tbmPTRuntimeRecovered='2026.09.08.1';
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
  await recoverPTRuntime();
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
  if(ok)window.openPTAltura();
  else alert('Não foi possível restaurar o módulo de Permissão de Trabalho. Verifique a conexão e tente novamente.');
},true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,500);
setTimeout(install,1500);

window.tbmFixPTContrast=installContrastObserver;
window.tbmRecoverPTRuntime=recoverPTRuntime;
window.__tbmPTContrastFixVersion='2026.09.08.2-runtime-recovery';
})();
