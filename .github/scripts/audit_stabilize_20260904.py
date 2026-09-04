from pathlib import Path

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

# 1) Elimina carregamentos duplicados sem alterar a UI.
html=read('index.html')
html=html.replace('<script src="./extintor-enhancements.js?v=20260903-01" defer></script>','')
html=html.replace('<script src="./delete-draft.js?v=20260903-01"></script>','')
html=html.replace('./integracao-modulos.js?v=20260903-21','./integracao-modulos.js?v=20260904-27')
html=html.replace('./sst-repair-loader.js?v=20260903-23','./sst-repair-loader.js?v=20260904-24')
assert html.count('extintor-enhancements.js')==1, 'extintor-enhancements ainda duplicado no index'
assert html.count('delete-draft.js')==1, 'delete-draft ainda duplicado no index'
write('index.html',html)

# 2) Guards defensivos para impedir listeners/observers duplicados mesmo se o script for recarregado.
for path,flag in [
    ('extintor-enhancements.js','__tbmExtintorEnhancementsV4'),
    ('delete-draft.js','__tbmDeleteDraftV2')
]:
    src=read(path)
    marker="'use strict';\n"
    guard=f"'use strict';\nconst MODULE_FLAG='{flag}';\nif(window[MODULE_FLAG])return;\nwindow[MODULE_FLAG]=true;\n"
    if flag not in src:
        assert marker in src, f'marcador use strict ausente em {path}'
        src=src.replace(marker,guard,1)
        write(path,src)

# 3) Logo externa robusta: rede -> cache Base64 -> logo local -> pixel transparente.
path='integracao-modulos.js'
src=read(path)
start=src.index("const VERSION='20260904-26-external-logo';")
end_marker="carregarLogo(LOGO_TBM_URL).catch(err=>console.warn('[LOGO TBM]',err));"
end=src.index(end_marker,start)+len(end_marker)
logo_block=r"""const VERSION='20260904-27-audit-stable';
// LOGO TBM OFICIAL: URL externa com cache Base64 e fallback local para geração offline segura.
const LOGO_TBM_URL='https://i.postimg.cc/rFWSj5mw/10.png';
const LOGO_TBM_LOCAL='./Têxtil Bezerra de Menezes 2.jpeg';
const LOGO_TBM_CACHE_KEY='tbm-logo-oficial-base64-v1';
const LOGO_TBM_TRANSPARENT='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZRAAAAABJRU5ErkJggg==';
let logoTBM='';
let logoTBMPromise=null;
function logoValida(value){return /^data:image\//i.test(String(value||''))}
function lerLogoCache(){
  try{const value=localStorage.getItem(LOGO_TBM_CACHE_KEY)||'';return logoValida(value)?value:''}catch(_){return''}
}
function salvarLogoCache(value){
  if(!logoValida(value))return;
  try{localStorage.setItem(LOGO_TBM_CACHE_KEY,value)}catch(_){ }
}
function blobParaBase64(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(reader.error||new Error('Falha ao converter a logo TBM para Base64'));
    reader.readAsDataURL(blob);
  });
}
async function baixarLogoBase64(url,options={}){
  const resposta=await fetch(url,options);
  if(!resposta.ok)throw new Error(`Falha ao carregar a logo TBM (${resposta.status})`);
  const base64=await blobParaBase64(await resposta.blob());
  if(!logoValida(base64))throw new Error('A logo TBM não retornou uma imagem válida.');
  return base64;
}
async function carregarLogo(url=LOGO_TBM_URL){
  if(url===LOGO_TBM_URL&&logoTBM)return logoTBM;
  if(url===LOGO_TBM_URL&&logoTBMPromise)return logoTBMPromise;
  const tarefa=(async()=>{
    let base64='';
    try{
      base64=await baixarLogoBase64(url,{cache:'force-cache',mode:url===LOGO_TBM_URL?'cors':'same-origin'});
      if(url===LOGO_TBM_URL)salvarLogoCache(base64);
    }catch(erroExterno){
      if(url!==LOGO_TBM_URL)throw erroExterno;
      console.warn('[LOGO TBM] URL externa indisponível; usando fallback seguro.',erroExterno);
      base64=lerLogoCache();
      if(!base64){
        try{base64=await baixarLogoBase64(LOGO_TBM_LOCAL,{cache:'force-cache',mode:'same-origin'})}
        catch(erroLocal){console.warn('[LOGO TBM] fallback local indisponível; mantendo PDF operacional.',erroLocal);base64=LOGO_TBM_TRANSPARENT}
      }
    }
    if(!logoValida(base64))base64=LOGO_TBM_TRANSPARENT;
    if(url===LOGO_TBM_URL){
      logoTBM=base64;
      window.logoTBM=base64;
      window.tbmLogoTBM=base64;
    }
    return base64;
  })();
  if(url===LOGO_TBM_URL){
    logoTBMPromise=tarefa.catch(err=>{
      console.warn('[LOGO TBM] recuperação final aplicada.',err);
      logoTBM=lerLogoCache()||LOGO_TBM_TRANSPARENT;
      window.logoTBM=logoTBM;window.tbmLogoTBM=logoTBM;
      return logoTBM;
    });
    return logoTBMPromise;
  }
  return tarefa;
}
window.LOGO_TBM_URL=LOGO_TBM_URL;
window.LOGO_TBM_LOCAL=LOGO_TBM_LOCAL;
window.carregarLogo=carregarLogo;
window.logoTBM='';
window.tbmLogoTBM='';
// Pré-carregamento não bloqueante; visualizar/baixar também aguardam esta mesma Promise.
carregarLogo(LOGO_TBM_URL).catch(err=>console.warn('[LOGO TBM]',err));"""
src=src[:start]+logo_block+src[end:]
assert "width:160" in src, 'largura corporativa da logo alterada'
assert "LOGO_TBM_LOCAL" in src and "LOGO_TBM_CACHE_KEY" in src, 'fallback da logo ausente'
write(path,src)

# 4) Corrige cache-bust malformado do loader sem alterar ordem/lógica de módulos.
path='sst-repair-loader.js'
src=read(path)
src=src.replace("s.src='./pdf-final-fix.js?v=20260903-02'+Date.now();","s.src='./pdf-final-fix.js?v=20260903-02&cb='+Date.now();")
write(path,src)

# 5) PWA: cacheia também a logo local para permitir PDF offline e força atualização.
for path in ['service-worker.js','sw.js']:
    src=read(path)
    src=src.replace("inspecao-sst-v84","inspecao-sst-v85").replace("?v=84","?v=85")
    if "./Têxtil Bezerra de Menezes 2.jpeg" not in src:
        src=src.replace("'./icon.svg',","'./icon.svg','./Têxtil Bezerra de Menezes 2.jpeg',",1)
    assert "inspecao-sst-v85" in src and "Têxtil Bezerra de Menezes 2.jpeg" in src
    write(path,src)

# 6) Remove artefatos temporários históricos de auditorias/hotfixes.
for name in ['AUDITORIA_TRIGGER.txt','health-trigger.txt','health-trigger-2.txt','health-trigger-3.txt','health-trigger-4.txt']:
    p=ROOT/name
    if p.exists():p.unlink()

# Invariantes de imutabilidade solicitados pelo cliente.
premium=read('premium.css')
assert 'color:#212529!important' in premium, 'contraste do checklist de acidente foi alterado'
solid=read('solid-status-badges.js')
for token in ["'#198754'","'#dc3545'","'#6c757d'","'#fff'"]:
    assert token in solid, f'Solid Badge invariante ausente: {token}'
pdf=read('pdf-global-standard.js')
assert "fontSize:18" in pdf and "alignment:'center'" in pdf, 'título PDF corporativo alterado'
fire=read('pdf-layout-fix.js')
assert 'if(temExtintor)' in fire and 'if(temHidrante)' in fire, 'renderização condicional de incêndio alterada'
preview=read('global-pdf-preview.js')
assert 'URL.createObjectURL' in preview and 'about:blank' not in preview, 'preview mobile regrediu'

print('AUDITORIA_PATCH_OK')
