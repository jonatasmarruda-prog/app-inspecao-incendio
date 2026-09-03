(()=>{
'use strict';

function run(action='download'){
  if(!window.pdfMake)throw new Error('Biblioteca pdfmake não carregada no HTML.');
  if(typeof window.makePdf!=='function')throw new Error('Gerador pdfmake indisponível.');
  return window.makePdf(action);
}

window.__tbmUnifiedPdfReady=true;
window.reportMasterPdf=run;
window.gerarPDFMaster=action=>run(action||'download');
window.exportarPDFMaster=action=>run(action||'download');
window.gerarRelatorioPDF=action=>run(action||'download');
})();
