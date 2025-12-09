<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Điểm tướng SSR & Exp</title>

<style>
:root{
  --bg:#ffffff;
  --card:#f8f8f8;
  --muted:#555555;
  --accent:#60a5fa;
  --fire:#e11d48;
  --water:#0284c7;
  --wind:#10b981;
  --light:#facc15;
  --dark:#6366f1;
  --earth:#a16207;
  --exp:#6b7280;
}
body {margin:0;padding:18px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial;background:var(--bg);color:#012;}
.app {max-width:1100px;margin:0 auto;}
header {display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:18px;}
h1 {font-size:20px;margin:0;}
.controls {display:flex;gap:8px;align-items:center;}
.tabs {display:flex;gap:6px;flex-wrap:wrap;}
.tab {padding:8px 12px;border-radius:10px;cursor:pointer;background:#eaeaea;color:var(--muted);border:1px solid rgba(0,0,0,0.06)}
.tab.active {font-weight:600;}
.grid {display:grid;grid-template-columns:1fr 360px;gap:16px;}
.panel {background:var(--card);padding:14px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.06);}
.hero-list {display:flex;flex-direction:column;gap:10px;max-height:520px;overflow:auto;}
.hero {display:grid;grid-template-columns:1fr 100px 100px 120px 80px;gap:8px;align-items:center;padding:8px;border-radius:8px;background:#fff;border:1px solid rgba(0,0,0,0.04);}
.hero small {color:var(--muted);}
.hero.fire { border-left:6px solid var(--fire); }
.hero.cung { border-left:6px solid var(--light); }
.hero.độc { border-left:6px solid var(--wind); }
.hero.băng { border-left:6px solid var(--water); }
.hero.exp { border-left:6px solid var(--exp); }

input[type="number"], select, input[type="text"]{
    width:100%;padding:6px;border-radius:6px;border:1px solid rgba(0,0,0,0.08);background:transparent;color:inherit
}
.btn {padding:8px 10px;border-radius:8px;border:0;cursor:pointer;background:var(--accent);color:#fff;font-weight:600;}
.btn.ghost {background:transparent;border:1px solid rgba(0,0,0,0.08);color:var(--muted);}
.summary {display:flex;flex-direction:column;gap:8px;margin-top:10px;}
.row {display:flex;justify-content:space-between;align-items:center;}
.big {font-size:18px;font-weight:700;}
footer {margin-top:16px;color:var(--muted);font-size:13px;text-align:center;}
.hero-ops {display:flex;gap:6px;justify-content:flex-end}

/* Modal */
.modal {display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);justify-content:center;align-items:center;z-index:9999;}
.modal-content{background:white;width:95%;max-width:440px;border-radius:18px;padding:0;font-family:Segoe UI, sans-serif;border:4px solid var(--m-color);}
.modal-header{padding:14px 18px;font-size:20px;font-weight:700;color:white;border-radius:14px 14px 0 0;}
.modal-body{padding:18px;font-size:16px;line-height:1.5;white-space:pre-line;}
.modal-footer{padding:16px;}
.modal-footer button{width:100%;padding:12px;background:var(--m-color);color:white;border:none;border-radius:10px;font-size:16px;cursor:pointer;}

.sys-Lửa   { --m-color: var(--fire); }
.sys-Cung   { --m-color: var(--light); }
.sys-Độc    { --m-color: var(--wind); }
.sys-Băng   { --m-color: var(--water); }
.sys-Exp    { --m-color: var(--exp); }

@media (max-width:980px){
  .grid{grid-template-columns:1fr}
  .hero{grid-template-columns:1fr 90px 80px 80px 70px}
}
</style>
</head>

<body>
<div class="app">
<header>
  <div>
    <h1>Điểm tướng SSR & Exp</h1>
    <div style="color:var(--muted);font-size:13px;margin-top:6px">1 thẻ SSR = 14.000 điểm. EXP: B+ 100 / B 700 / SR 3.500.</div>
  </div>

  <div class="controls">
    <div class="tabs" id="tabs"></div>
  </div>
</header>

<main class="grid">
  <section class="panel">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div><strong id="systemTitle">Lửa</strong></div>
      <button class="btn" id="btnCalcAll">Tính toàn bộ</button>
    </div>

    <input id="filterHero" placeholder="Tìm tướng" style="margin-bottom:12px"/>

    <div class="hero-list" id="heroList"></div>
  </section>

  <aside class="panel">
    <div><strong>Tổng kết</strong></div>
    <div class="summary" id="summary"></div>
  </aside>
</main>

<footer>Dữ liệu lưu Firestore.</footer>
</div>

<!-- Modal -->
<div id="resultModal" class="modal">
  <div id="modalBox" class="modal-content">
    <div id="modalHeader" class="modal-header">Kết quả</div>
    <div id="modalBody" class="modal-body"></div>
    <div class="modal-footer"><button onclick="closeModal()">Đóng</button></div>
  </div>
</div>

<script>
// ===== FIREBASE GLOBAL =====
const auth = firebase.auth();
const db   = firebase.firestore();

// ===== HERO DATA =====
const COST_ARRAY={0:[20,20],1:[30,40,50],2:[60,70,80,80],3:[100,110,120,130,140],4:[170,180,190,200,210],5:[]};
const CARD_POINT=14000;
const SYSTEMS=["Lửa","Cung","Độc","Băng"];
const EXP_CATS={"B+":100,"B":700,"SR":3500};

const heroesData = {
  "Lửa": ["Dolvar","Paul","Alex","Allen","Anko","Apollo","Blaise","Brie","Catrina","Christie","Cosette","Dain","Darcy","Daria","Dean","Edmund","Erika","Fiona","Gisele","Gro","Ivy","Kenshiro","Kirona","Kyle","Lovelace","Mirai","Penny","Seraphin","Simon","Sindra","Theodore","Tracy","Vanessa","Wallis", "Wukong"],
  "Cung": ["Aidan","Alden","Ariza","Authur","Bella","Colin","Doris","Dylan","Eleanora","Fatima","Gabriel","Green","Jennifer","Johannes","Kadir","Kailin","Layla","Livia","Maya","Meg","Mira","Montag","O'Neil","Padme","Pan","Ptolemy","Richard","Ryan","Sahar","Sebastian","Seraphia","Solder","Torvi","Trist"],
  "Độc": ["Allison","Angelina","Arwin","Benjamin","Blackwell","Boudica","Catherine","Chiyoko","Claudia","Daisy","Elia","Gruen","Issac","Lilith","Lomax","Luvia","Maxwell","Meniere","Morgana","Mycelia","Naga","Pythia","Rila","Rogers","Rosamond","Suad","Tumnus","Viper","Viola","Webster","Wendy"],
  "Băng": ["Aurora","Christine","Clarence","Enzo","Eslaine","Filius","Hadi","Hana","Hathes","Havik","Jessica","Judy","Keith","Lilani","Loka","Maud","Nathaniel","Nicole","Nina","Nivea","Olaf","Parr","Paula","Pedra","Ralph","Rebecca","Rudolph","Selene","Trishy","Vera","Ao Deng","Ao Yue"]
};
const expList = { "B+": ["Daniel"], "B": ["Anton","Peter","Etley"], "SR": ["Alucard","Samar","Harold","Kris","Merlin","Ophelia","Arwyn"]};
// ===== STATE =====
const LS_KEY="hero_state_v3";
let state={heroes:[],activeTab:"Lửa"};

// ===== UTIL =====
const $=id=>document.getElementById(id);
function formatNumber(n){return Number(n).toLocaleString("vi-VN");}
function idNow(){return "h"+Math.random().toString(36).slice(2,9);}
function maxBarForStar(st){return (COST_ARRAY[st]||[]).length;}
function costFor(st,b){return (COST_ARRAY[st]||[])[b]||null;}

function defaultHeroData(n,sys){
  for(const c in expList) if(expList[c].includes(n)) sys="Exp";
  return {id:idNow(),name:n,system:sys,current_star:0,current_bar:0,cards_owned:0};
}

// ===== TÍNH TOÁN NÂNG =====
function calculateUpgrade(h){
  if(h.system==="Exp"){
    let rank=null;
    for(const c in expList) if(expList[c].includes(h.name)) rank=c;
    return {
      isExp:true,
      exp_rank:rank,
      exp_points:(h.cards_owned||0)*EXP_CATS[rank]
    };
  }

  let star=h.current_star, bar=h.current_bar, cards=h.cards_owned, used=0;
  while(cards>0){
    if(star>=5) break;
    const max=maxBarForStar(star);
    if(bar>=max){ star++; bar=0; continue;}
    const need=costFor(star,bar);
    if(cards>=need){ cards-=need; used+=need; bar++; } else break;
  }
  return {isExp:false,final_star:star,final_bar:bar,cards_used:used,cards_left:cards};
}

// ===== FIRESTORE SAVE =====
async function saveFirestore(){
  if(!auth.currentUser) return;

  const summary = computeTotal();
  await db.collection("users")
    .doc(auth.currentUser.uid)
    .collection("tabs")
    .doc("hero")
    .set({
      heroData: state.heroes,
      systems: summary.bySystem,
      lastPoints: summary.total,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true});

  window.dispatchEvent(new Event("summary.refresh"));
}

// ===== TÍNH ĐIỂM TẤT CẢ =====
function computeTotal(){
  let totals={};
  SYSTEMS.concat(Object.keys(expList)).forEach(s=>totals[s]=0);

  state.heroes.forEach(h=>{
    const r=calculateUpgrade(h);
    if(r.isExp){
      totals[r.exp_rank]+=r.exp_points;
    } else {
      let pts=r.cards_used*CARD_POINT;
      if(r.final_star>=5) pts+=r.cards_left*CARD_POINT;
      totals[h.system]+=pts;
    }
  });

  let total=0;
  for(const s in totals) total+=totals[s];
  return {total,bySystem:totals};
}

// ===== MODAL =====
function showModalResult(h){
  const r=calculateUpgrade(h);
  let msg="";
  let sys=h.system;

  if(r.isExp){
    msg=`Rank: ${r.exp_rank}\nĐiểm EXP: ${formatNumber(r.exp_points)}`;
    sys="Exp";
  } else {
    const used = r.cards_used;
    const left = r.final_star>=5 ? r.cards_left : 0;
    msg=
`Sao/Bậc hiện tại: ${h.current_star}★ bậc ${h.current_bar}
Nâng tới: ${r.final_star}★ bậc ${r.final_bar}

Thẻ dùng: ${used} → Điểm: ${formatNumber(used*CARD_POINT)}
Thẻ dư: ${left} → Điểm: ${formatNumber(left*CARD_POINT)}

Tổng điểm: ${formatNumber(used*CARD_POINT+left*CARD_POINT)}`;
  }

  $("modalBox").className="modal-content sys-"+sys;
  $("modalHeader").innerText=h.name;
  $("modalBody").innerText=msg;
  $("resultModal").style.display="flex";
}

function closeModal(){ $("resultModal").style.display="none"; }

// ===== RENDER HERO =====
function createHeroEle(h){
  const box=document.createElement("div");
  const cls = (h.system==="Lửa"?"fire":h.system==="Cung"?"cung":h.system==="Độc"?"độc":h.system==="Băng"?"băng":"exp");
  box.className="hero "+cls;

  // name
  const colName=document.createElement("div");
  colName.innerHTML=`<div style="font-weight:600">${h.name}</div><small>${h.system}</small>`;

  // star
  const starCol=document.createElement("div");
  const starSel=document.createElement("select");
  starSel.innerHTML = Array.from({length:6}).map((_,i)=>`<option ${i===h.current_star?"selected":""} value="${i}">${i}★</option>`).join("");
  starSel.onchange=()=>{
    h.current_star=Number(starSel.value);
    if(h.current_bar > maxBarForStar(h.current_star)) h.current_bar=0;
    saveLocal(); renderSummary(); saveFirestore();
  };
  starCol.appendChild(starSel);

  // bar
  const barCol=document.createElement("div");
  const barSel=document.createElement("select");
  const max=maxBarForStar(h.current_star);
  barSel.innerHTML = Array.from({length:max+1}).map((_,i)=>`<option ${i===h.current_bar?"selected":""} value="${i}">Bậc ${i}</option>`).join("");
  barSel.onchange=()=>{
    h.current_bar=Number(barSel.value);
    saveLocal(); renderSummary(); saveFirestore();
  };
  barCol.appendChild(barSel);

  // cards
  const cardCol=document.createElement("div");
  const inCard=document.createElement("input");
  inCard.type="number";
  inCard.min=0;
  inCard.value=h.cards_owned||0;
  inCard.oninput=()=>{
    h.cards_owned=Math.max(0,Math.floor(Number(inCard.value)||0));
    saveLocal(); saveFirestore();
  };
  cardCol.appendChild(inCard);

  // ops
  const ops=document.createElement("div");
  ops.className="hero-ops";
  const btn=document.createElement("button");
  btn.className="btn ghost";
  btn.textContent="Tính";
  btn.onclick=()=>showModalResult(h);
  ops.appendChild(btn);

  box.append(colName,starCol,barCol,cardCol,ops);
  return box;
}

// ===== RENDER LIST =====
function renderHeroList(){
  const list=$("heroList");
  list.innerHTML="";
  const f=$("filterHero").value.toLowerCase();

  if(SYSTEMS.includes(state.activeTab)){
    heroesData[state.activeTab].forEach(n=>{
      if(f && !n.toLowerCase().includes(f)) return;
      const h=state.heroes.find(x=>x.name===n);
      if(h) list.appendChild(createHeroEle(h));
    });
  } else {
    expList[state.activeTab].forEach(n=>{
      if(f && !n.toLowerCase().includes(f)) return;
      const h=state.heroes.find(x=>x.name===n);
      if(h) list.appendChild(createHeroEle(h));
    });
  }
}

// ===== RENDER SUMMARY =====
function renderSummary(){
  const box=$("summary");
  box.innerHTML="";
  const r=computeTotal();

  for(const sys in r.bySystem){
    const row=document.createElement("div");
    row.className="row";
    row.innerHTML=`<span>${sys}</span><span class="big">${formatNumber(r.bySystem[sys])}</span>`;
    box.appendChild(row);
  }

  const row=document.createElement("div");
  row.className="row";
  row.style.borderTop="1px solid #ccc";
  row.style.fontWeight="700";
  row.innerHTML=`<span>Tổng</span><span class="big">${formatNumber(r.total)}</span>`;
  box.appendChild(row);
}

// ===== RENDER TABS =====
function renderTabs(){
  const tabs=$("tabs");
  tabs.innerHTML="";
  SYSTEMS.concat(Object.keys(expList)).forEach(sys=>{
    const t=document.createElement("div");
    t.className="tab"+(state.activeTab===sys?" active":"");
    t.textContent=sys;

    if(state.activeTab===sys){
      const color=sys==="Lửa"?"var(--fire)":sys==="Cung"?"var(--light)":sys==="Độc"?"var(--wind)":sys==="Băng"?"var(--water)":"var(--exp)";
      t.style.background=color;
      t.style.color="#fff";
    }

    t.onclick=()=>{
      state.activeTab=sys;
      saveLocal();
      renderTabs();
      renderHeroList();
      $("systemTitle").innerText=sys;
      saveFirestore();
    };
    tabs.appendChild(t);
  });
}

// ===== LOCAL STORAGE =====
function saveLocal(){ localStorage.setItem(LS_KEY,JSON.stringify(state)); }

function loadLocal(){
  const s=localStorage.getItem(LS_KEY);
  if(s) state=JSON.parse(s);

  SYSTEMS.forEach(sys=>{
    heroesData[sys].forEach(n=>{
      if(!state.heroes.find(x=>x.name===n))
        state.heroes.push(defaultHeroData(n,sys));
    });
  });

  for(const c in expList){
    expList[c].forEach(n=>{
      if(!state.heroes.find(x=>x.name===n))
        state.heroes.push(defaultHeroData(n,"Exp"));
    });
  }

  saveLocal();
}

// ===== INIT =====
$("filterHero").oninput=renderHeroList;
$("btnCalcAll").onclick=()=>{ renderSummary(); saveFirestore(); };

loadLocal();
renderTabs();
renderHeroList();
renderSummary();
</script>

</body>
</html>
