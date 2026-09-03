(function(){
'use strict';
function ready(){
  var title=document.querySelector('.brand b');
  if(title) title.textContent='SISTEMA DE INSPEÇÃO SST';
  var sub=document.querySelector('.brand span');
  if(sub) sub.textContent='TBM Têxtil • Controle Profissional';
  var badge=document.querySelector('.badge');
  if(badge) badge.textContent='SISTEMA PROFISSIONAL DE INSPEÇÃO';
  var status=document.getElementById('cloudState');
  if(status){
    var observer=new MutationObserver(function(){
      if(/Nuvem ativa/i.test(status.textContent)) status.innerHTML='● Online';
      else if(/Local/i.test(status.textContent)) status.innerHTML='● Local';
    });
    observer.observe(status,{childList:true,subtree:true,characterData:true});
  }
  setupPhotoTools();
}
function setupPhotoTools(){
  var original=document.getElementById('photoInput');
  if(!original || document.getElementById('cameraInput')) return;
  var card=original.closest('.card');
  if(!card) return;
  var tools=document.createElement('div');
  tools.className='photoTools no-print';
  tools.innerHTML='<button type="button" class="photoTool camera" id="takePhoto">📷 Tirar foto</button><button type="button" class="photoTool gallery" id="choosePhotos">🖼️ Escolher da galeria</button><input id="cameraInput" type="file" accept="image/*" capture="environment" multiple><input id="galleryInput" type="file" accept="image/*" multiple>';
  original.style.display='none';
  original.parentNode.insertBefore(tools,original);
  var camera=document.getElementById('cameraInput');
  var gallery=document.getElementById('galleryInput');
  var take=document.getElementById('takePhoto');
  var choose=document.getElementById('choosePhotos');
  take.addEventListener('click',function(){camera.click()});
  choose.addEventListener('click',function(){gallery.click()});
  camera.addEventListener('change',function(e){if(typeof window.addPhotos==='function') window.addPhotos(e.target.files);else if(original.onchange){try{original.onchange({target:{files:e.target.files}})}catch(_){}}camera.value=''});
  gallery.addEventListener('change',function(e){if(typeof window.addPhotos==='function') window.addPhotos(e.target.files);else if(original.onchange){try{original.onchange({target:{files:e.target.files}})}catch(_){}}gallery.value=''});
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready); else ready();
})();
