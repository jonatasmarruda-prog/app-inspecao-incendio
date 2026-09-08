(()=>{
'use strict';

const FLAG='__tbmCloudHistoryV1';
if(window[FLAG])return;window[FLAG]=true;

const COLLECTION='inspections';
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
  clean.appVersion='2026.09.08.cloud-history.2-inspections';
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
window.__tbmCloudHistoryVersion='2026.09.08.2-inspections';
window.addEventListener('tbm-firestore-ready',()=>startRealtime().catch(()=>{}));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUi,{once:true});else installUi();
})();
