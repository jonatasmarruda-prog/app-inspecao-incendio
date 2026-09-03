(()=>{
'use strict';

/* Fotos SST v3
   - múltiplas fotos reais no Android/iPhone
   - acumula todas as seleções; nunca substitui as anteriores
   - aceita formatos comuns de celular/câmera e converte para JPEG
   - HEIC/HEIF e TIFF possuem conversores de compatibilidade sob demanda
   - processamento sequencial para evitar travamento/memória alta
   - mantém proporção original, sem recorte */
const STYLE_ID='tbm-photo-multi-fix-style';
const STATUS_ID='tbm-photo-processing-status';
const ACCEPT='image/*,.jpg,.jpeg,.jfif,.pjpeg,.pjp,.png,.webp,.heic,.heif,.avif,.gif,.bmp,.tif,.tiff,.svg';
const HEIC_SRC='https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
const TIFF_SRC='https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.min.js';
let photoQueue=Promise.resolve();
let externalLoad={};

function appState(){
  try{return typeof state!=='undefined'&&state?state:(window.state||null)}catch(_){return window.state||null}
}

function injectNoCropCSS(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
    .photoCard img{width:100%!important;height:auto!important;max-height:360px!important;object-fit:contain!important;object-position:center!important;display:block!important;background:#fff!important}
    .rphotos img{width:100%!important;height:auto!important;max-height:260px!important;object-fit:contain!important;object-position:center!important;display:block!important;background:#fff!important}
    #${STATUS_ID}{font-size:11px;margin-top:8px;color:#94a3b8;line-height:1.4}
    #${STATUS_ID}.busy{color:#fbbf24;font-weight:800}
    #${STATUS_ID}.ok{color:#4ade80;font-weight:800}
    #${STATUS_ID}.error{color:#f87171;font-weight:800}
  `;
  document.head.appendChild(s);
}

function statusBox(){
  let el=document.getElementById(STATUS_ID);
  if(el)return el;
  const input=document.getElementById('photoInput');
  if(!input)return null;
  el=document.createElement('div');
  el.id=STATUS_ID;
  input.insertAdjacentElement('afterend',el);
  return el;
}
function setStatus(text,cls=''){
  const el=statusBox();if(!el)return;
  el.className=cls;el.textContent=text||'';
}

function fileExt(file){
  const m=String(file?.name||'').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?m[1]:'';
}
function isHeic(file){
  const t=String(file?.type||'').toLowerCase(),e=fileExt(file);
  return /heic|heif/.test(t)||e==='heic'||e==='heif';
}
function isTiff(file){
  const t=String(file?.type||'').toLowerCase(),e=fileExt(file);
  return /tiff/.test(t)||e==='tif'||e==='tiff';
}
function isImageFile(file){
  if(!file)return false;
  const type=String(file.type||'').toLowerCase();
  if(type.startsWith('image/'))return true;
  return /\.(jpe?g|jfif|pjpeg|pjp|png|webp|heic|heif|avif|gif|bmp|tiff?|svg)$/i.test(String(file.name||''));
}

function loadScriptOnce(key,src,test){
  if(test())return Promise.resolve(true);
  if(externalLoad[key])return externalLoad[key];
  externalLoad[key]=new Promise((resolve,reject)=>{
    const old=document.getElementById('tbm-photo-lib-'+key);
    if(old)old.remove();
    const s=document.createElement('script');
    s.id='tbm-photo-lib-'+key;s.src=src;s.async=true;
    const timer=setTimeout(()=>reject(new Error('Tempo esgotado ao carregar conversor '+key)),15000);
    s.onload=()=>{clearTimeout(timer);test()?resolve(true):reject(new Error('Conversor '+key+' não iniciou.'))};
    s.onerror=()=>{clearTimeout(timer);reject(new Error('Não foi possível carregar conversor '+key+'.'))};
    document.head.appendChild(s);
  }).catch(e=>{delete externalLoad[key];throw e});
  return externalLoad[key];
}

async function heicToBlob(file){
  await loadScriptOnce('heic',HEIC_SRC,()=>typeof window.heic2any==='function');
  const result=await window.heic2any({blob:file,toType:'image/jpeg',quality:0.90});
  const blob=Array.isArray(result)?result[0]:result;
  if(!(blob instanceof Blob))throw new Error('Falha ao converter HEIC/HEIF.');
  return blob;
}

async function tiffToCanvas(file){
  await loadScriptOnce('tiff',TIFF_SRC,()=>!!window.UTIF);
  const ab=await file.arrayBuffer();
  const ifds=window.UTIF.decode(ab);
  if(!ifds?.length)throw new Error('TIFF sem imagem válida.');
  window.UTIF.decodeImage(ab,ifds[0]);
  const rgba=window.UTIF.toRGBA8(ifds[0]);
  const w=Math.max(1,ifds[0].width||1),h=Math.max(1,ifds[0].height||1);
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d');if(!ctx)throw new Error('Canvas indisponível.');
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba),w,h),0,0);
  return {source:c,width:w,height:h,cleanup:()=>{c.width=1;c.height=1}};
}

async function nativeSource(blob){
  if(typeof createImageBitmap==='function'){
    try{
      let bm;
      try{bm=await createImageBitmap(blob,{imageOrientation:'from-image'})}catch(_){bm=await createImageBitmap(blob)}
      if(bm?.width&&bm?.height)return {source:bm,width:bm.width,height:bm.height,cleanup:()=>{try{bm.close()}catch(_){}}};
    }catch(_){ }
  }
  return await new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(blob);const img=new Image();let done=false;
    const finish=(fn,v)=>{if(done)return;done=true;fn(v)};
    img.onload=()=>{
      const w=Math.max(1,img.naturalWidth||img.width||1),h=Math.max(1,img.naturalHeight||img.height||1);
      finish(resolve,{source:img,width:w,height:h,cleanup:()=>URL.revokeObjectURL(url)});
    };
    img.onerror=()=>{URL.revokeObjectURL(url);finish(reject,new Error('Formato não decodificado nativamente.'))};
    img.src=url;
  });
}

async function decodePhoto(file){
  try{return await nativeSource(file)}catch(nativeError){
    if(isHeic(file)){
      const converted=await heicToBlob(file);
      return nativeSource(converted);
    }
    if(isTiff(file))return tiffToCanvas(file);
    throw nativeError;
  }
}

function canvasBlob(canvas,type='image/jpeg',quality=0.82){
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao converter a foto.')),type,quality));
}
function blobDataUrl(blob){
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('Falha ao ler a foto.'));r.readAsDataURL(blob)});
}

async function normalizedDataUrl(file){
  const decoded=await decodePhoto(file);
  try{
    const originalW=Math.max(1,decoded.width),originalH=Math.max(1,decoded.height);
    const maxSide=1400;
    const scale=Math.min(1,maxSide/Math.max(originalW,originalH));
    const width=Math.max(1,Math.round(originalW*scale)),height=Math.max(1,Math.round(originalH*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
    if(!ctx)throw new Error('Canvas indisponível.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
    ctx.drawImage(decoded.source,0,0,width,height);
    const blob=await canvasBlob(canvas,'image/jpeg',0.80);
    const data=await blobDataUrl(blob);
    canvas.width=1;canvas.height=1;
    return data;
  }finally{try{decoded.cleanup?.()}catch(_){ }}
}

function photoId(){return 'PHOTO-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}

async function processBatch(files){
  const st=appState();if(!st)return;
  if(!Array.isArray(st.photos))st.photos=[];
  const batchId=String(st.id||'');
  let added=0,failed=0;
  for(let i=0;i<files.length;i++){
    const file=files[i];
    if(!isImageFile(file)){failed++;continue}
    setStatus(`⏳ Processando foto ${i+1} de ${files.length}...`,'busy');
    try{
      const data=await normalizedDataUrl(file);
      const current=appState();
      if(!current||String(current.id||'')!==batchId)throw new Error('A inspeção foi alterada durante o processamento.');
      if(!Array.isArray(current.photos))current.photos=[];
      current.photos.push({id:photoId(),data,caption:'',name:file.name||'foto',originalType:file.type||fileExt(file)||'imagem'});
      added++;
      window.renderPhotos?.();
      await new Promise(r=>(window.requestAnimationFrame||setTimeout)(()=>r(),16));
    }catch(e){
      failed++;console.warn('[FOTOS] Falha ao processar',file?.name||'imagem',e);
    }
  }
  if(added){window.renderPhotos?.();window.scheduleSave?.();}
  if(failed)setStatus(`⚠️ ${added} foto(s) adicionada(s). ${failed} arquivo(s) não puderam ser convertido(s).`,'error');
  else setStatus(`✅ ${added} foto(s) adicionada(s). Total nesta inspeção: ${appState()?.photos?.length||0}.`,'ok');
}

function queueFiles(files){
  const snapshot=Array.from(files||[]);
  if(!snapshot.length)return;
  photoQueue=photoQueue.then(()=>processBatch(snapshot)).catch(e=>{console.error('[FOTOS] Fila:',e);setStatus('❌ Falha ao processar as fotos. Tente novamente.','error')});
}

function prepareInput(input){
  if(!input)return;
  input.multiple=true;
  input.setAttribute('multiple','multiple');
  input.setAttribute('accept',ACCEPT);
  try{input.removeAttribute('webkitdirectory')}catch(_){ }
}

function bindPickerButtons(input){
  const tools=document.querySelector('.photoTools');if(!tools)return;
  const buttons=[...tools.querySelectorAll('button')];
  if(buttons.length<2)return;
  const camera=buttons[0],gallery=buttons[1];
  camera.classList.add('cameraBtn');gallery.classList.add('galleryBtn');
  if(!gallery.dataset.tbmGalleryV3){
    gallery.dataset.tbmGalleryV3='1';
    gallery.addEventListener('click',()=>{prepareInput(input);input.removeAttribute('capture');try{input.value=''}catch(_){}},true);
  }
  if(!camera.dataset.tbmCameraV3){
    camera.dataset.tbmCameraV3='1';
    camera.addEventListener('click',()=>{prepareInput(input);input.setAttribute('capture','environment');try{input.value=''}catch(_){}},true);
  }
}

function install(){
  injectNoCropCSS();
  const input=document.getElementById('photoInput');if(!input)return;
  prepareInput(input);bindPickerButtons(input);statusBox();

  if(window.__tbmPhotoMultiInput===input&&window.__tbmPhotoMultiHandler){prepareInput(input);return}
  if(window.__tbmPhotoMultiInput&&window.__tbmPhotoMultiHandler){try{window.__tbmPhotoMultiInput.removeEventListener('change',window.__tbmPhotoMultiHandler,true)}catch(_){ }}

  const handler=e=>{
    const files=Array.from(e.target?.files||[]);
    try{e.target.value=''}catch(_){ }
    e.stopImmediatePropagation();
    queueFiles(files);
  };
  input.addEventListener('change',handler,true);
  window.__tbmPhotoMultiInput=input;window.__tbmPhotoMultiHandler=handler;
  input.dataset.tbmMultiPhotoFix='3';
}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-del-photo]')){
    const input=document.getElementById('photoInput');if(input)try{input.value=''}catch(_){ }
    setTimeout(()=>setStatus(`Total nesta inspeção: ${appState()?.photos?.length||0} foto(s).`,'ok'),80);
  }
},true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,250);setTimeout(install,900);setTimeout(install,2200);
window.tbmInstallMultiPhotoFix=install;
window.tbmQueueInspectionPhotos=queueFiles;
})();
