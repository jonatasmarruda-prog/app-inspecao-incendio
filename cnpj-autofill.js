(()=>{
'use strict';

const CNPJ_TBM_TEXTIL='07.603.376/0003-00';
const FLAG='__tbmCnpjStrictV4';
let installed=false;
let lastCompanyNormalized=null;
let lastReportHTML=null;

function normalizeText(v){
  return String(v??'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().trim();
}

function getState(){
  try{return state||null}catch(_){return window.state||window.appState||window.currentInspection||null}
}

function isVisible(el){
  return !!el&&!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none';
}

function currentCompanyValue(){
  const field=document.getElementById('company');
  const form=document.getElementById('form');
  const st=getState();
  if(field&&(!form||isVisible(form)))return String(field.value||'');
  return String(st?.company||field?.value||'');
}

function isTbmTextil(v){return normalizeText(v)==='tbm textil'}
function desiredCnpj(v=currentCompanyValue()){return isTbmTextil(v)?CNPJ_TBM_TEXTIL:''}

function findCnpjField(){
  const direct=document.querySelector('#cnpj,[name="cnpj"],[data-field="cnpj"],[data-key="cnpj"],[data-k="cnpj"],input[placeholder*="CNPJ" i]');
  if(direct)return direct;
  const label=[...document.querySelectorAll('label')].find(l=>normalizeText(l.textContent).includes('cnpj'));
  if(!label)return null;
  if(label.htmlFor){const byFor=document.getElementById(label.htmlFor);if(byFor)return byFor}
  return label.querySelector('input,textarea')||label.parentElement?.querySelector('input,textarea')||null;
}

function setStateCnpj(value){
  const st=getState();
  if(st)st.cnpj=value;
  if(window.appState&&window.appState!==st)window.appState.cnpj=value;
  if(window.currentInspection&&window.currentInspection!==st)window.currentInspection.cnpj=value;
}

function dispatchAutosave(field){
  field.dispatchEvent(new Event('input',{bubbles:true}));
  field.dispatchEvent(new Event('change',{bubbles:true}));
}

function patchRenderedReportCnpj(){
  const next=desiredCnpj();
  document.querySelectorAll('#report tr,.pdf-enterprise tr').forEach(tr=>{
    const cells=[...tr.querySelectorAll('th,td')];
    if(cells.length>=2&&normalizeText(cells[0].textContent)==='cnpj')cells[1].textContent=next;
  });
}

function applyCnpj(){
  const next=desiredCnpj();
  const cnpjInput=findCnpjField();

  // IF/ELSE estrito: somente TBM Têxtil recebe o CNPJ da unidade.
  if(isTbmTextil(currentCompanyValue())){
    setStateCnpj(CNPJ_TBM_TEXTIL);
    if(cnpjInput){cnpjInput.value=CNPJ_TBM_TEXTIL;dispatchAutosave(cnpjInput)}
  }else{
    // TBM Log, Outro ou qualquer outro valor: limpeza absoluta do campo e do estado.
    setStateCnpj('');
    if(cnpjInput){cnpjInput.value='';dispatchAutosave(cnpjInput)}
  }

  if(!cnpjInput&&typeof window.scheduleSave==='function'){
    try{window.scheduleSave()}catch(_){ }
  }
  patchRenderedReportCnpj();
  lastCompanyNormalized=normalizeText(currentCompanyValue());
  return next;
}

function initializeEmptyCnpjState(){
  const st=getState();
  if(st)st.cnpj='';
}

function patchReset(){
  if(typeof window.reset!=='function'||window.reset[FLAG])return;
  const original=window.reset;
  const wrapped=function(...args){
    const result=original.apply(this,args);
    const st=getState();
    if(st)st.cnpj='';
    lastCompanyNormalized=null;
    setTimeout(applyCnpj,0);
    return result;
  };
  wrapped[FLAG]=true;
  window.reset=wrapped;
}

function patchNormalize(){
  if(typeof window.normalize!=='function'||window.normalize[FLAG])return;
  const original=window.normalize;
  const wrapped=function(...args){
    const result=original.apply(this,args);
    setStateCnpj(desiredCnpj());
    return result;
  };
  wrapped[FLAG]=true;
  window.normalize=wrapped;
}

function cellText(cell){
  if(cell==null)return'';
  if(typeof cell==='string'||typeof cell==='number')return String(cell);
  if(Array.isArray(cell))return cell.map(cellText).join(' ');
  if(typeof cell==='object'){
    if(cell.text!=null)return cellText(cell.text);
    if(cell.stack)return cellText(cell.stack);
  }
  return'';
}

function setCellText(cell,value){
  if(cell&&typeof cell==='object'&&!Array.isArray(cell)){cell.text=value;return cell}
  return value;
}

function enforceCnpjInDoc(node,next){
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){
    if(node.length>=2&&normalizeText(cellText(node[0]))==='cnpj')node[1]=setCellText(node[1],next);
    node.forEach(x=>enforceCnpjInDoc(x,next));
    return;
  }
  if(typeof node.text==='string'&&node.text.includes(CNPJ_TBM_TEXTIL))node.text=node.text.split(CNPJ_TBM_TEXTIL).join(next);
  Object.keys(node).forEach(k=>{if(k!=='text')enforceCnpjInDoc(node[k],next)});
}

function patchPdfMake(){
  const pm=window.pdfMake;
  if(!pm||typeof pm.createPdf!=='function'||pm.createPdf[FLAG])return false;
  const original=pm.createPdf.bind(pm);
  const wrapped=function(docDefinition,...args){
    const next=applyCnpj();
    try{enforceCnpjInDoc(docDefinition,next)}catch(e){console.warn('[CNPJ] Falha ao normalizar PDF:',e)}
    return original(docDefinition,...args);
  };
  wrapped[FLAG]=true;
  pm.createPdf=wrapped;
  return true;
}

function patchReportHTML(){
  if(typeof window.reportHTML!=='function'||window.reportHTML[FLAG])return;
  const original=window.reportHTML;
  if(lastReportHTML===original)return;
  const wrapped=function(data,...args){
    const next=applyCnpj();
    if(data&&typeof data==='object')data.cnpj=next;
    const html=original.call(this,data,...args);
    return typeof html==='string'?html.split(CNPJ_TBM_TEXTIL).join(next):html;
  };
  wrapped[FLAG]=true;
  lastReportHTML=wrapped;
  window.reportHTML=wrapped;
}

function bind(){
  const company=document.getElementById('company');
  if(!company)return false;
  if(company.dataset.tbmCnpjAutofill!=='4'){
    company.dataset.tbmCnpjAutofill='4';
    company.addEventListener('change',applyCnpj);
    company.addEventListener('input',applyCnpj);
  }
  const normalized=normalizeText(currentCompanyValue());
  if(normalized!==lastCompanyNormalized)applyCnpj();
  return true;
}

function install(){
  if(installed)return;
  installed=true;
  initializeEmptyCnpjState();
  patchReset();
  patchNormalize();
  bind();
  patchPdfMake();
  patchReportHTML();

  const observer=new MutationObserver(()=>{
    bind();patchReset();patchNormalize();patchPdfMake();patchReportHTML();patchRenderedReportCnpj();
  });
  observer.observe(document.body,{childList:true,subtree:true});

  setInterval(()=>{
    const normalized=normalizeText(currentCompanyValue());
    if(normalized!==lastCompanyNormalized)applyCnpj();
    patchReset();patchNormalize();patchPdfMake();patchReportHTML();patchRenderedReportCnpj();
  },400);

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#pdf,#reportPdf,#reportShare,[data-report-h]'))applyCnpj();
  },true);
}

window.tbmApplyCnpjByCompany=applyCnpj;
window.tbmCnpjForCompany=desiredCnpj;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
