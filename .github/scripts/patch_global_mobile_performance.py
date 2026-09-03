from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')

def write(path, text):
    Path(path).write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'ERRO: trecho não encontrado: {label}')
    return text.replace(old, new, 1)

# 1) SALVAR: remove varredura repetitiva de todo o IndexedDB.
write('save-button-fix.js', r'''(()=>{
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
''')

# 2) CHECKLIST INCÊNDIO: atualiza só o botão tocado; não remonta os 11 itens nem envia Firebase direto.
s=read('fire-checklist-split.js')
old="""function setAnswer(kind,index,status){
  const st=ensureFireChecklistState();
  if(!st)return;
  const arr=kind==='extintor'?st.checklistExtintores:st.checklistHidrantes;
  arr[index]=status;
  renderSplitChecklist();
  if(typeof window.scheduleSave==='function')window.scheduleSave();
  if(typeof window.tbmPushCloud==='function')window.tbmPushCloud('fire-checklist');
}"""
new="""function setAnswer(kind,index,status){
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
}"""
s=replace_once(s,old,new,'setAnswer fire')
write('fire-checklist-split.js',s)

# 3) FOTOS: não remonta todas as fotos a cada item do lote; reduz peso mantendo boa qualidade para PDF.
s=read('photo-multi-fix.js')
s=replace_once(s,'const maxSide=1400;','const maxSide=1100;','maxSide fotos')
s=replace_once(s,"const blob=await canvasBlob(canvas,'image/jpeg',0.80);","const blob=await canvasBlob(canvas,'image/jpeg',0.74);",'qualidade fotos')
old="""      current.photos.push({id:photoId(),data,caption:'',name:file.name||'foto',originalType:file.type||fileExt(file)||'imagem'});
      added++;
      window.renderPhotos?.();
      await new Promise(r=>(window.requestAnimationFrame||setTimeout)(()=>r(),16));"""
new="""      current.photos.push({id:photoId(),data,caption:'',name:file.name||'foto',originalType:file.type||fileExt(file)||'imagem'});
      added++;
      if((i+1)%3===0)await new Promise(r=>setTimeout(r,0));"""
s=replace_once(s,old,new,'render por foto')
write('photo-multi-fix.js',s)

# 4) PREMIUM: evita JSON stringify/parse de todas as fotos em cada autosave e evita resize de teclado recriar assinaturas.
s=read('premium.js')
s=replace_once(s,'    const y=JSON.parse(JSON.stringify(x));','    const y=(x&&typeof x===\'object\')?{...x}:x;','clone pesado idbPut premium')
old="""function refreshSignatures(){
  const form=$('form');
  if(!form||form.classList.contains('hidden'))return;
  setTimeout(()=>{
    try{
      if(typeof window.setupSigs==='function')window.setupSigs();
    }catch(e){console.error('Assinaturas SST:',e)}
  },80);
}"""
new="""let tbmSignatureRefreshTimer=null;
function refreshSignatures(){
  const form=$('form');
  if(!form||form.classList.contains('hidden'))return;
  clearTimeout(tbmSignatureRefreshTimer);
  tbmSignatureRefreshTimer=setTimeout(()=>{
    try{if(typeof window.setupSigs==='function')window.setupSigs()}catch(e){console.error('Assinaturas SST:',e)}
  },120);
}"""
s=replace_once(s,old,new,'refreshSignatures')
old="""  window.addEventListener('resize',()=>{
    if(!form.classList.contains('hidden'))refreshSignatures();
  },{passive:true});"""
new="""  let lastFormWidth=Math.round(form.getBoundingClientRect().width||window.innerWidth||0);
  window.addEventListener('resize',()=>{
    if(form.classList.contains('hidden'))return;
    const width=Math.round(form.getBoundingClientRect().width||window.innerWidth||0);
    if(Math.abs(width-lastFormWidth)<18)return; // teclado móvel altera altura, não precisa recriar os canvases
    lastFormWidth=width;refreshSignatures();
  },{passive:true});"""
s=replace_once(s,old,new,'resize assinatura')
write('premium.js',s)

# 5) FIREBASE: um único fluxo de sincronização, debounced, sem clones gigantes de fotos em cada toque.
s=read('cloud-cross-device.js')
s=replace_once(s,'const SYNC_DEBOUNCE=1200;','const SYNC_DEBOUNCE=5000;','debounce nuvem')
s=replace_once(s,'  const st=clone(source||getState());','  const src=source||getState();\n  const st=src&&typeof src===\'object\'?{...src}:{};','payload nuvem shallow')
start=s.find('function wrapSaving(){')
end=s.find('\n\nfunction installObservers(){',start)
if start<0 or end<0: raise SystemExit('ERRO: wrapSaving não encontrado')
s=s[:start]+"function wrapSaving(){\n  // O salvamento principal já solicita a sincronização. Não envolver novamente.\n}\n"+s[end:]
old="""  document.addEventListener('input',e=>{if(e.target?.matches?.('input,textarea,select')&&e.target.id!=='photoInput')schedulePush()},{passive:true});
  document.addEventListener('change',e=>{if(e.target?.matches?.('input,textarea,select'))schedulePush()},{passive:true});
  const photos=document.getElementById('photos');if(photos)new MutationObserver(()=>schedulePush()).observe(photos,{childList:true});
"""
new="""  // Não sincronizar diretamente em input/change/MutationObserver.
  // scheduleSave -> saveInspection -> tbmPushCloud já cobre as alterações com debounce.
"""
s=replace_once(s,old,new,'observadores duplicados nuvem')
s=replace_once(s,'window.tbmPushCloud=pushCloud;',"window.tbmPushCloud=(reason='auto')=>{\n  if(reason==='main-save'||reason==='autosave'||reason==='fire-checklist'){schedulePush();return Promise.resolve(true)}\n  return pushCloud(reason);\n};",'export tbmPushCloud')
write('cloud-cross-device.js',s)

# 6) CHECKLIST CONDICIONAL: MutationObserver do equipmentList já é suficiente; remover listeners globais por toque.
s=read('checklist-conditional.js')
old="""    // Após abrir/excluir/alterar equipamentos, sincroniza a visibilidade.
    document.addEventListener('click',()=>setTimeout(updateGeneralChecklistVisibility,0),true);
    document.addEventListener('change',()=>setTimeout(updateGeneralChecklistVisibility,0),true);
"""
new="""    // O próprio MutationObserver do equipmentList atualiza a visibilidade somente quando necessário.
"""
s=replace_once(s,old,new,'listeners checklist condicional')
write('checklist-conditional.js',s)

# 7) EXCLUIR: formulário é estático; não observar cada mutação de toda a página.
s=read('delete-draft.js')
old="""function init(){
  addDeleteButton();
  const obs=new MutationObserver(addDeleteButton);
  obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(addDeleteButton,300);
}"""
new="""function init(){
  addDeleteButton();
  setTimeout(addDeleteButton,300);
}"""
s=replace_once(s,old,new,'observer delete draft')
write('delete-draft.js',s)

# 8) PREMIUM UX: progresso debounced e dashboard não recalculado escondido a cada autosave.
s=read('premium-ux.js')
s=replace_once(s,'let dashboardTimer=null;','let dashboardTimer=null;\nlet progressTimer=null;','timer progresso')
needle="function updateProgress(){const st=getState();const p=completionOf(st);const t=$('tbmProgressText'),b=$('tbmProgressBar');if(t)t.textContent=`${p}% preenchido`;if(b)b.style.width=p+'%'}"
replacement=needle+"\nfunction scheduleProgressUpdate(){clearTimeout(progressTimer);progressTimer=setTimeout(updateProgress,120)}"
s=replace_once(s,needle,replacement,'schedule progress')
old="""function wrapStorage(){if(window.idbPut&&!window.__tbmUxPutWrapped){window.__tbmUxPutWrapped=true;const old=window.idbPut;window.idbPut=async function(...a){const r=await old.apply(this,a);scheduleDashboard();return r}}if(window.idbDelete&&!window.__tbmUxDeleteWrapped){window.__tbmUxDeleteWrapped=true;const old=window.idbDelete;window.idbDelete=async function(...a){const r=await old.apply(this,a);scheduleDashboard();return r}}}"""
new="""function wrapStorage(){if(window.idbPut&&!window.__tbmUxPutWrapped){window.__tbmUxPutWrapped=true;const old=window.idbPut;window.idbPut=async function(...a){const r=await old.apply(this,a);if(!$('home')?.classList.contains('hidden'))scheduleDashboard();return r}}if(window.idbDelete&&!window.__tbmUxDeleteWrapped){window.__tbmUxDeleteWrapped=true;const old=window.idbDelete;window.idbDelete=async function(...a){const r=await old.apply(this,a);if(!$('home')?.classList.contains('hidden'))scheduleDashboard();return r}}}"""
s=replace_once(s,old,new,'wrapStorage premium ux')
s=s.replace("document.addEventListener('input',()=>{if(!$('form')?.classList.contains('hidden'))setTimeout(updateProgress,80)},{passive:true});","document.addEventListener('input',()=>{if(!$('form')?.classList.contains('hidden'))scheduleProgressUpdate()},{passive:true});",1)
s=s.replace("document.addEventListener('change',()=>{if(!$('form')?.classList.contains('hidden'))setTimeout(updateProgress,80)},{passive:true});","document.addEventListener('change',()=>{if(!$('form')?.classList.contains('hidden'))scheduleProgressUpdate()},{passive:true});",1)
write('premium-ux.js',s)

# 9) CACHE BUSTERS principais.
s=read('index.html')
s=s.replace('./premium.js?v=20260903-31','./premium.js?v=20260903-32')
s=s.replace('./delete-draft.js?v=20260903-01','./delete-draft.js?v=20260903-02')
write('index.html',s)

s=read('sst-repair-loader.js')
s=s.replace('fire-checklist-split.js?v=20260903-02','fire-checklist-split.js?v=20260903-03')
s=s.replace('checklist-conditional.js?v=20260903-01','checklist-conditional.js?v=20260903-02')
s=s.replace('photo-multi-fix.js?v=20260903-03','photo-multi-fix.js?v=20260903-04')
s=s.replace('save-button-fix.js?v=20260903-01','save-button-fix.js?v=20260903-02')
s=s.replace('cloud-cross-device.js?v=20260903-03','cloud-cross-device.js?v=20260903-04')
s=s.replace('premium-ux.js?v=20260903-01','premium-ux.js?v=20260903-02')
s=s.replace('mobile-performance-fix.js?v=20260903-02','mobile-performance-fix.js?v=20260903-03')
write('sst-repair-loader.js',s)

for sw in ['service-worker.js','sw.js']:
    p=Path(sw)
    if p.exists():
        t=read(sw).replace('inspecao-sst-v55','inspecao-sst-v56').replace('?v=55','?v=56')
        write(sw,t)

print('PATCH_GLOBAL_PERFORMANCE_OK')
