(()=>{
'use strict';

function currentInspectionId(){
  try { if (typeof state !== 'undefined' && state && state.id) { return String(state.id).trim(); } } catch (_) {}
  const selectors = ['#inspectionId', '#inspectionID', '#idInspecao', '#reportId', '#numeroInspecao', '[data-inspection-id]'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const v = (el.value || el.textContent || el.dataset.inspectionId || '').trim();
      if (v) return v;
    }
  }
  for (const k of ['inspectionId', 'inspection_id', 'currentInspectionId', 'idInspecao', 'inspection']) {
    try { const v = localStorage.getItem(k); if (v && v.trim()) { return v.trim(); } } catch (_) {}
  }
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
        if(!db.objectStoreNames.contains('inspections')){db.close();resolve();return;}
        const tx=db.transaction('inspections','readwrite');
        tx.objectStore('inspections').delete(String(id));
        tx.oncomplete=tx.onerror=tx.onabort=()=>{try{db.close()}catch(_){}resolve()};
      };
    }catch(_){resolve()}
  });
}

async function limparInspecao(){
  const ok = confirm('Tem certeza que deseja excluir esta inspeção? Todos os dados não salvos, fotos e assinaturas serão perdidos.');
  if (!ok) return;
  try { if (typeof saveTimer !== 'undefined' && saveTimer) { clearTimeout(saveTimer); saveTimer = null; } } catch (_) {}
  const id = currentInspectionId();
  window.__tbmDeletingInspection = true;
  const draftKeys = ['inspectionId', 'inspection_id', 'currentInspectionId', 'idInspecao', 'inspection', 'draftInspection', 'inspectionDraft', 'currentInspection'];
  for (const key of draftKeys) { try { localStorage.removeItem(key); } catch (_) {} }
  if (id) {
    const historyKeys = ['historico', 'historicoInspecoes', 'inspectionHistory', 'inspection_history', 'inspections', 'savedInspections'];
    for (const key of historyKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) continue;
        const filtered = parsed.filter(item => {
          const itemId = item?.id ?? item?.inspectionId ?? item?.idInspecao ?? item?.numeroInspecao ?? '';
          return String(itemId).trim() !== String(id).trim();
        });
        localStorage.setItem(key, JSON.stringify(filtered));
      } catch (_) {}
    }
  }
  try { if (Array.isArray(window.photos)) { window.photos.length = 0; } } catch (_) {}
  try { window.__tbmExtra = []; } catch (_) {}
  try { sessionStorage.clear(); } catch (_) {}
  if (id) {
    let deleted=false;
    try { if (typeof window.idbDelete === 'function') { await window.idbDelete(id); deleted=true; } } catch (e) { console.warn('Falha idbDelete:', e); }
    if(!deleted){try { await removeCurrentFromIndexedDB(id); } catch (e) { console.warn('Falha na exclusão local:', e); }}
    try { if (window.SST?.fs) { window.SST.fs.collection('inspections').doc(String(id)).delete().catch(()=>{}); } } catch (e) { console.warn('Falha nuvem:', e); }
  }
  window.location.reload();
}

window.limparInspecao=limparInspecao;

function addDeleteButton(){
  if(document.getElementById('btnExcluirInspecao'))return;
  const form=document.getElementById('form');
  if(!form)return;
  const actions=form.querySelector('.actions');
  if(!actions)return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.id='btnExcluirInspecao';
  btn.className='btn danger no-print';
  btn.textContent='🗑️ Excluir Inspeção';
  btn.title='Descartar a inspeção atual';
  btn.addEventListener('click',limparInspecao);
  actions.appendChild(btn);
}

function init(){
  addDeleteButton();
  setTimeout(addDeleteButton,300);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
