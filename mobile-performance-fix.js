(()=>{
'use strict';
const FLAG='__tbmMobilePdfPerformanceV5Cloud';
function isMobile(){try{return matchMedia('(max-width: 900px)').matches||matchMedia('(pointer: coarse)').matches||/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')}catch(_){return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')}}
function canSharePdfFiles(){if(typeof navigator.share!=='function')return false;if(typeof navigator.canShare!=='function')return true;try{const blob=new Blob(['PDF'],{type:'application/pdf'});const file=new File([blob],'teste.pdf',{type:'application/pdf'});return !!navigator.canShare({files:[file]})}catch(_){return false}}
function installPdf(){
  if(!isMobile())return true;if(typeof window.makePdf!=='function')return false;if(window.makePdf[FLAG])return true;
  const current=window.makePdf;
  const wrapped=function(action='download',...rest){
    let nextAction=action;if(nextAction===true)nextAction='share';if(nextAction===false)nextAction='download';if(nextAction==='share'&&!canSharePdfFiles())nextAction='download';
    const previousBypass=window.__tbmPdfSummaryBypass;window.__tbmPdfSummaryBypass=true;
    try{const result=current.call(this,nextAction,...rest);if(result&&typeof result.then==='function')return result.finally(()=>{window.__tbmPdfSummaryBypass=previousBypass});window.__tbmPdfSummaryBypass=previousBypass;return result}catch(e){window.__tbmPdfSummaryBypass=previousBypass;throw e}
  };
  wrapped[FLAG]=true;wrapped.__tbmOriginal=current;window.makePdf=wrapped;return true;
}
function install(){return installPdf()}
if(!install()){let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>=30)clearInterval(timer)},200)}
window.tbmInstallMobilePdfPerformance=install;
window.tbmImportLegacyHistory=()=>false;
window.tbmReadLightHistoryIndex=()=>[];
window.__tbmMobilePerformanceVersion='2026.09.08.5-cloud-only';
})();
