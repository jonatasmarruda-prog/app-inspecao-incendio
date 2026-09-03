(()=>{
'use strict';

const STYLE_ID='tbm-pdf-master-fix-style';
let generating=false;

function injectStyle(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
    .tbm-pdf-render-root{position:fixed!important;left:-100000px!important;top:0!important;width:210mm!important;background:#fff!important;color:#000!important;z-index:-1!important;opacity:1!important;visibility:visible!important;font-family:Arial,Helvetica,sans-serif!important}
    .tbm-pdf-render-root .reportPage{margin:0!important;background:#fff!important;color:#000!important;}
    .tbm-pdf-render-root .rsection,.tbm-pdf-render-root .rtable,.tbm-pdf-render-root .rphotos,.tbm-pdf-render-root .rsigs,.tbm-pdf-render-root .rsig{break-inside:avoid!important;page-break-inside:avoid!important;}
    .tbm-pdf-render-root .reportNo{width:auto!important;min-width:0!important;white-space:nowrap!important;overflow:visible!important;word-break:normal!important;}
  `;
  document.head.appendChild(s);
}

function getStateObject(){
  return window.state || window.appState || window.inspectionState || window.currentInspection || null;
}

function getInspectionId(){
  const st=getStateObject();
  const candidates=[
    window.currentInspectionId,
    window.inspectionId,
    window.idGerado,
    st&&st.id,
    st&&st.inspectionId,
    st&&st.idInspecao,
    document.querySelector('[data-inspection-id]')?.getAttribute('data-inspection-id'),
    document.getElementById('inspectionId')?.value,
    document.getElementById('inspectionId')?.textContent,
    document.getElementById('inspectionNumber')?.value,
    document.getElementById('inspectionNumber')?.textContent,
    document.body.innerText.match(/INS-[A-Z0-9]+(?:-[A-Z0-9]+)+/i)?.[0]
  ];
  for(const value of candidates){
    const v=String(value??'').trim();
    if(/^INS-[A-Z0-9-]+$/i.test(v)) return v;
  }
  return '';
}

function formatDateTimeBR(date=new Date()){
  return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(date);
}

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

async function waitImages(root){
  const imgs=[...root.querySelectorAll('img')];
  await Promise.all(imgs.map(img=>{
    if(img.complete && img.naturalWidth>0) return Promise.resolve();
    return new Promise(resolve=>{
      const done=()=>{img.removeEventListener('load',done);img.removeEventListener('error',done);resolve();};
      img.addEventListener('load',done,{once:true});
      img.addEventListener('error',done,{once:true});
      setTimeout(done,3000);
    });
  }));
}

function findReport(){
  const candidates=[
    document.getElementById('report'),
    document.getElementById('reportContent'),
    document.getElementById('reportContainer'),
    document.querySelector('.reportShell'),
    document.querySelector('.reportPage')
  ].filter(Boolean);
  return candidates.find(el=>el.querySelector('.reportPage,.reportHeader,.rsection,.rtable') || el.textContent.trim().length>80) || candidates[0] || null;
}

function stampId(root,id){
  const nodes=[...root.querySelectorAll('.reportNo,[id*=inspection i],[class*=inspection i]')];
  for(const el of nodes){
    if(/INS-|N°|Nº|INSPEÇÃO/i.test(el.textContent)){
      const prefix=el.textContent.match(/^\s*(N[°º]\s*)?/i)?.[0]||'N° ';
      el.textContent=prefix+id;
      el.style.width='auto';
      el.style.minWidth='0';
      el.style.whiteSpace='nowrap';
      el.style.overflow='visible';
    }
  }
}

function addGenerationDate(root){
  const value=formatDateTimeBR();
  const fields=[...root.querySelectorAll('.rfield')];
  const target=fields.find(el=>/data|hora/i.test(el.textContent));
  if(target && !/\d{2}\/\d{2}\/\d{4}/.test(target.textContent)){
    const v=target.querySelector('.rvalue');
    if(v) v.textContent=value;
  }
}

function normalizeForPdf(root){
  root.querySelectorAll('*').forEach(el=>{
    el.style.maxWidth=el.style.maxWidth||'100%';
    el.style.boxSizing='border-box';
  });
  root.querySelectorAll('table').forEach(t=>{
    t.style.width='100%';
    t.style.borderCollapse='collapse';
    t.style.breakInside='avoid';
    t.style.pageBreakInside='avoid';
  });
  root.querySelectorAll('.rsection,.rsig,.rphotos figure').forEach(el=>{
    el.style.breakInside='avoid';
    el.style.pageBreakInside='avoid';
  });
}

async function gerarPDFMaster(){
  if(generating) return;
  generating=true;
  try{
    if(typeof window.html2pdf!=='function') throw new Error('Biblioteca html2pdf não carregada.');
    const idGerado=getInspectionId();
    if(!idGerado) throw new Error('Não foi possível localizar o ID da inspeção.');

    const source=findReport();
    if(!source) throw new Error('Container do relatório não encontrado.');

    await wait(400);
    await waitImages(source);
    window.scrollTo(0,0);

    const clone=source.cloneNode(true);
    clone.classList.add('tbm-pdf-render-root');
    clone.removeAttribute('hidden');
    clone.style.display='block';
    clone.style.visibility='visible';
    clone.style.opacity='1';
    clone.style.marginTop='0';
    clone.style.paddingTop='0';
    stampId(clone,idGerado);
    addGenerationDate(clone);
    normalizeForPdf(clone);
    document.body.appendChild(clone);

    await wait(250);
    await waitImages(clone);

    const filename='Relatorio_fire_'+idGerado+'.pdf';
    const opt={
      margin:[30,20,20,30],
      filename:filename,
      image:{type:'jpeg',quality:0.82},
      html2canvas:{
        scale:1.35,
        useCORS:true,
        allowTaint:false,
        backgroundColor:'#ffffff',
        logging:false,
        imageTimeout:5000,
        scrollX:0,
        scrollY:0,
        windowWidth:clone.scrollWidth || 794
      },
      jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
      pagebreak:{mode:['avoid-all','css','legacy']}
    };

    await html2pdf().set(opt).from(clone).save();
    clone.remove();
  }catch(err){
    console.error('[PDF MASTER]',err);
    alert('Não foi possível gerar o PDF: '+(err?.message||err));
  }finally{
    generating=false;
  }
}

window.gerarPDFMaster=gerarPDFMaster;
window.exportarPDFMaster=gerarPDFMaster;
window.gerarRelatorioPDF=gerarPDFMaster;

function isPdfButton(el){
  if(!el) return false;
  const text=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
  const attr=((el.getAttribute('onclick')||'')+' '+(el.getAttribute('aria-label')||'')).toLowerCase();
  return /pdf|gerar relatório|gerar relatorio|exportar relatório|exportar relatorio|baixar relatório|baixar relatorio/.test(text+' '+attr);
}

document.addEventListener('click',e=>{
  const btn=e.target.closest('button,a');
  if(!isPdfButton(btn)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  gerarPDFMaster();
},true);

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',injectStyle,{once:true});
else injectStyle();
})();