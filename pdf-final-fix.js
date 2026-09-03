(()=>{
'use strict';

/* Correção final do PDF: captura visível, baixa escala, sem avoid-all,
   ID garantido e compartilhamento nativo. Não altera GPS, fotos ou Canvas. */
let busy=false;
const $=id=>document.getElementById(id);

function getState(){
  try{if(typeof state!=='undefined'&&state)return state}catch(_){ }
  return window.state||window.currentInspection||window.appState||null;
}
function ensureId(){
  const st=getState();
  let id=String(st?.id||window.currentInspectionId||'').trim();
  if(/^INS-[A-Z0-9-]+$/i.test(id))return id;
  id='INS-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
  try{if(st&&typeof st==='object')st.id=id}catch(_){ }
  window.currentInspectionId=id;
  return id;
}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
async function waitImages(root){
  const imgs=[...root.querySelectorAll('img')];
  await Promise.all(imgs.map(img=>new Promise(resolve=>{
    if(img.complete&&img.naturalWidth>0)return resolve();
    const done=()=>{img.removeEventListener('load',done);img.removeEventListener('error',done);resolve()};
    img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});
    setTimeout(done,5000);
  })));
}
async function inlineImages(root){
  const imgs=[...root.querySelectorAll('img[src]')];
  for(const img of imgs){
    const src=img.getAttribute('src');
    if(!src||src.startsWith('data:'))continue;
    try{
      const url=new URL(src,location.href);
      if(url.origin!==location.origin)continue;
      const res=await fetch(url.href,{cache:'force-cache'});
      if(!res.ok)continue;
      const blob=await res.blob();
      const reader=new FileReader();
      const data=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
      img.src=data;
    }catch(e){console.warn('Imagem não incorporada no PDF:',src,e)}
  }
}
function dedupePhotos(root){
  const seen=new Set();
  root.querySelectorAll('.pdf-photo').forEach(card=>{
    const img=card.querySelector('img');
    const key=img?.getAttribute('src')||'';
    if(!key)return;
    if(seen.has(key))card.remove();else seen.add(key);
  });
}
function styleRoot(root){
  root.style.cssText='position:fixed!important;left:0!important;top:0!important;width:794px!important;max-width:794px!important;margin:0!important;padding:0!important;background:#fff!important;color:#111!important;display:block!important;visibility:visible!important;opacity:0.01!important;pointer-events:none!important;z-index:1!important;overflow:visible!important;';
  root.querySelectorAll('.pdf-enterprise,.pdf-page').forEach(el=>{
    el.style.maxWidth='none';el.style.width='100%';el.style.margin='0';el.style.background='#fff';el.style.color='#111';
  });
  root.querySelectorAll('.pdf-section,.pdf-table,.pdf-photo,.pdf-signatures,.pdf-signature,.pdf-summary,.pdf-header,.pdf-footer').forEach(el=>{
    el.style.breakInside='avoid';el.style.pageBreakInside='avoid';
  });
}
function ensureButtons(){
  const pdf=$('pdf');
  if(pdf)pdf.textContent='📄 GERAR E COMPARTILHAR PDF';
  const share=$('reportShare');
  if(share)share.textContent='📤 Compartilhar PDF';
}
function download(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}

async function makePdfFinal(){
  if(busy)return;
  busy=true;
  let root=null;
  try{
    if(typeof window.html2pdf!=='function')throw new Error('Biblioteca html2pdf não carregada.');
    const st=getState();
    if(!st)throw new Error('Dados da inspeção não encontrados.');
    const id=ensureId();

    /* Monta uma cópia limpa diretamente do gerador Premium, sem depender
       do container escondido ou de CSS do formulário. */
    if(typeof window.reportHTML==='function'){
      root=document.createElement('div');
      root.id='tbmPdfFinalRender';
      root.innerHTML=window.reportHTML(st);
    }else{
      const source=$('reportContent');
      if(!source||!source.innerHTML.trim())throw new Error('Área do relatório vazia.');
      root=source.cloneNode(true);root.id='tbmPdfFinalRender';
    }
    styleRoot(root);
    document.body.appendChild(root);
    await wait(100);
    void root.offsetHeight;
    await inlineImages(root);
    dedupePhotos(root);
    await waitImages(root);
    /* Delay obrigatório: aguarda layout, fontes, canvas e imagens. */
    await wait(1000);
    window.scrollTo(0,0);
    void root.offsetHeight;

    const filename='Laudo_Inspecao_'+id+'.pdf';
    const opt={
      margin:[30,20,20,30],
      filename:filename,
      image:{type:'jpeg',quality:0.82},
      html2canvas:{
        scale:1,
        useCORS:true,
        allowTaint:false,
        backgroundColor:'#ffffff',
        logging:false,
        imageTimeout:10000,
        scrollX:0,
        scrollY:0,
        windowWidth:794,
        width:794
      },
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
      /* CSS controla os blocos que não podem ser cortados. Evita
         avoid-all, que pode provocar páginas brancas em documentos longos. */
      pagebreak:{mode:['css','legacy'],avoid:['.pdf-section','.pdf-photo','.pdf-signature','.pdf-summary','.pdf-header','.pdf-footer']}
    };

    const worker=html2pdf().set(opt).from(root).toContainer().toCanvas().toPdf();
    const blob=await worker.outputPdf('blob');
    if(!blob||blob.size<1000)throw new Error('O PDF foi gerado sem conteúdo.');
    const file=new File([blob],filename,{type:'application/pdf'});

    if(navigator.share&&navigator.canShare){
      try{
        if(navigator.canShare({files:[file]})){
          await navigator.share({title:'Laudo de Inspeção SST',text:'Laudo de inspeção '+id,files:[file]});
          return;
        }
      }catch(e){
        if(e?.name==='AbortError')return;
        console.warn('Compartilhamento nativo indisponível:',e);
      }
    }
    download(blob,filename);
  }catch(e){
    console.error('[PDF FINAL FIX]',e);
    alert('Não foi possível gerar o PDF: '+(e?.message||e));
  }finally{
    if(root)root.remove();
    busy=false;
  }
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
