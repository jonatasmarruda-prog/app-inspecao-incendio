(()=>{
'use strict';
// Compatibilidade: o gerador oficial agora é window.makePdf, implementado com pdfmake.
window.gerarPDFMaster=(action='download')=>window.makePdf?.(action);
window.exportarPDFMaster=(action='download')=>window.makePdf?.(action);
window.gerarRelatorioPDF=(action='download')=>window.makePdf?.(action);
})();
