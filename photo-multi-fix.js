(()=>{
'use strict';

/* Ajuste isolado do módulo de fotos: múltipla seleção, acúmulo e proporção original. */
const STYLE_ID='tbm-photo-multi-fix-style';

function appState(){
  try{return typeof state!=='undefined'&&state?state:null}catch(_){return window.state||null}
}

function injectNoCropCSS(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
    .photoCard img{width:100%!important;object-fit:contain!important;object-position:center!important;display:block!important}
    .rphotos img{width:100%!important;object-fit:contain!important;object-position:center!important;display:block!important}
  `;
  document.head.appendChild(s);
}

async function hashFile(file){
  try{
    if(!window.crypto?.subtle)return'';
    const buf=await file.arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',buf);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(_){return''}
}

function proportionalDataUrl(file){
  return new Promise((resolve,reject)=>{
    if(!file||!String(file.type||'').startsWith('image/'))return reject(new Error('Arquivo inválido.'));
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
        /* O desenho ocupa o canvas proporcional inteiro: não há crop. */
        ctx.drawImage(img,0,0,width,height);
        done(resolve,canvas.toDataURL('image/jpeg',0.84));
      }catch(e){done(reject,e)}
    };
    img.onerror=()=>done(reject,new Error('Não foi possível processar a imagem.'));
    img.src=url;
  });
}

async function addFiles(files){
  const st=appState();
  if(!st)return;
  if(!Array.isArray(st.photos))st.photos=[];
  let added=0;
  for(const file of [...(files||[])]){
    if(!String(file.type||'').startsWith('image/'))continue;
    try{
      const hash=await hashFile(file);
      if(hash&&st.photos.some(p=>p?.hash===hash))continue;
      const data=await proportionalDataUrl(file);
      if(st.photos.some(p=>p?.data===data))continue;
      st.photos.push({data,caption:'',hash});
      added++;
    }catch(e){console.warn('[FOTOS] Imagem ignorada:',e)}
  }
  if(added){
    if(typeof window.renderPhotos==='function')window.renderPhotos();
    if(typeof window.scheduleSave==='function')window.scheduleSave();
  }
}

function install(){
  injectNoCropCSS();
  const input=document.getElementById('photoInput');
  if(!input)return;

  /* Garante múltipla seleção na galeria mesmo se outro módulo alterar o input. */
  input.multiple=true;
  input.setAttribute('multiple','multiple');
  if(input.dataset.tbmMultiPhotoFix==='1')return;
  input.dataset.tbmMultiPhotoFix='1';

  /* Handler final: adiciona ao array existente; nunca substitui state.photos. */
  input.onchange=async e=>{
    const files=[...(e.target?.files||[])];
    if(!files.length)return;
    try{await addFiles(files)}
    finally{input.value=''}
  };
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,500);
setTimeout(install,1500);
window.tbmInstallMultiPhotoFix=install;
})();
