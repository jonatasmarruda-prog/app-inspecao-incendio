(()=>{
'use strict';

function run(action){
  if(!window.pdfMake)throw new Error('Biblioteca pdfmake não carregada no HTML.');
  if(typeof window.makePdf!=='function')throw new Error('Gerador pdfmake indisponível.');
  return window.makePdf(action);
}

async function share(){return run('share')}
async function download(){return run('download')}

window.CompartilharRelatorio={sharePDF:share,generatePDF:download,downloadPDF:download};
window.tbmGerarPDF=share;
window.tbmDownloadPDF=download;
window.compartilharPDF=share;
window.gerarPDFMaster=download;
window.exportarPDFMaster=download;
window.gerarRelatorioPDF=download;

function bind(){
  const shareBtn=document.getElementById('reportShare');
  const downloadBtn=document.getElementById('reportPdf');
  if(shareBtn){shareBtn.type='button';shareBtn.textContent='📲 Compartilhar PDF';shareBtn.onclick=e=>{e.preventDefault();share()}}
  if(downloadBtn){downloadBtn.type='button';downloadBtn.textContent='📥 Baixar PDF';downloadBtn.onclick=e=>{e.preventDefault();download()}}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
