(()=>{
'use strict';

const CNPJ='07.603.376/0003-00';
const LOGO='Têxtil Bezerra de Menezes 2.jpeg';
const TYPE_NAMES={fire:'Combate a Incêndio',safety:'Inspeção de Segurança',machine:'Máquinas e Equipamentos',epi:'Inspeção de EPI',accident:'Investigação de Acidente',report:'Relatório de Inspeção'};

function $(id){return document.getElementById(id)}
function value(id){const el=$(id);return el?String(el.value??'').trim():''}
function currentState(){try{return state||{}}catch(_){return window.state||window.appState||window.currentInspection||{}}}
function currentTypes(){try{return TYPES||{}}catch(_){return window.TYPES||{}}}
function val(o,...keys){for(const k of keys){if(o&&o[k]!=null&&String(o[k]).trim()!=='')return o[k]}return'—'}
function company(x){const live=value('company');const c=live||x.company||'';return c==='Outro'?(value('otherCompany')||x.otherCompany||'—'):(c||'—')}
function inspector(x){const live=value('inspector');const i=live||x.inspector||'';return i==='Outro'?(value('inspectorOther')||x.inspectorOther||'—'):(i||'—')}
function typeName(x){return TYPE_NAMES[x?.type]||x?.title||'Inspeção de Segurança'}
function checksFor(x){const types=currentTypes();return types?.[x.type]?.checks||[]}
function fmtBR(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function nowBR(){return fmtBR(new Date())}
function inspectionId(st){const id=String(st.id||window.currentInspectionId||'').trim();if(id)return id;const n='INS-'+Date.now().toString(36).toUpperCase();st.id=n;window.currentInspectionId=n;return n}

async function imageToDataUrl(src){
  if(!src)return null;
  if(/^data:image\//i.test(src))return src;
  try{
    const res=await fetch(src,{cache:'no-store'});
    if(!res.ok)throw new Error('Falha ao carregar imagem');
    const blob=await res.blob();
    return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(blob)});
  }catch(e){console.warn('[PDFMAKE] imagem ignorada:',e);return null}
}

function canvasData(id,stateValue){
  const cv=$(id);
  if(cv&&cv.width&&cv.height){
    try{
      const blank=document.createElement('canvas');blank.width=cv.width;blank.height=cv.height;
      const data=cv.toDataURL('image/png');
      if(data!==blank.toDataURL('image/png'))return data;
    }catch(_){ }
  }
  return stateValue||null;
}

const gridLayout={
  hLineWidth:()=>0.7,
  vLineWidth:()=>0.7,
  hLineColor:()=>'#dddddd',
  vLineColor:()=>'#dddddd',
  paddingLeft:()=>7,
  paddingRight:()=>7,
  paddingTop:()=>5,
  paddingBottom:()=>5
};

const sectionHeaderLayout={
  hLineWidth:()=>0.7,
  vLineWidth:()=>0.7,
  hLineColor:()=>'#dddddd',
  vLineColor:()=>'#dddddd',
  paddingLeft:()=>7,
  paddingRight:()=>7,
  paddingTop:()=>6,
  paddingBottom:()=>6
};

function labelCell(text){return {text:String(text??''),bold:true,fillColor:'#f4f4f4',fontSize:9,color:'#111111'}}
function valueCell(text){return {text:String(text==null||String(text).trim()===''?'—':text),fontSize:9,color:'#111111'}}
function headerCell(text){return {text:String(text??''),bold:true,fillColor:'#f4f4f4',fontSize:8.5,color:'#111111'}}

function sectionTitle(title){
  return {table:{widths:['*'],body:[[{text:title,bold:true,fillColor:'#f4f4f4',fontSize:11,color:'#111111'}]]},layout:sectionHeaderLayout,margin:[0,10,0,0]};
}

function twoColSection(title,rows){
  return {
    stack:[
      sectionTitle(title),
      {table:{widths:['50%','50%'],body:rows.map(([a,b])=>[labelCell(a),valueCell(b)])},layout:gridLayout}
    ],
    unbreakable:true
  };
}

function uniquePhotos(list){
  const seen=new Set();
  return (Array.isArray(list)?list:[]).filter(p=>{
    const key=String(p?.hash||p?.id||p?.data||'').trim();
    if(!key||seen.has(key))return false;
    seen.add(key);return true;
  });
}

function signatureCell(name,role,image){
  const stack=[];
  if(image)stack.push({image,fit:[190,55],alignment:'center',margin:[0,0,0,5]});
  else stack.push({text:'',margin:[0,0,0,48]});
  stack.push({canvas:[{type:'line',x1:8,y1:0,x2:230,y2:0,lineWidth:0.8,lineColor:'#222222'}],margin:[0,0,0,6]});
  stack.push({text:name||'Acompanhante',bold:true,alignment:'center',fontSize:9,color:'#111111'});
  stack.push({text:role,alignment:'center',fontSize:9,color:'#111111',margin:[0,3,0,0]});
  return {stack,margin:[5,8,5,6]};
}

window.makePdf=async function(action='download'){
  const modal=$('modal'),modalText=$('modalText');
  try{
    if(modalText)modalText.textContent='Gerando PDF profissional…';
    modal?.classList.remove('hidden');
    if(!window.pdfMake)throw new Error('Biblioteca pdfmake indisponível.');

    const st=currentState();
    const id=inspectionId(st);
    const logoBase64=await imageToDataUrl(LOGO);
    const emitido=nowBR();
    const ins=inspector(st);
    const witness=value('witness')||st.witness||'Responsável / Acompanhante';
    const role=value('role')||st.role||'Técnico de Segurança do Trabalho';
    const sig1=canvasData('sig1',st.signature1);
    const sig2=canvasData('sig2',st.signature2);
    const checks=checksFor(st);
    const equipment=Array.isArray(st.equipment)?st.equipment:[];
    const statuses=[...equipment.map(e=>e.status||'PENDENTE'),...checks.map((q,i)=>st.checks?.[i]||'PENDENTE')];
    const total=statuses.length;
    const con=statuses.filter(v=>v==='CONFORME').length;
    const nc=statuses.filter(v=>v==='NÃO CONFORME').length;
    const pend=statuses.filter(v=>v==='PENDENTE').length;

    const content=[];

    content.push({
      table:{
        widths:[55,'*',150],
        body:[[ 
          logoBase64?{image:logoBase64,fit:[50,42],alignment:'left',margin:[0,4,5,0]}:{text:'TBM',bold:true,fontSize:14,color:'#111111'},
          {stack:[
            {text:`RELATÓRIO DE INSPEÇÃO DE SEGURANÇA DO TRABALHO - ${typeName(st)}`.toUpperCase(),bold:true,fontSize:12.5,lineHeight:1.15,color:'#111111'},
            {text:'Documento técnico • Sistema Profissional SST',fontSize:9.5,color:'#111111',margin:[0,5,0,0]}
          ]},
          {stack:[
            {text:`Nº ${id}`,bold:true,alignment:'right',fontSize:9.5,color:'#111111',noWrap:true},
            {text:`Emissão: ${emitido}`,alignment:'right',fontSize:8.5,color:'#111111',margin:[0,4,0,0],noWrap:true}
          ],margin:[0,6,0,0]}
        ]]
      },
      layout:'noBorders',
      margin:[0,0,0,8]
    });
    content.push({canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:0.9,lineColor:'#222222'}],margin:[0,0,0,1]});

    content.push(twoColSection('Dados da Empresa',[
      ['Empresa / unidade',company(st)],
      ['CNPJ',CNPJ],
      ['Endereço',value('address')||val(st,'address')],
      ['Setor / local',value('sector')||val(st,'sector')],
      ['Inspetor',ins],
      ['Função',role],
      ['Acompanhante',witness],
      ['Data e hora da inspeção',fmtBR(value('date')||st.date)],
      ['Localização GPS',st.gps?`${st.gps.lat}, ${st.gps.lng} • precisão ${Math.round(st.gps.accuracy||0)} m`:'Não capturada']
    ]));

    content.push({
      table:{widths:['25%','25%','25%','25%'],body:[[
        {stack:[{text:String(total),bold:true,fontSize:13,alignment:'center'},{text:'Total',fontSize:8.5,alignment:'center'}]},
        {stack:[{text:String(con),bold:true,fontSize:13,alignment:'center'},{text:'Conformes',fontSize:8.5,alignment:'center'}]},
        {stack:[{text:String(nc),bold:true,fontSize:13,alignment:'center'},{text:'Não conformes',fontSize:8.5,alignment:'center'}]},
        {stack:[{text:String(pend),bold:true,fontSize:13,alignment:'center'},{text:'Pendentes',fontSize:8.5,alignment:'center'}]}
      ]]},
      layout:gridLayout,
      margin:[0,10,0,0]
    });

    if(equipment.length){
      content.push(sectionTitle('Equipamentos / Serviços Realizados'));
      const rows=[[headerCell('#'),headerCell('Equipamento'),headerCell('Patrimônio'),headerCell('Dados / Localização'),headerCell('Situação'),headerCell('Observações')]];
      equipment.forEach((e,i)=>{
        const kind=e.kind==='ext'?'Extintor':e.kind==='hid'?'Hidrante':e.kind==='light'?'Iluminação de Emergência':e.kind==='alarm'?'Sirene / Alarme':(e.kind||'Equipamento');
        const data=[e.tipo,e.capacidade,e.localizacao,e.ultima?`Última inspeção/recarga: ${e.ultima}`:''].filter(Boolean).join(' • ')||'Não informado';
        rows.push([String(i+1),kind,e.patrimonio||'Não informado',data,e.status||'PENDENTE',e.obs||'']);
      });
      content.push({table:{headerRows:1,widths:[20,70,65,145,75,'*'],body:rows},layout:gridLayout,fontSize:7.5});
    }

    if(checks.length){
      content.push(sectionTitle('Diagnóstico / Checklist'));
      const rows=[[headerCell('#'),headerCell('Item inspecionado'),headerCell('Status')]];
      checks.forEach((q,i)=>rows.push([String(i+1),q,st.checks?.[i]||'PENDENTE']));
      content.push({table:{headerRows:1,widths:[28,'*',115],body:rows},layout:gridLayout,fontSize:8});
    }

    if(st.type==='accident'&&st.accident){
      const a=st.accident;
      content.push(twoColSection('Investigação de acidente',[
        ['Data do acidente',a.eventDate||'—'],['Hora',a.eventTime||'—'],['Local / setor',a.eventLocation||'—'],['Supervisor',a.supervisor||'—'],['Tipo de evento',a.eventType||'—'],['Gravidade',a.severity||'—'],['Classe',a.class||'—'],['Acidentado',a.victimName||'—'],['Cargo',a.victimRole||'—'],['CAT',a.cat||'—'],['Tempo de empresa',a.companyTime||'—'],['Tempo de função',a.functionTime||'—'],['Data do ASO',a.asoDate||'—'],['Falhas identificadas',Array.isArray(a.causes)&&a.causes.length?a.causes.join(', '):'Nenhuma falha classificada.']
      ]));
      content.push(sectionTitle('Plano de ação'));
      const ar=[[headerCell('#'),headerCell('Ação'),headerCell('Responsável'),headerCell('Prazo')]];
      (a.actions||[]).forEach((z,i)=>ar.push([String(i+1),z.action||'',z.responsible||'',z.deadline||'']));
      if(!(a.actions||[]).length)ar.push(['','','Nenhuma ação registrada.','']);
      content.push({table:{headerRows:1,widths:[25,'*',130,80],body:ar},layout:gridLayout,fontSize:8});
    }

    content.push(twoColSection('Diagnóstico e Recomendações',[
      ['Não conformidades / achados',value('findings')||val(st,'findings')],
      ['Ações / recomendações',value('actions')||val(st,'actions')]
    ]));

    const photos=uniquePhotos(st.photos);
    if(photos.length){
      content.push(sectionTitle('Registro Fotográfico'));
      const rows=[];
      for(let i=0;i<photos.length;i+=2){
        const row=[];
        for(let j=0;j<2;j++){
          const p=photos[i+j];
          row.push(p?{stack:[
            {image:p.data,fit:[230,155],alignment:'center',margin:[3,3,3,3]},
            {text:`Foto ${i+j+1} — ${p.caption||'Registro fotográfico'}`,fontSize:8,alignment:'center',margin:[0,3,0,4]}
          ]}:{text:''});
        }
        rows.push(row);
      }
      content.push({table:{widths:['*','*'],body:rows},layout:{hLineWidth:()=>0,vLineWidth:()=>0,paddingLeft:()=>4,paddingRight:()=>4,paddingTop:()=>5,paddingBottom:()=>5},margin:[0,0,0,0]});
    }

    content.push(sectionTitle('Assinaturas e Responsabilidades'));
    content.push({
      table:{widths:['*','*'],body:[[
        signatureCell(ins,role,sig1),
        signatureCell(witness,'Responsável pela Área / Acompanhante',sig2)
      ]]},
      layout:'noBorders',
      margin:[0,0,0,8]
    });

    content.push({canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:0.7,lineColor:'#cccccc'}],margin:[0,2,0,8]});
    content.push({text:`Documento eletrônico emitido pelo Sistema Profissional de Inspeção SST • ID ${id}`,alignment:'center',fontSize:7.8,color:'#222222',margin:[0,0,0,14]});
    content.push({canvas:[{type:'line',x1:170,y1:0,x2:345,y2:0,lineWidth:0.7,lineColor:'#222222'}],margin:[0,0,0,5]});
    content.push({text:'Técnico de Segurança do Trabalho',alignment:'center',fontSize:8,color:'#111111'});
    content.push({text:`Relatório gerado em ${emitido}`,alignment:'center',fontSize:8,color:'#111111',margin:[0,3,0,0]});

    const docDefinition={
      pageSize:'A4',
      pageMargins:[42,42,42,42],
      defaultStyle:{font:'Roboto',fontSize:9,color:'#111111',lineHeight:1.25},
      content
    };

    const filename=`Laudo_Inspecao_${id}.pdf`;
    if(action===true)action='share';
    if(action===false)action='download';

    if(action==='share'){
      window.pdfMake.createPdf(docDefinition).getBlob(async blob=>{
        try{
          const file=new File([blob],filename,{type:'application/pdf'});
          if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
            await navigator.share({title:'Relatório de Inspeção SST',text:`Relatório ${id} • ${typeName(st)}`,files:[file]});
          }else window.pdfMake.createPdf(docDefinition).download(filename);
        }catch(e){if(e?.name!=='AbortError'){console.error(e);window.pdfMake.createPdf(docDefinition).download(filename)}}
        finally{modal?.classList.add('hidden')}
      });
      return;
    }

    window.pdfMake.createPdf(docDefinition).download(filename);
  }catch(e){
    console.error('[PDFMAKE HTML ESPELHO]',e);
    alert('Não foi possível gerar o PDF: '+(e?.message||e));
  }finally{
    if(action!=='share')modal?.classList.add('hidden');
  }
};

})();