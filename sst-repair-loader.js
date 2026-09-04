(()=>{'use strict';
async function repairSSTModule(){
  if(typeof window.openSSTModule==='function') return true;
  try{
    const res=await fetch('./sst-modulos.js?repair='+Date.now(),{cache:'no-store'});
    let src=await res.text();
    const bad=src.indexOf('<script id="tbm-cnpj-reports">');
    if(bad>=0) src=src.slice(0,bad).trim();
    const tail=src.lastIndexOf('</script>');
    if(tail>=0) src=src.slice(0,tail).trim();
    if(!src.includes('window.openSSTModule')) throw new Error('Código SST não encontrado');
    new Function(src)();
    return typeof window.openSSTModule==='function';
  }catch(e){console.error('Falha ao reparar módulos SST:',e);return false}
}
window.repairSSTModule=repairSSTModule;
window.addEventListener('sst-modules-loaded',()=>repairSSTModule());
repairSSTModule();
function loadFireChecklistSplit(){const old=document.getElementById('tbm-fire-checklist-split');if(old)old.remove();const s=document.createElement('script');s.id='tbm-fire-checklist-split';s.src='./fire-checklist-split.js?v=20260904-04&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadChecklistConditional(){if(document.getElementById('tbm-checklist-conditional'))return Promise.resolve();const s=document.createElement('script');s.id='tbm-checklist-conditional';s.src='./checklist-conditional.js?v=20260903-02';s.defer=true;document.head.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadPhotoMultiFix(){const old=document.getElementById('tbm-photo-multi-fix');if(old)old.remove();const s=document.createElement('script');s.id='tbm-photo-multi-fix';s.src='./photo-multi-fix.js?v=20260903-04&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadSaveButtonFix(){const old=document.getElementById('tbm-save-button-fix');if(old)old.remove();const s=document.createElement('script');s.id='tbm-save-button-fix';s.src='./save-button-fix.js?v=20260904-02&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadCloudCrossDevice(){const old=document.getElementById('tbm-cloud-cross-device');if(old)old.remove();const s=document.createElement('script');s.id='tbm-cloud-cross-device';s.src='./cloud-cross-device.js?v=20260904-05&cb='+Date.now();s.async=true;document.body.appendChild(s)}
function loadCnpjAutofill(){const old=document.getElementById('tbm-cnpj-autofill');if(old)old.remove();const s=document.createElement('script');s.id='tbm-cnpj-autofill';s.src='./cnpj-autofill.js?v=20260903-04&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadPTAltura(){const old=document.getElementById('tbm-pt-altura');if(old)old.remove();const s=document.createElement('script');s.id='tbm-pt-altura';s.src='./pt-altura.js?v=20260903-03&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadPTContrastFix(){const old=document.getElementById('tbm-pt-contrast-fix');if(old)old.remove();const s=document.createElement('script');s.id='tbm-pt-contrast-fix';s.src='./pt-contrast-fix.js?v=20260903-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadPTSharePreviewFix(){const old=document.getElementById('tbm-pt-share-preview-fix');if(old)old.remove();const s=document.createElement('script');s.id='tbm-pt-share-preview-fix';s.src='./pt-share-preview-fix.js?v=20260904-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadGlobalPdfPreview(){const old=document.getElementById('tbm-global-pdf-preview');if(old)old.remove();const s=document.createElement('script');s.id='tbm-global-pdf-preview';s.src='./global-pdf-preview.js?v=20260904-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadPdfPhotoFitFix(){if(document.getElementById('tbm-pdf-photo-fit-fix'))return Promise.resolve();const s=document.createElement('script');s.id='tbm-pdf-photo-fit-fix';s.src='./pdf-photo-fit-fix.js?v=20260903-01';s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadAbntMaster(){const old=document.getElementById('tbm-abnt-master');if(old)old.remove();return new Promise(resolve=>{const s=document.createElement('script');s.id='tbm-abnt-master';s.src='./abnt-master.js?v=20260903-36';s.async=false;document.body.appendChild(s);s.onload=resolve;s.onerror=resolve})}
function loadFinalPdfFix(){const old=document.getElementById('tbm-final-pdf-fix');if(old)old.remove();return new Promise(resolve=>{const s=document.createElement('script');s.id='tbm-final-pdf-fix';s.src='./pdf-final-fix.js?v=20260903-02&cb='+Date.now();s.async=false;document.body.appendChild(s);s.onload=resolve;s.onerror=resolve})}
function loadEquipmentVerticalFix(){const old=document.getElementById('tbm-pdf-equipment-vertical-fix');if(old)old.remove();const s=document.createElement('script');s.id='tbm-pdf-equipment-vertical-fix';s.src='./pdf-equipment-vertical-fix.js?v=20260903-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadGlobalPdfStandard(){const old=document.getElementById('tbm-pdf-global-standard');if(old)old.remove();const s=document.createElement('script');s.id='tbm-pdf-global-standard';s.src='./pdf-global-standard.js?v=20260903-02&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadPdfFilenameGlobal(){const old=document.getElementById('tbm-pdf-filename-global');if(old)old.remove();const s=document.createElement('script');s.id='tbm-pdf-filename-global';s.src='./pdf-filename-global.js?v=20260903-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadAutoEmailReport(){const old=document.getElementById('tbm-email-relatorio-auto');if(old)old.remove();const s=document.createElement('script');s.id='tbm-email-relatorio-auto';s.src='./email-relatorio-auto.js?v=20260904-07&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadPremiumUX(){const old=document.getElementById('tbm-premium-ux');if(old)old.remove();const s=document.createElement('script');s.id='tbm-premium-ux';s.src='./premium-ux.js?v=20260904-04&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadMobilePerformanceFix(){const old=document.getElementById('tbm-mobile-performance-fix');if(old)old.remove();const s=document.createElement('script');s.id='tbm-mobile-performance-fix';s.src='./mobile-performance-fix.js?v=20260903-04&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadHistoryLightFix(){const old=document.getElementById('tbm-history-light-fix');if(old)old.remove();const s=document.createElement('script');s.id='tbm-history-light-fix';s.src='./history-light-fix.js?v=20260904-04&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadMobileInteractionFix(){const old=document.getElementById('tbm-mobile-interaction-fix');if(old)old.remove();const s=document.createElement('script');s.id='tbm-mobile-interaction-fix';s.src='./mobile-interaction-fix.js?v=20260904-02&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadNR24Module(){const old=document.getElementById('tbm-nr24-module');if(old)old.remove();const s=document.createElement('script');s.id='tbm-nr24-module';s.src='./nr24-module.js?v=20260904-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadTrainingAttendanceModule(){const old=document.getElementById('tbm-training-attendance-module');if(old)old.remove();const s=document.createElement('script');s.id='tbm-training-attendance-module';s.src='./training-attendance-module.js?v=20260904-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadTrainingAttendanceRefinement(){const old=document.getElementById('tbm-training-attendance-refinement');if(old)old.remove();const s=document.createElement('script');s.id='tbm-training-attendance-refinement';s.src='./training-attendance-refinement.js?v=20260904-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadSolidStatusBadges(){const old=document.getElementById('tbm-solid-status-badges');if(old)old.remove();const s=document.createElement('script');s.id='tbm-solid-status-badges';s.src='./solid-status-badges.js?v=20260904-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadAccidentInjuryModule(){const old=document.getElementById('tbm-accident-injury-module');if(old)old.remove();const s=document.createElement('script');s.id='tbm-accident-injury-module';s.src='./accident-injury-module.js?v=20260904-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
function loadAccidentDiagnosisConditional(){const old=document.getElementById('tbm-accident-diagnosis-conditional');if(old)old.remove();const s=document.createElement('script');s.id='tbm-accident-diagnosis-conditional';s.src='./accident-diagnosis-conditional.js?v=20260904-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}
async function loadRepairs(){
  await loadFireChecklistSplit();
  await loadChecklistConditional();
  await loadPhotoMultiFix();
  await loadSaveButtonFix();
  await loadCnpjAutofill();
  await loadPTAltura();
  await loadPTContrastFix();
  await loadPdfPhotoFitFix();
  await loadAbntMaster();
  await loadFinalPdfFix();
  // O padrão global já aplica o layout vertical de equipamentos; não carregar uma segunda camada duplicada.
  await loadGlobalPdfStandard();
  await loadPdfFilenameGlobal();
  await loadAutoEmailReport();
  // Proteções de memória/histórico precisam existir ANTES do Premium UX para impedir fallback ao idbAll no celular.
  await loadMobilePerformanceFix();
  await loadHistoryLightFix();
  // Remove observação pesada de classes e evita recriação dupla das assinaturas no celular.
  await loadMobileInteractionFix();
  await loadPremiumUX();
  try{window.tbmRestoreMobileMutationObserver?.()}catch(_){ }
  // Premium UX envolve makePdf; reaplica a camada móvel por fora para o botão PDF responder direto no celular.
  try{window.tbmInstallMobilePdfPerformance?.()}catch(_){ }
  // Preview PDF agora é uma ação global e intercepta o gerador ativo de qualquer módulo.
  await loadGlobalPdfPreview();
  // NR 24 entra por último para interceptar somente o tipo nr24 sem alterar PDFs/formulários existentes.
  await loadNR24Module();
  // Lista de presença é carregada como módulo isolado após os demais, sem reescrever fluxos existentes.
  await loadTrainingAttendanceModule();
  // Refinamento exclusivo da Lista de Presença: instrutor dinâmico, fotos opcionais e ações próprias.
  await loadTrainingAttendanceRefinement();
  // Camada visual final: pinta status na UI e em qualquer tabela pdfmake sem alterar grid ou lógica.
  await loadSolidStatusBadges();
  // Detalhamento avançado de lesão da Investigação de Acidente, isolado dos demais módulos.
  await loadAccidentInjuryModule();
  // Remove o diagnóstico global apenas da Investigação de Acidente, na UI e no PDF.
  await loadAccidentDiagnosisConditional();
  setTimeout(loadCloudCrossDevice,0);
}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',loadRepairs,{once:true});else loadRepairs();
})();
