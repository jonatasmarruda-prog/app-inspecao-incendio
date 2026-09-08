from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def replace_once(text, old, new, label):
    require(old in text, f'{label}: trecho não encontrado')
    return text.replace(old, new, 1)


# PT -------------------------------------------------------------------------
path='pt-altura.js'
s=read(path)
s=replace_once(s,
    "description:'',workLocation:'',sector:'',date:d.toISOString().slice(0,10),startTime:'',endTime:'',",
    "description:'',preventiveMeasures:'',workLocation:'',sector:'',date:d.toISOString().slice(0,10),startTime:'',endTime:'',",
    'PT state preventiveMeasures')
s=replace_once(s,
    "s.epiOutro=s.epiOutro||'';s.meioAcessoOutro=s.meioAcessoOutro||'';",
    "s.epiOutro=s.epiOutro||'';s.meioAcessoOutro=s.meioAcessoOutro||'';s.preventiveMeasures=String(s.preventiveMeasures||'');",
    'PT normalize preventiveMeasures')

needle='<div class="card"><div class="sectionTitle">Trabalhadores Autorizados / Executantes</div>'
require(needle in s, 'PT card workers não encontrado')
preventive_card='''<div class="card"><div class="sectionTitle">Medidas Preventivas</div><div class="field"><label>Medidas Preventivas</label><textarea data-pt-field="preventiveMeasures" placeholder="Descreva as medidas preventivas e controles necessários antes e durante a execução">${esc(ptState.preventiveMeasures||'')}</textarea></div></div>\n\n    '''
s=s.replace(needle, preventive_card+needle, 1)

s=re.sub(
    r"function scheduleSavePT\(\)\{.*?\n\}",
    "function scheduleSavePT(){\n  clearTimeout(saveTimerPT);\n  saveTimerPT=setTimeout(()=>savePT(false,false),900);\n}",
    s, count=1, flags=re.S)

s=replace_once(s,
    "if(syncCloud)pushPTCloud().catch(()=>{});\n    if(feedback)showMsg('✅ PT salva com sucesso.');",
    "if(feedback&&typeof window.tbmHistoricoSalvar==='function')await window.tbmHistoricoSalvar(ptState,{source:'pt',reportType:PT_TITLE});\n    if(feedback)showMsg('✅ PT salva no dispositivo e adicionada ao histórico.');",
    'PT save local history')

needle="checklistTable('final','Checklist - Liberação e Encerramento').forEach(x=>content.push(x));\n\n  content.push(pdfSection('Trabalhadores Autorizados / Executantes'));"
replacement="checklistTable('final','Checklist - Liberação e Encerramento').forEach(x=>content.push(x));\n\n  content.push(pdfSection('Medidas Preventivas'));\n  content.push({table:{widths:['*'],body:[[{text:ptState.preventiveMeasures||'Não informado.',margin:[2,7,2,7]}]]},layout:pdfGrid,fontSize:8.7});\n\n  content.push(pdfSection('Trabalhadores Autorizados / Executantes'));"
s=replace_once(s,needle,replacement,'PT PDF preventive measures')

share_pattern=r"  if\(action==='share'\)\{\n    window\.pdfMake\.createPdf\(doc\)\.getBlob\(async blob=>\{.*?\n    \}\);\n  \}else window\.pdfMake\.createPdf\(doc\)\.download\(filename\);"
share_replacement="""  if(action==='share'){
    if(typeof window.tbmCompartilharPdf==='function')return await window.tbmCompartilharPdf(doc,filename,{title:'PT - Trabalho em Altura',text:`Permissão de Trabalho ${ptState.id}`});
    alert('O compartilhamento direto não está disponível neste dispositivo. O PDF será baixado automaticamente.');
    window.pdfMake.createPdf(doc).download(filename);return;
  }
  window.pdfMake.createPdf(doc).download(filename);"""
s,n=re.subn(share_pattern,share_replacement,s,count=1,flags=re.S)
require(n==1,'PT share block não encontrado')
s=s.replace("window.__tbmPTAlturaVersion='2026.09.04.pt-altura.4-sign-evidence';","window.__tbmPTAlturaVersion='2026.09.08.pt-altura.5-preventive-local-history';",1)
write(path,s)


# INDEX ----------------------------------------------------------------------
path='index.html'
s=read(path)
old="await idbPut(state);if(window.tbmPushCloud)window.tbmPushCloud('main-save').catch(()=>{});if(!silent)notice('Inspeção salva com sucesso.','success')"
new="await idbPut(state);if(!silent&&typeof window.tbmHistoricoSalvar==='function')await window.tbmHistoricoSalvar(state,{source:'main'});if(!silent)notice('Inspeção salva no dispositivo e adicionada ao histórico.','success')"
s=replace_once(s,old,new,'index manual save')

share_pattern=r"if\(action==='share'\)\{\n window\.pdfMake\.createPdf\(docDefinition\)\.getBlob\(async blob=>\{.*?\n \}\);\n return;\n\}"
share_replacement="""if(action==='share'){
 try{
   if(typeof window.tbmCompartilharPdf==='function')await window.tbmCompartilharPdf(docDefinition,filename,{title:'Laudo de Inspeção SST',text:'Laudo '+state.id+' • '+typeName});
   else{alert('O compartilhamento direto não está disponível neste dispositivo. O PDF será baixado automaticamente.');window.pdfMake.createPdf(docDefinition).download(filename)}
 }catch(e){console.error('[COMPARTILHAR PDF]',e);alert('Não foi possível compartilhar diretamente. O PDF será baixado automaticamente.');window.pdfMake.createPdf(docDefinition).download(filename)}
 finally{$('modal').classList.add('hidden')}
 return;
}"""
s,n=re.subn(share_pattern,share_replacement,s,count=1,flags=re.S)
require(n==1,'index share block não encontrado')
s=s.replace('Salvamento local automático • sincronização Firebase quando disponível','Salvamento local automático • histórico no dispositivo',1)
s=s.replace("(async()=>{try{await initDB();await firebaseStart()}catch(e){console.error(e);$('cloudState').textContent='● Local'}})();","(async()=>{try{await initDB();$('cloudState').textContent='● Local'}catch(e){console.error(e);$('cloudState').textContent='● Local'}})();",1)
s=s.replace('./sst-repair-loader.js?v=20260904-24','./sst-repair-loader.js?v=20260908-01',1)
write(path,s)


# NR24 -----------------------------------------------------------------------
path='nr24-module.js'
s=read(path)
share_pattern=r"  if\(action==='share'\)\{\n    return await new Promise\(resolve=>window\.pdfMake\.createPdf\(docDefinition\)\.getBlob\(async blob=>\{.*?\n    \}\)\);\n  \}"
share_replacement="""  if(action==='share'){
    if(typeof window.tbmCompartilharPdf==='function')return await window.tbmCompartilharPdf(docDefinition,filename,{title:PDF_TITLE,text:`${TYPE_LABEL} • ${x.id||''}`});
    alert('O compartilhamento direto não está disponível neste dispositivo. O PDF será baixado automaticamente.');
    window.pdfMake.createPdf(docDefinition).download(filename);return;
  }"""
s,n=re.subn(share_pattern,share_replacement,s,count=1,flags=re.S)
require(n==1,'NR24 share block não encontrado')
s=s.replace("window.__tbmNR24Version='2026.09.04.2-compact-pdf';","window.__tbmNR24Version='2026.09.08.3-share-fallback-local';",1)
write(path,s)


# TRAINING -------------------------------------------------------------------
path='training-attendance-refinement.js'
s=read(path)
share_pattern=r"  if\(action==='share'\)\{\n    return await new Promise\(resolve=>window\.pdfMake\.createPdf\(docDefinition\)\.getBlob\(async blob=>\{.*?\n    \}\)\);\n  \}"
share_replacement="""  if(action==='share'){
    if(typeof window.tbmCompartilharPdf==='function')return await window.tbmCompartilharPdf(docDefinition,filename,{title:PDF_TITLE,text:x.trainingAttendance.theme||TYPE_LABEL});
    alert('O compartilhamento direto não está disponível neste dispositivo. O PDF será baixado automaticamente.');
    window.pdfMake.createPdf(docDefinition).download(filename);return;
  }"""
s,n=re.subn(share_pattern,share_replacement,s,count=1,flags=re.S)
require(n==1,'Training share block não encontrado')
s=s.replace("window.__tbmTrainingAttendanceRefinementVersion='2026.09.04.1';","window.__tbmTrainingAttendanceRefinementVersion='2026.09.08.2-share-fallback-local';",1)
write(path,s)


# LOADER ---------------------------------------------------------------------
path='sst-repair-loader.js'
s=read(path)
anchor="function loadPdfFilenameGlobal(){const old=document.getElementById('tbm-pdf-filename-global');if(old)old.remove();const s=document.createElement('script');s.id='tbm-pdf-filename-global';s.src='./pdf-filename-global.js?v=20260903-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}\n"
require(anchor in s,'loader pdf filename anchor não encontrado')
if 'function loadLocalHistory()' not in s:
    s=s.replace(anchor,anchor+"function loadLocalHistory(){const old=document.getElementById('tbm-local-history');if(old)old.remove();const s=document.createElement('script');s.id='tbm-local-history';s.src='./local-history.js?v=20260908-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}\n",1)
s=s.replace("  await loadSaveButtonFix();\n  await loadCnpjAutofill();","  await loadSaveButtonFix();\n  await loadLocalHistory();\n  await loadCnpjAutofill();",1)
s=s.replace("  await loadPdfFilenameGlobal();\n  await loadAutoEmailReport();","  await loadPdfFilenameGlobal();\n  // E-mail automático desativado nesta fase: o botão Salvar persiste o histórico local.",1)
s=s.replace("  setTimeout(loadCloudCrossDevice,0);","  // Sincronização cross-device não é iniciada nesta fase; histórico oficial permanece no localStorage.",1)
s=s.replace("./pt-altura.js?v=20260903-03&cb=","./pt-altura.js?v=20260908-05&cb=",1)
s=s.replace("./nr24-module.js?v=20260904-01&cb=","./nr24-module.js?v=20260908-03&cb=",1)
s=s.replace("./training-attendance-refinement.js?v=20260904-01&cb=","./training-attendance-refinement.js?v=20260908-02&cb=",1)
require('await loadLocalHistory();' in s,'loader local history não ativado')
require('await loadAutoEmailReport();' not in s,'loader ainda ativa email automático')
require('setTimeout(loadCloudCrossDevice,0);' not in s,'loader ainda ativa cloud cross-device')
write(path,s)


# SERVICE WORKER -------------------------------------------------------------
for path in ('service-worker.js','sw.js'):
    s=read(path)
    s=s.replace('inspecao-sst-v85','inspecao-sst-v86')
    if "'./local-history.js'" not in s:
        s=s.replace("'./premium.js','./integracao-modulos.js'","'./premium.js','./integracao-modulos.js','./local-history.js'",1)
    s=s.replace("?v=85","?v=86")
    require('inspecao-sst-v86' in s and "'./local-history.js'" in s,f'{path} cache não atualizado')
    write(path,s)

# Trigger is one-shot.
Path('APPLY_LOCAL_HISTORY_FIX.txt').unlink(missing_ok=True)
print('PATCH_LOCAL_HISTORY_APLICADO')
