/* Integração SST — carregamento robusto, sem travar a tela inicial */
(()=>{
'use strict';
const VERSION='20260904-24-logo-pdf';
// LOGO TBM (PLACEHOLDER PROVISÓRIO): substitua SOMENTE a string Base64 abaixo pela logo corporativa real em PNG.
const logoTBM='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAB4CAIAAABTvTPAAAAD80lEQVR42u3YP0jVWwDA8XP/YCikoVtDgxFEwgUTJLuBP1HulRrcmhyc3FwEbRCaawkhGmoRd0HBJUvExS44XCMo59DdP+P14nnDDy51X95XvPd49fp8Fn/ncLxXjvDlnF8mxhgAfgVZWwD8KvLpj0wmYy+An1Z6F3TCAlwJAf6lK2HTuQvgZ9D0tsoJC3AlBBAsQLAABAtAsADBAhAsAMECBAtAsAAECxAsAMECECxAsAAEC0CwAMECECwAwQIEC0CwAAQLECwAwQIQLECwAAQLECxbAAgWgGABggUgWACCBQgWgGABCBYgWACCBSBYgGABCBaAYAGCBSBYAIIFCBaAYAEIFiBYAIIFIFi0dOXKlaaZpaWlgYGBoaGhgYGB5eXldPLVq1eDg4N37969f//+4eFhi5UhhNXV1SRJkiTJ5/Ppw8rKSkdHR5Ikw8PD/f396+vrIYT29vaHDx82fmtycrK9vd1/hK/EGGOMTUN+W11dXV8OX79+XSwWj46OYoxHR0fFYvHt27dv3rwZHx+v1WoxxidPnpRKpYtWtvjwxvP79++vXbuWzhQKhXq9HmM8Pz+/c+dO0x/Db6i5VIJFi2CNjo6+e/euMdzZ2RkbGyuVSru7u+nM6enpxMREvV7/5srvCdb5+Xlvb286MzU1ValUYozVanV6elqwaEqTKyGt7O/v9/f3N4a3b9/+9OnTx48fC4VCOnP58uW1tbVcLvfNld/zFVtbW4uLi+lzuVze2NgIIWxsbJTLZfuPd1j8rRcImUymXq+nw2fPniVJcvPmzYtWtvioWq2WJMnQ0FC5XH7+/Hk6WSqVNjc304qNjY3ZcASLH3Dr1q1qtdoYVqvVvr6+GzdufPjwIYQwOzu7trb2+fPni1a2+OS2trbt7e1KpbK3t7e7u5tOdnd3Z7PZg4ODEEJnZ6f9R7D4AXNzc/Pz8ycnJyGE4+PjR48ezc/PT09PP378+OzsLITw4sWLXC530crv+Yqenp7r1683huPj4wsLC45XfFPeFtB0U7t37176XCwWnz59enh4ODIycunSpVqtNjMzMzo6GmPc398vFApXr16dnJzM5/Ppbe7PK//ySpjNZkMIL1++bMw/ePBgYWEhPcFBk0z6Hr7xuuHL1/IA/3Ghvk6TKyHwyxAsQLAABAsQLADBAhAsQLAABAtAsADBAhAsAMECBAtAsAAECxAsAMECECxAsAAEC0CwAMECECwAwQIEC0CwAAQLECwAwQIEyxYAggUgWIBgAQgWgGABggUgWACCBQgWgGABCBYgWACCBSBYgGABCBaAYAH/I/mmcSaTsSmAExaAYAG/h0yM0S4ATlgA/6Q/AL+7uXWH+uJrAAAAAElFTkSuQmCC';
window.logoTBM=logoTBM;
window.tbmLogoTBM=logoTBM;
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

  function ensureCorporatePdfLogo(docDefinition){
    if(!docDefinition||typeof docDefinition!=='object'||!Array.isArray(docDefinition.content))return docDefinition;
    const content=docDefinition.content;
    const already=content.slice(0,3).some(node=>node&&node.image===logoTBM&&node.alignment==='center');
    if(already)return docDefinition;
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
    content.unshift({image:logoTBM,width:100,alignment:'center',margin:[0,0,0,10]});
    return docDefinition;
  }

  function enforce(docDefinition){
    if(!docDefinition||typeof docDefinition!=='object')return docDefinition;
    ensureCorporatePdfLogo(docDefinition);
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
    try{enforce(docDefinition)}catch(err){console.warn('[PDF STATUS PREMIUM GLOBAL]',err)}
    return original(docDefinition,...args);
  };
  wrapped.__tbmPremiumStatusBase=true;
  wrapped.__tbmOriginal=original;
  pm.createPdf=wrapped;
  window.tbmPremiumStatusCell=premiumStatusCell;
  window.tbmEnforcePremiumPdfStatus=enforce;
  window.tbmEnsureCorporatePdfLogo=ensureCorporatePdfLogo;
  window.__tbmPremiumPdfStatusVersion='2026.09.04.2-global-logo-contrast';
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