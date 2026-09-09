/* TBM Matriz — modo local. Sincronização entre dispositivos desativada. */
(()=>{
'use strict';
window.__TBM_MATRIZ_LOCAL_ONLY=true;
window.__tbmCloudCrossDeviceInstalled=true;
window.tbmCloudSyncNow=async()=>false;
window.tbmCloudDeleteInspection=async()=>false;
})();
