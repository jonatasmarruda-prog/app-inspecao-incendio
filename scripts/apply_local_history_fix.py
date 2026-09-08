from pathlib import Path

path=Path('pt-altura.js')
s=path.read_text(encoding='utf-8')
old="""    const ok=await savePT(true,true);
    saveBtn.innerHTML=ok?'✅ PT Salva':'❌ Erro ao Salvar';"""
new="""    const ok=await savePT(true,true);
    if(ok&&typeof window.tbmAutoEmailSavedReport==='function'){
      try{
        const emailPromise=window.tbmAutoEmailSavedReport({mode:'pt'});
        if(emailPromise&&typeof emailPromise.catch==='function')emailPromise.catch(err=>console.warn('[PT EMAIL]',err));
      }catch(err){console.warn('[PT EMAIL]',err)}
    }
    saveBtn.innerHTML=ok?'✅ PT Salva':'❌ Erro ao Salvar';"""
if old not in s:
    raise SystemExit('Trecho do botão Salvar PT não encontrado')
s=s.replace(old,new,1)
s=s.replace("window.__tbmPTAlturaVersion='2026.09.08.pt-altura.5-preventive-local-history';","window.__tbmPTAlturaVersion='2026.09.08.pt-altura.6-email-on-save';",1)
path.write_text(s,encoding='utf-8')
Path('APPLY_LOCAL_HISTORY_FIX.txt').unlink(missing_ok=True)
print('PT_EMAIL_SAVE_FIX_OK')
