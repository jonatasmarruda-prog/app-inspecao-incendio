(()=>{
'use strict';

/* Nomeação global e obrigatória para TODOS os PDFs do sistema. */
const PREFIXOS=Object.freeze({
  fire:'Inspecao_Combate_Incendio',
  extintor:'Inspecao_Combate_Incendio',
  hidrante:'Inspecao_Combate_Incendio',
  safety:'Inspecao_Seguranca',
  seg:'Inspecao_Seguranca',
  machine:'Inspecao_NR12_Maquinas_Equipamentos',
  epi:'Inspecao_EPI',
  accident:'Investigacao_de_Acidente',
  report:'Relatorio_de_Inspecao',
  'pt-altura':'Permissao_de_Trabalho_Altura',
  'pt_altura':'Permissao_de_Trabalho_Altura',
  'nr24':'Inspecao_NR24_Sanitarios',
  'nr-24':'Inspecao_NR24_Sanitarios',
  sanitarios:'Inspecao_NR24_Sanitarios',
  banheiros:'Inspecao_NR24_Sanitarios'
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
  if(visivel(nr24))return {...st,type:'nr24',title:'NR 24 Sanitários'};

  const titulos=['#sstBody h1','#formTitle','#reportTitle','#nr24Title','[data-report-title]'];
  let title=st.title||st.nome||st.name||'';
  for(const seletor of titulos){
    const el=document.querySelector(seletor);
    if(el&&visivel(el)&&String(el.textContent||'').trim()){title=String(el.textContent).trim();break}
  }
  return {...st,type:st.type||st.kind||st.module||st.modulo||'',title};
}

function prefixoPorContexto(source){
  const src=source||contextoAtual();
  const type=normalizar(src.type||src.kind||src.module||src.modulo||'').replace(/\s+/g,'-');
  if(PREFIXOS[type])return PREFIXOS[type];

  const texto=normalizar([
    src.type,src.kind,src.module,src.modulo,src.title,src.nome,src.name,
    document.querySelector('#sstBody h1')?.textContent,
    document.querySelector('#formTitle')?.textContent
  ].filter(Boolean).join(' '));

  if(/extint|hidrant|combate a incendio|incendio/.test(texto))return PREFIXOS.fire;
  if(/nr\s*-?\s*24|sanitari|banheiro|vestiario/.test(texto))return PREFIXOS.nr24;
  if(/trabalho em altura|pt\s*-?\s*altura|nr\s*-?\s*35/.test(texto))return PREFIXOS['pt-altura'];
  if(/maquina|equipamento|nr\s*-?\s*12/.test(texto))return PREFIXOS.machine;
  if(/\bepi\b|equipamento de protecao individual/.test(texto))return PREFIXOS.epi;
  if(/acidente|incidente|quase acidente/.test(texto))return PREFIXOS.accident;
  if(/inspecao de seguranca|seguranca geral/.test(texto))return PREFIXOS.safety;
  if(/relatorio de inspecao/.test(texto))return PREFIXOS.report;
  if(/permissao de trabalho/.test(texto))return 'Permissao_de_Trabalho';

  const base=semAcentos(src.title||src.type||src.kind||'Relatorio_SST')
    .replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'');
  return base||'Relatorio_SST';
}

function dataArquivo(data=new Date()){
  const d=String(data.getDate()).padStart(2,'0');
  const m=String(data.getMonth()+1).padStart(2,'0');
  const y=data.getFullYear();
  return `${d}-${m}-${y}`;
}

function gerarNomeArquivoPdf(source){
  return `${prefixoPorContexto(source)}_${dataArquivo(new Date())}.pdf`;
}
window.gerarNomeArquivoPdf=gerarNomeArquivoPdf;
window.tbmPdfFilenamePrefix=prefixoPorContexto;

/* Garante o nome inteligente em TODO .download() do pdfmake, inclusive módulos antigos/futuros. */
function aplicarPdfMake(){
  const pm=window.pdfMake;
  if(!pm||typeof pm.createPdf!=='function')return false;
  if(pm.createPdf.__tbmSmartFilename)return true;
  const original=pm.createPdf.bind(pm);
  function createPdfComNome(...args){
    const api=original(...args);
    if(api&&typeof api.download==='function'&&!api.download.__tbmSmartFilename){
      const downloadOriginal=api.download.bind(api);
      const downloadComNome=function(nomeOuCallback,...resto){
        const nome=gerarNomeArquivoPdf();
        if(typeof nomeOuCallback==='function')return downloadOriginal(nome,nomeOuCallback,...resto);
        return downloadOriginal(nome,...resto);
      };
      downloadComNome.__tbmSmartFilename=true;
      api.download=downloadComNome;
    }
    return api;
  }
  createPdfComNome.__tbmSmartFilename=true;
  createPdfComNome.__tbmOriginal=original;
  pm.createPdf=createPdfComNome;
  return true;
}

/* Garante o mesmo nome quando o Blob vira File para a Web Share API. */
function aplicarFile(){
  const NativeFile=window.File;
  if(typeof NativeFile!=='function'||NativeFile.__tbmSmartPdfFilename)return;
  function SmartFile(bits,name,options){
    const opts=options||{};
    const pdf=String(opts.type||'').toLowerCase()==='application/pdf'||/\.pdf$/i.test(String(name||''));
    return new NativeFile(bits,pdf?gerarNomeArquivoPdf():name,opts);
  }
  SmartFile.prototype=NativeFile.prototype;
  try{Object.setPrototypeOf(SmartFile,NativeFile)}catch(_){ }
  Object.defineProperty(SmartFile,'__tbmSmartPdfFilename',{value:true});
  try{window.File=SmartFile}catch(_){try{Object.defineProperty(window,'File',{configurable:true,writable:true,value:SmartFile})}catch(__){ }}
}

aplicarFile();
if(!aplicarPdfMake()){
  let tentativas=0;
  const timer=setInterval(()=>{tentativas++;if(aplicarPdfMake()||tentativas>=40)clearInterval(timer)},250);
}
})();
