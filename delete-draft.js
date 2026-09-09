(()=>{
'use strict';
const MODULE_FLAG='__tbmDeleteDraftV2';if(window[MODULE_FLAG])return;window[MODULE_FLAG]=true;
window.__TBM_MATRIZ_LOCAL_ONLY=true;

function currentInspectionId(){
  try{if(typeof state!=='undefined'&&state?.id)return String(state.id).trim()}catch(_){ }
  for(const sel of ['#inspectionId','#inspectionID','#idInspecao','#reportId','#numeroInspecao','[data-inspection-id]']){const el=document.querySelector(sel);if(el){const v=(el.value||el.textContent||el.dataset.inspectionId||'').trim();if(v)return v}}
  return '';
}

async function limparInspecao(){
  if(!confirm('Tem certeza que deseja excluir esta inspeção? Todos os dados não salvos, fotos e assinaturas serão perdidos.'))return;
  try{if(typeof saveTimer!=='undefined'&&saveTimer){clearTimeout(saveTimer);saveTimer=null}}catch(_){ }
  const id=currentInspectionId();window.__tbmDeletingInspection=true;
  for(const key of ['inspectionId','inspection_id','currentInspectionId','idInspecao','inspection','draftInspection','inspectionDraft','currentInspection']){try{localStorage.removeItem(key)}catch(_){ }}
  try{if(Array.isArray(window.photos))window.photos.length=0}catch(_){ }
  try{window.__tbmExtra=[]}catch(_){ }
  try{sessionStorage.clear()}catch(_){ }
  if(id){try{await window.idbDelete?.(id)}catch(e){console.warn('Falha ao excluir relatório local:',e)}}
  window.location.reload();
}
window.limparInspecao=limparInspecao;

function addDeleteButton(){
  if(document.getElementById('btnExcluirInspecao'))return;const form=document.getElementById('form');if(!form)return;const actions=form.querySelector('.actions');if(!actions)return;
  const btn=document.createElement('button');btn.type='button';btn.id='btnExcluirInspecao';btn.className='btn danger no-print';btn.textContent='🗑️ Excluir Inspeção';btn.title='Descartar a inspeção atual deste dispositivo';btn.addEventListener('click',limparInspecao);actions.appendChild(btn);
}
function loadSimpleEntry(){if(document.getElementById('tbm-matriz-simple-entry-loader'))return;const s=document.createElement('script');s.id='tbm-matriz-simple-entry-loader';s.src='./tbm-matriz-simple-entry.js?v=20260909-local-01';s.async=false;document.body.appendChild(s)}
function loadConfigLocal(){
  if(document.getElementById('tbm-matriz-config-local-loader')){loadSimpleEntry();return}
  const s=document.createElement('script');s.id='tbm-matriz-config-local-loader';s.src='./tbm-matriz-config-local.js?v=20260909-local-01';s.async=false;s.onload=loadSimpleEntry;document.body.appendChild(s);
}
function init(){addDeleteButton();loadConfigLocal();setTimeout(addDeleteButton,300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
