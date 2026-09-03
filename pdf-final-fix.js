(()=>{
'use strict';

/*
  Ponte final e autoritativa do PDF.
  O html2pdf/html2canvas foi aposentado definitivamente.
  Este arquivo existe apenas para garantir que qualquer carregador legado
  termine apontando para o gerador oficial baseado em pdfmake.
*/

const LAYOUT_SRC='./pdf-layout-fix.js?v=20260903-05';
let loading=null;

function loadPdfMakeLayout(){
  if(window.__tbmPdfMakeLayoutReady && typeof window.makePdf==='function') return Promise.resolve();
  if(loading) return loading;
  loading=new Promise(resolve=>{
    const old=document.querySelector('script[data-tbm-pdfmake-authoritative]');
    if(old) old.remove();
    const s=document.createElement('script');
    s.src=LAYOUT_SRC;
    s.async=false;
    s.dataset.tbmPdfmakeAuthoritative='1';
    s.onload=()=>{window.__tbmPdfMakeLayoutReady=true;bindButtons();resolve()};
    s.onerror=()=>{console.error('[PDFMAKE] Falha ao carregar pdf-layout-fix.js');resolve()};
    document.body.appendChild(s);
  });
  return loading;
}

function callPdf(action){
  return loadPdfMakeLayout().then(()=>{
    if(typeof window.makePdf!=='function') throw new Error('Gerador pdfmake indisponível.');
    return window.makePdf(action);
  }).catch(e=>{
    console.error('[PDFMAKE FINAL]',e);
    alert('Não foi possível gerar o PDF: '+(e?.message||e));
  });
}

function bindButtons(){
  const pdf=document.getElementById('pdf');
  const reportPdf=document.getElementById('reportPdf');
  const reportShare=document.getElementById('reportShare');

  if(pdf&&!pdf.dataset.tbmPdfmakeFinal){
    pdf.dataset.tbmPdfmakeFinal='1';
    pdf.type='button';
    pdf.textContent='📄 GERAR E COMPARTILHAR PDF';
    pdf.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();callPdf('share')},true);
  }
  if(reportPdf&&!reportPdf.dataset.tbmPdfmakeFinal){
    reportPdf.dataset.tbmPdfmakeFinal='1';
    reportPdf.type='button';
    reportPdf.textContent='📥 Baixar PDF';
    reportPdf.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();callPdf('download')},true);
  }
  if(reportShare&&!reportShare.dataset.tbmPdfmakeFinal){
    reportShare.dataset.tbmPdfmakeFinal='1';
    reportShare.type='button';
    reportShare.textContent='📲 Compartilhar PDF';
    reportShare.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();callPdf('share')},true);
  }
}

window.makePdfFinal=action=>callPdf(action===false?'download':'share');
window.gerarPDF=()=>callPdf('download');
window.gerarPDFMaster=()=>callPdf('download');
window.compartilharPDF=()=>callPdf('share');
window.gerarRelatorioPDF=()=>callPdf('download');

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>{loadPdfMakeLayout();bindButtons()},{once:true});
}else{
  loadPdfMakeLayout();bindButtons();
}
[400,1000,2000].forEach(t=>setTimeout(bindButtons,t));
})();