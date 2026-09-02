(()=>{
  const empresas=['TBM Têxtil','TBM Log','Outro'];
  function ajustar(){
    const select=document.getElementById('company');
    if(!select)return false;
    const atual=select.value;
    select.innerHTML='';
    empresas.forEach(nome=>{
      const op=document.createElement('option');
      op.value=nome;op.textContent=nome;select.appendChild(op);
    });
    if(atual && empresas.includes(atual)) select.value=atual;
    const other=document.getElementById('companyOther');
    if(other){
      const toggle=()=>{other.style.display=select.value==='Outro'?'block':'none'; if(select.value!=='Outro')other.value='';};
      select.addEventListener('change',toggle);toggle();
    }
    const hint=select.parentElement?.querySelector('.hint');
    if(hint)hint.textContent='Selecione TBM Têxtil, TBM Log ou Outro e digite o nome da empresa.';
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ajustar);else ajustar();
  let n=0;const timer=setInterval(()=>{if(ajustar()||++n>20)clearInterval(timer)},300);
})();