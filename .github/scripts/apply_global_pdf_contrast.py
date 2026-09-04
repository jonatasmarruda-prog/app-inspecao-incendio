from pathlib import Path


def patch(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if new in text:
        print(f'SKIP {path}: {label} já aplicado')
        return False
    if old not in text:
        raise SystemExit(f'ERRO: trecho não encontrado em {path}: {label}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'OK {path}: {label}')
    return True


# PT - Altura: preservar eventual evidência por item durante a normalização.
patch(
    'pt-altura.js',
    """s.checklistPT=checklistPT.map(q=>{const old=(s.checklistPT||[]).find(z=>z.id===q.id)||{};return {...q,status:['CONFORME','NÃO CONFORME','N/A'].includes(old.status)?old.status:'N/A'}});""",
    """s.checklistPT=checklistPT.map(q=>{const old=(s.checklistPT||[]).find(z=>z.id===q.id)||{};return {...q,status:['CONFORME','NÃO CONFORME','N/A'].includes(old.status)?old.status:'N/A',fotoEvidencia:String(old.fotoEvidencia||'')}});""",
    'preserva fotoEvidencia no estado PT'
)

patch(
    'pt-altura.js',
    """function checklistTable(group,title){
  const rows=[[pdfHeader('#'),pdfHeader('Item verificado'),pdfHeader('Status')]];
  ptState.checklistPT.filter(x=>x.grupo===group).forEach(x=>rows.push([String(x.n),x.item,x.status]));
  return [pdfSection(title),{table:{headerRows:1,widths:[28,'*',100],body:rows},layout:pdfGrid,fontSize:7.7}];
}""",
    """function checklistTable(group,title){
  const rows=[[pdfHeader('#'),pdfHeader('Item verificado'),pdfHeader('Status')]];
  ptState.checklistPT.filter(item=>item.grupo===group).forEach(item=>rows.push([
    String(item.n),
    item.item,
    {
      stack: [
        { text: item.status, bold: true, alignment: 'center', color: '#ffffff' },
        item.fotoEvidencia ? { image: item.fotoEvidencia, fit: [80, 80], alignment: 'center', margin: [0, 5, 0, 0] } : null
      ].filter(Boolean),
      fillColor: item.status === 'CONFORME' ? '#198754' : (item.status === 'NÃO CONFORME' ? '#dc3545' : '#6c757d'),
      margin: [0, 5, 0, 5]
    }
  ]));
  return [pdfSection(title),{table:{headerRows:1,widths:[28,'*',100],body:rows},layout:pdfGrid,fontSize:7.7}];
}""",
    'célula Premium exata do checklist PT'
)

# NR 24: célula da coluna Status / Evidência diretamente no docDefinition.
patch(
    'nr24-module.js',
    """    {
      stack: [
        { text: item.status, bold: true, alignment: 'center' },
        item.fotoEvidencia ? { image: item.fotoEvidencia, fit: [80, 80], alignment: 'center', margin: [0, 5, 0, 0] } : null
      ].filter(Boolean)
    }""",
    """    {
      stack: [
        { text: item.status, bold: true, alignment: 'center', color: '#ffffff' },
        item.fotoEvidencia ? { image: item.fotoEvidencia, fit: [80, 80], alignment: 'center', margin: [0, 5, 0, 0] } : null
      ].filter(Boolean),
      fillColor: item.status === 'CONFORME' ? '#198754' : (item.status === 'NÃO CONFORME' ? '#dc3545' : '#6c757d'),
      margin: [0, 5, 0, 5]
    }""",
    'célula Premium exata do checklist NR24'
)

# Gerador base: Extintores, Hidrantes, Segurança, NR-12, EPI e checklists genéricos.
patch(
    'pdf-layout-fix.js',
    """function headerCell(text){return {text:String(text??''),bold:true,fillColor:'#f4f4f4',fontSize:8.5,color:'#111111'}}

function sectionTitle(title){""",
    """function headerCell(text){return {text:String(text??''),bold:true,fillColor:'#f4f4f4',fontSize:8.5,color:'#111111'}}
function normalizePdfChecklistItem(value,fallback='PENDENTE'){
  if(value&&typeof value==='object'&&!Array.isArray(value)){
    return {
      ...value,
      status:String(value.status||fallback),
      fotoEvidencia:String(value.fotoEvidencia||value.evidencia||'')
    };
  }
  return {status:String(value||fallback),fotoEvidencia:''};
}
function premiumStatusCell(item){
  item=normalizePdfChecklistItem(item,'PENDENTE');
  return {
    stack: [
      { text: item.status, bold: true, alignment: 'center', color: '#ffffff' },
      item.fotoEvidencia ? { image: item.fotoEvidencia, fit: [80, 80], alignment: 'center', margin: [0, 5, 0, 0] } : null
    ].filter(Boolean),
    fillColor: item.status === 'CONFORME' ? '#198754' : (item.status === 'NÃO CONFORME' ? '#dc3545' : '#6c757d'),
    margin: [0, 5, 0, 5]
  };
}

function sectionTitle(title){""",
    'helper Premium exato no gerador base'
)

patch(
    'pdf-layout-fix.js',
    """function addChecklistTable(content,title,questions,answers){
  content.push(sectionTitle(title));
  const rows=[[headerCell('#'),headerCell('Item inspecionado'),headerCell('Status')]];
  questions.forEach((q,i)=>rows.push([String(i+1),q,answers[i]||'PENDENTE']));
  content.push({table:{headerRows:1,widths:[28,'*',115],body:rows},layout:gridLayout,fontSize:8});
}""",
    """function addChecklistTable(content,title,questions,items){
  content.push(sectionTitle(title));
  const rows=[[headerCell('#'),headerCell('Item inspecionado'),headerCell('Status')]];
  questions.forEach((q,i)=>{
    const item=normalizePdfChecklistItem(items?.[i],'PENDENTE');
    rows.push([String(i+1),q,premiumStatusCell(item)]);
  });
  content.push({table:{headerRows:1,widths:[28,'*',115],body:rows},layout:gridLayout,fontSize:8});
}""",
    'tabela Premium de Extintores/Hidrantes'
)

patch(
    'pdf-layout-fix.js',
    """    const respostasExtintor=checklistAnswers(st.checklistExtintores,perguntasExtintor.length);
    const respostasHidrante=checklistAnswers(st.checklistHidrantes,perguntasHidrante.length);
    const equipment=Array.isArray(st.equipment)?st.equipment:[];
    const checklistStatuses=st.type==='fire'?[...respostasExtintor,...respostasHidrante]:checks.map((q,i)=>st.checks?.[i]||'PENDENTE');""",
    """    const itensExtintor=perguntasExtintor.map((_,i)=>normalizePdfChecklistItem(st.checklistExtintores?.[i],'PENDENTE'));
    const itensHidrante=perguntasHidrante.map((_,i)=>normalizePdfChecklistItem(st.checklistHidrantes?.[i],'PENDENTE'));
    const respostasExtintor=itensExtintor.map(item=>item.status);
    const respostasHidrante=itensHidrante.map(item=>item.status);
    const equipment=Array.isArray(st.equipment)?st.equipment:[];
    const checklistStatuses=st.type==='fire'?[...respostasExtintor,...respostasHidrante]:checks.map((q,i)=>st.checks?.[i]||'PENDENTE');""",
    'estado completo de Extintores/Hidrantes'
)

patch(
    'pdf-layout-fix.js',
    """        rows.push([String(i+1),kind,e.patrimonio||'Não informado',data,e.status||'PENDENTE',e.obs||'']);""",
    """        rows.push([String(i+1),kind,e.patrimonio||'Não informado',data,premiumStatusCell({status:e.status||'PENDENTE',fotoEvidencia:e.fotoEvidencia||''}),e.obs||'']);""",
    'status Premium em equipamentos'
)

patch(
    'pdf-layout-fix.js',
    """      addChecklistTable(content,'Checklist de Inspeção - Extintores',perguntasExtintor,respostasExtintor);
      addChecklistTable(content,'Checklist de Inspeção - Hidrantes',perguntasHidrante,respostasHidrante);""",
    """      addChecklistTable(content,'Checklist de Inspeção - Extintores',perguntasExtintor,itensExtintor);
      addChecklistTable(content,'Checklist de Inspeção - Hidrantes',perguntasHidrante,itensHidrante);""",
    'itens completos nas tabelas de incêndio'
)

patch(
    'pdf-layout-fix.js',
    """      checks.forEach((q,i)=>rows.push([String(i+1),q,st.checks?.[i]||'PENDENTE']));""",
    """      checks.forEach((q,i)=>{
        const item={
          status:st.checks?.[i]||'PENDENTE',
          fotoEvidencia:st.checkEvidence?.[i]||st.checksEvidence?.[i]||''
        };
        rows.push([String(i+1),q,premiumStatusCell(item)]);
      });""",
    'status Premium em checklists genéricos'
)

# Auditoria textual obrigatória após o patch.
for file in ['pt-altura.js', 'nr24-module.js', 'pdf-layout-fix.js']:
    text = Path(file).read_text(encoding='utf-8')
    for token in ["color: '#ffffff'", "'#198754'", "'#dc3545'", "'#6c757d'", 'fotoEvidencia']:
        if token not in text:
            raise SystemExit(f'ERRO: token obrigatório {token} ausente em {file}')
    print('VALIDADO', file)
