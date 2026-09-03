(()=>{
  'use strict';

  /*
    Correção isolada: o checklist geral da inspeção de incêndio só aparece
    quando existir Extintor ou Hidrante. Iluminação e Sirene/Alarme já
    possuem seus próprios checklists dentro dos respectivos cards.
    Não altera GPS, fotos, assinaturas, Firebase ou a estrutura existente.
  */
  function updateGeneralChecklistVisibility(){
    const checklist=document.getElementById('checklist');
    const equipmentCard=document.getElementById('equipmentCard');
    const list=document.getElementById('equipmentList');
    if(!checklist || !equipmentCard || !list)return;

    const card=checklist.closest('.card');
    if(!card)return;

    const fireForm=!equipmentCard.classList.contains('hidden');

    // premium-extra = Iluminação/Sirene. Os demais cards são Extintor/Hidrante.
    const hasExtOrHyd=[...list.children].some(el=>!el.classList.contains('premium-extra'));

    card.classList.toggle('hidden',!(fireForm && hasExtOrHyd));
  }

  function install(){
    updateGeneralChecklistVisibility();

    if(window.__tbmChecklistObserver)return;
    const list=document.getElementById('equipmentList');
    if(!list)return;

    window.__tbmChecklistObserver=new MutationObserver(()=>updateGeneralChecklistVisibility());
    window.__tbmChecklistObserver.observe(list,{childList:true,subtree:true});

    // O próprio MutationObserver do equipmentList atualiza a visibilidade somente quando necessário.
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }

  window.tbmUpdateGeneralChecklistVisibility=updateGeneralChecklistVisibility;
})();
