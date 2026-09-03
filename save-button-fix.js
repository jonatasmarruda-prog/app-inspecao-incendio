(()=>{
'use strict';

const IDS=['saveTop','save'];
const ORIGINAL={saveTop:'💾 Salvar',save:'💾 SALVAR INSPEÇÃO'};
let busy=false;

function toast(text,type='ok'){
  let el=document.getElementById('tbm-save-toast');
  if(!el){
    el=document.createElement('div');el.id='tbm-save-toast';
    Object.assign(el.style,{position:'fixed',left:'50%',bottom:'22px',transform:'translateX(-50%)',zIndex:'99999',maxWidth:'calc(100vw - 28px)',padding:'12px 16px',borderRadius:'12px',font:'700 13px Arial, sans-serif',boxShadow:'0 10px 30px #0003',transition:'opacity .2s ease',textAlign:'center'});
    document.body.appendChild(el);
  }
  el.style.background=type==='ok'?'#166534':type==='warn'?'#92400e':'#991b1b';
  el.style.color='#fff';el.style.opacity='1';el.textContent=text;
  clearTimeout(el.__timer);el.__timer=setTimeout(()=>{el.style.opacity='0'},2600);
}

function setButtons(text,disabled){
  IDS.forEach(id=>{const b=document.getElementById(id);if(!b)return;b.disabled=Boolean(disabled);if(text)b.textContent=text});
}
function restoreButtons(delay=1000){
  setTimeout(()=>IDS.forEach(id=>{const b=document.getElementById(id);if(!b)return;b.disabled=false;b.textContent=ORIGINAL[id]}),delay);
}

async function manualSave(){
  if(busy)return;busy=true;setButtons('⏳ Salvando...',true);
  try{
    if(typeof window.saveInspection!=='function')throw new Error('Função de salvamento indisponível.');
    await window.saveInspection(false);
    setButtons('✅ Salvo',false);
    toast('✅ Inspeção salva no dispositivo.','ok');
  }catch(e){
    console.error('[SALVAR]',e);setButtons('❌ Erro ao salvar',false);toast('❌ Erro ao salvar: '+(e?.message||e),'error');
  }finally{busy=false;restoreButtons()}
}

function bind(){
  IDS.forEach(id=>{
    const b=document.getElementById(id);if(!b||b.dataset.tbmSaveFix==='2')return;
    b.dataset.tbmSaveFix='2';b.type='button';b.onclick=null;
    b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();manualSave()},true);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
setTimeout(bind,400);setTimeout(bind,1200);
window.tbmManualSave=manualSave;
})();
