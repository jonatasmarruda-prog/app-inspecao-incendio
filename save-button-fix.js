(()=>{
'use strict';

const IDS=['saveTop','save'];
const ORIGINAL={saveTop:'💾 Salvar',save:'💾 SALVAR INSPEÇÃO'};
let busy=false;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function toast(text,type='ok'){
  let el=document.getElementById('tbm-save-toast');
  if(!el){
    el=document.createElement('div');
    el.id='tbm-save-toast';
    Object.assign(el.style,{
      position:'fixed',left:'50%',bottom:'22px',transform:'translateX(-50%)',
      zIndex:'99999',maxWidth:'calc(100vw - 28px)',padding:'12px 16px',
      borderRadius:'12px',font:'700 13px Arial, sans-serif',boxShadow:'0 10px 30px #0003',
      transition:'opacity .2s ease',textAlign:'center'
    });
    document.body.appendChild(el);
  }
  el.style.background=type==='ok'?'#166534':type==='warn'?'#92400e':'#991b1b';
  el.style.color='#fff';
  el.style.opacity='1';
  el.textContent=text;
  clearTimeout(el.__timer);
  el.__timer=setTimeout(()=>{el.style.opacity='0'},2600);
}

async function latestSavedStamp(){
  try{
    if(typeof window.idbAll!=='function')return 0;
    const list=await window.idbAll();
    let max=0;
    for(const item of (list||[])){
      const t=Date.parse(item?.updatedAt||'');
      if(Number.isFinite(t)&&t>max)max=t;
    }
    return max;
  }catch(_){return 0}
}

function setButtons(text,disabled){
  IDS.forEach(id=>{
    const b=document.getElementById(id);
    if(!b)return;
    b.disabled=Boolean(disabled);
    if(text)b.textContent=text;
  });
}

function restoreButtons(delay=1300){
  setTimeout(()=>{
    IDS.forEach(id=>{
      const b=document.getElementById(id);
      if(!b)return;
      b.disabled=false;
      b.textContent=ORIGINAL[id];
    });
  },delay);
}

async function confirmSave(before){
  for(let i=0;i<10;i++){
    await sleep(180);
    const after=await latestSavedStamp();
    if(after>before)return true;
  }
  return false;
}

async function manualSave(){
  if(busy)return;
  busy=true;
  const before=await latestSavedStamp();
  setButtons('⏳ Salvando...',true);
  try{
    if(typeof window.saveInspection!=='function')throw new Error('Função de salvamento indisponível.');

    await window.saveInspection(false);
    let confirmed=await confirmSave(before);

    /* Em abertura muito rápida, o IndexedDB pode ainda estar inicializando. Tenta uma vez novamente. */
    if(!confirmed && before===0){
      await sleep(500);
      await window.saveInspection(false);
      confirmed=await confirmSave(before);
    }

    if(confirmed){
      setButtons('✅ Salvo',false);
      toast('✅ Inspeção salva no dispositivo com sucesso.','ok');
    }else{
      const msg=document.getElementById('msg')?.textContent?.trim();
      setButtons('⚠️ Verificar',false);
      toast(msg||'⚠️ Não foi possível confirmar o salvamento. Tente novamente.','warn');
    }
  }catch(e){
    console.error('[SALVAR]',e);
    setButtons('❌ Erro ao salvar',false);
    toast('❌ Erro ao salvar: '+(e?.message||e),'error');
  }finally{
    busy=false;
    restoreButtons();
  }
}

function bind(){
  IDS.forEach(id=>{
    const b=document.getElementById(id);
    if(!b||b.dataset.tbmSaveFix==='1')return;
    b.dataset.tbmSaveFix='1';
    b.type='button';
    b.onclick=null;
    b.addEventListener('click',e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      manualSave();
    },true);
  });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
setTimeout(bind,500);
setTimeout(bind,1500);
window.tbmManualSave=manualSave;
})();
