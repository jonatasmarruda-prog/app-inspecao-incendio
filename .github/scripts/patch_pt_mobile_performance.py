from pathlib import Path

PT = Path('pt-altura.js')
LOADER = Path('sst-repair-loader.js')

s = PT.read_text(encoding='utf-8')

old_click = '''    if(check){const q=ptState.checklistPT.find(x=>x.id===check.dataset.ptCheck);if(q){q.status=check.dataset.ptStatus;const details=check.closest('details');const open=details?.open;renderPT();if(open){const d=[...document.querySelectorAll('#ptAlturaBody details')].find(x=>x.querySelector(`[data-pt-check="${check.dataset.ptCheck}"]`));if(d)d.open=true}scheduleSavePT()}return}'''
new_click = '''    if(check){
      const q=ptState.checklistPT.find(x=>x.id===check.dataset.ptCheck);
      if(q){
        q.status=check.dataset.ptStatus;
        const item=check.closest('.pt-check-item');
        if(item){
          item.querySelectorAll('[data-pt-check]').forEach(btn=>{
            btn.classList.remove('ok','no','na');
            if(btn.dataset.ptStatus===q.status)btn.classList.add(statusClass(q.status));
          });
        }
        const details=check.closest('details');
        const count=details?.querySelector('.pt-count');
        if(count){
          const items=ptState.checklistPT.filter(x=>x.grupo===q.grupo);
          const conformes=items.filter(x=>x.status==='CONFORME').length;
          const nc=items.filter(x=>x.status==='NÃO CONFORME').length;
          count.textContent=`${conformes} C • ${nc} NC • ${items.length} itens`;
        }
        scheduleSavePT();
      }
      return;
    }'''
if old_click not in s:
    raise SystemExit('ERRO: bloco antigo de clique da PT não encontrado')
s = s.replace(old_click, new_click, 1)

old_schedule = "function scheduleSavePT(){clearTimeout(saveTimerPT);saveTimerPT=setTimeout(()=>savePT(false),900);clearTimeout(cloudTimerPT);cloudTimerPT=setTimeout(()=>pushPTCloud().catch(()=>{}),1800)}"
new_schedule = '''function scheduleSavePT(){
  clearTimeout(saveTimerPT);
  saveTimerPT=setTimeout(()=>savePT(false,false),900);
  clearTimeout(cloudTimerPT);
  cloudTimerPT=setTimeout(()=>{
    const sync=()=>pushPTCloud().catch(()=>{});
    if(typeof requestIdleCallback==='function')requestIdleCallback(sync,{timeout:5000});
    else setTimeout(sync,0);
  },5000);
}'''
if old_schedule not in s:
    raise SystemExit('ERRO: scheduleSavePT antigo não encontrado')
s = s.replace(old_schedule, new_schedule, 1)

old_save = '''async function savePT(feedback=false){
  if(!ptState)return false;
  ptState.updatedAt=nowISO();ptState.issuer={name:EMISSOR_NOME,role:EMISSOR_CARGO};
  try{
    if(typeof window.idbPut==='function')await window.idbPut(JSON.parse(JSON.stringify(ptState)));
    pushPTCloud().catch(()=>{});
    if(feedback)showMsg('✅ PT salva com sucesso.');
    return true;
  }catch(e){console.error('[PT SAVE]',e);if(feedback)showMsg('❌ Não foi possível salvar a PT.','errorbox');return false}
}'''
new_save = '''async function savePT(feedback=false,syncCloud=feedback){
  if(!ptState)return false;
  ptState.updatedAt=nowISO();ptState.issuer={name:EMISSOR_NOME,role:EMISSOR_CARGO};
  try{
    if(typeof window.idbPut==='function'){
      const previousExtra=window.__tbmExtra;
      try{
        window.__tbmExtra=[];
        await window.idbPut(ptState);
      }finally{
        window.__tbmExtra=previousExtra;
      }
    }
    if(syncCloud)pushPTCloud().catch(()=>{});
    if(feedback)showMsg('✅ PT salva com sucesso.');
    return true;
  }catch(e){console.error('[PT SAVE]',e);if(feedback)showMsg('❌ Não foi possível salvar a PT.','errorbox');return false}
}'''
if old_save not in s:
    raise SystemExit('ERRO: savePT antigo não encontrado')
s = s.replace(old_save, new_save, 1)

s = s.replace("payload.appVersion='2026.09.03.pt-altura.2';", "payload.appVersion='2026.09.03.pt-altura.3';", 1)

# Intercepta histórico da PT antes de aguardar IndexedDB, evitando dois handlers competindo no mesmo toque.
old_history = '''function installHistoryInterceptor(){
  document.addEventListener('click',async e=>{
    const open=e.target.closest?.('[data-open-h]');
    const report=e.target.closest?.('[data-report-h]');
    const t=open||report;if(!t)return;
    const id=open?open.dataset.openH:report.dataset.reportH;
    let x=null;try{x=typeof window.idbGet==='function'?await window.idbGet(id):null}catch(_){ }
    if(!x||x.type!==PT_TYPE)return;
    e.preventDefault();e.stopImmediatePropagation();
    openPTAltura(x);
    if(report)setTimeout(()=>makePTPdf('download'),120);
  },true);
}'''
new_history = '''function installHistoryInterceptor(){
  document.addEventListener('click',async e=>{
    const open=e.target.closest?.('[data-open-h]');
    const report=e.target.closest?.('[data-report-h]');
    const t=open||report;if(!t)return;
    const id=open?open.dataset.openH:report.dataset.reportH;
    if(!String(id||'').startsWith('PT-'))return;
    e.preventDefault();e.stopImmediatePropagation();
    let x=null;try{x=typeof window.idbGet==='function'?await window.idbGet(id):null}catch(_){ }
    if(!x||x.type!==PT_TYPE)return;
    openPTAltura(x);
    if(report)setTimeout(()=>makePTPdf('download'),120);
  },true);
}'''
if old_history in s:
    s = s.replace(old_history, new_history, 1)

PT.write_text(s, encoding='utf-8')

if LOADER.exists():
    l = LOADER.read_text(encoding='utf-8')
    l = l.replace('pt-altura.js?v=20260903-02', 'pt-altura.js?v=20260903-03')
    LOADER.write_text(l, encoding='utf-8')

print('PATCH_PT_OK')
