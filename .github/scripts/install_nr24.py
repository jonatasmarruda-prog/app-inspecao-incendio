from pathlib import Path


def patch(path, old, new):
    p=Path(path); text=p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Âncora não encontrada em {path}: {old[:80]!r}')
    text=text.replace(old,new,1)
    p.write_text(text,encoding='utf-8')
    print('patched',path)

# Carregar o NR24 somente após as camadas globais/Premium, para não interferir nos módulos existentes.
loader='sst-repair-loader.js'
text=Path(loader).read_text(encoding='utf-8')
if 'function loadNR24Module()' not in text:
    anchor="function loadMobileInteractionFix(){const old=document.getElementById('tbm-mobile-interaction-fix');if(old)old.remove();const s=document.createElement('script');s.id='tbm-mobile-interaction-fix';s.src='./mobile-interaction-fix.js?v=20260904-02&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}\n"
    addition=anchor+"function loadNR24Module(){const old=document.getElementById('tbm-nr24-module');if(old)old.remove();const s=document.createElement('script');s.id='tbm-nr24-module';s.src='./nr24-module.js?v=20260904-01&cb='+Date.now();s.async=false;document.body.appendChild(s);return new Promise(resolve=>{s.onload=resolve;s.onerror=resolve})}\n"
    if anchor not in text: raise SystemExit('Âncora loadMobileInteractionFix não encontrada')
    text=text.replace(anchor,addition,1)
call="  try{window.tbmInstallMobilePdfPerformance?.()}catch(_){ }\n  setTimeout(loadCloudCrossDevice,0);"
replacement="  try{window.tbmInstallMobilePdfPerformance?.()}catch(_){ }\n  // NR 24 entra por último para interceptar somente o tipo nr24 sem alterar PDFs/formulários existentes.\n  await loadNR24Module();\n  setTimeout(loadCloudCrossDevice,0);"
if 'await loadNR24Module();' not in text:
    if call not in text: raise SystemExit('Âncora final do loader não encontrada')
    text=text.replace(call,replacement,1)
Path(loader).write_text(text,encoding='utf-8')
print('patched',loader)

# Cache offline do novo módulo.
for path in ['service-worker.js','sw.js']:
    text=Path(path).read_text(encoding='utf-8')
    text=text.replace("inspecao-sst-v67","inspecao-sst-v68").replace("?v=67","?v=68")
    if "'./nr24-module.js'" not in text:
        anchor="'./email-relatorio-auto.js'"
        if anchor not in text: raise SystemExit(f'Âncora CORE ausente em {path}')
        text=text.replace(anchor,anchor+",'./nr24-module.js'",1)
    Path(path).write_text(text,encoding='utf-8')
    print('patched',path)

# Apenas cache-bust do loader no HTML; nenhum campo, formulário ou PDF existente é modificado.
p='index.html';text=Path(p).read_text(encoding='utf-8')
old='./sst-repair-loader.js?v=20260904-01'
if old in text:text=text.replace(old,'./sst-repair-loader.js?v=20260904-02',1)
Path(p).write_text(text,encoding='utf-8');print('patched',p)
