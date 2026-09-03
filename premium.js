(()=>{
'use strict';

/*
  V13 — camada de correção sem substituir a estrutura principal.
  Mantém GPS, IndexedDB, Firebase, fotos, PDF e layout existentes.
*/
const LOGO='Têxtil Bezerra de Menezes 2.jpeg';
const LIGHT=['Luminária fixada corretamente?','Bateria/Teste funcionando?','Cabos bem isolados?'];
const ALARM=['Acionador manual desobstruído?','Sinal sonoro audível?','Painel central sem erro?'];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));

const extra=()=>window.__tbmExtra||[];
const setExtra=a=>{window.__tbmExtra=Array.isArray(a)?a:[]};

function css(){
  if($('tbmV13'))return;
  const s=document.createElement('style');
  s.id='tbmV13';
  s.textContent=`
    .logo{height:58px!important;width:auto!important;max-width:210px!important;object-fit:contain!important;background:#fff!important;padding:5px!important;border-radius:10px!important}
    .reportLogo{width:105px!important;height:78px!important;object-fit:contain!important;background:#fff!important;padding:3px!important;border-radius:6px!important}
    .premium-extra{border-left:4px solid #8b1018!important;background:#fbfcfe!important}
    .premium-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}
    .premium-meta label{display:block;font-size:11px;font-weight:900;margin-bottom:5px}
    .premium-meta input{width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;color:#17202b}
    .premium-extra .check{margin:8px 0}
    .photoTools{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    .photoTools button{min-height:46px;touch-action:manipulation}
    .photoCard{break-inside:avoid;page-break-inside:avoid}
    .sigwrap{background:#fff!important;border:2px solid #94a3b8!important;box-shadow:inset 0 0 0 1px #e2e8f0,0 8px 22px #0002!important}
    .sigwrap canvas{background:#fff!important;color:#111827!important;border:0!important;touch-action:none!important;cursor:crosshair!important;display:block!important;width:100%!important;height:140px!important;position:relative!important;z-index:2!important}
    .sigwrap:before{background:#f8fafc!important;color:#64748b!important}
    .reportPage{font-family:Arial,Helvetica,sans-serif!important;color:#111!important;background:#fff!important}
    .reportPage .rtable tbody tr:nth-child(even){background:#f8fafc}
    .reportPage .rtable tr,.reportPage .rphotos figure,.reportPage .rsigs,.reportPage .rsig{break-inside:avoid;page-break-inside:avoid}
    .reportPage .rphotos{grid-template-columns:repeat(2,1fr)!important}
    @media(max-width:560px){
      .logo{height:52px!important;max-width:180px!important}
      .premium-meta{grid-template-columns:1fr}
      .photoTools{grid-template-columns:1fr}
      .reportPage .rphotos{grid-template-columns:1fr 1fr!important}
      .sigwrap canvas{height:160px!important}
    }
  `;
  document.head.appendChild(s);
}

function logo(){
  document.querySelectorAll('img.logo,img.reportLogo').forEach(i=>{
    i.src=LOGO;
    i.alt='Têxtil Bezerra de Menezes';
    i.loading='eager';
    i.decoding='async';
  });
}

function compressImage(file){
  return new Promise((resolve,reject)=>{
    if(!file || !file.type.startsWith('image/'))return reject(new Error('Arquivo não é uma imagem.'));
    const url=URL.createObjectURL(file);
    const img=new Image();
    let done=false;
    const finish=(fn,v)=>{if(done)return;done=true;URL.revokeObjectURL(url);fn(v)};
    img.onload=()=>{
      try{
        const max=800;
        let w=img.naturalWidth||img.width||1;
        let h=img.naturalHeight||img.height||1;
        const scale=Math.min(1,max/Math.max(w,h));
        w=Math.max(1,Math.round(w*scale));
        h=Math.max(1,Math.round(h*scale));
        const c=document.createElement('canvas');
        c.width=w;c.height=h;
        const ctx=c.getContext('2d',{alpha:false,desynchronized:true});
        if(!ctx)throw new Error('Canvas indisponível.');
        ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
        ctx.drawImage(img,0,0,w,h);
        c.toBlob(blob=>{
          if(!blob)return finish(reject,new Error('Falha ao comprimir imagem.'));
          const name=(file.name||'foto').replace(/\.[^.]+$/,'')+'.jpg';
          finish(resolve,new File([blob],name,{type:'image/jpeg',lastModified:Date.now()}));
        },'image/jpeg',0.76);
      }catch(e){finish(reject,e)}
    };
    img.onerror=()=>finish(reject,new Error('Não foi possível ler a imagem.'));
    img.src=url;
  });
}

async function processFiles(files){
  const out=[];
  for(const f of [...(files||[])]){
    if(!f.type.startsWith('image/'))continue;
    try{out.push(await compressImage(f))}catch(e){console.warn('Foto ignorada:',e)}
  }
  return out;
}

function photo(){
  const i=$('photoInput');
  if(!i||i.dataset.tbmPhotoV13)return;
  i.dataset.tbmPhotoV13='1';
  const old=i.onchange;
  i.onchange=async e=>{
    const files=[...(e.target.files||[])];
    if(!files.length)return;
    try{
      const processed=await processFiles(files);
      const dt=new DataTransfer();
      processed.forEach(f=>dt.items.add(f));
      try{Object.defineProperty(i,'files',{configurable:true,value:dt.files})}catch(_){ }
      if(typeof old==='function')await old.call(i,{target:i});
    }catch(err){
      console.error('Processamento fotográfico:',err);
      alert('Não foi possível processar uma ou mais fotos.');
    }finally{i.value='';}
  };
}

function photoButtons(){
  const i=$('photoInput');
  if(!i||document.querySelector('.photoTools'))return;
  const t=document.createElement('div');
  t.className='photoTools';
  const camera=document.createElement('button');
  const gallery=document.createElement('button');
  camera.type=gallery.type='button';
  camera.className=gallery.className='btn secondary';
  camera.textContent='📷 TIRAR FOTO';
  gallery.textContent='🖼️ ESCOLHER DA GALERIA';
  camera.onclick=()=>{i.setAttribute('capture','environment');i.click()};
  gallery.onclick=()=>{i.removeAttribute('capture');i.click()};
  t.append(camera,gallery);
  i.insertAdjacentElement('afterend',t);
}

function normalizeExtra(e){
  return {
    kind:e.kind==='alarm'?'alarm':'light',
    status:e.status||'PENDENTE',
    patrimonio:e.patrimonio||'',
    localizacao:e.localizacao||'',
    obs:e.obs||'',
    checks:Array.isArray(e.checks)?[...e.checks]:[]
  };
}

function addPremium(kind){
  const a=extra();
  a.push(normalizeExtra({kind,status:'PENDENTE',patrimonio:'',localizacao:'',obs:'',checks:(kind==='light'?LIGHT:ALARM).map(()=> 'PENDENTE')}));
  setExtra(a);
  window.renderEquipment?.();
  window.scheduleSave?.();
}

window.adicionarIluminacao=()=>addPremium('light');
window.adicionarSirene=()=>addPremium('alarm');

const oldAdd=window.addEquipment;
window.addEquipment=function(k){
  if(k==='light'||k==='alarm')return addPremium(k);
  return oldAdd?.(k);
};

const oldRender=window.renderEquipment;
window.renderEquipment=function(){
  oldRender?.();
  const list=$('equipmentList');
  if(!list)return;
  list.querySelectorAll('.premium-extra').forEach(x=>x.remove());
  extra().forEach((e,n)=>{
    const qs=e.kind==='light'?LIGHT:ALARM;
    const t=document.createElement('div');
    t.className='equipment premium-extra';
    t.innerHTML=`
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <h3>${e.kind==='light'?'💡 Iluminação de Emergência':'🚨 Sirene / Alarme'} #${n+1}</h3>
        <button type="button" class="btn danger no-print" data-tbm-del="${n}" style="padding:7px 9px">Excluir</button>
      </div>
      <div class="premium-meta">
        <div><label>Patrimônio (opcional)</label><input data-tbm-e="${n}" data-tbm-k="patrimonio" value="${esc(e.patrimonio)}"></div>
        <div><label>Localização</label><input data-tbm-e="${n}" data-tbm-k="localizacao" value="${esc(e.localizacao)}"></div>
      </div>
      <div class="title" style="font-size:13px;margin:12px 0 7px">Checklist</div>
      ${qs.map((q,j)=>`<div class="check"><div class="checkrow"><b style="font-size:12px">${j+1}. ${esc(q)}</b><select data-tbm-e="${n}" data-tbm-q="${j}"><option ${e.checks[j]==='CONFORME'?'selected':''}>CONFORME</option><option ${e.checks[j]==='NÃO CONFORME'?'selected':''}>NÃO CONFORME</option><option ${e.checks[j]==='PENDENTE'?'selected':''}>PENDENTE</option><option ${e.checks[j]==='N/A'?'selected':''}>N/A</option></select></div></div>`).join('')}
      <div class="field" style="margin-top:10px"><label>Observações</label><textarea data-tbm-e="${n}" data-tbm-k="obs">${esc(e.obs)}</textarea></div>`;
    list.appendChild(t);
  });
};

function buttons(){
  const h=$('addHid');
  if(!h||$('addIluminacao'))return;
  const items=[
    ['addIluminacao','➕ Iluminação','adicionarIluminacao'],
    ['addSirene','➕ Sirene/Alarme','adicionarSirene']
  ];
  let after=h;
  for(const [id,text,fn] of items){
    const b=document.createElement('button');
    b.id=id;b.type='button';b.className=h.className;b.textContent=text;
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window[fn]();});
    after.insertAdjacentElement('afterend',b);
    after=b;
  }
}

const oldPut=window.idbPut;
if(oldPut&&!window.__tbmPutV13){
  window.__tbmPutV13=1;
  window.idbPut=async x=>{
    const y=JSON.parse(JSON.stringify(x));
    const ex=extra();
    if(ex.length)y.equipment=[...(y.equipment||[]),...ex.map(normalizeExtra).map(e=>({kind:e.kind,status:e.status,patrimonio:e.patrimonio,localizacao:e.localizacao,obs:e.obs,premiumChecks:e.checks}))];
    return oldPut(y);
  };
}

const oldCloud=window.cloudSafe;
if(oldCloud&&!window.__tbmCloudV13){
  window.__tbmCloudV13=1;
  window.cloudSafe=x=>{
    const y=oldCloud(x);
    const ex=extra();
    if(ex.length)y.equipment=[...(y.equipment||[]),...ex.map(normalizeExtra).map(e=>({kind:e.kind,status:e.status,patrimonio:e.patrimonio,localizacao:e.localizacao,obs:e.obs,premiumChecks:e.checks}))];
    return y;
  };
}

const oldReset=window.reset;
if(oldReset&&!window.__tbmResetV13){
  window.__tbmResetV13=1;
  window.reset=k=>{setExtra([]);return oldReset(k)};
}

const oldGet=window.idbGet;
if(oldGet&&!window.__tbmGetV13){
  window.__tbmGetV13=1;
  window.idbGet=async id=>{
    const x=await oldGet(id);
    if(x){
      setExtra((x.equipment||[]).filter(e=>e.kind==='light'||e.kind==='alarm').map(e=>normalizeExtra({kind:e.kind,status:e.status,patrimonio:e.patrimonio,localizacao:e.localizacao,obs:e.obs,checks:e.premiumChecks||e.checks||[]})));
    }
    return x;
  };
}

function events(){
  if(document.body.dataset.tbmV13Events)return;
  document.body.dataset.tbmV13Events='1';
  document.addEventListener('input',e=>{
    const i=e.target.dataset.tbmE,k=e.target.dataset.tbmK;
    if(i===undefined||!k)return;
    const a=extra();
    if(a[+i]){a[+i][k]=e.target.value;setExtra(a);window.scheduleSave?.()}
  });
  document.addEventListener('change',e=>{
    const i=e.target.dataset.tbmE,q=e.target.dataset.tbmQ;
    if(i===undefined||q===undefined)return;
    const a=extra();
    if(a[+i]){a[+i].checks[+q]=e.target.value;setExtra(a);window.scheduleSave?.()}
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-tbm-del]');
    if(!b)return;
    const a=extra();a.splice(+b.dataset.tbmDel,1);setExtra(a);window.renderEquipment?.();window.scheduleSave?.();
  });
}

/*
  CORREÇÃO DEFINITIVA DO CANVAS DE ASSINATURA
  O problema era o canvas ser dimensionado enquanto o formulário estava
  escondido. Nesse momento getBoundingClientRect() retornava largura 0.
  Não substituímos setupSigs nem tocamos no state original: apenas
  chamamos a função original depois que #form estiver realmente visível.
*/
function refreshSignatures(){
  const form=$('form');
  if(!form||form.classList.contains('hidden'))return;
  setTimeout(()=>{
    try{
      if(typeof window.setupSigs==='function')window.setupSigs();
    }catch(e){console.error('Assinaturas SST:',e)}
  },80);
}

function signatureFix(){
  const form=$('form');
  if(!form||form.dataset.tbmSignatureFix)return;
  form.dataset.tbmSignatureFix='1';
  const observer=new MutationObserver(()=>{
    if(!form.classList.contains('hidden'))refreshSignatures();
  });
  observer.observe(form,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',()=>{
    if(!form.classList.contains('hidden'))refreshSignatures();
  },{passive:true});
  if(!form.classList.contains('hidden'))refreshSignatures();
}

function reportPatch(){
  if(typeof window.reportHTML!=='function'||window.__tbmReportV13)return;
  window.__tbmReportV13=1;
  const old=window.reportHTML;
  window.reportHTML=x=>{
    let h=old(x).replaceAll('src="icon.svg"',`src="${LOGO}"`);
    const ex=(x.equipment||[]).filter(e=>e.kind==='light'||e.kind==='alarm');
    if(ex.length){
      const rows=ex.map((e,i)=>{
        const label=e.kind==='light'?'Iluminação de Emergência':'Sirene / Alarme';
        const qs=e.kind==='light'?LIGHT:ALARM;
        const checks=e.premiumChecks||e.checks||[];
        return `<tr><td>${label} #${i+1}</td><td>${esc(e.patrimonio||'Não informado')}</td><td>${esc(e.localizacao||'Não informado')}</td><td>${esc(e.status||'PENDENTE')}</td><td>${qs.map((q,j)=>esc(q)+': '+esc(checks[j]||'PENDENTE')).join(' • ')}${e.obs?' • '+esc(e.obs):''}</td></tr>`;
      }).join('');
      const block=`<div class="rsection"><div class="rtitle">Iluminação de emergência e alarme</div><table class="rtable"><tr><th>Equipamento</th><th>Patrimônio</th><th>Localização</th><th>Situação</th><th>Checklist / Observação</th></tr>${rows}</table></div>`;
      const marker='<div class="rsection"><div class="rtitle">Checklist de inspeção</div>';
      h=h.includes(marker)?h.replace(marker,block+marker):h+block;
    }
    return h;
  };
  const oldPdf=window.makePdf;
  if(typeof oldPdf==='function'&&!window.__tbmPdfV13){
    window.__tbmPdfV13=1;
    window.makePdf=async share=>{
      const c=$('reportContent');
      if(c){
        const imgs=[...c.querySelectorAll('img')];
        await Promise.all(imgs.map(im=>im.complete?Promise.resolve():new Promise(r=>{im.onload=im.onerror=r})));
      }
      return oldPdf(share);
    };
  }
}

function setup(){
  css();logo();buttons();photo();photoButtons();events();signatureFix();reportPatch();
  setTimeout(()=>{css();logo();buttons();photo();photoButtons();signatureFix();reportPatch();refreshSignatures()},700);
  setTimeout(()=>{logo();buttons();photo();photoButtons();signatureFix();refreshSignatures()},1800);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
