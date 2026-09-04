(()=>{
'use strict';

const FLAG='__tbmNR24ModuleV1';
if(window[FLAG])return;window[FLAG]=true;

const TYPE='nr24';
const TYPE_LABEL='Inspeção NR 24 (Sanitários e Vivência)';
const PDF_TITLE='INSPEÇÃO DE SEGURANÇA DO TRABALHO - NR 24';
const ISSUER_NAME='Jonatas Marques de Arruda';
const ISSUER_ROLE='Coordenador / Técnico de Segurança do Trabalho';
const CNPJ='07.603.376/0003-00';

const CATEGORIES=[
  {name:'INSTALAÇÕES SANITÁRIAS',items:[
    'As instalações sanitárias são separadas por sexo?',
    'As instalações são mantidas limpas e sem odores durante toda a jornada?',
    'Possuem paredes revestidas com material impermeável e lavável?',
    'Possuem pisos de material impermeável, lavável e liso?',
    'Dispõem de água canalizada e esgotos com sifões hidráulicos?',
    'Possuem iluminação de, no mínimo, 100 lux?',
    'Não se comunicam com locais de trabalho ou refeições?',
    'Possuem fiação elétrica protegida por eletroduto?',
    'Os gabinetes sanitários são instalados em compartimentos individuais?',
    'Os gabinetes possuem portas com fecho que impeçam devassamento?',
    'Os gabinetes são ventilados para o exterior?',
    'Os gabinetes possuem recipientes com tampa para papéis?',
    'Os vasos sanitários possuem descarga?',
    'Os lavatórios obedecem a relação mínima de 1 para cada 20 funcionários?',
    'Há material de secagem das mãos (proibido toalhas coletivas)?',
    'Os chuveiros possuem portas que impeçam devassamento?',
    'Os chuveiros possuem piso e paredes de material resistente, liso e impermeável?',
    'Os chuveiros obedecem a relação mínima de 1 para cada 10 funcionários?',
    'Os mictórios são providos de aparelho de descarga?',
    'Os mictórios são de fácil escoamento e limpeza?'
  ]}
];
const ITEMS=[];
let number=1;
CATEGORIES.forEach((cat,ci)=>cat.items.forEach(text=>ITEMS.push({id:number++,category:cat.name,categoryIndex:ci,text})));
window.checklistNR24=ITEMS.map(x=>({...x}));
window.checklistNR24Categorias=CATEGORIES.map(x=>({name:x.name,items:[...x.items]}));

function st(){try{return state}catch(_){return window.state||null}}
function h(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function fmt(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}
function companyName(x){return x.company==='Outro'?(x.otherCompany||'Outro'):(x.company||'TBM Têxtil')}
function inspectorName(x){return x.inspector==='Outro'?(x.inspectorOther||ISSUER_NAME):(x.inspector||ISSUER_NAME)}
function statusClass(v){return v==='CONFORME'?'ok':v==='NÃO CONFORME'?'no':'na'}
function schedule(){try{if(typeof scheduleSave==='function')scheduleSave()}catch(_){ }}

function ensureState(x=st()){
  if(!x||x.type!==TYPE)return x;
  const old=Array.isArray(x.checklistNR24)?x.checklistNR24:[];
  x.checklistNR24=ITEMS.map((def,i)=>{
    const prev=old.find(v=>Number(v?.id)===def.id)||old[i]||{};
    const legacy=x.checks?.[i];
    const status=['CONFORME','NÃO CONFORME','N/A'].includes(prev.status)?prev.status:(['CONFORME','NÃO CONFORME','N/A'].includes(legacy)?legacy:'N/A');
    return {...def,pergunta:def.text,status,fotoEvidencia:String(prev.fotoEvidencia||'')};
  });
  x.checks=x.checks&&typeof x.checks==='object'?x.checks:{};
  x.checklistNR24.forEach((item,i)=>{x.checks[i]=item.status});
  x.nr24Gender=String(x.nr24Gender||x.generoInstalacao||'');
  x.inspector=ISSUER_NAME;
  x.inspectorOther='';
  x.role=ISSUER_ROLE;
  x.title=TYPE_LABEL;
  return x;
}

function installCss(){
  if(document.getElementById('tbm-nr24-style'))return;
  const s=document.createElement('style');s.id='tbm-nr24-style';s.textContent=`
  .nr24-tile{background:linear-gradient(145deg,#334155,#0f766e)!important}
  #tbmInspectionTypeField{margin:16px 0 12px;padding:12px;border:1px solid #d8dee7;border-radius:14px;background:#f8fafc}
  #tbmInspectionTypeField label{display:block;font-size:12px;font-weight:900;margin-bottom:7px}
  #tbmInspectionTypeField select{width:100%;border:1px solid #d8dee7;border-radius:10px;padding:12px;background:#fff;color:#17202b;font-weight:800}
  .nr24-category{border:1px solid #d9e0e8;border-radius:14px;overflow:hidden;margin:12px 0;background:#fff}
  .nr24-category-title{padding:10px 12px;background:#f1f4f7;font-size:12px;font-weight:900;letter-spacing:.2px}
  .nr24-row{padding:12px;border-top:1px solid #e5e7eb}
  .nr24-row:first-of-type{border-top:0}
  .nr24-question{font-size:12px;font-weight:900;line-height:1.4;margin-bottom:9px}
  .nr24-statuses{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
  .nr24-statuses button{padding:10px 6px;border-radius:9px;background:#e9edf2;color:#17202b;font-size:11px;font-weight:900}
  .nr24-statuses button.ok{background:#dcfce7;color:#166534}
  .nr24-statuses button.no{background:#fee2e2;color:#991b1b}
  .nr24-statuses button.na{background:#e2e8f0;color:#334155}
  .nr24-evidence{display:none;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px;padding:9px;border:1px dashed #fecaca;border-radius:10px;background:#fff7f7}
  .nr24-evidence.show{display:flex}
  .nr24-evidence-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 11px;border-radius:9px;background:#b91c1c;color:#fff;font-size:11px;font-weight:900;cursor:pointer}
  .nr24-evidence-btn input{display:none!important}
  .nr24-thumb{display:none;width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #d1d5db;background:#fff}
  .nr24-thumb.show{display:block}
  @media(max-width:600px){.nr24-statuses{grid-template-columns:1fr}.nr24-statuses button{min-height:42px}}
  `;document.head.appendChild(s);
}

function installSelector(){
  const tiles=document.querySelector('#home .tiles');if(!tiles)return;
  if(!document.getElementById('inspectionTypeSelect')){
    const box=document.createElement('div');box.id='tbmInspectionTypeField';box.className='field';
    box.innerHTML=`<label for="inspectionTypeSelect">Tipo de inspeção</label><select id="inspectionTypeSelect"><option value="">Selecione uma inspeção</option><option value="fire">Combate a Incêndio</option><option value="safety">Inspeção de Segurança</option><option value="machine">Máquinas e Equipamentos • NR-12</option><option value="epi">Inspeção de EPI</option><option value="accident">Investigação de Acidente</option><option value="report">Relatório de Inspeção</option><option value="nr24">${TYPE_LABEL}</option></select>`;
    tiles.parentNode.insertBefore(box,tiles);
    box.querySelector('select').addEventListener('change',e=>{const type=e.target.value;if(!type)return;try{window.openNew(type)}finally{e.target.value=''}});
  }
  if(!tiles.querySelector('[data-type="nr24"]')){
    const b=document.createElement('button');b.type='button';b.className='tile nr24-tile';b.dataset.type='nr24';b.innerHTML='<div class="ico">🚻</div><div><b>Inspeção NR 24</b><span>Sanitários e Vivência</span></div>';
    b.addEventListener('click',()=>window.openNew(TYPE));tiles.appendChild(b);
  }
}

function installGenderField(){
  if(document.getElementById('nr24GenderBox'))return;
  const sector=document.getElementById('sector')?.closest('.field');
  const grid=sector?.parentElement;if(!grid)return;
  const field=document.createElement('div');field.className='field hidden';field.id='nr24GenderBox';
  field.innerHTML='<label for="nr24Gender">Gênero da Instalação *</label><select id="nr24Gender" required><option value="">Selecione</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Uso Comum / N/A">Uso Comum / N/A</option></select>';
  sector.insertAdjacentElement('afterend',field);
  field.querySelector('select').addEventListener('change',e=>{const x=ensureState();if(!x)return;x.nr24Gender=e.target.value;schedule()});
}

function renderNR24Checklist(){
  const x=ensureState();if(!x)return;
  const root=document.getElementById('checklist');if(!root)return;
  let start=0;
  root.innerHTML=CATEGORIES.map(cat=>{
    const body=cat.items.map(()=>{
      const item=x.checklistNR24[start++];
      const selected=statusClass(item.status);
      const show=item.status==='NÃO CONFORME';
      return `<div class="nr24-row" data-nr24-row="${item.id}"><div class="nr24-question">${item.id}. ${h(item.text)}</div><div class="nr24-statuses">${['CONFORME','NÃO CONFORME','N/A'].map(v=>`<button type="button" data-nr24-status="${h(v)}" data-nr24-index="${item.id-1}" class="${item.status===v?statusClass(v):''}">${h(v)}</button>`).join('')}</div><div class="nr24-evidence ${show?'show':''}" data-nr24-evidence-box="${item.id-1}"><label class="nr24-evidence-btn">📸 Anexar Evidência<input type="file" accept="image/*" capture="environment" data-nr24-evidence="${item.id-1}"></label><img class="nr24-thumb ${item.fotoEvidencia?'show':''}" data-nr24-thumb="${item.id-1}" ${item.fotoEvidencia?`src="${item.fotoEvidencia}"`:''} alt="Evidência do item ${item.id}"></div></div>`;
    }).join('');
    return `<div class="nr24-category"><div class="nr24-category-title">${h(cat.name)}</div>${body}</div>`;
  }).join('');
}

async function compressEvidence(file){
  if(!file||!String(file.type||'').startsWith('image/'))throw new Error('Selecione uma imagem válida.');
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('Falha ao ler a imagem.'));r.readAsDataURL(file)});
  const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Não foi possível processar a imagem.'));im.src=data});
  const max=1200;let w=img.naturalWidth||img.width,hg=img.naturalHeight||img.height;
  if(!w||!hg)throw new Error('Imagem inválida.');
  const scale=Math.min(1,max/Math.max(w,hg));w=Math.max(1,Math.round(w*scale));hg=Math.max(1,Math.round(hg*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=hg;const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(img,0,0,w,hg);
  return canvas.toDataURL('image/jpeg',0.7);
}

function refreshRow(index){
  const x=ensureState(),item=x?.checklistNR24?.[index];if(!item)return;
  const row=document.querySelector(`[data-nr24-row="${index+1}"]`);if(!row)return;
  row.querySelectorAll('[data-nr24-status]').forEach(btn=>{btn.className=item.status===btn.dataset.nr24Status?statusClass(item.status):''});
  const box=row.querySelector('[data-nr24-evidence-box]');box?.classList.toggle('show',item.status==='NÃO CONFORME');
  const thumb=row.querySelector('[data-nr24-thumb]');if(thumb){if(item.fotoEvidencia){thumb.src=item.fotoEvidencia;thumb.classList.add('show')}else{thumb.removeAttribute('src');thumb.classList.remove('show')}}
}

function bindNR24Events(){
  if(document.documentElement.dataset.tbmNr24Events==='1')return;document.documentElement.dataset.tbmNr24Events='1';
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-nr24-status]');if(!btn)return;
    const x=ensureState();if(!x||x.type!==TYPE)return;
    e.preventDefault();
    const i=Number(btn.dataset.nr24Index),item=x.checklistNR24[i];if(!item)return;
    item.status=btn.dataset.nr24Status;
    x.checks[i]=item.status;
    if(item.status!=='NÃO CONFORME')item.fotoEvidencia='';
    refreshRow(i);schedule();
  },false);
  document.addEventListener('change',async e=>{
    const input=e.target.closest?.('[data-nr24-evidence]');if(!input)return;
    const x=ensureState();if(!x||x.type!==TYPE)return;
    const i=Number(input.dataset.nr24Evidence),item=x.checklistNR24[i];if(!item||item.status!=='NÃO CONFORME'){input.value='';return}
    const file=input.files?.[0];if(!file)return;
    try{item.fotoEvidencia=await compressEvidence(file);refreshRow(i);schedule()}catch(err){console.error('[NR24 EVIDÊNCIA]',err);try{notice(err.message||'Falha ao anexar evidência.','error')}catch(_){alert(err.message||'Falha ao anexar evidência.')}}finally{input.value=''}
  },false);
}

function installType(){
  try{
    if(typeof TYPES==='object'&&TYPES&&!TYPES[TYPE])TYPES[TYPE]={name:TYPE_LABEL,icon:'🚻',checks:ITEMS.map(x=>x.text)};
  }catch(e){console.error('[NR24] TYPES indisponível',e)}
}

function installRenderHooks(){
  const previousChecklist=window.renderChecklist;
  if(typeof previousChecklist==='function'&&!previousChecklist.__tbmNr24){
    const wrapped=function(){const x=st();if(x?.type===TYPE){renderNR24Checklist();return}return previousChecklist.apply(this,arguments)};wrapped.__tbmNr24=true;window.renderChecklist=wrapped;
  }
  const previousRenderForm=window.renderForm;
  if(typeof previousRenderForm==='function'&&!previousRenderForm.__tbmNr24){
    const wrapped=function(){const x=st();if(x?.type===TYPE)ensureState(x);const out=previousRenderForm.apply(this,arguments);const current=st();const isNR=current?.type===TYPE;const box=document.getElementById('nr24GenderBox');box?.classList.toggle('hidden',!isNR);const sel=document.getElementById('nr24Gender');if(sel&&isNR)sel.value=current.nr24Gender||'';const inspector=document.getElementById('inspector'),role=document.getElementById('role');if(inspector)inspector.disabled=isNR;if(role){role.disabled=isNR;if(isNR)role.value=ISSUER_ROLE}if(isNR){document.getElementById('checklistCard')?.classList.remove('hidden');const title=document.getElementById('formTitle');if(title)title.textContent='🚻 '+TYPE_LABEL}return out};wrapped.__tbmNr24=true;window.renderForm=wrapped;
  }
  const previousNormalize=window.normalize;
  if(typeof previousNormalize==='function'&&!previousNormalize.__tbmNr24){
    const wrapped=function(){const out=previousNormalize.apply(this,arguments);const x=st();if(x?.type===TYPE){ensureState(x);x.nr24Gender=document.getElementById('nr24Gender')?.value||x.nr24Gender||'';x.inspector=ISSUER_NAME;x.role=ISSUER_ROLE;x.checklistNR24.forEach((item,i)=>{x.checks[i]=item.status})}return out};wrapped.__tbmNr24=true;window.normalize=wrapped;
  }
  const previousSave=window.saveInspection;
  if(typeof previousSave==='function'&&!previousSave.__tbmNr24){
    const wrapped=async function(silent=false){const x=st();if(x?.type===TYPE){ensureState(x);x.nr24Gender=document.getElementById('nr24Gender')?.value||x.nr24Gender||'';if(!x.nr24Gender){if(silent)return false;try{notice('Selecione o Gênero da Instalação.','error')}catch(_){ }throw new Error('Selecione o Gênero da Instalação.')}}return await previousSave.apply(this,arguments)};wrapped.__tbmNr24=true;window.saveInspection=wrapped;
  }
}

function reportHTMLNR24(x){
  ensureState(x);
  const cats=CATEGORIES.map(cat=>{const rows=x.checklistNR24.filter(i=>i.category===cat.name).map(item=>`<tr><td>${item.id}</td><td>${h(item.text)}</td><td><b>${h(item.status)}</b>${item.fotoEvidencia?`<div style="margin-top:6px"><img src="${item.fotoEvidencia}" style="width:70px;height:70px;object-fit:contain;border:1px solid #d1d5db;border-radius:4px"></div>`:''}</td></tr>`).join('');return `<div class="rsection"><div class="rtitle">${h(cat.name)}</div><table class="rtable"><tr><th>Item</th><th>Critério verificado</th><th>Situação / Evidência</th></tr>${rows}</table></div>`}).join('');
  const photos=(x.photos||[]).length?`<div class="rsection"><div class="rtitle">Registro fotográfico</div><div class="rphotos">${x.photos.map((p,i)=>`<figure><img src="${p.data}"><figcaption>Foto ${i+1} • ${h(p.caption||'Registro fotográfico')}</figcaption></figure>`).join('')}</div></div>`:'';
  return `<div class="reportPage"><div class="reportHeader"><img class="reportLogo" src="icon.svg"><div><h1>${PDF_TITLE}</h1><p><b>${TYPE_LABEL}</b></p><p>TBM Têxtil • Sistema Profissional SST</p></div><div class="reportNo"><b>Nº ${h(x.id||'SEM-ID')}</b><br>Em: ${h(fmt(x.date))}</div></div><div class="rsection"><div class="rtitle">Dados da Inspeção</div><div class="rgrid"><div class="rfield"><div class="rlabel">Empresa / unidade</div><div class="rvalue">${h(companyName(x))}</div></div><div class="rfield"><div class="rlabel">CNPJ</div><div class="rvalue">${CNPJ}</div></div><div class="rfield"><div class="rlabel">Local / setor</div><div class="rvalue">${h(x.sector||'Não informado')}</div></div><div class="rfield"><div class="rlabel">Gênero da Instalação</div><div class="rvalue">${h(x.nr24Gender||'Não informado')}</div></div><div class="rfield"><div class="rlabel">Inspetor</div><div class="rvalue">${ISSUER_NAME}</div></div><div class="rfield"><div class="rlabel">Função</div><div class="rvalue">${ISSUER_ROLE}</div></div></div></div>${cats}${photos}<div class="rsection"><div class="rtitle">Diagnóstico e ações</div><div class="rfield"><div class="rlabel">Problemas / não conformidades</div><div class="rvalue">${h(x.findings||'Nenhuma informação registrada.')}</div></div><div class="rfield"><div class="rlabel">Soluções / ações recomendadas</div><div class="rvalue">${h(x.actions||'Nenhuma informação registrada.')}</div></div></div><div class="footer">${ISSUER_NAME} - ${ISSUER_ROLE}<br>Documento gerado pelo Sistema Profissional de Inspeção SST • ${h(x.id||'SEM-ID')}</div></div>`;
}

function installReportHook(){
  const previous=window.showReport;if(typeof previous!=='function'||previous.__tbmNr24)return;
  const wrapped=function(x){if(x?.type!==TYPE)return previous.apply(this,arguments);ensureState(x);try{state=x}catch(_){window.state=x}const el=document.getElementById('reportContent');if(el)el.innerHTML=reportHTMLNR24(x);try{show('report')}catch(_){document.getElementById('report')?.classList.remove('hidden');document.getElementById('history')?.classList.add('hidden')}return x};wrapped.__tbmNr24=true;window.showReport=wrapped;
}

let logoSvgPromise=null;
async function logoSvg(){
  if(!logoSvgPromise)logoSvgPromise=fetch('./icon.svg?nr24=1',{cache:'force-cache'}).then(r=>r.ok?r.text():'').catch(()=> '');
  return logoSvgPromise;
}
function tableLayout(){return{hLineColor:()=> '#cfd6df',vLineColor:()=> '#cfd6df',hLineWidth:()=>.6,vLineWidth:()=>.6,paddingLeft:()=>6,paddingRight:()=>6,paddingTop:()=>5,paddingBottom:()=>5}}
function compactChecklistLayout(){return{hLineColor:()=> '#cfd6df',vLineColor:()=> '#cfd6df',hLineWidth:()=>.6,vLineWidth:()=>.6,paddingLeft:()=>5,paddingRight:()=>5,paddingTop:()=>3,paddingBottom:()=>3}}
function categoryPdf(cat,x){
  const rows=x.checklistNR24.filter(i=>i.category===cat.name).map((item,index)=>[
    { text: index + 1, alignment: 'center' },
    { text: item.pergunta, alignment: 'justify' },
    {
      stack: [
        { text: item.status, bold: true, alignment: 'center' },
        item.fotoEvidencia ? { image: item.fotoEvidencia, fit: [80, 80], alignment: 'center', margin: [0, 5, 0, 0] } : null
      ].filter(Boolean)
    }
  ]);
  return [{text:cat.name,bold:true,fontSize:10,fillColor:'#f4f4f4',margin:[0,8,0,5]},{table:{headerRows:1,widths:['auto','*',120],body:[[{text:'Item',bold:true,fillColor:'#eeeeee',alignment:'center'},{text:'Critério Verificado',bold:true,fillColor:'#eeeeee'},{text:'Status / Evidência',bold:true,fillColor:'#eeeeee',alignment:'center'}],...rows],dontBreakRows:true},layout:compactChecklistLayout(),fontSize:8.3,margin:[0,0,0,6]}];
}
function photoGridPdf(x){
  const photos=(x.photos||[]).filter(p=>p?.data);if(!photos.length)return[];
  const cells=photos.map((p,i)=>({stack:[{image:p.data,fit:[250,250],alignment:'center'},{text:`Foto ${i+1} • ${p.caption||'Registro fotográfico'}`,fontSize:7.5,alignment:'center',margin:[0,4,0,0]}],margin:[2,4,2,6]}));
  const rows=[];for(let i=0;i<cells.length;i+=2)rows.push([cells[i],cells[i+1]||{text:''}]);
  return [{text:'REGISTRO FOTOGRÁFICO',bold:true,fontSize:10,fillColor:'#f4f4f4',margin:[0,10,0,5]},{table:{widths:['*','*'],body:rows},layout:'noBorders'}];
}
async function buildDocDefinition(x){
  ensureState(x);const svg=await logoSvg();
  const total=x.checklistNR24.length,ok=x.checklistNR24.filter(i=>i.status==='CONFORME').length,bad=x.checklistNR24.filter(i=>i.status==='NÃO CONFORME').length,na=x.checklistNR24.filter(i=>i.status==='N/A').length;
  const headerLeft=svg?{svg,fit:[72,48],alignment:'left'}:{text:'TBM',bold:true,fontSize:18,color:'#8b1018'};
  const content=[
    {table:{widths:[82,'*',125],body:[[headerLeft,{stack:[{ text: 'INSPEÇÃO DE SEGURANÇA DO TRABALHO - NR 24', style: 'header', alignment: 'center', bold: true, fontSize: 16 },{text:TYPE_LABEL,bold:true,fontSize:9,alignment:'center',margin:[0,3,0,0]},{text:'Documento técnico • Sistema Profissional SST',fontSize:7.5,color:'#64748b',alignment:'center',margin:[0,2,0,0]}]},{stack:[{text:`Nº ${x.id||'SEM-ID'}`,bold:true,fontSize:8,alignment:'right'},{text:`Emissão: ${fmt(x.date)}`,fontSize:7,alignment:'right',margin:[0,3,0,0]}]}]]},layout:'noBorders',margin:[0,0,0,6]},
    {canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:1.4,lineColor:'#8b1018'}],margin:[0,0,0,8]},
    {text:'DADOS DA INSPEÇÃO',bold:true,fontSize:10,fillColor:'#f4f4f4',margin:[0,0,0,5]},
    {table:{widths:[125,'*'],body:[
      [{text:'Empresa / unidade',bold:true,fillColor:'#f4f4f4'},companyName(x)],
      [{text:'CNPJ',bold:true,fillColor:'#f4f4f4'},CNPJ],
      [{text:'Endereço',bold:true,fillColor:'#f4f4f4'},x.address||'Não informado'],
      [{text:'Local / setor',bold:true,fillColor:'#f4f4f4'},x.sector||'Não informado'],
      [{text:'Gênero da Instalação',bold:true,fillColor:'#f4f4f4'},x.nr24Gender||'Não informado'],
      [{text:'Inspetor',bold:true,fillColor:'#f4f4f4'},ISSUER_NAME],
      [{text:'Função',bold:true,fillColor:'#f4f4f4'},ISSUER_ROLE],
      [{text:'Acompanhante',bold:true,fillColor:'#f4f4f4'},x.witness||'Não informado'],
      [{text:'Data / hora',bold:true,fillColor:'#f4f4f4'},fmt(x.date)],
      [{text:'Localização GPS',bold:true,fillColor:'#f4f4f4'},x.gps?`${x.gps.lat}, ${x.gps.lng}`:'Não capturada']
    ]},layout:tableLayout(),fontSize:8.5,margin:[0,0,0,8]},
    {text:'RESUMO DE CONFORMIDADE',bold:true,fontSize:10,fillColor:'#f4f4f4',margin:[0,4,0,5]},
    {table:{widths:['*','*','*','*'],body:[[{text:'Total',bold:true,fillColor:'#eeeeee'},{text:'Conformes',bold:true,fillColor:'#eeeeee'},{text:'Não conformes',bold:true,fillColor:'#eeeeee'},{text:'N/A',bold:true,fillColor:'#eeeeee'}],[String(total),String(ok),String(bad),String(na)]]},layout:tableLayout(),fontSize:8.5,margin:[0,0,0,6]}
  ];
  CATEGORIES.forEach(cat=>content.push(...categoryPdf(cat,x)));
  content.push(...photoGridPdf(x));
  content.push({text:'DIAGNÓSTICO E AÇÕES',bold:true,fontSize:10,fillColor:'#f4f4f4',margin:[0,10,0,5]},{table:{widths:['100%'],body:[[{text:'Problemas / não conformidades encontradas',bold:true,fillColor:'#f4f4f4'}],[{text:x.findings||'Nenhuma informação registrada.',margin:[0,3,0,8]}],[{text:'Soluções / ações recomendadas',bold:true,fillColor:'#f4f4f4'}],[{text:x.actions||'Nenhuma informação registrada.',margin:[0,3,0,8]}]]},layout:tableLayout(),fontSize:8.5});
  const sig=[];if(x.signature1)sig.push({image:x.signature1,fit:[220,70],alignment:'center',margin:[0,8,0,2]});
  sig.push({text:ISSUER_NAME,bold:true,alignment:'center',fontSize:9,margin:[0,8,0,0]},{text:ISSUER_ROLE,alignment:'center',fontSize:8});
  content.push({text:'RESPONSÁVEL TÉCNICO',bold:true,fontSize:10,fillColor:'#f4f4f4',margin:[0,10,0,5]},{stack:sig,margin:[0,0,0,10]});
  return {
    pageSize:'A4',pageMargins:[40,42,40,72],defaultStyle:{font:'Roboto',fontSize:9,color:'#17202b'},styles:{header:{fontSize:16,bold:true}},content,
    footer:(currentPage,pageCount)=>({margin:[40,0,40,16],stack:[{canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:.6,lineColor:'#cbd5e1'}]},{text:`${ISSUER_NAME} - ${ISSUER_ROLE}`,bold:true,fontSize:7.5,alignment:'center',margin:[0,5,0,0]},{text:`Documento eletrônico emitido pelo Sistema Profissional de Inspeção SST • ID ${x.id||'SEM-ID'} • Página ${currentPage}/${pageCount}`,fontSize:6.5,color:'#64748b',alignment:'center',margin:[0,2,0,0]}]}),
    info:{title:PDF_TITLE,subject:TYPE_LABEL,author:ISSUER_NAME,creator:'Sistema Profissional SST'}
  };
}

async function makeNR24Pdf(action='download'){
  const x=ensureState();if(!x)throw new Error('Inspeção NR 24 não encontrada.');
  if(!x.nr24Gender)throw new Error('Selecione o Gênero da Instalação antes de gerar o PDF.');
  if(!window.pdfMake?.createPdf)throw new Error('Biblioteca pdfmake indisponível.');
  const docDefinition=await buildDocDefinition(x);
  const filename=`Laudo_NR24_${x.id||'SEM-ID'}.pdf`;
  if(action===true)action='share';if(action===false)action='download';
  if(action==='share'){
    return await new Promise(resolve=>window.pdfMake.createPdf(docDefinition).getBlob(async blob=>{
      try{const file=new File([blob],filename,{type:'application/pdf'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({title:PDF_TITLE,text:`${TYPE_LABEL} • ${x.id||''}`,files:[file]});else window.pdfMake.createPdf(docDefinition).download(filename)}catch(e){if(e?.name!=='AbortError')window.pdfMake.createPdf(docDefinition).download(filename)}finally{resolve()}
    }));
  }
  window.pdfMake.createPdf(docDefinition).download(filename);
}

function installPdfHook(){
  const previous=window.makePdf;if(typeof previous!=='function'||previous.__tbmNr24)return;
  const wrapped=async function(action='download'){const x=st();if(x?.type===TYPE)return await makeNR24Pdf(action);return await previous.apply(this,arguments)};wrapped.__tbmNr24=true;wrapped.__tbmPrevious=previous;window.makePdf=wrapped;
  window.makeNR24Pdf=makeNR24Pdf;window.tbmBuildNR24DocDefinition=buildDocDefinition;
}

function install(){
  installCss();installType();installSelector();installGenderField();bindNR24Events();installRenderHooks();installReportHook();installPdfHook();
  try{window.tbmInstallMobilePdfPerformance?.()}catch(_){ }
  window.dispatchEvent(new CustomEvent('tbm-nr24-ready',{detail:{items:ITEMS.length,categories:CATEGORIES.length}}));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.__tbmNR24Version='2026.09.04.2-compact-pdf';
})();