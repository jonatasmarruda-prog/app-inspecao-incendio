(()=>{
'use strict';
const MODULE_FLAG='__tbmDeleteDraftV2';
if(window[MODULE_FLAG])return;
window[MODULE_FLAG]=true;
// Na cópia de demonstração, impede o histórico em nuvem do sistema principal de iniciar.
window.__tbmCloudHistoryV1=true;

function currentInspectionId(){
  try { if (typeof state !== 'undefined' && state && state.id) return String(state.id).trim(); } catch (_) {}
  const selectors=['#inspectionId','#inspectionID','#idInspecao','#reportId','#numeroInspecao','[data-inspection-id]'];
  for(const sel of selectors){const el=document.querySelector(sel);if(el){const v=(el.value||el.textContent||el.dataset.inspectionId||'').trim();if(v)return v}}
  for(const k of ['inspectionId','inspection_id','currentInspectionId','idInspecao','inspection']){try{const v=localStorage.getItem(k);if(v&&v.trim())return v.trim()}catch(_){}}
  return '';
}

async function removeCurrentFromIndexedDB(id){
  if(!id)return;
  await new Promise(resolve=>{
    try{
      const req=indexedDB.open('SSTInspecoes');
      req.onerror=()=>resolve();
      req.onsuccess=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains('inspections')){db.close();resolve();return}
        const tx=db.transaction('inspections','readwrite');
        tx.objectStore('inspections').delete(String(id));
        tx.oncomplete=tx.onerror=tx.onabort=()=>{try{db.close()}catch(_){}resolve()};
      };
    }catch(_){resolve()}
  });
}

async function limparInspecao(){
  if(!confirm('Tem certeza que deseja excluir esta inspeção? Todos os dados não salvos, fotos e assinaturas serão perdidos.'))return;
  try{if(typeof saveTimer!=='undefined'&&saveTimer){clearTimeout(saveTimer);saveTimer=null}}catch(_){}
  const id=currentInspectionId();
  window.__tbmDeletingInspection=true;
  for(const key of ['inspectionId','inspection_id','currentInspectionId','idInspecao','inspection','draftInspection','inspectionDraft','currentInspection']){try{localStorage.removeItem(key)}catch(_){}}
  try{if(Array.isArray(window.photos))window.photos.length=0}catch(_){}
  try{window.__tbmExtra=[]}catch(_){}
  try{sessionStorage.clear()}catch(_){}
  if(id){
    let deleted=false;
    try{if(typeof window.idbDelete==='function'){await window.idbDelete(id);deleted=true}}catch(e){console.warn('Falha ao excluir item da demonstração:',e)}
    if(!deleted){try{await removeCurrentFromIndexedDB(id)}catch(_){}}
  }
  window.location.reload();
}
window.limparInspecao=limparInspecao;

function addDeleteButton(){
  if(document.getElementById('btnExcluirInspecao'))return;
  const form=document.getElementById('form');if(!form)return;
  const actions=form.querySelector('.actions');if(!actions)return;
  const btn=document.createElement('button');btn.type='button';btn.id='btnExcluirInspecao';btn.className='btn danger no-print';btn.textContent='🗑️ Excluir Inspeção';btn.title='Descartar a inspeção atual';btn.addEventListener('click',limparInspecao);actions.appendChild(btn);
}
function loadAccessGate(){
  if(document.getElementById('sst-demo-access-gate-loader'))return;
  const g=document.createElement('script');g.id='sst-demo-access-gate-loader';g.src='./demo-access-gate.js?v=20260909-01';g.async=false;document.body.appendChild(g);
}
function loadDemoMode(){
  if(document.getElementById('sst-demo-client-mode-loader')){loadAccessGate();return;}
  const s=document.createElement('script');s.id='sst-demo-client-mode-loader';s.src='./demo-client-mode.js?v=20260909-02';s.async=false;s.onload=loadAccessGate;document.body.appendChild(s);
}
function init(){addDeleteButton();loadDemoMode();setTimeout(addDeleteButton,300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
