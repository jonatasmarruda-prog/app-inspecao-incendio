/* Correções de estabilidade e usabilidade — V8 */
(()=>{
  'use strict';
  const CHECKS={Extintor:window.EXT,Hidrante:window.HID};
  const get=id=>document.getElementById(id);

  // Melhora a leitura e o toque dos controles no celular.
  const style=document.createElement('style');
  style.textContent=`
    #checks .choices{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    #checks .choices button{min-height:48px;padding:9px 5px;line-height:1.15;white-space:normal;word-break:normal;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
    #checks .choices button:active{transform:scale(.98)}
    #checks .choices button.selok,#checks .choices button.selno,#checks .choices button.selna{font-weight:900}
    @media(max-width:420px){#checks .choices{grid-template-columns:1fr 1fr 1fr}#checks .choices button{font-size:11px}}
    .sig canvas{touch-action:none!important;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
    button{touch-action:manipulation}
  `;
  document.head.appendChild(style);

  // Todos os botões do aplicativo são controles, não submits.
  function normalizeButtons(){
    document.querySelectorAll('button').forEach(b=>{if(!b.hasAttribute('type'))b.type='button'});
  }

  // Checklist robusto: eventos são ligados diretamente e também por delegação.
  function renderChecklist(k){
    const box=get('checks');
    if(!box)return;
    const arr=k==='Extintor'?['Equipamento identificado e acessível','Sinalização visível e adequada','Suporte/fixação em boas condições','Pino e lacre íntegros','Mangueira/descarga em boas condições','Manômetro/indicador adequado','Sem corrosão, vazamento ou dano','Carga/pressão aparentemente adequada']:['Abrigo em boas condições','Acesso livre e desobstruído','Sinalização adequada','Mangueira em boas condições','Mangueira corretamente acondicionada','Bico/esguicho presente e adequado','Chave de mangueira presente','Registro/válvula em boas condições','Lacre quando aplicável','Sem vazamentos ou danos aparentes'];
    box.innerHTML=arr.map((text,i)=>`<div class="check" data-check-index="${i}"><b>${i+1}. ${text}</b><div class="choices"><button type="button" data-value="Conforme" aria-label="Item ${i+1}: Bom">✅ Bom</button><button type="button" data-value="Não conforme" aria-label="Item ${i+1}: Não conforme">❌ Não conforme</button><button type="button" data-value="N/A" aria-label="Item ${i+1}: Não se aplica">⚪ N/A</button></div></div>`).join('');
    if(get('checkCount'))get('checkCount').textContent='0/'+arr.length;
    normalizeButtons();
  }

  function setAnswer(i,v){
    if(!window.__inspectionAnswersReady){
      // A variável lexical "answers" pertence ao script principal e fica disponível aqui.
      window.__inspectionAnswersReady=true;
    }
    try{
      answers[i]=v;
      const card=document.querySelector(`#checks .check[data-check-index="${i}"]`);
      if(!card)return;
      card.querySelectorAll('button').forEach(b=>b.classList.remove('selok','selno','selna'));
      const selected=card.querySelector(`button[data-value="${CSS.escape(v)}"]`);
      if(selected)selected.classList.add(v==='Conforme'?'selok':v==='Não conforme'?'selno':'selna');
      const total=current?.kind==='Extintor'?8:10;
      if(get('checkCount'))get('checkCount').textContent=Object.keys(answers).length+'/'+total;
      if(typeof autoSave==='function')autoSave();
    }catch(err){console.error('Checklist:',err)}
  }

  // Substitui as funções antigas pelas versões estáveis.
  window.renderChecks=renderChecklist;
  window.answer=setAnswer;

  document.addEventListener('click',e=>{
    const btn=e.target.closest('#checks .choices button');
    if(!btn)return;
    const card=btn.closest('.check');
    const i=Number(card?.dataset.checkIndex);
    const v=btn.dataset.value;
    if(Number.isInteger(i)&&v)setAnswer(i,v);
  },true);

  // Assinatura refeita usando coordenadas do CSS -> pixels reais do canvas.
  window.signature=function(id){
    const c=get(id); if(!c)return null;
    const ctx=c.getContext('2d');
    let drawing=false,last=null;
    function resize(){
      const r=c.getBoundingClientRect();
      const d=Math.max(1,Math.min(3,window.devicePixelRatio||1));
      const old=c.width>0&&c.height>0?c.toDataURL('image/png'):'';
      c.width=Math.max(320,Math.round(r.width*d));
      c.height=Math.round(180*d);
      c.style.height='180px';
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,c.width,c.height);
      ctx.lineWidth=2.4*d;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111827';
      if(old){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,c.width,c.height);im.src=old;}
    }
    resize();
    const point=e=>{const r=c.getBoundingClientRect();const d=Math.max(1,Math.min(3,window.devicePixelRatio||1));return{x:(e.clientX-r.left)*d,y:(e.clientY-r.top)*d};};
    const down=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();drawing=true;last=point(e);try{c.setPointerCapture(e.pointerId)}catch(_){} };
    const move=e=>{if(!drawing)return;e.preventDefault();const p=point(e);if(last){ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();}last=p;};
    const up=e=>{if(!drawing)return;drawing=false;last=null;try{if(e.pointerId!=null)c.releasePointerCapture(e.pointerId)}catch(_){}if(typeof autoSave==='function')autoSave();};
    c.onpointerdown=down;c.onpointermove=move;c.onpointerup=up;c.onpointercancel=up;c.oncontextmenu=e=>e.preventDefault();
    if(window.ResizeObserver){new ResizeObserver(()=>{if(!drawing)resize()}).observe(c);}
    return c;
  };

  // Garante que botões de limpar assinatura sempre encontrem o canvas correto.
  window.clearSig=function(n){const c=n===1?window.s1:window.s2;if(!c)return;const ctx=c.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);if(typeof autoSave==='function')autoSave();};

  // Reaplica correções depois que o formulário é aberto e o checklist é renderizado.
  const observer=new MutationObserver(()=>normalizeButtons());
  observer.observe(document.body,{childList:true,subtree:true});
  normalizeButtons();
})();
