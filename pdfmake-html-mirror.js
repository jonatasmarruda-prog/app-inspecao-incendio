(()=>{
'use strict';

const $=id=>document.getElementById(id);
const text=v=>String(v??'').trim();
const nz=(v,f='Não informado')=>text(v)||f;

function stateRef(){
  try{if(typeof state!=='undefined'&&state)return state}catch(_){ }
  return window.state||window.appState||window.currentInspection||{};
}

function formatDateBR(value){
  const raw=text(value);
  if(!raw)return 'Não informado';
  const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s)?(\d{2})?:?(\d{2})?/);
  if(m)return `${m[3]}/${m[2]}/${m[1]}${m[4]?` ${m[4]}:${m[5]||'00'}`:''}`;
  try{
    const d=new Date(raw);
    if(Number.isNaN(d.getTime()))return raw;
    return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',','');
  }catch{return raw}
}

async function toDataUrl(src){
  if(!src)return null;
  if(/^data:image\//i.test(src))return src;
  try{
    const r=await fetch(src,{cache:'no-store'});
    if(!r.ok)throw new Error('Falha ao carregar imagem');
    const b=await r.blob();
    return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(b)});
  }catch(e){console.warn('[PDFMAKE] imagem ignorada',e);return null}
}

function canvasData(id,fallback){
  const c=$(id);
  if(!c)return fallback||null;
  try{
    const d=c.toDataURL('image/png');
    const blank=document.createElement('canvas');blank.width=c.width;blank.height=c.height;
    return d!==blank.toDataURL('image/png')?d:(fallback||null);
  }catch{return fallback||null}
}

const gridLayout={
  hLineWidth:()=>1,
  vLineWidth:()=>1,
  hLineColor:()=>'#dddddd',
  vLineColor:()=>'#dddddd',
  paddingLeft:()=>8,
  paddingRight:()=>8,
  paddingTop:()=>5,
  paddingBottom:()=>5
};

function sectionTable(title,rows){
  return {
    table:{
      widths:['30%','70%'],
      body:[
        [{text:title,bold:true,fillColor:'#f4f4f4',colSpan:2},{}],
        ...rows.map(([label,value])=>[
          {text:nz(label,''),bold:true},
          {text:nz(value)}
        ])
      ]
    },
    layout:gridLayout,
    margin:[0,8,0,10]
  };
}

function checklistTable(st){
  const checks=(window.TYPES?.[st.type]?.checks||[]);
  if(!checks.length)return null;
  return {
    table:{
      widths:['30%','70%'],
      body:[
        [{text:'CHECKLIST DE INSPEÇÃO',bold:true,fillColor:'#f4f4f4',colSpan:2},{}],
        ...checks.map((q,i)=>[
          {text:`${i+1}. ${q}`,bold:true},
          {text:nz(st.checks?.[i],'PENDENTE')}
        ])
      ]
    },
    layout:gridLayout,
    margin:[0,8,0,10]
  };
}

function equipmentTable(st){
  const eq=Array.isArray(st.equipment)?st.equipment:[];
  if(!eq.length)return null;
  const rows=[];
  eq.forEach((e,i)=>{
    const name=e.kind==='ext'?`Extintor #${i+1}`:e.kind==='hid'?`Hidrante #${i+1}`:e.kind==='light'?`Iluminação de Emergência #${i+1}`:`Sirene / Alarme #${i+1}`;
    const details=e.kind==='ext'?[e.tipo,e.capacidade,e.ultima?`Última inspeção / recarga: ${formatDateBR(e.ultima)}`:''].filter(Boolean).join(' • '):(e.localizacao||'Não informado');
    rows.push([name,`${nz(e.status,'PENDENTE')}\nPatrimônio: ${nz(e.patrimonio)}\n${details}${text(e.obs)?`\nObservação: ${e.obs}`:''}`]);
  });
  return sectionTable('EQUIPAMENTOS',rows);
}

function accidentTables(st){
  if(st.type!=='accident'||!st.accident)return [];
  const a=st.accident;
  const out=[sectionTable('INVESTIGAÇÃO DE ACIDENTE',[
    ['Data do Acidente',formatDateBR(a.eventDate)],
    ['Hora do Acidente',nz(a.eventTime)],
    ['Local / Setor Exato da Ocorrência',nz(a.eventLocation)],
    ['Supervisor Imediato do Setor',nz(a.supervisor)],
    ['Tipo de Evento',nz(a.eventType)],
    ['Gravidade',nz(a.severity)],
    ['Classe',nz(a.class)],
    ['Nome do Acidentado',nz(a.victimName)],
    ['Cargo',nz(a.victimRole)],
    ['Nº CAT',nz(a.cat)],
    ['Tempo de Empresa',nz(a.companyTime)],
    ['Tempo de Função',nz(a.functionTime)],
    ['Data do ASO',formatDateBR(a.asoDate)],
    ['Falhas identificadas',nz((a.causes||[]).join(', '))]
  ])];
  if((a.actions||[]).length){
    const body=[[{text:'PLANO DE AÇÃO',bold:true,fillColor:'#f4f4f4',colSpan:2},{}]];
    (a.actions||[]).forEach((x,i)=>body.push([
      {text:`Ação #${i+1}`,bold:true},
      {text:`${nz(x.action)}\nResponsável: ${nz(x.responsible)}\nPrazo: ${formatDateBR(x.deadline)}`}
    ]));
    out.push({table:{widths:['30%','70%'],body},layout:gridLayout,margin:[0,8,0,10]});
  }
  return out;
}

function photoSection(st){
  const photos=(st.photos||[]).filter(p=>/^data:image\//i.test(p.data||''));
  if(!photos.length)return null;
  const rows=[];
  for(let i=0;i<photos.length;i+=2){
    const cells=[];
    for(let j=0;j<2;j++){
      const p=photos[i+j];
      cells.push(p?{stack:[{image:p.data,fit:[235,160],alignment:'center'},{text:nz(p.caption,`Foto ${i+j+1}`),alignment:'center',fontSize:8,margin:[0,4,0,2]}]}:{text:''});
    }
    rows.push(cells);
  }
  return {
    stack:[
      {table:{widths:['*'],body:[[{text:'REGISTRO FOTOGRÁFICO',bold:true,fillColor:'#f4f4f4'}]]},layout:gridLayout},
      {table:{widths:['*','*'],body:rows},layout:'noBorders',margin:[0,6,0,8]}
    ],
    margin:[0,8,0,10]
  };
}

function signatureBox(label,name,image){
  return {
    stack:[
      image?{image,fit:[200,70],alignment:'center',margin:[8,4,8,10]}:{text:'',margin:[0,28,0,20]},
      {table:{widths:['*'],body:[[{text:nz(name),bold:true,alignment:'center',border:[false,true,false,false],margin:[0,6,0,0]}]]},layout:{hLineColor:()=>'#777777',vLineWidth:()=>0,paddingLeft:()=>8,paddingRight:()=>8,paddingTop:()=>2,paddingBottom:()=>2}},
      {text:label,alignment:'center',fontSize:8,color:'#555555',margin:[0,2,0,0]}
    ]
  };
}

async function buildDocDefinition(){
  const st=stateRef();
  const gv=id=>text($(id)?.value);
  const company=(gv('company')==='Outro'?(gv('otherCompany')||st.otherCompany):gv('company'))||st.company;
  const inspector=(gv('inspector')==='Outro'?(gv('inspectorOther')||st.inspectorOther):gv('inspector'))||st.inspector;
  const witness=gv('witness')||st.witness;
  const dateRaw=gv('date')||st.date;
  const logo=await toDataUrl('Têxtil Bezerra de Menezes 2.jpeg');
  const sig1=canvasData('sig1',st.signature1);
  const sig2=canvasData('sig2',st.signature2);
  const typeName=window.TYPES?.[st.type]?.name||st.title||'Inspeção SST';

  const header={
    table:{
      widths:['20%','55%','25%'],
      body:[[ 
        logo?{image:logo,fit:[80,80],alignment:'left',margin:[0,0,8,0]}:{text:'TBM TÊXTIL',bold:true,color:'#8b1018'},
        {stack:[{text:'RELATÓRIO DE INSPEÇÃO DE SEGURANÇA DO TRABALHO',bold:true,alignment:'center',fontSize:13},{text:typeName,bold:true,alignment:'center',fontSize:9,margin:[0,5,0,0]},{text:'TBM Têxtil • Sistema Profissional SST',alignment:'center',fontSize:8,color:'#555555',margin:[0,3,0,0]}],margin:[0,8,0,0]},
        {text:`Nº ${nz(st.id,'INS-')}\nEmissão: ${formatDateBR(dateRaw)}`,alignment:'right',fontSize:10,bold:false,margin:[0,8,0,0]}
      ]]
    },
    layout:'noBorders',
    margin:[0,0,0,6]
  };

  const content=[
    header,
    {canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:1.5,lineColor:'#777777'}],margin:[0,0,0,8]},
    sectionTable('DADOS DA EMPRESA',[
      ['Empresa / unidade',nz(company)],
      ['CNPJ','07.603.776/0003-00'],
      ['Endereço',nz(gv('address')||st.address)]
    ]),
    sectionTable('DADOS DA INSPEÇÃO',[
      ['Setor / local',nz(gv('sector')||st.sector)],
      ['Inspetor',nz(inspector)],
      ['Função',nz(gv('role')||st.role)],
      ['Acompanhante',nz(witness)],
      ['Data da inspeção',formatDateBR(dateRaw)],
      ['Localização GPS',st.gps?`${st.gps.lat}, ${st.gps.lng}`:'Não capturada']
    ])
  ];

  const eq=equipmentTable(st);if(eq)content.push(eq);
  const ck=checklistTable(st);if(ck)content.push(ck);
  accidentTables(st).forEach(x=>content.push(x));
  content.push(sectionTable('DIAGNÓSTICO E AÇÕES',[
    ['Problemas / não conformidades',nz(gv('findings')||st.findings,'Nenhuma informação registrada.')],
    ['Soluções / ações recomendadas',nz(gv('actions')||st.actions,'Nenhuma informação registrada.')]
  ]));
  const ph=photoSection(st);if(ph)content.push(ph);
  content.push({
    stack:[
      {table:{widths:['*'],body:[[{text:'ASSINATURAS E RESPONSABILIDADES',bold:true,fillColor:'#f4f4f4'}]]},layout:gridLayout},
      {table:{widths:['*','*'],body:[[signatureBox('Inspetor',inspector,sig1),signatureBox('Acompanhante',witness||'Assinatura não informada',sig2)]]},layout:'noBorders',margin:[0,12,0,4]}
    ],
    margin:[0,8,0,0]
  });

  return {
    pageSize:'A4',
    pageMargins:[40,40,40,40],
    defaultStyle:{font:'Roboto',fontSize:9,color:'#222222'},
    content,
    footer:(currentPage,pageCount)=>({text:`Sistema Profissional de Inspeção SST • ${nz(st.id,'')} • Página ${currentPage} de ${pageCount}`,alignment:'center',fontSize:7,color:'#777777',margin:[0,12,0,0]})
  };
}

async function makePdfMirror(action='download'){
  const modal=$('modal'),modalText=$('modalText');
  try{
    if(modalText)modalText.textContent='Gerando PDF profissional…';
    modal?.classList.remove('hidden');
    if(!window.pdfMake)throw new Error('Biblioteca pdfmake indisponível.');
    const st=stateRef();
    try{if(typeof normalize==='function')normalize()}catch(_){ }
    try{if(st.type==='accident'&&typeof syncAccidentActions==='function')syncAccidentActions()}catch(_){ }
    const doc=await buildDocDefinition();
    const filename=`Laudo_Inspecao_${nz(st.id,'SST').replace(/[^A-Za-z0-9_-]/g,'_')}.pdf`;
    const act=action===true?'share':action===false?'download':action;
    if(act==='share'){
      window.pdfMake.createPdf(doc).getBlob(async blob=>{
        try{
          const file=new File([blob],filename,{type:'application/pdf'});
          if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({title:'Laudo de Inspeção SST',text:`Laudo ${nz(st.id,'')}`,files:[file]});
          else window.pdfMake.createPdf(doc).download(filename);
        }catch(e){if(e?.name!=='AbortError')window.pdfMake.createPdf(doc).download(filename)}
        finally{modal?.classList.add('hidden')}
      });
      return;
    }
    window.pdfMake.createPdf(doc).download(filename);
  }catch(e){console.error('[PDFMAKE HTML MIRROR]',e);alert('Não foi possível gerar o PDF: '+(e?.message||e))}
  finally{if(action!=='share'&&action!==true)modal?.classList.add('hidden')}
}

window.makePdf=makePdfMirror;
window.gerarPDFMaster=makePdfMirror;
window.exportarPDFMaster=makePdfMirror;
window.gerarRelatorioPDF=makePdfMirror;

function bind(){
  const b1=$('reportPdf'),b2=$('reportShare'),b3=$('pdf');
  if(b1){b1.textContent='📥 Baixar PDF';b1.onclick=e=>{e.preventDefault();makePdfMirror('download')}}
  if(b2){b2.textContent='📲 Compartilhar PDF';b2.onclick=e=>{e.preventDefault();makePdfMirror('share')}}
  if(b3){b3.onclick=async e=>{e.preventDefault();try{if(typeof saveInspection==='function')await saveInspection(true);if(typeof showReport==='function')showReport(stateRef())}catch(_){ }setTimeout(()=>makePdfMirror('share'),100)}}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
