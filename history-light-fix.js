(()=>{
'use strict';

const META_KEY='tbm-sst-mobile-dashboard-v2';
const DELETE_QUEUE_KEY='tbm-sst-cloud-delete-queue';
const LIMIT=40;
let fullList=[];
let visible=LIMIT;
let renderTimer=null;

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const typeInfo=t=>({
  fire:['🧯','Combate a Incêndio'],
  safety:['🦺','Inspeção de Segurança'],
  machine:['⚙️','Máquinas e Equipamentos • NR-12'],
  epi:['🧤','Inspeção de EPI'],
  accident:['⚠️','Investigação de Acidente'],
  report:['📋','Relatório de Inspeção'],
  'pt-altura':['🪜','PT - Trabalho em Altura']
}[t]||['📋','Inspeção SST']);

function fmtDate(v){
  if(!v)return'—';
  const d=new Date(v);
  if(Number.isNaN(d.getTime()))return String(v);
  return d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
}
function readMeta(){
  try{
    if(typeof window.tbmReadLightHistoryIndex==='function'){
      const x=window.tbmReadLightHistoryIndex();
      if(Array.isArray(x))return x;
    }
    const x=JSON.parse(localStorage.getItem(META_KEY)||'[]');
    return Array.isArray(x)?x:[];
  }catch(_){return[]}
}
function writeMeta(list){try{localStorage.setItem(META_KEY,JSON.stringify((list||[]).slice(-500)))}catch(_){ }}
function removeMeta(id){
  const sid=String(id||'');
  writeMeta(readMeta().filter(x=>String(x?.id)!==sid));
  fullList=fullList.filter(x=>String(x?.id)!==sid);
}
function queueCloudDelete(id){
  try{
    const sid=String(id||'');
    const raw=JSON.parse(localStorage.getItem(DELETE_QUEUE_KEY)||'[]');
    const list=Array.isArray(raw)?raw.map(String):[];
    if(sid&&!list.includes(sid))list.push(sid);
    localStorage.setItem(DELETE_QUEUE_KEY,JSON.stringify(list));
  }catch(_){ }
}
function notify(text,type='ok'){
  try{if(typeof window.tbmToast==='function'){window.tbmToast(text,type==='err'?'err':'ok');return}}catch(_){ }
  const box=document.getElementById('msg');if(box){box.className=type==='err'?'notice errorbox':'notice successbox';box.textContent=text}
}
function equipmentNc(x){
  return (Array.isArray(x?.equipment)?x.equipment:[]).filter(e=>String(e?.status||e?.situacao||'').toUpperCase()==='NÃO CONFORME').length;
}
function isHistoryVisible(){
  const h=document.getElementById('history');
  return !!h&&!h.classList.contains('hidden');
}
function buildList(){
  fullList=readMeta().filter(x=>!x?.deleted).sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
}
function render(){
  const box=document.getElementById('historyList');if(!box)return;
  const list=fullList.slice(0,visible);
  if(!list.length){
    box.innerHTML='<div class="notice info">Nenhuma inspeção indexada neste dispositivo. Novos salvamentos aparecerão aqui automaticamente.</div>';
    return;
  }
  box.innerHTML=list.map(x=>{
    const [icon,name]=typeInfo(x.type);
    const title=x.title||name;
    const company=x.company==='Outro'?(x.otherCompany||'Outro'):(x.company||'—');
    return `<div class="historyItem" data-history-id="${esc(x.id)}"><div class="historyTop"><div><b>${icon} ${esc(title)}</b><div class="mini">${esc(x.id)} • ${esc(fmtDate(x.date||x.updatedAt))}</div><div class="mini">${esc(company)} • ${esc(x.sector||'Sem setor')}</div></div><span class="pill">${equipmentNc(x)} NC</span></div><div class="actions no-print" style="margin-top:9px"><button class="btn primary" data-open-h="${esc(x.id)}">Abrir</button><button class="btn secondary" data-report-h="${esc(x.id)}">Relatório</button><button class="btn danger" data-delete-h="${esc(x.id)}">Excluir</button></div></div>`;
  }).join('')+(fullList.length>visible?`<button id="tbmHistoryMore" type="button" class="btn secondary full">Mostrar mais (${fullList.length-visible})</button>`:'');
  document.getElementById('tbmHistoryMore')?.addEventListener('click',()=>{visible+=LIMIT;render()},{once:true});
}
function refreshIfVisible(){
  if(!isHistoryVisible())return;
  clearTimeout(renderTimer);
  renderTimer=setTimeout(()=>{buildList();render();try{window.tbmDecorateHistory?.()}catch(_){ }},120);
}

async function openHistoryLight(){
  const box=document.getElementById('historyList');
  if(box)box.innerHTML='<div class="notice info">⏳ Abrindo histórico...</div>';
  if(typeof window.show==='function')window.show('history');
  else{
    ['home','form','history','report'].forEach(id=>document.getElementById(id)?.classList.toggle('hidden',id!=='history'));
    window.scrollTo(0,0);
  }
  visible=LIMIT;
  // Somente metadados já leves. Nenhum acesso pesado ao IndexedDB acontece aqui.
  buildList();
  render();
}

async function readOne(id){
  if(!id||typeof window.idbGet!=='function')return null;
  return await window.idbGet(String(id));
}

async function openOneLight(id){
  const x=await readOne(id);if(!x)return true;
  if(x.type==='pt-altura'||String(id).startsWith('PT-')){
    if(typeof window.openPTAltura==='function')window.openPTAltura(x);
    return true;
  }
  try{state=x}catch(_){window.state=x}
  try{window.renderForm?.()}catch(_){try{renderForm()}catch(__){ }}
  if(typeof window.show==='function')window.show('form');
  else try{show('form')}catch(_){ }
  return true;
}

async function reportOneLight(id){
  const x=await readOne(id);if(!x){notify('Registro não encontrado.','err');return}
  if(x.type==='pt-altura'||String(id).startsWith('PT-')){
    if(typeof window.openPTAltura==='function')window.openPTAltura(x);
    setTimeout(()=>{try{window.makePTAlturaPdf?.('download')}catch(e){console.error('[HISTÓRICO PDF PT]',e)}},150);
    return;
  }
  try{state=x}catch(_){window.state=x}
  try{window.renderForm?.()}catch(_){try{renderForm()}catch(__){ }}
  if(typeof window.show==='function')window.show('form');
  setTimeout(()=>{
    try{
      if(typeof window.makePdfFinal==='function')window.makePdfFinal('download');
      else if(typeof window.makePdf==='function')window.makePdf('download');
      else throw new Error('Gerador de PDF indisponível.');
    }catch(e){console.error('[HISTÓRICO PDF]',e);notify('Não foi possível gerar o PDF.','err')}
  },150);
}

async function deleteOneLight(id){
  const sid=String(id||'').trim();if(!sid)return;
  if(!confirm('Excluir esta inspeção do histórico e da nuvem?'))return;

  // Primeiro remove localmente para a interface responder na hora.
  queueCloudDelete(sid);
  try{
    if(typeof window.idbDelete==='function')await window.idbDelete(sid);
    removeMeta(sid);
    render();
    notify('🗑️ Inspeção excluída.');
    window.dispatchEvent(new CustomEvent('tbm-history-index-updated',{detail:{id:sid,deleted:true}}));
  }catch(e){
    console.error('[HISTÓRICO LEVE] excluir local',e);
    notify('Não foi possível excluir a inspeção.','err');
    return;
  }

  // Tombstone da nuvem em segundo plano; se estiver offline, a fila permanece.
  setTimeout(()=>{
    try{
      const p=window.tbmDeleteCloudInspection?.(sid,{deleteLocal:false});
      if(p&&typeof p.catch==='function')p.catch(err=>console.warn('[HISTÓRICO LEVE] exclusão nuvem pendente',err));
    }catch(e){console.warn('[HISTÓRICO LEVE] exclusão nuvem pendente',e)}
  },0);
}

function install(){
  const btn=document.getElementById('openHistory');
  if(btn){
    btn.onclick=openHistoryLight;
    btn.dataset.tbmLightHistory='4';
  }
  window.openHistory=openHistoryLight;

  if(document.body.dataset.tbmLightHistoryCapture!=='4'){
    document.body.dataset.tbmLightHistoryCapture='4';
    document.addEventListener('click',async e=>{
      const historyButton=e.target.closest?.('#openHistory');
      if(historyButton){
        e.preventDefault();e.stopImmediatePropagation();
        try{await openHistoryLight()}catch(err){console.error('[HISTÓRICO LEVE] abrir histórico',err)}
        return;
      }

      const del=e.target.closest?.('[data-delete-h],[data-premium-delete]');
      if(del){
        e.preventDefault();e.stopImmediatePropagation();
        const id=del.dataset.deleteH||del.dataset.premiumDelete;
        try{await deleteOneLight(id)}catch(err){console.error('[HISTÓRICO LEVE] excluir',err)}
        return;
      }

      const report=e.target.closest?.('[data-report-h],[data-premium-report]');
      if(report){
        e.preventDefault();e.stopImmediatePropagation();
        const id=report.dataset.reportH||report.dataset.premiumReport;
        try{await reportOneLight(id)}catch(err){console.error('[HISTÓRICO LEVE] relatório',err)}
        return;
      }

      const open=e.target.closest?.('[data-open-h]');
      if(!open)return;
      e.preventDefault();e.stopImmediatePropagation();
      try{await openOneLight(open.dataset.openH)}catch(err){console.error('[HISTÓRICO LEVE] abrir registro',err)}
    },true);
  }
}

window.addEventListener('tbm-history-index-updated',refreshIfVisible);
window.addEventListener('tbm-history-index-complete',refreshIfVisible);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,300);
setTimeout(install,1200);
window.tbmOpenHistoryLight=openHistoryLight;
window.tbmDeleteHistoryLight=deleteOneLight;
window.tbmReportHistoryLight=reportOneLight;
window.__tbmHistoryLightVersion='2026.09.04.4';
})();