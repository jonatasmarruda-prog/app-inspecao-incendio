(()=>{'use strict';
function style(){if(document.getElementById('premium-fix-style'))return;const s=document.createElement('style');s.id='premium-fix-style';s.textContent=`
.logo{width:76px!important;height:76px!important;padding:4px!important;background:#fff!important;border-radius:14px!important;object-fit:contain!important}
.reportLogo{width:92px!important;height:92px!important;background:#fff!important;object-fit:contain!important}
.sigwrap{background:#fff!important;border:2px solid #94a3b8!important;box-shadow:inset 0 0 0 1px #e2e8f0,0 8px 22px #0002!important}
.sigwrap canvas{background:#fff!important;color:#111827!important;border:0!important;touch-action:none!important;cursor:crosshair!important}
.sigwrap:before{content:'ASSINE DENTRO DO QUADRO';display:block;background:#f8fafc;color:#64748b;font-size:9px;font-weight:900;letter-spacing:.8px;text-align:center;padding:6px;border-bottom:1px solid #e2e8f0}
.photoTools{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.cameraBtn,.galleryBtn{min-height:52px!important;border-radius:14px!important;font-weight:900!important;border:1px solid #334155!important;box-shadow:0 10px 24px #0004!important}
.cameraBtn{background:linear-gradient(145deg,#b91c1c,#ef4444)!important;color:#fff!important}
.galleryBtn{background:#17212b!important;color:#f8fafc!important}
#photoInput{display:none!important}.photoHint{margin-top:9px;font-size:11px;color:#94a3b8;line-height:1.45}
.photoCard{position:relative!important;overflow:hidden!important}.photoCard img{background:#f8fafc!important;object-fit:cover!important}
@media(max-width:560px){.logo{width:64px!important;height:64px!important}.reportLogo{width:76px!important;height:76px!important}.photoTools{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
function logos(){document.querySelectorAll('img.logo,img.reportLogo').forEach(i=>{i.src='./icon.svg?v=20260903-26';i.alt='TBM Têxtil'})}
function camera(){const input=document.getElementById('photoInput');if(!input||input.dataset.cameraReady)return;input.dataset.cameraReady='1';input.setAttribute('accept','image/*');input.setAttribute('capture','environment');const tools=document.createElement('div');tools.className='photoTools';const cam=document.createElement('button');cam.type='button';cam.className='btn cameraBtn';cam.textContent='📷 TIRAR FOTO';cam.onclick=()=>input.click();const gal=document.createElement('button');gal.type='button';gal.className='btn galleryBtn';gal.textContent='🖼️ ESCOLHER DA GALERIA';gal.onclick=()=>{input.removeAttribute('capture');input.click();setTimeout(()=>input.setAttribute('capture','environment'),500)};tools.append(cam,gal);input.insertAdjacentElement('afterend',tools);const h=document.createElement('div');h.className='photoHint';h.textContent='Tire a foto diretamente pela câmera ou escolha uma imagem da galeria.';tools.insertAdjacentElement('afterend',h)}
function status(){const e=document.getElementById('cloudState');if(e&&!e.dataset.obs){e.dataset.obs='1';new MutationObserver(()=>{if(/Nuvem ativa/i.test(e.textContent))e.textContent='● Online';else if(/Local/i.test(e.textContent))e.textContent='● Offline local'}).observe(e,{childList:true,subtree:true,characterData:true})}}
function ready(){style();logos();camera();status();setTimeout(()=>{style();logos();camera();status()},600);setTimeout(()=>{style();logos();camera();status()},1800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();