(()=>{
'use strict';

/*
  Envio automático e NÃO BLOQUEANTE de cópia do PDF após salvamento manual.
  O envio real só é ativado quando o backend Firebase estiver configurado.
  Nenhuma chave de e-mail fica no navegador.
*/
const REGION='southamerica-east1';
const PROJECT_ID='app-inspecao-sst-79aa6';
const STATUS_KEY='tbm-sst-email-status-v1';
const ENABLE_KEY='tbm-sst-email-enabled-v1';
const SDK_STORAGE='https://www.gstatic.com/firebasejs/10.14.1/firebase-storage-compat.js';
const SDK_FUNCTIONS='https://www.gstatic.com/firebasejs/10.14.1/firebase-functions-compat.js';
let sending=false;
let sdkPromise=null;

function currentState(){try{return state||window.state||null}catch(_){return window.state||null}}
function isPtOpen(){const el=document.getElementById('ptAlturaOverlay');return !!el&&!el.classList.contains('hidden')}
function enabled(){try{return localStorage.getItem(ENABLE_KEY)==='1'}catch(_){return false}}
function setEnabled(v){try{localStorage.setItem(ENABLE_KEY,v?'1':'0')}catch(_){ }}
function cleanPath(v){return String(v||'relatorio').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,140)||'relatorio'}
function readStatuses(){try{const x=JSON.parse(localStorage.getItem(STATUS_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch(_){return{}}}
function writeStatuses(x){try{localStorage.setItem(STATUS_KEY,JSON.stringify(x||{}))}catch(_){ }}
function statusKey(reportId,fingerprint){return `${String(reportId||'SEM-ID')}::${fingerprint}`}
function saveStatus(reportId,fingerprint,data){const all=readStatuses();all[statusKey(reportId,fingerprint)]={...data,reportId,fingerprint,updatedAt:new Date().toISOString()};writeStatuses(all)}
function getStatus(reportId,fingerprint){return readStatuses()[statusKey(reportId,fingerprint)]||null}

function toast(text,type='ok'){
  let el=document.getElementById('tbm-email-toast');
  if(!el){el=document.createElement('div');el.id='tbm-email-toast';Object.assign(el.style,{position:'fixed',left:'50%',bottom:'72px',transform:'translateX(-50%)',zIndex:'100002',maxWidth:'calc(100vw - 28px)',padding:'11px 14px',borderRadius:'12px',font:'700 12px Arial,sans-serif',boxShadow:'0 10px 30px #0003',textAlign:'center',transition:'opacity .2s ease'});document.body.appendChild(el)}
  const bg={ok:'#166534',wait:'#92400e',error:'#991b1b',info:'#1d4ed8'};
  el.style.background=bg[type]||bg.info;el.style.color='#fff';el.style.opacity='1';el.textContent=text;
  clearTimeout(el.__timer);el.__timer=setTimeout(()=>{el.style.opacity='0'},3600);
}

function loadScript(src,id){
  return new Promise((resolve,reject)=>{
    if(document.getElementById(id))return resolve();
    const s=document.createElement('script');s.id=id;s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Falha ao carregar '+id));document.head.appendChild(s);
  });
}

async function waitFirebase(timeout=7000){
  const start=Date.now();
  while(Date.now()-start<timeout){if(window.firebase?.apps?.length)return window.firebase;await new Promise(r=>setTimeout(r,150))}
  throw new Error('Firebase ainda não está disponível.');
}

async function ensureServices(){
  if(sdkPromise)return sdkPromise;
  sdkPromise=(async()=>{
    const fb=await waitFirebase();
    if(!fb.storage)await loadScript(SDK_STORAGE,'tbm-firebase-storage-sdk');
    if(!fb.functions)await loadScript(SDK_FUNCTIONS,'tbm-firebase-functions-sdk');
    const auth=fb.auth?.();
    if(auth&&!auth.currentUser)await auth.signInAnonymously();
    if(!auth?.currentUser)throw new Error('Usuário Firebase não autenticado.');
    return {fb,auth,storage:fb.storage(),functions:fb.app().functions(REGION)};
  })().catch(e=>{sdkPromise=null;throw e});
  return sdkPromise;
}

async function sha256(blob){
  const buf=await blob.arrayBuffer();
  const hash=await crypto.subtle.digest('SHA-256',buf);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function pdfNameFallback(mode){
  try{if(typeof window.gerarNomeArquivoPdf==='function')return window.gerarNomeArquivoPdf()}catch(_){ }
  const d=new Date();const dd=String(d.getDate()).padStart(2,'0'),mm=String(d.getMonth()+1).padStart(2,'0'),yyyy=d.getFullYear();
  return mode==='pt'?`Permissao_de_Trabalho_Altura_${dd}-${mm}-${yyyy}.pdf`:`Relatorio_SST_${dd}-${mm}-${yyyy}.pdf`;
}

/*
  Captura o MESMO docDefinition usado pelo gerador atual sem alterar layout, cores ou tabelas.
  O método download() é interceptado apenas durante esta geração de background e convertido em Blob.
*/
async function capturePdf(mode){
  if(!window.pdfMake?.createPdf)throw new Error('PDFMake indisponível.');
  const maker=mode==='pt'?window.makePTAlturaPdf:window.makePdf;
  if(typeof maker!=='function')throw new Error('Gerador de PDF indisponível.');

  return await new Promise(async(resolve,reject)=>{
    const pm=window.pdfMake;
    const original=pm.createPdf.bind(pm);
    let finished=false;
    const restore=()=>{if(pm.createPdf===wrapped)pm.createPdf=original};
    const fail=e=>{if(finished)return;finished=true;restore();reject(e instanceof Error?e:new Error(String(e||'Falha ao gerar PDF')))};
    const done=(blob,filename)=>{if(finished)return;finished=true;restore();resolve({blob,filename:pdfNameFallback(mode)||filename})};
    const timer=setTimeout(()=>fail(new Error('Tempo excedido ao gerar PDF para e-mail.')),45000);

    function wrapped(docDefinition,...args){
      const real=original(docDefinition,...args);
      return {
        download(filename){
          try{real.getBlob(blob=>{clearTimeout(timer);done(blob,filename)})}catch(e){clearTimeout(timer);fail(e)}
        },
        getBlob(cb){return real.getBlob(cb)},
        open(...a){return real.open?.(...a)},
        print(...a){return real.print?.(...a)},
        getBuffer(...a){return real.getBuffer?.(...a)},
        getBase64(...a){return real.getBase64?.(...a)},
        getDataUrl(...a){return real.getDataUrl?.(...a)}
      };
    }

    pm.createPdf=wrapped;
    try{
      const p=maker.call(window,'__email_background__');
      setTimeout(()=>document.getElementById('modal')?.classList.add('hidden'),0);
      if(p&&typeof p.then==='function')await p;
    }catch(e){clearTimeout(timer);fail(e)}
  });
}

function reportMeta(mode){
  if(mode==='pt'){
    return {id:String(window.__tbmCurrentPtId||document.querySelector('#ptAlturaBody [data-pt-field]')?.closest?.('[data-id]')?.dataset?.id||currentState()?.id||'PT'),type:'PT - Trabalho em Altura',company:'TBM',sector:''};
  }
  const st=currentState()||{};
  return {id:String(st.id||'SEM-ID'),type:String(st.title||st.type||'Relatório SST'),company:String(st.company||''),sector:String(st.sector||'')};
}

async function send(mode='main'){
  if(sending)return {sent:false,busy:true};
  if(!enabled())return {sent:false,skipped:true,reason:'backend-not-enabled'};
  sending=true;
  try{
    toast('📧 Preparando cópia do relatório…','info');
    const pdf=await capturePdf(mode);
    const meta=reportMeta(mode);
    const fingerprint=await sha256(pdf.blob);
    const previous=getStatus(meta.id,fingerprint);
    if(previous?.state==='sent')return {sent:true,duplicate:true};

    const svc=await ensureServices();
    const uid=svc.auth.currentUser.uid;
    const filename=cleanPath(pdf.filename.endsWith('.pdf')?pdf.filename:pdf.filename+'.pdf');
    const reportId=cleanPath(meta.id);
    const storagePath=`report-emails/${uid}/${reportId}/${fingerprint.slice(0,20)}-${filename}`;
    saveStatus(meta.id,fingerprint,{state:'uploading',filename,storagePath});

    await svc.storage.ref(storagePath).put(pdf.blob,{contentType:'application/pdf',customMetadata:{reportId:meta.id,reportType:meta.type||'',fingerprint}});
    saveStatus(meta.id,fingerprint,{state:'sending',filename,storagePath});

    const callable=svc.functions.httpsCallable('sendInspectionReport');
    const result=await callable({storagePath,reportId:meta.id,filename,reportType:meta.type,company:meta.company,sector:meta.sector,fingerprint,projectId:PROJECT_ID});
    const data=result?.data||{};
    saveStatus(meta.id,fingerprint,{state:'sent',filename,messageId:data.messageId||'',sentAt:new Date().toISOString()});
    toast('✅ Relatório salvo • cópia enviada por e-mail.','ok');
    window.dispatchEvent(new CustomEvent('tbm-report-email-sent',{detail:{reportId:meta.id,filename}}));
    return {sent:true,...data};
  }catch(e){
    console.error('[E-MAIL RELATÓRIO]',e);
    const msg=String(e?.message||e||'Falha no envio');
    toast('⚠️ Relatório salvo • envio de e-mail pendente.','wait');
    window.dispatchEvent(new CustomEvent('tbm-report-email-pending',{detail:{error:msg}}));
    return {sent:false,pending:true,error:msg};
  }finally{sending=false}
}

window.tbmAutoEmailSavedReport=({mode}={})=>send(mode||(isPtOpen()?'pt':'main'));
window.tbmEnableAutoEmail=v=>{setEnabled(Boolean(v));return enabled()};
window.tbmAutoEmailEnabled=()=>enabled();
window.tbmEmailReportStatuses=()=>readStatuses();
window.__tbmEmailReportVersion='2026.09.04.1';
})();