(()=>{
'use strict';

const PT_TYPE='pt-altura';
const PT_TITLE='PT - Trabalho em Altura';
const EMISSOR_NOME='Jonatas Marques de Arruda';
const EMISSOR_CARGO='Coordenador / Técnico de Segurança do Trabalho';
const WORKSPACE_KEY='TBM-SST-07603376000300';
const LOGO='Têxtil Bezerra de Menezes 2.jpeg';
let ptState=null;
let saveTimerPT=null;
let cloudTimerPT=null;

const EPI_OPTIONS=[
  ['capacete','Capacete com jugular'],
  ['cinto','Cinto de segurança tipo paraquedista'],
  ['talabarte','Talabarte duplo com absorvedor de energia'],
  ['travaquedas','Trava-quedas'],
  ['botina','Botina / calçado de segurança'],
  ['luva','Luva apropriada'],
  ['oculos','Óculos de segurança'],
  ['pff2','Máscara PFF2'],
  ['protetor','Protetor auricular'],
  ['outro','Outro EPI']
];

const ACCESS_OPTIONS=[
  ['escadaSimples','Escada simples / portátil'],
  ['escadaExtensivel','Escada extensível'],
  ['andaime','Andaime'],
  ['pta','Plataforma Elevatória (PTA)'],
  ['outro','Outro meio de acesso']
];

const checklistPT=[
  // Qualificação e autorização
  {id:'qual1',n:1,categoria:'Qualificação e Autorização',grupo:'qualificacao',item:'Os trabalhadores possuem treinamento de NR 35 válido e compatível com a atividade?'},
  {id:'qual2',n:2,categoria:'Qualificação e Autorização',grupo:'qualificacao',item:'Os trabalhadores estão formalmente autorizados pela empresa para executar trabalho em altura?'},
  {id:'qual3',n:3,categoria:'Qualificação e Autorização',grupo:'qualificacao',item:'Os trabalhadores estão aptos no ASO para trabalho em altura, quando aplicável?'},
  {id:'qual4',n:4,categoria:'Qualificação e Autorização',grupo:'qualificacao',item:'Os trabalhadores receberam orientação sobre riscos, medidas de controle e condições da PT antes do início?'},
  {id:'qual5',n:5,categoria:'Qualificação e Autorização',grupo:'qualificacao',item:'Os executantes apresentam condições físicas e psicológicas adequadas para a atividade?'},

  // EPIs e sistema de proteção contra quedas
  {id:'epi1',n:6,categoria:'EPIs e Proteção contra Quedas',grupo:'epis',item:'Os trabalhadores estão utilizando os EPIs definidos para a atividade?'},
  {id:'epi2',n:7,categoria:'EPIs e Proteção contra Quedas',grupo:'epis',item:'Os EPIs estão em bom estado de conservação, limpos e sem danos aparentes?'},
  {id:'epi3',n:8,categoria:'EPIs e Proteção contra Quedas',grupo:'epis',item:'O capacete possui jugular e está corretamente ajustado ao trabalhador?'},
  {id:'epi4',n:9,categoria:'EPIs e Proteção contra Quedas',grupo:'epis',item:'O cinturão tipo paraquedista está em ótimo estado, sem cortes, desgaste excessivo, costuras soltas ou partes danificadas?'},
  {id:'epi5',n:10,categoria:'EPIs e Proteção contra Quedas',grupo:'epis',item:'O talabarte duplo, absorvedor de energia, conectores e mosquetões estão íntegros e funcionando corretamente?'},
  {id:'epi6',n:11,categoria:'EPIs e Proteção contra Quedas',grupo:'epis',item:'O trava-quedas, quando utilizado, é compatível com a linha de vida e está em boas condições?'},
  {id:'epi7',n:12,categoria:'EPIs e Proteção contra Quedas',grupo:'epis',item:'O ponto de ancoragem / linha de vida foi definido, inspecionado e é adequado à atividade?'},
  {id:'epi8',n:13,categoria:'EPIs e Proteção contra Quedas',grupo:'epis',item:'Durante a exposição à queda, o trabalhador permanece conectado ao sistema de proteção contra quedas?'},

  // Condições gerais e área
  {id:'geral1',n:14,categoria:'Condições Gerais e Área',grupo:'gerais',item:'As condições atmosféricas estão favoráveis, sem chuva, ventos fortes, descargas atmosféricas ou outra condição impeditiva?'},
  {id:'geral2',n:15,categoria:'Condições Gerais e Área',grupo:'gerais',item:'A área inferior e o entorno do trabalho estão isolados e sinalizados contra acesso de pessoas não autorizadas?'},
  {id:'geral3',n:16,categoria:'Condições Gerais e Área',grupo:'gerais',item:'A iluminação é suficiente para executar a atividade com segurança?'},
  {id:'geral4',n:17,categoria:'Condições Gerais e Área',grupo:'gerais',item:'Ferramentas, peças e materiais estão acondicionados ou amarrados para evitar queda de objetos?'},
  {id:'geral5',n:18,categoria:'Condições Gerais e Área',grupo:'gerais',item:'O piso, estrutura ou superfície de trabalho apresenta resistência, estabilidade e condições seguras de acesso?'},
  {id:'geral6',n:19,categoria:'Condições Gerais e Área',grupo:'gerais',item:'Há comunicação eficiente entre executantes, responsável pela atividade e apoio no solo?'},
  {id:'geral7',n:20,categoria:'Condições Gerais e Área',grupo:'gerais',item:'Existe condição de resgate e resposta a emergência compatível com a atividade e o local?'},
  {id:'geral8',n:21,categoria:'Condições Gerais e Área',grupo:'gerais',item:'Foram eliminados ou controlados riscos adicionais como aberturas, superfícies frágeis, partes móveis, calor, poeira ou produtos químicos?'},

  // Energia / bloqueio
  {id:'energia1',n:22,categoria:'Energia e Bloqueio',grupo:'energia',item:'Quando houver risco elétrico ou equipamento energizado, a fonte de energia foi desligada, bloqueada e identificada antes do trabalho?'},
  {id:'energia2',n:23,categoria:'Energia e Bloqueio',grupo:'energia',item:'Foi verificada ausência de energização ou acionamento inesperado dos equipamentos envolvidos?'},
  {id:'energia3',n:24,categoria:'Energia e Bloqueio',grupo:'energia',item:'Foram mantidas condições seguras em relação a redes elétricas, barramentos ou condutores próximos?'},

  // Escadas
  {id:'esc1',n:25,categoria:'Escadas',grupo:'escadas',item:'A escada selecionada é adequada ao serviço, à altura e ao local de utilização?'},
  {id:'esc2',n:26,categoria:'Escadas',grupo:'escadas',item:'A escada está em boas condições gerais, sem rachaduras, trincas, corrosão, deformações ou improvisações?'},
  {id:'esc3',n:27,categoria:'Escadas',grupo:'escadas',item:'Degraus, montantes e fixações estão íntegros, firmes e sem folgas?'},
  {id:'esc4',n:28,categoria:'Escadas',grupo:'escadas',item:'A escada possui sapatas / pés antiderrapantes em boas condições?'},
  {id:'esc5',n:29,categoria:'Escadas',grupo:'escadas',item:'A escada está apoiada em piso firme, nivelado e estável?'},
  {id:'esc6',n:30,categoria:'Escadas',grupo:'escadas',item:'A escada está fixada ou protegida contra deslocamento, escorregamento ou tombamento?'},
  {id:'esc7',n:31,categoria:'Escadas',grupo:'escadas',item:'Na escada extensível, travas, guias, cordas e sistemas de extensão estão íntegros e funcionando corretamente?'},
  {id:'esc8',n:32,categoria:'Escadas',grupo:'escadas',item:'A escada permite acesso e movimentação sem que o trabalhador precise se projetar excessivamente para os lados?'},
  {id:'esc9',n:33,categoria:'Escadas',grupo:'escadas',item:'A escada não está posicionada diante de portas, circulação de veículos ou áreas de risco sem bloqueio e sinalização?'},

  // Andaimes
  {id:'and1',n:34,categoria:'Andaimes',grupo:'andaimes',item:'O andaime possui todas as peças estruturais necessárias, sem componentes ausentes, improvisados ou danificados?'},
  {id:'and2',n:35,categoria:'Andaimes',grupo:'andaimes',item:'Bases, sapatas ou rodas estão instaladas corretamente sobre superfície firme e nivelada?'},
  {id:'and3',n:36,categoria:'Andaimes',grupo:'andaimes',item:'Travamentos, diagonais e contraventamentos estão instalados e firmes?'},
  {id:'and4',n:37,categoria:'Andaimes',grupo:'andaimes',item:'O piso / plataforma de trabalho está completo, firme, nivelado, sem vãos perigosos e com resistência adequada?'},
  {id:'and5',n:38,categoria:'Andaimes',grupo:'andaimes',item:'O andaime possui guarda-corpo, travessão intermediário e rodapé nas áreas necessárias?'},
  {id:'and6',n:39,categoria:'Andaimes',grupo:'andaimes',item:'O acesso ao andaime é seguro e realizado por meio apropriado, sem escalada pela estrutura externa?'},
  {id:'and7',n:40,categoria:'Andaimes',grupo:'andaimes',item:'O andaime está amarrado, ancorado ou estabilizado adequadamente contra tombamento e deslocamento?'},
  {id:'and8',n:41,categoria:'Andaimes',grupo:'andaimes',item:'Quando o andaime possuir rodas, todas estão travadas durante a execução do trabalho?'},
  {id:'and9',n:42,categoria:'Andaimes',grupo:'andaimes',item:'A capacidade de carga do andaime está sendo respeitada, sem excesso de pessoas, materiais ou equipamentos?'},
  {id:'and10',n:43,categoria:'Andaimes',grupo:'andaimes',item:'O andaime foi inspecionado antes do uso e não apresenta alteração que comprometa sua segurança?'},

  // Plataforma elevatória
  {id:'pta1',n:44,categoria:'Plataforma Elevatória (PTA)',grupo:'pta',item:'Foi realizado checklist pré-operacional da plataforma e o equipamento foi aprovado para utilização?'},
  {id:'pta2',n:45,categoria:'Plataforma Elevatória (PTA)',grupo:'pta',item:'O operador da plataforma é treinado, autorizado e está presente durante a operação?'},
  {id:'pta3',n:46,categoria:'Plataforma Elevatória (PTA)',grupo:'pta',item:'A plataforma está posicionada em piso firme, nivelado e compatível com o equipamento?'},
  {id:'pta4',n:47,categoria:'Plataforma Elevatória (PTA)',grupo:'pta',item:'A área de movimentação da plataforma está isolada e sinalizada?'},
  {id:'pta5',n:48,categoria:'Plataforma Elevatória (PTA)',grupo:'pta',item:'Guarda-corpos, portão de acesso e pontos de ancoragem da plataforma estão íntegros e funcionando corretamente?'},
  {id:'pta6',n:49,categoria:'Plataforma Elevatória (PTA)',grupo:'pta',item:'Comandos, parada de emergência, alarmes e sistema de descida de emergência estão operacionais?'},
  {id:'pta7',n:50,categoria:'Plataforma Elevatória (PTA)',grupo:'pta',item:'O trabalhador está conectado ao ponto de ancoragem definido pelo fabricante durante a utilização da plataforma?'},
  {id:'pta8',n:51,categoria:'Plataforma Elevatória (PTA)',grupo:'pta',item:'Foram avaliados obstáculos aéreos, estruturas, tubulações e riscos de esmagamento durante a movimentação?'},
  {id:'pta9',n:52,categoria:'Plataforma Elevatória (PTA)',grupo:'pta',item:'Foram controlados riscos de proximidade com instalações elétricas e partes energizadas?'},
  {id:'pta10',n:53,categoria:'Plataforma Elevatória (PTA)',grupo:'pta',item:'A carga, quantidade de pessoas e materiais estão dentro da capacidade permitida da plataforma?'},
  {id:'pta11',n:54,categoria:'Plataforma Elevatória (PTA)',grupo:'pta',item:'É proibido subir no guarda-corpo, usar escadas ou improvisar aumento de altura dentro da plataforma?'},

  // Encerramento
  {id:'final1',n:55,categoria:'Liberação e Encerramento',grupo:'final',item:'Todas as medidas de controle previstas foram implantadas antes da liberação do trabalho?'},
  {id:'final2',n:56,categoria:'Liberação e Encerramento',grupo:'final',item:'Qualquer condição de risco não prevista implica interrupção do trabalho e reavaliação da PT?'},
  {id:'final3',n:57,categoria:'Liberação e Encerramento',grupo:'final',item:'Ao final, materiais, ferramentas, proteções e área de trabalho serão deixados em condição segura?'},
];
window.checklistPT=checklistPT;
window.PT_EPI_OPTIONS=EPI_OPTIONS;
window.PT_ACCESS_OPTIONS=ACCESS_OPTIONS;

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const nowISO=()=>new Date().toISOString();
function idPT(){return 'PT-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,6).toUpperCase()}
function blankChecklist(){return checklistPT.map(x=>({...x,status:'N/A'}))}
function blankWorker(){return {id:'W-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,5),nome:'',signature:''}}
function blankFlags(options){return Object.fromEntries(options.map(([k])=>[k,false]))}
function freshState(){
  const d=new Date();
  return {
    id:idPT(),type:PT_TYPE,title:PT_TITLE,createdAt:nowISO(),updatedAt:nowISO(),
    description:'',workLocation:'',sector:'',date:d.toISOString().slice(0,10),startTime:'',endTime:'',
    episSelecionados:blankFlags(EPI_OPTIONS),epiOutro:'',meiosAcesso:blankFlags(ACCESS_OPTIONS),meioAcessoOutro:'',
    checklistPT:blankChecklist(),workers:[blankWorker()],
    issuer:{name:EMISSOR_NOME,role:EMISSOR_CARGO},status:'RASCUNHO'
  };
}
function normalizeState(x){
  const s=JSON.parse(JSON.stringify(x||freshState()));
  s.type=PT_TYPE;s.title=PT_TITLE;s.issuer={name:EMISSOR_NOME,role:EMISSOR_CARGO};
  s.checklistPT=checklistPT.map(q=>{const old=(s.checklistPT||[]).find(z=>z.id===q.id)||{};return {...q,status:['CONFORME','NÃO CONFORME','N/A'].includes(old.status)?old.status:'N/A'}});
  s.episSelecionados={...blankFlags(EPI_OPTIONS),...(s.episSelecionados||{})};
  s.meiosAcesso={...blankFlags(ACCESS_OPTIONS),...(s.meiosAcesso||{})};
  s.epiOutro=s.epiOutro||'';s.meioAcessoOutro=s.meioAcessoOutro||'';
  s.workers=Array.isArray(s.workers)&&s.workers.length?s.workers.map(w=>({id:w.id||blankWorker().id,nome:w.nome||'',signature:w.signature||''})):[blankWorker()];
  return s;
}
function statusClass(v){return v==='CONFORME'?'ok':v==='NÃO CONFORME'?'no':'na'}

function injectStyle(){
  if($('pt-altura-style'))return;
  const s=document.createElement('style');s.id='pt-altura-style';
  s.textContent=`
    .ptaltura{background:linear-gradient(145deg,#0f4c5c,#2a9d8f)}
    #ptAlturaOverlay{position:fixed;inset:0;background:#eef2f6;z-index:9998;overflow:auto;color:#17202b!important}
    #ptAlturaOverlay .ptbar{position:sticky;top:0;z-index:5;background:linear-gradient(135deg,#0f4c5c,#2a9d8f);color:#fff;box-shadow:0 8px 24px #0002}
    #ptAlturaOverlay .ptbarin{max-width:1080px;margin:auto;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px}
    #ptAlturaOverlay .card{background:#fff!important;color:#17202b!important;border-color:#d8dee7!important;box-shadow:0 10px 32px #17202b0d!important}
    #ptAlturaOverlay .sectionTitle,#ptAlturaOverlay .field label,#ptAlturaOverlay .pt-check-title,#ptAlturaOverlay .pt-check-item b,#ptAlturaOverlay .pt-worker,#ptAlturaOverlay .pt-worker b{color:#17202b!important}
    #ptAlturaOverlay .field input,#ptAlturaOverlay .field textarea,#ptAlturaOverlay .field select{background:#fff!important;color:#17202b!important;border:1px solid #cbd5e1!important}
    #ptAlturaOverlay .field input::placeholder,#ptAlturaOverlay .field textarea::placeholder{color:#64748b!important}
    .pt-select-box{border:1px solid #d9e0e8;border-radius:14px;padding:12px;background:#fbfcfe;margin:10px 0;color:#17202b!important}
    .pt-select-title{font-weight:900;margin-bottom:10px;color:#17202b!important}
    .pt-select-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .pt-option{display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid #dbe2ea;border-radius:10px;background:#fff;color:#17202b!important;font-size:12px;font-weight:800}
    .pt-option input{width:18px;height:18px;margin:0;accent-color:#0f766e;flex:0 0 auto}
    .pt-check-group{border:1px solid #d9e0e8;border-radius:14px;margin:12px 0;background:#fbfcfe;overflow:hidden;color:#17202b!important}
    .pt-check-group summary{list-style:none;cursor:pointer;padding:13px 14px;font-size:15px;font-weight:900;background:#f1f5f9;color:#17202b!important;display:flex;align-items:center;justify-content:space-between;gap:8px}
    .pt-check-group summary::-webkit-details-marker{display:none}
    .pt-check-content{padding:10px 12px 12px}
    .pt-count{font-size:10px;padding:4px 7px;border-radius:999px;background:#e2e8f0;color:#334155!important;white-space:nowrap}
    .pt-check-item{border:1px solid #dfe5ec;border-radius:10px;padding:10px;margin:8px 0;background:#fff;color:#17202b!important}
    .pt-check-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:8px}
    .pt-check-actions button{padding:9px 5px;border-radius:9px;background:#e9edf2;color:#17202b!important;font-size:11px;font-weight:900;min-height:38px}
    .pt-check-actions .ok{background:#dcfce7!important;color:#166534!important}.pt-check-actions .no{background:#fee2e2!important;color:#991b1b!important}.pt-check-actions .na{background:#e2e8f0!important;color:#334155!important}
    .pt-worker{border:1px solid #d9e0e8;border-radius:14px;padding:12px;margin:10px 0;background:#fbfcfe;color:#17202b!important}
    .pt-worker-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}
    .pt-sign{border:2px solid #94a3b8;border-radius:12px;background:#fff;overflow:hidden;margin-top:9px}
    .pt-sign canvas{display:block;width:100%;height:145px;background:#fff;touch-action:none}
    .pt-fixed-issuer{border-left:4px solid #0f4c5c!important;background:#f0fdfa!important;color:#17202b!important}
    #ptAlturaOverlay .mini{color:#64748b!important}
    @media(max-width:650px){.pt-select-grid{grid-template-columns:1fr}.pt-check-actions{grid-template-columns:repeat(3,minmax(0,1fr))}.pt-check-actions button{font-size:10px;padding:8px 3px}.pt-worker-head{align-items:flex-start}.pt-actions .btn{width:100%}}
  `;
  document.head.appendChild(s);
}

function addTile(){
  if($('ptAlturaTile'))return;
  const tiles=document.querySelector('#home .tiles');if(!tiles)return;
  const b=document.createElement('button');b.id='ptAlturaTile';b.type='button';b.className='tile ptaltura';
  b.innerHTML='<div class="ico">🪜</div><div><b>PT - Trabalho em Altura</b><span>NR 35 • Escadas, Andaimes e PTA</span></div>';
  b.onclick=()=>openPTAltura();tiles.appendChild(b);
}

function ensureOverlay(){
  let o=$('ptAlturaOverlay');if(o)return o;
  o=document.createElement('section');o.id='ptAlturaOverlay';o.className='hidden';
  o.innerHTML=`<div class="ptbar"><div class="ptbarin"><div><b>🪜 PT • Trabalho em Altura</b><div style="font-size:11px;opacity:.8">NR 35 • Permissão de Trabalho Simplificada</div></div><button type="button" id="ptClose" class="btn secondary">✕ Fechar</button></div></div><main class="wrap" id="ptAlturaBody"></main>`;
  document.body.appendChild(o);$('ptClose').onclick=()=>closePTAltura();return o;
}

function checkboxGridHTML(options,stateKey,otherField){
  const stateObj=ptState[stateKey]||{};
  return `<div class="pt-select-grid">${options.map(([key,label])=>`<label class="pt-option"><input type="checkbox" data-pt-flag-group="${stateKey}" data-pt-flag-key="${key}" ${stateObj[key]?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div>${otherField?`<div class="field" style="margin-top:10px"><label>Especifique outro</label><input data-pt-field="${otherField}" value="${esc(ptState[otherField]||'')}" placeholder="Descreva aqui"></div>`:''}`;
}

function groupHTML(group,title,open=false){
  const items=ptState.checklistPT.filter(x=>x.grupo===group);
  const nc=items.filter(x=>x.status==='NÃO CONFORME').length;
  const conformes=items.filter(x=>x.status==='CONFORME').length;
  return `<details class="pt-check-group" ${open?'open':''}><summary><span>${title}</span><span class="pt-count">${conformes} C • ${nc} NC • ${items.length} itens</span></summary><div class="pt-check-content">${items.map(q=>`<div class="pt-check-item"><b style="font-size:12px">${q.n}. ${esc(q.item)}</b><div class="pt-check-actions">${['CONFORME','NÃO CONFORME','N/A'].map(v=>`<button type="button" data-pt-check="${q.id}" data-pt-status="${v}" class="${q.status===v?statusClass(v):''}">${v}</button>`).join('')}</div></div>`).join('')}</div></details>`;
}

function workerHTML(w,i){
  return `<div class="pt-worker" data-pt-worker="${i}"><div class="pt-worker-head"><b>Executante ${i+1}</b>${ptState.workers.length>1?`<button type="button" class="btn danger" data-pt-remove-worker="${i}" style="padding:7px 9px">Excluir</button>`:''}</div><div class="field"><label>Nome do Executante</label><input data-pt-worker-name="${i}" value="${esc(w.nome)}" placeholder="Nome completo"></div><div class="field" style="margin-top:9px"><label>Assinatura do Executante</label><div class="pt-sign"><canvas id="ptSig-${i}" data-pt-sign="${i}"></canvas></div><button type="button" class="btn secondary full" data-pt-clear-sign="${i}">Limpar assinatura</button></div></div>`;
}

function renderPT(){
  const body=$('ptAlturaBody');if(!body||!ptState)return;
  body.innerHTML=`
    <div class="card"><div class="sectionTitle">Permissão de Trabalho - Trabalho em Altura</div><div id="ptMsg"></div><div class="grid">
      <div class="field" style="grid-column:1/-1"><label>Descrição do Trabalho *</label><textarea data-pt-field="description" placeholder="Descreva a atividade a ser executada">${esc(ptState.description)}</textarea></div>
      <div class="field"><label>Local do Trabalho *</label><input data-pt-field="workLocation" value="${esc(ptState.workLocation)}"></div>
      <div class="field"><label>Setor</label><input data-pt-field="sector" value="${esc(ptState.sector)}"></div>
      <div class="field"><label>Data *</label><input type="date" data-pt-field="date" value="${esc(ptState.date)}"></div>
      <div class="field"><label>Hora Inicial</label><input type="time" data-pt-field="startTime" value="${esc(ptState.startTime)}"></div>
      <div class="field"><label>Hora Final</label><input type="time" data-pt-field="endTime" value="${esc(ptState.endTime)}"></div>
    </div>
    <div class="pt-select-box"><div class="pt-select-title">🪜 Meio de acesso / equipamento utilizado</div>${checkboxGridHTML(ACCESS_OPTIONS,'meiosAcesso','meioAcessoOutro')}</div>
    <div class="pt-select-box"><div class="pt-select-title">🦺 EPIs previstos para esta atividade</div>${checkboxGridHTML(EPI_OPTIONS,'episSelecionados','epiOutro')}</div>
    </div>

    <div class="card"><div class="sectionTitle">Checklist Detalhado de Trabalho em Altura</div>
      <div class="notice info">Marque CONFORME, NÃO CONFORME ou N/A. As categorias podem ser abertas e fechadas para facilitar o preenchimento no celular.</div>
      ${groupHTML('qualificacao','👷 Qualificação e Autorização',true)}
      ${groupHTML('epis','🦺 EPIs e Proteção contra Quedas',true)}
      ${groupHTML('gerais','⚠️ Condições Gerais e Área')}
      ${groupHTML('energia','🔒 Energia e Bloqueio')}
      ${groupHTML('escadas','🪜 Escadas')}
      ${groupHTML('andaimes','🏗️ Andaimes')}
      ${groupHTML('pta','🚧 Plataforma Elevatória (PTA)')}
      ${groupHTML('final','✅ Liberação e Encerramento')}
    </div>

    <div class="card"><div class="sectionTitle">Trabalhadores Autorizados / Executantes</div><div class="notice info">Os colaboradores abaixo receberam treinamento e estão autorizados a executar as atividades.</div><div id="ptWorkers">${ptState.workers.map(workerHTML).join('')}</div><button type="button" id="ptAddWorker" class="btn secondary full">➕ Adicionar Executante</button></div>
    <div class="card pt-fixed-issuer"><div class="sectionTitle">Responsável pela Liberação</div><div class="grid"><div class="field"><label>Emissor / TST</label><input value="${esc(EMISSOR_NOME)}" readonly></div><div class="field"><label>Cargo</label><input value="${esc(EMISSOR_CARGO)}" readonly></div></div><div class="mini" style="margin-top:10px">Responsável técnico fixado no sistema. Não requer digitação manual.</div></div>
    <div class="card"><div class="actions pt-actions"><button type="button" id="ptSave" class="btn success">💾 Salvar PT</button><button type="button" id="ptPdf" class="btn primary">📥 Baixar PDF</button><button type="button" id="ptShare" class="btn blue">📲 Compartilhar PDF</button></div></div>`;
  bindPT();
  ptState.workers.forEach((w,i)=>setupSignature(i,w.signature));
}

function bindPT(){
  const body=$('ptAlturaBody');if(!body)return;
  body.oninput=e=>{
    e.stopPropagation();
    const f=e.target.dataset.ptField;if(f){ptState[f]=e.target.value;scheduleSavePT()}
    const wi=e.target.dataset.ptWorkerName;if(wi!==undefined){ptState.workers[+wi].nome=e.target.value;scheduleSavePT()}
  };
  body.onchange=e=>{
    e.stopPropagation();
    const group=e.target.dataset.ptFlagGroup,key=e.target.dataset.ptFlagKey;
    if(group&&key){ptState[group]=ptState[group]||{};ptState[group][key]=!!e.target.checked;scheduleSavePT()}
  };
  body.onclick=e=>{
    e.stopPropagation();
    const check=e.target.closest('[data-pt-check]');
    if(check){
      const q=ptState.checklistPT.find(x=>x.id===check.dataset.ptCheck);
      if(q){
        q.status=check.dataset.ptStatus;
        const item=check.closest('.pt-check-item');
        if(item){
          item.querySelectorAll('[data-pt-check]').forEach(btn=>{
            btn.classList.remove('ok','no','na');
            if(btn.dataset.ptStatus===q.status)btn.classList.add(statusClass(q.status));
          });
        }
        const details=check.closest('details');
        const count=details?.querySelector('.pt-count');
        if(count){
          const items=ptState.checklistPT.filter(x=>x.grupo===q.grupo);
          const conformes=items.filter(x=>x.status==='CONFORME').length;
          const nc=items.filter(x=>x.status==='NÃO CONFORME').length;
          count.textContent=`${conformes} C • ${nc} NC • ${items.length} itens`;
        }
        scheduleSavePT();
      }
      return;
    }
    const rm=e.target.closest('[data-pt-remove-worker]');if(rm){ptState.workers.splice(+rm.dataset.ptRemoveWorker,1);renderPT();scheduleSavePT();return}
    const clear=e.target.closest('[data-pt-clear-sign]');if(clear){const i=+clear.dataset.ptClearSign;ptState.workers[i].signature='';const c=$('ptSig-'+i);c?.getContext('2d')?.clearRect(0,0,c.width,c.height);scheduleSavePT();return}
  };
  $('ptAddWorker').onclick=e=>{e.stopPropagation();ptState.workers.push(blankWorker());renderPT();scheduleSavePT()};
  $('ptSave').onclick=e=>{e.stopPropagation();savePT(true)};
  $('ptPdf').onclick=e=>{e.stopPropagation();savePT(false).then(()=>makePTPdf('download'))};
  $('ptShare').onclick=e=>{e.stopPropagation();savePT(false).then(()=>makePTPdf('share'))};
}

function setupSignature(i,data){
  const c=$('ptSig-'+i);if(!c)return;
  const ratio=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  const rect=c.getBoundingClientRect();c.width=Math.max(320,Math.round(rect.width*ratio));c.height=Math.round(145*ratio);
  const ctx=c.getContext('2d');ctx.lineWidth=2.2*ratio;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111827';
  if(data){const img=new Image();img.onload=()=>{ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height)};img.src=data}
  let down=false,last=null;
  const point=e=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*(c.width/r.width),y:(e.clientY-r.top)*(c.height/r.height)}};
  c.onpointerdown=e=>{down=true;last=point(e);c.setPointerCapture?.(e.pointerId);e.preventDefault()};
  c.onpointermove=e=>{if(!down)return;const p=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;e.preventDefault()};
  const end=e=>{if(!down)return;down=false;ptState.workers[i].signature=c.toDataURL('image/png');scheduleSavePT();e?.preventDefault?.()};
  c.onpointerup=end;c.onpointercancel=end;c.onpointerleave=e=>{if(down)end(e)};
}

function showMsg(text,type='successbox'){
  const m=$('ptMsg');if(!m)return;m.className='notice '+type;m.textContent=text;setTimeout(()=>{if(m.textContent===text)m.textContent=''},2500)
}
function scheduleSavePT(){
  clearTimeout(saveTimerPT);
  saveTimerPT=setTimeout(()=>savePT(false,false),900);
  clearTimeout(cloudTimerPT);
  cloudTimerPT=setTimeout(()=>{
    const sync=()=>pushPTCloud().catch(()=>{});
    if(typeof requestIdleCallback==='function')requestIdleCallback(sync,{timeout:5000});
    else setTimeout(sync,0);
  },5000);
}

async function savePT(feedback=false,syncCloud=feedback){
  if(!ptState)return false;
  ptState.updatedAt=nowISO();ptState.issuer={name:EMISSOR_NOME,role:EMISSOR_CARGO};
  try{
    if(typeof window.idbPut==='function'){
      const previousExtra=window.__tbmExtra;
      try{
        window.__tbmExtra=[];
        await window.idbPut(ptState);
      }finally{
        window.__tbmExtra=previousExtra;
      }
    }
    if(syncCloud)pushPTCloud().catch(()=>{});
    if(feedback)showMsg('✅ PT salva com sucesso.');
    return true;
  }catch(e){console.error('[PT SAVE]',e);if(feedback)showMsg('❌ Não foi possível salvar a PT.','errorbox');return false}
}

async function pushPTCloud(){
  if(!ptState?.id||!window.SST?.fs)return false;
  const payload=JSON.parse(JSON.stringify(ptState));
  payload.workspaceKey=WORKSPACE_KEY;payload.cloudDeviceId=(localStorage.getItem('tbm-sst-device-id')||'PT');payload.cloudClientUpdatedAt=nowISO();payload.ownerUid=window.SST?.uid||'';payload.appVersion='2026.09.03.pt-altura.3';
  if(window.firebase?.firestore?.FieldValue?.serverTimestamp)payload.cloudSyncedAt=window.firebase.firestore.FieldValue.serverTimestamp();
  try{await window.SST.fs.collection('inspections').doc(String(payload.id)).set(payload,{merge:true});return true}catch(e){console.warn('[PT CLOUD]',e);return false}
}

function openPTAltura(data){
  injectStyle();ensureOverlay();ptState=normalizeState(data||freshState());
  $('ptAlturaOverlay').classList.remove('hidden');document.body.style.overflow='hidden';renderPT();
}
function closePTAltura(){
  savePT(false).catch(()=>{});$('ptAlturaOverlay')?.classList.add('hidden');document.body.style.overflow='';
}

async function imageToDataUrl(src){
  try{const r=await fetch(src,{cache:'no-store'});if(!r.ok)return null;const b=await r.blob();return await new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=no;f.readAsDataURL(b)})}catch(_){return null}
}
function fmtDate(v){if(!v)return'—';const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}/${m}/${y}`:v}
const pdfGrid={hLineWidth:()=>0.7,vLineWidth:()=>0.7,hLineColor:()=>'#dddddd',vLineColor:()=>'#dddddd',paddingLeft:()=>7,paddingRight:()=>7,paddingTop:()=>5,paddingBottom:()=>5};
function pdfHeader(text){return {text,bold:true,fillColor:'#f4f4f4',fontSize:9,color:'#111'}}
function pdfSection(title){return {table:{widths:['*'],body:[[{text:title,bold:true,fillColor:'#f4f4f4',fontSize:11,color:'#111'}]]},layout:pdfGrid,margin:[0,10,0,0]}}
function checklistTable(group,title){
  const rows=[[pdfHeader('#'),pdfHeader('Item verificado'),pdfHeader('Status')]];
  ptState.checklistPT.filter(x=>x.grupo===group).forEach(x=>rows.push([String(x.n),x.item,x.status]));
  return [pdfSection(title),{table:{headerRows:1,widths:[28,'*',100],body:rows},layout:pdfGrid,fontSize:7.7}];
}
function selectedLabels(options,obj,otherText){
  const arr=options.filter(([k])=>obj?.[k]).map(([,label])=>label);
  if(obj?.outro&&otherText)arr[arr.length-1]=`Outro: ${otherText}`;
  return arr.length?arr.join(' • '):'Nenhum selecionado';
}
function workerSignatureCell(w,i){
  const stack=[];
  if(w.signature)stack.push({image:w.signature,fit:[210,60],alignment:'center',margin:[0,0,0,5]});else stack.push({text:'',margin:[0,0,0,55]});
  stack.push({canvas:[{type:'line',x1:10,y1:0,x2:220,y2:0,lineWidth:.8,lineColor:'#222'}],margin:[0,0,0,5]});
  stack.push({text:w.nome||`Executante ${i+1}`,bold:true,alignment:'center',fontSize:8.5});
  stack.push({text:'Trabalhador Autorizado / Executante',alignment:'center',fontSize:7.5,margin:[0,2,0,0]});
  return {stack,margin:[5,7,5,5]};
}

async function makePTPdf(action='download'){
  if(!window.pdfMake){alert('Biblioteca pdfmake indisponível.');return}
  const logo=await imageToDataUrl(LOGO);const emitido=new Date().toLocaleString('pt-BR');
  const content=[];
  content.push({table:{widths:[55,'*',145],body:[[
    logo?{image:logo,fit:[50,42]}:{text:'TBM',bold:true},
    {stack:[{text:'PERMISSÃO DE TRABALHO – TRABALHO EM ALTURA (NR 35)',bold:true,fontSize:13},{text:'Escadas • Andaimes • Plataforma Elevatória (PTA)',fontSize:9,margin:[0,4,0,0]}]},
    {stack:[{text:`Nº ${ptState.id}`,bold:true,alignment:'right',fontSize:8.5},{text:`Emissão: ${emitido}`,alignment:'right',fontSize:7.5,margin:[0,4,0,0]}]}
  ]]},layout:'noBorders',margin:[0,0,0,8]});
  content.push({canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:.9,lineColor:'#222'}],margin:[0,0,0,8]});
  content.push({table:{widths:['32%','68%'],body:[
    [pdfHeader('Descrição do Trabalho'),{text:ptState.description||'—'}],
    [pdfHeader('Local do Trabalho'),{text:ptState.workLocation||'—'}],
    [pdfHeader('Setor'),{text:ptState.sector||'—'}],
    [pdfHeader('Data'),{text:fmtDate(ptState.date)}],
    [pdfHeader('Horário'),{text:`Inicial: ${ptState.startTime||'—'}   •   Final: ${ptState.endTime||'—'}`}],
    [pdfHeader('Meio de acesso / equipamento'),{text:selectedLabels(ACCESS_OPTIONS,ptState.meiosAcesso,ptState.meioAcessoOutro)}],
    [pdfHeader('EPIs previstos'),{text:selectedLabels(EPI_OPTIONS,ptState.episSelecionados,ptState.epiOutro)}]
  ]},layout:pdfGrid,fontSize:8.7});

  checklistTable('qualificacao','Checklist - Qualificação e Autorização').forEach(x=>content.push(x));
  checklistTable('epis','Checklist - EPIs e Proteção contra Quedas').forEach(x=>content.push(x));
  checklistTable('gerais','Checklist - Condições Gerais e Área').forEach(x=>content.push(x));
  checklistTable('energia','Checklist - Energia e Bloqueio').forEach(x=>content.push(x));
  checklistTable('escadas','Checklist - Escadas').forEach(x=>content.push(x));
  checklistTable('andaimes','Checklist - Andaimes').forEach(x=>content.push(x));
  checklistTable('pta','Checklist - Plataforma Elevatória (PTA)').forEach(x=>content.push(x));
  checklistTable('final','Checklist - Liberação e Encerramento').forEach(x=>content.push(x));

  content.push(pdfSection('Trabalhadores Autorizados / Executantes'));
  content.push({text:'Os colaboradores abaixo receberam treinamento e estão autorizados a executar as atividades.',fontSize:8,margin:[0,6,0,4]});
  const wr=[];for(let i=0;i<ptState.workers.length;i+=2)wr.push([workerSignatureCell(ptState.workers[i],i),ptState.workers[i+1]?workerSignatureCell(ptState.workers[i+1],i+1):{text:''}]);
  content.push({table:{widths:['*','*'],body:wr},layout:'noBorders'});
  content.push(pdfSection('Responsável pela Liberação'));
  content.push({table:{widths:['50%','50%'],body:[[pdfHeader('Emissor / TST'),pdfHeader('Cargo')],[{text:EMISSOR_NOME,bold:true},{text:EMISSOR_CARGO,bold:true}]]},layout:pdfGrid,fontSize:9});
  content.push({canvas:[{type:'line',x1:0,y1:0,x2:515,y2:0,lineWidth:.7,lineColor:'#ccc'}],margin:[0,14,0,7]});
  content.push({text:`Documento eletrônico • Permissão de Trabalho em Altura • ID ${ptState.id}`,alignment:'center',fontSize:7.5});
  content.push({text:`Relatório gerado em ${emitido}`,alignment:'center',fontSize:7.5,margin:[0,3,0,0]});
  const doc={pageSize:'A4',pageMargins:[42,42,42,42],defaultStyle:{font:'Roboto',fontSize:9,color:'#111',lineHeight:1.2},content};
  const filename=`PT_Trabalho_Altura_${ptState.id}.pdf`;
  if(action==='share'){
    window.pdfMake.createPdf(doc).getBlob(async blob=>{
      try{const file=new File([blob],filename,{type:'application/pdf'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]})))await navigator.share({title:'PT - Trabalho em Altura',text:`Permissão de Trabalho ${ptState.id}`,files:[file]});else window.pdfMake.createPdf(doc).download(filename)}catch(e){if(e?.name!=='AbortError')window.pdfMake.createPdf(doc).download(filename)}
    });
  }else window.pdfMake.createPdf(doc).download(filename);
}

function installHistoryInterceptor(){
  document.addEventListener('click',async e=>{
    const open=e.target.closest?.('[data-open-h]');
    const report=e.target.closest?.('[data-report-h]');
    const t=open||report;if(!t)return;
    const id=open?open.dataset.openH:report.dataset.reportH;
    if(!String(id||'').startsWith('PT-'))return;
    e.preventDefault();e.stopImmediatePropagation();
    let x=null;try{x=typeof window.idbGet==='function'?await window.idbGet(id):null}catch(_){ }
    if(!x||x.type!==PT_TYPE)return;
    openPTAltura(x);
    if(report)setTimeout(()=>makePTPdf('download'),120);
  },true);
}

function install(){injectStyle();addTile();ensureOverlay();installHistoryInterceptor();setTimeout(addTile,700);setTimeout(addTile,1800)}
window.openPTAltura=openPTAltura;
window.openPTAlturaFromState=openPTAltura;
window.makePTAlturaPdf=makePTPdf;
window.savePTAltura=savePT;
window.PT_ALTURA_EMISSOR={name:EMISSOR_NOME,role:EMISSOR_CARGO};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
