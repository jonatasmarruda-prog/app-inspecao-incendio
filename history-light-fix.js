(()=>{
'use strict';

const META_KEY='tbm-sst-mobile-dashboard-v2';
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
    box.innerHTML='<div class="notice info">Histórico aberto. Os registros antigos estão sendo indexados gradualmente em segundo plano.</div>';
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
  // ABERTURA IMEDIATA: somente metadados leves já existentes.
  // Nunca aguarda idbAll, openCursor ou leitura de fotos/assinaturas.
  buildList();
  render();
  try{window.tbmRefreshMobileDashboardIndex?.()}catch(_){ }
}

async function openOneLight(id){
  if(!id||String(id).startsWith('PT-'))return false;
  if(typeof window.idbGet!=='function')return false;
  const x=await window.idbGet(id);
  if(!x)return true;
  try{state=x}catch(_){window.state=x}
  try{window.renderForm?.()}catch(_){try{renderForm()}catch(__){ }}
  if(typeof window.show==='function')window.show('form');
  else try{show('form')}catch(_){ }
  return true;
}

function install(){
  const btn=document.getElementById('openHistory');
  if(btn){
    btn.onclick=openHistoryLight;
    btn.dataset.tbmLightHistory='2';
  }
  window.openHistory=openHistoryLight;

  if(document.body.dataset.tbmLightHistoryCapture!=='2'){
    document.body.dataset.tbmLightHistoryCapture='2';
    document.addEventListener('click',async e=>{
      const historyButton=e.target.closest?.('#openHistory');
      if(historyButton){
        // Bloqueia absolutamente qualquer onclick/listener antigo que chamava idbAll().
        e.preventDefault();
        e.stopImmediatePropagation();
        try{await openHistoryLight()}catch(err){console.error('[HISTÓRICO LEVE] abrir histórico',err)}
        return;
      }

      const b=e.target.closest?.('[data-open-h]');
      if(!b||String(b.dataset.openH||'').startsWith('PT-'))return;
      e.preventDefault();
      e.stopImmediatePropagation();
      try{await openOneLight(b.dataset.openH)}catch(err){console.error('[HISTÓRICO LEVE] abrir registro',err)}
    },true);
  }
}

window.addEventListener('tbm-history-index-updated',refreshIfVisible);
window.addEventListener('tbm-history-index-complete',refreshIfVisible);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,300);
setTimeout(install,1200);
window.tbmOpenHistoryLight=openHistoryLight;
})();