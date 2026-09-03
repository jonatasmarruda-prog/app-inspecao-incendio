(()=>{
'use strict';

const CAPACIDADES=['4 kg','6 kg','8 kg','10 L','75 L'];
const STYLE_ID='tbm-extintor-enhancements';

function injectCSS(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
    .tbm-capacity-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-top:7px}
    .tbm-capacity-chip{appearance:none;border:1px solid #475569!important;background:#374151!important;color:#e5e7eb!important;border-radius:999px!important;padding:9px 14px!important;min-height:40px!important;font-size:13px!important;font-weight:900!important;line-height:1!important;cursor:pointer!important;transition:transform .12s ease,background .12s ease,border-color .12s ease!important;touch-action:manipulation}
    .tbm-capacity-chip:active{transform:scale(.96)}
    .tbm-capacity-chip.selected{background:#8b1018!important;border-color:#c51f2b!important;color:#fff!important;box-shadow:0 0 0 2px #8b101833!important}
    .tbm-expiry-badge{display:inline-flex;align-items:center;margin-top:7px;padding:7px 10px;border-radius:999px;font-size:12px;font-weight:900}
    .tbm-expiry-badge.ok{background:#166534;color:#fff}
    .tbm-expiry-badge.expired{background:#dc2626;color:#fff}
    .tbm-expiry-date{display:block;margin-top:5px;font-size:11px;color:#64748b;font-weight:800}
  `;
  document.head.appendChild(s);
}

function findField(card, text){
  const labels=[...card.querySelectorAll('label')];
  const label=labels.find(l=>l.textContent.trim().toLowerCase().includes(text));
  if(!label) return null;
  let el=label.parentElement;
  if(el){
    const input=el.querySelector('input,select,textarea');
    if(input) return input;
  }
  let n=label.nextElementSibling;
  if(n && n.matches('input,select,textarea')) return n;
  return null;
}

function formatBR(d){
  return d.toLocaleDateString('pt-BR');
}

function updateExpiry(input,badge,dateText){
  const value=input.value;
  if(!value){
    badge.hidden=true;
    dateText.hidden=true;
    dateText.textContent='';
    return;
  }
  const parts=value.split('-').map(Number);
  if(parts.length!==3 || parts.some(Number.isNaN)){
    badge.hidden=true;
    dateText.hidden=true;
    return;
  }
  const due=new Date(parts[0],parts[1]-1,parts[2]);
  due.setFullYear(due.getFullYear()+1);
  const today=new Date();
  today.setHours(0,0,0,0);
  due.setHours(0,0,0,0);
  const expired=due<today;
  badge.hidden=false;
  badge.className='tbm-expiry-badge '+(expired?'expired':'ok');
  badge.textContent=expired?'⚠️ Vencido':'✅ Em dia';
  dateText.hidden=false;
  dateText.textContent='Vencimento: '+formatBR(due);
}

function enhanceCard(card){
  if(card.dataset.tbmExtEnhanced==='1') return;
  if(card.classList.contains('premium-extra')) return;
  const title=(card.querySelector('h3')?.textContent||card.textContent||'').toLowerCase();
  if(!title.includes('extintor')) return;

  const capacity=findField(card,'capacidade');
  if(capacity && capacity.tagName==='INPUT' && !capacity.closest('.tbm-capacity-box')){
    const originalValue=capacity.value||'';
    const box=document.createElement('div');
    box.className='tbm-capacity-box';
    const chips=document.createElement('div');
    chips.className='tbm-capacity-wrap';
    chips.setAttribute('role','group');
    chips.setAttribute('aria-label','Selecione a capacidade do extintor');

    const hidden=document.createElement('input');
    hidden.type='hidden';
    hidden.id=capacity.id;
    if(capacity.name) hidden.name=capacity.name;
    hidden.value=originalValue;
    hidden.dataset.tbmCapacity='1';

    CAPACIDADES.forEach(cap=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='tbm-capacity-chip'+(originalValue.trim().toLowerCase()===cap.toLowerCase()?' selected':'');
      b.textContent=cap;
      b.setAttribute('aria-pressed',originalValue.trim().toLowerCase()===cap.toLowerCase()?'true':'false');
      b.addEventListener('click',()=>{
        hidden.value=cap;
        [...chips.children].forEach(x=>{
          const selected=x===b;
          x.classList.toggle('selected',selected);
          x.setAttribute('aria-pressed',selected?'true':'false');
        });
        hidden.dispatchEvent(new Event('input',{bubbles:true}));
        hidden.dispatchEvent(new Event('change',{bubbles:true}));
        if(typeof window.scheduleSave==='function') window.scheduleSave();
      });
      chips.appendChild(b);
    });

    box.appendChild(hidden);
    box.appendChild(chips);
    capacity.replaceWith(box);
  }

  const dateInput=findField(card,'última inspeção / recarga') || findField(card,'ultima inspeção / recarga') || findField(card,'última inspeção') || findField(card,'ultima inspeção');
  if(dateInput && dateInput.type==='date' && !dateInput.dataset.tbmExpiry){
    dateInput.dataset.tbmExpiry='1';
    const parent=dateInput.parentElement||card;
    const badge=document.createElement('span');
    badge.className='tbm-expiry-badge';
    badge.hidden=true;
    const dateText=document.createElement('span');
    dateText.className='tbm-expiry-date';
    dateText.hidden=true;
    parent.appendChild(badge);
    parent.appendChild(dateText);
    dateInput.addEventListener('input',()=>updateExpiry(dateInput,badge,dateText));
    dateInput.addEventListener('change',()=>{
      updateExpiry(dateInput,badge,dateText);
      if(typeof window.scheduleSave==='function') window.scheduleSave();
    });
    updateExpiry(dateInput,badge,dateText);
  }

  card.dataset.tbmExtEnhanced='1';
}

function scan(){
  injectCSS();
  document.querySelectorAll('.equipment').forEach(enhanceCard);
}

function loadPdfLayoutFix(){
  if(document.querySelector('script[data-tbm-pdf-layout-fix]')) return;
  const s=document.createElement('script');
  s.src='./pdf-layout-fix.js?v=20260903-02';
  s.defer=true;
  s.dataset.tbmPdfLayoutFix='1';
  document.head.appendChild(s);
}

function init(){
  injectCSS();
  scan();
  loadPdfLayoutFix();
  const root=document.getElementById('equipmentList')||document.body;
  const observer=new MutationObserver(()=>{
    requestAnimationFrame(scan);
  });
  observer.observe(root,{childList:true,subtree:true});
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();