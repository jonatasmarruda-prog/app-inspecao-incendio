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
function loadChecklistConditional(){
  if(document.getElementById('tbm-checklist-conditional'))return Promise.resolve();
  const s=document.createElement('script');s.id='tbm-checklist-conditional';s.src='./checklist-conditional.js?v=20260903-01';s.defer=true;document.head.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve});
}
function loadPhotoMultiFix(){
  const old=document.getElementById('tbm-photo-multi-fix');
  if(old)old.remove();
  const s=document.createElement('script');s.id='tbm-photo-multi-fix';s.src='./photo-multi-fix.js?v=20260903-02&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve});
}
function loadSaveButtonFix(){
  const old=document.getElementById('tbm-save-button-fix');
  if(old)old.remove();
  const s=document.createElement('script');s.id='tbm-save-button-fix';s.src='./save-button-fix.js?v=20260903-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve});
}
function loadPdfPhotoFitFix(){
  if(document.getElementById('tbm-pdf-photo-fit-fix'))return Promise.resolve();
  const s=document.createElement('script');s.id='tbm-pdf-photo-fit-fix';s.src='./pdf-photo-fit-fix.js?v=20260903-01';s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve});
}
function loadAbntMaster(){
  const old=document.getElementById('tbm-abnt-master');
  if(old)old.remove();
  return new Promise(resolve=>{const s=document.createElement('script');s.id='tbm-abnt-master';s.src='./abnt-master.js?v=20260903-36';s.async=false;document.body.appendChild(s);s.onload=resolve;s.onerror=resolve});
}
function loadFinalPdfFix(){
  const old=document.getElementById('tbm-final-pdf-fix');
  if(old)old.remove();
  return new Promise(resolve=>{const s=document.createElement('script');s.id='tbm-final-pdf-fix';s.src='./pdf-final-fix.js?v=20260903-02';s.async=false;document.body.appendChild(s);s.onload=resolve;s.onerror=resolve});
}
async function loadRepairs(){await loadChecklistConditional();await loadPhotoMultiFix();await loadSaveButtonFix();await loadPdfPhotoFitFix();await loadAbntMaster();await loadFinalPdfFix()}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',loadRepairs,{once:true});else loadRepairs();
})();