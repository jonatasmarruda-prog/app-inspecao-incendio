(function(){
  'use strict';
  function ready(){
    var title=document.querySelector('.brand b');
    if(title) title.textContent='SISTEMA DE INSPEÇÃO SST';
    var sub=document.querySelector('.brand span');
    if(sub) sub.textContent='TBM Têxtil • Controle Profissional';
    var badge=document.querySelector('.badge');
    if(badge) badge.textContent='SISTEMA PROFISSIONAL DE INSPEÇÃO';
    var status=document.getElementById('cloudState');
    if(status){
      var observer=new MutationObserver(function(){
        if(/Nuvem ativa/i.test(status.textContent)) status.innerHTML='● Online';
        else if(/Local/i.test(status.textContent)) status.innerHTML='● Local';
      });
      observer.observe(status,{childList:true,subtree:true,characterData:true});
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready); else ready();
})();
