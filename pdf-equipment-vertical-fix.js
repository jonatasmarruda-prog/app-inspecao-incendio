(()=>{
'use strict';

const FIX_FLAG='__tbmEquipmentVerticalFix';

function currentState(){
  try{return state||window.state||window.appState||window.currentInspection||{}}
  catch(_){return window.state||window.appState||window.currentInspection||{}}
}

function cellText(cell){
  if(cell==null)return'';
  if(typeof cell==='string'||typeof cell==='number')return String(cell);
  if(typeof cell==='object'&&cell.text!=null)return String(cell.text);
  return'';
}

function equipmentName(e){
  if(e?.nome)return String(e.nome);
  const kind=e?.kind==='ext'?'Extintor':
    e?.kind==='hid'?'Hidrante':
    e?.kind==='light'?'Iluminação de Emergência':
    e?.kind==='alarm'?'Sirene / Alarme':
    (e?.kind||'Equipamento');
  return [kind,e?.tipo,e?.capacidade].filter(v=>v!=null&&String(v).trim()!=='').join(' • ');
}

function equipmentSituation(e){
  return e?.situacao||e?.status||'PENDENTE';
}

function equipmentObservation(e){
  return e?.observacao||e?.obs||'Nenhuma observação';
}

function isEquipmentTable(node){
  const body=node?.table?.body;
  if(!Array.isArray(body)||!Array.isArray(body[0]))return false;
  const header=body[0].map(cellText).join('|').toLowerCase();
  return header.includes('equipamento')&&
    header.includes('patrimônio')&&
    header.includes('dados / localização')&&
    header.includes('situação')&&
    header.includes('observações');
}

function makeRows(equipment){
  const rows=[];
  equipment.forEach((e,index)=>{
    const nome=equipmentName(e);
    const patrimonio=e?.patrimonio||'N/I';
    const localizacao=e?.localizacao||'N/I';
    const situacao=equipmentSituation(e);
    const observacao=equipmentObservation(e);
    rows.push(
      [{text:`Item ${index+1} - ${nome} (Patrimônio: ${patrimonio})`,bold:true,fillColor:'#f4f4f4',margin:[0,5,0,5]}],
      [{text:`Localização: ${localizacao} | Situação: ${situacao}`,bold:true,margin:[0,5,0,5]}],
      [{text:`Observações: ${observacao}`,margin:[0,2,0,15]}]
    );
  });
  return rows;
}

function applyVerticalLayout(docDefinition){
  const equipment=Array.isArray(currentState()?.equipment)?currentState().equipment:[];
  if(!equipment.length||!docDefinition)return docDefinition;

  const visit=node=>{
    if(!node||typeof node!=='object')return;
    if(isEquipmentTable(node)){
      node.table.widths=['100%'];
      delete node.table.headerRows;
      node.table.body=makeRows(equipment);
      if(node.fontSize==null)node.fontSize=8.5;
      return;
    }
    if(Array.isArray(node)){node.forEach(visit);return;}
    Object.keys(node).forEach(k=>visit(node[k]));
  };

  visit(docDefinition);
  return docDefinition;
}

function install(){
  const pm=window.pdfMake;
  if(!pm||typeof pm.createPdf!=='function')return false;
  if(pm.createPdf[FIX_FLAG])return true;

  const original=pm.createPdf.bind(pm);
  const wrapped=function(docDefinition,...args){
    try{applyVerticalLayout(docDefinition)}
    catch(e){console.error('[PDF EQUIPAMENTOS VERTICAL] Falha ao aplicar layout:',e)}
    return original(docDefinition,...args);
  };
  wrapped[FIX_FLAG]=true;
  wrapped.__tbmOriginalCreatePdf=original;
  pm.createPdf=wrapped;
  return true;
}

window.tbmApplyEquipmentVerticalPdf=applyVerticalLayout;

if(!install()){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>=30)clearInterval(timer);
  },200);
}
})();