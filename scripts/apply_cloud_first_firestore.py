from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def require(cond, msg):
    if not cond:
        raise SystemExit(msg)


def replace_once(text, old, new, label):
    require(old in text, f'{label}: trecho não encontrado')
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# INDEX: persistência 100% Firestore com aliases de compatibilidade idb*
# ---------------------------------------------------------------------------
path='index.html'
s=read(path)
s=replace_once(s, 'id="cloudState">● Local</div>', 'id="cloudState">● Conectando...</div>', 'cloud state inicial')
s=replace_once(s, 'Salvamento local automático • histórico no dispositivo', 'Sincronização automática em nuvem • histórico em tempo real', 'statusline cloud')
s=replace_once(
    s,
    "const FIREBASE={apiKey:'AIzaSyBFOJOxX59k1dfZbOauv4zjkh_qhynuLuU',authDomain:'app-inspecao-sst-79aa6.firebaseapp.com',projectId:'app-inspecao-sst-79aa6',storageBucket:'app-inspecao-sst-79aa6.firebasestorage.app',messagingSenderId:'992254064215',appId:'1:992254064215:web:ffa5f1c463b444d8479512'};const DB_NAME='SSTInspecoes',STORE='inspections',APP_VERSION='2026.09.03.3';",
    "const FIREBASE={apiKey:'AIzaSyBFOJOxX59k1dfZbOauv4zjkh_qhynuLuU',authDomain:'app-inspecao-sst-79aa6.firebaseapp.com',projectId:'app-inspecao-sst-79aa6',storageBucket:'app-inspecao-sst-79aa6.firebasestorage.app',messagingSenderId:'992254064215',appId:'1:992254064215:web:ffa5f1c463b444d8479512'};const CLOUD_COLLECTION='relatorios_sst',APP_VERSION='2026.09.08.cloud-first.1';",
    'constantes cloud')
s=replace_once(s, 'let state={};let db=null;let saveTimer=null;', 'let state={};let saveTimer=null;', 'remove db local')

old_block="""function initDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,2);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'});const s=r.transaction.objectStore(STORE);if(!s.indexNames.contains('updatedAt'))s.createIndex('updatedAt','updatedAt')};r.onsuccess=()=>{db=r.result;res()};r.onerror=()=>rej(r.error)})}function idbPut(x){return new Promise((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(x);r.onsuccess=res;r.onerror=()=>rej(r.error)})}function idbAll(){return new Promise((res,rej)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}function idbGet(id){return new Promise((res,rej)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}function idbDelete(id){return new Promise((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).delete(id);r.onsuccess=res;r.onerror=()=>rej(r.error)})}
async function firebaseStart(){try{if(!window.firebase)throw Error('Firebase não carregou');if(!firebase.apps.length)firebase.initializeApp(FIREBASE);const a=firebase.auth();await a.signInAnonymously();window.SST={fs:firebase.firestore(),uid:a.currentUser.uid};$('cloudState').textContent='● Nuvem ativa'}catch(e){console.warn('Firebase:',e);$('cloudState').textContent='● Local'}}function cloudSafe(x){const y=JSON.parse(JSON.stringify(x));y.ownerUid=window.SST.uid;y.appVersion=APP_VERSION;return y}async function cloudPush(){if(!window.SST)return;for(const x of await idbAll())try{await window.SST.fs.collection('inspections').doc(x.id).set(cloudSafe(x),{merge:true})}catch(e){console.warn(e)}}async function cloudPull(){if(!window.SST)return;try{const s=await window.SST.fs.collection('inspections').where('ownerUid','==',window.SST.uid).get();for(const d of s.docs){const x=d.data();delete x.ownerUid;await idbPut(x)}}catch(e){console.warn(e)}}
"""
new_block="""async function firebaseStart(){
  try{
    if(!window.firebase)throw Error('Firebase não carregou');
    if(!firebase.apps.length)firebase.initializeApp(FIREBASE);
    const auth=firebase.auth();
    if(!auth.currentUser)await auth.signInAnonymously();
    window.SST={fs:firebase.firestore(),uid:auth.currentUser?.uid||''};
    $('cloudState').textContent='● Nuvem ativa';
    window.dispatchEvent(new CustomEvent('tbm-firestore-ready'));
    return window.SST.fs;
  }catch(e){
    console.error('[FIREBASE]',e);
    $('cloudState').textContent='● Nuvem indisponível';
    throw e;
  }
}
function cloudClean(data){const x=JSON.parse(JSON.stringify(data||{}));delete x.cloudUpdatedAt;delete x.appVersion;delete x.reportType;delete x.cloudSource;return x}
async function ensureFirestore(){return window.SST?.fs||await firebaseStart()}
async function cloudSetReport(x){
  const fs=await ensureFirestore();
  const y=JSON.parse(JSON.stringify(x||{}));
  y.id=String(y.id||uidgen());
  y.updatedAt=String(y.updatedAt||new Date().toISOString());
  y.reportType=String(y.title||TYPES?.[y.type]?.name||y.type||'Relatório SST');
  y.appVersion=APP_VERSION;
  y.cloudUpdatedAt=firebase.firestore.FieldValue.serverTimestamp();
  await fs.collection(CLOUD_COLLECTION).doc(y.id).set(y,{merge:true});
  return cloudClean(y);
}
async function cloudListReports(){
  const fs=await ensureFirestore();
  const snap=await fs.collection(CLOUD_COLLECTION).orderBy('cloudUpdatedAt','desc').get();
  return snap.docs.map(d=>cloudClean({id:d.id,...d.data()}));
}
async function cloudGetReport(id){
  const fs=await ensureFirestore();
  const doc=await fs.collection(CLOUD_COLLECTION).doc(String(id)).get();
  return doc.exists?cloudClean({id:doc.id,...doc.data()}):null;
}
async function cloudDeleteReport(id){
  const fs=await ensureFirestore();
  await fs.collection(CLOUD_COLLECTION).doc(String(id)).delete();
  return true;
}
// Compatibilidade: módulos legados continuam chamando idb*, mas essas funções agora são 100% Firestore.
function initDB(){return ensureFirestore()}
function idbPut(x){return cloudSetReport(x)}
function idbAll(){return cloudListReports()}
function idbGet(id){return cloudGetReport(id)}
function idbDelete(id){return cloudDeleteReport(id)}
function purgeLegacyLocalReportStorage(){
  try{localStorage.removeItem('historicoSST')}catch(_){ }
  try{localStorage.removeItem('tbm-sst-mobile-dashboard-v2')}catch(_){ }
  try{localStorage.removeItem('tbm-sst-cloud-delete-queue')}catch(_){ }
  try{indexedDB.deleteDatabase('SSTInspecoes')}catch(_){ }
}
Object.assign(window,{firebaseStart,ensureFirestore,cloudSetReport,cloudListReports,cloudGetReport,cloudDeleteReport,idbPut,idbAll,idbGet,idbDelete});
"""
s=replace_once(s, old_block, new_block, 'persistencia index')

old_save="""function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveInspection(true),1800)}async function saveInspection(silent=false){try{if(state.type==='accident'){syncAccidentActions();for(const a of (state.accident?.actions||[])){if(!String(a.action||'').trim()||!String(a.responsible||'').trim()||!String(a.deadline||'').trim()){if(!silent)notice('Preencha Ação, Responsável e Prazo em todas as ações adicionadas.','error');return}}}normalize();state.id=state.id||uidgen();state.createdAt=state.createdAt||new Date().toISOString();state.updatedAt=new Date().toISOString();state.title=TYPES[state.type].name;await idbPut(state);if(!silent&&typeof window.tbmHistoricoSalvar==='function')await window.tbmHistoricoSalvar(state,{source:'main'});if(!silent)notice('Inspeção salva no dispositivo e adicionada ao histórico.','success')}catch(e){console.error(e);if(!silent)notice('Inspeção salva no dispositivo. A sincronização será tentada novamente.','info')}}
"""
new_save="""function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveInspection(true),1800)}async function saveInspection(silent=false){try{if(state.type==='accident'){syncAccidentActions();for(const a of (state.accident?.actions||[])){if(!String(a.action||'').trim()||!String(a.responsible||'').trim()||!String(a.deadline||'').trim()){if(!silent)notice('Preencha Ação, Responsável e Prazo em todas as ações adicionadas.','error');return false}}}normalize();state.id=state.id||uidgen();state.createdAt=state.createdAt||new Date().toISOString();state.updatedAt=new Date().toISOString();state.title=TYPES[state.type].name;await cloudSetReport(state);if(!silent)notice('Relatório salvo na nuvem com sucesso!','success');return true}catch(e){console.error('[SALVAR NUVEM]',e);if(!silent)notice('Não foi possível salvar na nuvem. Verifique sua conexão e tente novamente.','error');return false}}
"""
s=replace_once(s, old_save, new_save, 'saveInspection cloud')

s=replace_once(s, "await idbDelete(t.dataset.deleteH);if(window.SST)window.SST.fs.collection('inspections').doc(t.dataset.deleteH).delete().catch(()=>{});openHistory()", "await cloudDeleteReport(t.dataset.deleteH);openHistory()", 'delete history cloud')
s=replace_once(s, "(async()=>{try{await initDB();$('cloudState').textContent='● Local'}catch(e){console.error(e);$('cloudState').textContent='● Local'}})();", "(async()=>{purgeLegacyLocalReportStorage();try{await firebaseStart()}catch(e){console.error(e)}})();", 'startup cloud')
write(path,s)


# ---------------------------------------------------------------------------
# PT: autosave e manual save exclusivamente Firestore
# ---------------------------------------------------------------------------
path='pt-altura.js'
s=read(path)
pattern=r"async function savePT\(feedback=false,syncCloud=feedback\)\{.*?\n\}\n\nasync function imageToDataUrl"
replacement="""async function savePT(feedback=false,syncCloud=feedback){
  if(!ptState)return false;
  ptState.updatedAt=nowISO();ptState.issuer={name:EMISSOR_NOME,role:EMISSOR_CARGO,signature:ptState.issuer?.signature||''};
  try{
    if(typeof window.tbmHistoricoSalvar!=='function')throw new Error('Persistência Firestore indisponível.');
    await window.tbmHistoricoSalvar(ptState,{source:'pt',reportType:PT_TITLE});
    if(feedback)showMsg('✅ PT salva na nuvem com sucesso.');
    return true;
  }catch(e){console.error('[PT SAVE CLOUD]',e);if(feedback)showMsg('❌ Não foi possível salvar a PT na nuvem.','errorbox');return false}
}

async function imageToDataUrl"""
s,n=re.subn(pattern,replacement,s,count=1,flags=re.S)
require(n==1,'savePT: função não encontrada')
s=s.replace("window.__tbmPTAlturaVersion='2026.09.08.pt-altura.5-preventive-local-history';","window.__tbmPTAlturaVersion='2026.09.08.pt-altura.6-cloud-first';",1)
write(path,s)


# ---------------------------------------------------------------------------
# HISTÓRICO: Firestore + onSnapshot + orderBy. Nenhum localStorage/IndexedDB.
# ---------------------------------------------------------------------------
cloud_history=r'''(()=>{
'use strict';

const FLAG='__tbmCloudHistoryV1';
if(window[FLAG])return;window[FLAG]=true;

const COLLECTION='relatorios_sst';
const MAX_DOC_BYTES=920000;
let unsubscribe=null;
let cloudItems=[];
let listenerStarting=false;

const clone=value=>JSON.parse(JSON.stringify(value??null));
const esc=value=>String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
const nowIso=()=>new Date().toISOString();

function currentMainState(){try{return typeof state!=='undefined'?state:(window.state||null)}catch(_){return window.state||null}}
function byteSize(text){try{return new Blob([text]).size}catch(_){return String(text||'').length*2}}
function formatDate(value){
  if(!value)return'—';
  const raw=typeof value?.toDate==='function'?value.toDate():value;
  const d=new Date(raw);return Number.isNaN(d.getTime())?String(raw):d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
}
function reportType(snapshot,meta={}){
  if(meta.reportType)return String(meta.reportType);
  if(snapshot?.title)return String(snapshot.title);
  try{if(typeof TYPES==='object'&&TYPES?.[snapshot?.type]?.name)return String(TYPES[snapshot.type].name)}catch(_){ }
  return String(snapshot?.type||'Relatório SST');
}
function cleanCloudFields(data){
  const x=clone(data)||{};
  delete x.cloudUpdatedAt;delete x.appVersion;delete x.reportType;delete x.cloudSource;
  return x;
}
async function waitFirestore(timeout=12000){
  const start=Date.now();
  while(Date.now()-start<timeout){
    if(window.SST?.fs)return window.SST.fs;
    if(typeof window.firebaseStart==='function'){
      try{const fs=await window.firebaseStart();if(fs)return fs}catch(_){ }
    }
    await new Promise(r=>setTimeout(r,180));
  }
  throw new Error('Firestore indisponível. Verifique a conexão com a internet.');
}

async function compactDataImage(dataUrl,max=800,quality=0.58){
  const value=String(dataUrl||'');
  if(!/^data:image\//i.test(value)||value.length<90000)return value;
  try{
    const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=value});
    const w0=img.naturalWidth||img.width,h0=img.naturalHeight||img.height;if(!w0||!h0)return value;
    const scale=Math.min(1,max/Math.max(w0,h0));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w0*scale));canvas.height=Math.max(1,Math.round(h0*scale));
    const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',quality);
  }catch(_){return value}
}
async function compactStateImages(snapshot,max=800,quality=0.58){
  const x=clone(snapshot)||{};
  if(Array.isArray(x.photos))for(const p of x.photos)if(p?.data)p.data=await compactDataImage(p.data,max,quality);
  if(Array.isArray(x.evidencePhotos))for(let i=0;i<x.evidencePhotos.length;i++)x.evidencePhotos[i]=await compactDataImage(x.evidencePhotos[i],max,quality);
  for(const key of ['checklistPT','checklistNR24','checklistExtintores','checklistHidrantes'])if(Array.isArray(x[key]))for(const item of x[key])if(item?.fotoEvidencia)item.fotoEvidencia=await compactDataImage(item.fotoEvidencia,max,quality);
  if(Array.isArray(x.trainingAttendance?.participants))for(const p of x.trainingAttendance.participants)if(p?.signature)p.signature=await compactDataImage(p.signature,max,quality);
  if(x.signature1)x.signature1=await compactDataImage(x.signature1,600,0.55);
  if(x.signature2)x.signature2=await compactDataImage(x.signature2,600,0.55);
  if(x.issuer?.signature)x.issuer.signature=await compactDataImage(x.issuer.signature,600,0.55);
  if(Array.isArray(x.workers))for(const w of x.workers)if(w?.signature)w.signature=await compactDataImage(w.signature,600,0.55);
  return x;
}
async function prepareSnapshot(snapshot){
  let x=clone(snapshot)||{};
  let json=JSON.stringify(x);
  if(byteSize(json)>760000){x=await compactStateImages(x,800,0.58);json=JSON.stringify(x)}
  if(byteSize(json)>MAX_DOC_BYTES){x=await compactStateImages(x,600,0.48);json=JSON.stringify(x)}
  if(byteSize(json)>MAX_DOC_BYTES)throw new Error('O relatório excedeu o limite do Firestore. Reduza a quantidade de fotos deste relatório e tente novamente.');
  return x;
}

async function saveHistory(snapshot,meta={}){
  if(!snapshot||typeof snapshot!=='object')return null;
  const fs=await waitFirestore();
  const clean=await prepareSnapshot(snapshot);
  clean.id=String(clean.id||('SST-'+Date.now()));
  clean.createdAt=String(clean.createdAt||nowIso());
  clean.updatedAt=nowIso();
  clean.reportType=reportType(clean,meta);
  clean.cloudSource=String(meta.source||'main');
  clean.appVersion='2026.09.08.cloud-history.1';
  clean.cloudUpdatedAt=firebase.firestore.FieldValue.serverTimestamp();
  await fs.collection(COLLECTION).doc(clean.id).set(clean,{merge:true});
  window.dispatchEvent(new CustomEvent('tbm-cloud-history-saved',{detail:{id:clean.id,type:clean.type}}));
  return cleanCloudFields(clean);
}

function normalizeItem(doc){
  const raw={id:doc.id,...(doc.data()||{})};
  return {id:raw.id,reportType:String(raw.reportType||raw.title||raw.type||'Relatório SST'),date:raw.date||raw.updatedAt||raw.createdAt||'',updatedAt:raw.cloudUpdatedAt||raw.updatedAt||'',type:raw.type||'report',state:cleanCloudFields(raw)};
}
function renderHistory(){
  const list=document.getElementById('historyList');if(!list)return;
  list.innerHTML=cloudItems.length?cloudItems.map(item=>`<div class="historyItem" data-cloud-history-id="${esc(item.id)}"><div class="historyTop"><div><b>☁️ ${esc(item.reportType)}</b><div class="mini">${esc(item.id)} • ${esc(formatDate(item.date))}</div><div class="mini">Sincronizado em ${esc(formatDate(item.updatedAt))}</div></div><span class="pill">NUVEM</span></div><div class="actions no-print" style="margin-top:9px"><button type="button" class="btn primary" data-cloud-history-open="${esc(item.id)}">Abrir / Visualizar</button><button type="button" class="btn secondary" data-cloud-history-pdf="${esc(item.id)}">Gerar PDF</button><button type="button" class="btn danger" data-cloud-history-delete="${esc(item.id)}">Excluir</button></div></div>`).join(''):'<div class="notice info">Nenhum relatório salvo na nuvem ainda.</div>';
}
async function startRealtime(){
  if(unsubscribe||listenerStarting)return;listenerStarting=true;
  try{
    const fs=await waitFirestore();
    unsubscribe=fs.collection(COLLECTION).orderBy('cloudUpdatedAt','desc').onSnapshot(snapshot=>{
      cloudItems=snapshot.docs.map(normalizeItem);
      const history=document.getElementById('history');if(history&&!history.classList.contains('hidden'))renderHistory();
      const indicator=document.getElementById('cloudState');if(indicator)indicator.textContent='● Nuvem ativa';
    },err=>{
      console.error('[HISTÓRICO FIRESTORE]',err);
      const indicator=document.getElementById('cloudState');if(indicator)indicator.textContent='● Nuvem indisponível';
      const list=document.getElementById('historyList');if(list&&!document.getElementById('history')?.classList.contains('hidden'))list.innerHTML='<div class="notice errorbox">Não foi possível sincronizar o histórico com a nuvem.</div>';
    });
  }finally{listenerStarting=false}
}
function showHistory(){
  const list=document.getElementById('historyList');if(list&&!cloudItems.length)list.innerHTML='<div class="notice info">⏳ Sincronizando histórico com a nuvem...</div>';
  try{if(typeof show==='function')show('history');else{['home','form','report'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));document.getElementById('history')?.classList.remove('hidden')}}catch(_){document.getElementById('history')?.classList.remove('hidden')}
  renderHistory();startRealtime().catch(err=>console.error('[HISTÓRICO FIRESTORE]',err));
}
function findItem(id){return cloudItems.find(x=>String(x.id)===String(id))||null}
async function fetchItem(id){
  const cached=findItem(id);if(cached?.state)return cached;
  const fs=await waitFirestore();const doc=await fs.collection(COLLECTION).doc(String(id)).get();return doc.exists?normalizeItem(doc):null;
}
async function restoreItem(item,generatePdf=false){
  if(!item?.state)return false;const snapshot=clone(item.state);
  if(snapshot.type==='pt-altura'){
    if(typeof window.openPTAltura!=='function')throw new Error('Módulo de PT indisponível.');
    window.openPTAltura(snapshot);if(generatePdf)setTimeout(()=>window.makePTAlturaPdf?.('download'),120);return true;
  }
  try{state=snapshot}catch(_){window.state=snapshot}
  try{if(typeof renderForm==='function')renderForm();else window.renderForm?.()}catch(err){console.error('[HISTÓRICO FIRESTORE] renderização',err)}
  try{if(typeof show==='function')show('form');else document.getElementById('form')?.classList.remove('hidden')}catch(_){ }
  if(generatePdf)setTimeout(()=>window.makePdf?.('download'),150);return true;
}
async function deleteItem(id){
  const fs=await waitFirestore();await fs.collection(COLLECTION).doc(String(id)).delete();
}

async function sharePdf(docDefinition,filename,{title='Relatório SST',text='Relatório SST'}={}){
  if(!window.pdfMake?.createPdf)throw new Error('Biblioteca pdfmake indisponível.');
  const download=()=>window.pdfMake.createPdf(docDefinition).download(filename);
  return await new Promise(resolve=>{
    window.pdfMake.createPdf(docDefinition).getBlob(async blob=>{
      try{
        if(typeof navigator.share!=='function')throw new Error('Compartilhamento nativo não disponível neste dispositivo.');
        const file=new File([blob],filename,{type:'application/pdf'});
        if(typeof navigator.canShare==='function'&&!navigator.canShare({files:[file]}))throw new Error('Este navegador não permite compartilhar arquivos PDF diretamente.');
        await navigator.share({title,text,files:[file]});resolve({shared:true,downloaded:false});
      }catch(err){
        if(err?.name==='AbortError'){resolve({shared:false,downloaded:false,cancelled:true});return}
        console.warn('[COMPARTILHAR PDF] fallback para download',err);
        alert('O compartilhamento direto não está disponível neste dispositivo. O PDF será baixado automaticamente para você compartilhar pelo aplicativo que preferir.');
        try{download();resolve({shared:false,downloaded:true})}catch(downloadErr){console.error('[COMPARTILHAR PDF] falha também no download',downloadErr);resolve({shared:false,downloaded:false,error:downloadErr})}
      }
    });
  });
}

function purgeLegacyInspectionData(){
  try{localStorage.removeItem('historicoSST')}catch(_){ }
  try{localStorage.removeItem('tbm-sst-mobile-dashboard-v2')}catch(_){ }
  try{localStorage.removeItem('tbm-sst-cloud-delete-queue')}catch(_){ }
  try{indexedDB.deleteDatabase('SSTInspecoes')}catch(_){ }
}
function installUi(){
  purgeLegacyInspectionData();
  const button=document.getElementById('openHistory');if(button){button.textContent='📚 Ver Histórico';button.onclick=e=>{e.preventDefault();showHistory()}}
  const back=document.getElementById('historyBack');if(back)back.onclick=e=>{e.preventDefault();try{if(typeof show==='function')show('home')}catch(_){ }};
  if(document.documentElement.dataset.tbmCloudHistoryEvents!=='1'){
    document.documentElement.dataset.tbmCloudHistoryEvents='1';
    document.addEventListener('click',async e=>{
      const open=e.target.closest?.('[data-cloud-history-open]'),pdf=e.target.closest?.('[data-cloud-history-pdf]'),del=e.target.closest?.('[data-cloud-history-delete]');
      const target=open||pdf||del;if(!target)return;e.preventDefault();e.stopPropagation();
      const id=open?.dataset.cloudHistoryOpen||pdf?.dataset.cloudHistoryPdf||del?.dataset.cloudHistoryDelete;
      try{
        if(del){if(confirm('Excluir este relatório da nuvem?'))await deleteItem(id);return}
        const item=await fetchItem(id);if(item)await restoreItem(item,!!pdf);
      }catch(err){console.error('[HISTÓRICO FIRESTORE]',err);alert('Não foi possível executar esta ação na nuvem.')}
    },true);
  }
  startRealtime().catch(err=>console.error('[HISTÓRICO FIRESTORE]',err));
}

window.tbmHistoricoSalvar=saveHistory;
window.tbmHistoricoLer=()=>clone(cloudItems.map(x=>x.state));
window.tbmHistoricoAbrir=showHistory;
window.tbmHistoricoRestaurar=restoreItem;
window.tbmCompartilharPdf=sharePdf;
window.openHistory=showHistory;
window.__tbmCloudHistoryVersion='2026.09.08.1-realtime-firestore';
window.addEventListener('tbm-firestore-ready',()=>startRealtime().catch(()=>{}));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUi,{once:true});else installUi();
})();
'''
write('local-history.js',cloud_history)


# ---------------------------------------------------------------------------
# Mobile performance: mantém apenas proteção de PDF, sem índice/localStorage.
# ---------------------------------------------------------------------------
mobile=r'''(()=>{
'use strict';
const FLAG='__tbmMobilePdfPerformanceV5Cloud';
function isMobile(){try{return matchMedia('(max-width: 900px)').matches||matchMedia('(pointer: coarse)').matches||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')}catch(_){return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')}}
function canSharePdfFiles(){if(typeof navigator.share!=='function')return false;if(typeof navigator.canShare!=='function')return true;try{const blob=new Blob(['PDF'],{type:'application/pdf'});const file=new File([blob],'teste.pdf',{type:'application/pdf'});return !!navigator.canShare({files:[file]})}catch(_){return false}}
function installPdf(){
  if(!isMobile())return true;if(typeof window.makePdf!=='function')return false;if(window.makePdf[FLAG])return true;
  const current=window.makePdf;
  const wrapped=function(action='download',...rest){
    let nextAction=action;if(nextAction===true)nextAction='share';if(nextAction===false)nextAction='download';if(nextAction==='share'&&!canSharePdfFiles())nextAction='download';
    const previousBypass=window.__tbmPdfSummaryBypass;window.__tbmPdfSummaryBypass=true;
    try{const result=current.call(this,nextAction,...rest);if(result&&typeof result.then==='function')return result.finally(()=>{window.__tbmPdfSummaryBypass=previousBypass});window.__tbmPdfSummaryBypass=previousBypass;return result}catch(e){window.__tbmPdfSummaryBypass=previousBypass;throw e}
  };
  wrapped[FLAG]=true;wrapped.__tbmOriginal=current;window.makePdf=wrapped;return true;
}
function install(){return installPdf()}
if(!install()){let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>=30)clearInterval(timer)},200)}
window.tbmInstallMobilePdfPerformance=install;
window.tbmImportLegacyHistory=()=>false;
window.tbmReadLightHistoryIndex=()=>[];
window.__tbmMobilePerformanceVersion='2026.09.08.5-cloud-only';
})();
'''
write('mobile-performance-fix.js',mobile)


# ---------------------------------------------------------------------------
# Save button: feedback cloud
# ---------------------------------------------------------------------------
path='save-button-fix.js'
s=read(path)
s=s.replace("toast('✅ Inspeção salva no dispositivo.','ok');","toast('✅ Relatório salvo na nuvem com sucesso!','ok');",1)
write(path,s)


# ---------------------------------------------------------------------------
# Loader: não carrega histórico local leve nem cloud-cross-device legado.
# ---------------------------------------------------------------------------
path='sst-repair-loader.js'
s=read(path)
s=re.sub(r"function loadCloudCrossDevice\(\)\{.*?\}\n",'',s,count=1)
s=s.replace("s.src='./local-history.js?v=20260908-02&cb='","s.src='./local-history.js?v=20260908-03&cb='",1)
s=s.replace("s.src='./pt-altura.js?v=20260908-05&cb='","s.src='./pt-altura.js?v=20260908-06&cb='",1)
s=s.replace("  await loadMobilePerformanceFix();\n  await loadHistoryLightFix();\n", "  await loadMobilePerformanceFix();\n",1)
s=s.replace("  // Sincronização cross-device continua desativada; apenas o envio de e-mail foi restaurado.\n", "  // Persistência oficial: Firestore relatorios_sst com listener em tempo real.\n",1)
require('await loadHistoryLightFix();' not in s,'loader ainda carrega histórico local leve')
require('loadCloudCrossDevice' not in s,'loader ainda contém cloud-cross-device legado')
write(path,s)


# ---------------------------------------------------------------------------
# PWA cache: código atualizado, sem módulos locais legados.
# ---------------------------------------------------------------------------
for path in ('service-worker.js','sw.js'):
    s=read(path)
    s=s.replace('inspecao-sst-v86','inspecao-sst-v87')
    s=s.replace("'./cloud-cross-device.js',",'')
    s=s.replace("'./history-light-fix.js',",'')
    s=s.replace("?v=86","?v=87")
    write(path,s)


# ---------------------------------------------------------------------------
# Health check: novas invariantes cloud-first.
# ---------------------------------------------------------------------------
path='.github/workflows/check-sst-syntax.yml'
s=read(path)
s=s.replace("assert 'inspecao-sst-v85' in text", "assert 'inspecao-sst-v87' in text",1)
insert="""
          cloud=Path('local-history.js').read_text(encoding='utf-8')
          assert "const COLLECTION='relatorios_sst'" in cloud
          assert ".orderBy('cloudUpdatedAt','desc').onSnapshot(" in cloud
          assert 'localStorage.getItem' not in cloud and 'localStorage.setItem' not in cloud
          assert 'indexedDB.open' not in cloud

          index=Path('index.html').read_text(encoding='utf-8')
          assert "CLOUD_COLLECTION='relatorios_sst'" in index
          assert "indexedDB.open(DB_NAME" not in index
          assert "collection('inspections')" not in index

          pt=Path('pt-altura.js').read_text(encoding='utf-8')
          assert 'await window.tbmHistoricoSalvar(ptState' in pt
          assert "window.idbPut(ptState)" not in pt
"""
needle="          for sw in ['service-worker.js','sw.js']:\n"
require(needle in s,'health check anchor não encontrado')
s=s.replace(needle,insert+"\n"+needle,1)
write(path,s)

# one-shot trigger
Path('APPLY_CLOUD_FIRST.txt').unlink(missing_ok=True)
print('CLOUD_FIRST_FIRESTORE_PATCH_OK')
