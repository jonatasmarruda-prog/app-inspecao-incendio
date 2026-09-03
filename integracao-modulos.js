/* Integração SST — carregamento único e confiável */
(()=>{'use strict';
const VERSION='20260903-19';
const FILES=['sst-modulos.js','abnt-relatorio.js','compartilhar-relatorio.js','editar-relatorio.js'];
window.SSTAppModules=window.SSTAppModules||{};
function load(src){return new Promise((resolve,reject)=>{if(src==='sst-modulos.js'&&typeof window.openSSTModule==='function')return resolve();const s=document.createElement('script');s.src='./'+src+'?v='+VERSION+'&t='+Date.now();s.async=false;s.onload=()=>resolve();s.onerror=()=>reject(new Error(src));document.head.appendChild(s)})}
window.SSTAppModules.ready=(async()=>{for(const f of FILES){try{await load(f);window.SSTAppModules[f]=true}catch(e){console.error('SST:',e)}}return true})();
function bind(){const map={startSafety:'seg',startMachine:'machine',startEpi:'epi',startAccident:'accident',startReport:'report'};for(const [id,type] of Object.entries(map)){const b=document.getElementById(id);if(!b||b.dataset.sstBound==='1')continue;b.dataset.sstBound='1';b.onclick=async e=>{e.preventDefault();e.stopPropagation();if(typeof window.openSSTModule!=='function')await window.SSTAppModules.ready;if(typeof window.openSSTModule==='function')window.openSSTModule(type);else alert('Não foi possível carregar esta inspeção. Atualize a página e tente novamente.')}}}
function start(){bind();[300,1000,2500].forEach(ms=>setTimeout(bind,ms));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();