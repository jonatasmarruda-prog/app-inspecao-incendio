(()=>{
'use strict';

const UX_VERSION='2026.09.03.premium.1';
const STYLE_ID='tbm-premium-ux-style';
const FIELD_MODE_KEY='tbm-sst-field-mode';
const LAST_SYNC_KEY='tbm-sst-last-cloud-sync';
let dashboardTimer=null;
let progressTimer=null;
let historyDecorating=false;
let pdfWrapped=false;

const $=id=>document.getElementById(id);
const clone=v=>JSON.parse(JSON.stringify(v||{}));
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function getState(){try{return typeof state!=='undefined'?state:(window.state||null)}catch(_){return window.state||null}}
function setState(next){try{state=next;return true}catch(_){window.state=next;return true}}
function ts(v){const n=Date.parse(v||'');return Number.isFinite(n)?n:0}
function fmtDate(v){if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);return d.toLocaleDateString('pt-BR')}
function fmtDateTime(v){if(!v)return'—';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v);return d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}
function recordTitle(x){if(x?.type==='pt-altura')return'PT - Trabalho em Altura';return x?.title||({fire:'Combate a Incêndio',safety:'Inspeção de Segurança',machine:'Máquinas e Equipamentos',epi:'Inspeção de EPI',accident:'Investigação de Acidente',report:'Relatório de Inspeção'}[x?.type]||'Inspeção SST')}
function companyName(x){return x?.company==='Outro'?(x?.otherCompany||'Outro'):x?.company||'—'}

function collectStatuses(x){
  const out=[];
  const push=v=>{if(typeof v==='string')out.push(v.toUpperCase())};
  (x?.checks||[]).forEach(v=>push(typeof v==='string'?v:v?.status));
  (x?.equipment||[]).forEach(e=>{push(e?.status);(e?.checks||[]).forEach(push);(e?.premiumChecks||[]).forEach(push)});
  ['checklistExtintores','checklistHidrantes','checklistPT'].forEach(k=>(x?.[k]||[]).forEach(v=>push(typeof v==='string'?v:v?.status)));
  return out;
}
function ncCount(x){return collectStatuses(x).filter(v=>v==='NÃO CONFORME'||v==='NAO CONFORME').length}
function pendingCount(x){return collectStatuses(x).filter(v=>!v||v==='PENDENTE').length}
function completionOf(x){
  if(!x)return 0;
  let done=0,total=0;
  const base=['company','address','inspector','sector','date'];
  if(x.type==='pt-altura')base.splice(0,base.length,'description','workLocation','sector','date','startTime','endTime');
  base.forEach(k=>{total++;if(String(x[k]??'').trim())done++});
  const statuses=collectStatuses(x);
  if(statuses.length){total+=statuses.length;done+=statuses.filter(v=>v&&v!=='PENDENTE').length}
  if(Array.isArray(x.equipment)&&x.equipment.length){total++;done++}
  if(Array.isArray(x.workers)&&x.workers.length){total++;if(x.workers.some(w=>String(w?.nome||'').trim()))done++}
  return total?Math.max(0,Math.min(100,Math.round(done*100/total))):0;
}
function inspectionStatus(x){
  if(x?.deleted)return'EXCLUÍDA';
  if(ncCount(x)>0)return'NÃO CONFORME';
  if(String(x?.status||'').toUpperCase()==='CONCLUÍDA')return'CONCLUÍDA';
  const p=completionOf(x);
  if(p>=95)return'CONCLUÍDA';
  if(p>=30)return'EM ANDAMENTO';
  return'RASCUNHO';
}
function statusClass(v){return({'CONCLUÍDA':'done','NÃO CONFORME':'nc','EM ANDAMENTO':'run','RASCUNHO':'draft'}[v]||'draft')}

function injectStyle(){
  if($(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;
  s.textContent=`
  .tbmDash{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0 12px}
  .tbmMetric{border:1px solid #2a3541;background:linear-gradient(145deg,#111923,#0b1118);border-radius:16px;padding:14px;color:#f8fafc;box-shadow:0 12px 28px #0004;text-align:left;min-height:94px}
  .tbmMetric small{display:block;color:#93a1af;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.6px}.tbmMetric strong{display:block;font-size:25px;margin-top:6px}.tbmMetric span{display:block;color:#aab5c0;font-size:10px;margin-top:3px}
  .tbmDashMeta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0 16px}.tbmCloudMeta{font-size:10px;color:#aab5c0;border:1px solid #26323e;background:#0c131a;border-radius:999px;padding:7px 10px}
  #tbmContinueLast{background:linear-gradient(135deg,#0f766e,#14b8a6)!important;color:#fff!important;border:0!important;min-height:54px!important;margin-top:4px!important}
  .tbmProgressWrap{position:sticky;top:82px;z-index:42;background:#0b1118eF;border:1px solid #283440;border-radius:14px;padding:10px 12px;margin:10px 0 14px;backdrop-filter:blur(10px);box-shadow:0 8px 24px #0005}
  .tbmProgressTop{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#e7edf3;font-size:11px;font-weight:900}.tbmProgressTrack{height:7px;background:#202b35;border-radius:999px;overflow:hidden;margin-top:8px}.tbmProgressBar{height:100%;width:0;background:linear-gradient(90deg,#16a34a,#22c55e);border-radius:999px;transition:width .25s ease}
  .tbmHistoryFilters{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;margin:12px 0}.tbmHistoryFilters input,.tbmHistoryFilters select{width:100%;background:#101820;color:#f4f6f8;border:1px solid #2a3642;border-radius:10px;padding:10px}
  .tbmStatus{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:900;white-space:nowrap}.tbmStatus.done{background:#dcfce7;color:#166534}.tbmStatus.nc{background:#fee2e2;color:#991b1b}.tbmStatus.run{background:#dbeafe;color:#1d4ed8}.tbmStatus.draft{background:#fef3c7;color:#92400e}
  .tbmDetailGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.tbmDetailCell{border:1px solid #dbe2ea;border-radius:10px;background:#f8fafc;padding:10px;color:#17202b}.tbmDetailCell small{display:block;color:#64748b;font-size:9px;font-weight:900;text-transform:uppercase}.tbmDetailCell b{display:block;font-size:12px;margin-top:3px;word-break:break-word}
  #tbmDetailModal .modalbox,#tbmPdfSummary .modalbox{max-width:620px;background:#fff!important;color:#17202b!important}#tbmDetailModal .sectionTitle,#tbmPdfSummary .sectionTitle{color:#17202b!important}
  .tbmSummaryStats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.tbmSummaryStat{border:1px solid #dbe2ea;border-radius:10px;padding:10px;text-align:center;background:#f8fafc;color:#17202b}.tbmSummaryStat b{display:block;font-size:19px}.tbmSummaryStat span{font-size:9px;color:#64748b;font-weight:800}
  #tbmToastHost{position:fixed;right:14px;bottom:14px;z-index:12000;display:flex;flex-direction:column;gap:8px;max-width:min(360px,calc(100vw - 28px))}.tbmToast{background:#101820;color:#f8fafc;border:1px solid #334155;border-radius:12px;padding:11px 13px;box-shadow:0 12px 35px #0008;font-size:12px;font-weight:800;animation:tbmToastIn .18s ease}.tbmToast.ok{border-color:#166534}.tbmToast.warn{border-color:#92400e}.tbmToast.err{border-color:#991b1b}@keyframes tbmToastIn{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}
  .tile{isolation:isolate}.tile:before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,#ffffff08,transparent 45%);pointer-events:none}.tile .ico{filter:drop-shadow(0 7px 12px #0005)}
  body.tbm-field-mode #form .card,body.tbm-field-mode #ptAlturaOverlay .card{padding:12px!important;margin-bottom:10px!important}body.tbm-field-mode .field input,body.tbm-field-mode .field select,body.tbm-field-mode .field textarea{min-height:50px!important;font-size:16px!important}body.tbm-field-mode .choices button,body.tbm-field-mode .pt-check-actions button{min-height:50px!important;font-size:13px!important}body.tbm-field-mode #form>.actions{position:sticky;top:82px;z-index:45;background:#070b10;padding:8px;border-radius:12px;border:1px solid #27323d}
  @media(max-width:760px){.tbmDash{grid-template-columns:1fr 1fr}.tbmHistoryFilters{grid-template-columns:1fr 1fr}.tbmSummaryStats{grid-template-columns:1fr 1fr}.tbmProgressWrap{top:72px}}
  @media(max-width:480px){.tbmHistoryFilters,.tbmDetailGrid{grid-template-columns:1fr}.tbmMetric{min-height:82px;padding:12px}.tbmMetric strong{font-size:22px}}
  `;
  document.head.appendChild(s);
}

function toast(text,type='ok',ms=2600){
  let host=$('tbmToastHost');if(!host){host=document.createElement('div');host.id='tbmToastHost';document.body.appendChild(host)}
  const t=document.createElement('div');t.className='tbmToast '+type;t.textContent=text;host.appendChild(t);setTimeout(()=>t.remove(),ms);
}
window.tbmToast=toast;

async function allRecords(){try{if(typeof window.tbmDashboardRecords==='function')return await window.tbmDashboardRecords();return typeof window.idbAll==='function'?(await window.idbAll()||[]):[]}catch(e){console.warn('[PREMIUM UX] histórico',e);return[]}}
function scheduleDashboard(){clearTimeout(dashboardTimer);dashboardTimer=setTimeout(()=>renderDashboard().catch(()=>{}),180)}

async function renderDashboard(){
  const hero=document.querySelector('#home .hero');if(!hero)return;
  const list=(await allRecords()).filter(x=>!x?.deleted);
  const today=new Date().toISOString().slice(0,10);
  const todayCount=list.filter(x=>String(x.date||'').slice(0,10)===today).length;
  const drafts=list.filter(x=>!['CONCLUÍDA','NÃO CONFORME'].includes(inspectionStatus(x))).length;
  const ncs=list.reduce((n,x)=>n+ncCount(x),0);
  const ptOpen=list.filter(x=>x.type==='pt-altura'&&inspectionStatus(x)!=='CONCLUÍDA').length;
  let box=$('tbmDashboard');
  if(!box){box=document.createElement('div');box.id='tbmDashboard';const todayEl=hero.querySelector('.today');todayEl?.insertAdjacentElement('afterend',box)}
  const lastSync=localStorage.getItem(LAST_SYNC_KEY)||'';
  box.innerHTML=`<div class="tbmDash">
    <button type="button" class="tbmMetric" data-dash-filter="today"><small>Inspeções hoje</small><strong>${todayCount}</strong><span>Registros do dia</span></button>
    <button type="button" class="tbmMetric" data-dash-filter="draft"><small>Em andamento</small><strong>${drafts}</strong><span>Rascunhos pendentes</span></button>
    <button type="button" class="tbmMetric" data-dash-filter="nc"><small>Não conformidades</small><strong>${ncs}</strong><span>Itens encontrados</span></button>
    <button type="button" class="tbmMetric" data-dash-filter="pt"><small>PTs abertas</small><strong>${ptOpen}</strong><span>Trabalho em altura</span></button>
  </div><div class="tbmDashMeta"><span class="tbmCloudMeta">☁️ Última sincronização: ${lastSync?esc(fmtDateTime(lastSync)):'aguardando'}</span></div>`;
  const last=[...list].sort((a,b)=>ts(b.updatedAt||b.createdAt)-ts(a.updatedAt||a.createdAt))[0];
  let cont=$('tbmContinueLast');
  if(last){
    if(!cont){cont=document.createElement('button');cont.id='tbmContinueLast';cont.type='button';cont.className='btn full';box.insertAdjacentElement('afterend',cont)}
    cont.textContent=`▶️ Continuar última inspeção • ${recordTitle(last)}`;cont.dataset.id=last.id;cont.onclick=()=>openRecord(last.id);
  }else cont?.remove();
  box.querySelectorAll('[data-dash-filter]').forEach(b=>b.onclick=()=>openHistoryWithFilter(b.dataset.dashFilter));
  updatePendingBadge(list);
}

function updatePendingBadge(list){
  const b=$('openHistory');if(!b)return;const pending=list.filter(x=>['RASCUNHO','EM ANDAMENTO'].includes(inspectionStatus(x))).length;
  b.dataset.baseText=b.dataset.baseText||'📚 Abrir histórico de inspeções';b.textContent=pending?`${b.dataset.baseText} • ${pending} pendente(s)`:b.dataset.baseText;
}

function ensureProgress(){
  const form=$('form');if(!form)return;
  let p=$('tbmProgress');if(!p){p=document.createElement('div');p.id='tbmProgress';p.className='tbmProgressWrap';p.innerHTML='<div class="tbmProgressTop"><span>Progresso da inspeção</span><b id="tbmProgressText">0%</b></div><div class="tbmProgressTrack"><div class="tbmProgressBar" id="tbmProgressBar"></div></div>';const a=form.querySelector(':scope > .actions');a?.insertAdjacentElement('afterend',p)}
  updateProgress();
}
function updateProgress(){const st=getState();const p=completionOf(st);const t=$('tbmProgressText'),b=$('tbmProgressBar');if(t)t.textContent=`${p}% preenchido`;if(b)b.style.width=p+'%'}
function scheduleProgressUpdate(){clearTimeout(progressTimer);progressTimer=setTimeout(updateProgress,120)}

function ensureFieldModeButtons(){
  const actions=document.querySelector('#form>.actions');if(actions&&!$('tbmFieldMode')){const b=document.createElement('button');b.id='tbmFieldMode';b.type='button';b.className='btn secondary';b.onclick=toggleFieldMode;actions.appendChild(b)}
  const bar=document.querySelector('#ptAlturaOverlay .ptbarin');if(bar&&!$('tbmPtFieldMode')){const b=document.createElement('button');b.id='tbmPtFieldMode';b.type='button';b.className='btn secondary';b.onclick=toggleFieldMode;const close=$('ptClose');close?.insertAdjacentElement('beforebegin',b)}
  refreshFieldModeText();
}
function toggleFieldMode(){document.body.classList.toggle('tbm-field-mode');localStorage.setItem(FIELD_MODE_KEY,document.body.classList.contains('tbm-field-mode')?'1':'0');refreshFieldModeText();toast(document.body.classList.contains('tbm-field-mode')?'📱 Modo Campo ativado':'🖥️ Modo Campo desativado')}
function refreshFieldModeText(){const on=document.body.classList.contains('tbm-field-mode');[$('tbmFieldMode'),$('tbmPtFieldMode')].forEach(b=>{if(b)b.textContent=on?'🖥️ Modo Normal':'📱 Modo Campo'})}

function ensureHistoryFilters(){
  const list=$('historyList');if(!list)return null;let f=$('tbmHistoryFilters');if(f)return f;
  f=document.createElement('div');f.id='tbmHistoryFilters';f.className='tbmHistoryFilters';
  f.innerHTML='<input id="tbmHistorySearch" placeholder="🔎 Buscar empresa, setor, ID..."><select id="tbmHistoryType"><option value="">Todos os tipos</option><option value="fire">Combate a Incêndio</option><option value="safety">Segurança</option><option value="machine">Máquinas</option><option value="epi">EPI</option><option value="accident">Acidente</option><option value="report">Relatório</option><option value="pt-altura">PT - Altura</option></select><select id="tbmHistoryStatus"><option value="">Todos os status</option><option>RASCUNHO</option><option>EM ANDAMENTO</option><option>CONCLUÍDA</option><option>NÃO CONFORME</option></select><input type="date" id="tbmHistoryDate">';
  list.insertAdjacentElement('beforebegin',f);f.addEventListener('input',applyHistoryFilters);f.addEventListener('change',applyHistoryFilters);return f;
}
async function decorateHistory(){
  if(historyDecorating)return;historyDecorating=true;
  try{
    ensureHistoryFilters();const records=await allRecords();const map=new Map(records.map(x=>[String(x.id),x]));
    document.querySelectorAll('#historyList .historyItem').forEach(card=>{
      const open=card.querySelector('[data-open-h],[data-premium-open]');const report=card.querySelector('[data-report-h],[data-premium-report]');const del=card.querySelector('[data-delete-h]');
      const id=String(open?.dataset.openH||open?.dataset.premiumOpen||report?.dataset.reportH||report?.dataset.premiumReport||del?.dataset.deleteH||'');const x=map.get(id);if(!x)return;
      card.dataset.tbmId=id;card.dataset.tbmType=x.type||'';card.dataset.tbmStatus=inspectionStatus(x);card.dataset.tbmDate=String(x.date||'').slice(0,10);card.dataset.tbmSearch=[id,recordTitle(x),companyName(x),x.sector||'',x.address||''].join(' ').toLowerCase();
      if(open){open.dataset.premiumOpen=id;delete open.dataset.openH;open.textContent='Detalhes'}
      if(report){report.dataset.premiumReport=id;delete report.dataset.reportH}
      let status=card.querySelector('.tbmStatus');if(!status){status=document.createElement('span');card.querySelector('.historyTop')?.appendChild(status)}const st=inspectionStatus(x);status.className='tbmStatus '+statusClass(st);status.textContent=st;
      const actions=card.querySelector('.actions');if(actions&&!actions.querySelector('[data-premium-duplicate]')){const b=document.createElement('button');b.type='button';b.className='btn secondary';b.textContent='Duplicar';b.dataset.premiumDuplicate=id;actions.appendChild(b)}
    });
    applyHistoryFilters();
  }finally{historyDecorating=false}
}
function applyHistoryFilters(){const q=String($('tbmHistorySearch')?.value||'').trim().toLowerCase();const type=$('tbmHistoryType')?.value||'';const status=$('tbmHistoryStatus')?.value||'';const date=$('tbmHistoryDate')?.value||'';document.querySelectorAll('#historyList .historyItem').forEach(c=>{const ok=(!q||c.dataset.tbmSearch?.includes(q))&&(!type||c.dataset.tbmType===type)&&(!status||c.dataset.tbmStatus===status)&&(!date||c.dataset.tbmDate===date);c.style.display=ok?'':'none'})}
async function openHistoryWithFilter(kind){
  try{if(typeof window.openHistory==='function')await window.openHistory();else $('openHistory')?.click()}catch(_){$('openHistory')?.click()}
  setTimeout(async()=>{await decorateHistory();if(kind==='draft')$('tbmHistoryStatus').value='EM ANDAMENTO';if(kind==='pt')$('tbmHistoryType').value='pt-altura';if(kind==='today')$('tbmHistoryDate').value=new Date().toISOString().slice(0,10);if(kind==='nc')$('tbmHistoryStatus').value='NÃO CONFORME';applyHistoryFilters()},120);
}

async function getRecord(id){try{return typeof window.idbGet==='function'?await window.idbGet(id):null}catch(_){return null}}
async function openRecord(id){const x=await getRecord(id);if(!x)return toast('Registro não encontrado.','err');closeDetail();if(x.type==='pt-altura'&&typeof window.openPTAltura==='function'){window.openPTAltura(x);return}setState(clone(x));window.renderForm?.();window.show?.('form');setTimeout(()=>{ensureProgress();updateProgress();ensureFieldModeButtons()},80)}

function ensureDetailModal(){let m=$('tbmDetailModal');if(m)return m;m=document.createElement('div');m.id='tbmDetailModal';m.className='modal hidden';m.innerHTML='<div class="modalbox"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div class="sectionTitle" style="margin:0">Detalhes da inspeção</div><button type="button" class="btn secondary" data-detail-close>✕</button></div><div id="tbmDetailBody"></div></div>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-detail-close]'))closeDetail()});return m}
function closeDetail(){$('tbmDetailModal')?.classList.add('hidden')}
async function showDetail(id){const x=await getRecord(id);if(!x)return toast('Registro não encontrado.','err');const m=ensureDetailModal(),body=$('tbmDetailBody'),st=inspectionStatus(x),p=completionOf(x);body.innerHTML=`<div class="tbmDetailGrid"><div class="tbmDetailCell"><small>Tipo</small><b>${esc(recordTitle(x))}</b></div><div class="tbmDetailCell"><small>Status</small><b>${esc(st)} • ${p}%</b></div><div class="tbmDetailCell"><small>Empresa</small><b>${esc(companyName(x))}</b></div><div class="tbmDetailCell"><small>Setor / local</small><b>${esc(x.sector||x.workLocation||'—')}</b></div><div class="tbmDetailCell"><small>Data</small><b>${esc(fmtDate(x.date))}</b></div><div class="tbmDetailCell"><small>ID</small><b>${esc(x.id)}</b></div><div class="tbmDetailCell"><small>Não conformidades</small><b>${ncCount(x)}</b></div><div class="tbmDetailCell"><small>Fotos</small><b>${Array.isArray(x.photos)?x.photos.length:0}</b></div></div><div class="actions"><button class="btn success" data-detail-continue="${esc(x.id)}">▶️ Continuar</button><button class="btn primary" data-detail-pdf="${esc(x.id)}">📥 PDF</button><button class="btn secondary" data-detail-duplicate="${esc(x.id)}">📄 Duplicar</button><button class="btn danger" data-detail-delete="${esc(x.id)}">🗑️ Excluir</button></div>`;m.classList.remove('hidden')}

function resetDuplicate(x){
  const y=clone(x),now=new Date().toISOString();y.id=(y.type==='pt-altura'?'PT-':'INS-')+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();y.createdAt=now;y.updatedAt=now;y.status='RASCUNHO';y.photos=[];
  if(Array.isArray(y.checks))y.checks=y.checks.map(()=> 'PENDENTE');
  ['checklistExtintores','checklistHidrantes'].forEach(k=>{if(Array.isArray(y[k]))y[k]=y[k].map(v=>typeof v==='string'?'PENDENTE':{...v,status:'PENDENTE'})});
  if(Array.isArray(y.checklistPT))y.checklistPT=y.checklistPT.map(v=>typeof v==='string'?'N/A':{...v,status:'N/A'});
  if(Array.isArray(y.equipment))y.equipment=y.equipment.map(e=>({...e,status:'PENDENTE',obs:'',checks:Array.isArray(e.checks)?e.checks.map(()=> 'PENDENTE'):e.checks,premiumChecks:Array.isArray(e.premiumChecks)?e.premiumChecks.map(()=> 'PENDENTE'):e.premiumChecks}));
  if(Array.isArray(y.workers))y.workers=y.workers.map(w=>({...w,signature:''}));
  Object.keys(y).forEach(k=>{if(/signature|assinatura/i.test(k)&&typeof y[k]==='string')y[k]=''});
  ['diagnosis','diagnostico','nonConformities','naoConformidades','recommendations','recomendacoes','actions','acoes'].forEach(k=>{if(typeof y[k]==='string')y[k]=''});
  delete y.workspaceKey;delete y.cloudDeviceId;delete y.cloudClientUpdatedAt;delete y.cloudSyncedAt;delete y.deleted;delete y.deletedAt;return y;
}
async function duplicateRecord(id){const x=await getRecord(id);if(!x)return;const y=resetDuplicate(x);try{await window.idbPut?.(y);toast('📄 Nova inspeção criada a partir da anterior.');scheduleDashboard();closeDetail();if(y.type==='pt-altura'&&window.openPTAltura)window.openPTAltura(y);else{setState(y);window.renderForm?.();window.show?.('form');setTimeout(updateProgress,80)}setTimeout(()=>window.tbmPushCloud?.('duplicate'),250)}catch(e){console.error(e);toast('Não foi possível duplicar.','err')}}
async function deleteRecord(id){if(!confirm('Excluir esta inspeção em todos os dispositivos?'))return;try{if(typeof window.tbmDeleteCloudInspection==='function')await window.tbmDeleteCloudInspection(id,{deleteLocal:true});else{await window.idbDelete?.(id);if(window.SST?.fs)await window.SST.fs.collection('inspections').doc(String(id)).delete()}toast('🗑️ Inspeção excluída.');closeDetail();scheduleDashboard();setTimeout(()=>$('openHistory')?.click(),150)}catch(e){console.error(e);toast('Não foi possível excluir.','err')}}

function ensurePdfSummary(){let m=$('tbmPdfSummary');if(m)return m;m=document.createElement('div');m.id='tbmPdfSummary';m.className='modal hidden';m.innerHTML='<div class="modalbox"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div class="sectionTitle" style="margin:0">Resumo antes do PDF</div><button type="button" class="btn secondary" data-pdf-cancel>✕</button></div><div id="tbmPdfSummaryBody"></div></div>';document.body.appendChild(m);return m}
function missingSignatures(x){let n=0;if(x?.type==='pt-altura'){(x.workers||[]).forEach(w=>{if(!w?.signature)n++});return n}const vals=Object.entries(x||{}).filter(([k])=>/signature|assinatura/i.test(k));if(vals.length)return vals.filter(([,v])=>!v).length;return 0}
function showPdfSummary(x,action,confirmFn){return new Promise(resolve=>{const m=ensurePdfSummary(),body=$('tbmPdfSummaryBody');const st=inspectionStatus(x),p=completionOf(x);body.innerHTML=`<div class="tbmSummaryStats"><div class="tbmSummaryStat"><b>${p}%</b><span>Preenchido</span></div><div class="tbmSummaryStat"><b>${ncCount(x)}</b><span>Não conformes</span></div><div class="tbmSummaryStat"><b>${pendingCount(x)}</b><span>Pendências</span></div><div class="tbmSummaryStat"><b>${Array.isArray(x.photos)?x.photos.length:0}</b><span>Fotos</span></div></div><div class="notice ${missingSignatures(x)?'info':'successbox'}">Status: <b>${esc(st)}</b>${missingSignatures(x)?` • ${missingSignatures(x)} assinatura(s) ainda vazia(s).`: ' • Assinaturas verificadas.'}</div><div class="actions"><button type="button" class="btn primary" data-pdf-confirm>${action==='share'?'📲 Compartilhar PDF':'📥 Gerar PDF'}</button><button type="button" class="btn secondary" data-pdf-cancel>Cancelar</button></div>`;m.classList.remove('hidden');const finish=ok=>{m.classList.add('hidden');if(ok){try{confirmFn()}catch(e){console.error(e)}}resolve(ok)};m.querySelectorAll('[data-pdf-cancel]').forEach(b=>b.onclick=()=>finish(false));m.querySelector('[data-pdf-confirm]').onclick=()=>finish(true)})}
function wrapPdf(){
  if(pdfWrapped||typeof window.makePdf!=='function')return;pdfWrapped=true;const original=window.makePdf;
  window.makePdf=function(action='download',...rest){if(window.__tbmPdfSummaryBypass)return original.call(this,action,...rest);const x=getState();if(!x)return original.call(this,action,...rest);return showPdfSummary(clone(x),action,()=>{window.__tbmPdfSummaryBypass=true;try{const r=original.call(this,action,...rest);Promise.resolve(r).finally(()=>{window.__tbmPdfSummaryBypass=false})}catch(e){window.__tbmPdfSummaryBypass=false;throw e}})};
}
function showPTPdfSummary(action){const checks=[...document.querySelectorAll('#ptAlturaOverlay [data-pt-check]')];const nc=new Set(checks.filter(b=>b.dataset.ptStatus==='NÃO CONFORME'&&b.classList.contains('no')).map(b=>b.dataset.ptCheck)).size;const workers=document.querySelectorAll('#ptAlturaOverlay [data-pt-worker-name]').length;const signed=[...document.querySelectorAll('#ptAlturaOverlay canvas[data-pt-sign]')].filter(c=>{try{return c.toDataURL().length>500}catch(_){return false}}).length;const fake={type:'pt-altura',photos:[],workers:Array.from({length:workers},(_,i)=>({signature:i<signed?'ok':''})),checklistPT:Array.from({length:Math.max(checks.length/3,1)},(_,i)=>({status:i<nc?'NÃO CONFORME':'CONFORME'}))};showPdfSummary(fake,action,()=>window.makePTAlturaPdf?.(action))}

function observeCloud(){const el=$('cloudState');if(!el||el.dataset.tbmUxObserved)return;el.dataset.tbmUxObserved='1';let prev=el.textContent;new MutationObserver(()=>{const txt=el.textContent||'';if(/sincronizad/i.test(txt)&&txt!==prev){const now=new Date().toISOString();localStorage.setItem(LAST_SYNC_KEY,now);scheduleDashboard();if(/salvando|pendente|local/i.test(prev||''))toast('☁️ Nuvem sincronizada.')}prev=txt}).observe(el,{childList:true,subtree:true,characterData:true})}
function observeMessages(){const m=$('msg');if(!m||m.dataset.tbmUxObserved)return;m.dataset.tbmUxObserved='1';let last='';new MutationObserver(()=>{const txt=(m.textContent||'').trim();if(txt&&txt!==last){if(/salv|sucesso/i.test(txt))toast('✓ '+txt.replace(/^✅\s*/,'').slice(0,110));if(/erro|não foi possível|falha/i.test(txt))toast(txt.slice(0,110),'err');last=txt}}).observe(m,{childList:true,subtree:true,characterData:true})}
function wrapStorage(){if(window.idbPut&&!window.__tbmUxPutWrapped){window.__tbmUxPutWrapped=true;const old=window.idbPut;window.idbPut=async function(...a){const r=await old.apply(this,a);if(!$('home')?.classList.contains('hidden'))scheduleDashboard();return r}}if(window.idbDelete&&!window.__tbmUxDeleteWrapped){window.__tbmUxDeleteWrapped=true;const old=window.idbDelete;window.idbDelete=async function(...a){const r=await old.apply(this,a);if(!$('home')?.classList.contains('hidden'))scheduleDashboard();return r}}}

function globalEvents(){
  document.addEventListener('input',()=>{if(!$('form')?.classList.contains('hidden'))scheduleProgressUpdate()},{passive:true});
  document.addEventListener('change',()=>{if(!$('form')?.classList.contains('hidden'))scheduleProgressUpdate()},{passive:true});
  document.addEventListener('click',async e=>{
    const open=e.target.closest('[data-premium-open]');if(open){e.preventDefault();e.stopImmediatePropagation();return showDetail(open.dataset.premiumOpen)}
    const rep=e.target.closest('[data-premium-report]');if(rep){e.preventDefault();e.stopImmediatePropagation();const x=await getRecord(rep.dataset.premiumReport);if(!x)return;if(x.type==='pt-altura'&&window.openPTAltura){window.openPTAltura(x);setTimeout(()=>showPTPdfSummary('download'),120)}else{setState(clone(x));window.renderForm?.();window.show?.('form');setTimeout(()=>window.makePdf?.('download'),120)}return}
    const dup=e.target.closest('[data-premium-duplicate]');if(dup){e.preventDefault();e.stopImmediatePropagation();return duplicateRecord(dup.dataset.premiumDuplicate)}
    const dc=e.target.closest('[data-detail-continue]');if(dc)return openRecord(dc.dataset.detailContinue);
    const dp=e.target.closest('[data-detail-pdf]');if(dp){const x=await getRecord(dp.dataset.detailPdf);if(!x)return;if(x.type==='pt-altura'&&window.openPTAltura){window.openPTAltura(x);closeDetail();setTimeout(()=>showPTPdfSummary('download'),120)}else{setState(clone(x));window.renderForm?.();window.show?.('form');closeDetail();setTimeout(()=>window.makePdf?.('download'),120)}return}
    const dd=e.target.closest('[data-detail-duplicate]');if(dd)return duplicateRecord(dd.dataset.detailDuplicate);
    const de=e.target.closest('[data-detail-delete]');if(de)return deleteRecord(de.dataset.detailDelete);
    const pt=e.target.closest('#ptPdf,#ptShare');if(pt){e.preventDefault();e.stopImmediatePropagation();return showPTPdfSummary(pt.id==='ptShare'?'share':'download')}
    if(e.target.closest('#openHistory'))setTimeout(decorateHistory,120);
  },true);
}

function observers(){
  const list=$('historyList');if(list&&!list.dataset.tbmUxObserved){list.dataset.tbmUxObserved='1';new MutationObserver(()=>setTimeout(decorateHistory,30)).observe(list,{childList:true,subtree:false})}
  const body=new MutationObserver(()=>{ensureFieldModeButtons();if(!$('form')?.classList.contains('hidden'))ensureProgress();observeMessages()});body.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
}

function install(){
  injectStyle();ensureDetailModal();ensurePdfSummary();
  if(localStorage.getItem(FIELD_MODE_KEY)==='1')document.body.classList.add('tbm-field-mode');
  ensureFieldModeButtons();ensureProgress();wrapStorage();wrapPdf();observeCloud();observeMessages();globalEvents();observers();scheduleDashboard();setTimeout(scheduleDashboard,800);setTimeout(()=>{wrapPdf();ensureFieldModeButtons()},1800);
  window.__tbmPremiumUxVersion=UX_VERSION;
}

window.tbmRenderDashboard=renderDashboard;
window.tbmShowInspectionDetail=showDetail;
window.tbmDuplicateInspection=duplicateRecord;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
