(()=>{
'use strict';

const PT_TYPE='pt-altura';
const PT_TITLE='PT - Trabalho em Altura';
const EMISSOR_NOME='Jonatas Marques de Arruda';
const EMISSOR_CARGO='Coordenador / Técnico de Segurança do Trabalho';
const WORKSPACE_KEY='TBM-SST-07603376000300';
const LOGO='Têxtil Bezerra de Menezes 2.jpeg';
let ptState=null;
let saveTimerPT=null;
let cloudTimerPT=null;

const checklistPT=[
  {id:'epi1',n:1,categoria:'EPIs Obrigatórios',grupo:'epis',item:'Capacete com Jugular'},
  {id:'epi2',n:2,categoria:'EPIs Obrigatórios',grupo:'epis',item:'Cinto de Segurança tipo Paraquedista com Talabarte Duplo'},
  {id:'epi3',n:3,categoria:'EPIs Obrigatórios',grupo:'epis',item:'Óculos de Segurança, Luva apropriada e Calçado de Segurança'},
  {id:'geral1',n:4,categoria:'Condições Gerais',grupo:'gerais',item:'As condições atmosféricas são favoráveis (ausência de chuvas, ventos fortes)?'},
  {id:'geral2',n:5,categoria:'Condições Gerais',grupo:'gerais',item:'Os executantes estão em boas condições física e psicológica?'},
  {id:'esc1',n:6,categoria:'Escadas e Andaimes',grupo:'escadas',item:'As escadas utilizadas estão em boas condições de segurança?'},
  {id:'esc2',n:7,categoria:'Escadas e Andaimes',grupo:'escadas',item:'Foi verificado condições, estabilidade e travamento de andaimes, plataforma e escadas?'},
  {id:'pta1',n:8,categoria:'Plataforma Elevatória (PTA)',grupo:'pta',item:'Foi realizado checklist e aprovado para utilização da plataforma elevatória?'}
];
window.checklistPT=checklistPT;

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const nowISO=()=>new Date().toISOString();
function idPT(){return 'PT-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}
function blankChecklist(){return checklistPT.map(x=>({...x,status:'N/A'}))}
function blankWorker(){return {id:'W-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,5),nome:'',signature:''}}
function freshState(){
  const d=new Date();
  return {
    id:idPT(),type:PT_TYPE,title:PT_TITLE,createdAt:nowISO(),updatedAt:nowISO(),
    description:'',workLocation:'',sector:'',date:d.toISOString().slice(0,10),startTime:'',endTime:'',
    checklistPT:blankChecklist(),workers:[blankWorker()],
    issuer:{name:EMISSOR_NOME,role:EMISSOR_CARGO},status:'RASCUNHO'
  };
}
function normalizeState(x){
  const s=JSON.parse(JSON.stringify(x||freshState()));
  s.type=PT_TYPE;s.title=PT_TITLE;s.issuer={name:EMISSOR_NOME,role:EMISSOR_CARGO};
  s.checklistPT=checklistPT.map(q=>{const old=(s.checklistPT||[]).find(z=>z.id===q.id)||{};return {...q,status:['CONFORME','NÃO CONFORME','N/A'].includes(old.status)?old.status:'N/A'}});
  s.workers=Array.isArray(s.workers)&&s.workers.length?s.workers.map(w=>({id:w.id||blankWorker().id,nome:w.nome||'',signature:w.signature||''})):[blankWorker()];
  return s;
}
function statusClass(v){return v==='CONFORME'?'ok':v==='NÃO CONFORME'?'no':''}

function injectStyle(){
  if($('pt-altura-style'))return;
  const s=document.createElement('style');s.id='pt-altura-style';
  s.textContent=`
    .ptaltura{background:linear-gradient(145deg,#0f4c5c,#2a9d8f)}
    #ptAlturaOverlay{position:fixed;inset:0;background:#eef2f6;z-index:9998;overflow:auto}
    #ptAlturaOverlay .ptbar{position:sticky;top:0;z-index:5;background:linear-gradient(135deg,#0f4c5c,#2a9d8f);color:#fff;box-shadow:0 8px 24px #0002}
    #ptAlturaOverlay .ptbarin{max-width:1080px;margin:auto;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px}
    .pt-check-group{border:1px solid #d9e0e8;border-radius:14px;padding:12px;margin:12px 0;background:#fbfcfe}
    .pt-check-title{font-size:15px;font-weight:900;margin-bottom:10px}
    .pt-check-item{border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin:8px 0}
    .pt-check-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px}
    .pt-check-actions button{padding:10px 6px;border-radius:9px;background:#e9edf2;font-size:12px;font-weight:900}
    .pt-check-actions .ok{background:#dcfce7;color:#166534}.pt-check-actions .no{background:#fee2e2;color:#991b1b}.pt-check-actions .na{background:#e2e8f0;color:#334155}
    .pt-worker{border:1px solid #d9e0e8;border-radius:14px;padding:12px;margin:10px 0;background:#fbfcfe}
    .pt-worker-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}
    .pt-sign{border:2px solid #94a3b8;border-radius:12px;background:#fff;overflow:hidden;margin-top:9px}
    .pt-sign canvas{display:block;width:100%;height:145px;background:#fff;touch-action:none}
    .pt-fixed-issuer{border-left:4px solid #0f4c5c;background:#f0fdfa}
    @media(max-width:560px){.pt-check-actions{grid-template-columns:1fr}.pt-worker-head{align-items:flex-start}.pt-actions .btn{width:100%}}
  `;
  document.head.appendChild(s);
}

function addTile(){
  if($('ptAlturaTile'))return;
  const tiles=document.querySelector('#home .tiles');if(!tiles)return;
  const b=document.createElement('button');b.id='ptAlturaTile';b.type='button';b.className='tile ptaltura';
  b.innerHTML='<div class="ico">🪜</div><div><b>PT - Trabalho em Altura</b><span>NR 35 • Escadas, Andaimes e PTA</span></div>';
  b.onclick=()=>openPTAltura();tiles.appendChild(b);
}

function ensureOverlay(){
  let o=$('ptAlturaOverlay');if(o)return o;
  o=document.createElement('section');o.id='ptAlturaOverlay';o.className='hidden';
  o.innerHTML=`<div class="ptbar"><div class="ptbarin"><div><b>🪜 PT • Trabalho em Altura</b><div style="font-size:11px;opacity:.8">NR 35 • Permissão de Trabalho Simplificada</div></div><button type="button" id="ptClose" class="btn secondary">✕ Fechar</button></div></div><main class="wrap" id="ptAlturaBody"></main>`;
  document.body.appendChild(o);$('ptClose').onclick=()=>closePTAltura();return o;
}

function groupHTML(group,title){
  const items=ptState.checklistPT.filter(x=>x.grupo===group);
  return `<div class="pt-check-group"><div class="pt-check-title">${title}</div>${items.map(q=>`<div class="pt-check-item"><b style="font-size:12px">${q.n}. ${esc(q.item)}</b><div class="pt-check-actions">${['CONFORME','NÃO CONFORME','N/A'].map(v=>`<button type="button" data-pt-check="${q.id}" data-pt-status="${v}" class="${q.status===v?(v==='N/A'?'na':statusClass(v)):''}">${v}</button>`).join('')}</div></div>`).join('')}</div>`;
}

function workerHTML(w,i){
  return `<div class="pt-worker" data-pt-worker="${i}"><div class="pt-worker-head"><b>Executante ${i+1}</b>${ptState.workers.length>1?`<button type="button" class="btn danger" data-pt-remove-worker="${i}" style="padding:7px 9px">Excluir</button>`:''}</div><div class="field"><label>Nome do Executante</label><input data-pt-worker-name="${i}" value="${esc(w.nome)}" placeholder="Nome completo"></div><div class="field" style="margin-top:9px"><label>Assinatura do Executante</label><div class="pt-sign"><canvas id="ptSig-${i}" data-pt-sign="${i}"></canvas></div><button type="button" class="btn secondary full" data-pt-clear-sign="${i}">Limpar assinatura</button></div></div>`;
}

function renderPT(){
  const body=$('ptAlturaBody');if(!body||!ptState)return;
  body.innerHTML=`
    <div class="card"><div class="sectionTitle">Permissão de Trabalho - Trabalho em Altura</div><div id="ptMsg"></div><div class="grid">
      <div class="field" style="grid-column:1/-1"><label>Descrição do Trabalho *</label><textarea data-pt-field="description" placeholder="Descreva a atividade a ser executada">${esc(ptState.description)}</textarea></div>
      <div class="field"><label>Local do Trabalho *</label><input data-pt-field="workLocation" value="${esc(ptState.workLocation)}"></div>
      <div class="field"><label>Setor</label><input data-pt-field="sector" value="${esc(ptState.sector)}"></div>
      <div class="field"><label>Data *</label><input type="date" data-pt-field="date" value="${esc(ptState.date)}"></div>
      <div class="field"><label>Hora Inicial</label><input type="time" data-pt-field="startTime" value="${esc(ptState.startTime)}"></div>
      <div class="field"><label>Hora Final</label><input type="time" data-pt-field="endTime" value="${esc(ptState.endTime)}"></div>
    </div></div>
    <div class="card"><div class="sectionTitle">Checklist de EPIs e Equipamentos</div>
      ${groupHTML('epis','🦺 EPIs Obrigatórios')}
      ${groupHTML('gerais','🌤️ Condições Gerais')}
      ${groupHTML('escadas','🪜 Escadas e Andaimes')}
      ${groupHTML('pta','🏗️ Plataforma Elevatória (PTA)')}
    </div>
    <div class="card"><div class="sectionTitle">Trabalhadores Autorizados / Executantes</div><div class="notice info">Os colaboradores abaixo receberam treinamento e estão autorizados a executar as atividades.</div><div id="ptWorkers">${ptState.workers.map(workerHTML).join('')}</div><button type="button" id="ptAddWorker" class="btn secondary full">➕ Adicionar Executante</button></div>
    <div class="card pt-fixed-issuer"><div class="sectionTitle">Assinatura dos Responsáveis pela Liberação</div><div class="grid"><div class="field"><label>Emissor / TST</label><input value="${esc(EMISSOR_NOME)}" readonly></div><div class="field"><label>Cargo</label><input value="${esc(EMISSOR_CARGO)}" readonly></div></div><div class="mini" style="margin-top:10px">Responsável técnico fixado no sistema. Não requer digitação manual.</div></div>
    <div class="card"><div class="actions pt-actions"><button type="button" id="ptSave" class="btn success">💾 Salvar PT</button><button type="button" id="ptPdf" class="btn primary">📥 Baixar PDF</button><button type="button" id="ptShare" class="btn blue">📲 Compartilhar PDF</button></div></div>`;
  bindPT();
  ptState.workers.forEach((w,i)=>setupSignature(i,w.signature));
}

function bindPT(){
  const body=$('ptAlturaBody');if(!body)return;
  body.oninput=e=>{
    e.stopPropagation();
    const f=e.target.dataset.ptField;if(f){ptState[f]=e.target.value;scheduleSavePT()}
    const wi=e.target.dataset.ptWorkerName;if(wi!==undefined){ptState.workers[+wi].nome=e.target.value;scheduleSavePT()}
  };
  body.onchange=e=>{e.stopPropagation()};
  body.onclick=e=>{
    e.stopPropagation();
    const check=e.target.closest('[data-pt-check]');if(check){const q=ptState.checklistPT.find(x=>x.id===check.dataset.ptCheck);if(q){q.status=check.dataset.ptStatus;renderPT();scheduleSavePT()}return}
    const rm=e.target.closest('[data-pt-remove-worker]');if(rm){ptState.workers.splice(+rm.dataset.ptRemoveWorker,1);renderPT();scheduleSavePT();return}
    const clear=e.target.closest('[data-pt-clear-sign]');if(clear){const i=+clear.dataset.ptClearSign;ptState.workers[i].signature='';const c=$('ptSig-'+i);c?.getContext('2d')?.clearRect(0,0,c.width,c.height);scheduleSavePT();return}
  };
  $('ptAddWorker').onclick=e=>{e.stopPropagation();ptState.workers.push(blankWorker());renderPT();scheduleSavePT()};
  $('ptSave').onclick=e=>{e.stopPropagation();savePT(true)};
  $('ptPdf').onclick=e=>{e.stopPropagation();savePT(false).then(()=>makePTPdf('download'))};
  $('ptShare').onclick=e=>{e.stopPropagation();savePT(false).then(()=>makePTPdf('share'))};
}

function setupSignature(i,data){
  const c=$('ptSig-'+i);if(!c)return;
  const ratio=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  const rect=c.getBoundingClientRect();c.width=Math.max(320,Math.round(rect.width*ratio));c.height=Math.round(145*ratio);
  const ctx=c.getContext('2d');ctx.lineWidth=2.2*ratio;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111827';
  if(data){const img=new Image();img.onload=()=>{ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height)};img.src=data}
  let down=false,last=null;
  const point=e=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*(c.width/r.width),y:(e.clientY-r.top)*(c.height/r.height)}};
  c.onpointerdown=e=>{down=true;last=point(e);c.setPointerCapture?.(e.pointerId);e.preventDefault()};
  c.onpointermove=e=>{if(!down)return;const p=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;e.preventDefault()};
  const end=e=>{if(!down)return;down=false;ptState.workers[i].signature=c.toDataURL('image/png');scheduleSavePT();e?.preventDefault?.()};
  c.onpointerup=end;c.onpointercancel=end;c.onpointerleave=e=>{if(down)end(e)};
}

function showMsg(text,type='successbox'){
  const m=$('ptMsg');if(!m)return;m.className='notice '+type;m.textContent=text;setTimeout(()=>{if(m.textContent===text)m.textContent=''},2500)
}
function scheduleSavePT(){clearTimeout(saveTimerPT);saveTimerPT=setTimeout(()=>savePT(false),900);clearTimeout(cloudTimerPT);cloudTimerPT=setTimeout(()=>pushPTCloud().catch(()=>{}),1800)}

async function savePT(feedback=false){
  if(!ptState)return false;
  ptState.updatedAt=nowISO();ptState.issuer={name:EMISSOR_NOME,role:EMISSOR_CARGO};
  try{
    if(typeof window.idbPut==='function')await window.idbPut(JSON.parse(JSON.stringify(ptState)));
    pushPTCloud().catch(()=>{});
    if(feedback)showMsg('✅ PT salva com sucesso.');
    return true;
  }catch(e){console.error('[PT SAVE]',e);if(feedback)showMsg('❌ Não foi possível salvar a PT.','errorbox');return false}
}

async function pushPTCloud(){
  if(!ptState?.id||!window.SST?.fs)return false;
  const payload=JSON.parse(JSON.stringify(ptState));
  payload.workspaceKey=WORKSPACE_KEY;payload.cloudDeviceId=(localStorage.getItem('tbm-sst-device-id')||'PT');payload.cloudClientUpdatedAt=nowISO();payload.ownerUid=window.SST?.uid||'';payload.appVersion='2026.09.03.pt-altura.1';
  if(window.firebase?.firestore?.FieldValue?.serverTimestamp)payload.cloudSyncedAt=window.firebase.firestore.FieldValue.serverTimestamp();
  try{await window.SST.fs.collection('inspections').doc(String(payload.id)).set(payload,{merge:true});return true}catch(e){console.warn('[PT CLOUD]',e);return false}
}

function openPTAltura(data){
  injectStyle();ensureOverlay();ptState=normalizeState(data||freshState());
  $('ptAlturaOverlay').classList.remove('hidden');document.body.style.overflow='hidden';renderPT();
}
function closePTAltura(){
  savePT(false).catch(()=>{});$('ptAlturaOverlay')?.classList.add('hidden');document.body.style.overflow='';
}

async function openPTById(id){
  try{const x=typeof window.idbGet==='function'?await window.idbGet(id):null;if(x&&x.type===PT_TYPE)openPTAltura(x)}catch(e){console.warn('[PT OPEN]',e)}
}

async function imageToDataUrl(src){
  try{const r=await fetch(src,{cache:'no-store'});if(!r.ok)return null;const b=await r.blob();return await new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=no;f.readAsDataURL(b)})}catch(_){return null}
}
function fmtDate(v){if(!v)return'—';const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}/${m}/${y}`:v}
const pdfGrid={hLineWidth:()=>0.7,vLineWidth:()=>0.7,hLineColor:()=>'#dddddd',vLineColor:()=>'#dddddd',paddingLeft:()=>7,paddingRight:()=>7,paddingTop:()=>5,paddingBottom:()=>5};
function pdfHeader(text){return {text,bold:true,fillColor:'#f4f4f4',fontSize:9,color:'#111'}}
function pdfSection(title){return {table:{widths:['*'],body:[[{text:title,bold:true,fillColor:'#f4f4f4',fontSize:11,color:'#111'}]]},layout:pdfGrid,margin:[0,10,0,0]}}
function checklistTable(group,title){
  const rows=[[pdfHeader('#'),pdfHeader('Item verificado'),pdfHeader('Status')]];
  ptState.checklistPT.filter(x=>x.grupo===group).forEach(x=>rows.push([String(x.n),x.item,x.status]));
  return [pdfSection(title),{table:{headerRows:1,widths:[28,'*',110],body:rows},layout:pdfGrid,fontSize:8}];
}
function workerSignatureCell(w,i){
  const stack=[];
  if(w.signature)stack.push({image:w.signature,fit:[210,60],alignment:'center',margin:[0,0,0,5]});else stack.push({text:'',margin:[0,0,0,55]});
  stack.push({canvas:[{type:'line',x1:10,y1:0,x2:220,y2:0,lineWidth:.8,lineColor:'#222'}],margin:[0,0,0,5]});
  stack.push({text:w.nome||`Executante ${i+1}`,bold:true,alignment:'center',fontSize:8.5});
  stack.push({text:'Trabalhador Autorizado / Executante',alignment:'center',fontSize:7.5,margin:[0,2,0,0]});
  return {stack,margin:[5,7,5,5]};
}

async function makePTPdf(action='download'){
  if(!window.pdfMake){alert('Biblioteca pdfmake indisponível.');return}
  const logo=await imageToDataUrl(LOGO);const emitido=new Date().toLocaleString('pt-BR');
  const content=[];
  content.push({table:{widths:[55,'*',145],body:[[
    logo?{image:logo,fit:[50,42]}:{text:'TBM',bold:true},
    {stack:[{text:'PERMISSÃO DE TRABALHO – TRABALHO EM ALTURA (NR 35)',bold:true,fontSize:13},{text:'Escadas • Andaimes • Plataforma Elevatória (PTA)',fontSize:9,margin:[0,4,0,0]}]},
    {stack:[{text:`Nº ${ptState.id}`,bold:true,alignment:'right',fontSize:8.5},{text:`Emissão: ${emitido}`,alignment:'right',fontSize:7.5,margin:[0,4,0,0]}]}
  ]]},layout:'noBorders',margin:[0,0,0,8]});
  content.push({canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:.9,lineColor:'#222'}],margin:[0,0,0,8]});
  content.push({table:{widths:['32%','68%'],body:[
    [pdfHeader('Descrição do Trabalho'),{text:ptState.description||'—'}],
    [pdfHeader('Local do Trabalho'),{text:ptState.workLocation||'—'}],
    [pdfHeader('Setor'),{text:ptState.sector||'—'}],
    [pdfHeader('Data'),{text:fmtDate(ptState.date)}],
    [pdfHeader('Horário'),{text:`Inicial: ${ptState.startTime||'—'}   •   Final: ${ptState.endTime||'—'}`}]
  ]},layout:pdfGrid,fontSize:9});
  checklistTable('epis','Checklist de Inspeção - EPIs Obrigatórios').forEach(x=>content.push(x));
  checklistTable('gerais','Checklist de Inspeção - Condições Gerais').forEach(x=>content.push(x));
  checklistTable('escadas','Checklist de Inspeção - Escadas e Andaimes').forEach(x=>content.push(x));
  checklistTable('pta','Checklist de Inspeção - Plataforma Elevatória (PTA)').forEach(x=>content.push(x));
  content.push(pdfSection('Trabalhadores Autorizados / Executantes'));
  content.push({text:'Os colaboradores abaixo receberam treinamento e estão autorizados a executar as atividades.',fontSize:8,margin:[0,6,0,4]});
  const wr=[];for(let i=0;i<ptState.workers.length;i+=2)wr.push([workerSignatureCell(ptState.workers[i],i),ptState.workers[i+1]?workerSignatureCell(ptState.workers[i+1],i+1):{text:''}]);
  content.push({table:{widths:['*','*'],body:wr},layout:'noBorders'});
  content.push(pdfSection('Responsável pela Liberação'));
  content.push({table:{widths:['50%','50%'],body:[[pdfHeader('Emissor / TST'),pdfHeader('Cargo')],[{text:EMISSOR_NOME,bold:true},{text:EMISSOR_CARGO,bold:true}]]},layout:pdfGrid,fontSize:9});
  content.push({canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:.7,lineColor:'#ccc'}],margin:[0,14,0,7]});
  content.push({text:`Documento eletrônico • Permissão de Trabalho em Altura • ID ${ptState.id}`,alignment:'center',fontSize:7.5});
  content.push({text:`Relatório gerado em ${emitido}`,alignment:'center',fontSize:7.5,margin:[0,3,0,0]});
  const doc={pageSize:'A4',pageMargins:[42,42,42,42],defaultStyle:{font:'Roboto',fontSize:9,color:'#111',lineHeight:1.2},content};
  const filename=`PT_Trabalho_Altura_${ptState.id}.pdf`;
  if(action==='share'){
    window.pdfMake.createPdf(doc).getBlob(async blob=>{
      try{const file=new File([blob],filename,{type:'application/pdf'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({title:'PT - Trabalho em Altura',text:`Permissão de Trabalho ${ptState.id}`,files:[file]});else window.pdfMake.createPdf(doc).download(filename)}catch(e){if(e?.name!=='AbortError')window.pdfMake.createPdf(doc).download(filename)}
    });
  }else window.pdfMake.createPdf(doc).download(filename);
}

function installHistoryInterceptor(){
  document.addEventListener('click',async e=>{
    const open=e.target.closest?.('[data-open-h]');
    const report=e.target.closest?.('[data-report-h]');
    const t=open||report;if(!t)return;
    const id=open?open.dataset.openH:report.dataset.reportH;
    let x=null;try{x=typeof window.idbGet==='function'?await window.idbGet(id):null}catch(_){ }
    if(!x||x.type!==PT_TYPE)return;
    e.preventDefault();e.stopImmediatePropagation();
    openPTAltura(x);
    if(report)setTimeout(()=>makePTPdf('download'),120);
  },true);
}

function install(){injectStyle();addTile();ensureOverlay();installHistoryInterceptor();setTimeout(addTile,700);setTimeout(addTile,1800)}
window.openPTAltura=openPTAltura;
window.openPTAlturaFromState=openPTAltura;
window.makePTAlturaPdf=makePTPdf;
window.savePTAltura=savePT;
window.PT_ALTURA_EMISSOR={name:EMISSOR_NOME,role:EMISSOR_CARGO};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();