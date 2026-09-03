(()=>{
'use strict';

const CNPJ_TBM_TEXTIL='07.603.376/0003-00';
let installed=false;
let lastCompanyNormalized=null;

function normalizeText(v){
  return String(v??'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().trim();
}

function getState(){
  try{return state||null}catch(_){return window.state||window.appState||window.currentInspection||null}
}

function currentCompanyValue(){
  const field=document.getElementById('company');
  if(field)return field.value||'';
  const st=getState();
  return st?.company||'';
}

function findCnpjField(){
  const direct=document.querySelector('#cnpj,[name="cnpj"],[data-field="cnpj"],[data-key="cnpj"],[data-k="cnpj"],input[placeholder*="CNPJ" i]');
  if(direct)return direct;

  const labels=[...document.querySelectorAll('label')];
  const label=labels.find(l=>normalizeText(l.textContent).includes('cnpj'));
  if(!label)return null;

  if(label.htmlFor){
    const byFor=document.getElementById(label.htmlFor);
    if(byFor)return byFor;
  }
  const inside=label.querySelector('input,textarea');
  if(inside)return inside;
  const parent=label.parentElement;
  return parent?.querySelector('input,textarea')||(label.nextElementSibling?.matches?.('input,textarea')?label.nextElementSibling:null);
}

function desiredCnpj(companyValue){
  return normalizeText(companyValue)==='tbm textil'?CNPJ_TBM_TEXTIL:'';
}

function dispatchAutosave(field){
  field.dispatchEvent(new Event('input',{bubbles:true}));
  field.dispatchEvent(new Event('change',{bubbles:true}));
}

function setStateCnpj(value){
  const st=getState();
  if(st)st.cnpj=value;
  if(window.appState&&window.appState!==st)window.appState.cnpj=value;
  if(window.currentInspection&&window.currentInspection!==st)window.currentInspection.cnpj=value;
}

function applyCnpj(){
  const company=document.getElementById('company');
  const companyValue=company?company.value:currentCompanyValue();
  const normalized=normalizeText(companyValue);
  const cnpjInput=findCnpjField();

  // Regra estrita: somente TBM Têxtil recebe o CNPJ fixo.
  if(normalized==='tbm textil'){
    setStateCnpj(CNPJ_TBM_TEXTIL);
    if(cnpjInput){
      cnpjInput.value=CNPJ_TBM_TEXTIL;
      dispatchAutosave(cnpjInput);
    }else if(typeof window.scheduleSave==='function')window.scheduleSave();
  }else{
    // TBM Log, Outro ou qualquer valor diferente: limpeza absoluta.
    setStateCnpj('');
    if(cnpjInput){
      cnpjInput.value='';
      cnpjInput.dispatchEvent(new Event('input',{bubbles:true}));
      cnpjInput.dispatchEvent(new Event('change',{bubbles:true}));
    }else if(typeof window.scheduleSave==='function')window.scheduleSave();
  }

  lastCompanyNormalized=normalized;
}

function initializeEmptyCnpjState(){
  const st=getState();
  if(st&&typeof st.cnpj==='undefined')st.cnpj='';
}

function patchReset(){
  if(typeof window.reset!=='function'||window.reset.__tbmCnpjInitialState)return;
  const original=window.reset;
  const wrapped=function(...args){
    const result=original.apply(this,args);
    const st=getState();
    if(st)st.cnpj='';
    return result;
  };
  wrapped.__tbmCnpjInitialState=true;
  window.reset=wrapped;
}

function patchPdfMake(){
  const pm=window.pdfMake;
  if(!pm||typeof pm.createPdf!=='function'||pm.createPdf.__tbmCnpjStrict)return;
  const original=pm.createPdf.bind(pm);

  function replaceCnpj(node,next){
    if(Array.isArray(node)){node.forEach(x=>replaceCnpj(x,next));return}
    if(!node||typeof node!=='object')return;
    if(typeof node.text==='string'&&node.text.trim()===CNPJ_TBM_TEXTIL)node.text=next;
    Object.keys(node).forEach(k=>{if(k!=='text')replaceCnpj(node[k],next)});
  }

  const wrapped=function(docDefinition,...args){
    const next=desiredCnpj(currentCompanyValue());
    setStateCnpj(next);
    replaceCnpj(docDefinition,next);
    return original(docDefinition,...args);
  };
  wrapped.__tbmCnpjStrict=true;
  pm.createPdf=wrapped;
}

function bind(){
  const company=document.getElementById('company');
  if(!company)return false;
  if(company.dataset.tbmCnpjAutofill!=='2'){
    company.dataset.tbmCnpjAutofill='2';
    company.addEventListener('change',applyCnpj);
    company.addEventListener('input',applyCnpj);
  }
  const normalized=normalizeText(company.value);
  if(normalized!==lastCompanyNormalized)applyCnpj();
  return true;
}

function install(){
  if(installed)return;
  installed=true;
  initializeEmptyCnpjState();
  patchReset();
  bind();
  patchPdfMake();

  const observer=new MutationObserver(()=>{bind();patchReset();patchPdfMake()});
  observer.observe(document.body,{childList:true,subtree:true});

  // Também cobre preenchimentos programáticos ao reabrir registros salvos.
  setInterval(()=>{
    const company=document.getElementById('company');
    const normalized=normalizeText(company?.value||currentCompanyValue());
    if(normalized!==lastCompanyNormalized)applyCnpj();
    patchPdfMake();
  },500);

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#pdf,#reportPdf,#reportShare,[data-report-h]'))applyCnpj();
  },true);
}

window.tbmApplyCnpjByCompany=applyCnpj;
window.tbmCnpjForCompany=desiredCnpj;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
