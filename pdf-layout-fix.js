(()=>{
'use strict';

function $(id){return document.getElementById(id)}
function value(id){const el=$(id);return el?String(el.value??'').trim():''}
function safe(v,fallback='Não informado'){const s=String(v??'').trim();return s||fallback}
function currentState(){try{return state||{}}catch(_){return window.state||window.appState||window.currentInspection||{}}}
function currentTypes(){try{return TYPES||{}}catch(_){return window.TYPES||{}}}

function formatDateBR(value){
  const v=String(value||'').trim();
  if(!v)return 'Não informado';
  const m=v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if(m)return `${m[3]}/${m[2]}/${m[1]}${m[4]&&m[5]?` ${m[4]}:${m[5]}`:''}`;
  const br=v.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if(br)return `${br[1]}/${br[2]}/${br[3]}${br[4]&&br[5]?` ${br[4]}:${br[5]}`:''}`;
  try{
    const d=new Date(v);
    if(Number.isNaN(d.getTime()))return v;
    const p=n=>String(n).padStart(2,'0');
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }catch{return v}
}

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

function inspectionId(st){
  const existing=String(st.id||window.currentInspectionId||'').trim();
  if(existing)return existing;
  const id='INS-'+Date.now().toString(36).toUpperCase();
  try{st.id=id}catch(_){ }
  window.currentInspectionId=id;
  return id;
}

function companyName(st){
  const c=value('company')||st.company||'';
  if(c==='Outro')return value('otherCompany')||st.otherCompany||'Outro';
  return c||'Não informado';
}
function inspectorName(st){
  const i=value('inspector')||st.inspector||'';
  if(i==='Outro')return value('inspectorOther')||st.inspectorOther||'Outro';
  return i||'Não informado';
}

function labelCell(text){return {text,bold:true,fillColor:'#f4f4f4',color:'#222',margin:[5,5,5,5]}}
function valueCell(text){return {text:safe(text),margin:[5,5,5,5]}}
function headerCell(text){return {text,bold:true,fillColor:'#e7e7e7',color:'#111',margin:[4,4,4,4]}}

window.makePdf=async function(action='download'){
  const modal=$('modal'),modalText=$('modalText');
  try{
    if(modalText)modalText.textContent='Gerando PDF profissional…';
    if(modal)modal.classList.remove('hidden');
    if(!window.pdfMake)throw new Error('Biblioteca pdfmake indisponível.');

    const st=currentState();
    const types=currentTypes();
    const id=inspectionId(st);
    const typeName=types?.[st.type]?.name||st.title||'Inspeção SST';
    const dateRaw=value('date')||st.date||'';
    const dateBR=formatDateBR(dateRaw);
    const logoBase64=await imageToDataUrl('Têxtil Bezerra de Menezes 2.jpeg');

    const content=[];

    content.push({
      columns:[
        logoBase64?{image:logoBase64,width:120,alignment:'left'}:{text:'TBM TÊXTIL',bold:true,fontSize:16,color:'#8b1018',width:120},
        {stack:[
          {text:'LAUDO DE INSPEÇÃO SST',alignment:'right',fontSize:16,bold:true,color:'#8b1018'},
          {text:typeName,alignment:'right',fontSize:10,bold:true,margin:[0,5,0,0]},
          {text:`Nº ${id}`,alignment:'right',fontSize:9,margin:[0,5,0,0]},
          {text:dateBR,alignment:'right',fontSize:9,color:'#555',margin:[0,2,0,0]}
        ]}
      ],
      columnGap:18,
      margin:[0,0,0,12]
    });

    content.push({canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:2,lineColor:'#8b1018'}],margin:[0,0,0,10]});
    content.push({text:'DADOS DA INSPEÇÃO',style:'sectionTitle'});

    const gps=st.gps?`${st.gps.lat}, ${st.gps.lng}`:'Não capturada';
    const inspectionRows=[
      [labelCell('Empresa / unidade'),valueCell(companyName(st))],
      [labelCell('CNPJ'),valueCell('07.603.776/0003-00')],
      [labelCell('Endereço'),valueCell(value('address')||st.address)],
      [labelCell('Setor / local'),valueCell(value('sector')||st.sector)],
      [labelCell('Inspetor'),valueCell(inspectorName(st))],
      [labelCell('Função'),valueCell(value('role')||st.role)],
      [labelCell('Acompanhante'),valueCell(value('witness')||st.witness)],
      [labelCell('Data da inspeção'),valueCell(dateBR)],
      [labelCell('Localização GPS'),valueCell(gps)],
      [labelCell('Nº do relatório'),valueCell(id)]
    ];
    content.push({table:{widths:['35%','65%'],body:inspectionRows},layout:{hLineColor:()=> '#cfcfcf',vLineColor:()=> '#cfcfcf',hLineWidth:()=>0.6,vLineWidth:()=>0.6,paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0}});

    const equipment=Array.isArray(st.equipment)?st.equipment:[];
    if(equipment.length){
      content.push({text:'EQUIPAMENTOS / ITENS INSPECIONADOS',style:'sectionTitle'});
      const rows=[[headerCell('Equipamento'),headerCell('Patrimônio'),headerCell('Dados / Localização'),headerCell('Situação'),headerCell('Observação')]];
      equipment.forEach((e,i)=>{
        const name=e.kind==='ext'?`Extintor #${i+1}`:e.kind==='hid'?`Hidrante #${i+1}`:e.kind==='light'?`Iluminação #${i+1}`:`Sirene / Alarme #${i+1}`;
        const detail=e.kind==='ext'?[e.tipo,e.capacidade,e.ultima?`Última inspeção: ${formatDateBR(e.ultima)}`:''].filter(Boolean).join(' • '):(e.localizacao||'Não informado');
        rows.push([safe(name),safe(e.patrimonio),safe(detail),safe(e.status),safe(e.obs)]);
      });
      content.push({table:{headerRows:1,widths:[75,65,125,75,'*'],body:rows},layout:'lightHorizontalLines',fontSize:8});
    }

    const checklistQuestions=types?.[st.type]?.checks||[];
    if(checklistQuestions.length){
      content.push({text:'CHECKLIST DE INSPEÇÃO',style:'sectionTitle'});
      const rows=[[headerCell('Item'),headerCell('Critério verificado'),headerCell('Situação')]];
      checklistQuestions.forEach((q,i)=>rows.push([String(i+1),q,st.checks?.[i]||'PENDENTE']));
      content.push({table:{headerRows:1,widths:[30,'*',95],body:rows},layout:'lightHorizontalLines',fontSize:8});
    }

    if(st.type==='accident'&&st.accident){
      const a=st.accident;
      content.push({text:'INVESTIGAÇÃO DE ACIDENTE',style:'sectionTitle'});
      content.push({table:{widths:['35%','65%'],body:[
        [labelCell('Data / hora do acidente'),valueCell(`${formatDateBR(a.eventDate)} ${safe(a.eventTime,'')}`.trim())],
        [labelCell('Local da ocorrência'),valueCell(a.eventLocation)],
        [labelCell('Tipo de evento'),valueCell(a.eventType)],
        [labelCell('Gravidade'),valueCell(a.severity)],
        [labelCell('Acidentado'),valueCell(a.victimName)],
        [labelCell('Cargo'),valueCell(a.victimRole)],
        [labelCell('Falhas identificadas'),valueCell((a.causes||[]).join(', '))]
      ]},layout:'lightHorizontalLines'});
      if((a.actions||[]).length){
        content.push({text:'Plano de ação',bold:true,margin:[0,8,0,4]});
        content.push({table:{headerRows:1,widths:['*',120,75],body:[
          [headerCell('Ação'),headerCell('Responsável'),headerCell('Prazo')],
          ...(a.actions||[]).map(x=>[safe(x.action),safe(x.responsible),formatDateBR(x.deadline)])
        ]},layout:'lightHorizontalLines',fontSize:8});
      }
    }

    content.push({text:'DIAGNÓSTICO E AÇÕES',style:'sectionTitle'});
    content.push({table:{widths:['35%','65%'],body:[
      [labelCell('Problemas / não conformidades'),valueCell(value('findings')||st.findings||'Nenhuma informação registrada.')],
      [labelCell('Soluções / ações recomendadas'),valueCell(value('actions')||st.actions||'Nenhuma informação registrada.')]
    ]},layout:'lightHorizontalLines'});

    const photos=(st.photos||[]).filter(p=>/^data:image\//i.test(p?.data||''));
    if(photos.length){
      content.push({text:'REGISTRO FOTOGRÁFICO',style:'sectionTitle'});
      const rows=[];
      for(let i=0;i<photos.length;i+=2){
        const row=[];
        for(let j=0;j<2;j++){
          const p=photos[i+j];
          row.push(p?{stack:[{image:p.data,fit:[230,165],alignment:'center'},{text:p.caption||`Foto ${i+j+1}`,fontSize:8,alignment:'center',margin:[0,4,0,8]}],margin:[4,4,4,4]}:{text:''});
        }
        rows.push(row);
      }
      content.push({table:{widths:['*','*'],body:rows},layout:'noBorders'});
    }

    const sig1=canvasData('sig1',st.signature1),sig2=canvasData('sig2',st.signature2);
    content.push({text:'ASSINATURAS',style:'sectionTitle'});
    content.push({table:{widths:['*','*'],body:[[
      {stack:[{text:'Inspetor',bold:true,alignment:'center'},sig1?{image:sig1,fit:[220,75],alignment:'center',margin:[0,8,0,4]}:{text:'Assinatura não registrada',italics:true,fontSize:8,alignment:'center',margin:[0,25,0,25]},{text:inspectorName(st),alignment:'center',fontSize:9}]},
      {stack:[{text:'Acompanhante',bold:true,alignment:'center'},sig2?{image:sig2,fit:[220,75],alignment:'center',margin:[0,8,0,4]}:{text:'Assinatura não registrada',italics:true,fontSize:8,alignment:'center',margin:[0,25,0,25]},{text:safe(value('witness')||st.witness),alignment:'center',fontSize:9}]}
    ]]},layout:'lightHorizontalLines'});

    const docDefinition={
      pageSize:'A4',
      pageMargins:[40,42,40,42],
      defaultStyle:{font:'Roboto',fontSize:9,color:'#17202b'},
      content,
      styles:{
        sectionTitle:{fontSize:10,bold:true,color:'#fff',fillColor:'#8b1018',margin:[0,12,0,6]},
        tableLabel:{bold:true,fillColor:'#f4f4f4'}
      },
      footer:(page,pages)=>({text:`Sistema Profissional de Inspeção SST • ${id} • Página ${page} de ${pages}`,alignment:'center',fontSize:7,color:'#64748b',margin:[0,15,0,0]})
    };

    const filename=`Laudo_Inspecao_${id}.pdf`;
    if(action===true)action='share';
    if(action===false)action='download';

    if(action==='share'){
      window.pdfMake.createPdf(docDefinition).getBlob(async blob=>{
        try{
          const file=new File([blob],filename,{type:'application/pdf'});
          if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
            await navigator.share({title:'Laudo de Inspeção SST',text:`Laudo ${id} • ${typeName}`,files:[file]});
          }else{
            window.pdfMake.createPdf(docDefinition).download(filename);
          }
        }catch(e){if(e?.name!=='AbortError'){console.error(e);window.pdfMake.createPdf(docDefinition).download(filename)}}
        finally{if(modal)modal.classList.add('hidden')}
      });
      return;
    }

    window.pdfMake.createPdf(docDefinition).download(filename);
  }catch(e){
    console.error('[PDFMAKE LAYOUT]',e);
    alert('Não foi possível gerar o PDF: '+(e?.message||e));
  }finally{
    if(action!=='share'&&modal)modal.classList.add('hidden');
  }
};

})();
