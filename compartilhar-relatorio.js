(()=>{
  'use strict';
  const BTN_ID='shareReport';
  function getReport(){
    return document.getElementById('reportContent') || document.querySelector('#report .report') || document.querySelector('.report');
  }
  function getReportText(){
    const report=getReport();
    return (report ? (report.innerText||report.textContent||'') : document.body.innerText||'')
      .replace(/\n{3,}/g,'\n\n').trim();
  }
  async function shareReport(){
    const text=getReportText();
    if(!text){ alert('Relatório não disponível para compartilhar.'); return; }
    const title='Relatório de Inspeção SST';
    try{
      if(navigator.share){
        await navigator.share({title,text});
        return;
      }
      if(navigator.clipboard){
        await navigator.clipboard.writeText(text);
        alert('Relatório copiado. Agora você pode colar no WhatsApp ou e-mail.');
        return;
      }
      window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
    }catch(e){
      if(e && e.name==='AbortError') return;
      try{ window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank'); }catch(_){ alert('Não foi possível abrir o compartilhamento.'); }
    }
  }
  function addButton(){
    if(document.getElementById(BTN_ID)) return;
    const report=getReport();
    if(!report) return;
    const scope=report.closest('#report') || report.parentElement || document.body;
    const buttons=[...scope.querySelectorAll('button')];
    const print=buttons.find(b=>/imprimir|salvar.*pdf|gerar.*relat/i.test((b.textContent||'').trim())) || document.getElementById('print') || document.getElementById('pdf');
    const box=(print && print.parentElement) || scope.querySelector('.card.no-print') || scope;
    const b=document.createElement('button');
    b.id=BTN_ID;
    b.type='button';
    b.className='btn green full no-print';
    b.textContent='📤 Compartilhar relatório';
    b.setAttribute('aria-label','Compartilhar relatório');
    b.addEventListener('click',shareReport);
    if(print && print.parentElement===box) print.insertAdjacentElement('beforebegin',b); else box.insertBefore(b,box.firstChild);
  }
  const start=()=>{ addButton(); setTimeout(addButton,200); setTimeout(addButton,800); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
  new MutationObserver(addButton).observe(document.documentElement,{childList:true,subtree:true});
})();