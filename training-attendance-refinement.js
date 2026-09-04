(()=>{
'use strict';

const FLAG='__tbmTrainingAttendanceRefinementV1';
if(window[FLAG])return;window[FLAG]=true;

const TYPE='training-attendance';
const TYPE_LABEL='Lista de Presença - Treinamento SST';
const DEFAULT_INSTRUCTOR='Jonatas Marques de Arruda - Coordenador de SST';
const LEGACY_INSTRUCTOR='Jonatas Marques de Arruda - Coordenador / Técnico de Segurança do Trabalho';
const PDF_TITLE='TREINAMENTO SST - LISTA DE PRESENÇA';
let logoPromise=null;

function getState(){try{return typeof state!=='undefined'?state:(window.state||null)}catch(_){return window.state||null}}
function isTraining(x=getState()){return x?.type===TYPE}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function formatDate(v){if(!v)return'Não informada';const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}/${m}/${y}`:String(v)}
function tableLayout(){return{hLineColor:()=> '#cfd6df',vLineColor:()=> '#cfd6df',hLineWidth:()=>.6,vLineWidth:()=>.6,paddingLeft:()=>7,paddingRight:()=>7,paddingTop:()=>6,paddingBottom:()=>6}}
function logoSvg(){if(!logoPromise)logoPromise=fetch('./icon.svg?training-refinement=1',{cache:'force-cache'}).then(r=>r.ok?r.text():'').catch(()=> '');return logoPromise}

function ensureTrainingState(x=getState()){
  if(!isTraining(x))return x;
  const a=x.trainingAttendance&&typeof x.trainingAttendance==='object'?x.trainingAttendance:(x.trainingAttendance={});
  const current=String(a.instructor||'').trim();
  if(a.instructorChoice!=='default'&&a.instructorChoice!=='other'){
    const custom=current&&current!==LEGACY_INSTRUCTOR&&current!==DEFAULT_INSTRUCTOR;
    a.instructorChoice=custom?'other':'default';
    a.instructorOther=custom?current:'';
  }
  a.instructorOther=String(a.instructorOther||'');
  a.instructor=a.instructorChoice==='other'?a.instructorOther.trim():DEFAULT_INSTRUCTOR;
  return x;
}

function syncInstructorFromUi(){
  const x=ensureTrainingState();if(!x)return;
  const a=x.trainingAttendance;
  const select=document.getElementById('trainingInstructorSelect');
  const other=document.getElementById('trainingInstructorOther');
  if(select)a.instructorChoice=select.value==='other'?'other':'default';
  if(other)a.instructorOther=other.value;
  a.instructor=a.instructorChoice==='other'?a.instructorOther.trim():DEFAULT_INSTRUCTOR;
  if(other)other.style.display=a.instructorChoice==='other'?'block':'none';
}

function installInstructorUi(){
  const old=document.getElementById('trainingInstructor');
  const field=(old||document.getElementById('trainingInstructorSelect'))?.closest('.field');
  if(!field)return;
  if(!document.getElementById('trainingInstructorSelect')){
    field.innerHTML=`<label>Instrutor</label><select id="trainingInstructorSelect"><option value="default">${esc(DEFAULT_INSTRUCTOR)}</option><option value="other">Outros</option></select><input type="text" id="trainingInstructorOther" placeholder="Digite o nome do instrutor..." class="form-control mt-2" style="display:none;margin-top:8px">`;
  }
  refreshInstructorUi();
}

function refreshInstructorUi(){
  const x=ensureTrainingState();if(!x)return;
  const a=x.trainingAttendance;
  const select=document.getElementById('trainingInstructorSelect');
  const other=document.getElementById('trainingInstructorOther');
  if(select)select.value=a.instructorChoice==='other'?'other':'default';
  if(other){other.value=a.instructorOther||'';other.style.display=a.instructorChoice==='other'?'block':'none'}
}

function setTrainingOnlySections(active){
  const diagnosis=document.getElementById('findings')?.closest('.card');
  const signatures=document.getElementById('sig1')?.closest('.card');
  if(diagnosis)diagnosis.classList.toggle('hidden',active);
  if(signatures)signatures.classList.toggle('hidden',active);

  const photoCard=document.getElementById('photoInput')?.closest('.card');
  const photoTitle=photoCard?.querySelector('.sectionTitle');
  if(photoTitle){
    if(!photoTitle.dataset.trainingOriginalTitle)photoTitle.dataset.trainingOriginalTitle=photoTitle.textContent||'📷 Registro fotográfico';
    photoTitle.textContent=active?'📷 Registro fotográfico (Opcional)':photoTitle.dataset.trainingOriginalTitle;
  }

  const genericActions=document.getElementById('save')?.closest('.card');
  if(genericActions)genericActions.classList.toggle('hidden',active);
  ensureTrainingActionBar();
  document.getElementById('trainingAttendanceActions')?.classList.toggle('hidden',!active);
}

function ensureTrainingActionBar(){
  if(document.getElementById('trainingAttendanceActions'))return;
  const form=document.getElementById('form');if(!form)return;
  const card=document.createElement('div');
  card.id='trainingAttendanceActions';
  card.className='card no-print hidden';
  card.innerHTML=`<div class="sectionTitle" style="font-size:16px">Ações da Lista de Presença</div><div class="actions"><button type="button" id="trainingSave" class="btn success">💾 Salvar</button><button type="button" id="trainingPreview" class="btn secondary">👁️ Visualizar Inspeção</button><button type="button" id="trainingShare" class="btn blue">📲 Compartilhar</button><button type="button" id="trainingDownload" class="btn primary">📥 Baixar PDF</button></div>`;
  form.appendChild(card);
}

function photoRows(x){
  const photos=(Array.isArray(x?.photos)?x.photos:[]).filter(p=>typeof p?.data==='string'&&p.data.startsWith('data:image/'));
  const cells=photos.map((p,i)=>({stack:[{image:p.data,fit:[230,180],alignment:'center'},{text:String(p.caption||`Foto ${i+1}`),fontSize:7.5,alignment:'center',margin:[0,4,0,0],color:'#475569'}],margin:[4,6,4,8]}));
  const rows=[];
  for(let i=0;i<cells.length;i+=2)rows.push([cells[i],cells[i+1]||{text:''}]);
  return rows;
}

async function buildRefinedDocDefinition(x=getState()){
  x=ensureTrainingState(x);
  if(!x)throw new Error('Lista de presença não encontrada.');
  syncInstructorFromUi();
  const a=x.trainingAttendance;
  const svg=await logoSvg();
  const participantRows=(Array.isArray(a.participants)?a.participants:[]).map(p=>[
    {text:p?.name||'—',fontSize:9},
    {text:p?.shift||'—',fontSize:9},
    p?.signature?{image:p.signature,fit:[100,50],alignment:'center'}:{text:'Sem assinatura',fontSize:8,color:'#64748b',alignment:'center'}
  ]);
  const titleBlock={text:PDF_TITLE,bold:true,fontSize:16,alignment:'center',margin:[0,0,0,10]};
  const corporateLogo=window.logoTBM?{image:window.logoTBM,width:100,alignment:'center',margin:[0,0,0,10]}:{text:'TBM',bold:true,fontSize:18,color:'#8b1018',alignment:'center',margin:[0,0,0,10]};
  const content=[
    corporateLogo,
    titleBlock,
    {canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:1.4,lineColor:'#8b1018'}],margin:[0,6,0,10]},
    {table:{widths:[90,'*'],body:[
      [{text:'Tema',bold:true,fillColor:'#eeeeee'},{text:a.theme||'Não informado'}],
      [{text:'Data',bold:true,fillColor:'#eeeeee'},{text:formatDate(a.date)}],
      [{text:'Local',bold:true,fillColor:'#eeeeee'},{text:a.location||'Não informado'}],
      [{text:'Instrutor',bold:true,fillColor:'#eeeeee'},{text:a.instructor||'Não informado'}]
    ]},layout:tableLayout(),margin:[0,0,0,14]},
    {text:'PARTICIPANTES',bold:true,fontSize:10,fillColor:'#f4f4f4',margin:[0,0,0,5]},
    {table:{headerRows:1,widths:['*',92,125],body:[[{text:'Nome',bold:true,fillColor:'#eeeeee'},{text:'Turno',bold:true,fillColor:'#eeeeee'},{text:'Assinatura',bold:true,fillColor:'#eeeeee',alignment:'center'}],...participantRows]},layout:tableLayout()}
  ];

  const rows=photoRows(x);
  if(rows.length){
    content.push(
      {text:'REGISTRO FOTOGRÁFICO (OPCIONAL)',bold:true,fontSize:10,fillColor:'#f4f4f4',margin:[0,0,0,8],pageBreak:'before'},
      {table:{widths:['*','*'],body:rows},layout:tableLayout()}
    );
  }

  return{
    pageSize:'A4',pageMargins:[40,42,40,56],defaultStyle:{font:'Roboto',fontSize:9,color:'#17202b'},content,
    footer:(currentPage,pageCount)=>({margin:[40,0,40,16],stack:[{canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:.6,lineColor:'#cbd5e1'}]},{text:`Sistema Profissional SST • ${a.instructor||'Instrutor não informado'} • Página ${currentPage}/${pageCount}`,fontSize:6.5,color:'#64748b',alignment:'center',margin:[0,4,0,0]}]}),
    info:{title:PDF_TITLE,subject:TYPE_LABEL,author:a.instructor||'Sistema Profissional SST',creator:'Sistema Profissional SST'}
  };
}

async function makeRefinedAttendancePdf(action='download'){
  const x=ensureTrainingState();if(!x)throw new Error('Lista de presença não encontrada.');
  syncInstructorFromUi();
  if(!window.pdfMake?.createPdf)throw new Error('Biblioteca pdfmake indisponível.');
  const docDefinition=await buildRefinedDocDefinition(x);
  const filename=`Lista_Presenca_Treinamento_SST_${x.id||'SEM-ID'}.pdf`;
  if(action===true)action='share';if(action===false)action='download';
  if(action==='preview'||action==='open'||action==='view'){
    return window.pdfMake.createPdf(docDefinition).open();
  }
  if(action==='share'){
    return await new Promise(resolve=>window.pdfMake.createPdf(docDefinition).getBlob(async blob=>{
      try{
        const file=new File([blob],filename,{type:'application/pdf'});
        if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({title:PDF_TITLE,text:x.trainingAttendance.theme||TYPE_LABEL,files:[file]});
        else window.pdfMake.createPdf(docDefinition).download(filename);
      }catch(e){if(e?.name!=='AbortError')window.pdfMake.createPdf(docDefinition).download(filename)}finally{resolve()}
    }));
  }
  window.pdfMake.createPdf(docDefinition).download(filename);
}

function installNormalizeHook(){
  const previous=window.normalize;
  if(typeof previous!=='function'||previous.__tbmTrainingInstructorRefinement)return;
  const wrapped=function(){
    const out=previous.apply(this,arguments);
    if(isTraining())syncInstructorFromUi();
    return out;
  };
  wrapped.__tbmTrainingInstructorRefinement=true;
  wrapped.__tbmPrevious=previous;
  window.normalize=wrapped;
}

function installRenderHook(){
  const previous=window.renderForm;
  if(typeof previous!=='function'||previous.__tbmTrainingAttendanceRefinement)return;
  const wrapped=function(){
    const out=previous.apply(this,arguments);
    const active=isTraining();
    if(active){ensureTrainingState();installInstructorUi();refreshInstructorUi()}
    setTrainingOnlySections(active);
    return out;
  };
  wrapped.__tbmTrainingAttendanceRefinement=true;
  wrapped.__tbmPrevious=previous;
  window.renderForm=wrapped;
}

function installPdfHook(){
  const previous=window.makePdf;
  if(typeof previous!=='function'||previous.__tbmTrainingAttendanceRefinement)return;
  const wrapped=async function(action='download'){
    if(isTraining())return await makeRefinedAttendancePdf(action);
    return await previous.apply(this,arguments);
  };
  wrapped.__tbmTrainingAttendanceRefinement=true;
  wrapped.__tbmPrevious=previous;
  window.makePdf=wrapped;
  window.makeTrainingAttendancePdf=makeRefinedAttendancePdf;
  window.tbmBuildTrainingAttendanceDocDefinition=buildRefinedDocDefinition;
}

function bindEvents(){
  if(document.documentElement.dataset.tbmTrainingAttendanceRefinementEvents==='1')return;
  document.documentElement.dataset.tbmTrainingAttendanceRefinementEvents='1';
  document.addEventListener('change',e=>{
    if(!isTraining())return;
    if(e.target?.matches?.('#trainingInstructorSelect')){syncInstructorFromUi();try{window.scheduleSave?.()}catch(_){}}
  },true);
  document.addEventListener('input',e=>{
    if(!isTraining())return;
    if(e.target?.matches?.('#trainingInstructorOther')){syncInstructorFromUi();try{window.scheduleSave?.()}catch(_){}}
  },true);
  document.addEventListener('click',async e=>{
    if(!isTraining())return;
    const btn=e.target?.closest?.('#trainingSave,#trainingPreview,#trainingShare,#trainingDownload');
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    try{
      syncInstructorFromUi();
      if(btn.id==='trainingSave'){
        if(typeof window.tbmManualSave==='function')await window.tbmManualSave();
        else if(typeof window.saveInspection==='function')await window.saveInspection(false);
      }else if(btn.id==='trainingPreview')await makeRefinedAttendancePdf('preview');
      else if(btn.id==='trainingShare')await makeRefinedAttendancePdf('share');
      else await makeRefinedAttendancePdf('download');
    }catch(err){console.error('[LISTA PRESENÇA AÇÕES]',err);window.tbmToast?.('Erro: '+(err?.message||err),'err')}
  },true);
}

function refresh(){
  const active=isTraining();
  if(active){ensureTrainingState();installInstructorUi();refreshInstructorUi()}
  setTrainingOnlySections(active);
}

function install(){
  ensureTrainingActionBar();
  installNormalizeHook();
  installRenderHook();
  installPdfHook();
  bindEvents();
  refresh();
  window.tbmRefreshTrainingAttendanceRefinement=refresh;
  window.__tbmTrainingAttendanceRefinementVersion='2026.09.04.1';
  window.dispatchEvent(new CustomEvent('tbm-training-attendance-refinement-ready'));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
