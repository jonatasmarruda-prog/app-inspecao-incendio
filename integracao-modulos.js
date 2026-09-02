/* Integração robusta dos módulos SST
   Carrega cada módulo de forma independente e exibe erro amigável sem bloquear o aplicativo principal. */
(function(){
  'use strict';
  const BASE = './';
  const modules = [
    {name:'sst-modulos.js', global:'SSTModulos'},
    {name:'abnt-relatorio.js', global:'ABNTRelatorio'},
    {name:'compartilhar-relatorio.js', global:'CompartilharRelatorio'},
    {name:'editar-relatorio.js', global:'EditarRelatorio'}
  ];
  function load(src){
    return new Promise((resolve,reject)=>{
      const old=document.querySelector('script[data-sst-src="'+src+'"]');
      if(old){ resolve(); return; }
      const s=document.createElement('script');
      s.src=BASE+src+'?v=20260902'; s.async=false; s.dataset.sstSrc=src;
      s.onload=resolve; s.onerror=()=>reject(new Error('Não foi possível carregar '+src));
      document.head.appendChild(s);
    });
  }
  window.SSTAppModules = window.SSTAppModules || {};
  window.SSTAppModules.ready = modules.reduce((p,m)=>p.then(()=>load(m.name).then(()=>{
    window.SSTAppModules[m.global]=true;
  })), Promise.resolve()).catch(err=>{
    console.error(err);
    window.SSTAppModules.error=err;
  });
})();
