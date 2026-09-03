(()=>{
'use strict';

const perguntasExtintor=[
  'Acesso e sinalização desobstruídos',
  'Pino de segurança e lacre íntegros',
  'Manômetro na faixa verde (quando pressurizado)',
  'Cilindro e pintura em bom estado',
  'Mangueira e difusor sem danos',
  'Etiqueta de validade legível'
];

const perguntasHidrante=[
  'Acesso e sinalização desobstruídos',
  'Abrigo em bom estado e porta abrindo facilmente',
  'Mangueiras enroladas corretamente (aduchadas) e secas',
  'Esguicho e Chave Storz presentes',
  'Registros e engates sem vazamento ou corrosão'
];

window.perguntasExtintor=perguntasExtintor;
window.perguntasHidrante=perguntasHidrante;

function currentState(){try{return state}catch(_){return window.state||null}}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function ensureFireChecklistState(){
  const st=currentState();
  if(!st||st.type!=='fire')return st;
  if(!Array.isArray(st.checklistExtintores))st.checklistExtintores=perguntasExtintor.map(()=>'PENDENTE');
  if(!Array.isArray(st.checklistHidrantes))st.checklistHidrantes=perguntasHidrante.map(()=>'PENDENTE');
  while(st.checklistExtintores.length<perguntasExtintor.length)st.checklistExtintores.push('PENDENTE');
  while(st.checklistHidrantes.length<perguntasHidrante.length)st.checklistHidrantes.push('PENDENTE');
  st.checklistExtintores=st.checklistExtintores.slice(0,perguntasExtintor.length);
  st.checklistHidrantes=st.checklistHidrantes.slice(0,perguntasHidrante.length);
  return st;
}

function statusClass(v){return v==='CONFORME'?'ok':v==='NÃO CONFORME'?'no':v==='PENDENTE'?'pend':''}

function renderGroup(title,kind,questions,answers){
  return `<div class="tbm-fire-check-group" data-fire-group="${kind}">
    <div class="tbm-fire-check-title">${title}</div>
    ${questions.map((q,i)=>{
      const selected=answers[i]||'PENDENTE';
      return `<div class="check tbm-fire-check-item">
        <b style="font-size:12px;display:block;margin-bottom:8px">${i+1}. ${esc(q)}</b>
        <div class="choices tbm-fire-check-choices">
          ${['CONFORME','NÃO CONFORME','PENDENTE','N/A'].map(v=>`<button type="button" data-fire-check-kind="${kind}" data-fire-check-index="${i}" data-fire-check-status="${v}" class="${selected===v?statusClass(v):''}">${v}</button>`).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function injectStyle(){
  if(document.getElementById('tbm-fire-checklist-split-style'))return;
  const s=document.createElement('style');
  s.id='tbm-fire-checklist-split-style';
  s.textContent=`
    .tbm-fire-check-group{border:1px solid #d9e0e8;border-radius:14px;padding:12px;margin:12px 0;background:#fbfcfe}
    .tbm-fire-check-title{font-size:15px;font-weight:900;margin:0 0 10px;color:#17202b}
    .tbm-fire-check-choices{grid-template-columns:repeat(4,minmax(0,1fr))!important}
    .tbm-fire-check-choices button{min-height:38px;padding:8px 5px!important}
    @media(max-width:560px){.tbm-fire-check-choices{grid-template-columns:1fr 1fr!important}}
  `;
  document.head.appendChild(s);
}

function renderSplitChecklist(){
  const box=document.getElementById('checklist');
  const st=currentState();
  if(!box||!st)return;
  if(st.type!=='fire'){
    const types=(()=>{try{return TYPES}catch(_){return window.TYPES||{}}})();
    const checks=types?.[st.type]?.checks||[];
    box.innerHTML=checks.map((q,i)=>{const v=st.checks?.[i]||'PENDENTE';return `<div class="check"><div class="checkrow"><b style="font-size:12px">${i+1}. ${esc(q)}</b><select data-check="${i}"><option ${v==='CONFORME'?'selected':''}>CONFORME</option><option ${v==='NÃO CONFORME'?'selected':''}>NÃO CONFORME</option><option ${v==='PENDENTE'?'selected':''}>PENDENTE</option><option ${v==='N/A'?'selected':''}>N/A</option></select></div></div>`}).join('');
    return;
  }
  ensureFireChecklistState();
  box.innerHTML=renderGroup('🔥 Checklist - Extintores','extintor',perguntasExtintor,st.checklistExtintores)+renderGroup('💧 Checklist - Hidrantes','hidrante',perguntasHidrante,st.checklistHidrantes);
}

function setAnswer(kind,index,status){
  const st=ensureFireChecklistState();
  if(!st)return;
  const arr=kind==='extintor'?st.checklistExtintores:st.checklistHidrantes;
  arr[index]=status;
  const selector=`[data-fire-check-kind="${kind}"][data-fire-check-index="${index}"]`;
  const buttons=document.querySelectorAll(selector);
  buttons.forEach(btn=>{
    btn.classList.remove('ok','no','pend');
    if(btn.dataset.fireCheckStatus===status)btn.classList.add(statusClass(status));
  });
  if(typeof window.scheduleSave==='function')window.scheduleSave();
}

function install(){
  injectStyle();
  window.renderChecklist=renderSplitChecklist;
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-fire-check-kind]');
    if(!b)return;
    e.preventDefault();
    setAnswer(b.dataset.fireCheckKind,+b.dataset.fireCheckIndex,b.dataset.fireCheckStatus);
  },true);
  const form=document.getElementById('form');
  if(form)new MutationObserver(()=>{if(!form.classList.contains('hidden'))setTimeout(renderSplitChecklist,0)}).observe(form,{attributes:true,attributeFilter:['class']});
  setTimeout(renderSplitChecklist,0);
}

window.tbmRenderFireChecklist=renderSplitChecklist;
window.tbmEnsureFireChecklistState=ensureFireChecklistState;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
