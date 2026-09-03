(()=>{
'use strict';

const CNPJ='07.603.376/0003-00';
const LOGO='Têxtil Bezerra de Menezes 2.jpeg';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtBR=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})};
const nowBR=()=>fmtBR(new Date());
const val=(o,...keys)=>{for(const k of keys){if(o&&o[k]!=null&&String(o[k]).trim()!=='')return o[k]}return'—'};
const company=x=>x.company==='Outro'?(x.otherCompany||'—'):(x.company||'—');
const inspector=x=>x.inspector==='Outro'?(x.inspectorOther||'—'):(x.inspector||'—');
const typeName=x=>({fire:'Combate a Incêndio',safety:'Inspeção de Segurança',machine:'Máquinas e Equipamentos',epi:'Inspeção de EPI',accident:'Investigação de Acidente',report:'Relatório de Inspeção'})[x?.type]||x?.title||'Inspeção de Segurança';
const checksFor=x=>(window.TYPES&&window.TYPES[x.type]&&Array.isArray(window.TYPES[x.type].checks))?window.TYPES[x.type].checks:[];
const row=(label,value)=>`<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;

const css=`
.pdf-enterprise{width:100%;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.5;box-sizing:border-box}
.pdf-enterprise *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
.pdf-page{width:100%;background:#fff;color:#111;margin:0;padding:0}
.pdf-header{display:grid;grid-template-columns:82px minmax(0,1fr) 175px;gap:12px;align-items:center;border-bottom:1.5px solid #222;padding:0 0 12px;margin:0 0 14px;break-inside:avoid;page-break-inside:avoid}
.pdf-logo{width:76px;height:58px;object-fit:contain;background:#fff;padding:2px;border-radius:4px}
.pdf-title{font-size:16pt!important;font-weight:700!important;line-height:1.25!important;margin:0!important;color:#111!important;text-transform:uppercase}
.pdf-module{font-size:12pt!important;line-height:1.5!important;margin:3px 0 0!important;color:#111!important}
.pdf-id{text-align:right;font-size:12pt;font-weight:700;line-height:1.4;white-space:nowrap;overflow:visible;word-break:normal}
.pdf-id small{display:block;font-size:10pt;font-weight:400;white-space:nowrap;margin-top:2px}
.pdf-section{margin:14px 0 0;border:1px solid #ddd;break-inside:avoid;page-break-inside:avoid}
.pdf-section-title{background:#f4f4f4;color:#111;font-size:14pt;font-weight:700;padding:8px;border-bottom:1px solid #ddd;line-height:1.35;break-after:avoid;page-break-after:avoid}
.pdf-table{width:100%;border-collapse:collapse;border-spacing:0;table-layout:fixed;break-inside:avoid;page-break-inside:avoid}
.pdf-table th,.pdf-table td{border:1px solid #ddd;padding:7px 8px;color:#111;font-size:12pt;line-height:1.5;text-align:left;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere}
.pdf-table th{background:#f4f4f4;font-weight:700}
.pdf-table tbody tr:nth-child(even) td{background:#fafafa}
.pdf-table tr{break-inside:avoid;page-break-inside:avoid}
.pdf-label{width:25%;font-weight:700;background:#f4f4f4!important}
.pdf-summary{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #ddd;margin:14px 0 0;break-inside:avoid;page-break-inside:avoid}
.pdf-summary>div{text-align:center;padding:8px;border-right:1px solid #ddd}.pdf-summary>div:last-child{border-right:0}.pdf-summary b{display:block;font-size:16pt}.pdf-summary span{font-size:11pt}
.pdf-check-item{display:grid;grid-template-columns:minmax(0,1fr) 150px}.pdf-check-item>div{padding:7px 8px;border-right:1px solid #ddd}.pdf-check-item>div:last-child{border-right:0;text-align:center;font-weight:700}
.pdf-photo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:10px;break-inside:avoid;page-break-inside:avoid}
.pdf-photo{border:1px solid #ddd;padding:6px;margin:0;break-inside:avoid;page-break-inside:avoid;background:#fff}
.pdf-photo img{display:block;width:100%;height:185px;object-fit:contain;background:#fff;border:1px solid #eee}
.pdf-photo figcaption{text-align:center;font-size:10pt;line-height:1.35;padding:5px 2px 1px}
.pdf-signatures{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:12px;break-inside:avoid;page-break-inside:avoid}
.pdf-signature{min-height:115px;border-top:1px solid #222;text-align:center;padding-top:6px;break-inside:avoid;page-break-inside:avoid}
.pdf-signature img{display:block;width:100%;max-width:220px;height:62px;object-fit:contain;margin:0 auto 5px}.pdf-signature-empty{height:62px}
.pdf-footer{margin-top:18px;border-top:1px solid #ccc;padding-top:8px;text-align:center;font-size:10pt;color:#333;line-height:1.4;break-inside:avoid;page-break-inside:avoid}
.pdf-footer .signature-line{margin:18px auto 4px;border-top:1px solid #222;width:280px;padding-top:5px;color:#111}
.pdf-pagebreak-avoid,.pdf-section,.pdf-table,.pdf-photo,.pdf-signatures,.pdf-signature,.pdf-summary{break-inside:avoid;page-break-inside:avoid}
@media print{
 @page{size:A4 portrait;margin:3cm 2cm 2cm 3cm}
 body{background:#fff!important;margin:0!important}
 .pdf-enterprise{margin:0!important;padding:0!important;background:#fff!important}
 .pdf-page{margin:0!important;padding:0!important}
 .pdf-section,.pdf-table,.pdf-photo,.pdf-signatures,.pdf-signature,.pdf-summary{break-inside:avoid;page-break-inside:avoid}
}
@media(max-width:650px){.pdf-header{grid-template-columns:72px minmax(0,1fr);}.pdf-id{grid-column:2;text-align:left}.pdf-photo-grid{grid-template-columns:1fr 1fr}.pdf-signatures{grid-template-columns:1fr}.pdf-check-item{grid-template-columns:1fr}}
`;
if(!document.getElementById('abnt-enterprise-style')){const s=document.createElement('style');s.id='abnt-enterprise-style';s.textContent=css;document.head.appendChild(s)}

function uniquePhotos(list){
 const seen=new Set();
 return (Array.isArray(list)?list:[]).filter(p=>{
   const key=String(p?.hash||p?.id||p?.data||'').trim();
   if(!key||seen.has(key))return false;
   seen.add(key);return true;
 });
}
function equipmentRows(x){
 return (x.equipment||[]).map((e,i)=>{
   const kind=e.kind==='ext'?'Extintor':e.kind==='hid'?'Hidrante':e.kind==='light'?'Iluminação de Emergência':e.kind==='alarm'?'Sirene / Alarme':(e.kind||'Equipamento');
   const data=[e.tipo,e.capacidade,e.localizacao,e.ultima?`Última inspeção/recarga: ${e.ultima}`:''].filter(Boolean).join(' • ')||'Não informado';
   return `<tr><td>${i+1}</td><td>${esc(kind)}</td><td>${esc(e.patrimonio||'Não informado')}</td><td>${esc(data)}</td><td>${esc(e.status||'PENDENTE')}</td><td>${esc(e.obs||'')}</td></tr>`;
 }).join('');
}
function checklistRows(x){
 const checks=checksFor(x);
 const extra=(x.equipment||[]).filter(e=>e.kind==='light'||e.kind==='alarm').flatMap(e=>Array.isArray(e.premiumChecks||e.checks)?(e.premiumChecks||e.checks):[]).map(v=>({q:'Equipamento adicional',v}));
 const rows=checks.map((q,i)=>`<tr><td>${i+1}</td><td>${esc(q)}</td><td>${esc(x.checks?.[i]||'PENDENTE')}</td></tr>`).join('');
 return rows+extra.map((z,i)=>`<tr><td>${checks.length+i+1}</td><td>${esc(z.q)}</td><td>${esc(z.v||'PENDENTE')}</td></tr>`).join('');
}
function accident(x){
 if(x.type!=='accident'||!x.accident)return '';
 const a=x.accident||{};
 const causes=Array.isArray(a.causes)?a.causes.join(', '):'Nenhuma falha classificada.';
 const actions=(a.actions||[]).map((z,i)=>`<tr><td>${i+1}</td><td>${esc(z.action||'')}</td><td>${esc(z.responsible||'')}</td><td>${esc(z.deadline||'')}</td></tr>`).join('');
 return `<div class="pdf-section"><div class="pdf-section-title">Investigação de acidente</div><table class="pdf-table"><tbody>${row('Data do acidente',a.eventDate)}${row('Hora',a.eventTime)}${row('Local / setor',a.eventLocation)}${row('Supervisor',a.supervisor)}${row('Tipo de evento',a.eventType)}${row('Gravidade',a.severity)}${row('Classe',a.class)}${row('Acidentado',a.victimName)}${row('Cargo',a.victimRole)}${row('CAT',a.cat)}${row('Tempo de empresa',a.companyTime)}${row('Tempo de função',a.functionTime)}${row('Data do ASO',a.asoDate)}${row('Falhas identificadas',causes)}</tbody></table></div><div class="pdf-section"><div class="pdf-section-title">Plano de ação</div><table class="pdf-table"><thead><tr><th>#</th><th>Ação</th><th>Responsável</th><th>Prazo</th></tr></thead><tbody>${actions||'<tr><td colspan="4">Nenhuma ação registrada.</td></tr>'}</tbody></table></div>`;
}
function moduleTitle(x){return `RELATÓRIO DE INSPEÇÃO DE SEGURANÇA DO TRABALHO - ${typeName(x)}`}

window.reportHTML=function(x){
 x=x||{};
 const checks=checksFor(x);
 const equipment=x.equipment||[];
 const statuses=[...equipment.map(e=>e.status||'PENDENTE'),...checks.map((q,i)=>x.checks?.[i]||'PENDENTE')];
 const total=statuses.length,con=statuses.filter(v=>v==='CONFORME').length,nc=statuses.filter(v=>v==='NÃO CONFORME').length,pend=statuses.filter(v=>v==='PENDENTE').length;
 const photos=uniquePhotos(x.photos);
 const photoHtml=photos.map((p,i)=>`<figure class="pdf-photo"><img src="${esc(p.data)}" alt="Evidência ${i+1}"><figcaption>Foto ${i+1} — ${esc(p.caption||'Registro fotográfico')}</figcaption></figure>`).join('');
 const signatures=`<div class="pdf-signatures"><div class="pdf-signature">${x.signature1?`<img src="${esc(x.signature1)}" alt="Assinatura do inspetor">`:'<div class="pdf-signature-empty"></div>'}<b>${esc(inspector(x))}</b><br>${esc(x.role||'Técnico de Segurança do Trabalho')}</div><div class="pdf-signature">${x.signature2?`<img src="${esc(x.signature2)}" alt="Assinatura do acompanhante">`:'<div class="pdf-signature-empty"></div>'}<b>${esc(x.witness||'Responsável / Acompanhante')}</b><br>Responsável pela Área / Acompanhante</div></div>`;
 return `<div class="pdf-enterprise"><div class="pdf-page">
 <header class="pdf-header"><img class="pdf-logo" src="${LOGO}" alt="Têxtil Bezerra de Menezes"><div><h1 class="pdf-title">${esc(moduleTitle(x))}</h1><p class="pdf-module">Documento técnico • Sistema Profissional SST</p></div><div class="pdf-id">Nº ${esc(x.id||'INS-SEM-ID')}<small>Emissão: ${esc(nowBR())}</small></div></header>
 <div class="pdf-section"><div class="pdf-section-title">Dados da Empresa</div><table class="pdf-table"><tbody>${row('Empresa / unidade',company(x))}${row('CNPJ',CNPJ)}${row('Endereço',val(x,'address'))}${row('Setor / local',val(x,'sector'))}${row('Inspetor',inspector(x))}${row('Função',val(x,'role'))}${row('Acompanhante',val(x,'witness'))}${row('Data e hora da inspeção',fmtBR(x.date))}${row('Localização GPS',x.gps?`${x.gps.lat}, ${x.gps.lng} • precisão ${Math.round(x.gps.accuracy||0)} m`:'Não capturada')}</tbody></table></div>
 <div class="pdf-summary"><div><b>${total}</b><span>Total</span></div><div><b>${con}</b><span>Conformes</span></div><div><b>${nc}</b><span>Não conformes</span></div><div><b>${pend}</b><span>Pendentes</span></div></div>
 ${equipment.length?`<div class="pdf-section"><div class="pdf-section-title">Equipamentos / Serviços Realizados</div><table class="pdf-table"><thead><tr><th style="width:6%">#</th><th>Equipamento</th><th>Patrimônio</th><th>Dados / Localização</th><th style="width:18%">Situação</th><th>Observações</th></tr></thead><tbody>${equipmentRows(x)}</tbody></table></div>`:''}
 ${checks.length?`<div class="pdf-section"><div class="pdf-section-title">Diagnóstico / Checklist</div><table class="pdf-table"><thead><tr><th style="width:7%">#</th><th>Item inspecionado</th><th style="width:23%">Status</th></tr></thead><tbody>${checklistRows(x)}</tbody></table></div>`:''}
 ${accident(x)}
 <div class="pdf-section"><div class="pdf-section-title">Diagnóstico e Recomendações</div><table class="pdf-table"><tbody>${row('Não conformidades / achados',val(x,'findings'))}${row('Ações / recomendações',val(x,'actions'))}</tbody></table></div>
 ${photoHtml?`<div class="pdf-section"><div class="pdf-section-title">Registro Fotográfico</div><div class="pdf-photo-grid">${photoHtml}</div></div>`:''}
 <div class="pdf-section"><div class="pdf-section-title">Assinaturas e Responsabilidades</div>${signatures}</div>
 <footer class="pdf-footer">Documento eletrônico emitido pelo Sistema Profissional de Inspeção SST • ID ${esc(x.id||'INS-SEM-ID')}<div class="signature-line">Técnico de Segurança do Trabalho</div><span>Relatório gerado em ${esc(nowBR())}</span></footer>
 </div></div>`;
};

async function waitImages(root){
 const imgs=[...root.querySelectorAll('img')];
 await Promise.all(imgs.map(img=>new Promise(resolve=>{if(img.complete&&img.naturalWidth){resolve();return}img.onload=resolve;img.onerror=resolve})));
}
async function waitFonts(){try{if(document.fonts?.ready)await document.fonts.ready}catch(_){}
}
function currentId(root){
 const candidates=[root?.dataset?.inspectionId,root?.querySelector?.('.pdf-id')?.textContent];
 for(const c of candidates){const m=String(c||'').match(/INS-[A-Z0-9-]+/i);if(m)return m[0]}
 for(const k of ['inspectionId','inspection_id','currentInspectionId','idInspecao']){try{const v=localStorage.getItem(k);if(v)return v}catch(_){}
 }
 return null;
}
function showModal(text){const m=document.getElementById('modal'),t=document.getElementById('modalText');if(m){if(t)t.textContent=text;m.classList.remove('hidden')}}
function hideModal(){document.getElementById('modal')?.classList.add('hidden')}

window.makePdf=async function(){
 let clone=null;
 try{
   if(!window.html2pdf)throw new Error('Gerador PDF indisponível.');
   window.scrollTo(0,0);
   const source=document.getElementById('reportContent');
   if(!source)throw new Error('Área do relatório não encontrada.');
   if(!source.innerHTML.trim())throw new Error('O relatório ainda não foi montado.');
   showModal('Preparando laudo profissional…');
   await new Promise(r=>setTimeout(r,1000));
   await waitFonts();
   clone=source.cloneNode(true);

   // 1. Transferir valores dos Inputs e Textareas
   const originalInputs = source.querySelectorAll('input, textarea, select');
   const clonedInputs = clone.querySelectorAll('input, textarea, select');
   originalInputs.forEach((input, index) => {
     if (clonedInputs[index]) {
       clonedInputs[index].value = input.value;
       if (input.type === 'checkbox' || input.type === 'radio') {
         clonedInputs[index].checked = input.checked;
       }
     }
   });

   // 2. Transferir desenhos das Assinaturas (Canvas)
   const originalCanvases = source.querySelectorAll('canvas');
   const clonedCanvases = clone.querySelectorAll('canvas');
   originalCanvases.forEach((canvas, index) => {
     if (clonedCanvases[index]) {
       const ctx = clonedCanvases[index].getContext('2d');
       ctx.drawImage(canvas, 0, 0);
     }
   });

   // 3. Garantir que o clone não quebre no mobile
   clone.style.position = 'absolute';
   clone.style.top = '0';
   clone.style.left = '0';
   clone.style.zIndex = '-9999';
   clone.id='pdfEnterpriseRender';
   clone.style.width='210mm';clone.style.maxWidth='210mm';clone.style.margin='0';clone.style.padding='0';clone.style.visibility='visible';clone.style.display='block';clone.style.background='#fff';
   document.body.appendChild(clone);
   const id=currentId(clone);
   if(!id)throw new Error('Não foi possível localizar o ID da inspeção.');
   const imgs=[...clone.querySelectorAll('img')];
   const seen=new Set();
   imgs.forEach(img=>{if(img.src){if(seen.has(img.src)){img.remove()}else seen.add(img.src)}});
   await waitImages(clone);
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const filename='Laudo_Inspecao_'+id+'.pdf';
   const opt={margin:[30,20,20,30],filename,image:{type:'jpeg',quality:0.82},html2canvas:{scale:1.35,useCORS:true,allowTaint:false,backgroundColor:'#fff',logging:false,letterRendering:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},pagebreak:{mode:['avoid-all','css','legacy']}};
   const worker=html2pdf().set(opt).from(clone).toPdf();
   const pdfBlob=await worker.outputPdf('blob');
   const file=new File([pdfBlob],filename,{type:'application/pdf'});
   if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
     await navigator.share({title:'Laudo de Inspeção',text:'Laudo de inspeção de segurança — '+id,files:[file]});
   }else{
     await html2pdf().set(opt).from(clone).save();
   }
   hideModal();
 }catch(e){
   console.error('PDF Enterprise:',e);
   hideModal();
   alert('Não foi possível gerar o PDF: '+(e?.message||e));
 }finally{
   if(clone)clone.remove();
 }
};

window.gerarPDF=window.makePdf;
window.compartilharPDF=window.makePdf;

})();