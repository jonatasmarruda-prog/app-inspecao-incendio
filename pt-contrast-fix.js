(()=>{
'use strict';

/* Correção isolada de contraste do módulo PT – Trabalho em Altura. */
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

    #ptAlturaOverlay .pt-check-actions .ok{
      background:#dcfce7!important;
      color:#166534!important;
      -webkit-text-fill-color:#166534!important;
    }

    #ptAlturaOverlay .pt-check-actions .no{
      background:#fee2e2!important;
      color:#991b1b!important;
      -webkit-text-fill-color:#991b1b!important;
    }

    #ptAlturaOverlay .pt-check-actions .na{
      background:#e2e8f0!important;
      color:#334155!important;
      -webkit-text-fill-color:#334155!important;
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

function install(){
  injectPTContrast();
  const root=document.getElementById('ptAlturaOverlay');
  if(root&&!root.dataset.tbmContrastObserved){
    root.dataset.tbmContrastObserved='1';
    new MutationObserver(injectPTContrast).observe(root,{childList:true,subtree:true});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,500);
setTimeout(install,1500);
window.tbmFixPTContrast=install;
})();
