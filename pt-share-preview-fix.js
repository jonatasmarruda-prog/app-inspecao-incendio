(()=>{
'use strict';

const VERSION='2026.09.04.pt-share-preview.1';
let busy=false;
let shareDialog=null;

function $(id){return document.getElementById(id)}
function showMsg(text,type='successbox'){
  const m=$('ptMsg');
  if(!m)return;
  m.className='notice '+type;
  m.textContent=text;
  setTimeout(()=>{if(m.textContent===text)m.textContent=''},3500);
}
function setBusy(on,label='⏳ Preparando PDF...'){
  busy=on;
  ['ptPdf','ptView','ptShare'].forEach(id=>{const b=$(id);if(b)b.disabled=on});
  if(on)showMsg(label,'info');
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
async function capturePTDoc(){
  if(typeof window.makePTAlturaPdf!=='function')throw new Error('Gerador da PT não carregado.');
  if(!window.pdfMake||typeof window.pdfMake.createPdf!=='function')throw new Error('Biblioteca PDF indisponível.');
  try{await window.savePTAltura?.(false,false)}catch(_){ }
  const pm=window.pdfMake;
  const previousCreatePdf=pm.createPdf;
  return await new Promise((resolve,reject)=>{
    let done=false;
    let timer=null;
    const restore=()=>{if(pm.createPdf===intercept)pm.createPdf=previousCreatePdf};
    const finish=(fn,value)=>{
      if(done)return;
      done=true;
      clearTimeout(timer);
      restore();
      fn(value);
    };
    function intercept(docDefinition){
      finish(resolve,{docDefinition,createPdf:previousCreatePdf,pm});
      return fakePdfHandle();
    }
    pm.createPdf=intercept;
    timer=setTimeout(()=>finish(reject,new Error('Tempo esgotado ao preparar o PDF da PT.')),30000);
    try{
      Promise.resolve(window.makePTAlturaPdf('download')).catch(err=>finish(reject,err));
    }catch(err){finish(reject,err)}
  });
}
function blobFromDoc(captured){
  return new Promise((resolve,reject)=>{
    try{
      const pdf=captured.createPdf.call(captured.pm,captured.docDefinition);
      if(!pdf||typeof pdf.getBlob!=='function')return reject(new Error('Não foi possível gerar o arquivo PDF.'));
      let settled=false;
      const timer=setTimeout(()=>{if(!settled){settled=true;reject(new Error('Tempo esgotado ao gerar o arquivo PDF.'))}},30000);
      pdf.getBlob(blob=>{
        if(settled)return;
        settled=true;clearTimeout(timer);
        if(blob&&blob.size>=0)resolve(blob);else reject(new Error('PDF vazio ou inválido.'));
      });
    }catch(err){reject(err)}
  });
}
function findPTId(node,depth=0){
  if(depth>10||node==null)return '';
  if(typeof node==='string'){
    const m=node.match(/(?:Nº\s*)?(PT-[A-Z0-9-]+)/i);
    return m?m[1].toUpperCase():'';
  }
  if(Array.isArray(node)){
    for(const x of node){const id=findPTId(x,depth+1);if(id)return id}
    return '';
  }
  if(typeof node==='object'){
    if(typeof node.text==='string'){const id=findPTId(node.text,depth+1);if(id)return id}
    for(const k of ['stack','table','body','content']){if(node[k]){const id=findPTId(node[k],depth+1);if(id)return id}}
  }
  return '';
}
function filenameFor(doc){
  const id=findPTId(doc)||('PT-'+Date.now().toString(36).toUpperCase());
  return `PT_Trabalho_Altura_${id}.pdf`;
}
function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;a.style.display='none';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function openBlob(blob,preopened){
  const url=URL.createObjectURL(blob);
  const w=preopened&&!preopened.closed?preopened:window.open('about:blank','_blank');
  if(w){w.location.replace(url);setTimeout(()=>URL.revokeObjectURL(url),300000);return true}
  URL.revokeObjectURL(url);return false;
}
function reservePreview(){
  try{
    const w=window.open('about:blank','_blank');
    if(w){
      w.document.open();
      w.document.write('<!doctype html><meta charset="utf-8"><title>Preparando PT</title><body style="font-family:Arial,sans-serif;padding:28px;color:#17202b"><h3>Preparando PDF da PT...</h3><p>Aguarde alguns segundos.</p></body>');
      w.document.close();
    }
    return w;
  }catch(_){return null}
}
function closeDialog(){
  if(shareDialog){shareDialog.remove();shareDialog=null}
}
function addDialogButton(row,label,handler,primary=false){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.style.cssText=`border:0;border-radius:10px;padding:11px 14px;font-weight:800;cursor:pointer;${primary?'background:#0f766e;color:#fff':'background:#e2e8f0;color:#17202b'}`;
  b.onclick=handler;row.appendChild(b);return b;
}
function canNativeShare(file){
  try{return !!(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))}catch(_){return false}
}
function showShareDialog(blob,filename){
  closeDialog();
  const file=new File([blob],filename,{type:'application/pdf'});
  const native=canNativeShare(file);
  const overlay=document.createElement('div');shareDialog=overlay;
  overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:#0008;display:flex;align-items:center;justify-content:center;padding:18px';
  const box=document.createElement('div');box.style.cssText='max-width:520px;width:100%;background:#fff;color:#17202b;border-radius:16px;padding:20px;box-shadow:0 20px 60px #0005;font-family:Arial,sans-serif';
  const title=document.createElement('div');title.textContent='📄 PDF da PT pronto';title.style.cssText='font-size:19px;font-weight:900;margin-bottom:8px';box.appendChild(title);
  const info=document.createElement('div');info.textContent=native?'Clique em “Compartilhar agora” para abrir as opções de compartilhamento do aparelho.':'Este navegador não permite anexar PDF diretamente pelo compartilhamento nativo. O documento está pronto: visualize ou baixe para anexar no WhatsApp, e-mail ou outro sistema.';info.style.cssText='font-size:13px;line-height:1.45;margin-bottom:16px;color:#475569';box.appendChild(info);
  const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:9px';box.appendChild(row);
  if(native)addDialogButton(row,'📤 Compartilhar agora',async()=>{
    try{await navigator.share({title:'PT - Trabalho em Altura',text:'Permissão de Trabalho em Altura',files:[file]});closeDialog();showMsg('✅ Documento compartilhado.')}catch(err){if(err?.name!=='AbortError')showMsg('❌ O compartilhamento foi bloqueado pelo navegador.','errorbox')}
  },true);
  addDialogButton(row,'👁️ Visualizar PDF',()=>{if(!openBlob(blob,null))showMsg('⚠️ Permita pop-ups para visualizar o PDF.','errorbox')});
  addDialogButton(row,'📥 Baixar PDF',()=>{downloadBlob(blob,filename);showMsg('✅ PDF baixado.')});
  addDialogButton(row,'Fechar',closeDialog);
  overlay.onclick=e=>{if(e.target===overlay)closeDialog()};
  overlay.appendChild(box);document.body.appendChild(overlay);
}
async function preparePdf(){
  const captured=await capturePTDoc();
  const blob=await blobFromDoc(captured);
  return {blob,filename:filenameFor(captured.docDefinition)};
}
async function handleDownload(){
  if(busy)return;
  setBusy(true,'⏳ Gerando PDF para download...');
  try{const {blob,filename}=await preparePdf();downloadBlob(blob,filename);showMsg('✅ PDF da PT baixado.')}catch(err){console.error('[PT PDF DOWNLOAD]',err);showMsg('❌ Não foi possível gerar o PDF da PT.','errorbox')}finally{setBusy(false)}
}
async function handleView(){
  if(busy)return;
  const preview=reservePreview();
  setBusy(true,'⏳ Preparando visualização do PDF...');
  try{
    const {blob}=await preparePdf();
    if(openBlob(blob,preview))showMsg('✅ PDF aberto para visualização.');
    else{preview?.close?.();showMsg('⚠️ O navegador bloqueou a nova aba. Permita pop-ups e tente novamente.','errorbox')}
  }catch(err){preview?.close?.();console.error('[PT PDF VIEW]',err);showMsg('❌ Não foi possível visualizar o PDF da PT.','errorbox')}finally{setBusy(false)}
}
async function handleShare(){
  if(busy)return;
  setBusy(true,'⏳ Preparando documento para compartilhar...');
  try{const {blob,filename}=await preparePdf();showShareDialog(blob,filename);showMsg('✅ Documento pronto para compartilhar.')}catch(err){console.error('[PT PDF SHARE]',err);showMsg('❌ Não foi possível preparar o documento para compartilhamento.','errorbox')}finally{setBusy(false)}
}
function installViewButton(){
  const actions=document.querySelector('#ptAlturaBody .pt-actions');
  if(!actions||$('ptView'))return;
  const b=document.createElement('button');b.type='button';b.id='ptView';b.className='btn secondary';b.textContent='👁️ Visualizar PDF';
  const share=$('ptShare');actions.insertBefore(b,share||null);
}
function captureClicks(e){
  const t=e.target?.closest?.('#ptPdf,#ptView,#ptShare');if(!t)return;
  if(!document.getElementById('ptAlturaOverlay')||document.getElementById('ptAlturaOverlay').classList.contains('hidden'))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(t.id==='ptPdf')handleDownload();
  else if(t.id==='ptView')handleView();
  else handleShare();
}
function install(){
  installViewButton();
  document.addEventListener('click',captureClicks,true);
  const mo=new MutationObserver(()=>installViewButton());
  mo.observe(document.body,{childList:true,subtree:true});
  window.__tbmPTSharePreviewObserver=mo;
}
window.__tbmPTSharePreviewVersion=VERSION;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
