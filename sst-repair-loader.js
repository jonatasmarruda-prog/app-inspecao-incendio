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
})();
