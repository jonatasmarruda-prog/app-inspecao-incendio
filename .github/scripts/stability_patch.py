from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')
    print('patched', path)


def replace_once(path, old, new):
    text=read(path)
    if old not in text:
        raise SystemExit(f'pattern not found in {path}: {old[:80]!r}')
    if text.count(old)!=1:
        raise SystemExit(f'pattern not unique in {path}: count={text.count(old)}')
    write(path,text.replace(old,new,1))

# 1) Premium UX: remove observador global de toda a árvore DOM.
p='premium-ux.js'
t=read(p)
pattern=r"function observers\(\)\{[\s\S]*?\n\}\n\nfunction install\(\)\{"
new="""function observers(){
  const list=$('historyList');
  if(list&&!list.dataset.tbmUxObserved){
    list.dataset.tbmUxObserved='1';
    let timer=null;
    new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(decorateHistory,60)}).observe(list,{childList:true,subtree:false});
  }
  const form=$('form');
  if(form&&!form.dataset.tbmUxFormObserved){
    form.dataset.tbmUxFormObserved='1';
    new MutationObserver(()=>{
      if(!form.classList.contains('hidden')){ensureFieldModeButtons();ensureProgress();observeMessages()}
    }).observe(form,{attributes:true,attributeFilter:['class']});
  }
  const pt=$('ptAlturaOverlay');
  if(pt&&!pt.dataset.tbmUxFormObserved){
    pt.dataset.tbmUxFormObserved='1';
    new MutationObserver(()=>{if(!pt.classList.contains('hidden'))ensureFieldModeButtons()}).observe(pt,{attributes:true,attributeFilter:['class']});
  }
  observeMessages();
}

function install(){"""
t2,n=re.subn(pattern,new,t,count=1)
if n!=1: raise SystemExit(f'premium observers patch count={n}')
write(p,t2)

# 2) Sincronização em celular: não varrer coleção inteira nem idbAll a cada 2 min.
p='cloud-cross-device.js'
t=read(p)
old="""    await flushDeletionQueue(fs);
    const snap=await fs.collection('inspections').where('workspaceKey','==',WORKSPACE_KEY).get();"""
new="""    await flushDeletionQueue(fs);
    if(MOBILE_DEVICE){
      const current=getState();
      const deleting=new Set(readDeleteQueue().map(String));
      if(current?.id&&!deleting.has(String(current.id)))await pushRecord(current,'periodic-mobile-current');
      indicator('sync','● Nuvem sincronizada');
      return true;
    }
    const snap=await fs.collection('inspections').where('workspaceKey','==',WORKSPACE_KEY).get();"""
if old not in t: raise SystemExit('cloud sync anchor not found')
write(p,t.replace(old,new,1))

# 3) Exclusão de inspeção: remover varredura de todos os bancos/stores/JSON.
p='delete-draft.js'
t=read(p)
pattern=r"async function removeCurrentFromIndexedDB\(id\)\{[\s\S]*?\n\}\n\nasync function limparInspecao\(\)\{"
new="""async function removeCurrentFromIndexedDB(id){
  if(!id)return;
  await new Promise(resolve=>{
    try{
      const req=indexedDB.open('SSTInspecoes');
      req.onerror=()=>resolve();
      req.onsuccess=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains('inspections')){db.close();resolve();return;}
        const tx=db.transaction('inspections','readwrite');
        tx.objectStore('inspections').delete(String(id));
        tx.oncomplete=tx.onerror=tx.onabort=()=>{try{db.close()}catch(_){}resolve()};
      };
    }catch(_){resolve()}
  });
}

async function limparInspecao(){"""
t2,n=re.subn(pattern,new,t,count=1)
if n!=1: raise SystemExit(f'delete function patch count={n}')
old2="""  if (id) {
    try { if (typeof window.idbDelete === 'function') { await window.idbDelete(id); } } catch (e) { console.warn('Falha idbDelete:', e); }
    try { await removeCurrentFromIndexedDB(id); } catch (e) { console.warn('Falha na limpeza completa do IndexedDB:', e); }
    try { if (window.SST?.fs) { await window.SST.fs.collection('inspections').doc(String(id)).delete(); } } catch (e) { console.warn('Falha nuvem:', e); }
  }"""
new2="""  if (id) {
    let deleted=false;
    try { if (typeof window.idbDelete === 'function') { await window.idbDelete(id); deleted=true; } } catch (e) { console.warn('Falha idbDelete:', e); }
    if(!deleted){try { await removeCurrentFromIndexedDB(id); } catch (e) { console.warn('Falha na exclusão local:', e); }}
    try { if (window.SST?.fs) { window.SST.fs.collection('inspections').doc(String(id)).delete().catch(()=>{}); } } catch (e) { console.warn('Falha nuvem:', e); }
  }"""
if old2 not in t2: raise SystemExit('delete call block not found')
write(p,t2.replace(old2,new2,1))

# 4) Salvar: e-mail somente depois da interface ficar ociosa; evita congelar o toque.
p='save-button-fix.js'
t=read(p)
old="""let busy=false;"""
new="""let busy=false;
let emailTimer=null;"""
t=t.replace(old,new,1)
pattern=r"function sendEmailInBackground\(\)\{[\s\S]*?\n\}\n\nasync function manualSave"
new="""function sendEmailInBackground(){
  if(typeof window.tbmAutoEmailSavedReport!=='function')return;
  clearTimeout(emailTimer);
  emailTimer=setTimeout(()=>{
    const run=()=>{
      try{
        const p=window.tbmAutoEmailSavedReport({mode:'main'});
        if(p&&typeof p.catch==='function')p.catch(e=>console.warn('[SALVAR EMAIL]',e));
      }catch(e){console.warn('[SALVAR EMAIL]',e)}
    };
    if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:6000});
    else setTimeout(run,250);
  },1600);
}

async function manualSave"""
t2,n=re.subn(pattern,new,t,count=1)
if n!=1: raise SystemExit(f'save email patch count={n}')
write(p,t2)

# 5) E-mail no cliente: ceder a thread entre etapas pesadas e não salvar PT duas vezes.
p='email-relatorio-auto.js'
t=read(p)
anchor="""async function sha256(blob){"""
helper="""function yieldUI(){return new Promise(resolve=>setTimeout(resolve,0))}
function runWhenIdle(fn,delay=1400){
  setTimeout(()=>{
    const run=()=>{try{const p=fn();if(p&&typeof p.catch==='function')p.catch(e=>console.warn('[EMAIL IDLE]',e))}catch(e){console.warn('[EMAIL IDLE]',e)}};
    if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:6000});else setTimeout(run,200);
  },delay);
}

async function sha256(blob){"""
if anchor not in t: raise SystemExit('email sha anchor not found')
t=t.replace(anchor,helper,1)
t=t.replace("""    const pdf=await capturePdf(mode);
    meta=reportMeta(mode,pdf);
    fingerprint=await sha256(pdf.blob);""","""    await yieldUI();
    const pdf=await capturePdf(mode);
    await yieldUI();
    meta=reportMeta(mode,pdf);
    fingerprint=await sha256(pdf.blob);
    await yieldUI();""",1)
t=t.replace("""    const pdfBase64=await blobToBase64(pdf.blob);
    const data=await postToBackend""","""    const pdfBase64=await blobToBase64(pdf.blob);
    await yieldUI();
    const data=await postToBackend""",1)
pattern=r"function installPtSaveHook\(\)\{[\s\S]*?\n\}\n\nfunction configureBackend"
new="""function installPtSaveHook(){
  if(ptHookInstalled)return;ptHookInstalled=true;
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#ptSave');if(!btn)return;
    runWhenIdle(()=>send('pt'),1800);
  },false);
}

function configureBackend"""
t2,n=re.subn(pattern,new,t,count=1)
if n!=1: raise SystemExit(f'PT email hook patch count={n}')
t2=t2.replace("window.__tbmEmailReportVersion='2026.09.04.6-gmail-test';","window.__tbmEmailReportVersion='2026.09.04.7-stable-idle';",1)
write(p,t2)

# 6) Backend Vercel: permitir app no GitHub Pages e no próprio domínio Vercel.
p='api/send-report.js'
t=read(p)
t=t.replace("const DEFAULT_ALLOWED_ORIGIN='https://jonatasmarruda-prog.github.io';\nconst REPORT_EMAIL_TO='Jonatasmarruda@gmail.com';\nconst REPORT_EMAIL_FROM='onboarding@resend.dev';","const DEFAULT_ALLOWED_ORIGINS=['https://jonatasmarruda-prog.github.io','https://app-inspecao-incendio.vercel.app'];\nconst REPORT_EMAIL_TO=process.env.REPORT_EMAIL_TO||'Jonatasmarruda@gmail.com';\nconst REPORT_EMAIL_FROM=process.env.REPORT_EMAIL_FROM||'onboarding@resend.dev';",1)
pattern=r"function setCors\(res,origin\)\{[\s\S]*?\n\}"
new="""function allowedOrigins(){
  const extra=[process.env.ALLOWED_ORIGIN,process.env.ALLOWED_ORIGINS].filter(Boolean).flatMap(v=>String(v).split(',')).map(v=>v.trim()).filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS,...extra]);
}
function setCors(res,origin){
  if(allowedOrigins().has(origin))res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');
}"""
t2,n=re.subn(pattern,new,t,count=1)
if n!=1: raise SystemExit(f'api cors patch count={n}')
t2=t2.replace("""  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'method_not_allowed'});

  const allowed=process.env.ALLOWED_ORIGIN||DEFAULT_ALLOWED_ORIGIN;
  if(origin!==allowed)return res.status(403).json({ok:false,error:'origin_not_allowed'});

  const apiKey=process.env.RESEND_API_KEY;
  const to=REPORT_EMAIL_TO;
  const from=REPORT_EMAIL_FROM;""","""  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method==='GET')return res.status(200).json({ok:true,service:'send-report',configured:Boolean(process.env.RESEND_API_KEY)});
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'method_not_allowed'});
  if(!allowedOrigins().has(origin))return res.status(403).json({ok:false,error:'origin_not_allowed'});

  const apiKey=process.env.RESEND_API_KEY;
  const to=REPORT_EMAIL_TO;
  const from=REPORT_EMAIL_FROM;""",1)
write(p,t2)

# 7) Loader: versões novas dos módulos corrigidos.
p='sst-repair-loader.js'
t=read(p)
for a,b in [
  ('save-button-fix.js?v=20260904-01','save-button-fix.js?v=20260904-02'),
  ('cloud-cross-device.js?v=20260903-04','cloud-cross-device.js?v=20260904-05'),
  ('email-relatorio-auto.js?v=20260904-06','email-relatorio-auto.js?v=20260904-07'),
  ('premium-ux.js?v=20260903-03','premium-ux.js?v=20260904-04'),
  ('mobile-interaction-fix.js?v=20260904-01','mobile-interaction-fix.js?v=20260904-02')]:
    if a not in t: raise SystemExit(f'loader version anchor missing: {a}')
    t=t.replace(a,b,1)
write(p,t)

# 8) Index: remover carregamento duplicado do delete-draft e atualizar cache-bust sem tocar no formulário.
p='index.html'
t=read(p)
t=t.replace('./extintor-enhancements.js?v=20260903-01','./extintor-enhancements.js?v=20260904-02',1)
t=t.replace('./sst-repair-loader.js?v=20260903-23','./sst-repair-loader.js?v=20260904-01',1)
old='<script src="./delete-draft.js?v=20260903-02"></script><script src="./delete-draft.js?v=20260903-01"></script>'
new='<script src="./delete-draft.js?v=20260904-01"></script>'
if old not in t: raise SystemExit('duplicate delete script anchor missing')
write(p,t.replace(old,new,1))

# 9) Cache da PWA: nova versão apenas para invalidar scripts antigos.
for p in ['service-worker.js','sw.js']:
    t=read(p)
    if 'inspecao-sst-v66' not in t: raise SystemExit(f'cache v66 missing in {p}')
    t=t.replace('inspecao-sst-v66','inspecao-sst-v67').replace("?v=66","?v=67")
    write(p,t)

# Guardas de auditoria: nenhum PDF/formulário foi alterado.
assert 'body.observe(document.body,{childList:true,subtree:true,attributes:true' not in read('premium-ux.js')
assert "if(MOBILE_DEVICE){" in read('cloud-cross-device.js')
assert read('index.html').count('delete-draft.js')==1
assert "https://app-inspecao-incendio.vercel.app" in read('api/send-report.js')
print('stability patch complete')
