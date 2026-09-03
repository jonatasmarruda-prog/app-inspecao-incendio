(()=>{
'use strict';

const CNPJ_TBM_TEXTIL='07.603.376/0003-00';
let installed=false;

function normalizeText(v){
  return String(v??'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().trim();
}

function getState(){
  try{return state||null}catch(_){return window.state||null}
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
  return parent?.querySelector('input,textarea')||label.nextElementSibling?.matches?.('input,textarea')&&label.nextElementSibling||null;
}

function desiredCnpj(companyValue){
  const v=normalizeText(companyValue);
  return (v.includes('tbm textil')||v.includes('tbm têxtil'))?CNPJ_TBM_TEXTIL:'';
}

function dispatchAutosave(field){
  field.dispatchEvent(new Event('input',{bubbles:true}));
  field.dispatchEvent(new Event('change',{bubbles:true}));
}

function applyCnpj(){
  const company=document.getElementById('company');
  if(!company)return;

  const next=desiredCnpj(company.value);
  const st=getState();
  if(st)st.cnpj=next;

  const cnpj=findCnpjField();
  if(cnpj){
    cnpj.value=next;
    dispatchAutosave(cnpj);
  }else if(typeof window.scheduleSave==='function'){
    window.scheduleSave();
  }
}

function bind(){
  const company=document.getElementById('company');
  if(!company)return false;
  if(company.dataset.tbmCnpjAutofill!=='1'){
    company.dataset.tbmCnpjAutofill='1';
    company.addEventListener('change',applyCnpj);
    company.addEventListener('input',applyCnpj);
  }
  applyCnpj();
  return true;
}

function install(){
  if(installed)return;
  installed=true;
  bind();
  const observer=new MutationObserver(()=>bind());
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(bind,300);
  setTimeout(bind,1000);
}

window.tbmApplyCnpjByCompany=applyCnpj;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
