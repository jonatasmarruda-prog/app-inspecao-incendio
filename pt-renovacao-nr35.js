(()=>{
'use strict';

const PT_TYPE='pt-altura';
const RESPONSAVEL='Jonatas Marques de Arruda';
const VALIDADE='1 Turno de Trabalho';
const VERSION='2026.09.09.1-nr35-renovacao';

let activeRecord=null;
let liveState=null;
let bodyObserver=null;

const clone=v=>JSON.parse(JSON.stringify(v??null));
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtDate=v=>{if(!v)return '—';const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}/${m}/${y}`:String(v)};

function normalizeRenewals(value){
  if(!Array.isArray(value))return [];
  return value.map((r,i)=>{
    if(typeof r==='string')return {id:`REN-LEGACY-${i}`,data:r,responsavel:RESPONSAVEL,validade:VALIDADE,registradoEm:''};
    const data=String(r?.data||r?.date||'').trim();
    if(!data)return null;
    return {
      id:String(r?.id||`REN-${data}-${i}`),
      data,
      responsavel:String(r?.responsavel||r?.responsible||RESPONSAVEL),
      validade:String(r?.validade||VALIDADE),
      registradoEm:String(r?.registradoEm||r?.createdAt||'')
    };
  }).filter(Boolean);
}
function renewalKey(r){return [r?.id||'',r?.data||'',r?.responsavel||'',r?.registradoEm||''].join('|')}
function mergeRenewals(...lists){
  const out=[],seen=new Set();
  lists.flatMap(v=>normalizeRenewals(v)).forEach(r=>{const key=renewalKey(r);if(seen.has(key))return;seen.add(key);out.push(r)});
  return out;
}
function captureRecord(state,{live=false}={}){
  if(!state||state.type!==PT_TYPE)return state;
  const existing=activeRecord&&String(activeRecord.id)===String(state.id)?activeRecord.renovacoes:[];
  state.renovacoes=mergeRenewals(existing,state.renovacoes);
  activeRecord=state;
  if(live)liveState=state;
  queueMount();
  return state;
}
function currentRenewals(){
  return mergeRenewals(activeRecord?.renovacoes,liveState&&activeRecord&&String(liveState.id)===String(activeRecord.id)?liveState.renovacoes:[]);
}
function showRenewalMessage(text,error=false){
  const box=document.getElementById('ptRenewalMsg');if(!box)return;
  box.className='notice '+(error?'errorbox':'successbox');box.textContent=text;
  clearTimeout(showRenewalMessage._t);
  showRenewalMessage._t=setTimeout(()=>{if(box.textContent===text){box.textContent='';box.className=''}},3200);
}
function renewalListHTML(){
  const arr=currentRenewals();
  if(!arr.length)return '<div class="mini">Nenhuma renovação registrada.</div>';
  return `<ul class="pt-renewal-list">${arr.map((r,i)=>`<li><b>${i+1}. ${esc(fmtDate(r.data))}</b><span>${esc(r.responsavel||RESPONSAVEL)} • ${esc(r.validade||VALIDADE)}</span></li>`).join('')}</ul>`;
}
function injectRenewalStyle(){
  if(document.getElementById('tbm-pt-renovacao-style'))return;
  const s=document.createElement('style');s.id='tbm-pt-renovacao-style';
  s.textContent=`
    #ptRenewalCard{border-left:4px solid #0f766e!important}
    #ptRenewalCard .pt-renewal-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end}
    #ptRenewalCard .pt-renewal-list{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:8px}
    #ptRenewalCard .pt-renewal-list li{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid #dbe2ea;border-radius:10px;padding:10px 12px;background:#f8fafc;color:#17202b}
    #ptRenewalCard .pt-renewal-list span{font-size:11px;color:#475569;text-align:right}
    @media(max-width:650px){#ptRenewalCard .pt-renewal-grid{grid-template-columns:1fr}#ptRenewalCard .pt-renewal-list li{align-items:flex-start;flex-direction:column}#ptRenewalCard .pt-renewal-list span{text-align:left}#ptRegisterRenewal{width:100%}}
  `;
  document.head.appendChild(s);
}
function mountRenewalCard(){
  injectRenewalStyle();
  const body=document.getElementById('ptAlturaBody');if(!body)return false;
  let card=document.getElementById('ptRenewalCard');
  if(!card){
    const preventive=[...body.querySelectorAll('.card')].find(x=>String(x.querySelector('.sectionTitle')?.textContent||'').trim()==='Medidas Preventivas');
    if(!preventive)return false;
    card=document.createElement('div');card.className='card';card.id='ptRenewalCard';
    card.innerHTML=`
      <div class="sectionTitle">Renovação da Permissão de Trabalho (NR 35)</div>
      <div class="notice info">Revalide somente quando não houver mudanças nas condições estabelecidas ou na equipe de trabalho.</div>
      <div id="ptRenewalMsg"></div>
      <div class="pt-renewal-grid">
        <div class="field"><label for="ptRenewalDate">Data da Renovação</label><input id="ptRenewalDate" type="date"></div>
        <button type="button" id="ptRegisterRenewal" class="btn success">🔄 Registrar Renovação</button>
      </div>
      <div id="ptRenewalList"></div>`;
    preventive.insertAdjacentElement('afterend',card);
    const input=card.querySelector('#ptRenewalDate');if(input&&!input.value)input.value=new Date().toISOString().slice(0,10);
    card.querySelector('#ptRegisterRenewal')?.addEventListener('click',registerRenewal);
  }
  const list=card.querySelector('#ptRenewalList');if(list)list.innerHTML=renewalListHTML();
  return true;
}
function queueMount(){clearTimeout(queueMount._t);queueMount._t=setTimeout(mountRenewalCard,0)}

async function registerRenewal(e){
  e?.preventDefault?.();e?.stopPropagation?.();
  const btn=document.getElementById('ptRegisterRenewal');
  const input=document.getElementById('ptRenewalDate');
  const data=String(input?.value||'').trim();
  if(!data){showRenewalMessage('Informe a Data da Renovação.',true);return}
  if(!activeRecord?.id){showRenewalMessage('Salve a PT antes de registrar uma renovação.',true);return}
  const original=btn?.innerHTML;if(btn){btn.disabled=true;btn.innerHTML='⏳ Registrando...'}
  try{
    const renovacao={id:'REN-'+Date.now().toString(36).toUpperCase(),data,responsavel:RESPONSAVEL,validade:VALIDADE,registradoEm:new Date().toISOString()};
    activeRecord.renovacoes=mergeRenewals(activeRecord.renovacoes,[renovacao]);
    activeRecord.updatedAt=new Date().toISOString();
    if(liveState&&String(liveState.id)===String(activeRecord.id))liveState.renovacoes=mergeRenewals(liveState.renovacoes,activeRecord.renovacoes);
    if(typeof window.tbmHistoricoSalvar!=='function')throw new Error('Persistência Firestore indisponível.');
    await window.tbmHistoricoSalvar(activeRecord,{source:'pt-renovacao-nr35',reportType:'PT - Trabalho em Altura'});
    const list=document.getElementById('ptRenewalList');if(list)list.innerHTML=renewalListHTML();
    showRenewalMessage('✅ Renovação registrada na mesma PT e salva na nuvem.');
  }catch(err){console.error('[PT RENOVACAO NR35]',err);showRenewalMessage('❌ Não foi possível registrar a renovação.',true)}
  finally{if(btn){btn.disabled=false;btn.innerHTML=original||'🔄 Registrar Renovação'}}
}

function patchHistoryGet(){
  const original=window.idbGet;if(typeof original!=='function'||original.__tbmPTRenewalNR35)return;
  const wrapped=async function(...args){const result=await original.apply(this,args);if(result?.type===PT_TYPE)captureRecord(result,{live:false});return result};
  wrapped.__tbmPTRenewalNR35=true;wrapped.__tbmOriginal=original;window.idbGet=wrapped;
}
function patchOpenPT(){
  const original=window.openPTAltura;if(typeof original!=='function'||original.__tbmPTRenewalNR35)return;
  const wrapped=function(state,...rest){
    if(state?.type===PT_TYPE)captureRecord(state,{live:false});else if(!state){activeRecord=null;liveState=null}
    const result=original.call(this,state,...rest);queueMount();return result;
  };
  wrapped.__tbmPTRenewalNR35=true;wrapped.__tbmOriginal=original;window.openPTAltura=wrapped;
  if(window.openPTAlturaFromState===original)window.openPTAlturaFromState=wrapped;
}
function patchPersistence(){
  const original=window.tbmHistoricoSalvar;if(typeof original!=='function'||original.__tbmPTRenewalNR35)return;
  const wrapped=async function(snapshot,meta={}){
    if(snapshot?.type===PT_TYPE){
      const previous=activeRecord&&String(activeRecord.id)===String(snapshot.id)?activeRecord.renovacoes:[];
      snapshot.renovacoes=mergeRenewals(previous,snapshot.renovacoes);captureRecord(snapshot,{live:true});
    }
    const result=await original.call(this,snapshot,meta);
    if(snapshot?.type===PT_TYPE&&result?.type===PT_TYPE)result.renovacoes=mergeRenewals(snapshot.renovacoes,result.renovacoes);
    return result;
  };
  wrapped.__tbmPTRenewalNR35=true;wrapped.__tbmOriginal=original;window.tbmHistoricoSalvar=wrapped;
}
function textOf(node){
  if(node==null)return '';
  if(typeof node==='string'||typeof node==='number')return String(node);
  if(Array.isArray(node))return node.map(textOf).join(' ');
  if(typeof node==='object'){
    let out='';if(typeof node.text==='string'||typeof node.text==='number')out+=' '+node.text;
    if(node.stack)out+=' '+textOf(node.stack);if(node.table?.body)out+=' '+textOf(node.table.body);if(node.columns)out+=' '+textOf(node.columns);return out;
  }
  return '';
}
const pdfGrid={hLineWidth:()=>0.7,vLineWidth:()=>0.7,hLineColor:()=>'#dddddd',vLineColor:()=>'#dddddd',paddingLeft:()=>7,paddingRight:()=>7,paddingTop:()=>5,paddingBottom:()=>5};
function injectRenewalsIntoPdf(docDefinition){
  const content=docDefinition?.content;if(!Array.isArray(content))return docDefinition;
  const signal=textOf(content).toUpperCase();
  if(!signal.includes('PERMISSÃO DE TRABALHO')||!signal.includes('TRABALHO EM ALTURA')||signal.includes('HISTÓRICO DE RENOVAÇÕES'))return docDefinition;
  const renovacoes=currentRenewals();if(!renovacoes.length)return docDefinition;
  const title={table:{widths:['*'],body:[[{text:'HISTÓRICO DE RENOVAÇÕES',bold:true,fillColor:'#f4f4f4',fontSize:11,color:'#111111'}]]},layout:pdfGrid,margin:[0,10,0,0]};
  const rows=[[{text:'Data',bold:true,fillColor:'#f4f4f4',fontSize:9,color:'#111111'},{text:'Validade',bold:true,fillColor:'#f4f4f4',fontSize:9,color:'#111111'},{text:'Assinatura do Técnico de Segurança',bold:true,fillColor:'#f4f4f4',fontSize:9,color:'#111111'}]];
  renovacoes.forEach(r=>rows.push([{text:fmtDate(r.data),fontSize:8.5},{text:r.validade||VALIDADE,fontSize:8.5},{text:r.responsavel||RESPONSAVEL,bold:true,fontSize:8.5}]));
  const table={table:{headerRows:1,widths:[90,120,'*'],body:rows},layout:pdfGrid,margin:[0,0,0,8]};
  let index=content.findIndex(node=>textOf(node).trim().toUpperCase()==='TRABALHADORES AUTORIZADOS / EXECUTANTES');
  if(index<0)index=content.findIndex(node=>textOf(node).toUpperCase().includes('TRABALHADORES AUTORIZADOS / EXECUTANTES'));
  if(index<0)index=content.length;
  content.splice(index,0,title,table);return docDefinition;
}
function patchPdfMake(){
  const pdfMake=window.pdfMake;if(!pdfMake||typeof pdfMake.createPdf!=='function')return false;
  if(pdfMake.createPdf.__tbmPTRenewalNR35)return true;
  const original=pdfMake.createPdf;
  const wrapped=function(docDefinition,...args){try{injectRenewalsIntoPdf(docDefinition)}catch(err){console.warn('[PT RENOVACAO PDF]',err)}return original.call(this,docDefinition,...args)};
  wrapped.__tbmPTRenewalNR35=true;wrapped.__tbmOriginal=original;pdfMake.createPdf=wrapped;return true;
}
function observePTBody(){
  const body=document.getElementById('ptAlturaBody');if(!body)return false;
  if(bodyObserver)return true;
  bodyObserver=new MutationObserver(()=>queueMount());bodyObserver.observe(body,{childList:true});queueMount();return true;
}
function install(){patchHistoryGet();patchOpenPT();patchPersistence();patchPdfMake();observePTBody();injectRenewalStyle()}
install();setTimeout(install,250);setTimeout(install,900);setTimeout(()=>{patchPdfMake();observePTBody();queueMount()},1800);
window.__tbmPTRenewalNR35Version=VERSION;
window.tbmPTRenovacoes=()=>clone(currentRenewals());
})();