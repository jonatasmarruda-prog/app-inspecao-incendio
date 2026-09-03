(()=>{
'use strict';

async function generatePDF(action='download'){
  if(!window.pdfMake)throw new Error('Biblioteca pdfmake não carregada no HTML.');
  if(typeof window.makePdf!=='function')throw new Error('Gerador pdfmake indisponível.');
  return window.makePdf(action);
}

function bindButtons(){
  const btn=document.getElementById('print');
  if(btn&&!btn.dataset.pdfmakeMaster){
    btn.dataset.pdfmakeMaster='1';
    btn.type='button';
    btn.onclick=e=>{e.preventDefault();generatePDF('download')};
  }
}

window.SSTMasterFix=window.SSTMasterFix||{};
window.SSTMasterFix.generatePDF=generatePDF;
window.SSTMasterFix.isCloudReady=window.SSTMasterFix.isCloudReady||(()=>Boolean(window.SST?.fs));
window.generatePDF=generatePDF;

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindButtons,{once:true});else bindButtons();
})();
