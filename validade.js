// Correção de validade anual da carga dos extintores
(function(){
  function atualizar(equipamento, elemento){
    if(!equipamento || equipamento.type!=='Extintor' || !elemento) return;
    if(!equipamento.lastInspection){ elemento.textContent=''; return; }
    const dt=new Date(equipamento.lastInspection+'T00:00:00');
    if(Number.isNaN(dt.getTime())){ elemento.textContent=''; return; }
    const venc=new Date(dt);
    venc.setFullYear(venc.getFullYear()+1);
    const hoje=new Date(); hoje.setHours(0,0,0,0);
    const dias=Math.ceil((venc-hoje)/86400000);
    if(dias<0){
      elemento.textContent='🔴 VENCIDO há '+Math.abs(dias)+' dias';
      elemento.style.color='#b91c1c';
    }else if(dias<=30){
      elemento.textContent='🟡 VENCENDO em '+dias+' dias';
      elemento.style.color='#b45309';
    }else{
      elemento.textContent='🟢 EM DIA — '+dias+' dias restantes';
      elemento.style.color='#15803d';
    }
  }
  window.atualizarValidadeExtintor=atualizar;
  document.addEventListener('change',function(ev){
    if(ev.target && ev.target.matches('[data-f="lastInspection"]')){
      const card=ev.target.closest('.equip');
      if(card && window.eq){
        const id=Number(card.dataset.eid);
        const e=window.eq.find(x=>Number(x.id)===id);
        if(e) atualizar(e,card.querySelector('[data-status]'));
      }
    }
  });
})();