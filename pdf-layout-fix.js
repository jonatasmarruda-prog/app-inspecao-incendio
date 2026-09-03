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
function companyName(st){const c=value('company')||st.company||'';return c==='Outro'?(value('otherCompany')||st.otherCompany||'Outro'):(c||'Não informado')}
function inspectorName(st){const i=value('inspector')||st.inspector||'';return i==='Outro'?(value('inspectorOther')||st.inspectorOther||'Outro'):(i||'Não informado')}

const borderedLayout={
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
        ...rows.map(([label,val])=>[
          {text:safe(label,''),bold:true},
          {text:safe(val)}
        ])
      ]
    },
    layout:borderedLayout,
    margin:[0,8,0,10]
  };
}

function signatureBox(role,name,image){
  return {
    stack:[
      image?{image,fit:[200,70],alignment:'center',margin:[8,4,8,12]}:{text:'',margin:[0,28,0,22]},
      {
        table:{widths:['*'],body:[[
          {text:safe(name),bold:true,alignment:'center',border:[false,true,false,false],margin:[0,6,0,0]}
        ]]},
        layout:{hLineColor:()=>'#777777',vLineWidth:()=>0,paddingLeft:()=>8,paddingRight:()=>8,paddingTop:()=>2,paddingBottom:()=>2}
      },
      {text:role,alignment:'center',fontSize:8,color:'#555555',margin:[0,2,0,0]}
    ]
  };
}

window.makePdf=async function(action='download'){
  const modal=$('modal'),modalText=$('modalText');
  try{
    if(modalText)modalText.textContent='Gerando PDF profissional…';
    modal?.classList.remove('hidden');
    if(!window.pdfMake)throw new Error('Biblioteca pdfmake indisponível.');

    const st=currentState();
    const types=currentTypes();
    const id=inspectionId(st);
    const typeName=types?.[st.type]?.name||st.title||'Inspeção SST';
    const dateRaw=value('date')||st.date||'';
    const dateBR=formatDateBR(dateRaw);
    const logoBase64=await imageToDataUrl('Têxtil Bezerra de Menezes 2.jpeg');
    const sig1=canvasData('sig1',st.signature1);
    const sig2=canvasData('sig2',st.signature2);
    const witness=value('witness')||st.witness;

    const content=[];

    content.push({
      table:{
        widths:['20%','55%','25%'],
        body:[[ 
          logoBase64?{image:logoBase64,fit:[80,80],alignment:'left',margin:[0,0,8,0]}:{text:'TBM TÊXTIL',bold:true,color:'#8b1018'},
          {stack:[
            {text:'RELATÓRIO DE INSPEÇÃO DE SEGURANÇA DO TRABALHO',bold:true,alignment:'center',fontSize:13},
            {text:typeName,bold:true,alignment:'center',fontSize:9,margin:[0,5,0,0]},
            {text:'TBM Têxtil • Sistema Profissional SST',alignment:'center',fontSize:8,color:'#555555',margin:[0,3,0,0]}
          ],margin:[0,8,0,0]},
          {text:`Nº ${id}\nEmissão: ${dateBR}`,alignment:'right',fontSize:10,margin:[0,8,0,0]}
        ]]
      },
      layout:'noBorders',
      margin:[0,0,0,6]
    });

    content.push({canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:1.5,lineColor:'#777777'}],margin:[0,0,0,8]});

    content.push(sectionTable('DADOS DA EMPRESA',[
      ['Empresa / unidade',companyName(st)],
      ['CNPJ','07.603.776/0003-00'],
      ['Endereço',value('address')||st.address]
    ]));

    content.push(sectionTable('DADOS DA INSPEÇÃO',[
      ['Setor / local',value('sector')||st.sector],
      ['Inspetor',inspectorName(st)],
      ['Função',value('role')||st.role],
      ['Acompanhante',witness],
      ['Data da inspeção',dateBR],
      ['Localização GPS',st.gps?`${st.gps.lat}, ${st.gps.lng}`:'Não capturada'],
      ['Nº do relatório',id]
    ]));

    const equipment=Array.isArray(st.equipment)?st.equipment:[];
    if(equipment.length){
      content.push(sectionTable('EQUIPAMENTOS / ITENS INSPECIONADOS',equipment.map((e,i)=>{
        const name=e.kind==='ext'?`Extintor #${i+1}`:e.kind==='hid'?`Hidrante #${i+1}`:e.kind==='light'?`Iluminação de Emergência #${i+1}`:`Sirene / Alarme #${i+1}`;
        const detail=e.kind==='ext'?[e.tipo,e.capacidade,e.ultima?`Última inspeção / recarga: ${formatDateBR(e.ultima)}`:''].filter(Boolean).join(' • '):(e.localizacao||'Não informado');
        return [name,`${safe(e.status,'PENDENTE')}\nPatrimônio: ${safe(e.patrimonio)}\n${detail}${String(e.obs||'').trim()?`\nObservação: ${e.obs}`:''}`];
      })));
    }

    const checklistQuestions=types?.[st.type]?.checks||[];
    if(checklistQuestions.length){
      content.push(sectionTable('CHECKLIST DE INSPEÇÃO',checklistQuestions.map((q,i)=>[
        `${i+1}. ${q}`,
        st.checks?.[i]||'PENDENTE'
      ])));
    }

    if(st.type==='accident'&&st.accident){
      const a=st.accident;
      content.push(sectionTable('INVESTIGAÇÃO DE ACIDENTE',[
        ['Data do Acidente',formatDateBR(a.eventDate)],
        ['Hora do Acidente',a.eventTime],
        ['Local / Setor Exato da Ocorrência',a.eventLocation],
        ['Supervisor Imediato do Setor',a.supervisor],
        ['Tipo de Evento',a.eventType],
        ['Gravidade',a.severity],
        ['Classe',a.class],
        ['Nome do Acidentado',a.victimName],
        ['Cargo',a.victimRole],
        ['Nº CAT',a.cat],
        ['Tempo de Empresa',a.companyTime],
        ['Tempo de Função',a.functionTime],
        ['Data do ASO',formatDateBR(a.asoDate)],
        ['Falhas identificadas',(a.causes||[]).join(', ')]
      ]));
      if((a.actions||[]).length){
        content.push(sectionTable('PLANO DE AÇÃO',(a.actions||[]).map((x,i)=>[
          `Ação #${i+1}`,
          `${safe(x.action)}\nResponsável: ${safe(x.responsible)}\nPrazo: ${formatDateBR(x.deadline)}`
        ])));
      }
    }

    content.push(sectionTable('DIAGNÓSTICO E AÇÕES',[
      ['Problemas / não conformidades',value('findings')||st.findings||'Nenhuma informação registrada.'],
      ['Soluções / ações recomendadas',value('actions')||st.actions||'Nenhuma informação registrada.']
    ]));

    const photos=(st.photos||[]).filter(p=>/^data:image\//i.test(p?.data||''));
    if(photos.length){
      const rows=[];
      for(let i=0;i<photos.length;i+=2){
        const row=[];
        for(let j=0;j<2;j++){
          const p=photos[i+j];
          row.push(p?{stack:[{image:p.data,fit:[230,165],alignment:'center'},{text:p.caption||`Foto ${i+j+1}`,fontSize:8,alignment:'center',margin:[0,4,0,8]}]}:{text:''});
        }
        rows.push(row);
      }
      content.push({
        stack:[
          {table:{widths:['*'],body:[[{text:'REGISTRO FOTOGRÁFICO',bold:true,fillColor:'#f4f4f4'}]]},layout:borderedLayout},
          {table:{widths:['*','*'],body:rows},layout:'noBorders',margin:[0,6,0,8]}
        ],
        margin:[0,8,0,10]
      });
    }

    content.push({
      stack:[
        {table:{widths:['*'],body:[[{text:'ASSINATURAS E RESPONSABILIDADES',bold:true,fillColor:'#f4f4f4'}]]},layout:borderedLayout},
        {table:{widths:['*','*'],body:[[
          signatureBox('Inspetor',inspectorName(st),sig1),
          signatureBox('Acompanhante',witness||'Assinatura não informada',sig2)
        ]]},layout:'noBorders',margin:[0,12,0,4]}
      ],
      margin:[0,8,0,0]
    });

    const docDefinition={
      pageSize:'A4',
      pageMargins:[40,40,40,40],
      defaultStyle:{font:'Roboto',fontSize:9,color:'#222222'},
      content,
      footer:(page,pages)=>({text:`Sistema Profissional de Inspeção SST • ${id} • Página ${page} de ${pages}`,alignment:'center',fontSize:7,color:'#777777',margin:[0,12,0,0]})
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
          }else window.pdfMake.createPdf(docDefinition).download(filename);
        }catch(e){if(e?.name!=='AbortError'){console.error(e);window.pdfMake.createPdf(docDefinition).download(filename)}}
        finally{modal?.classList.add('hidden')}
      });
      return;
    }

    window.pdfMake.createPdf(docDefinition).download(filename);
  }catch(e){
    console.error('[PDFMAKE HTML MIRROR]',e);
    alert('Não foi possível gerar o PDF: '+(e?.message||e));
  }finally{
    if(action!=='share')modal?.classList.add('hidden');
  }
};

})();
