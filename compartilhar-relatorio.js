(()=>{
  function shareReport(){
    const report=document.getElementById('reportContent');
    if(!report){alert('Relatório não disponível para compartilhar.');return;}
    const text=(report.innerText||report.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
    const title='Relatório de Inspeção SST';
    if(navigator.share){ navigator.share({title,text}).catch(()=>{}); }
    else if(navigator.clipboard){ navigator.clipboard.writeText(text).then(()=>alert('Relatório copiado. Agora você pode colar no WhatsApp ou e-mail.')).catch(()=>alert('Seu navegador não oferece compartilhamento direto.')); }
    else alert('Seu navegador não oferece compartilhamento direto.');
  }
  function addButton(){
    const box=document.querySelector('#report .card.no-print');
    if(!box || document.getElementById('shareReport')) return;
    const b=document.createElement('button'); b.id='shareReport'; b.className='btn green full'; b.type='button'; b.textContent='📤 Compartilhar relatório'; b.onclick=shareReport;
    const print=document.getElementById('print');
    if(print) print.insertAdjacentElement('afterend',b); else box.prepend(b);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addButton); else addButton();
  new MutationObserver(addButton).observe(document.body,{childList:true,subtree:true});
})();