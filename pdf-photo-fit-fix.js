(()=>{
'use strict';

/* Ajuste cirúrgico: somente o fit das fotos do relatório, sem alterar tabelas/cabeçalhos. */
function patchPdfMake(){
  if(!window.pdfMake||typeof window.pdfMake.createPdf!=='function')return false;
  if(window.pdfMake.createPdf.__tbmPhotoFitPatched)return true;

  const original=window.pdfMake.createPdf.bind(window.pdfMake);

  function walk(node){
    if(Array.isArray(node)){
      node.forEach(walk);
      return;
    }
    if(!node||typeof node!=='object')return;

    /* Fotos do grid usam originalmente fit [230,155].
       Convertido para um quadrado-limite sem crop; pdfmake preserva o aspect ratio. */
    if(typeof node.image==='string'&&/^data:image\//i.test(node.image)&&Array.isArray(node.fit)&&node.fit.length===2){
      const w=Number(node.fit[0]);
      const h=Number(node.fit[1]);
      if(w===230&&h===155)node.fit=[230,230];
    }

    Object.keys(node).forEach(k=>walk(node[k]));
  }

  function createPdf(docDefinition,...args){
    try{walk(docDefinition)}catch(e){console.warn('[PDF FOTO FIT]',e)}
    return original(docDefinition,...args);
  }
  createPdf.__tbmPhotoFitPatched=true;
  createPdf.__tbmOriginal=original;
  window.pdfMake.createPdf=createPdf;
  return true;
}

if(!patchPdfMake()){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(patchPdfMake()||tries>=30)clearInterval(timer);
  },200);
}
window.tbmPatchPdfPhotoFit=patchPdfMake;
})();
