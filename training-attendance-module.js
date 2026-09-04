(()=>{
'use strict';

const FLAG='__tbmTrainingAttendanceV1';
if(window[FLAG])return;window[FLAG]=true;

const TYPE='training-attendance';
const TYPE_LABEL='Lista de Presença - Treinamento SST';
const PDF_TITLE='TREINAMENTO SST - LISTA DE PRESENÇA';
const INSTRUCTOR='Jonatas Marques de Arruda - Coordenador / Técnico de Segurança do Trabalho';
const SHIFTS=['Turno A','Turno B','Turno C','Administrativo'];
const clears=new Map();

function st(){try{return state}catch(_){return window.state||null}}
function h(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function schedule(){try{if(typeof scheduleSave==='function')scheduleSave()}catch(_){ }}
function blankParticipant(){return{name:'',shift:'Turno A',signature:''}}
function ensureState(x=st()){
  if(!x||x.type!==TYPE)return x;
  const a=x.trainingAttendance&&typeof x.trainingAttendance==='object'?x.trainingAttendance:{};
  a.theme=String(a.theme||'');
  a.date=String(a.date||'');
  a.location=String(a.location||'');
  a.instructor=INSTRUCTOR;
  a.participants=Array.isArray(a.participants)&&a.participants.length?a.participants.map(p=>({
    name:String(p?.name||''),shift:SHIFTS.includes(p?.shift)?p.shift:'Turno A',signature:String(p?.signature||'')
  })):[blankParticipant()];
  x.trainingAttendance=a;
  x.title=TYPE_LABEL;
  return x;
}

function installCss(){
  if(document.getElementById('tbm-training-attendance-style'))return;
  const s=document.createElement('style');s.id='tbm-training-attendance-style';s.textContent=`
  #trainingAttendanceCard .training-participant{border:1px solid var(--line);border-radius:14px;padding:14px;margin:12px 0;background:#fbfcfe}
  #trainingAttendanceCard .training-participant-title{font-size:13px;font-weight:900;margin-bottom:10px}
  #trainingAttendanceCard .training-signature-label{display:block;font-size:12px;font-weight:900;margin:12px 0 6px}
  #trainingAttendanceCard .training-signature-canvas{width:100%;height:120px;display:block;touch-action:none}
  @media(max-width:760px){#trainingAttendanceCard .training-participant .grid{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}

function installType(){
  try{if(typeof TYPES==='object'&&TYPES&&!TYPES[TYPE])TYPES[TYPE]={name:TYPE_LABEL,icon:'📝',checks:[]}}catch(e){console.error('[LISTA PRESENÇA] TYPES indisponível',e)}
}

function installSelectorOption(){
  const sel=document.getElementById('inspectionTypeSelect');if(!sel)return;
  if(!sel.querySelector(`option[value="${TYPE}"]`)){
    const o=document.createElement('option');o.value=TYPE;o.textContent=TYPE_LABEL;sel.appendChild(o);
  }
}

function installCard(){
  if(document.getElementById('trainingAttendanceCard'))return;
  const anchor=document.getElementById('checklistCard');if(!anchor)return;
  const card=document.createElement('div');card.id='trainingAttendanceCard';card.className='card hidden';
  card.innerHTML=`
    <div class="sectionTitle">📝 Lista de Presença - Treinamento SST</div>
    <div class="grid">
      <div class="field"><label>Tema</label><input id="trainingTheme" placeholder="Tema do treinamento"></div>
      <div class="field"><label>Data</label><input id="trainingDate" type="date"></div>
      <div class="field"><label>Local</label><input id="trainingLocation" placeholder="Local do treinamento"></div>
      <div class="field"><label>Instrutor</label><input id="trainingInstructor" value="${h(INSTRUCTOR)}" readonly disabled></div>
    </div>
    <div class="title" style="font-size:16px;margin:20px 0 10px">Participantes</div>
    <div id="trainingParticipants"></div>
    <button type="button" id="addTrainingParticipant" class="btn secondary full no-print">➕ Adicionar Participante</button>`;
  anchor.insertAdjacentElement('beforebegin',card);
}

function syncHeader(){
  const x=ensureState();if(!x)return;
  const a=x.trainingAttendance;
  const theme=document.getElementById('trainingTheme'),date=document.getElementById('trainingDate'),location=document.getElementById('trainingLocation');
  if(theme)a.theme=theme.value.trim();if(date)a.date=date.value;if(location)a.location=location.value.trim();a.instructor=INSTRUCTOR;
}

function initParticipantCanvas(canvas,index,initial){
  if(!canvas)return;
  const x=ensureState();if(!x)return;
  try{
    if(typeof setupCanvas==='function'){
      const clear=setupCanvas(canvas,initial,v=>{const s=ensureState();if(!s?.trainingAttendance?.participants?.[index])return;s.trainingAttendance.participants[index].signature=v;schedule()});
      clears.set(index,clear);return;
    }
  }catch(e){console.warn('[LISTA PRESENÇA CANVAS]',e)}
  const ctx=canvas.getContext('2d'),r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));ctx.setTransform(d,0,0,d,0,0);ctx.lineWidth=2;ctx.lineCap='round';ctx.strokeStyle='#111827';
  if(initial){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,r.width,r.height);im.src=initial}
  let drawing=false,last=null;const pos=e=>{const b=canvas.getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top}};
  canvas.onpointerdown=e=>{drawing=true;last=pos(e);canvas.setPointerCapture?.(e.pointerId);e.preventDefault()};
  canvas.onpointermove=e=>{if(!drawing)return;const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;e.preventDefault()};
  canvas.onpointerup=e=>{if(!drawing)return;drawing=false;const s=ensureState();if(s?.trainingAttendance?.participants?.[index]){s.trainingAttendance.participants[index].signature=canvas.toDataURL('image/png');schedule()}canvas.releasePointerCapture?.(e.pointerId)};
  clears.set(index,()=>{ctx.clearRect(0,0,r.width,r.height);const s=ensureState();if(s?.trainingAttendance?.participants?.[index]){s.trainingAttendance.participants[index].signature='';schedule()}});
}

function renderParticipants(){
  const x=ensureState(),box=document.getElementById('trainingParticipants');if(!x||!box)return;
  clears.clear();
  box.innerHTML=x.trainingAttendance.participants.map((p,i)=>`<div class="training-participant" data-training-participant="${i}">
    <div class="training-participant-title">Participante ${i+1}</div>
    <div class="grid">
      <div class="field"><label>Nome Completo</label><input data-training-name="${i}" value="${h(p.name)}" placeholder="Nome completo"></div>
      <div class="field"><label>Turno</label><select data-training-shift="${i}">${SHIFTS.map(v=>`<option ${p.shift===v?'selected':''}>${h(v)}</option>`).join('')}</select></div>
    </div>
    <label class="training-signature-label">Assinatura</label>
    <div class="sigwrap"><canvas class="training-signature-canvas" data-training-signature="${i}"></canvas></div>
    <button type="button" class="btn secondary full no-print" data-training-clear="${i}">Limpar assinatura</button>
  </div>`).join('');
  requestAnimationFrame(()=>x.trainingAttendance.participants.forEach((p,i)=>initParticipantCanvas(box.querySelector(`[data-training-signature="${i}"]`),i,p.signature)));
}

function renderAttendance(){
  const x=ensureState();if(!x)return;
  const a=x.trainingAttendance,card=document.getElementById('trainingAttendanceCard');if(!card)return;
  card.classList.remove('hidden');
  const theme=document.getElementById('trainingTheme'),date=document.getElementById('trainingDate'),location=document.getElementById('trainingLocation'),instructor=document.getElementById('trainingInstructor');
  if(theme)theme.value=a.theme;if(date)date.value=a.date;if(location)location.value=a.location;if(instructor)instructor.value=INSTRUCTOR;
  renderParticipants();
}

function bindEvents(){
  if(document.documentElement.dataset.tbmTrainingAttendanceEvents==='1')return;document.documentElement.dataset.tbmTrainingAttendanceEvents='1';
  document.addEventListener('input',e=>{
    const x=ensureState();if(!x||x.type!==TYPE)return;
    if(e.target.matches('#trainingTheme,#trainingDate,#trainingLocation')){syncHeader();schedule();return}
    if(e.target.matches('[data-training-name]')){const i=Number(e.target.dataset.trainingName);if(x.trainingAttendance.participants[i]){x.trainingAttendance.participants[i].name=e.target.value;schedule()}}
  },false);
  document.addEventListener('change',e=>{
    const x=ensureState();if(!x||x.type!==TYPE)return;
    if(e.target.matches('#trainingDate')){syncHeader();schedule();return}
    if(e.target.matches('[data-training-shift]')){const i=Number(e.target.dataset.trainingShift);if(x.trainingAttendance.participants[i]){x.trainingAttendance.participants[i].shift=e.target.value;schedule()}}
  },false);
  document.addEventListener('click',e=>{
    const x=ensureState();if(!x||x.type!==TYPE)return;
    if(e.target.closest?.('#addTrainingParticipant')){e.preventDefault();syncHeader();x.trainingAttendance.participants.push(blankParticipant());renderParticipants();schedule();return}
    const clear=e.target.closest?.('[data-training-clear]');if(clear){e.preventDefault();clears.get(Number(clear.dataset.trainingClear))?.();return}
  },false);
}

function installHooks(){
  const previousRender=window.renderForm;
  if(typeof previousRender==='function'&&!previousRender.__tbmTrainingAttendance){
    const wrapped=function(){const x=st();if(x?.type===TYPE)ensureState(x);const out=previousRender.apply(this,arguments);const current=st(),active=current?.type===TYPE;document.getElementById('trainingAttendanceCard')?.classList.toggle('hidden',!active);if(active){document.getElementById('checklistCard')?.classList.add('hidden');const title=document.getElementById('formTitle');if(title)title.textContent='📝 '+TYPE_LABEL;renderAttendance()}return out};
    wrapped.__tbmTrainingAttendance=true;window.renderForm=wrapped;
  }
  const previousNormalize=window.normalize;
  if(typeof previousNormalize==='function'&&!previousNormalize.__tbmTrainingAttendance){
    const wrapped=function(){const out=previousNormalize.apply(this,arguments);if(st()?.type===TYPE)syncHeader();return out};wrapped.__tbmTrainingAttendance=true;window.normalize=wrapped;
  }
}

function formatDate(v){if(!v)return'Não informada';const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}/${m}/${y}`:String(v)}
let logoPromise=null;
async function logoSvg(){if(!logoPromise)logoPromise=fetch('./icon.svg?training=1',{cache:'force-cache'}).then(r=>r.ok?r.text():'').catch(()=> '');return logoPromise}
function tableLayout(){return{hLineColor:()=> '#cfd6df',vLineColor:()=> '#cfd6df',hLineWidth:()=>.6,vLineWidth:()=>.6,paddingLeft:()=>7,paddingRight:()=>7,paddingTop:()=>6,paddingBottom:()=>6}}

async function buildDocDefinition(x){
  ensureState(x);const a=x.trainingAttendance,svg=await logoSvg();
  const participantRows=a.participants.map(p=>[
    {text:p.name||'—',fontSize:9},
    {text:p.shift||'—',fontSize:9},
    p.signature?{image:p.signature,fit:[100,50],alignment:'center'}:{text:'Sem assinatura',fontSize:8,color:'#64748b',alignment:'center'}
  ]);
  const titleBlock=svg?{table:{widths:[72,'*'],body:[[{svg,fit:[62,42],alignment:'left'},{text:PDF_TITLE,bold:true,fontSize:16,alignment:'center',margin:[0,12,0,0]}]]},layout:'noBorders'}:{text:PDF_TITLE,bold:true,fontSize:16,alignment:'center'};
  return{
    pageSize:'A4',pageMargins:[40,42,40,56],defaultStyle:{font:'Roboto',fontSize:9,color:'#17202b'},
    content:[
      titleBlock,
      {canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:1.4,lineColor:'#8b1018'}],margin:[0,6,0,10]},
      {table:{widths:[90,'*'],body:[
        [{text:'Tema',bold:true,fillColor:'#eeeeee'},{text:a.theme||'Não informado'}],
        [{text:'Data',bold:true,fillColor:'#eeeeee'},{text:formatDate(a.date)}],
        [{text:'Local',bold:true,fillColor:'#eeeeee'},{text:a.location||'Não informado'}],
        [{text:'Instrutor',bold:true,fillColor:'#eeeeee'},{text:INSTRUCTOR}]
      ]},layout:tableLayout(),margin:[0,0,0,14]},
      {text:'PARTICIPANTES',bold:true,fontSize:10,fillColor:'#f4f4f4',margin:[0,0,0,5]},
      {table:{headerRows:1,widths:['*',92,125],body:[
        [{text:'Nome',bold:true,fillColor:'#eeeeee'},{text:'Turno',bold:true,fillColor:'#eeeeee'},{text:'Assinatura',bold:true,fillColor:'#eeeeee',alignment:'center'}],
        ...participantRows
      ]},layout:tableLayout()}
    ],
    footer:(currentPage,pageCount)=>({margin:[40,0,40,16],stack:[{canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:.6,lineColor:'#cbd5e1'}]},{text:`Sistema Profissional SST • ${INSTRUCTOR} • Página ${currentPage}/${pageCount}`,fontSize:6.5,color:'#64748b',alignment:'center',margin:[0,4,0,0]}]}),
    info:{title:PDF_TITLE,subject:TYPE_LABEL,author:'Jonatas Marques de Arruda',creator:'Sistema Profissional SST'}
  };
}

async function makeAttendancePdf(action='download'){
  const x=ensureState();if(!x)throw new Error('Lista de presença não encontrada.');syncHeader();
  if(!window.pdfMake?.createPdf)throw new Error('Biblioteca pdfmake indisponível.');
  const docDefinition=await buildDocDefinition(x),filename=`Lista_Presenca_Treinamento_SST_${x.id||'SEM-ID'}.pdf`;
  if(action===true)action='share';if(action===false)action='download';
  if(action==='share')return await new Promise(resolve=>window.pdfMake.createPdf(docDefinition).getBlob(async blob=>{try{const file=new File([blob],filename,{type:'application/pdf'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({title:PDF_TITLE,text:a?.theme||TYPE_LABEL,files:[file]});else window.pdfMake.createPdf(docDefinition).download(filename)}catch(e){if(e?.name!=='AbortError')window.pdfMake.createPdf(docDefinition).download(filename)}finally{resolve()}}));
  window.pdfMake.createPdf(docDefinition).download(filename);
}

function installPdfHook(){
  const previous=window.makePdf;if(typeof previous!=='function'||previous.__tbmTrainingAttendance)return;
  const wrapped=async function(action='download'){const x=st();if(x?.type===TYPE)return await makeAttendancePdf(action);return await previous.apply(this,arguments)};wrapped.__tbmTrainingAttendance=true;wrapped.__tbmPrevious=previous;window.makePdf=wrapped;
  window.makeTrainingAttendancePdf=makeAttendancePdf;window.tbmBuildTrainingAttendanceDocDefinition=buildDocDefinition;
}

function install(){installCss();installType();installSelectorOption();installCard();bindEvents();installHooks();installPdfHook();try{window.tbmInstallMobilePdfPerformance?.()}catch(_){ }window.dispatchEvent(new CustomEvent('tbm-training-attendance-ready'))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.__tbmTrainingAttendanceVersion='2026.09.04.1';
})();