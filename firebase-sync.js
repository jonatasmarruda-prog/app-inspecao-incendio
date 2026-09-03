/* Firebase Cloud Sync — SST Inspeções */
(()=>{'use strict';
const CFG={apiKey:'AIzaSyBFOJOxX59k1dfZbOauv4zjkh_qhynuLuU',authDomain:'app-inspecao-sst-79aa6.firebaseapp.com',projectId:'app-inspecao-sst-79aa6',storageBucket:'app-inspecao-sst-79aa6.firebasestorage.app',messagingSenderId:'992254064215',appId:'1:992254064215:web:ffa5f1c463b444d8479512',measurementId:'G-ZQ0ZT0YVPE'};
const V='20260903-22',S='SSTInspecoes',ST='registros';
let db=null,auth=null,ready=false;
function script(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
async function sdk(){if(window.firebase?.apps?.length)return;await script('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');await script('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js');await script('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js');firebase.initializeApp(CFG);}
async function localAll(){return new Promise((ok,no)=>{const r=indexedDB.open(S,1);r.onsuccess=()=>{const d=r.result;if(!d.objectStoreNames.contains(ST))return ok([]);const q=d.transaction(ST,'readonly').objectStore(ST).getAll();q.onsuccess=()=>ok(q.result||[]);q.onerror=()=>no(q.error)};r.onerror=()=>no(r.error)})}
async function localPut(x){return new Promise((ok,no)=>{const r=indexedDB.open(S,1);r.onsuccess=()=>{const d=r.result;if(!d.objectStoreNames.contains(ST))return no(Error('store'));const q=d.transaction(ST,'readwrite').objectStore(ST).put(x);q.onsuccess=ok;q.onerror=()=>no(q.error)};r.onerror=()=>no(r.error)})}
function clean(x){const y=JSON.parse(JSON.stringify(x));if(JSON.stringify(y).length>850000){y.photos=[];y.signature='';y._cloudNote='Fotos/assinatura mantidas somente no dispositivo até Storage ser configurado.'}return y}
async function start(){try{await sdk();auth=firebase.auth();if(!auth.currentUser)await auth.signInAnonymously();db=firebase.firestore();ready=true;await pull();await push();setInterval(()=>push().catch(()=>{}),5000);window.dispatchEvent(new CustomEvent('sst-cloud-ready'));console.log('SST Cloud: sincronização ativa')}catch(e){console.warn('SST Cloud indisponível:',e);window.dispatchEvent(new CustomEvent('sst-cloud-error',{detail:e}))}}
async function push(){if(!ready||!db)return;const list=await localAll();const col=db.collection('inspections');for(const x of list){try{await col.doc(String(x.id)).set({...clean(x),cloudUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})}catch(e){console.warn('Falha ao sincronizar',x.id,e)}}}
async function pull(){if(!ready||!db)return;const snap=await db.collection('inspections').get();for(const d of snap.docs){const x=d.data();delete x.cloudUpdatedAt;await localPut(x)}}
window.SSTCloud={start,push,pull,isReady:()=>ready,projectId:CFG.projectId};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();