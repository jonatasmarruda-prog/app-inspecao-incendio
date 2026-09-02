(()=>{
  'use strict';
  const css=`
  .abnt-report{font-family:'Times New Roman',Times,serif!important;font-size:12pt!important;line-height:1.5!important;color:#111!important;background:#fff!important}
  .abnt-report *{font-family:'Times New Roman',Times,serif!important}
  .abnt-report p{font-size:12pt!important;line-height:1.5!important;text-align:justify!important;text-indent:1.25cm!important;margin:0 0 6pt!important}
  .abnt-report h1,.abnt-report h2,.abnt-report h3{font-weight:700!important;line-height:1.5!important}
  .abnt-report h1{font-size:14pt!important;text-align:center!important;text-transform:uppercase!important;margin:0 0 12pt!important}
  .abnt-report h2{font-size:12pt!important;text-align:left!important;margin:14pt 0 6pt!important}
  .abnt-report h3{font-size:12pt!important;margin:10pt 0 4pt!important}
  .abnt-report .reportHeader{border-bottom:0!important;text-align:center!important;margin:0 0 18pt!important;padding:0!important}
  .abnt-report .reportHeader h1{margin-bottom:6pt!important}
  .abnt-report .reportMeta{font-size:10pt!important;line-height:1.5!important;text-align:center!important}
  .abnt-report .reportSummary{display:block!important;margin:12pt 0!important}
  .abnt-report .reportSummary div{display:inline-block!important;width:24%!important;vertical-align:top!important;border:1px solid #999!important;border-radius:0!important;padding:6pt!important;font-size:9pt!important;text-align:center!important}
  .abnt-report .reportSummary strong{font-size:12pt!important}
  .abnt-report .equipReport{border:0!important;border-radius:0!important;padding:0!important;margin:12pt 0!important;break-inside:auto!important}
  .abnt-report .equipTitle{background:none!important;border-left:0!important;border-bottom:1px solid #111!important;padding:0 0 4pt!important;margin:0 0 6pt!important;font-weight:700!important}
  .abnt-report .equipMeta{font-size:10pt!important;line-height:1.5!important}
  .abnt-report .rtable{width:100%!important;border-collapse:collapse!important;margin:8pt 0 12pt!important}
  .abnt-report .rtable th,.abnt-report .rtable td{font-size:10pt!important;line-height:1.35!important;padding:5pt!important;border:1px solid #555!important;vertical-align:top!important}
  .abnt-report .rtable th{text-align:center!important;font-weight:700!important}
  .abnt-report .rphotos{gap:10pt!important}
  .abnt-report .rphotos figure{border:0!important;padding:0!important;text-align:center!important}
  .abnt-report .rphotos figcaption{font-size:9pt!important;line-height:1.35!important}
  .abnt-report .signatures{margin-top:24pt!important;gap:24pt!important}
  .abnt-report .signatureBox{border:0!important;border-top:1px solid #111!important;border-radius:0!important;padding-top:5pt!important;text-align:center!important;min-height:100pt!important}
  .abnt-report .footerReport{font-size:9pt!important;line-height:1.35!important;text-align:center!important;color:#444!important;border-top:1px solid #777!important;margin-top:18pt!important;padding-top:6pt!important}
  @media print{
    @page{size:A4 portrait;margin:3cm 2cm 2cm 3cm}
    html,body{margin:0!important;padding:0!important;background:#fff!important}
    .abnt-report{width:auto!important;min-height:0!important;padding:0!important;margin:0!important;font-size:12pt!important;line-height:1.5!important}
    .abnt-report .no-print,.no-print{display:none!important}
    .abnt-report .reportHeader{page-break-after:avoid!important}
    .abnt-report h1,.abnt-report h2,.abnt-report h3{page-break-after:avoid!important}
    .abnt-report p{orphans:3;widows:3}
    .abnt-report .rtable{page-break-inside:auto!important}
    .abnt-report .rtable tr,.abnt-report .rphotos figure,.abnt-report .signatureBox{break-inside:avoid!important;page-break-inside:avoid!important}
    .abnt-report .reportSummary div{width:23.5%!important}
    .abnt-report .rphotos img{max-height:145px!important;height:auto!important}
  }
  `;
  function apply(){
    if(!document.getElementById('abnt-report-style')){const s=document.createElement('style');s.id='abnt-report-style';s.textContent=css;document.head.appendChild(s)}
    document.querySelectorAll('.report').forEach(r=>r.classList.add('abnt-report'));
  }
  apply();
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
