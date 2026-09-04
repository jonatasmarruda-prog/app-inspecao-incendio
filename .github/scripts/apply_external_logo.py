from pathlib import Path

repo = Path('.')

# 1) Integração global: remove placeholder, cria carregamento fetch/blob/FileReader e adia pdfMake até a logo estar pronta.
p = repo / 'integracao-modulos.js'
s = p.read_text(encoding='utf-8')
s = s.replace("const VERSION='20260904-25-corporate-header';", "const VERSION='20260904-26-external-logo';")
start = s.find("// LOGO TBM (PLACEHOLDER PROVISÓRIO):")
end_marker = "window.tbmLogoTBM=logoTBM;"
end = s.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('Bloco placeholder da logo não encontrado')
end += len(end_marker)
logo_block = r'''// LOGO TBM OFICIAL: carregada da URL externa e convertida para Base64 antes de qualquer PDF.
const LOGO_TBM_URL='https://i.postimg.cc/rFWSj5mw/10.png';
let logoTBM='';
let logoTBMPromise=null;
async function carregarLogo(url=LOGO_TBM_URL){
  if(url===LOGO_TBM_URL&&logoTBM)return logoTBM;
  if(url===LOGO_TBM_URL&&logoTBMPromise)return logoTBMPromise;
  const tarefa=(async()=>{
    const resposta=await fetch(url,{cache:'force-cache',mode:'cors'});
    if(!resposta.ok)throw new Error(`Falha ao carregar a logo TBM (${resposta.status})`);
    const blob=await resposta.blob();
    const base64=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result||''));
      reader.onerror=()=>reject(reader.error||new Error('Falha ao converter a logo TBM para Base64'));
      reader.readAsDataURL(blob);
    });
    if(!/^data:image\//i.test(base64))throw new Error('A logo TBM não retornou uma imagem válida.');
    if(url===LOGO_TBM_URL){
      logoTBM=base64;
      window.logoTBM=base64;
      window.tbmLogoTBM=base64;
    }
    return base64;
  })();
  if(url===LOGO_TBM_URL){
    logoTBMPromise=tarefa.catch(err=>{logoTBMPromise=null;throw err});
    return logoTBMPromise;
  }
  return tarefa;
}
window.LOGO_TBM_URL=LOGO_TBM_URL;
window.carregarLogo=carregarLogo;
window.logoTBM='';
window.tbmLogoTBM='';
// Pré-carrega em segundo plano; as ações de PDF também aguardam obrigatoriamente esta Promise.
carregarLogo(LOGO_TBM_URL).catch(err=>console.warn('[LOGO TBM]',err));'''
s = s[:start] + logo_block + s[end:]

old = r'''  function ensureCorporatePdfLogo(docDefinition){
    if(!docDefinition||typeof docDefinition!=='object'||!Array.isArray(docDefinition.content))return docDefinition;
    const content=docDefinition.content;
    let logoIndex=content.findIndex(node=>node&&node.image===logoTBM);
    let logoNode;
    if(logoIndex>=0){
      logoNode=content.splice(logoIndex,1)[0];
      logoNode.image=logoTBM;
      logoNode.width=160;
      logoNode.alignment='center';
      logoNode.margin=[0,0,0,10];
    }else{
      logoNode={image:logoTBM,width:160,alignment:'center',margin:[0,0,0,10]};
    }
    const first=content[0];
    const body=first?.table?.body;
    const row=Array.isArray(body)&&Array.isArray(body[0])?body[0]:null;
    if(row&&row.length>=2){
      const legacy=row[0];
      const legacyText=String(legacy?.text||'').trim().toUpperCase();
      if(legacy&&typeof legacy==='object'&&(legacy.image||legacy.svg||legacyText==='TBM')){
        row.shift();
        if(Array.isArray(first.table.widths)&&first.table.widths.length)first.table.widths.shift();
      }
    }
    content.unshift(logoNode);
    return docDefinition;
  }

  function enforce(docDefinition){
    if(!docDefinition||typeof docDefinition!=='object')return docDefinition;
    ensureCorporatePdfLogo(docDefinition);'''
new = r'''  function ensureCorporatePdfLogo(docDefinition,logoConvertida=window.logoTBM||logoTBM){
    if(!docDefinition||typeof docDefinition!=='object'||!Array.isArray(docDefinition.content)||!logoConvertida)return docDefinition;
    const content=docDefinition.content;
    // Elimina apenas candidatos de logo no topo, inclusive nós vazios criados antes do carregamento assíncrono.
    for(let i=Math.min(content.length,5)-1;i>=0;i--){
      const node=content[i];
      if(!node||typeof node!=='object')continue;
      const logoCandidate=('image' in node)&&node.alignment==='center'&&(node.width===100||node.width===160||node.image==='');
      if(logoCandidate)content.splice(i,1);
    }
    const first=content[0];
    const body=first?.table?.body;
    const row=Array.isArray(body)&&Array.isArray(body[0])?body[0]:null;
    if(row&&row.length>=2){
      const legacy=row[0];
      const legacyText=String(legacy?.text||'').trim().toUpperCase();
      if(legacy&&typeof legacy==='object'&&(legacy.image||legacy.svg||legacyText==='TBM')){
        row.shift();
        if(Array.isArray(first.table.widths)&&first.table.widths.length)first.table.widths.shift();
      }
    }
    content.unshift({image:logoConvertida,width:160,alignment:'center',margin:[0,0,0,10]});
    return docDefinition;
  }

  function enforce(docDefinition,logoConvertida=window.logoTBM||logoTBM){
    if(!docDefinition||typeof docDefinition!=='object')return docDefinition;
    ensureCorporatePdfLogo(docDefinition,logoConvertida);'''
if old not in s:
    raise SystemExit('Bloco ensureCorporatePdfLogo/enforce não encontrado')
s = s.replace(old, new, 1)

old_wrap = r'''  const wrapped=function(docDefinition,...args){
    try{enforce(docDefinition)}catch(err){console.warn('[PDF STATUS PREMIUM GLOBAL]',err)}
    return original(docDefinition,...args);
  };'''
new_wrap = r'''  const wrapped=function(docDefinition,...args){
    let preparedPromise=null;
    const preparar=()=>preparedPromise||(preparedPromise=carregarLogo(LOGO_TBM_URL).then(logoConvertida=>{
      try{enforce(docDefinition,logoConvertida)}catch(err){console.warn('[PDF STATUS PREMIUM GLOBAL]',err)}
      return original(docDefinition,...args);
    }));
    const api={};
    ['download','open','print','getBlob','getBuffer','getBase64','getDataUrl','getStream'].forEach(method=>{
      api[method]=(...methodArgs)=>preparar().then(real=>{
        if(!real||typeof real[method]!=='function')throw new Error(`Método PDF indisponível: ${method}`);
        return real[method](...methodArgs);
      });
    });
    api.__tbmLogoDeferred=true;
    return api;
  };'''
if old_wrap not in s:
    raise SystemExit('Wrapper base pdfMake não encontrado')
s = s.replace(old_wrap, new_wrap, 1)
s = s.replace("window.__tbmPremiumPdfStatusVersion='2026.09.04.3-corporate-header-160';", "window.__tbmPremiumPdfStatusVersion='2026.09.04.4-external-logo-base64';")
p.write_text(s, encoding='utf-8')

# 2) Preview/download/share: aguarda explicitamente a logo antes de montar o docDefinition.
p = repo / 'global-pdf-preview.js'
s = p.read_text(encoding='utf-8')
s = s.replace("const VERSION='2026.09.04.global-pdf-preview.2-no-observer-loop';", "const VERSION='2026.09.04.global-pdf-preview.3-await-logo';")
needle = "  try{await Promise.resolve(ctx.save?.())}catch(_){ }\n  const pm=window.pdfMake;"
replacement = "  try{await Promise.resolve(ctx.save?.())}catch(_){ }\n  if(typeof window.carregarLogo==='function')await window.carregarLogo(window.LOGO_TBM_URL);\n  const pm=window.pdfMake;"
if needle not in s:
    raise SystemExit('Ponto do preview para await da logo não encontrado')
s = s.replace(needle, replacement, 1)
needle2 = "    try{await Promise.resolve(ctx.save?.())}catch(_){ }\n    await Promise.resolve(ctx.generate(action));"
replacement2 = "    try{await Promise.resolve(ctx.save?.())}catch(_){ }\n    if(typeof window.carregarLogo==='function')await window.carregarLogo(window.LOGO_TBM_URL);\n    await Promise.resolve(ctx.generate(action));"
if needle2 not in s:
    raise SystemExit('Ponto download/share para await da logo não encontrado')
s = s.replace(needle2, replacement2, 1)
p.write_text(s, encoding='utf-8')

# 3) PWA v83, garantindo atualização imediata das duas camadas alteradas.
for name in ('service-worker.js','sw.js'):
    p = repo / name
    s = p.read_text(encoding='utf-8')
    s = s.replace("const CACHE='inspecao-sst-v82';", "const CACHE='inspecao-sst-v83';")
    s = s.replace("'?v=82'", "'?v=83'")
    s = s.replace("'?v=82',{", "'?v=83',{")
    # A forma real é url+'?v=82'
    s = s.replace("url+'?v=82'", "url+'?v=83'")
    p.write_text(s, encoding='utf-8')

print('PATCH_LOGO_EXTERNA_OK')
