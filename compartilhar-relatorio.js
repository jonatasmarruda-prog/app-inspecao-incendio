(()=>{
'use strict';

/*
  PDF FINAL — correção de renderização.
  Não altera câmera, canvas de assinatura, GPS ou armazenamento.
  O relatório é reconstruído a partir do estado atual, em um palco
  independente e visível, evitando clone oculto/estado perdido.
*/
const $=s=>document.querySelector(s);
const LOGO_FILE='Têxtil Bezerra de Menezes 2.jpeg';
const PDF_PREFIX='Laudo_Inspecao_';

function getCurrent(){
  try{
    if(window.current&&typeof window.current==='object')return window.current;
    if(window.currentInspection&&typeof window.currentInspection==='object')return window.currentInspection;
    if(window.inspection&&typeof window.inspection==='object')return window.inspection;
  }catch(_){}
  const keys=['currentInspection','currentInspectionData','draftInspection','inspectionDraft','inspection'];
  for(const k of keys){
    try{
      const raw=localStorage.getItem(k);
      if(!raw)continue;
      const x=JSON.parse(raw);
      if(x&&typeof x==='object')return x;
    }catch(_){}
  }
  return {};
}

function getId(){
  const x=getCurrent();
  const candidates=[
    x?.id,x?.inspectionId,x?.idInspecao,x?.numeroInspecao,
    document.querySelector('[data-inspection-id]')?.dataset.inspectionId,
    document.querySelector('#inspectionId')?.value,
    document.querySelector('#inspectionID')?.value,
    document.querySelector('#idInspecao')?.value
  ];
  for(const v of candidates){
    const id=String(v??'').trim();
    if(id&&id!=='undefined'&&id!=='null'&&id!=='INS-SEM-ID')return id;
  }
  const root=document.querySelector('#reportContent');
  const text=root?.textContent||'';
  const m=text.match(/(?:N[º°]?|ID)\s*([A-Z]{2,8}-[A-Z0-9-]{6,})/i);
  if(m?.[1])return m[1];
  return 'INS-'+Date.now().toString(36).toUpperCase();
}

function fileName(){return PDF_PREFIX+getId()+'.pdf'}

function css(){
  if(document.getElementById('tbm-pdf-final-css'))return;
  const s=document.createElement('style');
  s.id='tbm-pdf-final-css';
  s.textContent=`
    .tbm-pdf-stage{position:fixed!important;left:-10000px!important;top:0!important;width:794px!important;min-height:1px!important;margin:0!important;padding:0!important;background:#fff!important;color:#111!important;z-index:-1!important;display:block!important;visibility:visible!important;opacity:1!important;overflow:visible!important}
    .tbm-pdf-stage .pdf-enterprise,.tbm-pdf-stage .pdf-page{width:794px!important;max-width:794px!important;margin:0!important;padding:0!important;background:#fff!important;color:#111!important;visibility:visible!important;display:block!important;}
    .tbm-pdf-stage .pdf-section,.tbm-pdf-stage .pdf-table,.tbm-pdf-stage .pdf-photo,.tbm-pdf-stage .pdf-signatures,.tbm-pdf-stage .pdf-signature,.tbm-pdf-stage .pdf-summary{break-inside:avoid!important;page-break-inside:avoid!important}
    .tbm-pdf-stage img{visibility:visible!important;opacity:1!important}
    .pdfShareActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .pdfShareActions button{min-height:44px}
    .pdfShareBtn{background:#175cd3!important;color:#fff!important}
    .pdfDownloadBtn{background:#15803d!important;color:#fff!important}
    .pdfToast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99999;max-width:92vw;padding:12px 16px;border-radius:12px;background:#111827;color:#fff;font:800 12px Arial,sans-serif;box-shadow:0 15px 40px #0004;text-align:center}
    .pdfToast.success{background:#166534}.pdfToast.error{background:#991b1b}
  `;
  document.head.appendChild(s);
}

function toast(text,kind='info'){
  let t=document.getElementById('pdfToast');
  if(!t){t=document.createElement('div');t.id='pdfToast';document.body.appendChild(t)}
  t.className='pdfToast '+kind;t.textContent=text;
  clearTimeout(t._timer);t._timer=setTimeout(()=>t.remove(),4000);
}

function loadScript(src){
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>s.src===src);
    if(existing){
      if(window.html2pdf)resolve();
      else{existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error('Biblioteca PDF indisponível.')),{once:true})}
      return;
    }
    const s=document.createElement('script');s.src=src;s.async=true;
    s.onload=()=>resolve();s.onerror=()=>reject(new Error('Biblioteca PDF indisponível.'));
    document.head.appendChild(s);
  });
}

async function ensurePdf(){
  if(window.html2pdf)return true;
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
  return !!window.html2pdf;
}

async function logoDataUrl(){
  try{
    const response=await fetch('./'+encodeURIComponent(LOGO_FILE),{cache:'no-store'});
    if(!response.ok)throw new Error('Logo HTTP '+response.status);
    const blob=await response.blob();
    return await new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve(String(r.result));
      r.onerror=reject;
      r.readAsDataURL(blob);
    });
  }catch(e){
    console.warn('Logo em Base64 indisponível; usando caminho local.',e);
    return '';
  }
}

async function waitImages(root){
  const imgs=[...root.querySelectorAll('img')];
  await Promise.all(imgs.map(img=>new Promise(resolve=>{
    if(img.complete&&img.naturalWidth>0)return resolve();
    let done=false;
    const finish=()=>{if(done)return;done=true;resolve()};
    img.onload=finish;img.onerror=finish;
    setTimeout(finish,15000);
  })));
}

async function waitFonts(){
  try{if(document.fonts?.ready)await document.fonts.ready}catch(_){}
}

function buildStage(){
  const data=getCurrent();
  let html='';
  if(typeof window.reportHTML==='function'){
    html=window.reportHTML(data);
  }
  if(!html){
    const existing=document.querySelector('#reportContent .pdf-enterprise,#reportContent .reportPage,#reportContent .reportShell,#reportContent .abnt-report,#reportContent .report');
    if(!existing)throw new Error('Não foi possível localizar o conteúdo do relatório.');
    html=existing.outerHTML;
  }
  const stage=document.createElement('div');
  stage.className='tbm-pdf-stage';
  stage.setAttribute('aria-hidden','true');
  stage.innerHTML=html;
  document.body.appendChild(stage);
  const root=stage.firstElementChild||stage;
  root.style.display='block';root.style.visibility='visible';root.style.opacity='1';
  root.style.position='relative';root.style.margin='0';root.style.padding='0';
  root.style.background='#fff';root.style.color='#111';
  root.querySelectorAll('.no-print,button,input,textarea,select').forEach(el=>el.remove());
  root.querySelectorAll('*').forEach(el=>{
    el.style.visibility='visible';
    el.style.opacity='1';
    el.style.boxSizing='border-box';
  });
  return {stage,root};
}

async function prepareStage(root){
  const logo=await logoDataUrl();
  if(logo){
    root.querySelectorAll('img').forEach(img=>{
      const src=img.getAttribute('src')||'';
      if(src.includes('Têxtil')||decodeURIComponent(src).includes(LOGO_FILE)||src.endsWith('icon.svg'))img.src=logo;
    });
  }
  await waitFonts();
  /* Delay obrigatório para DOM, fontes, Base64 e imagens. */
  await new Promise(r=>setTimeout(r,1000));
  await waitImages(root);
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
}

async function pdfBlob(){
  const oldX=window.scrollX,oldY=window.scrollY;
  let rendered=null;
  try{
    window.scrollTo(0,0);
    rendered=buildStage();
    await prepareStage(rendered.root);
    if(!rendered.root.textContent.trim())throw new Error('O conteúdo do relatório está vazio.');
    if(!window.html2pdf)await ensurePdf();
    const name=fileName();
    const opt={
      margin:[30,20,20,30],
      filename:name,
      image:{type:'jpeg',quality:.88},
      html2canvas:{
        scale:1.25,
        useCORS:true,
        allowTaint:false,
        backgroundColor:'#fff',
        imageTimeout:30000,
        logging:false,
        scrollX:0,
        scrollY:0,
        windowWidth:794,
        width:794
      },
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
      pagebreak:{mode:['avoid-all','css','legacy']}
    };
    const worker=window.html2pdf().set(opt).from(rendered.root);
    await worker.toCanvas();
    await new Promise(r=>requestAnimationFrame(r));
    return await worker.toPdf().outputPdf('blob');
  }finally{
    if(rendered?.stage)rendered.stage.remove();
    window.scrollTo(oldX,oldY);
  }
}

async function share(){
  const buttons=[document.getElementById('reportShare')];
  buttons.forEach(b=>{if(b){b.disabled=true;b.textContent='⏳ GERANDO PDF...'}});
  try{
    const blob=await pdfBlob();
    const name=fileName();
    const file=new File([blob],name,{type:'application/pdf'});
    if(typeof navigator.share==='function'&&typeof navigator.canShare==='function'){
      let can=false;
      try{can=navigator.canShare({files:[file]})}catch(_){}
      if(can){
        try{
          await navigator.share({title:'Laudo de Inspeção SST',text:'Laudo de inspeção de segurança — '+getId(),files:[file]});
          toast('✅ PDF compartilhado','success');
          return;
        }catch(e){
          if(e?.name==='AbortError')return;
        }
      }
    }
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    toast('✅ PDF gerado e salvo no dispositivo','success');
  }catch(e){
    console.error('PDF SST:',e);
    toast('❌ Não foi possível gerar o PDF: '+(e?.message||e),'error');
  }finally{
    buttons.forEach(b=>{if(b){b.disabled=false;b.textContent='📄 GERAR E COMPARTILHAR PDF'}});
  }
}

async function download(){
  try{
    const blob=await pdfBlob();
    const name=fileName();
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    toast('✅ PDF salvo no dispositivo','success');
  }catch(e){
    console.error('PDF SST:',e);
    toast('❌ Falha ao gerar PDF: '+(e?.message||e),'error');
  }
}

function addButton(){
  css();
  let actions=document.querySelector('#form .actions');
  if(!actions)actions=document.querySelector('#reportContent .actions');
  if(!actions)return;
  actions.classList.add('pdfShareActions');
  let b=document.getElementById('reportShare');
  if(!b){
    b=document.createElement('button');
    b.id='reportShare';b.type='button';b.className='btn pdfShareBtn no-print';
    actions.appendChild(b);
  }
  b.textContent='📄 GERAR E COMPARTILHAR PDF';
  b.onclick=share;
  let p=document.getElementById('reportPdf');
  if(p){p.type='button';p.classList.add('pdfDownloadBtn');p.textContent='⬇️ BAIXAR PDF';p.onclick=download}
}

/*
  Se outros módulos chamarem generatePDF/makePdf/gerarPDFMaster, apontamos
  somente a exportação para esta implementação, sem tocar no restante do app.
*/
window.CompartilharRelatorio={sharePDF:share,generatePDF:pdfBlob,downloadPDF:download};
window.tbmGerarPDF=share;
window.tbmDownloadPDF=download;

function start(){
  addButton();
  [300,800,1600,3000,5000].forEach(t=>setTimeout(addButton,t));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
new MutationObserver(()=>addButton()).observe(document.documentElement,{childList:true,subtree:true});
})();
