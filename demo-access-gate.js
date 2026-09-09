(()=>{
'use strict';
const FLAG='__sstDemoAccessGateV1';
if(window[FLAG])return;window[FLAG]=true;
const AUTH_KEY='sst_demo_auth_until_v1';
const CRED_HASH='184db3125b5749e02c317625c637b682f495e48f1b35861355aa42727abc5e25';
const TTL=12*60*60*1000;
const $=id=>document.getElementById(id);

function hex(buf){return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function hash(v){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))}
function isAuthed(){const until=Number(localStorage.getItem(AUTH_KEY)||0);return Number.isFinite(until)&&until>Date.now()}
function setAuthed(){localStorage.setItem(AUTH_KEY,String(Date.now()+TTL))}
function logout(){localStorage.removeItem(AUTH_KEY);location.reload()}
async function installOffline(){if(!('serviceWorker'in navigator))return;try{await navigator.serviceWorker.register('./service-worker.js',{scope:'./'});await navigator.serviceWorker.ready}catch(e){console.warn('[SST OFFLINE]',e)}}

function style(){if($('sstAccessGateStyle'))return;const s=document.createElement('style');s.id='sstAccessGateStyle';s.textContent=`
#sstAccessGate{position:fixed;inset:0;z-index:999999;background:radial-gradient(circle at 80% 0,#991b1b 0,#5b1117 34%,#0f172a 100%);display:flex;align-items:center;justify-content:center;padding:18px}
#sstAccessGate.hidden{display:none!important}.sag-card{width:min(460px,100%);background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 35px 120px #0009}.sag-head{padding:34px 28px 28px;text-align:center;background:linear-gradient(135deg,#7f1017,#b91c1c);color:#fff}.sag-icon{width:82px;height:82px;border-radius:22px;background:#fff;color:#8b1018;display:grid;place-items:center;margin:0 auto 16px;font-size:38px;box-shadow:0 14px 36px #0004}.sag-head h1{margin:0;font-size:30px}.sag-head p{margin:9px 0 0;opacity:.9;font-size:13px}.sag-body{padding:24px}.sag-field{margin-bottom:13px}.sag-field label{display:block;font-size:12px;font-weight:900;color:#334155;margin-bottom:6px}.sag-field input{width:100%;padding:13px;border:1px solid #cbd5e1;border-radius:11px;outline:none}.sag-field input:focus{border-color:#8b1018;box-shadow:0 0 0 3px #8b101814}.sag-btn{width:100%;border:0;border-radius:12px;padding:14px 18px;background:#8b1018;color:#fff;font-weight:900;cursor:pointer}.sag-error{display:none;background:#fef2f2;color:#991b1b;padding:10px 12px;border-radius:10px;margin-bottom:12px;font-size:12px;font-weight:800}.sag-error.show{display:block}.sag-note{text-align:center;color:#64748b;font-size:11px;line-height:1.4;margin-top:11px}.sag-logout{margin-top:10px!important}
@media(max-width:520px){#sstAccessGate{padding:0;align-items:stretch}.sag-card{border-radius:0;min-height:100vh}.sag-head{padding-top:52px}.sag-body{padding:22px 18px}}
`;document.head.appendChild(s)}

function normalizeUi(){
  document.title='Sistema SST • Acesso Restrito';
  document.querySelectorAll('.sd-demo-tag').forEach(el=>el.textContent='🔐 ACESSO RESTRITO');
  document.querySelectorAll('.sd-demo-badge').forEach(el=>el.textContent='🔒 AMBIENTE PRIVADO');
  const head=document.querySelector('#sstDemoWelcome .sd-head');
  if(head){const p=head.querySelector('p');if(p)p.textContent='Ambiente profissional de Segurança do Trabalho. Entre no sistema para iniciar.'}
  const cloud=document.getElementById('cloudState');if(cloud)cloud.textContent=navigator.onLine?'● Dados salvos neste dispositivo':'● Modo offline ativo';
  const status=document.querySelector('#home .statusline');if(status)status.innerHTML='<span class="dot"></span>Dados salvos neste dispositivo • uso offline após o primeiro acesso';
  const hero=document.querySelector('#home .hero');
  if(hero&&!$('sstDemoLogoutBtn')){const b=document.createElement('button');b.type='button';b.id='sstDemoLogoutBtn';b.className='btn secondary full sag-logout';b.textContent='🔒 Sair do sistema';b.onclick=logout;hero.appendChild(b)}
}

function build(){style();let root=$('sstAccessGate');if(root)return root;root=document.createElement('div');root.id='sstAccessGate';root.innerHTML=`<div class="sag-card"><div class="sag-head"><div class="sag-icon">🛡️</div><h1>Sistema SST</h1><p>Acesso restrito</p></div><div class="sag-body"><div id="sagError" class="sag-error">Usuário ou senha incorretos.</div><div class="sag-field"><label>Usuário</label><input id="sagUser" autocomplete="username" placeholder="Digite seu usuário"></div><div class="sag-field"><label>Senha</label><input id="sagPass" type="password" autocomplete="current-password" placeholder="Digite sua senha"></div><button type="button" id="sagLogin" class="sag-btn">Entrar no sistema</button><div class="sag-note">A sessão permanece ativa por até 12 horas neste dispositivo.</div></div></div>`;document.body.appendChild(root);
  const submit=async()=>{const user=$('sagUser').value.trim(),pass=$('sagPass').value;const got=await hash(`${user}:${pass}`);if(got!==CRED_HASH){$('sagError').classList.add('show');$('sagPass').value='';$('sagPass').focus();return}setAuthed();root.classList.add('hidden');normalizeUi();setTimeout(()=>document.getElementById('sstDemoEnter')?.focus(),100)};
  $('sagLogin').onclick=submit;$('sagPass').addEventListener('keydown',e=>{if(e.key==='Enter')submit()});$('sagUser').addEventListener('keydown',e=>{if(e.key==='Enter')$('sagPass').focus()});return root
}
function boot(){installOffline();normalizeUi();const root=build();if(isAuthed())root.classList.add('hidden');else root.classList.remove('hidden');window.addEventListener('online',normalizeUi);window.addEventListener('offline',normalizeUi);setTimeout(normalizeUi,500);setTimeout(normalizeUi,1800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
