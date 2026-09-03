(()=>{
'use strict';
/* PDF FINAL v4 — captura robusta, estado preservado, ABNT, compartilhamento nativo. */
let busy=false;
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function getState(){
  try{if(typeof state!=='undefined'&&state&&typeof state==='object')return state}catch(_){}
  return window.state||window.appState||window.inspectionState||window.currentInspection||{};
}

function getId(st){
  const candidates=[
    st?.id,
    window.currentInspectionId,
    window.inspectionId,
    window.idGerado,
    document.querySelector('[data-inspection-id]')?.dataset?.inspectionId,
    document.getElementById('inspectionId')?.value,
    document.querySelector('.reportNo')?.textContent,
    document.querySelector('.pdf-id')?.textContent
  ];
  for(const value of candidates){
    const text=String(value??'').trim();
    const match=text.match(/INS-[A-Z0-9]+(?:-[A-Z0-9]+)*/i);
    if(match){
      window.currentInspectionId=match[0];
      try{if(st&&typeof st==='object'&&!st.id)st.id=match[0]}catch(_){}
      return match[0];
    }
  }
  const id='INS-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
  window.currentInspectionId=id;
  try{if(st&&typeof st==='object'&&!st.id)st.id=id}catch(_){}
  return id;
}

async function waitFonts(){
  try{if(document.fonts?.ready)await document.fonts.ready}catch(_){}
}

async function waitImages(root){
  const imgs=[...root.querySelectorAll('img')];
  await Promise.all(imgs.map(img=>new Promise(resolve=>{
    if(img.complete&&img.naturalWidth>0)return resolve();
    let done=false;
    const finish=()=>{if(done)return;done=true;img.removeEventListener('load',finish);img.removeEventListener('error',finish);resolve()};
    img.addEventListener('load',finish,{once:true});
    img.addEventListener('error',finish,{once:true});
    setTimeout(finish,10000);
  })));
}

async function inlineSameOriginImages(root){
  for(const img of [...root.querySelectorAll('img[src]')]){
    const src=img.getAttribute('src');
    if(!src||src.startsWith('data:')||src.startsWith('blob:'))continue;
    try{
      const url=new URL(src,location.href);
      if(url.origin!==location.origin)continue;
      const response=await fetch(url.href,{cache:'force-cache'});
      if(!response.ok)continue;
      const blob=await response.blob();
      const reader=new FileReader();
      const data=await new Promise((resolve,reject)=>{
        reader.onload=()=>resolve(reader.result);
        reader.onerror=reject;
        reader.readAsDataURL(blob);
      });
      img.src=data;
    }catch(e){console.warn('[PDF] imagem externa mantida:',src,e)}
  }
}

function transferFields(source,clone){
  const original=source.querySelectorAll('input,textarea,select');
  const copied=clone.querySelectorAll('input,textarea,select');
  original.forEach((el,index)=>{
    const target=copied[index];
    if(!target)return;
    target.value=el.value;
    if(el.type==='checkbox'||el.type==='radio')target.checked=el.checked;
  });
  const originalCanvases=source.querySelectorAll('canvas');
  const copiedCanvases=clone.querySelectorAll('canvas');
  originalCanvases.forEach((canvas,index)=>{
    const target=copiedCanvases[index];
    if(!target)return;
    target.width=canvas.width;
    target.height=canvas.height;
    const ctx=target.getContext('2d');
    if(ctx)ctx.drawImage(canvas,0,0);
  });
}

function dedupePhotos(root){
  const seen=new Set();
  root.querySelectorAll('.photoCard,.pdf-photo,.pm-photo,.rphotos figure,.pdf-photo-grid figure').forEach(card=>{
    const img=card.querySelector('img');
    if(!img)return;
    const key=img.getAttribute('src')||img.src||'';
    if(!key)return;
    if(seen.has(key))card.remove();
    else seen.add(key);
  });
}

function findVisibleReport(){
  const content=$('reportContent');
  if(content&&content.innerHTML.trim())return content;
  return document.querySelector('#report .reportShell')||document.querySelector('.reportPage')||document.querySelector('.pdf-enterprise');
}

function buildReport(st){
  const source=findVisibleReport();
  const root=document.createElement('div');
  root.id='tbmPdfFinalRender';
  if(source){
    root.innerHTML=source.innerHTML;
    transferFields(source,root);
  }
  if(!root.innerHTML.trim()&&typeof window.reportHTML==='function'){
    root.innerHTML=window.reportHTML(st)||'';
  }
  if(!root.textContent.trim()&&!root.querySelector('img,table,canvas')){
    throw new Error('O conteúdo do relatório está vazio. Abra ou gere o relatório antes de exportar.');
  }
  return root;
}

function styleRoot(root){
  Object.assign(root.style,{
    position:'absolute',left:'0',top:'0',width:'794px',maxWidth:'794px',
    margin:'0',padding:'0',background:'#fff',color:'#111',display:'block',
    visibility:'visible',opacity:'1',pointerEvents:'none',zIndex:'2147483000',overflow:'visible',
    fontFamily:'Arial,Helvetica,sans-serif'
  });
  root.querySelectorAll('*').forEach(el=>{
    el.style.boxSizing='border-box';
    el.style.visibility='visible';
    el.style.opacity='1';
    el.style.fontFamily='Arial,Helvetica,sans-serif';
  });
  root.querySelectorAll('.pdf-enterprise,.pdf-page,.reportPage,.reportShell').forEach(el=>{
    el.style.background='#fff';
    el.style.color='#111';
    el.style.margin='0';
    el.style.maxWidth='none';
  });
  root.querySelectorAll('.no-print,button,input,textarea,select').forEach(el=>el.style.display='none');
  root.querySelectorAll('table,.pdf-section,.rsection,.pdf-photo,.rphotos,.rsig,.pdf-signatures,.pdf-signature,.pdf-summary,.photoCard').forEach(el=>{
    el.style.breakInside='avoid';
    el.style.pageBreakInside='avoid';
  });
  root.querySelectorAll('img').forEach(img=>{
    img.style.maxWidth='100%';
    img.style.height=img.style.height||'auto';
    img.style.objectFit='contain';
    img.style.objectPosition='center';
    img.removeAttribute('loading');
  });
}

function injectPrintCss(){
  if($('tbmPdfFinalPrintCss'))return;
  const style=document.createElement('style');
  style.id='tbmPdfFinalPrintCss';
  style.textContent=`
    .tbmPdfFinalExport{font-family:Arial,Helvetica,sans-serif!important;background:#fff!important;color:#111!important;font-size:12pt!important;line-height:1.5!important}
    .tbmPdfFinalExport *{font-family:Arial,Helvetica,sans-serif!important;color:#111}
    .tbmPdfFinalExport .pdf-section,.tbmPdfFinalExport .rsection,.tbmPdfFinalExport table,.tbmPdfFinalExport .pdf-photo,.tbmPdfFinalExport .rphotos,.tbmPdfFinalExport .rsig,.tbmPdfFinalExport .pdf-signatures,.tbmPdfFinalExport .pdf-signature,.tbmPdfFinalExport .pdf-summary{break-inside:avoid!important;page-break-inside:avoid!important}
    .tbmPdfFinalExport .pdf-section-title,.tbmPdfFinalExport .rtitle{background:#f4f4f4!important;color:#111!important;font-size:14pt!important;font-weight:700!important;padding:8px!important}
    .tbmPdfFinalExport .pdf-title{font-size:16pt!important;font-weight:700!important}
    .tbmPdfFinalExport .pdf-table th,.tbmPdfFinalExport .pdf-table td{font-size:12pt!important;color:#111!important;border:1px solid #ddd!important}
    .tbmPdfFinalExport .pdf-table th{background:#f2f2f2!important}
    .tbmPdfFinalExport .pdf-photo img,.tbmPdfFinalExport .rphotos img{object-fit:contain!important;height:185px!important;width:100%!important}
    .tbmPdfFinalExport .pdf-id,.tbmPdfFinalExport .reportNo{white-space:nowrap!important;overflow:visible!important;word-break:normal!important}
    @page{size:A4 portrait;margin:30mm 20mm 20mm 30mm}
  `;
  document.head.appendChild(style);
}

async function makePdfFinal(forceShare=true){
  if(busy)return;
  busy=true;
  let root=null;
  try{
    if(typeof window.html2pdf!=='function')throw new Error('Biblioteca html2pdf não carregada.');
    injectPrintCss();
    window.scrollTo(0,0);
    const st=getState()||{};
    const id=getId(st);
    root=buildReport(st);
    root.classList.add('tbmPdfFinalExport');
    styleRoot(root);
    document.body.appendChild(root);
    await sleep(150);
    await waitFonts();
    await inlineSameOriginImages(root);
    dedupePhotos(root);
    await waitImages(root);
    await sleep(1000);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    window.scrollTo(0,0);
    void root.offsetHeight;

    const filename='Laudo_Inspecao_'+id+'.pdf';
    const opt={
      margin:[30,30,20,20],
      filename,
      image:{type:'jpeg',quality:0.86},
      html2canvas:{
        scale:1.25,
        useCORS:true,
        allowTaint:false,
        backgroundColor:'#fff',
        logging:false,
        imageTimeout:15000,
        removeContainer:true,
        scrollX:0,
        scrollY:0,
        windowWidth:794,
        width:794
      },
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
      pagebreak:{
        mode:['avoid-all','css','legacy'],
        avoid:['.pdf-section','.rsection','.pdf-photo','.rphotos figure','.pdf-signature','.rsig','.pdf-summary','table','tr']
      }
    };

    const worker=window.html2pdf().set(opt).from(root).toContainer().toCanvas().toPdf();
    const pdf=await worker.get('pdf');
    if(!pdf)throw new Error('Não foi possível finalizar o documento PDF.');
    const blob=pdf.output('blob');
    if(!blob||blob.size<1500)throw new Error('O PDF foi gerado sem conteúdo.');

    const file=new File([blob],filename,{type:'application/pdf'});
    if(forceShare&&navigator.share&&navigator.canShare){
      try{
        if(navigator.canShare({files:[file]})){
          await navigator.share({
            title:'Laudo de Inspeção SST',
            text:'Laudo de inspeção de segurança — '+id,
            files:[file]
          });
          return;
        }
      }catch(e){
        if(e?.name==='AbortError')return;
        console.warn('[PDF] compartilhamento não concluído:',e);
      }
    }

    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename;
    a.rel='noopener';
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){
    console.error('[PDF FINAL v4]',e);
    alert('Não foi possível gerar o PDF: '+(e?.message||e));
  }finally{
    if(root)root.remove();
    busy=false;
  }
}

window.makePdfFinal=makePdfFinal;
window.makePdf=makePdfFinal;
window.gerarPDF=makePdfFinal;
window.compartilharPDF=()=>makePdfFinal(true);
window.gerarRelatorioPDF=makePdfFinal;

function bindButtons(){
  const pdf=$('pdf');
  if(pdf&&!pdf.dataset.tbmPdfFinal){
    pdf.dataset.tbmPdfFinal='1';
    pdf.type='button';
    pdf.textContent='📄 GERAR E COMPARTILHAR PDF';
    pdf.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();makePdfFinal(true)},true);
  }
  const reportPdf=$('reportPdf');
  if(reportPdf&&!reportPdf.dataset.tbmPdfFinal){
    reportPdf.dataset.tbmPdfFinal='1';
    reportPdf.type='button';
    reportPdf.textContent='⬇️ BAIXAR PDF';
    reportPdf.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();makePdfFinal(false)},true);
  }
  const reportShare=$('reportShare');
  if(reportShare&&!reportShare.dataset.tbmPdfFinal){
    reportShare.dataset.tbmPdfFinal='1';
    reportShare.type='button';
    reportShare.textContent='📤 COMPARTILHAR PDF';
    reportShare.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();makePdfFinal(true)},true);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindButtons,{once:true});
else bindButtons();
[300,800,1500,3000,5000].forEach(t=>setTimeout(bindButtons,t));
})();
