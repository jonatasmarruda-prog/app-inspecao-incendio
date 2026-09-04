(()=>{
'use strict';

const FLAG='__tbmAccidentDiagnosisConditionalV1';
if(window[FLAG])return;
window[FLAG]=true;

const TYPE='accident';

function getState(){
  try{return typeof state!=='undefined'?state:(window.state||null)}catch(_){return window.state||null}
}
function isAccident(){return getState()?.type===TYPE}
function normalizeText(value){
  return String(value??'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toLowerCase();
}
function diagnosisCard(){
  const cards=[...document.querySelectorAll('#form .card')];
  return cards.find(card=>{
    const title=card.querySelector(':scope > .sectionTitle');
    return normalizeText(title?.textContent)==='diagnostico e acoes';
  })||null;
}
function applyUiConditional(){
  const card=diagnosisCard();
  if(!card)return;
  card.id=card.id||'diagnosticActionsCard';
  card.classList.toggle('hidden',isAccident());
  card.setAttribute('aria-hidden',isAccident()?'true':'false');
  card.dataset.tbmAccidentConditional='1';
}

function textOf(node){
  if(node==null)return'';
  if(typeof node==='string'||typeof node==='number')return String(node);
  if(Array.isArray(node))return node.map(textOf).join(' ');
  if(typeof node==='object'){
    if(node.text!=null)return textOf(node.text);
    if(node.stack)return textOf(node.stack);
    if(node.columns)return textOf(node.columns);
    if(node.table?.body)return textOf(node.table.body);
  }
  return'';
}
function isDiagnosisHeading(text){
  const t=normalizeText(text);
  return t==='diagnostico e acoes'||
    t==='diagnostico e recomendacoes'||
    t.startsWith('diagnostico e acoes ')||
    t.startsWith('diagnostico e recomendacoes ');
}
function isDiagnosisBody(node){
  const t=normalizeText(textOf(node));
  return t.includes('problemas / nao conformidades')&&
    (t.includes('solucoes / acoes recomendadas')||t.includes('acoes recomendadas'));
}
function stripAccidentDiagnosis(docDefinition){
  if(!isAccident()||!docDefinition||!Array.isArray(docDefinition.content))return docDefinition;
  const content=docDefinition.content;
  for(let i=content.length-1;i>=0;i--){
    const headingText=textOf(content[i]);
    if(!isDiagnosisHeading(headingText))continue;
    if(isDiagnosisBody(content[i])){
      content.splice(i,1);
      continue;
    }
    const removeNext=i+1<content.length&&isDiagnosisBody(content[i+1]);
    content.splice(i,removeNext?2:1);
  }
  docDefinition.__tbmAccidentDiagnosisRemoved=true;
  return docDefinition;
}
function installPdfHook(){
  const pm=window.pdfMake;
  if(!pm||typeof pm.createPdf!=='function')return false;
  if(pm.createPdf.__tbmAccidentDiagnosisConditional)return true;
  const previous=pm.createPdf;
  const wrapped=function(docDefinition,...args){
    try{stripAccidentDiagnosis(docDefinition)}catch(err){console.warn('[ACIDENTE DIAGNOSTICO CONDICIONAL PDF]',err)}
    return previous.call(this,docDefinition,...args);
  };
  wrapped.__tbmAccidentDiagnosisConditional=true;
  wrapped.__tbmPrevious=previous;
  pm.createPdf=wrapped;
  return true;
}
function queueUi(){setTimeout(applyUiConditional,0)}
function bind(){
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-type],#backHome,[data-open-h],#historyBack,#reportBack'))queueUi();
  },false);
  window.addEventListener('sst-modules-loaded',queueUi);
  window.addEventListener('tbm-nr24-ready',queueUi);
}
function install(){
  bind();
  applyUiConditional();
  if(!installPdfHook()){
    let tries=0;
    const timer=setInterval(()=>{tries++;if(installPdfHook()||tries>=30)clearInterval(timer)},150);
  }
  window.tbmApplyAccidentDiagnosisConditional=applyUiConditional;
  window.tbmStripAccidentDiagnosisPdf=stripAccidentDiagnosis;
  window.__tbmAccidentDiagnosisConditionalVersion='2026.09.04.1';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
