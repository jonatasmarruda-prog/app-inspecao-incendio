(()=>{
'use strict';

const FLAG='__tbmAccidentInjuryModuleV1';
if(window[FLAG])return;window[FLAG]=true;

const TYPE='accident';
const BODY_OPTIONS=['Cabeça','Olho','Rosto','Pescoço','Tronco','Costas','Braço','Mãos','Dedos','Perna','Pé','Outros'];
const INJURY_OPTIONS=['Fraturas','Cortes','Queimaduras','Perfurações','Escoriações','Amputação','Outros'];

function getState(){try{return typeof state!=='undefined'?state:(window.state||null)}catch(_){return window.state||null}}
function isAccident(x=getState()){return x?.type===TYPE}
function schedule(){try{if(typeof scheduleSave==='function')scheduleSave();else window.scheduleSave?.()}catch(_){ }}
function ensureState(){
  const x=getState();if(!isAccident(x))return x;
  x.accident=x.accident&&typeof x.accident==='object'?x.accident:{};
  const a=x.accident;
  a.sourceGenerator=String(a.sourceGenerator||'');
  a.causalNexus=['Sim','Não'].includes(a.causalNexus)?a.causalNexus:'';
  a.injuryTypeChoice=String(a.injuryTypeChoice||a.injuryType||'');
  a.injuryTypeOther=String(a.injuryTypeOther||'');
  a.bodyPartChoice=String(a.bodyPartChoice||a.bodyPart||'');
  a.bodyPartOther=String(a.bodyPartOther||'');
  return x;
}
function finalInjuryType(a){return a?.injuryTypeChoice==='Outros'?(String(a.injuryTypeOther||'').trim()||'Outros'):(String(a?.injuryTypeChoice||'').trim()||'Não informado')}
function finalBodyPart(a){return a?.bodyPartChoice==='Outros'?(String(a.bodyPartOther||'').trim()||'Outros'):(String(a?.bodyPartChoice||'').trim()||'Não informado')}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function options(list,current){return '<option value="">Selecione</option>'+list.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(v)}</option>`).join('')}

function installCss(){
  if(document.getElementById('tbm-accident-injury-style'))return;
  const s=document.createElement('style');s.id='tbm-accident-injury-style';s.textContent=`
    #accidentInjuryDetail{margin:18px 0 0;padding:16px;border:1px solid #2a3642;border-radius:14px;background:#0b1219;color:#f4f6f8}
    #accidentInjuryDetail .accident-injury-title{font-size:15px;font-weight:900;margin:0 0 12px;color:#f4f6f8}
    #accidentInjuryDetail .accident-injury-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    #accidentInjuryDetail .field label{color:#f4f6f8!important}
    #accidentInjuryDetail input,#accidentInjuryDetail select{width:100%;background:#101820!important;color:#f4f6f8!important;border:1px solid #2a3642!important;border-radius:10px;padding:12px}
    #accidentInjuryDetail select option{background:#101820;color:#f4f6f8}
    #accidentInjuryDetail .form-control.mt-2{margin-top:8px}
    @media(max-width:760px){#accidentInjuryDetail .accident-injury-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}

function buildUi(){
  const x=ensureState();if(!x)return null;const a=x.accident;
  const wrap=document.createElement('div');wrap.id='accidentInjuryDetail';
  wrap.innerHTML=`
    <div class="accident-injury-title">Detalhamento da Lesão e Nexo Causal</div>
    <div class="accident-injury-grid">
      <div class="field">
        <label>Fonte Geradora</label>
        <input type="text" data-accident-field="sourceGenerator" value="${esc(a.sourceGenerator)}" placeholder="Ex.: máquina, ferramenta, superfície, produto químico">
      </div>
      <div class="field">
        <label>Houve Nexo Causal?</label>
        <select data-accident-field="causalNexus">${options(['Sim','Não'],a.causalNexus)}</select>
      </div>
      <div class="field">
        <label>Tipo de Ferimento</label>
        <select id="accidentInjuryType" data-accident-field="injuryTypeChoice">${options(INJURY_OPTIONS,a.injuryTypeChoice)}</select>
        <input type="text" id="accidentInjuryTypeOther" class="form-control mt-2" data-accident-field="injuryTypeOther" value="${esc(a.injuryTypeOther)}" placeholder="Descreva o tipo de ferimento" style="display:${a.injuryTypeChoice==='Outros'?'block':'none'}">
      </div>
      <div class="field">
        <label>Parte do Corpo Atingida</label>
        <select id="accidentBodyPart" data-accident-field="bodyPartChoice">${options(BODY_OPTIONS,a.bodyPartChoice)}</select>
        <input type="text" id="accidentBodyPartOther" class="form-control mt-2" data-accident-field="bodyPartOther" value="${esc(a.bodyPartOther)}" placeholder="Descreva a parte do corpo" style="display:${a.bodyPartChoice==='Outros'?'block':'none'}">
      </div>
    </div>`;
  return wrap;
}

function ensureUi(){
  if(!isAccident())return;
  let box=document.getElementById('accidentInjuryDetail');
  if(!box){
    const card=document.getElementById('accidentInvestigationCard');if(!card)return;
    const subtitles=[...card.querySelectorAll('.accident-subtitle')];
    const anchor=subtitles.find(el=>/^3\./.test(String(el.textContent||'').trim()))||subtitles[subtitles.length-1];
    box=buildUi();if(!box)return;
    if(anchor)anchor.insertAdjacentElement('beforebegin',box);else card.appendChild(box);
  }
  refreshUi();
}
function refreshUi(){
  const x=ensureState();if(!x||!isAccident(x))return;const a=x.accident;
  const set=(sel,v)=>{const el=document.querySelector(sel);if(el&&el.value!==String(v??''))el.value=String(v??'')};
  set('#accidentInjuryDetail [data-accident-field="sourceGenerator"]',a.sourceGenerator);
  set('#accidentInjuryDetail [data-accident-field="causalNexus"]',a.causalNexus);
  set('#accidentInjuryType',a.injuryTypeChoice);
  set('#accidentInjuryTypeOther',a.injuryTypeOther);
  set('#accidentBodyPart',a.bodyPartChoice);
  set('#accidentBodyPartOther',a.bodyPartOther);
  const injuryOther=document.getElementById('accidentInjuryTypeOther');
  if(injuryOther)injuryOther.style.display=a.injuryTypeChoice==='Outros'?'block':'none';
  const bodyOther=document.getElementById('accidentBodyPartOther');
  if(bodyOther)bodyOther.style.display=a.bodyPartChoice==='Outros'?'block':'none';
}
function syncField(el){
  const x=ensureState();if(!x||!isAccident(x)||!el?.dataset?.accidentField)return;
  x.accident[el.dataset.accidentField]=el.value;
  if(el.id==='accidentInjuryType'){
    const other=document.getElementById('accidentInjuryTypeOther');
    if(other)other.style.display=el.value==='Outros'?'block':'none';
    if(el.value!=='Outros'){x.accident.injuryTypeOther='';if(other)other.value=''}
  }
  if(el.id==='accidentBodyPart'){
    const other=document.getElementById('accidentBodyPartOther');
    if(other)other.style.display=el.value==='Outros'?'block':'none';
    if(el.value!=='Outros'){x.accident.bodyPartOther='';if(other)other.value=''}
  }
  schedule();
}

function pdfLayout(){return{hLineColor:()=> '#cfd6df',vLineColor:()=> '#cfd6df',hLineWidth:()=>.6,vLineWidth:()=>.6,paddingLeft:()=>7,paddingRight:()=>7,paddingTop:()=>6,paddingBottom:()=>6}}
function injuryPdfBlock(a){
  const label=t=>({text:t,bold:true,fillColor:'#f4f4f4',color:'#111111'});
  const value=t=>({text:String(t||'Não informado'),color:'#17202b'});
  return [
    {table:{widths:['*'],body:[[{text:'DETALHAMENTO DA LESÃO',bold:true,fillColor:'#f4f4f4',fontSize:11,color:'#111111'}]]},layout:pdfLayout(),margin:[0,10,0,0]},
    {table:{widths:['31%','69%'],body:[
      [label('Parte do Corpo Atingida'),value(finalBodyPart(a))],
      [label('Tipo de Lesão'),value(finalInjuryType(a))],
      [label('Fonte Geradora'),value(String(a.sourceGenerator||'').trim()||'Não informado')],
      [label('Nexo Causal'),value(String(a.causalNexus||'').trim()||'Não informado')]
    ]},layout:pdfLayout(),fontSize:8.5,margin:[0,0,0,6]}
  ];
}
function textOf(node){
  if(node==null)return'';
  if(typeof node==='string'||typeof node==='number')return String(node);
  if(Array.isArray(node))return node.map(textOf).join(' ');
  if(typeof node==='object'){
    if(node.text!=null)return textOf(node.text);
    if(node.stack)return textOf(node.stack);
    if(node.table?.body)return textOf(node.table.body);
  }
  return'';
}
function injectPdf(docDefinition){
  const x=ensureState();if(!isAccident(x)||!docDefinition||!Array.isArray(docDefinition.content))return docDefinition;
  if(docDefinition.__tbmAccidentInjuryInjected)return docDefinition;
  const content=docDefinition.content;
  if(content.some(node=>textOf(node).trim().toUpperCase()==='DETALHAMENTO DA LESÃO')){
    docDefinition.__tbmAccidentInjuryInjected=true;return docDefinition;
  }
  let idx=content.findIndex(node=>/^PLANO DE AÇÃO$/i.test(textOf(node).trim()));
  if(idx<0)idx=content.findIndex(node=>/PLANO DE AÇÃO/i.test(textOf(node)));
  const block=injuryPdfBlock(x.accident);
  content.splice(idx>=0?idx:content.length,0,...block);
  docDefinition.__tbmAccidentInjuryInjected=true;
  return docDefinition;
}
function installPdfHook(){
  const pm=window.pdfMake;if(!pm||typeof pm.createPdf!=='function')return false;
  if(pm.createPdf.__tbmAccidentInjury)return true;
  const previous=pm.createPdf;
  const wrapped=function(docDefinition,...args){
    try{injectPdf(docDefinition)}catch(err){console.warn('[ACIDENTE LESÃO PDF]',err)}
    return previous.call(this,docDefinition,...args);
  };
  wrapped.__tbmAccidentInjury=true;
  wrapped.__tbmPrevious=previous;
  pm.createPdf=wrapped;
  return true;
}
function installRenderHook(){
  const previous=window.renderAccident;if(typeof previous!=='function'||previous.__tbmAccidentInjury)return;
  const wrapped=function(){const out=previous.apply(this,arguments);if(isAccident())ensureUi();return out};
  wrapped.__tbmAccidentInjury=true;
  wrapped.__tbmPrevious=previous;
  window.renderAccident=wrapped;
}
function bind(){
  if(document.documentElement.dataset.tbmAccidentInjuryEvents==='1')return;
  document.documentElement.dataset.tbmAccidentInjuryEvents='1';
  document.addEventListener('change',e=>{if(e.target?.closest?.('#accidentInjuryDetail'))syncField(e.target)},true);
  document.addEventListener('input',e=>{if(e.target?.closest?.('#accidentInjuryDetail'))syncField(e.target)},true);
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-type="accident"],[data-open-h]'))setTimeout(()=>{if(isAccident())ensureUi()},0)},false);
}
function install(){
  installCss();
  installRenderHook();
  bind();
  if(!installPdfHook()){
    let tries=0;const t=setInterval(()=>{tries++;if(installPdfHook()||tries>=20)clearInterval(t)},150);
  }
  if(isAccident())ensureUi();
  window.tbmRefreshAccidentInjury=()=>{if(isAccident())ensureUi()};
  window.tbmInjectAccidentInjuryPdf=injectPdf;
  window.__tbmAccidentInjuryVersion='2026.09.04.2-fields-only';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
