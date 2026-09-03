from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old="function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveInspection(true),700)}"
new="function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveInspection(true),1800)}"
if old not in s:
    raise SystemExit('scheduleSave atual não encontrado')
s=s.replace(old,new,1)
s=s.replace('./premium.js?v=20260903-32','./premium.js?v=20260903-33',1)
p.write_text(s,encoding='utf-8')
for sw in ['service-worker.js','sw.js']:
    q=Path(sw)
    if q.exists():
        t=q.read_text(encoding='utf-8').replace('inspecao-sst-v56','inspecao-sst-v57').replace('?v=56','?v=57')
        q.write_text(t,encoding='utf-8')
print('AUTOSAVE_DEBOUNCE_OK')
