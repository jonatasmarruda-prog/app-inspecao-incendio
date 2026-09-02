// Correção da assinatura digital: desenhar com dedo/caneta/toque sem travar ou rolar a tela.
(function(){
  function makeSignature(id){
    const c=document.getElementById(id);
    if(!c) return null;
    const ctx=c.getContext('2d',{willReadFrequently:false});
    let drawing=false,last=null;
    function fit(){
      const rect=c.getBoundingClientRect();
      const d=Math.max(1,Math.min(3,window.devicePixelRatio||1));
      const old=c.width&&c.height?c.toDataURL('image/png'):'';
      c.width=Math.max(320,Math.floor(rect.width*d));
      c.height=Math.floor(180*d);
      c.style.height='180px';
      ctx.setTransform(d,0,0,d,0,0);
      ctx.lineWidth=2.4;
      ctx.lineCap='round';
      ctx.lineJoin='round';
      ctx.strokeStyle='#111827';
      if(old){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,c.width/d,c.height/d);im.src=old;}
    }
    fit();
    function point(e){const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
    function down(e){
      if(e.pointerType==='mouse' && e.button!==0)return;
      drawing=true;last=point(e);c.setPointerCapture?.(e.pointerId);e.preventDefault();
    }
    function move(e){
      if(!drawing)return;
      const p=point(e);
      ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;
      if(typeof window.autoSave==='function') window.autoSave();
      e.preventDefault();
    }
    function up(e){drawing=false;last=null;if(e?.pointerId!=null){try{c.releasePointerCapture(e.pointerId)}catch(_){}}if(typeof window.autoSave==='function')window.autoSave();}
    c.onpointerdown=down;c.onpointermove=move;c.onpointerup=up;c.onpointercancel=up;c.onpointerleave=()=>{};
    c.ondragstart=e=>e.preventDefault();
    return c;
  }
  window.signature=makeSignature;
  window.clearSig=function(n){
    const c=n===1?window.s1:window.s2;
    if(!c)return;
    const ctx=c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);
    if(typeof window.autoSave==='function')window.autoSave();
  };
})();
