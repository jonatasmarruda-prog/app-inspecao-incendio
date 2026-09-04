(()=>{
'use strict';

const FLAG='__tbmAccidentInjuryModuleV1';
if(window[FLAG])return;window[FLAG]=true;

const TYPE='accident';
const BODY_OPTIONS=['Cabeça','Olho','Rosto','Pescoço','Tronco','Costas','Braço','Mãos','Dedos','Perna','Pé','Outros'];
const INJURY_OPTIONS=['Fraturas','Cortes','Queimaduras','Perfurações','Escoriações','Amputação','Outros'];
const BODY_MAP={
  'Cabeça':'map-cabeca','Olho':'map-olho','Rosto':'map-rosto','Pescoço':'map-pescoco',
  'Tronco':'map-tronco','Costas':'map-costas','Braço':'map-braco','Mãos':'map-maos',
  'Dedos':'map-dedos','Perna':'map-perna','Pé':'map-pe'
};

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
    #accidentInjuryDetail .anatomy-shell{margin-top:12px;border:1px solid #d6dce3;border-radius:14px;background:#fff;padding:12px;overflow:hidden}
    #accidentInjuryDetail .anatomy-label{color:#212529;font-size:11px;font-weight:800;text-align:center;margin-bottom:8px}
    #accidentBodyMap{display:block;width:100%;max-width:520px;height:auto;margin:auto}
    #accidentBodyMap .body-region{fill:#e9ecef;stroke:#6c757d;stroke-width:1.4;transition:fill .16s ease}
    #accidentBodyMap .body-region.active{fill:#dc3545!important;stroke:#991b1b}
    #accidentBodyMap .map-caption{fill:#495057;font-size:12px;font-weight:700;text-anchor:middle}
    @media(max-width:760px){#accidentInjuryDetail .accident-injury-grid{grid-template-columns:1fr}}
  `;document.head.appendChild(s);
}

function anatomySvg(){return `
<svg id="accidentBodyMap" viewBox="0 0 420 420" role="img" aria-label="Mapa anatômico interativo">
  <text x="110" y="20" class="map-caption">Frente</text><text x="310" y="20" class="map-caption">Costas</text>
  <path id="map-cabeca" class="body-region" d="M110 35a28 28 0 1 0 0 56a28 28 0 1 0 0-56z"/>
  <path id="map-rosto" class="body-region" d="M91 54q19-15 38 0v22q-19 18-38 0z"/>
  <path id="map-olho" class="body-region" d="M98 61h8v6h-8zm16 0h8v6h-8z"/>
  <path id="map-pescoco" class="body-region" d="M100 90h20l5 22H95z"/>
  <path id="map-tronco" class="body-region" d="M78 112q32-15 64 0l14 104q-46 20-92 0z"/>
  <path id="map-braco" class="body-region" d="M77 118l-17 6-28 95 17 5 38-88z M143 118l17 6 28 95-17 5-38-88z"/>
  <path id="map-maos" class="body-region" d="M25 218q18-8 28 7l-8 25q-23 4-30-10z M195 218q-18-8-28 7l8 25q23 4 30-10z"/>
  <path id="map-dedos" class="body-region" d="M16 240l28 3-2 13-29-2z M204 240l-28 3 2 13 29-2z"/>
  <path id="map-perna" class="body-region" d="M72 217h34l-8 135H66z M114 217h34l6 135h-32z"/>
  <path id="map-pe" class="body-region" d="M65 350h34l5 27H55q-4-14 10-27z M122 350h34q14 13 10 27h-49z"/>
  <path id="map-costas" class="body-region" d="M280 112q30-15 60 0l14 104q-44 20-88 0z"/>
  <path class="body-region" d="M310 35a28 28 0 1 0 0 56a28 28 0 1 0 0-56z M300 90h20l5 22h-30z M279 118l-17 6-28 95 17 5 38-88z M341 118l17 6 28 95-17 5-38-88z M272 217h34l-8 135h-32z M314 217h34l6 135h-32z"/>
</svg>`}

function buildUi(){
  const x=ensureState();if(!x)return null;const a=x.accident;
  const wrap=document.createElement('div');wrap.id='accidentInjuryDetail';
  wrap.innerHTML=`
    <div class="accident-injury-title">3. Detalhamento da Lesão e Nexo Causal</div>
    <div class="accident-injury-grid">
      <div class="field"><label>Fonte Geradora</label><input type="text" data-accident-field="sourceGenerator" value="${esc(a.sourceGenerator)}" placeholder="Ex.: máquina, ferramenta, superfície, produto químico"></div>
      <div class="field"><label>Houve Nexo Causal?</label><select data-accident-field="causalNexus">${options(['Sim','Não'],a.causalNexus)}</select></div>
      <div class="field"><label>Tipo de Ferimento</label><select id="accidentInjuryType" data-accident-field="injuryTypeChoice">${options(INJURY_OPTIONS,a.injuryTypeChoice)}</select><input type="text" id="accidentInjuryTypeOther" class="form-control mt-2" data-accident-field="injuryTypeOther" value="${esc(a.injuryTypeOther)}" placeholder="Descreva o tipo de ferimento" style="display:${a.injuryTypeChoice==='Outros'?'block':'none'}"></div>
      <div class="field"><label>Parte do Corpo Atingida</label><select id="accidentBodyPart" data-accident-field="bodyPartChoice">${options(BODY_OPTIONS,a.bodyPartChoice)}</select><input type="text" id="accidentBodyPartOther" class="form-control mt-2" data-accident-field="bodyPartOther" value="${esc(a.bodyPartOther)}" placeholder="Descreva a parte do corpo" style="display:${a.bodyPartChoice==='Outros'?'block':'none'}"></div>
    </div>
    <div class="anatomy-shell"><div class="anatomy-label">Mapa anatômico — a região selecionada será destacada em vermelho</div>${anatomySvg()}</div>`;
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
  set('#accidentInjuryType',a.injuryTypeChoice);set('#accidentInjuryTypeOther',a.injuryTypeOther);
  set('#accidentBodyPart',a.bodyPartChoice);set('#accidentBodyPartOther',a.bodyPartOther);
  const injuryOther=document.getElementById('accidentInjuryTypeOther');if(injuryOther)injuryOther.style.display=a.injuryTypeChoice==='Outros'?'block':'none';
  const bodyOther=document.getElementById('accidentBodyPartOther');if(bodyOther)bodyOther.style.display=a.bodyPartChoice==='Outros'?'block':'none';
  highlightBody(a.bodyPartChoice);
}
function highlightBody(value){
  const svg=document.getElementById('accidentBodyMap');if(!svg)return;
  svg.querySelectorAll('path').forEach(p=>{p.classList.remove('active');p.style.fill='#e9ecef'});
  const id=BODY_MAP[value];if(!id)return;
  const region=document.getElementById(id);if(region){region.classList.add('active');region.style.fill='#dc3545'}
}
function syncField(el){
  const x=ensureState();if(!x||!isAccident(x)||!el?.dataset?.accidentField)return;
  x.accident[el.dataset.accidentField]=el.value;
  if(el.id==='accidentInjuryType'){
    const other=document.getElementById('accidentInjuryTypeOther');if(other)other.style.display=el.value==='Outros'?'block':'none';
    if(el.value!=='Outros'){x.accident.injuryTypeOther='';if(other)other.value=''}
  }
  if(el.id==='accidentBodyPart'){
    const other=document.getElementById('accidentBodyPartOther');if(other)other.style.display=el.value==='Outros'?'block':'none';
    if(el.value!=='Outros'){x.accident.bodyPartOther='';if(other)other.value=''}
    highlightBody(el.value);
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
  if(node==null)return'';if(typeof node==='string'||typeof node==='number')return String(node);
  if(Array.isArray(node))return node.map(textOf).join(' ');
  if(typeof node==='object'){if(node.text!=null)return textOf(node.text);if(node.stack)return textOf(node.stack);if(node.table?.body)return textOf(node.table.body)}
  return'';
}
function injectPdf(docDefinition){
  const x=ensureState();if(!isAccident(x)||!docDefinition||!Array.isArray(docDefinition.content))return docDefinition;
  if(docDefinition.__tbmAccidentInjuryInjected)return docDefinition;
  const content=docDefinition.content;
  if(content.some(node=>textOf(node).trim().toUpperCase()==='DETALHAMENTO DA LESÃO')){docDefinition.__tbmAccidentInjuryInjected=true;return docDefinition}
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
  const wrapped=function(docDefinition,...args){try{injectPdf(docDefinition)}catch(err){console.warn('[ACIDENTE LESÃO PDF]',err)}return previous.call(this,docDefinition,...args)};
  wrapped.__tbmAccidentInjury=true;wrapped.__tbmPrevious=previous;pm.createPdf=wrapped;return true;
}
function installRenderHook(){
  const previous=window.renderAccident;if(typeof previous!=='function'||previous.__tbmAccidentInjury)return;
  const wrapped=function(){const out=previous.apply(this,arguments);if(isAccident())ensureUi();return out};
  wrapped.__tbmAccidentInjury=true;wrapped.__tbmPrevious=previous;window.renderAccident=wrapped;
}
function bind(){
  if(document.documentElement.dataset.tbmAccidentInjuryEvents==='1')return;document.documentElement.dataset.tbmAccidentInjuryEvents='1';
  document.addEventListener('change',e=>{if(e.target?.closest?.('#accidentInjuryDetail'))syncField(e.target)},true);
  document.addEventListener('input',e=>{if(e.target?.closest?.('#accidentInjuryDetail'))syncField(e.target)},true);
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-type="accident"],[data-open-h]'))setTimeout(()=>{if(isAccident())ensureUi()},0)},false);
}
function install(){
  installCss();installRenderHook();bind();
  if(!installPdfHook()){let tries=0;const t=setInterval(()=>{tries++;if(installPdfHook()||tries>=20)clearInterval(t)},150)}
  if(isAccident())ensureUi();
  window.tbmRefreshAccidentInjury=()=>{if(isAccident())ensureUi()};
  window.tbmInjectAccidentInjuryPdf=injectPdf;
  window.__tbmAccidentInjuryVersion='2026.09.04.1-anatomy-map';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
