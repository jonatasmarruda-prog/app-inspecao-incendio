(()=>{
'use strict';

/* Correção autoritativa do módulo de fotos no celular:
   - seleção múltipla real
   - fila sequencial para não perder imagens grandes
   - limpa o input imediatamente para permitir nova seleção
   - impede o handler antigo de processar o mesmo FileList
   - mantém proporção original e nunca recorta */
const STYLE_ID='tbm-photo-multi-fix-style';
let photoQueue=Promise.resolve();

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
  `;
  document.head.appendChild(s);
}

function isImageFile(file){
  if(!file)return false;
  const type=String(file.type||'').toLowerCase();
  if(type.startsWith('image/'))return true;
  return /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(String(file.name||''));
}

function sourceKey(file){
  return ['src',file?.name||'',file?.size||0,file?.lastModified||0].join(':');
}

function proportionalDataUrl(file){
  return new Promise((resolve,reject)=>{
    if(!isImageFile(file))return reject(new Error('Arquivo não é uma imagem.'));
    const url=URL.createObjectURL(file);
    const img=new Image();
    let finished=false;
    const done=(fn,v)=>{if(finished)return;finished=true;URL.revokeObjectURL(url);fn(v)};
    img.onload=()=>{
      try{
        const originalW=Math.max(1,img.naturalWidth||img.width||1);
        const originalH=Math.max(1,img.naturalHeight||img.height||1);
        const maxSide=1600;
        const scale=Math.min(1,maxSide/Math.max(originalW,originalH));
        const width=Math.max(1,Math.round(originalW*scale));
        const height=Math.max(1,Math.round(originalH*scale));
        const canvas=document.createElement('canvas');
        canvas.width=width;
        canvas.height=height;
        const ctx=canvas.getContext('2d',{alpha:false});
        if(!ctx)throw new Error('Canvas indisponível.');
        ctx.fillStyle='#fff';
        ctx.fillRect(0,0,width,height);
        ctx.drawImage(img,0,0,width,height);
        done(resolve,canvas.toDataURL('image/jpeg',0.84));
      }catch(e){done(reject,e)}
    };
    img.onerror=()=>done(reject,new Error('Não foi possível decodificar a imagem.'));
    img.src=url;
  });
}

async function processBatch(files){
  const st=appState();
  if(!st)return;
  if(!Array.isArray(st.photos))st.photos=[];
  let added=0;

  /* Processa UMA imagem por vez. Em celulares isso evita FileReader/canvas concorrentes
     consumindo memória e fazendo apenas a primeira foto aparecer. */
  for(const file of files){
    if(!isImageFile(file))continue;
    const key=sourceKey(file);
    if(st.photos.some(p=>p?.sourceKey===key))continue;
    try{
      const data=await proportionalDataUrl(file);
      if(st.photos.some(p=>p?.data===data))continue;
      st.photos.push({data,caption:'',sourceKey:key,hash:key});
      added++;
      if(typeof window.renderPhotos==='function')window.renderPhotos();
      /* Entrega um frame ao navegador entre imagens para manter a UI responsiva no celular. */
      await new Promise(r=>requestAnimationFrame(()=>r()));
    }catch(e){
      console.warn('[FOTOS] Falha ao processar',file?.name||'imagem',e);
    }
  }

  if(added&&typeof window.scheduleSave==='function')window.scheduleSave();
}

function queueFiles(files){
  const snapshot=Array.from(files||[]).filter(isImageFile);
  if(!snapshot.length)return;
  photoQueue=photoQueue.then(()=>processBatch(snapshot)).catch(e=>console.error('[FOTOS] Fila:',e));
}

function install(){
  injectNoCropCSS();
  const input=document.getElementById('photoInput');
  if(!input)return;

  input.multiple=true;
  input.setAttribute('multiple','multiple');
  input.setAttribute('accept','image/*,.jpg,.jpeg,.png,.webp,.heic,.heif');

  if(window.__tbmPhotoMultiInput===input&&window.__tbmPhotoMultiHandler)return;

  if(window.__tbmPhotoMultiInput&&window.__tbmPhotoMultiHandler){
    try{window.__tbmPhotoMultiInput.removeEventListener('change',window.__tbmPhotoMultiHandler,true)}catch(_){ }
  }

  const handler=e=>{
    const files=Array.from(e.target?.files||[]);
    /* Essencial no Android/iOS: libera o mesmo input imediatamente para uma nova
       escolha, inclusive da mesma foto, e evita a seleção antiga reaparecer. */
    try{e.target.value=''}catch(_){ }

    /* Bloqueia o onchange legado do index para não haver processamento duplo/concorrente. */
    e.stopImmediatePropagation();
    queueFiles(files);
  };

  input.addEventListener('change',handler,true);
  window.__tbmPhotoMultiInput=input;
  window.__tbmPhotoMultiHandler=handler;
  input.dataset.tbmMultiPhotoFix='2';
}

/* Ao excluir qualquer thumbnail, também garantimos que o seletor não conserve
   o FileList antigo no navegador móvel. */
document.addEventListener('click',e=>{
  if(!e.target.closest('[data-del-photo]'))return;
  const input=document.getElementById('photoInput');
  if(input)try{input.value=''}catch(_){ }
},true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,300);
setTimeout(install,1000);
setTimeout(install,2500);
window.tbmInstallMultiPhotoFix=install;
})();
