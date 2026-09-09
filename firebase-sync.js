/* TBM Matriz — modo local. Sincronização com Firebase desativada intencionalmente. */
(()=>{
'use strict';
window.__TBM_MATRIZ_LOCAL_ONLY=true;
window.SSTCloud={
  start:async()=>false,
  push:async()=>false,
  pull:async()=>false,
  isReady:()=>false,
  mode:'local-only'
};
})();
