(()=>{
'use strict';

const VERSION='2026.09.09.1-commercial-base';
const STORE='sst_commercial_empresa_v1';
const USERS_STORE='sst_commercial_usuarios_v1';
const CONTACTS_STORE='sst_commercial_contatos_v1';
const FIREBASE_READY=false;

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const digits=s=>String(s||'').replace(/\D/g,'');
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch(_){return fallback}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

function company(){
  return read(STORE,{
    empresaId:'',razaoSocial:'',nomeFantasia:'',cnpj:'',endereco:'',telefone:'',email:'',logo:'',responsavelSST:'',registroProfissional:''
  });
}
function users(){return read(USERS_STORE,[])}
function contacts(){return read(CONTACTS_STORE,[])}
function makeEmpresaId(cnpj){const d=digits(cnpj);return d?`EMP-${d}`:`EMP-${Date.now().toString(36).toUpperCase()}`}

function ensureStyle(){
  if($('sst-commercial-style'))return;
  const s=document.createElement('style');s.id='sst-commercial-style';s.textContent=`
  #sstCommercialSettings{position:fixed;inset:0;background:#0f172acc;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px}
  #sstCommercialSettings.hidden{display:none!important}
  #sstCommercialSettings .box{width:min(760px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:20px;padding:20px;box-shadow:0 24px 80px #0005}
  #sstCommercialSettings h2{margin:0 0 4px}.commercial-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.commercial-grid .wide{grid-column:1/-1}
  .commercial-field label{display:block;font-size:12px;font-weight:800;margin-bottom:5px}.commercial-field input{width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:10px}
  .commercial-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}.commercial-warn{background:#fff7ed;color:#9a3412;padding:10px;border-radius:10px;font-size:12px;margin:12px 0}
  #sstCommercialConfigButton{margin-top:10px}
  @media(max-width:640px){.commercial-grid{grid-template-columns:1fr}.commercial-grid .wide{grid-column:auto}}
  `;document.head.appendChild(s);
}

function configModal(){
  ensureStyle();let root=$('sstCommercialSettings');if(root)return root;
  root=document.createElement('div');root.id='sstCommercialSettings';root.className='hidden';root.innerHTML=`
    <div class="box">
      <h2>Configuração da Empresa</h2>
      <div class="mini">SST Premium • Base comercial</div>
      <div class="commercial-warn">Esta cópia comercial está isolada da versão TBM. A nuvem comercial só deve ser ativada após configurar um Firebase próprio do produto.</div>
      <div class="commercial-grid">
        <div class="commercial-field"><label>Razão Social *</label><input id="ccRazao"></div>
        <div class="commercial-field"><label>Nome Fantasia</label><input id="ccFantasia"></div>
        <div class="commercial-field"><label>CNPJ *</label><input id="ccCnpj" inputmode="numeric"></div>
        <div class="commercial-field"><label>Telefone</label><input id="ccTelefone"></div>
        <div class="commercial-field wide"><label>Endereço</label><input id="ccEndereco"></div>
        <div class="commercial-field"><label>E-mail corporativo</label><input id="ccEmail" type="email"></div>
        <div class="commercial-field"><label>URL da logo</label><input id="ccLogo" placeholder="https://..."></div>
        <div class="commercial-field"><label>Responsável SST</label><input id="ccResponsavel"></div>
        <div class="commercial-field"><label>Registro profissional</label><input id="ccRegistro"></div>
      </div>
      <div class="commercial-actions"><button type="button" class="btn secondary" id="ccClose">Cancelar</button><button type="button" class="btn success" id="ccSave">Salvar empresa</button></div>
    </div>`;
  document.body.appendChild(root);
  $('ccClose').onclick=()=>root.classList.add('hidden');
  $('ccSave').onclick=saveCompany;
  return root;
}
function openConfig(){
  const c=company(),root=configModal();
  $('ccRazao').value=c.razaoSocial||'';$('ccFantasia').value=c.nomeFantasia||'';$('ccCnpj').value=c.cnpj||'';$('ccTelefone').value=c.telefone||'';$('ccEndereco').value=c.endereco||'';$('ccEmail').value=c.email||'';$('ccLogo').value=c.logo||'';$('ccResponsavel').value=c.responsavelSST||'';$('ccRegistro').value=c.registroProfissional||'';
  root.classList.remove('hidden');
}
function saveCompany(){
  const razao=$('ccRazao').value.trim(),cnpj=$('ccCnpj').value.trim();
  if(!razao||digits(cnpj).length!==14){alert('Informe a Razão Social e um CNPJ com 14 dígitos.');return}
  const old=company();
  const c={empresaId:old.empresaId||makeEmpresaId(cnpj),razaoSocial:razao,nomeFantasia:$('ccFantasia').value.trim(),cnpj,endereco:$('ccEndereco').value.trim(),telefone:$('ccTelefone').value.trim(),email:$('ccEmail').value.trim(),logo:$('ccLogo').value.trim(),responsavelSST:$('ccResponsavel').value.trim(),registroProfissional:$('ccRegistro').value.trim(),updatedAt:new Date().toISOString()};
  write(STORE,c);$('sstCommercialSettings').classList.add('hidden');applyBrand();applyDefaults();
}

function applyBrand(){
  const c=company();document.title='SST Premium • Gestão de Segurança do Trabalho';
  const brand=document.querySelector('.brand');if(brand){const b=brand.querySelector('b'),sp=brand.querySelector('span');if(b)b.textContent='SST Premium';if(sp)sp.textContent=(c.nomeFantasia||c.razaoSocial||'Gestão de Segurança do Trabalho')+' • Sistema Profissional'}
  const logo=document.querySelector('.top .logo');if(logo){if(c.logo){logo.src=c.logo;logo.alt=c.nomeFantasia||c.razaoSocial||'Logo da empresa'}else{logo.style.visibility='hidden'}}
  const hero=document.querySelector('#home .hero');if(hero&&!$('sstCommercialConfigButton')){const btn=document.createElement('button');btn.id='sstCommercialConfigButton';btn.className='btn secondary full';btn.textContent='⚙️ Configurações da empresa';btn.onclick=openConfig;hero.appendChild(btn)}
}
function applyDefaults(){
  const c=company();if(!c.empresaId)return;
  const companySelect=$('company');if(companySelect){companySelect.innerHTML='';const o=document.createElement('option');o.value=c.nomeFantasia||c.razaoSocial;o.textContent=c.nomeFantasia||c.razaoSocial;companySelect.appendChild(o)}
  const address=$('address');if(address)address.value=c.endereco||'';
  const inspector=$('inspector');if(inspector){inspector.innerHTML='';const name=c.responsavelSST||'Responsável SST';const o=document.createElement('option');o.value=name;o.textContent=name;inspector.appendChild(o);const other=document.createElement('option');other.value='Outro';other.textContent='Outro';inspector.appendChild(other)}
}

function decorateSnapshot(snapshot){
  if(!snapshot||typeof snapshot!=='object')return snapshot;
  const c=company();if(!c.empresaId)return snapshot;
  snapshot.empresaId=c.empresaId;snapshot.empresaCnpj=c.cnpj;snapshot.empresaRazaoSocial=c.razaoSocial;snapshot.empresaNomeFantasia=c.nomeFantasia;snapshot.empresaLogo=c.logo;snapshot.empresaResponsavelSST=c.responsavelSST;snapshot.empresaRegistroProfissional=c.registroProfissional;
  return snapshot;
}
function installCommercialGuard(){
  if(FIREBASE_READY)return;
  const blocked=async()=>{throw new Error('SST Premium comercial: configure um Firebase comercial antes de salvar dados em nuvem.');};
  ['cloudSetReport','cloudListReports','cloudGetReport','cloudDeleteReport'].forEach(name=>{if(typeof window[name]==='function'&&!window[name].__commercialBlocked){const f=blocked.bind(null);f.__commercialBlocked=true;window[name]=f}});
  if(typeof window.tbmHistoricoSalvar==='function'&&!window.tbmHistoricoSalvar.__commercialBlocked){const f=async()=>blocked();f.__commercialBlocked=true;window.tbmHistoricoSalvar=f}
  const state=$('cloudState');if(state)state.textContent='● Nuvem comercial não configurada';
}
function wrapSaveWhenReady(){
  if(!FIREBASE_READY||typeof window.cloudSetReport!=='function'||window.cloudSetReport.__commercialDecorated)return;
  const original=window.cloudSetReport;const wrapped=async snapshot=>original(decorateSnapshot(snapshot));wrapped.__commercialDecorated=true;window.cloudSetReport=wrapped;
}

function ensureInitialAdmin(){
  const c=company();if(!c.empresaId)return;
  const list=users();if(list.length)return;
  const admin={id:'USR-'+Date.now().toString(36).toUpperCase(),empresaId:c.empresaId,nome:c.responsavelSST||'Administrador',email:c.email||'',perfil:'administrador',ativo:true};write(USERS_STORE,[admin]);
}
function boot(){
  window.__SST_COMMERCIAL_BASE=true;window.__SST_COMMERCIAL_VERSION=VERSION;window.sstCommercialCompany=company;window.sstCommercialUsers=users;window.sstCommercialContacts=contacts;window.sstCommercialOpenConfig=openConfig;window.sstCommercialDecorateSnapshot=decorateSnapshot;
  applyBrand();applyDefaults();ensureInitialAdmin();
  const c=company();if(!c.empresaId)setTimeout(openConfig,150);
  installCommercialGuard();wrapSaveWhenReady();
  setTimeout(installCommercialGuard,800);setTimeout(installCommercialGuard,2200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
