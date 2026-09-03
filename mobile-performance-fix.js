(()=>{
'use strict';

const FLAG='__tbmMobilePdfPerformanceV2';
const META_KEY='tbm-sst-mobile-dashboard-v2';
let seeding=false;

function isMobile(){
  try{
    return matchMedia('(max-width: 900px)').matches||
      matchMedia('(pointer: coarse)').matches||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
  }catch(_){return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')}
}

function canSharePdfFiles(){
  if(typeof navigator.share!=='function')return false;
  if(typeof navigator.canShare!=='function')return true;
  try{
    const blob=new Blob(['PDF'],{type:'application/pdf'});
    const file=new File([blob],'teste.pdf',{type:'application/pdf'});
    return !!navigator.canShare({files:[file]});
  }catch(_){return false}
}

function statusOnly(v){
  if(typeof v==='string')return v;
  if(v&&typeof v==='object')return {status:v.status||'PENDENTE'};
  return 'PENDENTE';
}

function slimRecord(x){
  if(!x||typeof x!=='object'||!x.id)return null;
  const equipment=Array.isArray(x.equipment)?x.equipment.map(e=>({
    status:e?.status||e?.situacao||'PENDENTE',
    checks:Array.isArray(e?.checks)?e.checks.map(statusOnly):[],
    premiumChecks:Array.isArray(e?.premiumChecks)?e.premiumChecks.map(statusOnly):[]
  })):[];
  const photosCount=Array.isArray(x.photos)?x.photos.length:0;
  return {
    id:String(x.id),type:x.type||'',title:x.title||'',company:x.company||'',otherCompany:x.otherCompany||'',
    address:x.address||'',inspector:x.inspector||'',sector:x.sector||'',date:x.date||'',status:x.status||'',
    createdAt:x.createdAt||'',updatedAt:x.updatedAt||'',deleted:!!x.deleted,
    checks:Array.isArray(x.checks)?x.checks.map(statusOnly):[],equipment,
    checklistExtintores:Array.isArray(x.checklistExtintores)?x.checklistExtintores.map(statusOnly):[],
    checklistHidrantes:Array.isArray(x.checklistHidrantes)?x.checklistHidrantes.map(statusOnly):[],
    checklistPT:Array.isArray(x.checklistPT)?x.checklistPT.map(statusOnly):[],
    workers:Array.isArray(x.workers)?x.workers.map(w=>({nome:w?.nome||'',signature:w?.signature?'1':''})):[],
    photos:Array.from({length:photosCount},()=>null)
  };
}

function readMeta(){
  try{
    const raw=JSON.parse(localStorage.getItem(META_KEY)||'[]');
    return Array.isArray(raw)?raw:[];
  }catch(_){return[]}
}
function writeMeta(list){
  try{localStorage.setItem(META_KEY,JSON.stringify((list||[]).slice(-500)))}catch(_){ }
}
function upsertMeta(x){
  const slim=slimRecord(x);if(!slim)return;
  const list=readMeta();const i=list.findIndex(r=>String(r.id)===slim.id);
  if(i>=0)list[i]=slim;else list.push(slim);
  writeMeta(list);
}
function deleteMeta(id){
  writeMeta(readMeta().filter(x=>String(x.id)!==String(id)));
}

function seedMetaInBackground(){
  if(seeding||readMeta().length)return;
  seeding=true;
  const run=()=>{
    try{
      const req=indexedDB.open('SSTInspecoes',2);
      req.onerror=()=>{seeding=false};
      req.onsuccess=()=>{
        const db=req.result;let list=[];
        let tx;
        try{tx=db.transaction('inspections','readonly')}catch(_){seeding=false;db.close();return}
        const cur=tx.objectStore('inspections').openCursor();
        cur.onsuccess=()=>{
          const c=cur.result;
          if(!c)return;
          const slim=slimRecord(c.value);if(slim)list.push(slim);
          c.continue();
        };
        tx.oncomplete=()=>{writeMeta(list);seeding=false;db.close();setTimeout(()=>window.tbmRenderDashboard?.(),50)};
        tx.onerror=()=>{seeding=false;db.close()};
      };
    }catch(_){seeding=false}
  };
  if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:2500});else setTimeout(run,1200);
}

function installDashboardIndex(){
  if(!isMobile())return;
  window.tbmDashboardRecords=async function(){
    const list=readMeta();
    if(!list.length)seedMetaInBackground();
    return list;
  };

  if(typeof window.idbPut==='function'&&!window.idbPut.__tbmMobileMeta){
    const old=window.idbPut;
    const wrapped=async function(x,...args){const r=await old.call(this,x,...args);upsertMeta(x);return r};
    wrapped.__tbmMobileMeta=true;wrapped.__tbmOriginal=old;window.idbPut=wrapped;
  }
  if(typeof window.idbDelete==='function'&&!window.idbDelete.__tbmMobileMeta){
    const old=window.idbDelete;
    const wrapped=async function(id,...args){const r=await old.call(this,id,...args);deleteMeta(id);return r};
    wrapped.__tbmMobileMeta=true;wrapped.__tbmOriginal=old;window.idbDelete=wrapped;
  }
  try{
    const st=(typeof state!=='undefined'&&state)?state:(window.state||null);
    if(st?.id)upsertMeta(st);
  }catch(_){ }
  seedMetaInBackground();
}

function installPdf(){
  if(!isMobile())return true;
  if(typeof window.makePdf!=='function')return false;
  if(window.makePdf[FLAG])return true;

  const current=window.makePdf;
  const wrapped=function(action='download',...rest){
    let nextAction=action;
    if(nextAction===true)nextAction='share';
    if(nextAction===false)nextAction='download';

    // Se o celular não compartilha arquivos PDF, baixa diretamente.
    // Evita gerar Blob e depois gerar o mesmo PDF novamente no fallback.
    if(nextAction==='share'&&!canSharePdfFiles())nextAction='download';

    // No celular, não clonar novamente o state inteiro (incluindo Base64 das fotos)
    // somente para montar o resumo antes do PDF.
    const previousBypass=window.__tbmPdfSummaryBypass;
    window.__tbmPdfSummaryBypass=true;

    try{
      const result=current.call(this,nextAction,...rest);
      if(result&&typeof result.then==='function'){
        return result.finally(()=>{window.__tbmPdfSummaryBypass=previousBypass});
      }
      window.__tbmPdfSummaryBypass=previousBypass;
      return result;
    }catch(e){
      window.__tbmPdfSummaryBypass=previousBypass;
      throw e;
    }
  };
  wrapped[FLAG]=true;
  wrapped.__tbmOriginal=current;
  window.makePdf=wrapped;
  return true;
}

function install(){
  if(!isMobile())return true;
  installDashboardIndex();
  return installPdf();
}

if(!install()){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>=30)clearInterval(timer);
  },200);
}

window.tbmInstallMobilePdfPerformance=install;
window.tbmRefreshMobileDashboardIndex=seedMetaInBackground;
})();