(()=>{
'use strict';

/* Camada mestre do PDF. Não altera captura de GPS, fotos ou assinaturas. */
const STYLE_ID='tbm-pdf-master-fix-style';
let generating=false;

function injectStyle(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
    .tbm-pdf-render-root{position:fixed!important;left:0!important;top:0!important;width:794px!important;max-width:794px!important;margin:0!important;padding:0!important;background:#fff!important;color:#111!important;z-index:-1!important;opacity:1!important;visibility:visible!important;font-family:Arial,Helvetica,sans-serif!important;overflow:visible!important}
    .tbm-pdf-render-root .reportPage,.tbm-pdf-render-root .pdf-page{margin:0!important;padding:0!important;background:#fff!important;color:#111!important}
    .tbm-pdf-render-root table,.tbm-pdf-render-root .rsection,.tbm-pdf-render-root .rphotos,.tbm-pdf-render-root .rsigs,.tbm-pdf-render-root .rsig,.tbm-pdf-render-root .pdf-section,.tbm-pdf-render-root .pdf-photo,.tbm-pdf-render-root .pdf-signature{break-inside:avoid!important;page-break-inside:avoid!important}
    .tbm-pdf-render-root .reportNo,.tbm-pdf-render-root .pdf-id{white-space:nowrap!important;overflow:visible!important;word-break:normal!important}
    .tbm-pdf-render-root img{max-width:100%!important;object-fit:contain!important;object-position:center!important}
    @media print{.tbm-pdf-render-root{margin:0!important;padding:0!important}}
  `;document.head.appendChild(s);
}

function stateObject(){
  try{if(typeof state!=='undefined'&&state&&typeof state==='object')return state}catch(_){ }
  return window.state||window.appState||window.inspectionState||window.currentInspection||null;
}
function inspectionId(st){
  const c=[st?.id,window.currentInspectionId,window.inspectionId,window.idGerado,document.querySelector('[data-inspection-id]')?.getAttribute('data-inspection-id'),document.getElementById('inspectionId')?.value];
  for(const v of c){const id=String(v??'').trim();if(/^INS-[A-Z0-9-]+$/i.test(id)){window.currentInspectionId=id;return id}}
  const id='INS-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
  window.currentInspectionId=id;try{if(st&&typeof st==='object')st.id=id}catch(_){ }return id;
}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
async function waitImages(root){const imgs=[...root.querySelectorAll('img')];await Promise.all(imgs.map(img=>new Promise(resolve=>{if(img.complete&&img.naturalWidth>0)return resolve();const done=()=>{img.removeEventListener('load',done);img.removeEventListener('error',done);resolve()};img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});setTimeout(done,6000)})))}
function transferCanvas(source,clone){const a=source.querySelectorAll('canvas'),b=clone.querySelectorAll('canvas');a.forEach((c,i)=>{const d=b[i];if(!d)return;d.width=c.width;d.height=c.height;const x=d.getContext('2d');if(x)x.drawImage(c,0,0)})}
function transferFields(source,clone){const a=source.querySelectorAll('input,textarea,select'),b=clone.querySelectorAll('input,textarea,select');a.forEach((el,i)=>{const c=b[i];if(!c)return;c.value=el.value;if(el.type==='checkbox'||el.type==='radio')c.checked=el.checked});transferCanvas(source,clone)}
function dedupe(root){const seen=new Set();root.querySelectorAll('.photoCard,.pdf-photo,.pm-photo,.rphotos figure').forEach(card=>{const img=card.querySelector('img');const key=img?.src||img?.getAttribute('src')||'';if(!key)return;if(seen.has(key))card.remove();else seen.add(key)})}
function findSource(){return document.getElementById('report')||document.getElementById('reportContent')||document.getElementById('reportContainer')||document.querySelector('.reportShell')||document.querySelector('.reportPage')||document.querySelector('.pdf-enterprise')||document.querySelector('.pdfMaster')}
function build(st){
  const root=document.createElement('div');root.id='tbmPdfMasterRender';
  if(typeof window.reportHTML==='function'){try{root.innerHTML=window.reportHTML(st)||''}catch(e){console.warn('[PDF] reportHTML falhou:',e)}}
  if(!root.innerHTML.trim()){const src=findSource();if(src){root.innerHTML=src.innerHTML;transferFields(src,root)}}
  if(!root.textContent.trim()&&!root.querySelector('img,table,canvas'))throw new Error('O conteúdo do relatório está vazio.');
  return root;
}

async function gerarPDFMaster(){
  if(generating)return;generating=true;let root=null;
  try{
    if(typeof window.html2pdf!=='function')throw new Error('Biblioteca html2pdf não carregada.');
    const st=stateObject()||{};const id=inspectionId(st);root=build(st);
    root.classList.add('tbm-pdf-render-root');document.body.appendChild(root);
    await wait(150);void root.offsetHeight;await waitImages(root);dedupe(root);
    await wait(1000);window.scrollTo(0,0);void root.offsetHeight;
    const filename='Laudo_Inspecao_'+id+'.pdf';
    const opt={margin:[30,20,20,30],filename,image:{type:'jpeg',quality:0.82},html2canvas:{scale:1,useCORS:true,allowTaint:false,backgroundColor:'#fff',logging:false,imageTimeout:10000,scrollX:0,scrollY:0,windowWidth:794,width:794},jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},pagebreak:{mode:['css','legacy'],avoid:['.pdf-section','.pdf-photo','.pdf-signature','.pdf-summary','.rsection','.rphotos','.rsig']}};
    const worker=html2pdf().set(opt).from(root).toContainer().toCanvas().toPdf();
    const blob=await worker.outputPdf('blob');if(!blob||blob.size<1500)throw new Error('O PDF foi gerado sem conteúdo.');
    const file=new File([blob],filename,{type:'application/pdf'});
    if(navigator.share&&navigator.canShare){try{if(navigator.canShare({files:[file]})){await navigator.share({title:'Laudo de Inspeção SST',text:'Laudo de inspeção '+id,files:[file]});return}}catch(e){if(e?.name==='AbortError')return;console.warn('[PDF] compartilhamento:',e)}}
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
  }catch(err){console.error('[PDF MASTER]',err);alert('Não foi possível gerar o PDF: '+(err?.message||err))}finally{root?.remove();generating=false}
}
window.gerarPDFMaster=gerarPDFMaster;window.exportarPDFMaster=gerarPDFMaster;window.gerarRelatorioPDF=gerarPDFMaster;
function isPdfButton(el){if(!el)return false;const text=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();const attr=((el.getAttribute('onclick')||'')+' '+(el.getAttribute('aria-label')||'')).toLowerCase();return /pdf|gerar relatório|gerar relatorio|exportar relatório|exportar relatorio|baixar relatório|baixar relatorio/.test(text+' '+attr)}
document.addEventListener('click',e=>{
  const btn=e.target.closest('button,a');if(!btn)return;
  if(btn.id==='pdf'||btn.id==='reportPdf'||btn.id==='reportShare')return;
  if(!isPdfButton(btn))return;
  e.preventDefault();e.stopImmediatePropagation();
  if(typeof window.makePdf==='function')window.makePdf(true);else if(typeof window.gerarPDFMaster==='function')window.gerarPDFMaster();
},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',injectStyle,{once:true});else injectStyle();
})();
