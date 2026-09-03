(()=>{
'use strict';

function currentInspectionId(){
  const selectors=['#inspectionId','#inspectionID','#idInspecao','#reportId','#numeroInspecao','[data-inspection-id]'];
  for(const sel of selectors){const el=document.querySelector(sel);if(el){const v=(el.value||el.textContent||el.dataset.inspectionId||'').trim();if(v)return v;}}
  for(const k of ['inspectionId','inspection_id','currentInspectionId','idInspecao','inspection']){
    try{const v=localStorage.getItem(k);if(v&&v.trim())return v.trim()}catch(_){ }
  }
  return '';
}

async function removeCurrentFromIndexedDB(id){
  if(!id||!indexedDB.databases)return;
  try{
    const dbs=await indexedDB.databases();
    for(const meta of dbs){
      if(!meta.name)continue;
      await new Promise(resolve=>{
        const req=indexedDB.open(meta.name);
        req.onerror=()=>resolve();
        req.onsuccess=()=>{
          const db=req.result;
          const stores=[...db.objectStoreNames];
          if(!stores.length){db.close();resolve();return;}
          let pending=stores.length;
          stores.forEach(storeName=>{
            try{
              const tx=db.transaction(storeName,'readwrite');
              const store=tx.objectStore(storeName);
              const cursorReq=store.openCursor();
              cursorReq.onsuccess=e=>{
                const cursor=e.target.result;
                if(!cursor){pending--;if(!pending){try{db.close()}catch(_){}resolve()}return;}
                let raw='';
                try{raw=JSON.stringify(cursor.value)}catch(_){}
                let key='';
                try{key=String(cursor.key)}catch(_){}
                if((raw&&raw.includes(id))||key===id){try{cursor.delete()}catch(_){}
                }
                cursor.continue();
              };
              cursorReq.onerror=()=>{pending--;if(!pending){try{db.close()}catch(_){}resolve()}};
            }catch(_){pending--;if(!pending){try{db.close()}catch(_){}resolve()}}
          });
        };
      });
    }
  }catch(e){console.warn('Não foi possível limpar o rascunho do IndexedDB:',e)}
}

async function limparInspecao(){
  const ok=confirm('Tem certeza que deseja excluir esta inspeção? Todos os dados não salvos, fotos e assinaturas serão perdidos.');
  if(!ok)return;

  const id=currentInspectionId();

  try{window.__tbmExtra=[]}catch(_){ }
  try{if(Array.isArray(window.photos))window.photos.length=0}catch(_){ }

  // Remove somente o rascunho/estado da inspeção atual.
  // Não chama nenhuma rotina de salvamento ou criação de histórico.
  const draftKeys=['inspectionId','inspection_id','currentInspectionId','idInspecao','inspection','draftInspection','inspectionDraft','currentInspection'];
  for(const key of draftKeys){
    try{localStorage.removeItem(key)}catch(_){ }
  }

  // Se a inspeção já tiver sido inserida temporariamente no histórico,
  // remove somente o registro correspondente ao ID cancelado.
  const historyKeys=['historico','historicoInspecoes','inspectionHistory','inspection_history','inspections','savedInspections'];
  if(id){
    for(const key of historyKeys){
      try{
        const raw=localStorage.getItem(key);
        if(!raw)continue;
        const data=JSON.parse(raw);
        if(!Array.isArray(data))continue;
        const filtered=data.filter(item=>{
          const itemId=item?.id??item?.inspectionId??item?.idInspecao??item?.numeroInspecao??'';
          return String(itemId).trim()!==String(id).trim();
        });
        localStorage.setItem(key,JSON.stringify(filtered));
      }catch(_){ }
    }
  }

  try{sessionStorage.clear()}catch(_){ }
  await removeCurrentFromIndexedDB(id);

  // Não chamar salvarNoHistorico(), salvarInspecao() ou qualquer persistência.
  window.location.reload();
}

window.limparInspecao=limparInspecao;

function addDeleteButton(){
  if(document.getElementById('btnExcluirInspecao'))return;
  const form=document.getElementById('form');
  if(!form)return;
  const actions=form.querySelector('.actions');
  if(!actions)return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.id='btnExcluirInspecao';
  btn.className='btn danger no-print';
  btn.textContent='🗑️ Excluir Inspeção';
  btn.title='Descartar a inspeção atual';
  btn.addEventListener('click',limparInspecao);
  actions.appendChild(btn);
}

function init(){
  addDeleteButton();
  const obs=new MutationObserver(addDeleteButton);
  obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(addDeleteButton,300);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
