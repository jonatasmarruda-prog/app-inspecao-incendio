'use strict';

const BACKEND_VERSION='2026.09.04.2-resend-test-owner';
const DEFAULT_ALLOWED_ORIGINS=['https://jonatasmarruda-prog.github.io','https://app-inspecao-incendio.vercel.app'];
const RESEND_TEST_ACCOUNT_EMAIL='jonatasmarruda@gmail.com';
const REPORT_EMAIL_ENV=String(process.env.REPORT_EMAIL_TO||'').trim().toLowerCase();
const REPORT_EMAIL_FROM=String(process.env.REPORT_EMAIL_FROM||'onboarding@resend.dev').trim();
const MAX_BASE64_CHARS=4_100_000;

function allowedOrigins(){
  const extra=[process.env.ALLOWED_ORIGIN,process.env.ALLOWED_ORIGINS].filter(Boolean).flatMap(v=>String(v).split(',')).map(v=>v.trim()).filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS,...extra]);
}
function setCors(res,origin){
  if(allowedOrigins().has(origin))res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');
}

function isResendTestMode(){
  return /^onboarding@resend\.dev$/i.test(REPORT_EMAIL_FROM);
}
function reportRecipient(){
  // A conta Resend em modo de teste só permite enviar para o e-mail do próprio titular.
  // Ignoramos REPORT_EMAIL_TO nesse modo para impedir que uma variável antiga da Vercel
  // faça o backend voltar a responder 403.
  return isResendTestMode()?RESEND_TEST_ACCOUNT_EMAIL:(REPORT_EMAIL_ENV||RESEND_TEST_ACCOUNT_EMAIL);
}

function safeText(value,max=160){
  return String(value||'').replace(/[\r\n\t]+/g,' ').trim().slice(0,max);
}

function safeFilename(value){
  const raw=safeText(value||'Relatorio_SST.pdf',180);
  const clean=raw.replace(/[^a-zA-Z0-9._ -]+/g,'_').replace(/\s+/g,'_');
  return /\.pdf$/i.test(clean)?clean:`${clean||'Relatorio_SST'}.pdf`;
}

function isPdf(buffer){
  return Buffer.isBuffer(buffer)&&buffer.length>=5&&buffer.subarray(0,5).toString('ascii')==='%PDF-';
}

module.exports=async function handler(req,res){
  const origin=String(req.headers.origin||'');
  setCors(res,origin);

  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method==='GET')return res.status(200).json({
    ok:true,
    service:'send-report',
    configured:Boolean(process.env.RESEND_API_KEY),
    version:BACKEND_VERSION,
    recipientMode:isResendTestMode()?'resend-test-owner':'custom-domain'
  });
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'method_not_allowed'});
  if(!allowedOrigins().has(origin))return res.status(403).json({ok:false,error:'origin_not_allowed'});

  const apiKey=process.env.RESEND_API_KEY;
  const to=reportRecipient();
  const from=REPORT_EMAIL_FROM;
  if(!apiKey)return res.status(503).json({ok:false,error:'email_backend_not_configured'});

  const body=req.body&&typeof req.body==='object'?req.body:{};
  const base64=String(body.pdfBase64||'').replace(/^data:application\/pdf;base64,/i,'').trim();
  if(!base64)return res.status(400).json({ok:false,error:'pdf_required'});
  if(base64.length>MAX_BASE64_CHARS)return res.status(413).json({ok:false,error:'pdf_too_large'});

  let pdf;
  try{pdf=Buffer.from(base64,'base64')}catch(_){return res.status(400).json({ok:false,error:'invalid_pdf_base64'})}
  if(!isPdf(pdf))return res.status(400).json({ok:false,error:'invalid_pdf'});

  const reportId=safeText(body.reportId||'SEM-ID',90);
  const reportType=safeText(body.reportType||'Relatório SST',120);
  const company=safeText(body.company||'TBM',120);
  const sector=safeText(body.sector||'',120);
  const filename=safeFilename(body.filename);
  const fingerprint=safeText(body.fingerprint||'',80).replace(/[^a-fA-F0-9]/g,'');
  const subject=`Relatório pronto • ${reportType} • ${reportId}`.slice(0,190);
  const lines=[
    'Relatório de inspeção finalizado.',
    `Tipo: ${reportType}`,
    `ID: ${reportId}`,
    company?`Empresa: ${company}`:'',
    sector?`Setor/local: ${sector}`:'',
    '',
    'A cópia em PDF segue anexada automaticamente pelo Sistema Profissional SST.'
  ].filter(Boolean);

  const payload={
    from,
    to:[to],
    subject,
    text:lines.join('\n'),
    attachments:[{filename,content:base64}]
  };

  const headers={
    'Authorization':`Bearer ${apiKey}`,
    'Content-Type':'application/json'
  };
  if(fingerprint)headers['Idempotency-Key']=`tbm-sst-${fingerprint.slice(0,64)}`;

  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers,body:JSON.stringify(payload)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      console.error('[RESEND]',response.status,data);
      return res.status(502).json({ok:false,error:'resend_error',status:response.status,detail:data?.message||data?.name||''});
    }
    return res.status(200).json({ok:true,messageId:data.id||'',version:BACKEND_VERSION});
  }catch(error){
    console.error('[SEND REPORT]',error);
    return res.status(502).json({ok:false,error:'email_transport_error'});
  }
};
