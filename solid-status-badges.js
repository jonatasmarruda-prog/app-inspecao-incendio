(()=>{
'use strict';

const FLAG='__tbmSolidStatusBadgesV2';
if(window[FLAG])return;
window[FLAG]=true;

const COLORS={
  'CONFORME':'#198754',
  'NÃO CONFORME':'#dc3545',
  'N/A':'#6c757d'
};

function getState(){try{return typeof state!=='undefined'?state:(window.state||null)}catch(_){return window.state||null}}
function normalizeStatus(value){
  const s=String(value??'').trim().toUpperCase().replace(/\s+/g,' ');
  if(s==='CONFORME')return 'CONFORME';
  if(s==='NÃO CONFORME'||s==='NAO CONFORME')return 'NÃO CONFORME';
  if(s==='N/A'||s==='NA'||s==='N.A.'||s==='N.A')return 'N/A';
  if(s==='PENDENTE')return 'PENDENTE';
  return '';
}
function norm(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/\s+/g,' ')}
function visible(el){
  if(!el)return false;
  const css=getComputedStyle(el);
  return !el.classList.contains('hidden')&&css.display!=='none'&&css.visibility!=='hidden';
}
function cellText(cell){
  if(cell==null)return '';
  if(typeof cell==='string'||typeof cell==='number'||typeof cell==='boolean')return String(cell);
  if(Array.isArray(cell))return cell.map(cellText).join(' ');
  if(typeof cell==='object'){
    if(cell.text!=null)return cellText(cell.text);
    if(Array.isArray(cell.stack))return cell.stack.map(cellText).join(' ');
  }
  return '';
}
function statusOf(item){
  if(item&&typeof item==='object'&&!Array.isArray(item))return normalizeStatus(item.status||item.situacao||item.value);
  return normalizeStatus(item);
}
function evidenceOf(item){
  if(!item||typeof item!=='object')return '';
  const value=item.fotoEvidencia||item.evidencia||item.photo||'';
  return typeof value==='string'&&/^data:image\//i.test(value)?value:'';
}
function questionOf(item,index){
  if(item&&typeof item==='object')return String(item.pergunta||item.item||item.text||`Item ${index+1}`);
  return `Item ${index+1}`;
}

function injectSolidBadgeCss(){
  if(document.getElementById('tbm-solid-status-badges-style'))return;
  const style=document.createElement('style');
  style.id='tbm-solid-status-badges-style';
  style.textContent=`
    .choices button,.tbm-fire-check-choices button,#ptAlturaOverlay .pt-check-actions button,.nr24-statuses button{background:#e9edf2!important;color:#17202b!important;border:1px solid #d8dee7!important;box-shadow:none!important}
    .choices button.ok,.tbm-fire-check-choices button.ok,#ptAlturaOverlay .pt-check-actions button.ok,.nr24-statuses button.ok{background-color:#198754!important;color:#ffffff!important;border:none!important}
    .choices button.no,.tbm-fire-check-choices button.no,#ptAlturaOverlay .pt-check-actions button.no,.nr24-statuses button.no{background-color:#dc3545!important;color:#ffffff!important;border:none!important}
    .choices button.na,.tbm-fire-check-choices button.na,#ptAlturaOverlay .pt-check-actions button.na,.nr24-statuses button.na{background-color:#6c757d!important;color:#ffffff!important;border:none!important}
    .checkrow select[data-check]{background:#e9edf2!important;color:#17202b!important;border:1px solid #d8dee7!important;font-weight:900!important}
    .checkrow select[data-check].tbm-status-conforme{background-color:#198754!important;color:#ffffff!important;border:none!important}
    .checkrow select[data-check].tbm-status-nao-conforme{background-color:#dc3545!important;color:#ffffff!important;border:none!important}
    .checkrow select[data-check].tbm-status-na{background-color:#6c757d!important;color:#ffffff!important;border:none!important}
    .premium-extra .checkrow select[data-check].tbm-status-conforme{background-color:#198754!important;color:#ffffff!important;border:none!important}
    .premium-extra .checkrow select[data-check].tbm-status-nao-conforme{background-color:#dc3545!important;color:#ffffff!important;border:none!important}
    .premium-extra .checkrow select[data-check].tbm-status-na{background-color:#6c757d!important;color:#ffffff!important;border:none!important}
  `;
  document.head.appendChild(style);
}

function decorateChecklistSelect(select){
  if(!select?.matches?.('select[data-check]'))return;
  select.classList.remove('tbm-status-conforme','tbm-status-nao-conforme','tbm-status-na');
  const status=normalizeStatus(select.value);
  if(status==='CONFORME')select.classList.add('tbm-status-conforme');
  else if(status==='NÃO CONFORME')select.classList.add('tbm-status-nao-conforme');
  else if(status==='N/A')select.classList.add('tbm-status-na');
}
function decorateAllChecklistSelects(root=document){root.querySelectorAll?.('select[data-check]').forEach(decorateChecklistSelect)}

function bindMainChecklistStatusFromUi(target){
  const x=getState();if(!x)return;
  const fire=target.closest?.('[data-fire-check-kind]');
  if(fire&&x.type==='fire'){
    const kind=fire.dataset.fireCheckKind;
    const index=Number(fire.dataset.fireCheckIndex);
    const status=normalizeStatus(fire.dataset.fireCheckStatus)||'PENDENTE';
    try{window.tbmEnsureFireChecklistState?.()}catch(_){ }
    const arr=kind==='extintor'?x.checklistExtintores:x.checklistHidrantes;
    if(Array.isArray(arr)&&arr[index]){
      if(typeof arr[index]==='object')arr[index].status=status;
      else arr[index]={id:`${kind}-${index+1}`,pergunta:kind==='extintor'?(window.perguntasExtintor?.[index]||''):(window.perguntasHidrante?.[index]||''),status,fotoEvidencia:''};
    }
    return;
  }
  const nr=target.closest?.('[data-nr24-status]');
  if(nr&&x.type==='nr24'){
    const index=Number(nr.dataset.nr24Index);
    const status=normalizeStatus(nr.dataset.nr24Status)||'N/A';
    if(Array.isArray(x.checklistNR24)&&x.checklistNR24[index])x.checklistNR24[index].status=status;
    x.checks=x.checks&&typeof x.checks==='object'?x.checks:{};x.checks[index]=status;
    return;
  }
}
function installGlobalBinding(){
  document.addEventListener('click',event=>bindMainChecklistStatusFromUi(event.target),true);
  document.addEventListener('change',event=>{
    const select=event.target?.closest?.('select[data-check]');if(!select)return;
    decorateChecklistSelect(select);
    const x=getState();if(!x)return;
    const index=Number(select.dataset.check);if(!Number.isFinite(index))return;
    x.checks=x.checks&&typeof x.checks==='object'?x.checks:{};x.checks[index]=normalizeStatus(select.value)||select.value;
  },true);
}

function ptItemsFromDom(){
  const overlay=document.getElementById('ptAlturaOverlay');
  if(!visible(overlay))return [];
  const items=[];
  overlay.querySelectorAll('.pt-check-item').forEach((row,index)=>{
    const selected=[...row.querySelectorAll('[data-pt-check]')].find(btn=>btn.classList.contains('ok')||btn.classList.contains('no')||btn.classList.contains('na'));
    if(!selected)return;
    items.push({
      id:selected.dataset.ptCheck||`pt-${index+1}`,
      pergunta:row.querySelector('b')?.textContent?.replace(/^\s*\d+\.\s*/,'').trim()||`Item ${index+1}`,
      status:normalizeStatus(selected.dataset.ptStatus)||'N/A',
      fotoEvidencia:''
    });
  });
  return items;
}
function activeChecklistItems(){
  const pt=ptItemsFromDom();if(pt.length)return pt;
  const x=getState();if(!x)return [];
  if(x.type==='fire'){
    try{window.tbmEnsureFireChecklistState?.()}catch(_){ }
    return [...(Array.isArray(x.checklistExtintores)?x.checklistExtintores:[]),...(Array.isArray(x.checklistHidrantes)?x.checklistHidrantes:[])].map((item,index)=>typeof item==='object'?item:{pergunta:`Item ${index+1}`,status:normalizeStatus(item)||'PENDENTE',fotoEvidencia:''});
  }
  if(x.type==='nr24'&&Array.isArray(x.checklistNR24))return x.checklistNR24;
  if(Array.isArray(x.checklistPT))return x.checklistPT;
  const checks=x.checks&&typeof x.checks==='object'?Object.keys(x.checks).sort((a,b)=>Number(a)-Number(b)).map((k,index)=>({pergunta:`Item ${index+1}`,status:normalizeStatus(x.checks[k])||String(x.checks[k]||'PENDENTE'),fotoEvidencia:''})):[];
  return checks;
}
function checklistCounts(items=activeChecklistItems()){
  const statuses=items.map(statusOf);
  return {
    total:statuses.length,
    conforme:statuses.filter(v=>v==='CONFORME').length,
    naoConforme:statuses.filter(v=>v==='NÃO CONFORME').length,
    na:statuses.filter(v=>v==='N/A').length,
    pendente:statuses.filter(v=>v==='PENDENTE'||!v).length
  };
}

function statusFromCell(cell){
  if(typeof cell==='string'||typeof cell==='number')return normalizeStatus(cell);
  if(!cell||typeof cell!=='object')return '';
  const direct=normalizeStatus(cell.text);if(direct)return direct;
  if(Array.isArray(cell.stack)){
    for(const item of cell.stack){
      const found=item&&typeof item==='object'?normalizeStatus(item.text):normalizeStatus(item);
      if(found)return found;
    }
  }
  return '';
}
function statusPdfCell(item,previousCell){
  const status=statusOf(item)||statusFromCell(previousCell)||'PENDENTE';
  const fillColor=COLORS[status];
  const photo=evidenceOf(item);
  const stack=[{text:status,bold:true,alignment:'center',color:fillColor?'#ffffff':'#111827'}];
  if(photo)stack.push({image:photo,fit:[80,80],alignment:'center',margin:[0,5,0,0]});
  const cell={stack,alignment:'center',margin:[0,5,0,5]};
  if(fillColor){cell.fillColor=fillColor;cell.color='#ffffff'}
  return cell;
}
function decorateStatusCell(cell,status){
  const fillColor=COLORS[status];if(!fillColor)return cell;
  if(cell===null||cell===undefined||typeof cell!=='object')return {text:String(cell??status),bold:true,alignment:'center',fillColor,color:'#ffffff',margin:[0,5,0,5]};
  cell.fillColor=fillColor;cell.color='#ffffff';cell.margin=cell.margin||[0,5,0,5];
  if(typeof cell.text==='string'){cell.bold=true;cell.alignment='center';cell.color='#ffffff'}
  if(Array.isArray(cell.stack))cell.stack.forEach(item=>{if(item&&typeof item==='object'&&normalizeStatus(item.text)){item.bold=true;item.alignment='center';item.color='#ffffff'}});
  return cell;
}
function isChecklistHeader(row){
  if(!Array.isArray(row)||row.length<3)return false;
  const headers=row.map(cellText).map(norm);
  const statusIndex=headers.findIndex(h=>h==='STATUS'||h.includes('STATUS /')||h.includes('SITUACAO'));
  const itemIndex=headers.findIndex(h=>h.includes('ITEM INSPECIONADO')||h.includes('ITEM VERIFICADO')||h.includes('CRITERIO VERIFICADO')||h==='ITEM');
  const equipment=headers.some(h=>h.includes('EQUIPAMENTO'));
  return !equipment&&statusIndex>=0&&itemIndex>=0?{statusIndex,itemIndex}:false;
}
function syncChecklistTables(docDefinition,items){
  if(!items.length)return;
  let cursor=0;
  const seen=new WeakSet();
  const walk=node=>{
    if(!node||typeof node!=='object'||seen.has(node))return;seen.add(node);
    if(Array.isArray(node)){node.forEach(walk);return}
    const body=node.table?.body;
    if(Array.isArray(body)&&body.length){
      const meta=isChecklistHeader(body[0]);
      if(meta){
        for(let r=1;r<body.length&&cursor<items.length;r++){
          const row=body[r];if(!Array.isArray(row))continue;
          row[meta.statusIndex]=statusPdfCell(items[cursor],row[meta.statusIndex]);
          cursor++;
        }
      }
    }
    Object.keys(node).forEach(key=>{if(key!=='image'&&key!=='svg'&&key!=='canvas'&&typeof node[key]!=='function')walk(node[key])});
  };
  walk(docDefinition);
}
function updateSummaryTable(node,counts){
  const body=node?.table?.body;if(!Array.isArray(body)||!body.length)return false;
  if(body.length>=2&&Array.isArray(body[0])){
    const headers=body[0].map(cellText).map(norm);
    const hasTotal=headers.some(h=>h==='TOTAL');
    const hasCon=headers.some(h=>h.includes('CONFORME')&&!h.includes('NAO'));
    const hasNc=headers.some(h=>h.includes('NAO CONFORME'));
    if(hasTotal&&hasCon&&hasNc&&Array.isArray(body[1])){
      headers.forEach((h,i)=>{
        if(h==='TOTAL')body[1][i]=String(counts.total);
        else if(h.includes('NAO CONFORME'))body[1][i]=String(counts.naoConforme);
        else if(h.includes('CONFORME'))body[1][i]=String(counts.conforme);
        else if(h==='N/A'||h==='NA')body[1][i]=String(counts.na);
        else if(h.includes('PENDENTE'))body[1][i]=String(counts.pendente);
      });
      return true;
    }
  }
  if(body.length===1&&Array.isArray(body[0])){
    let changed=false;
    body[0].forEach(cell=>{
      if(!cell||typeof cell!=='object'||!Array.isArray(cell.stack)||cell.stack.length<2)return;
      const label=norm(cellText(cell.stack[1]));
      const first=cell.stack[0];if(!first||typeof first!=='object')return;
      if(label==='TOTAL'){first.text=String(counts.total);changed=true}
      else if(label.includes('NAO CONFORME')){first.text=String(counts.naoConforme);changed=true}
      else if(label.includes('CONFORME')){first.text=String(counts.conforme);changed=true}
      else if(label==='N/A'||label==='NA'){first.text=String(counts.na);changed=true}
      else if(label.includes('PENDENTE')){first.text=String(counts.pendente);changed=true}
    });
    return changed;
  }
  return false;
}
function syncSummaryCounters(docDefinition,items){
  if(!items.length)return;
  const counts=checklistCounts(items);const seen=new WeakSet();
  const walk=node=>{
    if(!node||typeof node!=='object'||seen.has(node))return;seen.add(node);
    if(Array.isArray(node)){node.forEach(walk);return}
    if(node.table)updateSummaryTable(node,counts);
    Object.keys(node).forEach(key=>{if(key!=='image'&&key!=='svg'&&key!=='canvas'&&typeof node[key]!=='function')walk(node[key])});
  };
  walk(docDefinition);
}
function applySolidBadgesToDocDefinition(docDefinition){
  const items=activeChecklistItems();
  try{syncChecklistTables(docDefinition,items)}catch(error){console.warn('[STATUS PDF BINDING]',error)}
  try{syncSummaryCounters(docDefinition,items)}catch(error){console.warn('[STATUS PDF SUMMARY]',error)}
  const seen=new WeakSet();
  const walk=node=>{
    if(!node||typeof node!=='object'||seen.has(node))return;seen.add(node);
    if(Array.isArray(node)){node.forEach(walk);return}
    if(node.table&&Array.isArray(node.table.body))node.table.body.forEach(row=>{if(!Array.isArray(row))return;row.forEach((cell,index)=>{const status=statusFromCell(cell);if(status)row[index]=decorateStatusCell(cell,status);walk(row[index])})});
    Object.keys(node).forEach(key=>{if(key!=='table'&&key!=='image'&&key!=='svg'&&key!=='canvas'&&typeof node[key]!=='function')walk(node[key])});
  };
  walk(docDefinition);return docDefinition;
}

function installChecklistSelectDecorator(){
  decorateAllChecklistSelects();
  document.addEventListener('change',event=>{const select=event.target?.closest?.('select[data-check]');if(select)decorateChecklistSelect(select)},true);
  const previous=window.renderChecklist;
  if(typeof previous==='function'&&!previous.__tbmSolidBadges){
    const wrapped=function(){const result=previous.apply(this,arguments);queueMicrotask(()=>decorateAllChecklistSelects(document.getElementById('checklist')||document));return result};
    wrapped.__tbmSolidBadges=true;wrapped.__tbmPrevious=previous;window.renderChecklist=wrapped;
  }
}
function installPdfMakeDecorator(){
  const pm=window.pdfMake;if(!pm||typeof pm.createPdf!=='function')return false;
  const previous=pm.createPdf;if(previous.__tbmSolidBadges)return true;
  const wrapped=function(docDefinition,...args){
    try{applySolidBadgesToDocDefinition(docDefinition)}catch(error){console.warn('[SOLID BADGES PDF]',error)}
    return previous.call(pm,docDefinition,...args);
  };
  wrapped.__tbmSolidBadges=true;wrapped.__tbmPrevious=previous;pm.createPdf=wrapped;return true;
}
function install(){
  injectSolidBadgeCss();installGlobalBinding();installChecklistSelectDecorator();
  if(!installPdfMakeDecorator()){
    let attempts=0;const timer=setInterval(()=>{attempts++;if(installPdfMakeDecorator()||attempts>=30)clearInterval(timer)},250);
  }
  window.tbmApplySolidBadgesToPdf=applySolidBadgesToDocDefinition;
  window.tbmRefreshSolidStatusBadges=()=>decorateAllChecklistSelects();
  window.tbmGetActiveChecklistItems=activeChecklistItems;
  window.tbmGetChecklistSummary=()=>checklistCounts(activeChecklistItems());
  window.__tbmSolidStatusBadgesVersion='2026.09.04.3-global-binding';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
