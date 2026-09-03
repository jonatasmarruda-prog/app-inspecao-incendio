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
    if(!checklist)return;

    const card=checklist.closest('.card');
    if(!card)return;

    const equipment=Array.isArray(window.state?.equipment)
      ? window.state.equipment
      : [];

    const hasExtOrHyd=equipment.some(e=>e && (e.kind==='ext' || e.kind==='hid'));
    const fireForm=document.getElementById('equipmentCard') &&
      !document.getElementById('equipmentCard').classList.contains('hidden');

    card.classList.toggle('hidden', !(fireForm && hasExtOrHyd));
  }

  function install(){
    updateGeneralChecklistVisibility();

    // Observa alterações no DOM para acompanhar adição/exclusão de equipamentos.
    if(window.__tbmChecklistObserver)return;
    window.__tbmChecklistObserver=new MutationObserver(()=>updateGeneralChecklistVisibility());
    window.__tbmChecklistObserver.observe(document.getElementById('equipmentList') || document.body,{childList:true,subtree:true});

    // Reavalia mudanças de tipo/estado e abertura de formulários.
    document.addEventListener('click',()=>setTimeout(updateGeneralChecklistVisibility,0),true);
    document.addEventListener('change',()=>setTimeout(updateGeneralChecklistVisibility,0),true);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }

  window.tbmUpdateGeneralChecklistVisibility=updateGeneralChecklistVisibility;
})();
