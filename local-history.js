(()=>{
'use strict';

const FLAG='__tbmCloudHistoryV1';
if(window[FLAG])return;window[FLAG]=true;
window.__TBM_MATRIZ_LOCAL_ONLY=true;

const DB_NAME='TBM_MATRIZ_LOCAL_V1';
const STORE='reports';
const clone=v=>JSON.parse(JSON.stringify(v??null));
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const nowIso=()=>new Date().toISOString();

function dbOpen(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'})};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('Não foi possível abrir o histórico local.'));
  });
}
async function putLocal(x){
  const y=clone(x)||{};y.id=String(y.id||('SST-'+Date.now()));y.createdAt=String(y.createdAt||nowIso());y.updatedAt=nowIso();
  return await new Promise(async(resolve,reject)=>{try{const db=await dbOpen(),tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(y);tx.oncomplete=()=>{db.close();resolve(clone(y))};tx.onerror=()=>{const e=tx.error;db.close();reject(e)}}catch(e){reject(e)}});
}
async function getLocal(id){
  return await new Promise(async(resolve,reject)=>{try{const db=await dbOpen(),tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(String(id));req.onsuccess=()=>{db.close();resolve(req.result?clone(req.result):null)};req.onerror=()=>{const e=req.error;db.close();reject(e)}}catch(e){reject(e)}});
}
async function allLocal(){
  return await new Promise(async(resolve,reject)=>{try{const db=await dbOpen(),tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();req.onsuccess=()=>{db.close();resolve((req.result||[]).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).map(clone))};req.onerror=()=>{const e=req.error;db.close();reject(e)}}catch(e){reject(e)}});
}
async function deleteLocal(id){
  return await new Promise(async(resolve,reject)=>{try{const db=await dbOpen(),tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(String(id));tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>{const e=tx.error;db.close();reject(e)}}catch(e){reject(e)}});
}

function reportType(snapshot,meta={}){
  if(meta.reportType)return String(meta.reportType);
  if(snapshot?.title)return String(snapshot.title);
  try{if(typeof TYPES==='object'&&TYPES?.[snapshot?.type]?.name)return String(TYPES[snapshot.type].name)}catch(_){ }
  return String(snapshot?.type||'Relatório SST');
}
async function saveHistory(snapshot,meta={}){
  if(!snapshot||typeof snapshot!=='object')return null;
  const x=clone(snapshot)||{};x.id=String(x.id||('SST-'+Date.now()));x.reportType=reportType(x,meta);x.localSource='tbm-matriz';
  const saved=await putLocal(x);
  window.dispatchEvent(new CustomEvent('tbm-local-history-saved',{detail:{id:saved.id,type:saved.type}}));
  return saved;
}
function fmt(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}

async function restore(snapshot,generatePdf=false){
  if(!snapshot)return false;const x=clone(snapshot);
  if(x.type==='pt-altura'){
    if(typeof window.openPTAltura!=='function')throw new Error('Módulo de PT indisponível.');
    window.openPTAltura(x);if(generatePdf)setTimeout(()=>window.makePTAlturaPdf?.('download'),180);return true;
  }
  try{state=x}catch(_){window.state=x}
  try{if(typeof renderForm==='function')renderForm();else window.renderForm?.()}catch(err){console.error('[HISTÓRICO LOCAL] renderização',err)}
  try{if(typeof show==='function')show('form');else document.getElementById('form')?.classList.remove('hidden')}catch(_){ }
  if(generatePdf)setTimeout(()=>window.makePdf?.('download'),180);return true;
}

async function showHistory(){
  try{if(typeof show==='function')show('history');else{['home','form','report'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));document.getElementById('history')?.classList.remove('hidden')}}catch(_){document.getElementById('history')?.classList.remove('hidden')}
  const list=document.getElementById('historyList');if(!list)return;
  list.style.display='block';
  const matrizList=document.getElementById('tbmMatrizHistoryList');if(matrizList)matrizList.style.display='none';
  list.innerHTML='<div class="notice info">⏳ Carregando histórico deste dispositivo...</div>';
  try{
    const items=await allLocal();
    list.innerHTML=items.length?items.map(x=>`<div class="historyItem"><div class="historyTop"><div><b>📱 ${esc(x.reportType||x.title||x.type||'Relatório SST')}</b><div class="mini">${esc(x.id)} • ${esc(fmt(x.date||x.updatedAt||x.createdAt))}</div><div class="mini">Armazenado somente neste dispositivo</div></div><span class="pill">LOCAL</span></div><div class="actions no-print" style="margin-top:9px"><button type="button" class="btn primary" data-local-open="${esc(x.id)}">Abrir</button><button type="button" class="btn secondary" data-local-pdf="${esc(x.id)}">Gerar PDF</button><button type="button" class="btn danger" data-local-delete="${esc(x.id)}">Excluir</button></div></div>`).join(''):'<div class="notice info">Nenhum relatório salvo neste dispositivo ainda.</div>';
  }catch(err){console.error('[HISTÓRICO LOCAL]',err);list.innerHTML='<div class="notice errorbox">Não foi possível abrir o histórico local.</div>'}
}

async function sharePdf(docDefinition,filename,{title='Relatório SST',text='Relatório SST'}={}){
  if(!window.pdfMake?.createPdf)throw new Error('Biblioteca pdfmake indisponível.');
  const download=()=>window.pdfMake.createPdf(docDefinition).download(filename);
  return await new Promise(resolve=>window.pdfMake.createPdf(docDefinition).getBlob(async blob=>{try{if(typeof navigator.share!=='function')throw new Error('Compartilhamento indisponível');const file=new File([blob],filename,{type:'application/pdf'});if(typeof navigator.canShare==='function'&&!navigator.canShare({files:[file]}))throw new Error('Compartilhamento de PDF indisponível');await navigator.share({title,text,files:[file]});resolve({shared:true})}catch(err){if(err?.name==='AbortError'){resolve({cancelled:true});return}try{download();resolve({downloaded:true})}catch(e){resolve({error:e})}}}));
}

function installUi(){
  const indicator=document.getElementById('cloudState');if(indicator)indicator.textContent='● Salvo neste dispositivo';
  const status=document.querySelector('#home .statusline');if(status)status.innerHTML='<span class="dot"></span>Histórico local • sem sincronização com a nuvem';
  const button=document.getElementById('openHistory');if(button){button.textContent='📚 Ver Histórico';button.onclick=e=>{e.preventDefault();showHistory()}};
  const back=document.getElementById('historyBack');if(back)back.onclick=e=>{e.preventDefault();try{if(typeof show==='function')show('home')}catch(_){ }};
  if(document.documentElement.dataset.tbmLocalHistoryEvents!=='1'){
    document.documentElement.dataset.tbmLocalHistoryEvents='1';
    document.addEventListener('click',async e=>{
      const open=e.target.closest?.('[data-local-open]'),pdf=e.target.closest?.('[data-local-pdf]'),del=e.target.closest?.('[data-local-delete]');const t=open||pdf||del;if(!t)return;e.preventDefault();e.stopPropagation();
      const id=open?.dataset.localOpen||pdf?.dataset.localPdf||del?.dataset.localDelete;
      try{if(del){if(confirm('Excluir este relatório deste dispositivo?')){await deleteLocal(id);await showHistory()}return}const x=await getLocal(id);if(x)await restore(x,!!pdf)}catch(err){console.error('[HISTÓRICO LOCAL]',err);alert('Não foi possível executar esta ação no histórico local.')}
    },true);
  }
  if(typeof window.notice==='function'&&!window.notice.__tbmLocalText){const old=window.notice;const wrapped=function(text,type){return old.call(this,String(text||'').replace(/salvo na nuvem com sucesso!/gi,'salvo neste dispositivo com sucesso!').replace(/nuvem/gi,'armazenamento local'),type)};wrapped.__tbmLocalText=true;window.notice=wrapped}
}

window.cloudSetReport=saveHistory;
window.cloudListReports=allLocal;
window.cloudGetReport=getLocal;
window.cloudDeleteReport=deleteLocal;
window.idbPut=saveHistory;
window.idbAll=allLocal;
window.idbGet=getLocal;
window.idbDelete=deleteLocal;
window.tbmHistoricoSalvar=saveHistory;
window.tbmHistoricoSalvar.__tbmPTCompactSaveBridge=true;
window.tbmHistoricoLer=allLocal;
window.tbmHistoricoAbrir=showHistory;
window.tbmHistoricoRestaurar=restore;
window.tbmCompartilharPdf=sharePdf;
window.openHistory=showHistory;
window.__tbmCloudHistoryVersion='local-only-tbm-matriz-v1';

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUi,{once:true});else installUi();
setTimeout(installUi,500);setTimeout(installUi,1800);
})();
