(()=>{
'use strict';

const FLAG='__tbmMobilePdfPerformanceV1';

function isMobile(){
  try{
    return matchMedia('(max-width: 900px)').matches||
      matchMedia('(pointer: coarse)').matches||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
  }catch(_){return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')}
}

function canSharePdfFiles(){
  if(typeof navigator.share!=='function')return false;
  if(typeof navigator.canShare!=='function')return true;
  try{
    const blob=new Blob(['PDF'],{type:'application/pdf'});
    const file=new File([blob],'teste.pdf',{type:'application/pdf'});
    return !!navigator.canShare({files:[file]});
  }catch(_){return false}
}

function install(){
  if(!isMobile())return true;
  if(typeof window.makePdf!=='function')return false;
  if(window.makePdf[FLAG])return true;

  const current=window.makePdf;
  const wrapped=function(action='download',...rest){
    let nextAction=action;
    if(nextAction===true)nextAction='share';
    if(nextAction===false)nextAction='download';

    // Se o celular não compartilha arquivos PDF, baixa diretamente.
    // Evita gerar Blob e depois gerar o mesmo PDF novamente no fallback.
    if(nextAction==='share'&&!canSharePdfFiles())nextAction='download';

    // O resumo Premium original clonava o state inteiro com JSON.stringify,
    // incluindo todas as fotos Base64. Em celular isso podia duplicar dezenas
    // de MB de memória antes mesmo do pdfmake iniciar. O bypass vale somente
    // durante a chamada móvel e não altera o conteúdo/layout do relatório.
    const previousBypass=window.__tbmPdfSummaryBypass;
    window.__tbmPdfSummaryBypass=true;

    try{
      const result=current.call(this,nextAction,...rest);
      if(result&&typeof result.then==='function'){
        return result.finally(()=>{window.__tbmPdfSummaryBypass=previousBypass});
      }
      window.__tbmPdfSummaryBypass=previousBypass;
      return result;
    }catch(e){
      window.__tbmPdfSummaryBypass=previousBypass;
      throw e;
    }
  };
  wrapped[FLAG]=true;
  wrapped.__tbmOriginal=current;
  window.makePdf=wrapped;
  return true;
}

if(!install()){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>=30)clearInterval(timer);
  },200);
}

window.tbmInstallMobilePdfPerformance=install;
})();