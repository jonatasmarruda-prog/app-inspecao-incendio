/* Correções de estabilidade e usabilidade — V9 */
(()=>{
'use strict';
const ENDERECO='Rodovia BR-163, KM 109, S/N - Zona Rural, Rondonópolis - MT';
const get=id=>document.getElementById(id);

const style=document.createElement('style');
style.textContent=`
  .sig{max-width:650px;margin-left:0}
  .sig canvas{width:100%!important;max-width:650px;height:140px!important;touch-action:none!important;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
  #checks .choices{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  #checks .choices button{min-height:48px;padding:9px 5px;line-height:1.15;white-space:normal;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
  #checks .choices button.selok{background:#15803d!important;color:#fff!important}
  #checks .choices button.selno{background:#dc2626!important;color:#fff!important}
  #checks .choices button.selna{background:#64748b!important;color:#fff!important}
  .v9-validation{display:none;background:#fee2e2;color:#991b1b;padding:12px 14px;border-radius:11px;margin:10px 0;font-size:14px}
  .v9-validation.show{display:block}.v9-validation ul{margin:7px 0 0;padding-left:20px}
  button{touch-action:manipulation}
  @media(max-width:700px){.sig{max-width:100%}.sig canvas{height:135px!important}}
`;
document.head.appendChild(style);

function normalizeButtons(){document.querySelectorAll('button').forEach(b=>b.type='button');}
window.bindAuto=window.bindAutosave||function(){document.querySelectorAll('#form input,#form select,#form textarea').forEach(el=>{el.oninput=()=>{try{autoSave()}catch(_){}};el.onchange=()=>{try{autoSave()}catch(_){}};});};

function fixCompany(){
  const s=get('company'),other=get('companyOther'); if(!s)return;
  const currentValue=s.value;
  s.innerHTML='<option>TBM Têxtil</option><option>TBM Log</option><option>Outro</option>';
  s.value=['TBM Têxtil','TBM Log','Outro'].includes(currentValue)?currentValue:'TBM Têxtil';
  const hint=s.parentElement?.querySelector('.hint'); if(hint)hint.textContent='Selecione TBM Têxtil, TBM Log ou Outro.';
  const toggle=()=>{if(other){other.style.display=s.value==='Outro'?'block':'none';if(s.value!=='Outro')other.value='';}};
  s.onchange=()=>{toggle();try{autoSave()}catch(_){}}; toggle();
}

function ensureValidation(){
  let box=get('v9Validation'); if(box)return box;
  const saveCard=[...document.querySelectorAll('#form .card')].find(c=>c.textContent.includes('SALVAR INSPEÇÃO'));
  if(!saveCard)return null;
  box=document.createElement('div');box.id='v9Validation';box.className='v9-validation';
  saveCard.parentNode.insertBefore(box,saveCard); return box;
}
function showProblems(items){const b=ensureValidation();if(!b){alert('Falta preencher:\n- '+items.join('\n- '));return;}b.innerHTML='<b>⚠️ Antes de salvar, corrija:</b><ul>'+items.map(x=>'<li>'+x+'</li>').join('')+'</ul>';b.classList.add('show');b.scrollIntoView({behavior:'smooth',block:'center'});}
function hideProblems(){const b=get('v9Validation');if(b){b.classList.remove('show');b.innerHTML='';}}

window.answer=function(i,v){
  try{
    answers[i]=v;
    ['o','n','a'].forEach(k=>{const b=get('c'+i+k);if(b)b.classList.remove('selok','selno','selna');});
    const suffix=v==='Conforme'?'o':v==='Não conforme'?'n':'a';
    const selected=get('c'+i+suffix); if(selected)selected.classList.add(v==='Conforme'?'selok':v==='Não conforme'?'selno':'selna');
    const total=current?.kind==='Extintor'?EXT.length:HID.length;
    if(get('checkCount'))get('checkCount').textContent=Object.keys(answers).length+'/'+total;
    try{autoSave()}catch(_){ }
  }catch(e){console.error('Checklist',e);alert('Não foi possível marcar este item. Atualize a página e tente novamente.');}
};

document.addEventListener('click',e=>{
  const btn=e.target.closest('#checks .choices button'); if(!btn)return;
  const m=btn.id.match(/^c(\d+)(o|n|a)$/); if(!m)return;
  const value=m[2]==='o'?'Conforme':m[2]==='n'?'Não conforme':'N/A';
  e.preventDefault(); window.answer(Number(m[1]),value);
},true);

window.signature=function(id){
  const c=get(id); if(!c)return null;
  const rect=c.getBoundingClientRect();
  const cssW=Math.max(280,Math.min(rect.width||600,650));
  const d=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  c.style.width='100%';c.style.maxWidth='650px';c.style.height='140px';
  c.width=Math.round(cssW*d);c.height=Math.round(140*d);
  const ctx=c.getContext('2d');ctx.setTransform(d,0,0,d,0,0);ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111827';
  let drawing=false,last=null,dirty=false;
  const point=e=>{const r=c.getBoundingClientRect();const scaleX=(c.width/d)/r.width,scaleY=(c.height/d)/r.height;return{x:(e.clientX-r.left)*scaleX,y:(e.clientY-r.top)*scaleY};};
  const down=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;drawing=true;dirty=true;last=point(e);try{c.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault();};
  const move=e=>{if(!drawing)return;const p=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;e.preventDefault();};
  const up=e=>{if(!drawing)return;drawing=false;last=null;try{c.releasePointerCapture(e.pointerId)}catch(_){}try{autoSave()}catch(_){}};
  c.onpointerdown=down;c.onpointermove=move;c.onpointerup=up;c.onpointercancel=up;c.oncontextmenu=e=>e.preventDefault();
  c._sig={clear:()=>{ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.restore();dirty=false;},data:()=>dirty?c.toDataURL('image/png'):''};
  return c;
};
window.clearSig=function(n){const c=n===1?s1:s2;if(!c)return;if(c._sig)c._sig.clear();else c.getContext('2d').clearRect(0,0,c.width,c.height);try{autoSave()}catch(_){}};

const oldNovo=window.novo;
window.novo=function(k){
  try{oldNovo(k);}catch(e){console.warn('novo antigo',e);}
  fixCompany();
  if(get('address'))get('address').value=ENDERECO;
  hideProblems(); normalizeButtons();
  requestAnimationFrame(()=>{try{s1=window.signature('sig1');s2=window.signature('sig2');}catch(e){console.error('assinatura',e);}});
};

const oldCollect=window.collect;
window.collect=function(){
  const x=oldCollect(); if(!x)return x;
  if(s1?._sig)x.sig1=s1._sig.data();
  if(s2?._sig)x.sig2=s2._sig.data();
  if(get('address')&&!x.address)x.address=get('address').value.trim();
  return x;
};

function validate(x){
  const p=[];
  if(!x.company)p.push('Empresa / unidade');
  if(x.company==='Outro'&&!String(x.companyOther||'').trim())p.push('Nome da outra empresa');
  if(!x.sector)p.push('Setor');
  if(!x.address)p.push('Endereço / local da inspeção');
  if(!x.inspector)p.push('Responsável pela inspeção');
  const total=x.kind==='Extintor'?EXT.length:HID.length;
  const count=Object.keys(x.answers||{}).length;
  if(count<total)p.push(`Checklist incompleto (${count}/${total})`);
  if(!x.sig1)p.push('Assinatura do inspetor');
  return p;
}

window.salvar=async function(report){
  try{
    const x=window.collect();
    const problems=validate(x);
    if(problems.length){showProblems(problems);return;}
    hideProblems();
    await put(x); await stats();
    if(report)showReport(x); else alert('✅ Inspeção salva com sucesso no aparelho.');
  }catch(e){console.error('Salvar',e);showProblems(['Ocorreu um erro ao salvar. Atualize a página e tente novamente.']);}
};

function init(){normalizeButtons();fixCompany();ensureValidation();if(get('address')&&!get('address').value)get('address').value=ENDERECO;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();