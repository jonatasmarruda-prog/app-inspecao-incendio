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
  if(document.getElementById('tbm-checklist-conditional'))return;
  const s=document.createElement('script');
  s.id='tbm-checklist-conditional';
  s.src='./checklist-conditional.js?v=20260903-01';
  s.defer=true;
  document.head.appendChild(s);
}
function loadAbntMaster(){
  if(document.getElementById('tbm-abnt-master'))return;
  const s=document.createElement('script');
  s.id='tbm-abnt-master';
  s.src='./abnt-master.js?v=20260903-32';
  s.defer=false;
  document.body.appendChild(s);
}
if(document.readyState==='loading'){
  window.addEventListener('DOMContentLoaded',()=>{loadChecklistConditional();loadAbntMaster()},{once:true});
}else{
  loadChecklistConditional();
  loadAbntMaster();
}
})();
