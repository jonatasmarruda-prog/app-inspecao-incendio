(()=>{
'use strict';

const FLAG='__tbmGlobalPdfStandardV1';
const COLORS={conforme:'#15803d',naoConforme:'#b91c1c',pendente:'#b45309'};
const processed=new WeakSet();
const LONG_RE=/(observa[cç][aã]o|observa[cç][oõ]es|descri[cç][aã]o|descri[cç][oõ]es|n[aã]o\s*conform|nao\s*conform|achad|a[cç][aã]o|a[cç][oõ]es|acoes|recomenda|riscos?|perigos?|medidas?\s+de\s+controle|falhas?|causas?|relato|detalhamento|atividade|servi[cç]o\s+executado|ocorr[eê]ncia|conclus[aã]o|epis?\s+previstos?|meio\s+de\s+acesso)/i;

function norm(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()}
function cellText(cell){
  if(cell==null)return'';
  if(typeof cell==='string'||typeof cell==='number'||typeof cell==='boolean')return String(cell);
  if(Array.isArray(cell))return cell.map(cellText).join('');
  if(typeof cell==='object'){
    if(cell.text!=null)return cellText(cell.text);
    if(Array.isArray(cell.stack))return cell.stack.map(cellText).join(' ');
  }
  return'';
}
function statusKind(v){
  const s=norm(cellText(v));
  if(s==='CONFORME'||s==='BOM'||s==='OK')return'conforme';
  if(s==='NAO CONFORME'||s==='NÃO CONFORME')return'naoConforme';
  if(s==='PENDENTE'||s==='N/A'||s==='NA'||s==='N.A.'||s==='N.A')return'pendente';
  return'';
}
function statusColor(v){const k=statusKind(v);return k?COLORS[k]:''}
function statusObject(v,extra={}){
  const text=cellText(v)||'PENDENTE';
  const color=statusColor(text);
  return Object.assign({text,bold:true},color?{color}:{},extra);
}
function longLabel(v){const s=cellText(v).trim();return s.length>0&&s.length<=100&&LONG_RE.test(s)}
function cloneCellWith(cell,extra){
  if(cell&&typeof cell==='object'&&!Array.isArray(cell))return Object.assign({},cell,extra);
  return Object.assign({text:cellText(cell)},extra);
}
function currentState(){
  try{return state||window.state||window.appState||window.currentInspection||{}}
  catch(_){return window.state||window.appState||window.currentInspection||{}}
}
function equipmentName(e){
  if(e?.nome)return String(e.nome);
  const kind=e?.kind==='ext'?'Extintor':e?.kind==='hid'?'Hidrante':e?.kind==='light'?'Iluminação de Emergência':e?.kind==='alarm'?'Sirene / Alarme':(e?.kind||'Equipamento');
  return [kind,e?.tipo,e?.capacidade].filter(v=>v!=null&&String(v).trim()!=='').join(' • ')||'Equipamento';
}
function isEquipmentTable(node){
  const body=node?.table?.body;
  if(!Array.isArray(body)||!Array.isArray(body[0])||body[0].length<4)return false;
  const header=body[0].map(cellText).join('|').toLowerCase();
  return header.includes('equipamento')&&header.includes('patrim')&&header.includes('situa')&&header.includes('observa');
}
function verticalizeEquipment(node){
  const body=node.table.body;
  const headers=body[0].map(x=>norm(cellText(x)));
  const ix={
    equip:headers.findIndex(x=>x.includes('EQUIPAMENTO')),
    pat:headers.findIndex(x=>x.includes('PATRIM')),
    data:headers.findIndex(x=>x.includes('LOCALIZA')||x.includes('DADOS')),
    sit:headers.findIndex(x=>x.includes('SITUA')||x.includes('STATUS')),
    obs:headers.findIndex(x=>x.includes('OBSERVA'))
  };
  const source=Array.isArray(currentState()?.equipment)?currentState().equipment:[];
  const dataRows=body.slice(1);
  const useState=source.length===dataRows.length&&source.length>0;
  const rows=[];
  dataRows.forEach((row,index)=>{
    const e=useState?source[index]:null;
    const nome=e?equipmentName(e):(cellText(row[ix.equip])||'Equipamento');
    const patrimonio=e?(e.patrimonio||'N/I'):(cellText(row[ix.pat])||'N/I');
    const localizacao=e?(e.localizacao||'N/I'):(cellText(row[ix.data])||'N/I');
    const situacao=e?(e.situacao||e.status||'PENDENTE'):(cellText(row[ix.sit])||'PENDENTE');
    const observacao=e?(e.observacao||e.obs||'Nenhuma observação'):(cellText(row[ix.obs])||'Nenhuma observação');
    const cor=statusColor(situacao)||'#111111';
    rows.push(
      [{text:`Item ${index+1} - ${nome} (Patrimônio: ${patrimonio})`,bold:true,fillColor:'#f4f4f4',margin:[0,5,0,5],color:'#111111'}],
      [{text:[{text:`Localização: ${localizacao} | Situação: `,bold:true,color:'#111111'},{text:String(situacao),bold:true,color:cor}],margin:[0,5,0,5]}],
      [{text:`Observações: ${observacao}`,margin:[0,2,0,15],color:'#111111'}]
    );
  });
  node.table.widths=['100%'];
  delete node.table.headerRows;
  node.table.body=rows;
  if(node.fontSize==null)node.fontSize=8.5;
}
function splitLongLabelValueRows(node){
  const table=node?.table,body=table?.body;
  if(!Array.isArray(body)||!body.length||!body.every(r=>Array.isArray(r)&&r.length===2))return false;
  if(!body.some(r=>longLabel(r[0])))return false;
  const oldWidths=Array.isArray(table.widths)&&table.widths.length===2?table.widths:['32%','68%'];
  const layout=node.layout;
  const fontSize=node.fontSize;
  const blocks=[];
  let shortRows=[];
  const flush=()=>{
    if(!shortRows.length)return;
    const b={table:{widths:oldWidths,body:shortRows},layout};
    if(fontSize!=null)b.fontSize=fontSize;
    blocks.push(b);shortRows=[];
  };
  body.forEach(row=>{
    if(!longLabel(row[0])){shortRows.push(row);return;}
    flush();
    const label=cloneCellWith(row[0],{bold:true,fillColor:'#f4f4f4',margin:[0,5,0,5],color:'#111111'});
    const value=cloneCellWith(row[1],{margin:[0,5,0,10],color:'#111111'});
    const b={table:{widths:['100%'],body:[[label],[value]]},layout};
    if(fontSize!=null)b.fontSize=fontSize;
    blocks.push(b);
  });
  flush();
  if(!blocks.length)return false;
  delete node.table;delete node.layout;delete node.fontSize;
  node.stack=blocks;
  return true;
}
function verticalizeLongHeaderTable(node){
  const table=node?.table,body=table?.body;
  if(!Array.isArray(body)||body.length<2||!Array.isArray(body[0])||body[0].length<2)return false;
  const headers=body[0].map(cellText);
  if(!headers.some(longLabel))return false;
  const fontSize=node.fontSize;
  const numberIndex=headers.findIndex(h=>norm(h)==='#'||norm(h)==='Nº'||norm(h)==='N°');
  const rows=[];
  body.slice(1).forEach((record,ri)=>{
    const id=numberIndex>=0?(cellText(record[numberIndex])||String(ri+1)):String(ri+1);
    rows.push([{text:`Item ${id}`,bold:true,fillColor:'#f4f4f4',margin:[0,5,0,5],color:'#111111'}]);
    headers.forEach((h,ci)=>{
      if(ci===numberIndex||!String(h).trim())return;
      rows.push([{text:h,bold:true,fillColor:'#f4f4f4',margin:[0,4,0,4],color:'#111111'}]);
      const raw=record?.[ci];
      const color=statusColor(raw);
      rows.push([cloneCellWith(raw,{margin:[0,4,0,9],bold:!!color,color:color||'#111111'})]);
    });
  });
  table.widths=['100%'];delete table.headerRows;table.body=rows;
  if(fontSize==null)node.fontSize=8.3;
  return true;
}
function transformTables(node){
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){node.forEach(transformTables);return;}
  if(node.table){
    if(isEquipmentTable(node))verticalizeEquipment(node);
    else if(!splitLongLabelValueRows(node))verticalizeLongHeaderTable(node);
  }
  Object.keys(node).forEach(k=>{
    if(k==='table'&&node.stack)return;
    transformTables(node[k]);
  });
}
function decorate(node){
  if(node==null)return node;
  if(typeof node==='string'||typeof node==='number'||typeof node==='boolean'){
    const color=statusColor(node);
    return color?statusObject(node):node;
  }
  if(Array.isArray(node))return node.map(decorate);
  if(typeof node!=='object')return node;
  if(node.text!=null&&statusColor(node.text)){
    node.bold=true;node.color=statusColor(node.text);
  }
  if(Array.isArray(node.stack)&&node.stack.length>=2){
    const label=norm(cellText(node.stack[1]));
    let color='';
    if(label.includes('NAO CONFORM'))color=COLORS.naoConforme;
    else if(label.includes('CONFORM'))color=COLORS.conforme;
    else if(label.includes('PENDENT')||label==='N/A'||label.includes('NAO APLIC'))color=COLORS.pendente;
    if(color&&node.stack[0]&&typeof node.stack[0]==='object'){
      node.stack[0].color=color;node.stack[0].bold=true;
    }
  }
  Object.keys(node).forEach(k=>{
    if(typeof node[k]==='function')return;
    node[k]=decorate(node[k]);
  });
  return node;
}
function applyGlobalStandard(docDefinition){
  if(!docDefinition||typeof docDefinition!=='object'||processed.has(docDefinition))return docDefinition;
  processed.add(docDefinition);
  transformTables(docDefinition);
  decorate(docDefinition);
  return docDefinition;
}
function install(){
  const pm=window.pdfMake;
  if(!pm||typeof pm.createPdf!=='function')return false;
  if(pm.createPdf[FLAG])return true;
  const original=pm.createPdf.bind(pm);
  const wrapped=function(docDefinition,...args){
    try{applyGlobalStandard(docDefinition)}catch(e){console.error('[PDF PADRÃO GLOBAL] Falha ao aplicar padrão:',e)}
    return original(docDefinition,...args);
  };
  wrapped[FLAG]=true;
  wrapped.__tbmOriginalCreatePdf=original;
  pm.createPdf=wrapped;
  return true;
}
window.tbmApplyGlobalPdfStandard=applyGlobalStandard;
window.TBM_PDF_STATUS_COLORS=Object.freeze({...COLORS});
if(!install()){
  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>=40)clearInterval(timer)},200);
}
})();
