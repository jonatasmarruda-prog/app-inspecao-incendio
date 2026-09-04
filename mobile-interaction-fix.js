(()=>{
'use strict';

const FLAG='__tbmMobileInteractionFixV1';
function isMobile(){
  try{
    return matchMedia('(max-width: 900px)').matches||matchMedia('(pointer: coarse)').matches||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
  }catch(_){return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')}
}
if(!isMobile()||window[FLAG])return;
window[FLAG]=true;

/*
  O Premium UX observava alterações de classe em TODO o body. No celular,
  abrir/fechar uma tela ou um cartão pode disparar dezenas de mutações e
  bloquear a thread principal. Durante o carregamento do Premium UX,
  mantemos somente observação de inclusão/remoção de elementos.
*/
const NativeMutationObserver=window.MutationObserver;
let GuardedMutationObserver=null;
if(typeof NativeMutationObserver==='function'){
  GuardedMutationObserver=class extends NativeMutationObserver{
    observe(target,options){
      let safe=options||{};
      if(target===document.body&&safe.attributes){
        safe={...safe};
        delete safe.attributes;
        delete safe.attributeFilter;
        delete safe.attributeOldValue;
        safe.childList=true;
        safe.subtree=true;
      }
      return super.observe(target,safe);
    }
  };
  window.MutationObserver=GuardedMutationObserver;
}
window.tbmRestoreMobileMutationObserver=()=>{
  try{if(GuardedMutationObserver&&window.MutationObserver===GuardedMutationObserver)window.MutationObserver=NativeMutationObserver}catch(_){ }
};

/*
  A assinatura era inicializada enquanto #form ainda estava escondido e,
  logo depois, novamente quando o formulário ficava visível. Em aparelhos
  com DPR alto isso recria dois canvases grandes em sequência. Deferimos a
  inicialização até o formulário estar visível e eliminamos chamadas duplas.
*/
let signatureQueued=false;
let lastSignatureSetup=0;
function patchSignatures(){
  const original=window.setupSigs;
  if(typeof original!=='function'||original.__tbmMobileInteractionV1)return;
  const wrapped=function(...args){
    const form=document.getElementById('form');
    if(!form||form.classList.contains('hidden')){
      if(!signatureQueued){
        signatureQueued=true;
        setTimeout(()=>{
          signatureQueued=false;
          const current=document.getElementById('form');
          if(current&&!current.classList.contains('hidden'))wrapped(...args);
        },140);
      }
      return;
    }
    const now=(window.performance&&typeof performance.now==='function')?performance.now():Date.now();
    if(now-lastSignatureSetup<700)return;
    lastSignatureSetup=now;
    return original.apply(this,args);
  };
  wrapped.__tbmMobileInteractionV1=true;
  wrapped.__tbmOriginal=original;
  window.setupSigs=wrapped;
}

/*
  Mostra a tela antes de renderizar. Assim inputs/canvases recebem dimensões
  reais já na primeira renderização, evitando layout duplo e travamento.
*/
function patchRenderForm(){
  const original=window.renderForm;
  if(typeof original!=='function'||original.__tbmMobileInteractionV1)return;
  const wrapped=function(...args){
    const form=document.getElementById('form');
    if(form&&form.classList.contains('hidden')){
      try{
        if(typeof window.show==='function')window.show('form');
        else{
          ['home','form','history','report'].forEach(id=>document.getElementById(id)?.classList.toggle('hidden',id!=='form'));
        }
      }catch(_){try{form.classList.remove('hidden')}catch(__){ }}
    }
    patchSignatures();
    return original.apply(this,args);
  };
  wrapped.__tbmMobileInteractionV1=true;
  wrapped.__tbmOriginal=original;
  window.renderForm=wrapped;
}

function install(){
  patchSignatures();
  patchRenderForm();
}
install();
setTimeout(install,250);
setTimeout(install,900);
window.__tbmMobileInteractionVersion='2026.09.04.1';
})();