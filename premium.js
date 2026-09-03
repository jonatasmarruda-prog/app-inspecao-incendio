(function(){
  'use strict';
  var LOGO='./icon.svg?logo=tbm-20260903-v2';
  function fixLogo(img){
    if(!img||img.dataset.logoFixed)return;
    img.dataset.logoFixed='1';
    img.alt='TBM Têxtil';
    img.loading='eager';
    img.decoding='async';
    img.classList.add('tbm-logo');
    img.src=LOGO;
    img.onerror=function(){
      if(img.dataset.logoRetry)return;
      img.dataset.logoRetry='1';
      img.src='./icon.svg?logo=tbm-retry-2';
    };
  }
  function setup(){
    var title=document.querySelector('.brand b');
    if(title) title.textContent='SISTEMA DE INSPEÇÃO SST';
    var sub=document.querySelector('.brand span');
    if(sub) sub.textContent='TBM Têxtil • Controle Profissional';
    var badge=document.querySelector('.badge');
    if(badge) badge.textContent='SISTEMA PROFISSIONAL DE INSPEÇÃO';
    document.querySelectorAll('img.logo,img.reportLogo').forEach(fixLogo);
    var input=document.getElementById('photoInput');
    if(input&&!input.dataset.cameraReady){
      input.dataset.cameraReady='1';
      input.setAttribute('accept','image/*');
      input.setAttribute('capture','environment');
      var tools=document.createElement('div');tools.className='photoTools';
      var cam=document.createElement('button');cam.type='button';cam.className='btn cameraBtn';cam.textContent='📷 TIRAR FOTO';cam.onclick=function(){input.setAttribute('capture','environment');input.click()};
      var gal=document.createElement('button');gal.type='button';gal.className='btn galleryBtn';gal.textContent='🖼️ ESCOLHER DA GALERIA';gal.onclick=function(){input.removeAttribute('capture');input.click();setTimeout(function(){input.setAttribute('capture','environment')},500)};
      tools.appendChild(cam);tools.appendChild(gal);input.insertAdjacentElement('afterend',tools);
      var hint=document.createElement('div');hint.className='photoHint';hint.textContent='Tire a foto diretamente pela câmera ou escolha uma imagem da galeria.';tools.insertAdjacentElement('afterend',hint);
    }
    var status=document.getElementById('cloudState');
    if(status&&!status.dataset.premiumObserver){
      status.dataset.premiumObserver='1';
      new MutationObserver(function(){if(/Nuvem ativa/i.test(status.textContent))status.textContent='● Online';else if(/Local/i.test(status.textContent))status.textContent='● Offline local';}).observe(status,{childList:true,subtree:true,characterData:true});
    }
  }
  function ready(){setup();setTimeout(setup,500);setTimeout(setup,1500);setTimeout(setup,3000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
