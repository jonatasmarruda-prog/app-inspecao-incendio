'use strict';

const {initializeApp}=require('firebase-admin/app');
const {getStorage}=require('firebase-admin/storage');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {Resend}=require('resend');

initializeApp();

const RESEND_API_KEY=defineSecret('RESEND_API_KEY');
const REPORT_EMAIL_TO=defineSecret('REPORT_EMAIL_TO');
const REPORT_EMAIL_FROM=defineSecret('REPORT_EMAIL_FROM');
const REGION='southamerica-east1';
const MAX_ATTACHMENT_BYTES=20*1024*1024;

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function safeName(v){return String(v||'Relatorio_SST.pdf').replace(/[\r\n\\/]+/g,'_').slice(0,180)}

exports.sendInspectionReport=onCall({
  region:REGION,
  timeoutSeconds:120,
  memory:'512MiB',
  secrets:[RESEND_API_KEY,REPORT_EMAIL_TO,REPORT_EMAIL_FROM]
},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Autenticação obrigatória.');
  const data=request.data||{};
  const uid=request.auth.uid;
  const storagePath=String(data.storagePath||'');
  const reportId=String(data.reportId||'').trim();
  const filename=safeName(data.filename);
  const fingerprint=String(data.fingerprint||'').trim();
  const allowedPrefix=`report-emails/${uid}/`;

  if(!storagePath.startsWith(allowedPrefix))throw new HttpsError('permission-denied','Arquivo fora da área autorizada.');
  if(!reportId||!fingerprint)throw new HttpsError('invalid-argument','Identificação do relatório incompleta.');

  const bucket=getStorage().bucket();
  const file=bucket.file(storagePath);
  const [exists]=await file.exists();
  if(!exists)throw new HttpsError('not-found','PDF temporário não encontrado.');

  const [meta]=await file.getMetadata();
  const size=Number(meta.size||0);
  if(!size||size>MAX_ATTACHMENT_BYTES){
    throw new HttpsError('resource-exhausted','O PDF excede o limite de 20 MB para envio automático por anexo.');
  }

  const [buffer]=await file.download();
  const resend=new Resend(RESEND_API_KEY.value());
  const to=REPORT_EMAIL_TO.value();
  const from=REPORT_EMAIL_FROM.value();
  if(!to||!from)throw new HttpsError('failed-precondition','Destinatário ou remetente de e-mail não configurado.');

  const reportType=String(data.reportType||'Relatório SST');
  const company=String(data.company||'');
  const sector=String(data.sector||'');
  const subject=`Relatório pronto - ${reportType} - ${reportId}`;
  const html=`
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.55">
      <h2 style="margin:0 0 12px">Relatório SST pronto</h2>
      <p>O relatório <strong>${esc(reportId)}</strong> foi salvo e finalizado no Sistema Profissional SST.</p>
      <p>
        <strong>Tipo:</strong> ${esc(reportType)}<br>
        ${company?`<strong>Empresa:</strong> ${esc(company)}<br>`:''}
        ${sector?`<strong>Setor/local:</strong> ${esc(sector)}<br>`:''}
      </p>
      <p>Uma cópia do PDF segue anexada automaticamente a este e-mail.</p>
      <p style="font-size:12px;color:#6b7280">Envio automático • Sistema Profissional de Inspeção SST</p>
    </div>`;

  let sent;
  try{
    sent=await resend.emails.send({
      from,
      to:[to],
      subject,
      html,
      attachments:[{filename,content:buffer.toString('base64')}]
    });
  }catch(e){
    console.error('[EMAIL SEND]',e);
    throw new HttpsError('internal','Falha ao enviar o relatório por e-mail.');
  }

  try{await file.delete()}catch(e){console.warn('[EMAIL CLEANUP]',e?.message||e)}

  return {sent:true,messageId:sent?.data?.id||'',reportId,filename};
});
