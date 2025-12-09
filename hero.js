/***************************************************
 *   HERO TAB – Firestore Sync + Auto Highlight
 ***************************************************/

const HERO_FS_PATH = (uid) => `users/${uid}/hero_data`;

const HERO_DEFAULT = {
  heroes: [],
  activeTab: "Lửa"
};

// ====================== COST =======================
const COST_ARRAY = {
  0:[20,20],
  1:[30,40,50],
  2:[60,70,80,80],
  3:[100,110,120,130,140],
  4:[170,180,190,200,210]
};
const CARD_POINT = 14000;

const SYSTEMS = ["Lửa","Cung","Độc","Băng"];
const EXP_CATS = { "B+":100, "B":700, "SR":3500 };

const heroesData = {
  "Lửa": ["Dolvar","Paul","Alex","Allen","Anko","Apollo","Blaise","Brie","Catrina","Christie","Cosette","Dain","Darcy","Daria","Dean","Edmund","Erika","Fiona","Gisele","Gro","Ivy","Kenshiro","Kirona","Kyle","Lovelace","Mirai","Penny","Seraphin","Simon","Sindra","Theodore","Tracy","Vanessa","Wallis",”Wukong”],
  "Cung": ["Aidan","Alden","Ariza","Authur","Bella","Colin","Doris","Dylan","Eleanora","Fatima","Gabriel","Green","Jennifer","Johannes","Kadir","Kailin","Layla","Livia","Maya","Meg","Mira","Montag","O'Neil","Padme","Pan","Ptolemy","Richard","Ryan","Sahar","Sebastian","Seraphia","Solder","Torvi","Trist"],
  "Độc": ["Allison","Angelina","Arwin","Benjamin","Blackwell","Boudica","Catherine","Chiyoko","Claudia","Daisy","Elia","Gruen","Issac","Lilith","Lomax","Luvia","Maxwell","Meniere","Morgana","Mycelia","Naga","Pythia","Rila","Rogers","Rosamond","Suad","Tumnus","Viper","Viola","Webster","Wendy"],
  "Băng": ["Aurora","Christine","Clarence","Enzo","Eslaine","Filius","Hadi","Hana","Hathes","Havik","Jessica","Judy","Keith","Lilani","Loka","Maud","Nathaniel","Nicole","Nina","Nivea","Olaf","Parr","Paula","Pedra","Ralph","Rebecca","Rudolph","Selene","Trishy","Vera","Ao Deng","Ao Yue"]
};
const expList = { "B+": ["Daniel"], "B": ["Anton","Peter","Etley"], "SR": ["Alucard","Samar","Harold","Kris","Merlin","Ophelia","Arwyn"]};


// ================== STATE ======================
let heroState = structuredClone(HERO_DEFAULT);
let heroUnsub = null;
let heroSaveTimer = null;
const HERO_SAVE_DELAY = 500;

// =============== UTILS ===============
function maxBar(star){ return (COST_ARRAY[star]||[]).length; }
function cost(star,bar){ return (COST_ARRAY[star]||[])[bar] || null; }
function idNow(){ return "h-"+Math.random().toString(36).slice(2,9); }

function heroDefault(name, sys){
  let system = sys;
  for(const cat in expList)
    if(expList[cat].includes(name)) system="Exp";
  return { id:idNow(), name, system, current_star:0, current_bar:0, cards_owned:0 };
}

// ================== CALC ======================
function calcHero(h){
  if(h.system==="Exp"){
    let cat = null;
    for(const c in expList) if(expList[c].includes(h.name)) cat=c;
    let pts = (h.cards_owned||0) * EXP_CATS[cat];
    return {isExp:true, points:pts, canRankUp:false, near5:false};
  }
  let star=h.current_star, bar=h.current_bar, cards=h.cards_owned;
  let consumed=0;

  while(cards>0 && star<5){
    let mb=maxBar(star);
    if(bar>=mb){ star++; bar=0; continue; }
    let need = cost(star,bar);
    if(cards>=need){ cards-=need; consumed+=need; bar++; }
    else break;
  }

  const used_points = (consumed + (star>=5?cards:0)) * CARD_POINT;
  const canRankUp = (consumed>0);
  const near5 = (star<5 && cards + consumed >=  (COST_ARRAY[star]?.reduce((a,b)=>a+b,0) || 99999));

  return {isExp:false, points:used_points, canRankUp, near5};
}

// ================= FIRESTORE LOAD ===================
async function heroLoadFromFS(){
  const user = auth.currentUser;
  if(!user) return;

  const ref = db.collection("users").doc(user.uid).collection("tabs").doc("hero");
  const snap = await ref.get();

  if(snap.exists){
    heroState = snap.data();
  }

  // khởi tạo thiếu hero
  SYSTEMS.forEach(sys=>{
    (heroesData[sys]||[]).forEach(n=>{
      if(!heroState.heroes.find(h=>h.name===n))
        heroState.heroes.push(heroDefault(n,sys));
    });
  });
  for(const cat in expList){
    expList[cat].forEach(n=>{
      if(!heroState.heroes.find(h=>h.name===n))
        heroState.heroes.push(heroDefault(n,"Exp"));
    });
  }

  heroSaveToFS(true);
}

// ================= FIRESTORE REALTIME ===================
async function heroSubscribeFS(){
  const user = auth.currentUser;
  if(!user) return;

  const ref = db.collection("users").doc(user.uid).collection("tabs").doc("hero");

  if(heroUnsub) heroUnsub();

  heroUnsub = ref.onSnapshot(snap=>{
    if(!snap.exists) return;
    const data = snap.data();

    if(JSON.stringify(data.heroes) !== JSON.stringify(heroState.heroes)){
      heroState.heroes = data.heroes;
      heroState.activeTab = data.activeTab;
      heroRenderTabs();
      heroRenderList();
      heroRenderSummary();
    }
  });
}

// ================= FIRESTORE SAVE ===================
function heroSaveToFS(ignoreDebounce=false){
  const user = auth.currentUser;
  if(!user) return;

  if(!ignoreDebounce){
    clearTimeout(heroSaveTimer);
    heroSaveTimer = setTimeout(()=>heroSaveToFS(true), HERO_SAVE_DELAY);
    return;
  }

  const ref = db.collection("users").doc(user.uid).collection("tabs").doc("hero");
  ref.set(heroState, {merge:true});
}

// ================== RENDER =====================
function heroRenderTabs(){
  const box = document.getElementById("tabs");
  if(!box) return;
  box.innerHTML="";
  SYSTEMS.concat(Object.keys(expList)).forEach(sys=>{
    const t=document.createElement("div");
    t.className="tab"+(heroState.activeTab===sys?" active":"");
    t.textContent=sys;

    if(heroState.activeTab===sys){
      t.style.background="var(--accent)";
      t.style.color="#fff";
    }

    t.onclick=()=>{
      heroState.activeTab=sys;
      heroSaveToFS();
      heroRenderTabs();
      heroRenderList();
      document.getElementById("systemTitle").innerText=sys;
    };

    box.appendChild(t);
  });
}

function heroElement(h){
  const div=document.createElement("div");
  div.className="hero";

  // highlight auto
  const calc = calcHero(h);
  if(calc.canRankUp) div.style.border="2px solid gold";
  if(calc.near5) div.style.border="2px solid orange";

  const name=document.createElement("div");
  name.innerHTML=`<strong>${h.name}</strong><br><small>${h.system}</small>`;

  const star=document.createElement("select");
  star.innerHTML = Array.from({length:6}).map((_,i)=>
    `<option value="${i}" ${i===h.current_star?'selected':''}>${i}★</option>`
  ).join("");
  star.onchange=()=>{
    h.current_star=parseInt(star.value);
    if(h.current_bar > maxBar(h.current_star)) h.current_bar=0;
    heroSaveToFS();
    heroRenderSummary();
    heroRenderList();
  };

  const bar=document.createElement("select");
  bar.innerHTML = Array.from({length:maxBar(h.current_star)+1}).map((_,i)=>
    `<option value="${i}" ${i===h.current_bar?'selected':''}>Bậc ${i}</option>`
  ).join("");
  bar.onchange=()=>{
    h.current_bar=parseInt(bar.value);
    heroSaveToFS();
    heroRenderSummary();
    heroRenderList();
  };

  const cards=document.createElement("input");
  cards.type="number";
  cards.min=0;
  cards.value=h.cards_owned;
  cards.oninput=()=>{
    h.cards_owned = Math.max(0, parseInt(cards.value)||0);
    heroSaveToFS();
  };

  const cell=document.createElement("div");
  cell.className="hero-ops";
  const btn=document.createElement("button");
  btn.textContent="Tính";
  btn.className="btn ghost";
  btn.onclick=()=>alert(`${h.name}\nĐiểm: ${calc.points.toLocaleString()}`);
  cell.appendChild(btn);

  div.appendChild(name);
  div.appendChild(star);
  div.appendChild(bar);
  div.appendChild(cards);
  div.appendChild(cell);
  return div;
}

function heroRenderList(){
  const box=document.getElementById("heroList");
  if(!box) return;

  const filter=(document.getElementById("filterHero").value||"").toLowerCase();
  box.innerHTML="";

  const list = SYSTEMS.includes(heroState.activeTab)
    ? heroesData[heroState.activeTab]
    : expList[heroState.activeTab];

  list.forEach(n=>{
    if(filter && !n.toLowerCase().includes(filter)) return;
    const h = heroState.heroes.find(x=>x.name===n);
    if(h) box.appendChild(heroElement(h));
  });
}

function heroRenderSummary(){
  const box=document.getElementById("summary");
  if(!box) return;
  box.innerHTML="";

  const totals={};
  SYSTEMS.concat(Object.keys(expList)).forEach(s=>totals[s]=0);

  heroState.heroes.forEach(h=>{
    let r=calcHero(h);
    if(h.system==="Exp"){
      for(const cat in expList)
        if(expList[cat].includes(h.name)) totals[cat]+=r.points;
    } else {
      totals[h.system]+=r.points;
    }
  });

  let grand=0;
  for(const s in totals){
    const row=document.createElement("div");
    row.className="row";
    row.innerHTML=`<span>${s}</span><span class="big">${totals[s].toLocaleString()}</span>`;
    box.appendChild(row);
    grand+=totals[s];
  }

  const row=document.createElement("div");
  row.className="row";
  row.style.borderTop="1px solid #ccc";
  row.style.fontWeight="700";
  row.innerHTML=`<span>Tổng điểm</span><span class="big">${grand.toLocaleString()}</span>`;
  box.appendChild(row);

  // gửi tổng điểm cho tab Tổng điểm
  const user = auth.currentUser;
  if(user){
    db.collection("users").doc(user.uid)
      .collection("tabs").doc("hero_summary")
      .set({total:grand},{merge:true});
  }

  window.dispatchEvent(new Event("hero.summary.change"));
}

// ================= INIT ====================
async function heroInit(){
  await heroLoadFromFS();
  await heroSubscribeFS();

  heroRenderTabs();
  heroRenderList();
  heroRenderSummary();

  document.getElementById("filterHero").oninput = heroRenderList;
  document.getElementById("btnCalcAll").onclick = heroRenderSummary;
}

document.addEventListener("DOMContentLoaded",()=>{
  if(auth.currentUser) heroInit();
  auth.onAuthStateChanged(u=>{
    if(u) heroInit();
  });
});
