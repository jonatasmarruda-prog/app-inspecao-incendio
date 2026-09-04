(()=>{
'use strict';

const VERSION='2026.09.04.global-pdf-preview.2-no-observer-loop';
const PREVIEW_IDS=['tbmGlobalPreview','ptView','trainingPreview','tbmReportPreview'];
const DOWNLOAD_IDS=['tbmGlobalDownload','ptPdf','trainingDownload','reportPdf'];
const SHARE_IDS=['pdf','ptShare','trainingShare','reportShare'];
let busy=false;
let actionRefreshTimer=null;

const $=id=>document.getElementById(id);
function visible(el){
  if(!el)return false;
  const cs=getComputedStyle(el);
  return !el.classList.contains('hidden')&&cs.display!=='none'&&cs.visibility!=='hidden';
}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function setAction(el,action){if(el&&el.dataset.tbmGlobalPdfAction!==action)el.dataset.tbmGlobalPdfAction=action}
function setClass(el,className){if(el&&el.className!==className)el.className=className}

function activeContext(){
  const pt=$('ptAlturaOverlay');
  if(visible(pt)&&typeof window.makePTAlturaPdf==='function'){
    return {
      name:'PT - Trabalho em Altura',
      save:()=>typeof window.savePTAltura==='function'?window.savePTAltura(false,false):true,
      generate:action=>window.makePTAlturaPdf(action)
    };
  }
  if(typeof window.makePdf==='function'){
    let x=null;try{x=typeof state!=='undefined'?state:window.state}catch(_){x=window.state}
    return {
      name:x?.title||x?.type||'Inspeção SST',
      save:()=>typeof window.saveInspection==='function'?window.saveInspection(true):true,
      generate:action=>window.makePdf(action)
    };
  }
  return null;
}

function toast(text,type='ok'){
  if(typeof window.tbmToast==='function'){window.tbmToast(text,type);return}
  let el=$('tbm-global-preview-toast');
  if(!el){
    el=document.createElement('div');el.id='tbm-global-preview-toast';
    Object.assign(el.style,{position:'fixed',left:'50%',bottom:'22px',transform:'translateX(-50%)',zIndex:'100000',maxWidth:'calc(100vw - 28px)',padding:'12px 16px',borderRadius:'12px',font:'700 13px Arial,sans-serif',boxShadow:'0 10px 30px #0004',textAlign:'center'});
    document.body.appendChild(el);
  }
  el.style.background=type==='err'?'#991b1b':type==='warn'?'#92400e':'#166534';
  el.style.color='#fff';
  if(el.textContent!==text)el.textContent=text;
  el.style.opacity='1';
  clearTimeout(el.__timer);el.__timer=setTimeout(()=>{el.style.opacity='0'},2800);
}
function setBusy(on){
  busy=on;
  [...PREVIEW_IDS,...DOWNLOAD_IDS,...SHARE_IDS].forEach(id=>{const b=$(id);if(b)b.disabled=on});
}
function fakePdfHandle(){
  return {
    download(){},open(){},print(){},
    getBlob(cb){if(typeof cb==='function')cb(new Blob([],{type:'application/pdf'}))},
    getBuffer(cb){if(typeof cb==='function')cb(new Uint8Array())},
    getBase64(cb){if(typeof cb==='function')cb('')},
    getDataUrl(cb){if(typeof cb==='function')cb('data:application/pdf;base64,')}
  };
}
function reservePreview(){
  try{
    const w=window.open('about:blank','_blank');
    if(w){
      w.document.open();
      w.document.write('<!doctype html><meta charset="utf-8"><title>Visualizando inspeção</title><body style="font-family:Arial,sans-serif;padding:28px;color:#17202b"><h3>Preparando PDF da inspeção...</h3><p>O documento será aberto nesta aba.</p></body>');
      w.document.close();
    }
    return w;
  }catch(_){return null}
}
function closePreview(w){try{if(w&&!w.closed)w.close()}catch(_){ }}

async function captureActiveDocDefinition(){
  const ctx=activeContext();
  if(!ctx)throw new Error('Nenhum módulo de inspeção ativo foi identificado.');
  if(!window.pdfMake||typeof window.pdfMake.createPdf!=='function')throw new Error('Biblioteca pdfmake indisponível.');
  try{await Promise.resolve(ctx.save?.())}catch(_){ }
  const pm=window.pdfMake;
  const originalCreatePdf=pm.createPdf;
  const previousBypass=window.__tbmPdfSummaryBypass;
  window.__tbmPdfSummaryBypass=true;
  return await new Promise((resolve,reject)=>{
    let done=false;let timer=null;
    const restore=()=>{
      if(pm.createPdf===intercept)pm.createPdf=originalCreatePdf;
      window.__tbmPdfSummaryBypass=previousBypass;
    };
    const finish=(fn,value)=>{
      if(done)return;done=true;clearTimeout(timer);restore();fn(value);
    };
    function intercept(docDefinition){
      finish(resolve,{docDefinition,createPdf:originalCreatePdf,pdfMake:pm,context:ctx});
      return fakePdfHandle();
    }
    pm.createPdf=intercept;
    timer=setTimeout(()=>finish(reject,new Error('Tempo esgotado ao montar o PDF para visualização.')),30000);
    try{
      Promise.resolve(ctx.generate('download')).then(()=>{
        if(!done)setTimeout(()=>{if(!done)finish(reject,new Error('O gerador ativo não produziu um docDefinition.'))},50);
      }).catch(err=>finish(reject,err));
    }catch(err){finish(reject,err)}
  });
}
function pdfBlob(captured){
  return new Promise((resolve,reject)=>{
    try{
      const pdf=captured.createPdf.call(captured.pdfMake,captured.docDefinition);
      if(!pdf||typeof pdf.getBlob!=='function')return reject(new Error('Não foi possível gerar o arquivo para visualização.'));
      let settled=false;
      const timer=setTimeout(()=>{if(!settled){settled=true;reject(new Error('Tempo esgotado ao gerar o preview.'))}},30000);
      pdf.getBlob(blob=>{
        if(settled)return;settled=true;clearTimeout(timer);
        if(blob)resolve(blob);else reject(new Error('PDF vazio ou inválido.'));
      });
    }catch(err){reject(err)}
  });
}
function openBlob(blob,preopened){
  const url=URL.createObjectURL(blob);
  const w=preopened&&!preopened.closed?preopened:window.open('about:blank','_blank');
  if(!w){URL.revokeObjectURL(url);return false}
  try{w.location.replace(url)}catch(_){w.location.href=url}
  setTimeout(()=>URL.revokeObjectURL(url),300000);
  return true;
}
async function previewActive(){
  if(busy)return;
  const tab=reservePreview();
  setBusy(true);toast('👁️ Preparando visualização do PDF...','ok');
  try{
    const captured=await captureActiveDocDefinition();
    const blob=await pdfBlob(captured);
    if(!openBlob(blob,tab)){closePreview(tab);throw new Error('O navegador bloqueou a nova aba. Permita pop-ups para visualizar o PDF.')}
    toast('✅ PDF aberto para visualização.','ok');
  }catch(err){
    closePreview(tab);console.error('[GLOBAL PDF PREVIEW]',err);toast('❌ '+(err?.message||'Não foi possível visualizar o PDF.'),'err');
  }finally{setBusy(false)}
}
async function runAction(action){
  if(busy)return;
  const ctx=activeContext();if(!ctx)return toast('❌ Nenhuma inspeção ativa.','err');
  setBusy(true);
  try{
    try{await Promise.resolve(ctx.save?.())}catch(_){ }
    await Promise.resolve(ctx.generate(action));
  }catch(err){console.error('[GLOBAL PDF ACTION]',err);toast('❌ '+(err?.message||'Falha ao gerar o PDF.'),'err')}
  finally{setBusy(false)}
}

function button(id,label,cls,action){
  const b=document.createElement('button');b.type='button';b.id=id;b.className='btn '+cls;b.textContent=label;b.dataset.tbmGlobalPdfAction=action;return b;
}
function normalizeGenericActions(){
  const save=$('save'),legacy=$('pdf');if(!save||!legacy)return;
  const card=save.closest('.card');if(!card)return;
  let row=card.querySelector(':scope > .actions');
  if(!row){
    row=document.createElement('div');row.className='actions';card.insertBefore(row,card.firstChild);row.appendChild(save);row.appendChild(legacy);
  }
  save.classList.remove('full');legacy.classList.remove('full');
  setText(save,'💾 Salvar');
  setText(legacy,'📲 Compartilhar');setClass(legacy,'btn blue');setAction(legacy,'share');
  let preview=$('tbmGlobalPreview');
  if(!preview){preview=button('tbmGlobalPreview','👁️ Visualizar Inspeção','secondary','preview');row.insertBefore(preview,legacy)}
  let download=$('tbmGlobalDownload');
  if(!download){download=button('tbmGlobalDownload','📥 Baixar PDF','primary','download');row.insertBefore(download,legacy)}
}
function normalizePTActions(){
  const row=document.querySelector('#ptAlturaBody .pt-actions');if(!row)return;
  const save=$('ptSave'),download=$('ptPdf'),share=$('ptShare');
  setText(save,'💾 Salvar');
  if(download){setText(download,'📥 Baixar PDF');setAction(download,'download')}
  if(share){setText(share,'📲 Compartilhar');setAction(share,'share')}
  let preview=$('ptView');
  if(!preview){preview=button('ptView','👁️ Visualizar Inspeção','secondary','preview');row.insertBefore(preview,download||share||null)}
  else{setText(preview,'👁️ Visualizar Inspeção');setAction(preview,'preview')}
}
function normalizeTrainingActions(){
  const row=$('trainingAttendanceActions')?.querySelector('.actions');if(!row)return;
  const map=[['trainingSave','💾 Salvar',null],['trainingPreview','👁️ Visualizar Inspeção','preview'],['trainingDownload','📥 Baixar PDF','download'],['trainingShare','📲 Compartilhar','share']];
  map.forEach(([id,label,action])=>{const b=$(id);if(!b)return;setText(b,label);if(action)setAction(b,action)});
}
function normalizeReportActions(){
  const row=document.querySelector('#report .actions');if(!row)return;
  const download=$('reportPdf'),share=$('reportShare');
  if(download){setText(download,'📥 Baixar PDF');setAction(download,'download')}
  if(share){setText(share,'📲 Compartilhar');setAction(share,'share')}
  let preview=$('tbmReportPreview');
  if(!preview){preview=button('tbmReportPreview','👁️ Visualizar Inspeção','secondary','preview');row.insertBefore(preview,download||share||null)}
}
function ensureActions(){
  try{normalizeGenericActions();normalizePTActions();normalizeTrainingActions();normalizeReportActions()}catch(err){console.warn('[GLOBAL PDF UI]',err)}
}
function queueEnsureActions(delay=0){
  clearTimeout(actionRefreshTimer);
  actionRefreshTimer=setTimeout(ensureActions,delay);
}
function captureClick(e){
  const b=e.target?.closest?.('[data-tbm-global-pdf-action]');if(!b)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  const action=b.dataset.tbmGlobalPdfAction;
  if(action==='preview')previewActive();else if(action==='download'||action==='share')runAction(action);
}
function install(){
  ensureActions();
  document.addEventListener('click',captureClick,true);
  document.addEventListener('click',()=>queueEnsureActions(0),false);
  window.addEventListener('sst-modules-loaded',()=>queueEnsureActions(0));
  window.addEventListener('tbm-nr24-ready',()=>queueEnsureActions(0));
  [250,700,1400,2500].forEach(ms=>setTimeout(ensureActions,ms));
  window.tbmRefreshGlobalPdfActions=ensureActions;
  window.tbmPreviewActiveInspection=previewActive;
  window.__tbmGlobalPdfPreviewVersion=VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
