(()=>{
'use strict';

const FLAG='__tbmLocalHistoryV1';
if(window[FLAG])return;window[FLAG]=true;

const HISTORY_KEY='historicoSST';
const EMAIL_ENABLE_KEY='tbm-sst-email-enabled-v1';
const MAX_ITEMS=15;
const STORAGE_TARGET_BYTES=4_400_000;

const clone=value=>JSON.parse(JSON.stringify(value??null));
const esc=value=>String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
const nowIso=()=>new Date().toISOString();
const historyId=()=>`HST-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

function currentMainState(){
  try{return typeof state!=='undefined'?state:(window.state||null)}catch(_){return window.state||null}
}

function readHistory(){
  try{
    const parsed=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
    return Array.isArray(parsed)?parsed.filter(x=>x&&typeof x==='object'&&x.state):[];
  }catch(err){console.warn('[HISTÓRICO LOCAL] leitura inválida; reiniciando lista.',err);return[]}
}

function byteSize(text){try{return new Blob([text]).size}catch(_){return String(text||'').length*2}}

async function compactDataImage(dataUrl){
  const value=String(dataUrl||'');
  if(!/^data:image\//i.test(value)||value.length<260000)return value;
  try{
    const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=value});
    const w0=img.naturalWidth||img.width,h0=img.naturalHeight||img.height;
    if(!w0||!h0)return value;
    const max=1100,scale=Math.min(1,max/Math.max(w0,h0));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w0*scale));canvas.height=Math.max(1,Math.round(h0*scale));
    const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',0.66);
  }catch(_){return value}
}

async function compactStateImages(snapshot){
  const x=clone(snapshot)||{};
  if(Array.isArray(x.photos))for(const p of x.photos)if(p&&p.data)p.data=await compactDataImage(p.data);
  if(Array.isArray(x.evidencePhotos))for(let i=0;i<x.evidencePhotos.length;i++)x.evidencePhotos[i]=await compactDataImage(x.evidencePhotos[i]);
  for(const key of ['checklistPT','checklistNR24','checklistExtintores','checklistHidrantes']){
    if(Array.isArray(x[key]))for(const item of x[key])if(item?.fotoEvidencia)item.fotoEvidencia=await compactDataImage(item.fotoEvidencia);
  }
  if(Array.isArray(x.trainingAttendance?.participants)){
    for(const p of x.trainingAttendance.participants)if(p?.signature)p.signature=await compactDataImage(p.signature);
  }
  return x;
}

function persistHistory(list){
  let work=(Array.isArray(list)?list:[]).slice(0,MAX_ITEMS);
  while(work.length){
    const json=JSON.stringify(work);
    if(byteSize(json)>STORAGE_TARGET_BYTES&&work.length>1){work.pop();continue}
    try{localStorage.setItem(HISTORY_KEY,json);return work}catch(err){
      if(work.length>1){work.pop();continue}
      throw err;
    }
  }
  localStorage.setItem(HISTORY_KEY,'[]');
  return [];
}

function reportType(snapshot,meta={}){
  if(meta.reportType)return String(meta.reportType);
  if(snapshot?.title)return String(snapshot.title);
  try{if(typeof TYPES==='object'&&TYPES?.[snapshot?.type]?.name)return String(TYPES[snapshot.type].name)}catch(_){ }
  return String(snapshot?.type||'Relatório SST');
}

async function saveHistory(snapshot,meta={}){
  if(!snapshot||typeof snapshot!=='object')return null;
  try{
    const compact=await compactStateImages(snapshot);
    const savedAt=nowIso();
    const item={
      id:historyId(),
      reportId:String(compact.id||''),
      type:String(compact.type||meta.type||'report'),
      reportType:reportType(compact,meta),
      date:String(compact.date||savedAt),
      savedAt,
      source:String(meta.source||'main'),
      state:compact
    };
    const next=[item,...readHistory()];
    persistHistory(next);
    refreshHistoryIfOpen();
    window.dispatchEvent(new CustomEvent('tbm-local-history-saved',{detail:{id:item.id,reportId:item.reportId,type:item.type}}));
    return item;
  }catch(err){
    console.error('[HISTÓRICO LOCAL] falha ao salvar',err);
    const msg='Não foi possível incluir este relatório no histórico local. Libere espaço de armazenamento do navegador e tente novamente.';
    try{window.tbmToast?.(msg,'err')}catch(_){ }
    return null;
  }
}

function formatDate(value){
  if(!value)return'—';
  const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
}

function renderHistory(){
  const list=document.getElementById('historyList');if(!list)return;
  const items=readHistory();
  list.innerHTML=items.length?items.map(item=>`<div class="historyItem" data-local-history-id="${esc(item.id)}"><div class="historyTop"><div><b>📄 ${esc(item.reportType)}</b><div class="mini">${esc(item.reportId||item.id)} • ${esc(formatDate(item.date))}</div><div class="mini">Salvo no dispositivo em ${esc(formatDate(item.savedAt))}</div></div><span class="pill">LOCAL</span></div><div class="actions no-print" style="margin-top:9px"><button type="button" class="btn primary" data-local-history-open="${esc(item.id)}">Abrir / Visualizar</button><button type="button" class="btn secondary" data-local-history-pdf="${esc(item.id)}">Gerar PDF</button><button type="button" class="btn danger" data-local-history-delete="${esc(item.id)}">Excluir</button></div></div>`).join(''):'<div class="notice info">Nenhum relatório salvo no histórico local ainda.</div>';
}

function showHistory(){
  renderHistory();
  try{if(typeof show==='function')show('history');else{['home','form','report'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));document.getElementById('history')?.classList.remove('hidden')}}catch(_){document.getElementById('history')?.classList.remove('hidden')}
}

function findItem(id){return readHistory().find(x=>String(x.id)===String(id))||null}

async function restoreItem(item,generatePdf=false){
  if(!item?.state)return false;
  const snapshot=clone(item.state);
  if(snapshot.type==='pt-altura'){
    if(typeof window.openPTAltura!=='function')throw new Error('Módulo de PT indisponível.');
    window.openPTAltura(snapshot);
    if(generatePdf)setTimeout(()=>window.makePTAlturaPdf?.('download'),120);
    return true;
  }
  try{state=snapshot}catch(_){window.state=snapshot}
  try{if(typeof renderForm==='function')renderForm();else window.renderForm?.()}catch(err){console.error('[HISTÓRICO LOCAL] renderização',err)}
  try{if(typeof show==='function')show('form');else document.getElementById('form')?.classList.remove('hidden')}catch(_){ }
  if(generatePdf)setTimeout(()=>window.makePdf?.('download'),150);
  return true;
}

function deleteItem(id){
  const next=readHistory().filter(x=>String(x.id)!==String(id));
  persistHistory(next);renderHistory();
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
        await navigator.share({title,text,files:[file]});
        resolve({shared:true,downloaded:false});
      }catch(err){
        if(err?.name==='AbortError'){resolve({shared:false,downloaded:false,cancelled:true});return}
        console.warn('[COMPARTILHAR PDF] fallback para download',err);
        alert('O compartilhamento direto não está disponível neste dispositivo. O PDF será baixado automaticamente para você compartilhar pelo aplicativo que preferir.');
        try{download();resolve({shared:false,downloaded:true})}catch(downloadErr){console.error('[COMPARTILHAR PDF] falha também no download',downloadErr);resolve({shared:false,downloaded:false,error:downloadErr})}
      }
    });
  });
}

function refreshHistoryIfOpen(){
  const history=document.getElementById('history');if(history&&!history.classList.contains('hidden'))renderHistory();
}

function installUi(){
  // O histórico local permanece ativo e o envio automático por e-mail volta a ser permitido ao salvar.
  try{localStorage.setItem(EMAIL_ENABLE_KEY,'1')}catch(_){ }
  const button=document.getElementById('openHistory');
  if(button){button.textContent='📚 Ver Histórico';button.onclick=e=>{e.preventDefault();showHistory()}}
  const back=document.getElementById('historyBack');
  if(back)back.onclick=e=>{e.preventDefault();try{if(typeof show==='function')show('home')}catch(_){document.getElementById('history')?.classList.add('hidden');document.getElementById('home')?.classList.remove('hidden')}};
  if(document.documentElement.dataset.tbmLocalHistoryEvents!=='1'){
    document.documentElement.dataset.tbmLocalHistoryEvents='1';
    document.addEventListener('click',async e=>{
      const open=e.target.closest?.('[data-local-history-open]');
      const pdf=e.target.closest?.('[data-local-history-pdf]');
      const del=e.target.closest?.('[data-local-history-delete]');
      const target=open||pdf||del;if(!target)return;
      e.preventDefault();e.stopPropagation();
      const id=open?.dataset.localHistoryOpen||pdf?.dataset.localHistoryPdf||del?.dataset.localHistoryDelete;
      if(del){if(confirm('Excluir este relatório do histórico local?'))deleteItem(id);return}
      const item=findItem(id);if(!item)return;
      try{await restoreItem(item,!!pdf)}catch(err){console.error('[HISTÓRICO LOCAL] abrir',err);alert('Não foi possível abrir este relatório salvo.')}
    },true);
  }
}

window.tbmHistoricoSalvar=saveHistory;
window.tbmHistoricoLer=()=>clone(readHistory());
window.tbmHistoricoAbrir=showHistory;
window.tbmHistoricoRestaurar=restoreItem;
window.tbmCompartilharPdf=sharePdf;
window.__tbmLocalHistoryVersion='2026.09.08.2-email-enabled';

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUi,{once:true});else installUi();
})();
