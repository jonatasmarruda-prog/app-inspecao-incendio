(()=>{
'use strict';

/* Sincronização compartilhada TBM: celular <-> desktop via Firestore. */
const WORKSPACE_KEY='TBM-SST-07603376000300';
const DEVICE_STORAGE_KEY='tbm-sst-device-id';
const SYNC_DEBOUNCE=1100;
let pushTimer=null;
let unsubscribe=null;
let applyingRemote=false;
let installed=false;

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

function indicator(status,text){
  const el=document.getElementById('cloudState');
  if(!el)return;
  const colors={sync:'#166534',saving:'#92400e',wait:'#1d4ed8',error:'#991b1b',offline:'#475569'};
  el.textContent=text;
  Object.assign(el.style,{background:colors[status]||colors.offline,color:'#fff',padding:'5px 9px',borderRadius:'999px',fontWeight:'800',fontSize:'10px',whiteSpace:'nowrap',transition:'background .2s ease'});
}

async function waitFirestore(timeout=12000){
  const start=Date.now();
  while(Date.now()-start<timeout){
    if(window.SST?.fs)return window.SST.fs;
    await new Promise(r=>setTimeout(r,180));
  }
  throw new Error('Firebase Firestore indisponível.');
}

function normalizeExtra(e){
  return {kind:e.kind==='alarm'?'alarm':'light',status:e.status||'PENDENTE',patrimonio:e.patrimonio||'',localizacao:e.localizacao||'',obs:e.obs||'',premiumChecks:Array.isArray(e.premiumChecks)?[...e.premiumChecks]:Array.isArray(e.checks)?[...e.checks]:[]};
}

function completePayload(source){
  const st=clone(source||getState());
  if(!st||!st.id)return null;
  const original=Array.isArray(st.equipment)?st.equipment:[];
  const core=original.filter(e=>e?.kind!=='light'&&e?.kind!=='alarm');
  const stateExtras=original.filter(e=>e?.kind==='light'||e?.kind==='alarm').map(normalizeExtra);
  const liveExtras=(Array.isArray(window.__tbmExtra)?window.__tbmExtra:[]).map(normalizeExtra);
  const extras=liveExtras.length?liveExtras:stateExtras;
  st.equipment=[...core,...extras];
  st.photos=Array.isArray(st.photos)?st.photos:[];
  st.workspaceKey=WORKSPACE_KEY;
  st.cloudDeviceId=DEVICE_ID;
  st.cloudClientUpdatedAt=new Date().toISOString();
  st.ownerUid=window.SST?.uid||st.ownerUid||'';
  st.appVersion='2026.09.03.cross-device.1';
  return st;
}

function cleanRemote(data){
  const x=clone(data);
  delete x.workspaceKey;
  delete x.cloudDeviceId;
  delete x.cloudClientUpdatedAt;
  delete x.cloudSyncedAt;
  delete x.ownerUid;
  delete x.appVersion;
  return x;
}

function prepareForUI(data){
  const raw=cleanRemote(data);
  const equipment=Array.isArray(raw.equipment)?raw.equipment:[];
  const extras=equipment.filter(e=>e?.kind==='light'||e?.kind==='alarm').map(e=>({kind:e.kind,status:e.status||'PENDENTE',patrimonio:e.patrimonio||'',localizacao:e.localizacao||'',obs:e.obs||'',checks:Array.isArray(e.premiumChecks)?[...e.premiumChecks]:Array.isArray(e.checks)?[...e.checks]:[]}));
  raw.equipment=equipment.filter(e=>e?.kind!=='light'&&e?.kind!=='alarm');
  window.__tbmExtra=extras;
  raw.photos=Array.isArray(raw.photos)?raw.photos:[];
  return raw;
}

async function persistRawRemote(data){
  if(typeof window.idbPut!=='function')return;
  const oldExtra=window.__tbmExtra;
  try{
    window.__tbmExtra=[];
    await window.idbPut(cleanRemote(data));
  }catch(e){console.warn('[CLOUD] Falha ao persistir cópia local:',e)}
  finally{window.__tbmExtra=oldExtra}
}

async function pushCloud(reason='auto'){
  if(applyingRemote)return true;
  const st=getState();
  if(!st?.id)return false;
  let fs;
  try{
    indicator('saving','● Salvando na nuvem...');
    fs=await waitFirestore();
    const payload=completePayload(st);
    if(!payload)return false;
    if(window.firebase?.firestore?.FieldValue?.serverTimestamp)payload.cloudSyncedAt=window.firebase.firestore.FieldValue.serverTimestamp();
    await fs.collection('inspections').doc(String(payload.id)).set(payload,{merge:true});
    indicator('sync','● Nuvem sincronizada');
    attachRealtime(String(payload.id));
    return true;
  }catch(e){
    console.error('[CLOUD PUSH]',reason,e);
    indicator('error','● Erro na nuvem');
    return false;
  }
}

function schedulePush(){
  if(applyingRemote)return;
  clearTimeout(pushTimer);
  indicator('wait','● Alterações pendentes');
  pushTimer=setTimeout(()=>pushCloud('debounce'),SYNC_DEBOUNCE);
}

async function applyRemote(data,{openForm=false,realtime=false}={}){
  const raw=cleanRemote(data);
  if(!raw?.id)return;
  applyingRemote=true;
  clearTimeout(pushTimer);
  try{
    await persistRawRemote(data);
    const ui=prepareForUI(data);
    setState(ui);
    if(typeof window.renderForm==='function')window.renderForm();
    if(openForm&&typeof window.show==='function')window.show('form');
    window.tbmInstallMultiPhotoFix?.();
    indicator('sync',realtime?'● Atualizado da nuvem':'● Nuvem sincronizada');
    const msg=document.getElementById('msg');
    if(realtime&&msg){msg.className='notice info';msg.textContent='☁️ Alterações recebidas de outro dispositivo.'}
  }finally{
    setTimeout(()=>{applyingRemote=false},120);
  }
}

function attachRealtime(id){
  if(!id||!window.SST?.fs)return;
  if(window.__tbmRealtimeCloudId===id&&unsubscribe)return;
  try{unsubscribe?.()}catch(_){ }
  window.__tbmRealtimeCloudId=id;
  unsubscribe=window.SST.fs.collection('inspections').doc(String(id)).onSnapshot(snap=>{
    if(!snap.exists||snap.metadata?.hasPendingWrites)return;
    const data=snap.data()||{};
    if(data.workspaceKey!==WORKSPACE_KEY||data.cloudDeviceId===DEVICE_ID)return;
    const local=getState();
    if(!local||String(local.id)!==String(id))return;
    const remoteTime=Date.parse(data.updatedAt||data.cloudClientUpdatedAt||'')||0;
    const localTime=Date.parse(local.updatedAt||'')||0;
    if(remoteTime&&localTime&&remoteTime<=localTime)return;
    applyRemote(data,{openForm:false,realtime:true}).catch(e=>console.error('[CLOUD REALTIME]',e));
  },e=>{console.warn('[CLOUD REALTIME]',e);indicator('error','● Nuvem indisponível')});
}

function ensureCloudModal(){
  let modal=document.getElementById('tbmCloudModal');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='tbmCloudModal';
  modal.className='modal hidden';
  modal.innerHTML=`<div class="modalbox" style="max-width:650px"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div class="sectionTitle" style="margin:0">☁️ Inspeções na Nuvem</div><button type="button" id="tbmCloudClose" class="btn secondary">✕</button></div><div id="tbmCloudList" style="margin-top:12px"><div class="notice info">Carregando...</div></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('#tbmCloudClose').onclick=()=>modal.classList.add('hidden');
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hidden')});
  return modal;
}

function renderCloudList(records){
  const modal=ensureCloudModal();
  const list=modal.querySelector('#tbmCloudList');
  if(!records.length){list.innerHTML='<div class="notice info">Nenhuma inspeção compartilhada encontrada na nuvem.</div>';return}
  list.innerHTML=records.map(x=>`<div class="historyItem"><div class="historyTop"><div><b>☁️ ${esc(x.title||x.type||'Inspeção')}</b><div class="mini">${esc(x.id)} • ${esc(fmt(x.date||x.updatedAt))}</div><div class="mini">${esc(x.company==='Outro'?x.otherCompany:x.company||'TBM')} • ${esc(x.sector||'Sem setor')}</div><div class="mini">Atualizado: ${esc(fmt(x.updatedAt||x.cloudClientUpdatedAt))}</div></div><span class="pill">${Array.isArray(x.photos)?x.photos.length:0} foto(s)</span></div><button type="button" class="btn primary full" data-cloud-load="${esc(x.id)}">☁️ Continuar esta inspeção</button></div>`).join('');
  list.querySelectorAll('[data-cloud-load]').forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.cloudLoad;
    btn.disabled=true;btn.textContent='⏳ Carregando...';
    try{
      const fs=await waitFirestore();
      const snap=await fs.collection('inspections').doc(String(id)).get();
      if(!snap.exists)throw new Error('Inspeção não encontrada.');
      await applyRemote(snap.data(),{openForm:true,realtime:false});
      attachRealtime(id);
      modal.classList.add('hidden');
    }catch(e){console.error('[CLOUD LOAD]',e);btn.disabled=false;btn.textContent='❌ Tentar novamente'}
  });
}

async function carregarDaNuvem(){
  const modal=ensureCloudModal();
  modal.classList.remove('hidden');
  modal.querySelector('#tbmCloudList').innerHTML='<div class="notice info">☁️ Buscando inspeções compartilhadas...</div>';
  indicator('saving','● Consultando nuvem...');
  try{
    const fs=await waitFirestore();
    const snap=await fs.collection('inspections').where('workspaceKey','==',WORKSPACE_KEY).get();
    const records=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.updatedAt||b.cloudClientUpdatedAt||'').localeCompare(String(a.updatedAt||a.cloudClientUpdatedAt||'')));
    renderCloudList(records);
    indicator('sync','● Nuvem sincronizada');
  }catch(e){
    console.error('[CLOUD LIST]',e);
    modal.querySelector('#tbmCloudList').innerHTML=`<div class="notice errorbox">Não foi possível acessar a nuvem: ${esc(e?.message||e)}</div>`;
    indicator('error','● Erro na nuvem');
  }
}

function addCloudButton(){
  if(document.getElementById('loadCloud'))return;
  const history=document.getElementById('openHistory');
  if(!history)return;
  const b=document.createElement('button');
  b.id='loadCloud';b.type='button';b.className='btn secondary full';b.textContent='☁️ Carregar da Nuvem';
  b.onclick=e=>{e.preventDefault();carregarDaNuvem()};
  history.insertAdjacentElement('afterend',b);
}

async function migrateLocalToWorkspace(){
  try{
    const fs=await waitFirestore(15000);
    if(typeof window.idbAll!=='function')return;
    const list=await window.idbAll();
    const recent=(list||[]).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,50);
    for(const item of recent){
      if(!item?.id)continue;
      try{const payload=completePayload(item);if(payload)await fs.collection('inspections').doc(String(item.id)).set(payload,{merge:true})}catch(e){console.warn('[CLOUD MIGRATE]',item.id,e)}
    }
    indicator('sync','● Nuvem sincronizada');
  }catch(e){console.warn('[CLOUD MIGRATE]',e)}
}

function wrapSaving(){
  if(typeof window.saveInspection==='function'&&!window.__tbmCloudSaveWrapped){
    window.__tbmCloudSaveWrapped=true;
    const original=window.saveInspection;
    window.saveInspection=async function(...args){
      const result=await original.apply(this,args);
      await pushCloud(args[0]===true?'autosave':'manual');
      return result;
    };
  }
  if(typeof window.scheduleSave==='function'&&!window.__tbmCloudScheduleWrapped){
    window.__tbmCloudScheduleWrapped=true;
    const original=window.scheduleSave;
    window.scheduleSave=function(...args){const r=original.apply(this,args);schedulePush();return r};
  }
}

function installObservers(){
  if(document.body.dataset.tbmCloudObservers)return;
  document.body.dataset.tbmCloudObservers='1';
  document.addEventListener('input',e=>{if(e.target?.matches?.('input,textarea,select')&&e.target.id!=='photoInput')schedulePush()},{passive:true});
  document.addEventListener('change',e=>{if(e.target?.matches?.('input,textarea,select'))schedulePush()},{passive:true});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-del-photo],[data-del-e],[data-del-action],[data-status],[data-tbm-del],#addExt,#addHid,#addIluminacao,#addSirene'))schedulePush()},{passive:true});
  const photos=document.getElementById('photos');
  if(photos)new MutationObserver(()=>schedulePush()).observe(photos,{childList:true});
}

function install(){
  if(installed)return;installed=true;
  addCloudButton();
  ensureCloudModal();
  wrapSaving();
  installObservers();
  indicator('offline','● Conectando à nuvem...');
  const retry=setInterval(()=>{wrapSaving();if(window.SST?.fs){clearInterval(retry);indicator('sync','● Nuvem sincronizada');const st=getState();if(st?.id)attachRealtime(String(st.id));setTimeout(migrateLocalToWorkspace,600)}},400);
  setTimeout(()=>clearInterval(retry),20000);
}

window.carregarDaNuvem=carregarDaNuvem;
window.tbmPushCloud=pushCloud;
window.tbmAttachRealtime=attachRealtime;
window.tbmCloudWorkspace=WORKSPACE_KEY;

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
