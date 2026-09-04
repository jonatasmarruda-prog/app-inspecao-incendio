/* Integração SST — carregamento robusto, sem travar a tela inicial */
(()=>{
'use strict';
const VERSION='20260904-27-audit-stable';
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
carregarLogo(LOGO_TBM_URL).catch(err=>console.warn('[LOGO TBM]',err));
window.SSTAppModules=window.SSTAppModules||{};

/*
 * PADRÃO PREMIUM GLOBAL DE STATUS NO PDFMAKE
 * Esta camada é instalada ANTES das demais camadas de PDF.
 * Como os wrappers posteriores chamam esta função por último antes do pdfMake original,
 * ela é a barreira final de contraste para TODOS os módulos do sistema.
 */
function installPremiumPdfStatusBase(){
  const pm=window.pdfMake;
  if(!pm||typeof pm.createPdf!=='function')return false;
  if(pm.createPdf.__tbmPremiumStatusBase)return true;

  const original=pm.createPdf.bind(pm);
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/\s+/g,' ');
  const canonical=v=>{
    const s=norm(v);
    if(s==='CONFORME')return 'CONFORME';
    if(s==='NAO CONFORME')return 'NÃO CONFORME';
    if(s==='N/A'||s==='NA'||s==='N.A.'||s==='N.A')return 'N/A';
    if(s==='PENDENTE')return 'PENDENTE';
    return '';
  };
  const textOf=cell=>{
    if(cell==null)return'';
    if(typeof cell==='string'||typeof cell==='number'||typeof cell==='boolean')return String(cell);
    if(Array.isArray(cell))return cell.map(textOf).join(' ').trim();
    if(typeof cell==='object'){
      if(cell.text!=null)return textOf(cell.text);
      if(Array.isArray(cell.stack))return cell.stack.map(textOf).join(' ').trim();
    }
    return'';
  };
  const evidenceOf=cell=>{
    let found='';
    const seen=new WeakSet();
    const walk=node=>{
      if(found||!node||typeof node!=='object'||seen.has(node))return;
      seen.add(node);
      if(typeof node.image==='string'&&node.image){found=node.image;return}
      if(Array.isArray(node)){for(const x of node){walk(x);if(found)break}return}
      for(const key of Object.keys(node)){
        if(key==='svg'||key==='canvas'||key==='qr'||typeof node[key]==='function')continue;
        walk(node[key]);if(found)break;
      }
    };
    walk(cell);return found;
  };
  const premiumStatusCell=(status,fotoEvidencia='')=>({
    stack:[
      {text:status,bold:true,alignment:'center',color:'#ffffff'},
      fotoEvidencia?{image:fotoEvidencia,fit:[80,80],alignment:'center',margin:[0,5,0,0]}:null
    ].filter(Boolean),
    fillColor:status==='CONFORME'?'#198754':(status==='NÃO CONFORME'?'#dc3545':'#6c757d'),
    margin:[0,5,0,5]
  });

  function ensureCorporatePdfLogo(docDefinition,logoConvertida=window.logoTBM||logoTBM){
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
    ensureCorporatePdfLogo(docDefinition,logoConvertida);
    const seen=new WeakSet();
    const walk=node=>{
      if(!node||typeof node!=='object'||seen.has(node))return;
      seen.add(node);
      if(Array.isArray(node)){node.forEach(walk);return}
      const body=node.table?.body;
      if(Array.isArray(body)){
        body.forEach(row=>{
          if(!Array.isArray(row))return;
          for(let i=0;i<row.length;i++){
            const status=canonical(textOf(row[i]));
            if(status){
              row[i]=premiumStatusCell(status,evidenceOf(row[i]));
            }else{
              walk(row[i]);
            }
          }
        });
      }
      for(const key of Object.keys(node)){
        if(key==='table'||key==='image'||key==='svg'||key==='canvas'||key==='qr'||typeof node[key]==='function')continue;
        walk(node[key]);
      }
    };
    walk(docDefinition);
    return docDefinition;
  }

  const wrapped=function(docDefinition,...args){
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
  };
  wrapped.__tbmPremiumStatusBase=true;
  wrapped.__tbmOriginal=original;
  pm.createPdf=wrapped;
  window.tbmPremiumStatusCell=premiumStatusCell;
  window.tbmEnforcePremiumPdfStatus=enforce;
  window.tbmEnsureCorporatePdfLogo=ensureCorporatePdfLogo;
  window.__tbmPremiumPdfStatusVersion='2026.09.04.4-external-logo-base64';
  return true;
}

if(!installPremiumPdfStatusBase()){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(installPremiumPdfStatusBase()||tries>=20)clearInterval(timer);
  },100);
}

function load(src){return new Promise((resolve,reject)=>{if(src==='sst-modulos.js'&&typeof window.openSSTModule==='function')return resolve(true);const s=document.createElement('script');s.src='./'+src+'?v='+VERSION+'&t='+Date.now();s.async=false;s.onload=()=>resolve(true);s.onerror=()=>reject(new Error(src));document.head.appendChild(s)})}
function fallback(type){
 const names={seg:['🦺','Inspeção de Segurança','Condições e irregularidades'],machine:['⚙️','Máquinas e Equipamentos','Checklist NR-12'],epi:['🧤','Inspeção de EPI','Controle e conformidade'],accident:['⚠️','Investigação de Acidente','Registro e causas'],report:['📋','Relatório de Inspeção','Irregularidade e melhoria']};
 const n=names[type]||names.seg;
 let old=document.getElementById('sst-fallback'); if(old)old.remove();
 const o=document.createElement('div');o.id='sst-fallback';o.style='position:fixed;inset:0;z-index:10000;background:#f1f5f9;overflow:auto';
 o.innerHTML='<div style="position:sticky;top:0;z-index:2;background:linear-gradient(135deg,#991b1b,#dc2626);color:#fff;padding:16px"><div style="max-width:900px;margin:auto;display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:20px;font-weight:900">'+n[0]+' '+n[1]+'</div><div style="font-size:12px">'+n[2]+' • OFFLINE</div></div><button id="sstFallbackClose" style="padding:10px 14px;border:0;border-radius:10px;font-weight:900">✕ Fechar</button></div></div><div style="max-width:900px;margin:auto;padding:14px"><div style="background:#fff;border-radius:16px;padding:16px;box-shadow:0 2px 12px #0001"><div style="background:#fee2e2;color:#991b1b;padding:10px;border-radius:9px;margin-bottom:12px"><b>Modo de contingência ativado.</b><br>O módulo abriu sem depender do carregamento externo.</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px"><label><b>Empresa</b><input id="sf-company" value="TBM Têxtil" style="width:100%;padding:11px;margin-top:5px;border:1px solid #cbd5e1;border-radius:9px"></label><label><b>Setor</b><input id="sf-sector" style="width:100%;padding:11px;margin-top:5px;border:1px solid #cbd5e1;border-radius:9px"></label><label><b>Local</b><input id="sf-place" style="width:100%;padding:11px;margin-top:5px;border:1px solid #cbd5e1;border-radius:9px"></label><label><b>Data</b><input id="sf-date" type="date" value="'+new Date().toISOString().slice(0,10)+'" style="width:100%;padding:11px;margin-top:5px;border:1px solid #cbd5e1;border-radius:9px"></label></div><label style="display:block;margin-top:10px"><b>Descrição / irregularidade</b><textarea id="sf-desc" style="width:100%;min-height:110px;padding:11px;margin-top:5px;border:1px solid #cbd5e1;border-radius:9px"></textarea></label><label style="display:block;margin-top:10px"><b>Sugestão de melhoria / ação</b><textarea id="sf-action" style="width:100%;min-height:90px;padding:11px;margin-top:5px;border:1px solid #cbd5e1;border-radius:9px"></textarea></label><label style="display:block;margin-top:10px"><b>Inspetor</b><input id="sf-inspector" value="Jonatas Marques de Arruda" style="width:100%;padding:11px;margin-top:5px;border:1px solid #cbd5e1;border-radius:9px"></label><div id="sf-msg" style="display:none;padding:10px;border-radius:9px;margin-top:12px"></div><button id="sf-save" style="width:100%;margin-top:12px;padding:13px;border:0;border-radius:10px;background:#15803d;color:#fff;font-weight:900">💾 SALVAR INSPEÇÃO</button><button id="sf-print" style="width:100%;margin-top:8px;padding:13px;border:0;border-radius:10px;background:#b91c1c;color:#fff;font-weight:900">📄 GERAR RELATÓRIO / PDF</button></div></div>';
 document.body.appendChild(o);
 document.getElementById('sstFallbackClose').onclick=()=>o.remove();
 const data=()=>({id:Date.now(),type,title:n[1],company:document.getElementById('sf-company').value,sector:document.getElementById('sf-sector').value,place:document.getElementById('sf-place').value,date:document.getElementById('sf-date').value,description:document.getElementById('sf-desc').value,action:document.getElementById('sf-action').value,inspector:document.getElementById('sf-inspector').value});
 document.getElementById('sf-save').onclick=()=>{localStorage.setItem('sst_fallback_'+Date.now(),JSON.stringify(data()));const m=document.getElementById('sf-msg');m.style.display='block';m.style.background='#dcfce7';m.style.color='#166534';m.textContent='✅ Inspeção salva no aparelho.'};
 document.getElementById('sf-print').onclick=()=>{const x=data(),w=window.open('','_blank');if(!w){alert('Permita pop-ups para gerar o relatório.');return}w.document.write('<html><head><meta charset="utf-8"><title>'+n[1]+'</title><style>body{font-family:Arial;margin:35px}h1{border-bottom:3px solid #b91c1c;padding-bottom:10px}.box{line-height:1.8;border:1px solid #ddd;padding:15px} .sig{margin-top:70px;display:flex;gap:80px}.line{border-top:1px solid #111;width:240px;padding-top:5px}</style></head><body><h1>'+n[0]+' '+n[1]+'</h1><div class="box"><b>Data:</b> '+x.date+'<br><b>Empresa:</b> '+x.company+'<br><b>Setor:</b> '+x.sector+'<br><b>Local:</b> '+x.place+'<br><b>Descrição / irregularidade:</b><br>'+x.description.replace(/\n/g,'<br>')+'<br><b>Ação / melhoria:</b><br>'+x.action.replace(/\n/g,'<br>')+'<br><b>Inspetor:</b> '+x.inspector+'</div><div class="sig"><div class="line">'+x.inspector+'<br>Inspetor</div><div class="line">Responsável / Acompanhante</div></div><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>');w.document.close()};
}
async function ensure(){if(typeof window.openSSTModule==='function')return true;try{await load('sst-modulos.js')}catch(e){console.warn('SST externo indisponível; usando contingência',e)}return typeof window.openSSTModule==='function'}
function bind(){const map={startSafety:'seg',startMachine:'machine',startEpi:'epi',startAccident:'accident',startReport:'report'};for(const [id,type] of Object.entries(map)){const b=document.getElementById(id);if(!b||b.dataset.sstBound==='1')continue;b.dataset.sstBound='1';b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();if(await ensure()){window.openSSTModule(type)}else{fallback(type)}})}}
window.SSTAppModules.ready=ensure();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
[300,1000,2500,5000].forEach(ms=>setTimeout(bind,ms));
})();