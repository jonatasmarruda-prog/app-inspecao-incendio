(()=>{
'use strict';

const FLAG='__tbmSolidStatusBadgesV1';
if(window[FLAG])return;
window[FLAG]=true;

const COLORS={
  'CONFORME':'#198754',
  'NÃO CONFORME':'#dc3545',
  'N/A':'#6c757d'
};

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

function normalizeStatus(value){
  const s=String(value??'').trim().toUpperCase().replace(/\s+/g,' ');
  if(s==='CONFORME')return 'CONFORME';
  if(s==='NÃO CONFORME'||s==='NAO CONFORME')return 'NÃO CONFORME';
  if(s==='N/A'||s==='NA')return 'N/A';
  return '';
}

function decorateChecklistSelect(select){
  if(!select?.matches?.('select[data-check]'))return;
  select.classList.remove('tbm-status-conforme','tbm-status-nao-conforme','tbm-status-na');
  const status=normalizeStatus(select.value);
  if(status==='CONFORME')select.classList.add('tbm-status-conforme');
  else if(status==='NÃO CONFORME')select.classList.add('tbm-status-nao-conforme');
  else if(status==='N/A')select.classList.add('tbm-status-na');
}

function decorateAllChecklistSelects(root=document){
  root.querySelectorAll?.('select[data-check]').forEach(decorateChecklistSelect);
}

function installChecklistSelectDecorator(){
  decorateAllChecklistSelects();
  document.addEventListener('change',event=>{
    const select=event.target?.closest?.('select[data-check]');
    if(select)decorateChecklistSelect(select);
  },true);

  const previous=window.renderChecklist;
  if(typeof previous==='function'&&!previous.__tbmSolidBadges){
    const wrapped=function(){
      const result=previous.apply(this,arguments);
      queueMicrotask(()=>decorateAllChecklistSelects(document.getElementById('checklist')||document));
      return result;
    };
    wrapped.__tbmSolidBadges=true;
    wrapped.__tbmPrevious=previous;
    window.renderChecklist=wrapped;
  }
}

function statusFromCell(cell){
  if(typeof cell==='string'||typeof cell==='number')return normalizeStatus(cell);
  if(!cell||typeof cell!=='object')return '';
  const direct=normalizeStatus(cell.text);
  if(direct)return direct;
  if(Array.isArray(cell.stack)){
    for(const item of cell.stack){
      const found=item&&typeof item==='object'?normalizeStatus(item.text):normalizeStatus(item);
      if(found)return found;
    }
  }
  return '';
}

function decorateStatusCell(cell,status){
  const fillColor=COLORS[status];
  if(!fillColor)return cell;
  if(cell===null||cell===undefined||typeof cell!=='object'){
    return {text:String(cell??status),bold:true,alignment:'center',fillColor,color:'#ffffff',margin:[0,5,0,5]};
  }
  cell.fillColor=fillColor;
  cell.color='#ffffff';
  cell.margin=[0,5,0,5];
  if(typeof cell.text==='string'){
    cell.bold=true;
    cell.alignment='center';
    cell.color='#ffffff';
  }
  if(Array.isArray(cell.stack)){
    cell.stack.forEach(item=>{
      if(item&&typeof item==='object'&&normalizeStatus(item.text)){
        item.bold=true;
        item.alignment='center';
        item.color='#ffffff';
      }
    });
  }
  return cell;
}

function applySolidBadgesToDocDefinition(docDefinition){
  const seen=new WeakSet();
  const walk=node=>{
    if(!node||typeof node!=='object')return;
    if(seen.has(node))return;
    seen.add(node);
    if(Array.isArray(node)){
      node.forEach(walk);
      return;
    }
    if(node.table&&Array.isArray(node.table.body)){
      node.table.body.forEach(row=>{
        if(!Array.isArray(row))return;
        row.forEach((cell,index)=>{
          const status=statusFromCell(cell);
          if(status)row[index]=decorateStatusCell(cell,status);
          walk(row[index]);
        });
      });
    }
    Object.keys(node).forEach(key=>{
      if(key==='table')return;
      walk(node[key]);
    });
  };
  walk(docDefinition);
  return docDefinition;
}

function installPdfMakeDecorator(){
  const pm=window.pdfMake;
  if(!pm||typeof pm.createPdf!=='function')return false;
  const previous=pm.createPdf;
  if(previous.__tbmSolidBadges)return true;
  const wrapped=function(docDefinition,...args){
    try{applySolidBadgesToDocDefinition(docDefinition)}catch(error){console.warn('[SOLID BADGES PDF]',error)}
    return previous.call(pm,docDefinition,...args);
  };
  wrapped.__tbmSolidBadges=true;
  wrapped.__tbmPrevious=previous;
  pm.createPdf=wrapped;
  return true;
}

function install(){
  injectSolidBadgeCss();
  installChecklistSelectDecorator();
  if(!installPdfMakeDecorator()){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(installPdfMakeDecorator()||attempts>=30)clearInterval(timer);
    },250);
  }
  window.tbmApplySolidBadgesToPdf=applySolidBadgesToDocDefinition;
  window.tbmRefreshSolidStatusBadges=()=>decorateAllChecklistSelects();
  window.__tbmSolidStatusBadgesVersion='2026.09.04.2';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
