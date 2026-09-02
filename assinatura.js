// Correção robusta da assinatura: coordenadas proporcionais ao canvas, compatível com Android/Samsung/Chrome.
(function(){
  function makeSignature(id){
    const c=document.getElementById(id);
    if(!c) return null;
    const ctx=c.getContext('2d');
    let drawing=false,last=null;

    function resize(){
      const rect=c.getBoundingClientRect();
      const d=Math.max(1,Math.min(3,window.devicePixelRatio||1));
      const cssW=Math.max(280,rect.width||320);
      const cssH=180;
      let old='';
      try{ if(c.width>0&&c.height>0) old=c.toDataURL('image/png'); }catch(_){ }
      c.width=Math.round(cssW*d);
      c.height=Math.round(cssH*d);
      c.style.width='100%';
      c.style.height=cssH+'px';
      ctx.setTransform(1,0,0,1,0,0);
      ctx.lineWidth=Math.max(2.2,2.5*d);
      ctx.lineCap='round';
      ctx.lineJoin='round';
      ctx.strokeStyle='#111827';
      if(old){
        const im=new Image();
        im.onload=()=>ctx.drawImage(im,0,0,c.width,c.height);
        im.src=old;
      }
    }

    resize();

    function point(e){
      const r=c.getBoundingClientRect();
      const x=Math.max(0,Math.min(r.width,e.clientX-r.left));
      const y=Math.max(0,Math.min(r.height,e.clientY-r.top));
      return {x:x*(c.width/r.width),y:y*(c.height/r.height)};
    }

    function down(e){
      if(e.pointerType==='mouse'&&e.button!==0)return;
      drawing=true;
      last=point(e);
      try{c.setPointerCapture(e.pointerId)}catch(_){ }
      e.preventDefault();
    }

    function move(e){
      if(!drawing)return;
      const p=point(e);
      ctx.beginPath();
      ctx.moveTo(last.x,last.y);
      ctx.lineTo(p.x,p.y);
      ctx.stroke();
      last=p;
      e.preventDefault();
      if(typeof window.autoSave==='function')window.autoSave();
    }

    function up(e){
      if(!drawing)return;
      drawing=false;
      last=null;
      try{c.releasePointerCapture(e.pointerId)}catch(_){ }
      if(typeof window.autoSave==='function')window.autoSave();
      e.preventDefault();
    }

    c.addEventListener('pointerdown',down,{passive:false});
    c.addEventListener('pointermove',move,{passive:false});
    c.addEventListener('pointerup',up,{passive:false});
    c.addEventListener('pointercancel',up,{passive:false});
    c.addEventListener('contextmenu',e=>e.preventDefault());
    c.addEventListener('dragstart',e=>e.preventDefault());
    return c;
  }

  window.signature=makeSignature;

  window.clearSig=function(n){
    const c=document.getElementById(n===1?'sig1':'sig2');
    if(!c)return;
    const ctx=c.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,c.width,c.height);
    if(typeof window.autoSave==='function')window.autoSave();
  };
})();
