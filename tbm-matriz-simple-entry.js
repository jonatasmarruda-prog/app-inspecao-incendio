(()=>{
'use strict';
const FLAG='__tbmMatrizSimpleEntryV1';
if(window[FLAG])return;window[FLAG]=true;
const STORE='tbm_matriz_empresa_config_v1';
const $=id=>document.getElementById(id);
let companyModalAllowed=false;

function config(){try{return JSON.parse(localStorage.getItem(STORE)||'null')||{}}catch(_){return {}}}
function hasCompany(){return !!config().empresaId}

function style(){
  if($('tbmMatrizSimpleEntryStyle'))return;
  const s=document.createElement('style');
  s.id='tbmMatrizSimpleEntryStyle';
  s.textContent=`
  #tbmMatrizSimpleEntry{position:fixed;inset:0;z-index:70000;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(circle at 75% 10%,#c51f2b 0,#8b1018 34%,#35070b 64%,#111827 100%);overflow:auto}
  #tbmMatrizSimpleEntry.hidden{display:none!important}
  .tmse-card{width:min(720px,100%);text-align:center;color:#fff;padding:42px 28px;border:1px solid #ffffff24;border-radius:30px;background:linear-gradient(145deg,#ffffff16,#ffffff08);backdrop-filter:blur(10px);box-shadow:0 35px 100px #0008}
  .tmse-logo{width:112px;height:112px;margin:0 auto 24px;border-radius:26px;background:#fff;display:grid;place-items:center;box-shadow:0 18px 45px #0005}
  .tmse-logo img{max-width:96px;max-height:96px;object-fit:contain}
  .tmse-tag{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:999px;background:#ffffff18;border:1px solid #ffffff2d;font-size:11px;font-weight:900;letter-spacing:.8px}
  .tmse-card h1{font-size:38px;line-height:1.05;margin:18px 0 10px;font-weight:950}
  .tmse-card p{max-width:520px;margin:0 auto 28px;font-size:15px;line-height:1.6;color:#ffffffd9}
  .tmse-enter{width:min(380px,100%);border:0;border-radius:15px;padding:16px 24px;background:#fff;color:#8b1018;font-size:16px;font-weight:950;cursor:pointer;box-shadow:0 15px 35px #0004;transition:.16s transform,.16s box-shadow}
  .tmse-enter:active{transform:scale(.985)}
  .tmse-foot{margin-top:16px;font-size:11px;color:#ffffff9c}
  @media(max-width:600px){#tbmMatrizSimpleEntry{padding:0}.tmse-card{min-height:100vh;width:100%;border:0;border-radius:0;display:flex;flex-direction:column;justify-content:center;padding:32px 22px}.tmse-card h1{font-size:32px}.tmse-logo{width:96px;height:96px}.tmse-logo img{max-width:82px;max-height:82px}}
  `;
  document.head.appendChild(s);
}

function buildWelcome(){
  style();
  const old=$('tbmMatrizWelcomeGate');if(old)old.classList.add('hidden');
  let root=$('tbmMatrizSimpleEntry');if(root)return root;
  root=document.createElement('div');root.id='tbmMatrizSimpleEntry';
  root.innerHTML=`<div class="tmse-card"><div class="tmse-logo"><img src="Têxtil Bezerra de Menezes 2.jpeg" alt="TBM"></div><div class="tmse-tag">🛡️ SISTEMA DE SEGURANÇA DO TRABALHO</div><h1>Bem-vindo</h1><p>Gestão de SST com inspeções, permissões de trabalho, relatórios, evidências e histórico em um só lugar.</p><button type="button" id="tbmMatrizEnterSystem" class="tmse-enter">Entrar no sistema →</button><div class="tmse-foot">TBM Matriz • Sistema SST</div></div>`;
  document.body.appendChild(root);
  $('tbmMatrizEnterSystem').onclick=()=>root.classList.add('hidden');
  return root;
}

function suppressAutomaticCompanyModal(){
  const modal=$('tbmMatrizWelcome');
  if(!modal)return;
  if(!companyModalAllowed)modal.classList.add('hidden');
  if(!modal.dataset.simpleEntryObserved){
    modal.dataset.simpleEntryObserved='1';
    new MutationObserver(()=>{
      if(!companyModalAllowed&&!modal.classList.contains('hidden'))modal.classList.add('hidden');
    }).observe(modal,{attributes:true,attributeFilter:['class']});
  }
  const cancel=$('tmwCancel');
  if(cancel&&!cancel.dataset.simpleEntryBound){
    cancel.dataset.simpleEntryBound='1';
    cancel.onclick=()=>{companyModalAllowed=false;modal.classList.add('hidden')};
  }
  const save=$('tmwSave');
  if(save&&!save.dataset.simpleEntryBound){
    save.dataset.simpleEntryBound='1';
    save.addEventListener('click',()=>setTimeout(()=>{companyModalAllowed=false;setupCompanyButton();},80));
  }
}

function clearCorporateDefaults(){
  if(hasCompany())return;
  const company=$('company');
  if(company){company.innerHTML='<option value="">Não cadastrada</option>';company.value=''}
  const other=$('otherCompany');if(other)other.value='';
  const address=$('address');if(address)address.value='';
  const inspector=$('inspector');
  if(inspector){inspector.innerHTML='<option value="">Não informado</option><option value="Outro">Outro</option>';inspector.value=''}
  const inspectorOther=$('inspectorOther');if(inspectorOther)inspectorOther.value='';
  const role=$('role');if(role)role.value='';
  const chip=$('tbmMatrizChip');if(chip)chip.textContent='🏢 Empresa não cadastrada';
}

function setupCompanyButton(){
  const hero=document.querySelector('#home .hero');if(!hero)return;
  let btn=$('tbmMatrizConfigBtn');
  if(!btn){
    btn=document.createElement('button');btn.id='tbmMatrizConfigBtn';btn.className='btn secondary full';hero.appendChild(btn);
  }
  btn.textContent=hasCompany()?'⚙️ Dados da empresa':'🏢 Cadastrar empresa';
  if(!btn.dataset.simpleEntryBound){
    btn.dataset.simpleEntryBound='1';
    const original=btn.onclick;
    btn.onclick=e=>{
      companyModalAllowed=true;
      if(typeof original==='function')original.call(btn,e);
      const modal=$('tbmMatrizWelcome');if(modal)modal.classList.remove('hidden');
    };
  }
}

function keepCleanWithoutCompany(){
  suppressAutomaticCompanyModal();
  setupCompanyButton();
  clearCorporateDefaults();
}

function boot(){
  const old=$('tbmMatrizWelcomeGate');if(old)old.remove();
  buildWelcome();
  keepCleanWithoutCompany();
  setTimeout(keepCleanWithoutCompany,300);
  setTimeout(keepCleanWithoutCompany,900);
  setTimeout(keepCleanWithoutCompany,2400);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
