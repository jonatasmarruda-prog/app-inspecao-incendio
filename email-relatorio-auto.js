(()=>{
'use strict';

/*
  Envio automático e NÃO BLOQUEANTE de cópia do PDF após salvamento manual.
  Backend seguro: Vercel Serverless Function -> Resend.
  A chave do Resend nunca fica no navegador.
*/
const STATUS_KEY='tbm-sst-email-status-v1';
const ENABLE_KEY='tbm-sst-email-enabled-v1';
const ENDPOINT_KEY='tbm-sst-email-endpoint-v1';
const DEFAULT_ENDPOINT='https://app-inspecao-incendio.vercel.app/api/send-report';
const MAX_PDF_BYTES=3_000_000;
let sending=false;
let ptHookInstalled=false;

function currentState(){try{return state||window.state||null}catch(_){return window.state||null}}
function isPtOpen(){const el=document.getElementById('ptAlturaOverlay');return !!el&&!el.classList.contains('hidden')}
function enabled(){try{return localStorage.getItem(ENABLE_KEY)!=='0'}catch(_){return true}}
function setEnabled(v){try{localStorage.setItem(ENABLE_KEY,v?'1':'0')}catch(_){ }}
function endpoint(){try{return String(localStorage.getItem(ENDPOINT_KEY)||window.TBM_EMAIL_ENDPOINT||DEFAULT_ENDPOINT||'').trim()}catch(_){return String(window.TBM_EMAIL_ENDPOINT||DEFAULT_ENDPOINT||'').trim()}}
function setEndpoint(v){try{localStorage.setItem(ENDPOINT_KEY,String(v||'').trim())}catch(_){ }}
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
  clearTimeout(el.__timer);el.__timer=setTimeout(()=>{el.style.opacity='0'},4300);
}

async function sha256(blob){
  const buf=await blob.arrayBuffer();
  const hash=await crypto.subtle.digest('SHA-256',buf);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

function blobToBase64(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');
    reader.onerror=()=>reject(reader.error||new Error('Falha ao preparar PDF para envio.'));
    reader.readAsDataURL(blob);
  });
}

function dateStamp(){const d=new Date();return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`}
function emailFilename(mode,original){
  if(mode==='pt')return `Permissao_de_Trabalho_Altura_${dateStamp()}.pdf`;
  try{if(typeof window.gerarNomeArquivoPdf==='function')return window.gerarNomeArquivoPdf()}catch(_){ }
  return original||`Relatorio_SST_${dateStamp()}.pdf`;
}

/*
  Captura o mesmo PDF usado pelo botão normal sem abrir resumo ou download.
  A interceptação dura somente durante a geração e restaura EXATAMENTE a função
  pdfMake anterior, evitando quebrar os wrappers do PDF depois do envio.
*/
async function capturePdf(mode){
  if(!window.pdfMake?.createPdf)throw new Error('PDFMake indisponível.');
  const maker=mode==='pt'?window.makePTAlturaPdf:window.makePdf;
  if(typeof maker!=='function')throw new Error('Gerador de PDF indisponível.');

  return await new Promise(async(resolve,reject)=>{
    const pm=window.pdfMake;
    const previousCreatePdf=pm.createPdf;
    const previousBypass=window.__tbmPdfSummaryBypass;
    let finished=false;
    let restored=false;

    const restore=()=>{
      if(restored)return;restored=true;
      if(pm.createPdf===wrapped)pm.createPdf=previousCreatePdf;
      window.__tbmPdfSummaryBypass=previousBypass;
    };
    const fail=e=>{
      if(finished)return;finished=true;clearTimeout(timer);restore();
      reject(e instanceof Error?e:new Error(String(e||'Falha ao gerar PDF')));
    };
    const done=(blob,sourceFilename)=>{
      if(finished)return;finished=true;clearTimeout(timer);restore();
      resolve({blob,sourceFilename:sourceFilename||'',filename:emailFilename(mode,sourceFilename)});
    };
    const timer=setTimeout(()=>fail(new Error('Tempo excedido ao preparar PDF para e-mail.')),25000);

    function wrapped(docDefinition,...args){
      const real=previousCreatePdf.call(pm,docDefinition,...args);
      return {
        download(filename){try{real.getBlob(blob=>done(blob,filename))}catch(e){fail(e)}},
        getBlob(cb){return real.getBlob(cb)},
        open(...a){return real.open?.(...a)},
        print(...a){return real.print?.(...a)},
        getBuffer(...a){return real.getBuffer?.(...a)},
        getBase64(...a){return real.getBase64?.(...a)},
        getDataUrl(...a){return real.getDataUrl?.(...a)}
      };
    }

    window.__tbmPdfSummaryBypass=true;
    pm.createPdf=wrapped;
    try{
      const p=maker.call(window,'download');
      if(p&&typeof p.then==='function')await p;
    }catch(e){fail(e)}
  });
}

function reportMeta(mode,pdf){
  if(mode==='pt'){
    const m=String(pdf?.sourceFilename||'').match(/PT_Trabalho_Altura_(.+)\.pdf$/i);
    return {id:m?.[1]||`PT-${Date.now()}`,type:'PT - Trabalho em Altura',company:'TBM',sector:''};
  }
  const st=currentState()||{};
  return {id:String(st.id||'SEM-ID'),type:String(st.title||st.type||'Relatório SST'),company:String(st.company||''),sector:String(st.sector||'')};
}

function friendlyBackendError(data,status){
  const raw=String(data?.detail||data?.error||`HTTP ${status}`);
  if(/only send testing emails|testing emails|verify a domain/i.test(raw))return 'Resend em modo de teste: é preciso verificar um domínio para enviar ao e-mail corporativo.';
  if(/invalid_api_key|api key is invalid/i.test(raw))return 'A chave do Resend configurada na Vercel não é válida.';
  if(/email_backend_not_configured/i.test(raw))return 'O serviço de e-mail ainda não está configurado na Vercel.';
  if(/pdf_too_large/i.test(raw))return 'O PDF ficou grande demais para o envio automático.';
  return raw;
}

async function postToBackend(url,payload){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),45000);
  try{
    const response=await fetch(url,{method:'POST',mode:'cors',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(friendlyBackendError(data,response.status));
    return data;
  }finally{clearTimeout(timer)}
}

async function send(mode='main'){
  if(sending)return {sent:false,busy:true};
  const url=endpoint();
  if(!enabled()||!url)return {sent:false,skipped:true,reason:'backend-not-enabled'};
  sending=true;
  let meta=null,fingerprint='',filename='';
  try{
    toast('📧 Preparando cópia do relatório…','info');
    const pdf=await capturePdf(mode);
    meta=reportMeta(mode,pdf);
    fingerprint=await sha256(pdf.blob);
    const previous=getStatus(meta.id,fingerprint);
    if(previous?.state==='sent')return {sent:true,duplicate:true};

    filename=cleanPath(pdf.filename.endsWith('.pdf')?pdf.filename:pdf.filename+'.pdf');
    if(pdf.blob.size>MAX_PDF_BYTES){
      saveStatus(meta.id,fingerprint,{state:'pending',filename,error:'pdf_too_large',size:pdf.blob.size});
      throw new Error('PDF muito grande para envio automático.');
    }

    saveStatus(meta.id,fingerprint,{state:'sending',filename,size:pdf.blob.size});
    const pdfBase64=await blobToBase64(pdf.blob);
    const data=await postToBackend(url,{pdfBase64,reportId:meta.id,filename,reportType:meta.type,company:meta.company,sector:meta.sector,fingerprint});

    saveStatus(meta.id,fingerprint,{state:'sent',filename,messageId:data.messageId||'',sentAt:new Date().toISOString()});
    toast('✅ Relatório salvo • cópia enviada por e-mail.','ok');
    window.dispatchEvent(new CustomEvent('tbm-report-email-sent',{detail:{reportId:meta.id,filename}}));
    return {sent:true,...data};
  }catch(e){
    console.error('[E-MAIL RELATÓRIO]',e);
    const msg=String(e?.message||e||'Falha no envio');
    if(meta&&fingerprint)saveStatus(meta.id,fingerprint,{state:'pending',filename,error:msg});
    toast('⚠️ '+msg,'wait');
    window.dispatchEvent(new CustomEvent('tbm-report-email-pending',{detail:{error:msg}}));
    return {sent:false,pending:true,error:msg};
  }finally{sending=false}
}

function installPtSaveHook(){
  if(ptHookInstalled)return;ptHookInstalled=true;
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#ptSave');if(!btn)return;
    setTimeout(async()=>{
      try{
        if(typeof window.savePTAltura==='function')await window.savePTAltura(false,false);
        await send('pt');
      }catch(err){console.warn('[PT EMAIL]',err)}
    },180);
  },false);
}

function configureBackend(url,on=true){
  const clean=String(url||'').trim().replace(/\/+$/,'');
  if(clean&&!/^https:\/\//i.test(clean))throw new Error('O endpoint de e-mail precisa usar HTTPS.');
  setEndpoint(clean);
  setEnabled(Boolean(on&&clean));
  return {endpoint:endpoint(),enabled:enabled()};
}

installPtSaveHook();
window.tbmAutoEmailSavedReport=({mode}={})=>send(mode||(isPtOpen()?'pt':'main'));
window.tbmEnableAutoEmail=v=>{setEnabled(Boolean(v));return enabled()};
window.tbmConfigureEmailBackend=configureBackend;
window.tbmEmailBackendEndpoint=()=>endpoint();
window.tbmAutoEmailEnabled=()=>enabled();
window.tbmEmailReportStatuses=()=>readStatuses();
window.__tbmEmailReportVersion='2026.09.04.5-vercel-pdf-safe';

/* Premium UX carrega depois deste módulo. Reaplica a proteção móvel por fora dele. */
[900,1800,3200].forEach(t=>setTimeout(()=>{try{window.tbmInstallMobilePdfPerformance?.()}catch(_){ }},t));
})();