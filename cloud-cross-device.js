(()=>{
'use strict';

/* Sincronização completa e não bloqueante: local primeiro, Firestore em segundo plano. */
const WORKSPACE_KEY='TBM-SST-07603376000300';
const DEVICE_STORAGE_KEY='tbm-sst-device-id';
const DELETE_QUEUE_KEY='tbm-sst-cloud-delete-queue';
const SYNC_DEBOUNCE=1200;
const FIRESTORE_WAIT=2500;
const SYNC_INTERVAL=120000; // 2 minutos
const MOBILE_DEVICE=(()=>{try{return matchMedia('(max-width: 900px)').matches||matchMedia('(pointer: coarse)').matches||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')}catch(_){return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')}})();
let pushTimer=null;
let unsubscribe=null;
let applyingRemote=false;
let installed=false;
let syncBusy=false;
let periodicTimer=null;

function getDeviceId(){
  let id='';
  try{id=localStorage.getItem(DEVICE_STORAGE_KEY)||''}catch(_){ }
  if(!id){
    id=(window.crypto?.randomUUID?.()||('DEV-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2))).toUpperCase();
    try{localStorage.setItem(DEVICE_STORAGE_KEY,id)}catch(_){ }
  }
  return id;
}
const DEVICE_ID=getDeviceId();

function getState(){try{return state||null}catch(_){return window.state||null}}
function setState(next){try{state=next;return}catch(_){window.state=next}}
function clone(v){return JSON.parse(JSON.stringify(v||{}))}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fmt(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}
function stamp(x){return Date.parse(x?.cloudClientUpdatedAt||x?.updatedAt||x?.deletedAt||x?.createdAt||'')||0}

function indicator(status,text){
  const el=document.getElementById('cloudState');
  if(!el)return;
  const colors={sync:'#166534',saving:'#92400e',wait:'#1d4ed8',error:'#991b1b',offline:'#475569'};
  el.textContent=text;
  Object.assign(el.style,{background:colors[status]||colors.offline,color:'#fff',padding:'5px 9px',borderRadius:'999px',fontWeight:'800',fontSize:'10px',whiteSpace:'nowrap',transition:'background .2s ease'});
}

async function waitFirestore(timeout=FIRESTORE_WAIT){
  const start=Date.now();
  while(Date.now()-start<timeout){
    if(window.SST?.fs)return window.SST.fs;
    await new Promise(r=>setTimeout(r,150));
  }
  return null;
}

function normalizeExtra(e){
  return {kind:e.kind==='alarm'?'alarm':'light',status:e.status||'PENDENTE',patrimonio:e.patrimonio||'',localizacao:e.localizacao||'',obs:e.obs||'',premiumChecks:Array.isArray(e.premiumChecks)?[...e.premiumChecks]:Array.isArray(e.checks)?[...e.checks]:[]};
}

function completePayload(source){
  const st=clone(source||getState());
  if(!st?.id)return null;
  const original=Array.isArray(st.equipment)?st.equipment:[];
  const core=original.filter(e=>e?.kind!=='light'&&e?.kind!=='alarm');
  const stateExtras=original.filter(e=>e?.kind==='light'||e?.kind==='alarm').map(normalizeExtra);
  const current=getState();
  const canUseLiveExtras=current&&String(current.id)===String(st.id);
  const liveExtras=canUseLiveExtras&&Array.isArray(window.__tbmExtra)?window.__tbmExtra.map(normalizeExtra):[];
  st.equipment=[...core,...(liveExtras.length?liveExtras:stateExtras)];
  st.photos=Array.isArray(st.photos)?st.photos:[];
  st.checklistExtintores=Array.isArray(st.checklistExtintores)?st.checklistExtintores:[];
  st.checklistHidrantes=Array.isArray(st.checklistHidrantes)?st.checklistHidrantes:[];
  st.workspaceKey=WORKSPACE_KEY;
  st.cloudDeviceId=DEVICE_ID;
  st.cloudClientUpdatedAt=new Date().toISOString();
  st.ownerUid=window.SST?.uid||st.ownerUid||'';
  st.appVersion='2026.09.03.cross-device.3';
  delete st.deleted;delete st.deletedAt;delete st.deletedByDevice;
  return st;
}

function cleanRemote(data){
  const x=clone(data);
  delete x.workspaceKey;delete x.cloudDeviceId;delete x.cloudClientUpdatedAt;delete x.cloudSyncedAt;delete x.ownerUid;delete x.appVersion;delete x.deleted;delete x.deletedAt;delete x.deletedByDevice;
  return x;
}

function prepareForUI(data){
  const raw=cleanRemote(data);
  const equipment=Array.isArray(raw.equipment)?raw.equipment:[];
  window.__tbmExtra=equipment.filter(e=>e?.kind==='light'||e?.kind==='alarm').map(e=>({kind:e.kind,status:e.status||'PENDENTE',patrimonio:e.patrimonio||'',localizacao:e.localizacao||'',obs:e.obs||'',checks:Array.isArray(e.premiumChecks)?[...e.premiumChecks]:Array.isArray(e.checks)?[...e.checks]:[]}));
  raw.equipment=equipment.filter(e=>e?.kind!=='light'&&e?.kind!=='alarm');
  raw.photos=Array.isArray(raw.photos)?raw.photos:[];
  return raw;
}

async function persistRawRemote(data){
  if(typeof window.idbPut!=='function'||data?.deleted)return;
  const oldExtra=window.__tbmExtra;
  try{window.__tbmExtra=[];await window.idbPut(cleanRemote(data))}
  catch(e){console.warn('[CLOUD] cópia local:',e)}
  finally{window.__tbmExtra=oldExtra}
}

function readDeleteQueue(){
  try{const a=JSON.parse(localStorage.getItem(DELETE_QUEUE_KEY)||'[]');return Array.isArray(a)?a:[]}catch(_){return[]}
}
function writeDeleteQueue(a){try{localStorage.setItem(DELETE_QUEUE_KEY,JSON.stringify([...new Set(a.map(String))]))}catch(_){ }}
function queueDeletion(id){const a=readDeleteQueue();if(!a.includes(String(id)))a.push(String(id));writeDeleteQueue(a)}
function dequeueDeletion(id){writeDeleteQueue(readDeleteQueue().filter(x=>String(x)!==String(id)))}

async function writeTombstone(fs,id){
  const now=new Date().toISOString();
  const tombstone={id:String(id),workspaceKey:WORKSPACE_KEY,deleted:true,deletedAt:now,deletedByDevice:DEVICE_ID,cloudDeviceId:DEVICE_ID,cloudClientUpdatedAt:now,ownerUid:window.SST?.uid||'',appVersion:'2026.09.03.cross-device.3'};
  if(window.firebase?.firestore?.FieldValue?.serverTimestamp)tombstone.cloudSyncedAt=window.firebase.firestore.FieldValue.serverTimestamp();
  await fs.collection('inspections').doc(String(id)).set(tombstone,{merge:false});
}

async function deleteLocalOnly(id){
  try{if(typeof window.idbDelete==='function')await window.idbDelete(String(id))}catch(e){console.warn('[CLOUD DELETE LOCAL]',e)}
}

async function deleteCloudInspection(id,{deleteLocal=true}={}){
  id=String(id||'').trim();if(!id)return false;
  queueDeletion(id);
  if(deleteLocal)await deleteLocalOnly(id);
  const current=getState();
  if(current&&String(current.id)===id)window.__tbmDeletingInspection=true;
  try{
    const fs=window.SST?.fs||await waitFirestore();
    if(!fs){indicator('offline','● Exclusão pendente na nuvem');return false}
    indicator('saving','● Excluindo da nuvem...');
    await writeTombstone(fs,id);
    dequeueDeletion(id);
    indicator('sync','● Exclusão sincronizada');
    return true;
  }catch(e){
    console.warn('[CLOUD DELETE]',e);
    indicator('offline','● Exclusão pendente na nuvem');
    return false;
  }
}

async function flushDeletionQueue(fs){
  const ids=readDeleteQueue();
  for(const id of ids){
    try{await writeTombstone(fs,id);dequeueDeletion(id)}catch(e){console.warn('[CLOUD DELETE QUEUE]',id,e)}
  }
}

async function pushRecord(source,reason='sync'){
  if(!source?.id||window.__tbmDeletingInspection)return false;
  try{
    const fs=window.SST?.fs||await waitFirestore();if(!fs)return false;
    const tomb=await fs.collection('inspections').doc(String(source.id)).get();
    if(tomb.exists&&tomb.data()?.deleted){await deleteLocalOnly(source.id);return false}
    const payload=completePayload(source);if(!payload)return false;
    if(window.firebase?.firestore?.FieldValue?.serverTimestamp)payload.cloudSyncedAt=window.firebase.firestore.FieldValue.serverTimestamp();
    await fs.collection('inspections').doc(String(payload.id)).set(payload,{merge:true});
    return true;
  }catch(e){console.warn('[CLOUD PUSH RECORD]',reason,e);return false}
}

async function pushCloud(reason='auto'){
  if(applyingRemote||window.__tbmDeletingInspection)return true;
  const st=getState();if(!st?.id)return false;
  try{
    const fs=window.SST?.fs||await waitFirestore();
    if(!fs){indicator('offline','● Local • Nuvem pendente');return false}
    indicator('saving','● Salvando na nuvem...');
    const ok=await pushRecord(st,reason);
    if(ok){indicator('sync','● Nuvem sincronizada');attachRealtime(String(st.id))}
    return ok;
  }catch(e){console.warn('[CLOUD PUSH]',reason,e);indicator('offline','● Local • Nuvem indisponível');return false}
}

function schedulePush(){
  if(applyingRemote||window.__tbmDeletingInspection)return;
  clearTimeout(pushTimer);pushTimer=setTimeout(()=>{pushCloud('debounce').catch(()=>{})},SYNC_DEBOUNCE);
}

async function handleRemoteDeletion(id){
  await deleteLocalOnly(id);
  const current=getState();
  if(current&&String(current.id)===String(id)){
    window.__tbmDeletingInspection=true;
    try{setState(null)}catch(_){ }
    try{if(typeof window.show==='function')window.show('home')}catch(_){ }
  }
  indicator('sync','● Exclusão recebida da nuvem');
  try{if(!document.getElementById('history')?.classList.contains('hidden')&&typeof window.openHistory==='function')window.openHistory()}catch(_){ }
}

async function applyRemote(data,{openForm=false,realtime=false}={}){
  if(data?.deleted){await handleRemoteDeletion(data.id);return}
  const raw=cleanRemote(data);if(!raw?.id)return;
  applyingRemote=true;clearTimeout(pushTimer);
  try{
    await persistRawRemote(data);
    setState(prepareForUI(data));
    if(typeof window.renderForm==='function')window.renderForm();
    if(openForm&&typeof window.show==='function')window.show('form');
    window.tbmRenderFireChecklist?.();window.tbmInstallMultiPhotoFix?.();
    indicator('sync',realtime?'● Atualizado da nuvem':'● Nuvem sincronizada');
  }finally{setTimeout(()=>{applyingRemote=false},120)}
}

function attachRealtime(id){
  if(!id||!window.SST?.fs)return;
  if(window.__tbmRealtimeCloudId===id&&unsubscribe)return;
  try{unsubscribe?.()}catch(_){ }
  window.__tbmRealtimeCloudId=id;
  unsubscribe=window.SST.fs.collection('inspections').doc(String(id)).onSnapshot(snap=>{
    if(!snap.exists||snap.metadata?.hasPendingWrites)return;
    const data={id:snap.id,...(snap.data()||{})};
    if(data.workspaceKey!==WORKSPACE_KEY||data.cloudDeviceId===DEVICE_ID)return;
    if(data.deleted){handleRemoteDeletion(id).catch(()=>{});return}
    const local=getState();if(!local||String(local.id)!==String(id))return;
    if(stamp(data)<=stamp(local))return;
    applyRemote(data,{realtime:true}).catch(e=>console.warn('[CLOUD REALTIME]',e));
  },e=>{console.warn('[CLOUD REALTIME]',e);indicator('offline','● Local • Nuvem indisponível')});
}

async function syncAll({silent=true}={}){
  if(syncBusy)return false;syncBusy=true;
  try{
    const fs=window.SST?.fs||await waitFirestore();if(!fs)return false;
    if(!silent)indicator('saving','● Sincronizando...');
    await flushDeletionQueue(fs);
    const snap=await fs.collection('inspections').where('workspaceKey','==',WORKSPACE_KEY).get();
    const cloudRecords=snap.docs.map(d=>({id:d.id,...d.data()}));
    const cloudMap=new Map(cloudRecords.map(x=>[String(x.id),x]));
    const localList=typeof window.idbAll==='function'?await window.idbAll():[];
    const localMap=new Map((localList||[]).map(x=>[String(x.id),x]));

    for(const remote of cloudRecords){
      const id=String(remote.id);
      if(remote.deleted){await handleRemoteDeletion(id);continue}
      const local=localMap.get(id);
      if(!local||stamp(remote)>stamp(local)){
        await persistRawRemote(remote);
        const current=getState();
        if(current&&String(current.id)===id&&remote.cloudDeviceId!==DEVICE_ID)await applyRemote(remote,{realtime:true});
      }else if(stamp(local)>stamp(remote)&&!readDeleteQueue().includes(id)){
        await pushRecord(local,'periodic-local-newer');
      }
    }

    for(const local of (localList||[])){
      const id=String(local.id);
      if(!cloudMap.has(id)&&!readDeleteQueue().includes(id))await pushRecord(local,'periodic-new-local');
    }
    indicator('sync','● Nuvem sincronizada');
    return true;
  }catch(e){console.warn('[CLOUD SYNC ALL]',e);indicator('offline','● Local • Nuvem pendente');return false}
  finally{syncBusy=false}
}

function ensureCloudModal(){
  let modal=document.getElementById('tbmCloudModal');if(modal)return modal;
  modal=document.createElement('div');modal.id='tbmCloudModal';modal.className='modal hidden';
  modal.innerHTML=`<div class="modalbox" style="max-width:650px"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div class="sectionTitle" style="margin:0">☁️ Inspeções na Nuvem</div><button type="button" id="tbmCloudClose" class="btn secondary">✕</button></div><div class="mini" style="margin-top:6px">Sincronização automática a cada 2 minutos.</div><div id="tbmCloudList" style="margin-top:12px"></div></div>`;
  document.body.appendChild(modal);modal.querySelector('#tbmCloudClose').onclick=()=>modal.classList.add('hidden');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hidden')});return modal;
}

function renderCloudList(records){
  const modal=ensureCloudModal(),list=modal.querySelector('#tbmCloudList');
  records=records.filter(x=>!x.deleted);
  if(!records.length){list.innerHTML='<div class="notice info">Nenhuma inspeção salva na nuvem.</div>';return}
  list.innerHTML=records.map(x=>`<div class="historyItem" data-cloud-card="${esc(x.id)}"><div class="historyTop"><div><b>☁️ ${esc(x.title||x.type||'Inspeção')}</b><div class="mini">${esc(x.id)} • ${esc(fmt(x.date||x.updatedAt))}</div><div class="mini">${esc(x.company==='Outro'?x.otherCompany:x.company||'TBM')} • ${esc(x.sector||'Sem setor')}</div><div class="mini">Atualizado: ${esc(fmt(x.cloudClientUpdatedAt||x.updatedAt))}</div></div><span class="pill">${Array.isArray(x.photos)?x.photos.length:0} foto(s)</span></div><div class="actions" style="margin-top:9px"><button type="button" class="btn primary" data-cloud-load="${esc(x.id)}">☁️ Continuar</button><button type="button" class="btn danger" data-cloud-delete="${esc(x.id)}">🗑️ Excluir da Nuvem</button></div></div>`).join('');
  list.querySelectorAll('[data-cloud-load]').forEach(btn=>btn.onclick=async()=>{
    try{btn.disabled=true;btn.textContent='⏳ Carregando...';const fs=window.SST?.fs||await waitFirestore();if(!fs)throw new Error('Nuvem indisponível.');const snap=await fs.collection('inspections').doc(String(btn.dataset.cloudLoad)).get();if(!snap.exists||snap.data()?.deleted)throw new Error('Inspeção excluída.');await applyRemote({id:snap.id,...snap.data()},{openForm:true});attachRealtime(btn.dataset.cloudLoad);modal.classList.add('hidden')}
    catch(e){console.warn('[CLOUD LOAD]',e);btn.disabled=false;btn.textContent='❌ Tentar novamente'}
  });
  list.querySelectorAll('[data-cloud-delete]').forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.cloudDelete;
    if(!confirm('Excluir este relatório da nuvem e de todos os dispositivos sincronizados?'))return;
    btn.disabled=true;btn.textContent='⏳ Excluindo...';
    await deleteCloudInspection(id,{deleteLocal:true});
    await carregarDaNuvem();
    try{if(typeof window.openHistory==='function')window.openHistory()}catch(_){ }
  });
}

async function carregarDaNuvem(){
  const modal=ensureCloudModal(),list=modal.querySelector('#tbmCloudList');modal.classList.remove('hidden');list.innerHTML='<div class="notice info">☁️ Buscando inspeções...</div>';
  try{
    const fs=window.SST?.fs||await waitFirestore();if(!fs)throw new Error('Firebase ainda não conectado.');
    await flushDeletionQueue(fs);
    const snap=await fs.collection('inspections').where('workspaceKey','==',WORKSPACE_KEY).get();
    const records=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!x.deleted).sort((a,b)=>stamp(b)-stamp(a));
    renderCloudList(records);indicator('sync','● Nuvem sincronizada');
  }catch(e){list.innerHTML='<div class="notice errorbox">Nuvem indisponível no momento. O salvamento local continua funcionando.</div>';indicator('offline','● Local • Nuvem indisponível')}
}

function addCloudButton(){
  if(document.getElementById('loadCloud'))return;const history=document.getElementById('openHistory');if(!history)return;
  const b=document.createElement('button');b.id='loadCloud';b.type='button';b.className='btn secondary full';b.textContent='☁️ Carregar da Nuvem';b.onclick=e=>{e.preventDefault();carregarDaNuvem()};history.insertAdjacentElement('afterend',b);
}

function wrapSaving(){
  if(typeof window.saveInspection==='function'&&!window.__tbmCloudSaveWrapped){
    window.__tbmCloudSaveWrapped=true;const original=window.saveInspection;
    window.saveInspection=async function(...args){const result=await original.apply(this,args);pushCloud(args[0]===true?'autosave':'manual').catch(()=>{});return result};
  }
  if(typeof window.scheduleSave==='function'&&!window.__tbmCloudScheduleWrapped){
    window.__tbmCloudScheduleWrapped=true;const original=window.scheduleSave;
    window.scheduleSave=function(...args){const r=original.apply(this,args);schedulePush();return r};
  }
}

function installObservers(){
  if(document.body.dataset.tbmCloudObservers)return;document.body.dataset.tbmCloudObservers='1';
  document.addEventListener('input',e=>{if(e.target?.matches?.('input,textarea,select')&&e.target.id!=='photoInput')schedulePush()},{passive:true});
  document.addEventListener('change',e=>{if(e.target?.matches?.('input,textarea,select'))schedulePush()},{passive:true});
  const photos=document.getElementById('photos');if(photos)new MutationObserver(()=>schedulePush()).observe(photos,{childList:true});

  /* Sobrescreve as exclusões antigas que apagavam só um dispositivo ou removiam o doc sem tombstone. */
  document.addEventListener('click',e=>{
    const historyDelete=e.target.closest?.('[data-delete-h]');
    if(historyDelete){
      e.preventDefault();e.stopImmediatePropagation();
      const id=historyDelete.dataset.deleteH;
      if(!confirm('Excluir esta inspeção do histórico, da nuvem e dos outros dispositivos?'))return;
      deleteCloudInspection(id,{deleteLocal:true}).then(()=>{try{if(typeof window.openHistory==='function')window.openHistory()}catch(_){ }});
      return;
    }
    const currentDelete=e.target.closest?.('#btnExcluirInspecao');
    if(currentDelete){
      e.preventDefault();e.stopImmediatePropagation();
      if(!confirm('Excluir esta inspeção do dispositivo, da nuvem e dos outros dispositivos?'))return;
      const st=getState(),id=st?.id;
      if(!id)return;
      try{if(typeof saveTimer!=='undefined'&&saveTimer){clearTimeout(saveTimer);saveTimer=null}}catch(_){ }
      ['inspectionId','inspection_id','currentInspectionId','idInspecao','inspection','draftInspection','inspectionDraft','currentInspection'].forEach(k=>{try{localStorage.removeItem(k)}catch(_){ }});
      deleteCloudInspection(id,{deleteLocal:true}).finally(()=>window.location.reload());
    }
  },true);
}

function startPeriodicSync(){
  if(periodicTimer)return;
  periodicTimer=setInterval(()=>{if(navigator.onLine!==false&&(!MOBILE_DEVICE||document.hidden))syncAll({silent:true}).catch(()=>{})},MOBILE_DEVICE?600000:SYNC_INTERVAL);
  window.addEventListener('online',()=>{if(!MOBILE_DEVICE)syncAll({silent:true}).catch(()=>{});else pushCloud('online-mobile').catch(()=>{})});
  document.addEventListener('visibilitychange',()=>{if(!MOBILE_DEVICE&&!document.hidden&&navigator.onLine!==false)syncAll({silent:true}).catch(()=>{})});
}

function startCloudProbe(){
  indicator('offline','● Local ativo');
  let tries=0;
  const retry=setInterval(()=>{
    tries++;wrapSaving();
    if(window.SST?.fs){
      clearInterval(retry);indicator('sync','● Nuvem sincronizada');
      const st=getState();if(st?.id)attachRealtime(String(st.id));
      if(MOBILE_DEVICE){if(st?.id)pushCloud('startup-mobile').catch(()=>{})}else setTimeout(()=>syncAll({silent:true}).catch(()=>{}),700);
      return;
    }
    if(tries>=15){clearInterval(retry);indicator('offline','● Local • Nuvem pendente')}
  },700);
}

function install(){
  if(installed)return;installed=true;
  addCloudButton();ensureCloudModal();wrapSaving();installObservers();startPeriodicSync();startCloudProbe();
}

window.carregarDaNuvem=carregarDaNuvem;
window.tbmPushCloud=pushCloud;
window.tbmAttachRealtime=attachRealtime;
window.tbmSyncAllCloud=syncAll;
window.tbmDeleteCloudInspection=deleteCloudInspection;
window.tbmCloudWorkspace=WORKSPACE_KEY;
window.tbmCloudSyncIntervalMs=SYNC_INTERVAL;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
