(()=>{
'use strict';

const FLAG='__tbmSolidStatusBadgesV3';
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
  if(s==='CONFORME')return'CONFORME';
  if(s==='NÃO CONFORME'||s==='NAO CONFORME')return'NÃO CONFORME';
  if(s==='N/A'||s==='NA'||s==='N.A.'||s==='N.A')return'N/A';
  if(s==='PENDENTE')return'PENDENTE';
  return'';
}
function norm(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/\s+/g,' ')}
function cellText(cell){
  if(cell==null)return'';
  if(typeof cell==='string'||typeof cell==='number'||typeof cell==='boolean')return String(cell);
  if(Array.isArray(cell))return cell.map(cellText).join(' ');
  if(typeof cell==='object'){
    if(cell.text!=null)return cellText(cell.text);
    if(Array.isArray(cell.stack))return cell.stack.map(cellText).join(' ');
  }
  return'';
}
function statusOf(item){
  if(item&&typeof item==='object'&&!Array.isArray(item))return normalizeStatus(item.status||item.situacao||item.value);
  return normalizeStatus(item);
}
function evidenceOf(item){
  if(!item||typeof item!=='object')return'';
  const src=item.fotoEvidencia||item.evidencia||item.photo||'';
  return typeof src==='string'&&/^data:image\//i.test(src)?src:'';
}

function injectCss(){
  if(document.getElementById('tbm-solid-status-badges-style'))return;
  const style=document.createElement('style');
  style.id='tbm-solid-status-badges-style';
  style.textContent=`
    .choices button,.tbm-fire-check-choices button,#ptAlturaOverlay .pt-check-actions button,.nr24-statuses button{background:#e9edf2!important;color:#17202b!important;border:1px solid #d8dee7!important;box-shadow:none!important}
    .choices button.ok,.tbm-fire-check-choices button.ok,#ptAlturaOverlay .pt-check-actions button.ok,.nr24-statuses button.ok{background-color:#198754!important;color:#fff!important;border:none!important}
    .choices button.no,.tbm-fire-check-choices button.no,#ptAlturaOverlay .pt-check-actions button.no,.nr24-statuses button.no{background-color:#dc3545!important;color:#fff!important;border:none!important}
    .choices button.na,.tbm-fire-check-choices button.na,#ptAlturaOverlay .pt-check-actions button.na,.nr24-statuses button.na{background-color:#6c757d!important;color:#fff!important;border:none!important}
    .checkrow select[data-check]{background:#e9edf2!important;color:#17202b!important;border:1px solid #d8dee7!important;font-weight:900!important}
    .checkrow select[data-check].tbm-status-conforme{background-color:#198754!important;color:#fff!important;border:none!important}
    .checkrow select[data-check].tbm-status-nao-conforme{background-color:#dc3545!important;color:#fff!important;border:none!important}
    .checkrow select[data-check].tbm-status-na{background-color:#6c757d!important;color:#fff!important;border:none!important}
  `;
  document.head.appendChild(style);
}

function decorateSelect(select){
  if(!select?.matches?.('select[data-check]'))return;
  select.classList.remove('tbm-status-conforme','tbm-status-nao-conforme','tbm-status-na');
  const s=normalizeStatus(select.value);
  if(s==='CONFORME')select.classList.add('tbm-status-conforme');
  else if(s==='NÃO CONFORME')select.classList.add('tbm-status-nao-conforme');
  else if(s==='N/A')select.classList.add('tbm-status-na');
}
function decorateSelects(root=document){root.querySelectorAll?.('select[data-check]').forEach(decorateSelect)}

function bindState(){
  document.addEventListener('click',event=>{
    const target=event.target;
    const x=getState();if(!x)return;

    const fire=target?.closest?.('[data-fire-check-kind]');
    if(fire&&x.type==='fire'){
      const kind=fire.dataset.fireCheckKind;
      const index=Number(fire.dataset.fireCheckIndex);
      const status=normalizeStatus(fire.dataset.fireCheckStatus)||'PENDENTE';
      try{window.tbmEnsureFireChecklistState?.()}catch(_){ }
      const arr=kind==='extintor'?x.checklistExtintores:x.checklistHidrantes;
      if(Array.isArray(arr)&&Number.isFinite(index)&&arr[index]){
        if(typeof arr[index]==='object')arr[index].status=status;
        else arr[index]={id:`${kind}-${index+1}`,pergunta:kind==='extintor'?(window.perguntasExtintor?.[index]||''):(window.perguntasHidrante?.[index]||''),status,fotoEvidencia:''};
      }
      return;
    }

    const nr=target?.closest?.('[data-nr24-status]');
    if(nr&&x.type==='nr24'){
      const index=Number(nr.dataset.nr24Index);
      const status=normalizeStatus(nr.dataset.nr24Status)||'N/A';
      if(Array.isArray(x.checklistNR24)&&x.checklistNR24[index])x.checklistNR24[index].status=status;
      x.checks=x.checks&&typeof x.checks==='object'?x.checks:{};
      x.checks[index]=status;
    }
  },true);

  document.addEventListener('change',event=>{
    const select=event.target?.closest?.('select[data-check]');if(!select)return;
    decorateSelect(select);
    const x=getState();if(!x)return;
    const index=Number(select.dataset.check);if(!Number.isFinite(index))return;
    x.checks=x.checks&&typeof x.checks==='object'?x.checks:{};
    x.checks[index]=normalizeStatus(select.value)||select.value;
  },true);
}

function fireItems(){
  const x=getState();if(x?.type!=='fire')return[];
  try{window.tbmEnsureFireChecklistState?.()}catch(_){ }
  const ext=Array.isArray(x.checklistExtintores)?x.checklistExtintores:[];
  const hid=Array.isArray(x.checklistHidrantes)?x.checklistHidrantes:[];
  return [...ext,...hid].map((item,index)=>{
    if(item&&typeof item==='object')return item;
    return {status:normalizeStatus(item)||'PENDENTE',fotoEvidencia:'',pergunta:`Item ${index+1}`};
  });
}
function fireCounts(items){
  const statuses=items.map(statusOf);
  return{
    total:statuses.length,
    conforme:statuses.filter(v=>v==='CONFORME').length,
    naoConforme:statuses.filter(v=>v==='NÃO CONFORME').length,
    na:statuses.filter(v=>v==='N/A').length,
    pendente:statuses.filter(v=>v==='PENDENTE'||!v).length
  };
}

function makeStatusCell(item,fallback){
  const status=statusOf(item)||normalizeStatus(cellText(fallback))||'PENDENTE';
  const fillColor=COLORS[status];
  const photo=evidenceOf(item);
  if(photo){
    const cell={stack:[{text:status,bold:true,alignment:'center',color:fillColor?'#fff':'#111827'},{image:photo,fit:[80,80],alignment:'center',margin:[0,5,0,0]}],alignment:'center',margin:[0,5,0,5]};
    if(fillColor){cell.fillColor=fillColor;cell.color='#fff'}
    return cell;
  }
  const cell={text:status,bold:true,alignment:'center',margin:[0,5,0,5]};
  if(fillColor){cell.fillColor=fillColor;cell.color='#fff'}
  return cell;
}
function decorateStatusCell(cell,status){
  const fillColor=COLORS[status];if(!fillColor)return cell;
  if(!cell||typeof cell!=='object'||Array.isArray(cell))return{text:String(cell??status),bold:true,alignment:'center',fillColor,color:'#fff',margin:[0,5,0,5]};
  cell.fillColor=fillColor;cell.color='#fff';cell.margin=cell.margin||[0,5,0,5];
  if(typeof cell.text==='string'){cell.bold=true;cell.alignment='center';cell.color='#fff'}
  if(Array.isArray(cell.stack))cell.stack.forEach(part=>{if(part&&typeof part==='object'&&normalizeStatus(part.text)){part.bold=true;part.alignment='center';part.color='#fff'}});
  return cell;
}
function checklistMeta(row){
  if(!Array.isArray(row)||row.length<3)return null;
  const headers=row.map(cellText).map(norm);
  if(headers.some(h=>h.includes('EQUIPAMENTO')))return null;
  const statusIndex=headers.findIndex(h=>h==='STATUS'||h.includes('STATUS /')||h.includes('SITUACAO'));
  const itemIndex=headers.findIndex(h=>h.includes('ITEM INSPECIONADO')||h.includes('ITEM VERIFICADO')||h.includes('CRITERIO VERIFICADO')||h==='ITEM');
  return statusIndex>=0&&itemIndex>=0?{statusIndex}:null;
}
function patchSummary(body,counts){
  if(!Array.isArray(body)||!body.length)return;
  if(body.length>=2&&Array.isArray(body[0])&&Array.isArray(body[1])){
    const headers=body[0].map(cellText).map(norm);
    if(headers.some(h=>h==='TOTAL')&&headers.some(h=>h.includes('CONFORME'))){
      headers.forEach((h,i)=>{
        if(h==='TOTAL')body[1][i]=String(counts.total);
        else if(h.includes('NAO CONFORME'))body[1][i]=String(counts.naoConforme);
        else if(h.includes('CONFORME'))body[1][i]=String(counts.conforme);
        else if(h==='N/A'||h==='NA')body[1][i]=String(counts.na);
        else if(h.includes('PENDENTE'))body[1][i]=String(counts.pendente);
      });
    }
  }
  if(body.length===1&&Array.isArray(body[0])){
    body[0].forEach(cell=>{
      if(!cell||typeof cell!=='object'||!Array.isArray(cell.stack)||cell.stack.length<2)return;
      const label=norm(cellText(cell.stack[1]));const value=cell.stack[0];
      if(!value||typeof value!=='object')return;
      if(label==='TOTAL')value.text=String(counts.total);
      else if(label.includes('NAO CONFORME'))value.text=String(counts.naoConforme);
      else if(label.includes('CONFORME'))value.text=String(counts.conforme);
      else if(label==='N/A'||label==='NA')value.text=String(counts.na);
      else if(label.includes('PENDENTE'))value.text=String(counts.pendente);
    });
  }
}

function applyToPdf(docDefinition){
  if(!docDefinition||typeof docDefinition!=='object')return docDefinition;
  const current=getState();
  const items=current?.type==='fire'?fireItems():[];
  const counts=items.length?fireCounts(items):null;
  let fireCursor=0;
  const seen=new WeakSet();

  const walk=node=>{
    if(!node||typeof node!=='object'||seen.has(node))return;
    seen.add(node);
    if(Array.isArray(node)){node.forEach(walk);return}

    const body=node.table?.body;
    if(Array.isArray(body)&&body.length){
      if(counts)patchSummary(body,counts);
      const meta=checklistMeta(body[0]);
      if(meta&&items.length){
        for(let r=1;r<body.length&&fireCursor<items.length;r++){
          if(!Array.isArray(body[r]))continue;
          body[r][meta.statusIndex]=makeStatusCell(items[fireCursor],body[r][meta.statusIndex]);
          fireCursor++;
        }
      }
      body.forEach(row=>{
        if(!Array.isArray(row))return;
        row.forEach((cell,index)=>{
          const status=normalizeStatus(cellText(cell));
          if(COLORS[status])row[index]=decorateStatusCell(cell,status);
        });
      });
    }

    Object.keys(node).forEach(key=>{
      if(key==='image'||key==='svg'||key==='canvas'||typeof node[key]==='function')return;
      walk(node[key]);
    });
  };

  walk(docDefinition);
  return docDefinition;
}

function installRenderDecorator(){
  decorateSelects();
  const previous=window.renderChecklist;
  if(typeof previous==='function'&&!previous.__tbmSolidBadges){
    const wrapped=function(){
      const result=previous.apply(this,arguments);
      queueMicrotask(()=>decorateSelects(document.getElementById('checklist')||document));
      return result;
    };
    wrapped.__tbmSolidBadges=true;wrapped.__tbmPrevious=previous;window.renderChecklist=wrapped;
  }
}
function installPdfDecorator(){
  const pm=window.pdfMake;if(!pm||typeof pm.createPdf!=='function')return false;
  const previous=pm.createPdf;if(previous.__tbmSolidBadges)return true;
  const wrapped=function(docDefinition,...args){
    try{applyToPdf(docDefinition)}catch(error){console.warn('[SOLID BADGES PDF]',error)}
    return previous.call(pm,docDefinition,...args);
  };
  wrapped.__tbmSolidBadges=true;wrapped.__tbmPrevious=previous;pm.createPdf=wrapped;return true;
}
function install(){
  injectCss();bindState();installRenderDecorator();
  if(!installPdfDecorator()){
    let attempts=0;const timer=setInterval(()=>{attempts++;if(installPdfDecorator()||attempts>=20)clearInterval(timer)},250);
  }
  window.tbmApplySolidBadgesToPdf=applyToPdf;
  window.tbmRefreshSolidStatusBadges=()=>decorateSelects();
  window.__tbmSolidStatusBadgesVersion='2026.09.04.4-performance';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
