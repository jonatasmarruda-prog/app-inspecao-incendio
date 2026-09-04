from pathlib import Path

p=Path('pt-altura.js')
s=p.read_text(encoding='utf-8')
marker="2026.09.04.pt-altura.4-sign-evidence"
if marker in s:
    print('Patch PT já aplicado.')
    raise SystemExit(0)

def rep(old,new,label):
    global s
    if old not in s:
        raise SystemExit(f'Âncora não encontrada: {label}')
    s=s.replace(old,new,1)

rep(
"""    checklistPT:blankChecklist(),workers:[blankWorker()],
    issuer:{name:EMISSOR_NOME,role:EMISSOR_CARGO},status:'RASCUNHO'
""",
"""    checklistPT:blankChecklist(),workers:[blankWorker()],evidencePhotos:[],
    issuer:{name:EMISSOR_NOME,role:EMISSOR_CARGO,signature:''},status:'RASCUNHO'
""",
'freshState')

rep(
"""  const s=JSON.parse(JSON.stringify(x||freshState()));
  s.type=PT_TYPE;s.title=PT_TITLE;s.issuer={name:EMISSOR_NOME,role:EMISSOR_CARGO};
""",
"""  const s=JSON.parse(JSON.stringify(x||freshState()));
  const oldIssuer=s.issuer||{};
  s.type=PT_TYPE;s.title=PT_TITLE;s.issuer={name:EMISSOR_NOME,role:EMISSOR_CARGO,signature:oldIssuer.signature||''};
""",
'normalize issuer')

rep(
"""  s.workers=Array.isArray(s.workers)&&s.workers.length?s.workers.map(w=>({id:w.id||blankWorker().id,nome:w.nome||'',signature:w.signature||''})):[blankWorker()];
  return s;
""",
"""  s.workers=Array.isArray(s.workers)&&s.workers.length?s.workers.map(w=>({id:w.id||blankWorker().id,nome:w.nome||'',signature:w.signature||''})):[blankWorker()];
  s.evidencePhotos=Array.isArray(s.evidencePhotos)?s.evidencePhotos.filter(x=>typeof x==='string'&&x.startsWith('data:image/')):[];
  return s;
""",
'normalize evidence')

rep(
"""    .pt-fixed-issuer{border-left:4px solid #0f4c5c!important;background:#f0fdfa!important;color:#17202b!important}
    #ptAlturaOverlay .mini{color:#64748b!important}
""",
"""    .pt-fixed-issuer{border-left:4px solid #0f4c5c!important;background:#f0fdfa!important;color:#17202b!important}
    .pt-evidence-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
    .pt-evidence-item{position:relative;border:1px solid #d9e0e8;border-radius:12px;padding:8px;background:#fff;overflow:hidden}
    .pt-evidence-item img{display:block;width:100%;height:150px;object-fit:cover;border-radius:9px;background:#eef2f6}
    .pt-evidence-item .pt-evidence-label{display:block;font-size:11px;font-weight:800;text-align:center;margin-top:6px;color:#334155}
    .pt-evidence-item .pt-evidence-remove{position:absolute;top:13px;right:13px;border:0;border-radius:999px;width:30px;height:30px;background:#b91c1c;color:#fff;font-weight:900;box-shadow:0 2px 8px #0004}
    #ptAlturaOverlay .mini{color:#64748b!important}
""",
'CSS evidence')

rep(
"""    @media(max-width:650px){.pt-select-grid{grid-template-columns:1fr}.pt-check-actions{grid-template-columns:repeat(3,minmax(0,1fr))}.pt-check-actions button{font-size:10px;padding:8px 3px}.pt-worker-head{align-items:flex-start}.pt-actions .btn{width:100%}}
""",
"""    @media(max-width:650px){.pt-select-grid{grid-template-columns:1fr}.pt-check-actions{grid-template-columns:repeat(3,minmax(0,1fr))}.pt-check-actions button{font-size:10px;padding:8px 3px}.pt-worker-head{align-items:flex-start}.pt-actions .btn{width:100%}.pt-evidence-grid{grid-template-columns:1fr}.pt-evidence-item img{height:190px}}
""",
'CSS mobile evidence')

rep(
"""function workerHTML(w,i){
  return `<div class=\"pt-worker\" data-pt-worker=\"${i}\"><div class=\"pt-worker-head\"><b>Executante ${i+1}</b>${ptState.workers.length>1?`<button type=\"button\" class=\"btn danger\" data-pt-remove-worker=\"${i}\" style=\"padding:7px 9px\">Excluir</button>`:''}</div><div class=\"field\"><label>Nome do Executante</label><input data-pt-worker-name=\"${i}\" value=\"${esc(w.nome)}\" placeholder=\"Nome completo\"></div><div class=\"field\" style=\"margin-top:9px\"><label>Assinatura do Executante</label><div class=\"pt-sign\"><canvas id=\"ptSig-${i}\" data-pt-sign=\"${i}\"></canvas></div><button type=\"button\" class=\"btn secondary full\" data-pt-clear-sign=\"${i}\">Limpar assinatura</button></div></div>`;
}

""",
"""function workerHTML(w,i){
  return `<div class=\"pt-worker\" data-pt-worker=\"${i}\"><div class=\"pt-worker-head\"><b>Executante ${i+1}</b>${ptState.workers.length>1?`<button type=\"button\" class=\"btn danger\" data-pt-remove-worker=\"${i}\" style=\"padding:7px 9px\">Excluir</button>`:''}</div><div class=\"field\"><label>Nome do Executante</label><input data-pt-worker-name=\"${i}\" value=\"${esc(w.nome)}\" placeholder=\"Nome completo\"></div><div class=\"field\" style=\"margin-top:9px\"><label>Assinatura do Executante</label><div class=\"pt-sign\"><canvas id=\"ptSig-${i}\" data-pt-sign=\"${i}\"></canvas></div><button type=\"button\" class=\"btn secondary full\" data-pt-clear-sign=\"${i}\">Limpar assinatura</button></div></div>`;
}
function evidenceHTML(){
  const photos=ptState?.evidencePhotos||[];
  if(!photos.length)return '<div class=\"mini\" id=\"ptEvidenceEmpty\">Nenhuma evidência fotográfica anexada.</div>';
  return `<div class=\"pt-evidence-grid\">${photos.map((src,i)=>`<div class=\"pt-evidence-item\"><img src=\"${src}\" alt=\"Evidência ${i+1}\"><button type=\"button\" class=\"pt-evidence-remove\" data-pt-remove-evidence=\"${i}\" aria-label=\"Excluir foto ${i+1}\">×</button><span class=\"pt-evidence-label\">Foto ${i+1}</span></div>`).join('')}</div>`;
}

""",
'evidenceHTML')

rep(
"""    <div class=\"card pt-fixed-issuer\"><div class=\"sectionTitle\">Responsável pela Liberação</div><div class=\"grid\"><div class=\"field\"><label>Emissor / TST</label><input value=\"${esc(EMISSOR_NOME)}\" readonly></div><div class=\"field\"><label>Cargo</label><input value=\"${esc(EMISSOR_CARGO)}\" readonly></div></div><div class=\"mini\" style=\"margin-top:10px\">Responsável técnico fixado no sistema. Não requer digitação manual.</div></div>
    <div class=\"card\"><div class=\"actions pt-actions\"><button type=\"button\" id=\"ptSave\" class=\"btn success\">💾 Salvar PT</button><button type=\"button\" id=\"ptPdf\" class=\"btn primary\">📥 Baixar PDF</button><button type=\"button\" id=\"ptShare\" class=\"btn blue\">📲 Compartilhar PDF</button></div></div>`;
  bindPT();
  ptState.workers.forEach((w,i)=>setupSignature(i,w.signature));
""",
"""    <div class=\"card pt-fixed-issuer\"><div class=\"sectionTitle\">Responsável pela Liberação</div><div class=\"grid\"><div class=\"field\"><label>Emissor / TST</label><input value=\"${esc(EMISSOR_NOME)}\" readonly></div><div class=\"field\"><label>Cargo</label><input value=\"${esc(EMISSOR_CARGO)}\" readonly></div></div><div class=\"field\" style=\"margin-top:12px\"><label>Assinatura do Responsável pela Liberação</label><div class=\"pt-sign\"><canvas id=\"ptIssuerSig\"></canvas></div><button type=\"button\" class=\"btn secondary full\" data-pt-clear-issuer-sign>Limpar assinatura</button></div><div class=\"mini\" style=\"margin-top:10px\">Responsável técnico fixado no sistema: ${esc(EMISSOR_NOME)}.</div></div>
    <div class=\"card\"><div class=\"sectionTitle\">Evidências Fotográficas do Local</div><div class=\"notice info\">Anexe fotos gerais do local onde o trabalho em altura será executado.</div><input id=\"ptEvidenceInput\" type=\"file\" accept=\"image/*\" capture=\"environment\" multiple style=\"display:none\"><button type=\"button\" id=\"ptEvidenceButton\" class=\"btn secondary full\">📸 Adicionar Fotos do Local</button><div id=\"ptEvidenceList\">${evidenceHTML()}</div></div>
    <div class=\"card\"><div class=\"actions pt-actions\"><button type=\"button\" id=\"ptSave\" class=\"btn success\">💾 Salvar PT</button><button type=\"button\" id=\"ptPdf\" class=\"btn primary\">📥 Baixar PDF</button><button type=\"button\" id=\"ptShare\" class=\"btn blue\">📲 Compartilhar PDF</button></div></div>`;
  bindPT();
  ptState.workers.forEach((w,i)=>setupSignature(i,w.signature));
  setupIssuerSignature(ptState.issuer?.signature||'');
""",
'render issuer/evidence')

rep(
"""    const clear=e.target.closest('[data-pt-clear-sign]');if(clear){const i=+clear.dataset.ptClearSign;ptState.workers[i].signature='';const c=$('ptSig-'+i);c?.getContext('2d')?.clearRect(0,0,c.width,c.height);scheduleSavePT();return}
  };
  $('ptAddWorker').onclick=e=>{e.stopPropagation();ptState.workers.push(blankWorker());renderPT();scheduleSavePT()};
  $('ptSave').onclick=e=>{e.stopPropagation();savePT(true)};
  $('ptPdf').onclick=e=>{e.stopPropagation();savePT(false).then(()=>makePTPdf('download'))};
  $('ptShare').onclick=e=>{e.stopPropagation();savePT(false).then(()=>makePTPdf('share'))};
}
""",
"""    const clear=e.target.closest('[data-pt-clear-sign]');if(clear){const i=+clear.dataset.ptClearSign;ptState.workers[i].signature='';const c=$('ptSig-'+i);c?.getContext('2d')?.clearRect(0,0,c.width,c.height);scheduleSavePT();return}
    const clearIssuer=e.target.closest('[data-pt-clear-issuer-sign]');if(clearIssuer){ptState.issuer.signature='';const c=$('ptIssuerSig');c?.getContext('2d')?.clearRect(0,0,c.width,c.height);scheduleSavePT();return}
    const removeEvidence=e.target.closest('[data-pt-remove-evidence]');if(removeEvidence){const i=+removeEvidence.dataset.ptRemoveEvidence;ptState.evidencePhotos.splice(i,1);const list=$('ptEvidenceList');if(list)list.innerHTML=evidenceHTML();scheduleSavePT();return}
  };
  $('ptAddWorker').onclick=e=>{e.stopPropagation();ptState.workers.push(blankWorker());renderPT();scheduleSavePT()};
  const evidenceBtn=$('ptEvidenceButton'),evidenceInput=$('ptEvidenceInput');
  if(evidenceBtn&&evidenceInput){
    evidenceBtn.onclick=e=>{e.preventDefault();e.stopPropagation();evidenceInput.click()};
    evidenceInput.onchange=async e=>{
      e.stopPropagation();
      const files=Array.from(e.target.files||[]);if(!files.length)return;
      evidenceBtn.disabled=true;evidenceBtn.textContent='⏳ Processando fotos...';
      try{
        for(const file of files){const data=await compressPTPhoto(file);if(data)ptState.evidencePhotos.push(data)}
        const list=$('ptEvidenceList');if(list)list.innerHTML=evidenceHTML();
        scheduleSavePT();showMsg(`✅ ${files.length} foto(s) adicionada(s).`);
      }catch(err){console.error('[PT PHOTO]',err);showMsg('❌ Não foi possível processar uma das fotos.','errorbox')}
      finally{evidenceInput.value='';evidenceBtn.disabled=false;evidenceBtn.textContent='📸 Adicionar Fotos do Local'}
    };
  }
  const saveBtn=$('ptSave');
  if(saveBtn)saveBtn.addEventListener('click',async e=>{
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(saveBtn.disabled)return;
    const original=saveBtn.innerHTML;saveBtn.disabled=true;saveBtn.innerHTML='⏳ Salvando PT...';
    const ok=await savePT(true,true);
    saveBtn.innerHTML=ok?'✅ PT Salva':'❌ Erro ao Salvar';
    setTimeout(()=>{if(saveBtn){saveBtn.disabled=false;saveBtn.innerHTML=original}},1000);
  },true);
  $('ptPdf').onclick=e=>{e.stopPropagation();savePT(false).then(()=>makePTPdf('download'))};
  $('ptShare').onclick=e=>{e.stopPropagation();savePT(false).then(()=>makePTPdf('share'))};
}
""",
'bind save/evidence')

rep(
"""function showMsg(text,type='successbox'){
""",
"""function setupIssuerSignature(data){
  const c=$('ptIssuerSig');if(!c)return;
  const ratio=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  const rect=c.getBoundingClientRect();c.width=Math.max(320,Math.round(rect.width*ratio));c.height=Math.round(145*ratio);
  const ctx=c.getContext('2d');ctx.lineWidth=2.2*ratio;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111827';
  if(data){const img=new Image();img.onload=()=>{ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height)};img.src=data}
  let down=false,last=null;
  const point=e=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*(c.width/r.width),y:(e.clientY-r.top)*(c.height/r.height)}};
  c.onpointerdown=e=>{down=true;last=point(e);c.setPointerCapture?.(e.pointerId);e.preventDefault()};
  c.onpointermove=e=>{if(!down)return;const p=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;e.preventDefault()};
  const end=e=>{if(!down)return;down=false;ptState.issuer.signature=c.toDataURL('image/png');scheduleSavePT();e?.preventDefault?.()};
  c.onpointerup=end;c.onpointercancel=end;c.onpointerleave=e=>{if(down)end(e)};
}

function showMsg(text,type='successbox'){
""",
'issuer signature setup')

rep(
"""  ptState.updatedAt=nowISO();ptState.issuer={name:EMISSOR_NOME,role:EMISSOR_CARGO};
""",
"""  ptState.updatedAt=nowISO();ptState.issuer={name:EMISSOR_NOME,role:EMISSOR_CARGO,signature:ptState.issuer?.signature||''};
""",
'save issuer signature')

rep(
"""  payload.workspaceKey=WORKSPACE_KEY;payload.cloudDeviceId=(localStorage.getItem('tbm-sst-device-id')||'PT');payload.cloudClientUpdatedAt=nowISO();payload.ownerUid=window.SST?.uid||'';payload.appVersion='2026.09.03.pt-altura.3';
""",
"""  payload.workspaceKey=WORKSPACE_KEY;payload.cloudDeviceId=(localStorage.getItem('tbm-sst-device-id')||'PT');payload.cloudClientUpdatedAt=nowISO();payload.ownerUid=window.SST?.uid||'';payload.appVersion='2026.09.04.pt-altura.4-sign-evidence';
""",
'PT appVersion')

rep(
"""async function imageToDataUrl(src){
  try{const r=await fetch(src,{cache:'no-store'});if(!r.ok)return null;const b=await r.blob();return await new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=no;f.readAsDataURL(b)})}catch(_){return null}
}
""",
"""async function imageToDataUrl(src){
  try{const r=await fetch(src,{cache:'no-store'});if(!r.ok)return null;const b=await r.blob();return await new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=no;f.readAsDataURL(b)})}catch(_){return null}
}
async function compressPTPhoto(file){
  if(!file)return null;
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url});
    const max=1200,scale=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
    const w=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));
    const h=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(img,0,0,w,h);
    return canvas.toDataURL('image/jpeg',0.7);
  }finally{URL.revokeObjectURL(url)}
}
""",
'photo compression')

rep(
"""  content.push(pdfSection('Responsável pela Liberação'));
  content.push({table:{widths:['50%','50%'],body:[[pdfHeader('Emissor / TST'),pdfHeader('Cargo')],[{text:EMISSOR_NOME,bold:true},{text:EMISSOR_CARGO,bold:true}]]},layout:pdfGrid,fontSize:9});
  content.push({canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:.7,lineColor:'#ccc'}],margin:[0,14,0,7]});
""",
"""  content.push(pdfSection('Responsável pela Liberação'));
  content.push({table:{widths:['50%','50%'],body:[[pdfHeader('Emissor / TST'),pdfHeader('Cargo')],[{text:EMISSOR_NOME,bold:true},{text:EMISSOR_CARGO,bold:true}]]},layout:pdfGrid,fontSize:9});
  const issuerStack=[];
  if(ptState.issuer?.signature)issuerStack.push({image:ptState.issuer.signature,fit:[220,70],alignment:'center',margin:[0,8,0,4]});else issuerStack.push({text:'',margin:[0,0,0,62]});
  issuerStack.push({canvas:[{type:'line',x1:70,y1:0,x2:445,y2:0,lineWidth:.8,lineColor:'#222'}],margin:[0,0,0,5]});
  issuerStack.push({text:EMISSOR_NOME,bold:true,alignment:'center',fontSize:9});
  issuerStack.push({text:EMISSOR_CARGO,alignment:'center',fontSize:8,margin:[0,2,0,0]});
  content.push({stack:issuerStack,margin:[0,3,0,6]});
  if(ptState.evidencePhotos?.length){
    content.push(pdfSection('Evidências Fotográficas do Local'));
    const photoRows=[];
    for(let i=0;i<ptState.evidencePhotos.length;i+=2){
      const cell=j=>j<ptState.evidencePhotos.length?{stack:[{image:ptState.evidencePhotos[j],fit:[235,170],alignment:'center'},{text:`Foto ${j+1}`,alignment:'center',fontSize:7.5,margin:[0,4,0,0]}],margin:[4,6,4,6]}:{text:''};
      photoRows.push([cell(i),cell(i+1)]);
    }
    content.push({table:{widths:['*','*'],body:photoRows},layout:'noBorders',margin:[0,4,0,4]});
  }
  content.push({canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:.7,lineColor:'#ccc'}],margin:[0,14,0,7]});
""",
'PDF issuer/evidence')

# marcador público de versão
rep(
"""window.PT_ALTURA_EMISSOR={name:EMISSOR_NOME,role:EMISSOR_CARGO};
""",
"""window.PT_ALTURA_EMISSOR={name:EMISSOR_NOME,role:EMISSOR_CARGO};
window.__tbmPTAlturaVersion='2026.09.04.pt-altura.4-sign-evidence';
""",
'version marker')

p.write_text(s,encoding='utf-8')
print('PT ajustada: assinatura do emissor, evidências fotográficas e salvar robusto.')
