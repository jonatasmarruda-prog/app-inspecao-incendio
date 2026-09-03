(()=>{
'use strict';

/* PDF FINAL — correção de captura + compartilhamento nativo.
   Mantém GPS, fotos, Canvas e histórico intactos. */
let busy=false;
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function getState(){
  try{if(typeof state!=='undefined'&&state&&typeof state==='object')return state}catch(_){ }
  return window.state||window.appState||window.inspectionState||window.currentInspection||null;
}

function ensureId(st){
  let id=String(st?.id||window.currentInspectionId||window.inspectionId||'').trim();
  if(/^INS-[A-Z0-9-]+$/i.test(id)){window.currentInspectionId=id;return id}
  id='INS-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
  window.currentInspectionId=id;
  try{if(st&&typeof st==='object')st.id=id}catch(_){ }
  return id;
}

function snapshotFromDom(){
  const st=getState();
  if(st&&typeof st==='object')return st;
  const v=id=>$(id)?.value||'';
  const type=window.currentInspectionType||window.inspectionType||'fire';
  return {id:ensureId(null),type,company:v('company'),otherCompany:v('otherCompany'),address:v('address'),inspector:v('inspector'),inspectorOther:v('inspectorOther'),role:v('role'),witness:v('witness'),sector:v('sector'),date:new Date().toISOString(),findings:v('findings'),actions:v('actions'),gps:window.currentGPS||window.gps||null,equipment:[],checks:[],photos:[],signature1:'',signature2:''};
}

async function waitImages(root){
  const imgs=[...root.querySelectorAll('img')];
  await Promise.all(imgs.map(img=>new Promise(resolve=>{
    if(img.complete&&img.naturalWidth>0)return resolve();
    const done=()=>{img.removeEventListener('load',done);img.removeEventListener('error',done);resolve()};
    img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});
    setTimeout(done,6000);
  })));
}

async function inlineSameOriginImages(root){
  for(const img of [...root.querySelectorAll('img[src]')]){
    const src=img.getAttribute('src');
    if(!src||src.startsWith('data:')||src.startsWith('blob:'))continue;
    try{
      const u=new URL(src,location.href);
      if(u.origin!==location.origin)continue;
      const res=await fetch(u.href,{cache:'force-cache'});
      if(!res.ok)continue;
      const blob=await res.blob();
      const reader=new FileReader();
      img.src=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
    }catch(e){console.warn('[PDF] imagem não incorporada:',src,e)}
  }
}

function dedupePhotos(root){
  const seen=new Set();
  root.querySelectorAll('.pdf-photo,.pm-photo,.rphotos figure,.photoCard').forEach(card=>{
    const img=card.querySelector('img');
    const key=img?.src||img?.getAttribute('src')||'';
    if(!key)return;
    if(seen.has(key))card.remove();else seen.add(key);
  });
}

function transferFormState(source,clone){
  const a=source.querySelectorAll('input,textarea,select'),b=clone.querySelectorAll('input,textarea,select');
  a.forEach((el,i)=>{const c=b[i];if(!c)return;c.value=el.value;if(el.type==='checkbox'||el.type==='radio')c.checked=el.checked});
  const ca=source.querySelectorAll('canvas'),cb=clone.querySelectorAll('canvas');
  ca.forEach((c,i)=>{const d=cb[i];if(!d)return;d.width=c.width;d.height=c.height;const ctx=d.getContext('2d');if(ctx)ctx.drawImage(c,0,0)});
}

function styleRoot(root){
  root.style.cssText='position:fixed!important;left:0!important;top:0!important;width:794px!important;max-width:794px!important;margin:0!important;padding:0!important;background:#fff!important;color:#111!important;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;z-index:-1!important;overflow:visible!important;';
  root.querySelectorAll('*').forEach(el=>{el.style.boxSizing='border-box'});
  root.querySelectorAll('.pdf-enterprise,.pdfMaster,.pdf-page,.pm-page').forEach(el=>{el.style.width='100%';el.style.maxWidth='none';el.style.margin='0';el.style.padding='0';el.style.background='#fff';el.style.color='#111'});
  root.querySelectorAll('table,.pdf-section,.pdf-photo,.pm-section,.pm-photo,.pdf-signatures,.pdf-signature,.pm-signatures,.pm-sign').forEach(el=>{el.style.breakInside='avoid';el.style.pageBreakInside='avoid'});
  root.querySelectorAll('img').forEach(img=>{img.style.maxWidth='100%';img.style.objectFit='contain';img.style.objectPosition='center'});
}

function buildRoot(st){
  const root=document.createElement('div');root.id='tbmPdfFinalRender';
  if(typeof window.reportHTML==='function')root.innerHTML=window.reportHTML(st)||'';
  if(!root.innerHTML.trim()){
    const source=$('reportContent')||$('report')||$('reportContainer')||document.querySelector('.reportShell');
    if(source)root.innerHTML=source.innerHTML;
  }
  if(!root.textContent.trim()&&!root.querySelector('img,table,canvas'))throw new Error('O conteúdo do relatório não foi montado.');
  return root;
}

function ensureButtons(){
  const pdf=$('pdf');if(pdf){pdf.textContent='📄 GERAR E COMPARTILHAR PDF';pdf.type='button'}
  const share=$('reportShare');if(share){share.textContent='📤 Compartilhar PDF';share.type='button'}
}

function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}

async function makePdfFinal(){
  if(busy)return;busy=true;
  let root=null;
  try{
    if(typeof window.html2pdf!=='function')throw new Error('Biblioteca html2pdf não carregada.');
    const st=snapshotFromDom();
    const id=ensureId(st);
    root=buildRoot(st);
    styleRoot(root);
    document.body.appendChild(root);
    await sleep(150);
    void root.offsetHeight;
    await inlineSameOriginImages(root);
    dedupePhotos(root);
    await waitImages(root);
    await sleep(1000);
    window.scrollTo(0,0);
    void root.offsetHeight;

    const filename='Laudo_Inspecao_'+id+'.pdf';
    const opt={
      margin:[30,20,20,30],
      filename,
      image:{type:'jpeg',quality:0.82},
      html2canvas:{scale:1,useCORS:true,allowTaint:false,backgroundColor:'#fff',logging:false,imageTimeout:10000,scrollX:0,scrollY:0,windowWidth:794,width:794},
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
      pagebreak:{mode:['css','legacy'],avoid:['.pdf-section','.pdf-photo','.pdf-signature','.pdf-summary','.pm-section','.pm-photo','.pm-signature']}
    };
    const worker=html2pdf().set(opt).from(root).toContainer().toCanvas().toPdf();
    const blob=await worker.outputPdf('blob');
    if(!blob||blob.size<1500)throw new Error('O PDF foi gerado sem conteúdo.');
    const file=new File([blob],filename,{type:'application/pdf'});
    if(navigator.share&&navigator.canShare){
      try{if(navigator.canShare({files:[file]})){await navigator.share({title:'Laudo de Inspeção SST',text:'Laudo de inspeção '+id,files:[file]});return}}catch(e){if(e?.name==='AbortError')return;console.warn('[PDF] Share indisponível:',e)}
    }
    download(blob,filename);
  }catch(e){console.error('[PDF FINAL]',e);alert('Não foi possível gerar o PDF: '+(e?.message||e))}
  finally{if(root)root.remove();busy=false}
}

window.makePdf=makePdfFinal;
window.gerarPDF=makePdfFinal;
window.compartilharPDF=makePdfFinal;
window.gerarRelatorioPDF=makePdfFinal;

function bind(){
  ensureButtons();
  ['pdf','reportPdf','reportShare'].forEach(id=>{
    const b=$(id);if(!b||b.dataset.tbmFinalPdf)return;
    b.dataset.tbmFinalPdf='1';
    b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();makePdfFinal()},true);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
setTimeout(bind,500);setTimeout(bind,1500);setTimeout(bind,3000);
})();
