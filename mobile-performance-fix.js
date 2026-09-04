(()=>{
'use strict';

const FLAG='__tbmMobilePdfPerformanceV3';
const META_KEY='tbm-sst-mobile-dashboard-v2';
let migrationRunning=false;
let migrationScheduled=false;

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

function idle(fn,delay=0){
  setTimeout(()=>{
    if(typeof requestIdleCallback==='function')requestIdleCallback(fn,{timeout:2500});
    else fn();
  },delay);
}

function openDb(){
  return new Promise((resolve,reject)=>{
    try{
      const req=indexedDB.open('SSTInspecoes');
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('Falha ao abrir IndexedDB'));
    }catch(e){reject(e)}
  });
}
function getKeys(db){
  return new Promise((resolve,reject)=>{
    try{
      const tx=db.transaction('inspections','readonly');
      const req=tx.objectStore('inspections').getAllKeys();
      req.onsuccess=()=>resolve(Array.isArray(req.result)?req.result:[]);
      req.onerror=()=>reject(req.error||new Error('Falha ao listar chaves'));
    }catch(e){reject(e)}
  });
}
function getOne(db,key){
  return new Promise((resolve,reject)=>{
    try{
      const tx=db.transaction('inspections','readonly');
      const req=tx.objectStore('inspections').get(key);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error||new Error('Falha ao ler registro'));
    }catch(e){reject(e)}
  });
}

async function migrateMetaIncrementally(){
  if(!isMobile()||migrationRunning)return;
  migrationScheduled=false;
  migrationRunning=true;
  let db=null;
  try{
    db=await openDb();
    const keys=await getKeys(db);
    const known=new Set(readMeta().map(x=>String(x.id)));
    const pending=keys.filter(k=>!known.has(String(k)));
    let index=0;
    const step=async()=>{
      if(index>=pending.length){
        migrationRunning=false;
        try{db?.close()}catch(_){ }
        window.dispatchEvent(new CustomEvent('tbm-history-index-complete'));
        return;
      }
      const key=pending[index++];
      try{
        const record=await getOne(db,key);
        if(record)upsertMeta(record);
        window.dispatchEvent(new CustomEvent('tbm-history-index-updated',{detail:{id:String(key)}}));
      }catch(e){console.warn('[HISTÓRICO] migração de um registro',e)}
      // Um registro por vez, com grande intervalo: nunca varrer todos no clique.
      idle(step,1600);
    };
    idle(step,1200);
  }catch(e){
    migrationRunning=false;
    try{db?.close()}catch(_){ }
    console.warn('[HISTÓRICO] migração incremental',e);
  }
}
function scheduleMigration(delay=7000){
  if(migrationRunning||migrationScheduled)return;
  migrationScheduled=true;
  idle(()=>migrateMetaIncrementally(),delay);
}

function installDashboardIndex(){
  if(!isMobile())return;
  // O dashboard e o histórico recebem SOMENTE metadados leves.
  // Não existe mais fallback para idbAll/openCursor de registros completos.
  window.tbmDashboardRecords=async()=>readMeta();

  if(typeof window.idbPut==='function'&&!window.idbPut.__tbmMobileMetaV3){
    const old=window.idbPut;
    const wrapped=async function(x,...args){
      const r=await old.call(this,x,...args);
      upsertMeta(x);
      return r;
    };
    wrapped.__tbmMobileMetaV3=true;wrapped.__tbmOriginal=old;window.idbPut=wrapped;
  }
  if(typeof window.idbDelete==='function'&&!window.idbDelete.__tbmMobileMetaV3){
    const old=window.idbDelete;
    const wrapped=async function(id,...args){
      const r=await old.call(this,id,...args);
      deleteMeta(id);
      return r;
    };
    wrapped.__tbmMobileMetaV3=true;wrapped.__tbmOriginal=old;window.idbDelete=wrapped;
  }
  try{
    const st=(typeof state!=='undefined'&&state)?state:(window.state||null);
    if(st?.id)upsertMeta(st);
  }catch(_){ }
  scheduleMigration(9000);
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
    if(nextAction==='share'&&!canSharePdfFiles())nextAction='download';

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
window.tbmRefreshMobileDashboardIndex=()=>scheduleMigration(200);
window.tbmReadLightHistoryIndex=readMeta;
})();