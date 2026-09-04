(()=>{
'use strict';

/* Nome corporativo global e obrigatório para TODOS os PDFs do sistema. */
const TIPOS=Object.freeze({
  fire:'INSPECAO EQUIPAMENTOS COMBATE INCENDIO',
  extintor:'INSPECAO EQUIPAMENTOS COMBATE INCENDIO',
  hidrante:'INSPECAO EQUIPAMENTOS COMBATE INCENDIO',
  safety:'INSPECAO SEGURANCA',
  seg:'INSPECAO SEGURANCA',
  machine:'INSPECAO MAQUINAS EQUIPAMENTOS NR12',
  epi:'INSPECAO EPI',
  accident:'INVESTIGACAO ACIDENTE',
  report:'RELATORIO INSPECAO',
  'pt-altura':'PERMISSAO TRABALHO ALTURA',
  'pt_altura':'PERMISSAO TRABALHO ALTURA',
  nr24:'INSPECAO NR24',
  'nr-24':'INSPECAO NR24',
  sanitarios:'INSPECAO NR24',
  banheiros:'INSPECAO NR24',
  'training-attendance':'LISTA PRESENCA TREINAMENTO SST',
  treinamento:'LISTA PRESENCA TREINAMENTO SST'
});

function semAcentos(v){
  return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function normalizar(v){return semAcentos(v).toLowerCase().trim()}
function visivel(el){return !!el&&!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none'}

function estadoAtual(){
  try{if(typeof state!=='undefined'&&state)return state}catch(_){ }
  return window.state||window.appState||window.currentInspection||{};
}

function contextoAtual(){
  const st=estadoAtual()||{};
  const pt=document.getElementById('ptAlturaOverlay');
  if(visivel(pt))return {...st,type:'pt-altura',title:'PT - Trabalho em Altura'};

  const nr24=document.querySelector('#nr24Overlay,#nr24Modal,[data-module="nr24"].active,[data-type="nr24"].active');
  if(visivel(nr24))return {...st,type:'nr24',title:'NR 24'};

  const titulos=['#sstBody h1','#formTitle','#reportTitle','#nr24Title','[data-report-title]'];
  let title=st.title||st.nome||st.name||'';
  for(const seletor of titulos){
    const el=document.querySelector(seletor);
    if(el&&visivel(el)&&String(el.textContent||'').trim()){title=String(el.textContent).trim();break}
  }
  return {...st,type:st.type||st.kind||st.module||st.modulo||'',title};
}

function tipoInspecaoSelecionado(source){
  const src=source||contextoAtual();
  const type=normalizar(src.type||src.kind||src.module||src.modulo||'').replace(/\s+/g,'-');
  if(TIPOS[type])return TIPOS[type];

  const texto=normalizar([
    src.type,src.kind,src.module,src.modulo,src.title,src.nome,src.name,
    document.querySelector('#sstBody h1')?.textContent,
    document.querySelector('#formTitle')?.textContent
  ].filter(Boolean).join(' '));

  if(/lista de presenca|treinamento sst/.test(texto))return TIPOS['training-attendance'];
  if(/extint|hidrant|combate a incendio|incendio/.test(texto))return TIPOS.fire;
  if(/nr\s*-?\s*24|sanitari|banheiro|vestiario/.test(texto))return TIPOS.nr24;
  if(/trabalho em altura|pt\s*-?\s*altura|nr\s*-?\s*35/.test(texto))return TIPOS['pt-altura'];
  if(/maquina|equipamento|nr\s*-?\s*12/.test(texto))return TIPOS.machine;
  if(/\bepi\b|equipamento de protecao individual/.test(texto))return TIPOS.epi;
  if(/acidente|incidente|quase acidente/.test(texto))return TIPOS.accident;
  if(/inspecao de seguranca|seguranca geral/.test(texto))return TIPOS.safety;
  if(/relatorio de inspecao/.test(texto))return TIPOS.report;

  return semAcentos(src.title||src.type||src.kind||'RELATORIO SST')||'RELATORIO SST';
}

function gerarNomeArquivoPdf(source){
  const dataAtual=new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
  const tipo=tipoInspecaoSelecionado(source);
  const nomeLimpo=semAcentos(tipo)
    .replace(/\s+/g,'_')
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g,'_')
    .replace(/_+/g,'_')
    .replace(/^_+|_+$/g,'');
  return 'RELATORIO_'+(nomeLimpo||'SST')+'_'+dataAtual+'.pdf';
}
window.gerarNomeArquivoPdf=gerarNomeArquivoPdf;
window.tbmPdfFilenamePrefix=tipoInspecaoSelecionado;

/* Autoridade final sobre TODO .download() do pdfmake: ignora IDs/UUIDs fornecidos pelos módulos. */
function aplicarPdfMake(){
  const pm=window.pdfMake;
  if(!pm||typeof pm.createPdf!=='function')return false;
  if(pm.createPdf.__tbmCorporateFilename)return true;
  const original=pm.createPdf.bind(pm);
  function createPdfComNome(...args){
    const api=original(...args);
    if(api&&typeof api.download==='function'&&!api.download.__tbmCorporateFilename){
      const downloadOriginal=api.download.bind(api);
      const downloadComNome=function(nomeOuCallback,...resto){
        const nomeArquivo=gerarNomeArquivoPdf();
        if(typeof nomeOuCallback==='function')return downloadOriginal(nomeArquivo,nomeOuCallback,...resto);
        return downloadOriginal(nomeArquivo,...resto);
      };
      downloadComNome.__tbmCorporateFilename=true;
      api.download=downloadComNome;
    }
    return api;
  }
  createPdfComNome.__tbmCorporateFilename=true;
  createPdfComNome.__tbmOriginal=original;
  pm.createPdf=createPdfComNome;
  return true;
}

/* Mantém o mesmo nome limpo quando o PDF é transformado em File para compartilhamento. */
function aplicarFile(){
  const NativeFile=window.File;
  if(typeof NativeFile!=='function'||NativeFile.__tbmCorporatePdfFilename)return;
  function CorporateFile(bits,name,options){
    const opts=options||{};
    const pdf=String(opts.type||'').toLowerCase()==='application/pdf'||/\.pdf$/i.test(String(name||''));
    return new NativeFile(bits,pdf?gerarNomeArquivoPdf():name,opts);
  }
  CorporateFile.prototype=NativeFile.prototype;
  try{Object.setPrototypeOf(CorporateFile,NativeFile)}catch(_){ }
  Object.defineProperty(CorporateFile,'__tbmCorporatePdfFilename',{value:true});
  try{window.File=CorporateFile}catch(_){try{Object.defineProperty(window,'File',{configurable:true,writable:true,value:CorporateFile})}catch(__){ }}
}

aplicarFile();
if(!aplicarPdfMake()){
  let tentativas=0;
  const timer=setInterval(()=>{tentativas++;if(aplicarPdfMake()||tentativas>=40)clearInterval(timer)},250);
}
})();
