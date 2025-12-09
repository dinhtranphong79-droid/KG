// hero.js
window.addEventListener('tab.open', async (e)=>{
  if(e.detail.id !== 'hero') return; // chỉ chạy khi tab hero được chọn

  const container = document.getElementById('tab_hero');
  if(!container) return;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div><strong id="systemTitle">Lửa</strong></div>
      <div><button class="btn" id="btnCalcAll">Tính toàn bộ</button></div>
    </div>
    <div style="margin-bottom:12px;">
      <input id="filterHero" placeholder="Tìm tướng theo tên" style="width:100%;padding:6px;border-radius:6px;border:1px solid #ccc;">
    </div>
    <div class="hero-list" id="heroList"></div>
    <div class="summary" id="summary" style="margin-top:20px;"></div>

    <!-- Modal -->
    <div id="resultModal" class="modal">
      <div id="modalBox" class="modal-content">
        <div id="modalHeader" class="modal-header">Kết quả</div>
        <div id="modalBody" class="modal-body"></div>
        <div class="modal-footer">
          <button onclick="closeModal()">Đóng</button>
        </div>
      </div>
    </div>
  `;

  // --- Scoped selectors ---
  const $ = id => container.querySelector('#'+id);

  const COST_ARRAY = {0:[20,20],1:[30,40,50],2:[60,70,80,80],3:[100,110,120,130,140],4:[170,180,190,200,210],5:[]};
  const CARD_POINT = 14000;
  const SYSTEMS = ["Lửa","Cung","Độc","Băng"];
  const EXP_CATS = {"B+":100,"B":700,"SR":3500};
  const LS_KEY="hero_upgrader_state_v2";

  const heroesData = {
    "Lửa": ["Dolvar","Paul","Alex","Allen","Anko","Apollo","Blaise","Brie","Catrina","Christie","Cosette","Dain","Darcy","Daria","Dean","Edmund","Erika","Fiona","Gisele","Gro","Ivy","Kenshiro","Kirona","Kyle","Lovelace","Mirai","Penny","Seraphin","Simon","Sindra","Theodore","Tracy","Vanessa","Wallis","Wukong"],
    "Cung": ["Aidan","Alden","Ariza","Authur","Bella","Colin","Doris","Dylan","Eleanora","Fatima","Gabriel","Green","Jennifer","Johannes","Kadir","Kailin","Layla","Livia","Maya","Meg","Mira","Montag","O'Neil","Padme","Pan","Ptolemy","Richard","Ryan","Sahar","Sebastian","Seraphia","Solder","Torvi","Trist"],
    "Độc": ["Allison","Angelina","Arwin","Benjamin","Blackwell","Boudica","Catherine","Chiyoko","Claudia","Daisy","Elia","Gruen","Issac","Lilith","Lomax","Luvia","Maxwell","Meniere","Morgana","Mycelia","Naga","Pythia","Rila","Rogers","Rosamond","Suad","Tumnus","Viper","Viola","Webster","Wendy"],
    "Băng": ["Aurora","Christine","Clarence","Enzo","Eslaine","Filius","Hadi","Hana","Hathes","Havik","Jessica","Judy","Keith","Lilani","Loka","Maud","Nathaniel","Nicole","Nina","Nivea","Olaf","Parr","Paula","Pedra","Ralph","Rebecca","Rudolph","Selene","Trishy","Vera","Ao Deng","Ao Yue"]
  };
  const expList = { "B+": ["Daniel"], "B": ["Anton","Peter","Etley"], "SR": ["Alucard","Samar","Harold","Kris","Merlin","Ophelia","Arwyn"] };

  let state={heroes:[],activeTab:SYSTEMS[0]};

  function idNow(){return "h-"+Math.random().toString(36).slice(2,9);}
  function formatNumber(n){return Number(n).toLocaleString("vi-VN");}
  function maxBarForStar(st){return (COST_ARRAY[st]||[]).length;}
  function costFor(st,bar){return (COST_ARRAY[st]||[])[bar]||null;}
  function defaultHeroData(name,system){let sys=system; for(const cat in expList) if(expList[cat].includes(name)) sys="Exp"; return {id:idNow(),name,system:sys,current_star:0,current_bar:0,cards_owned:0};}

  function calculateUpgrade(hero){
    if(hero.system==="Exp"){
      let rank=null; for(const cat in expList) if(expList[cat].includes(hero.name)) rank=cat;
      let per = rank? EXP_CATS[rank]:0;
      let cards = Number(hero.cards_owned)||0;
      return {isExp:true,exp_rank:rank,exp_per_card:per,exp_points:cards*per,cards_consumed:cards,cards_left:0,final_star:0,final_bar:0,missing_to_5:0};
    }
    let star=hero.current_star||0, bar=hero.current_bar||0, cards=hero.cards_owned||0, consumed=0;
    while(cards>0){
      if(star>=5) break;
      const maxBar=maxBarForStar(star);
      if(bar>=maxBar){ star++; bar=0; continue; }
      const needed=costFor(star,bar);
      if(needed===null) break;
      if(cards>=needed){ cards-=needed; consumed+=needed; bar++; } else break;
    }
    const cards_left=cards;
    let ms=0,s=star,b=bar;
    while(s<5){
      const maxBar=maxBarForStar(s);
      if(b>=maxBar){ s++; b=0; continue;}
      const need=costFor(s,b);
      if(need===null){ ms=Infinity; break; }
      ms+=need; b++;
    }
    return {isExp:false,final_star:star,final_bar:bar,cards_consumed:consumed,cards_left:cards_left,missing_to_5:ms};
  }

  function showModal(title,msg,system){
    const modal=$("resultModal"), header=$("modalHeader"), body=$("modalBody"), box=$("modalBox");
    box.className="modal-content sys-"+system;
    header.innerText=title; body.innerText=msg;
    modal.style.display="flex";
  }
  function closeModal(){ $("resultModal").style.display="none"; }

  function showModalResult(hero){
    const res=calculateUpgrade(hero);
    if(res.isExp){
      showModal(`Tướng EXP – ${hero.name}`,
        `Hạng: ${res.exp_rank}\nSố thẻ: ${res.cards_consumed}\nĐiểm EXP: ${formatNumber(res.exp_points)}`,
        "Exp");
      return;
    }
    const used_cards=res.cards_consumed;
    const leftover_cards=res.final_star>=5?res.cards_left:0;
    const used_points=used_cards*CARD_POINT;
    const leftover_points=leftover_cards*CARD_POINT;
    const total_points=used_points+leftover_points;
    const msg=`Sao/Bậc hiện tại: ${hero.current_star}★ bậc ${hero.current_bar}
Nâng đến: ${res.final_star}★ bậc ${res.final_bar}

🔹 Thẻ dùng: ${used_cards} → Điểm: ${formatNumber(used_points)}
🔹 Thẻ dư: ${leftover_cards} → Điểm: ${formatNumber(leftover_points)}

⭐ Tổng điểm: ${formatNumber(total_points)}
Để 5★ thiếu: ${res.missing_to_5===Infinity?'Không xác định':res.missing_to_5+' thẻ'}`;
    showModal(`${hero.name} – Kết quả`, msg, hero.system);
  }

  function createHeroElement(h){
    const box=document.createElement("div"); box.className="hero";
    let cls=h.system==="Lửa"?"fire":h.system==="Cung"?"cung":h.system==="Độc"?"độc":h.system==="Băng"?"băng":"exp"; 
    box.classList.add(cls);

    const nameCol=document.createElement("div"); nameCol.innerHTML=`<div style="font-weight:600">${h.name}</div><small>${h.system}</small>`;
    const starCol=document.createElement("div"); const starSel=document.createElement("select");
    starSel.innerHTML=Array.from({length:6}).map((_,i)=>`<option value="${i}" ${i===h.current_star?'selected':''}>${i}★</option>`).join("");
    starSel.onchange=()=>{ h.current_star=parseInt(starSel.value,10); if(h.current_bar>maxBarForStar(h.current_star)) h.current_bar=maxBarForStar(h.current_star); saveState(); renderSummary(); };
    starCol.appendChild(starSel);

    const barCol=document.createElement("div"); const barSel=document.createElement("select");
    const maxBar=maxBarForStar(h.current_star);
    barSel.innerHTML=Array.from({length:maxBar+1}).map((_,i)=>`<option value="${i}" ${i===h.current_bar?'selected':''}>Bậc ${i}</option>`).join("");
    barSel.onchange=()=>{ h.current_bar=parseInt(barSel.value,10); saveState(); renderSummary(); };
    barCol.appendChild(barSel);

    const cardCol=document.createElement("div"); const cardsInput=document.createElement("input");
    cardsInput.type="number"; cardsInput.min=0; cardsInput.value=h.cards_owned||0;
    cardsInput.onchange=()=>{ h.cards_owned=Math.max(0,Math.floor(Number(cardsInput.value)||0)); saveState(); };
    cardCol.appendChild(cardsInput);

    const opsCol=document.createElement("div"); opsCol.className="hero-ops";
    const calcBtn=document.createElement("button"); calcBtn.className="btn ghost"; calcBtn.textContent="Tính";
    calcBtn.onclick=()=>showModalResult(h);
    opsCol.appendChild(calcBtn);

    box.appendChild(nameCol); box.appendChild(starCol); box.appendChild(barCol); box.appendChild(cardCol); box.appendChild(opsCol);
    return box;
  }

  function renderHeroList(){
    const list=$("heroList"); list.innerHTML="";
    const f=($("filterHero").value||"").trim().toLowerCase();
    if(SYSTEMS.includes(state.activeTab)){
      (heroesData[state.activeTab]||[]).forEach(n=>{ if(f && !n.toLowerCase().includes(f)) return; const h=state.heroes.find(x=>x.name===n); if(h) list.appendChild(createHeroElement(h)); });
    } else {
      for(const cat in expList) if(cat===state.activeTab) expList[cat].forEach(n=>{ if(f && !n.toLowerCase().includes(f)) return; const h=state.heroes.find(x=>x.name===n); if(h) list.appendChild(createHeroElement(h)); });
    }
  }

  function renderSummary(){
    const box=$("summary"); box.innerHTML="";
    const totals={}; SYSTEMS.concat(Object.keys(expList)).forEach(s=>totals[s]=0);
    state.heroes.forEach(h=>{
      let pts=0;
      if(h.system==="Exp"){ 
        for(const cat in expList) if(expList[cat].includes(h.name)){ pts=(h.cards_owned||0)*EXP_CATS[cat]; totals[cat]+=pts; break;} 
      } else { 
        const r=calculateUpgrade(h); 
        let pCount=r.cards_consumed; 
        if(r.final_star>=5) pCount+=r.cards_left; 
        pts=pCount*CARD_POINT; 
        totals[h.system]+=pts; 
      }
    });

    let grandTotal = 0;
    for(const s in totals){ 
      const r=document.createElement("div"); r.className="row"; r.innerHTML=`<span>${s}</span><span class="big">${formatNumber(totals[s])}</span>`; 
      box.appendChild(r); grandTotal += totals[s];
    }

    const totalRow = document.createElement("div"); totalRow.className="row"; totalRow.style.borderTop="1px solid #ccc"; totalRow.style.fontWeight="700";
    totalRow.innerHTML=`<span>Tổng điểm</span><span class="big">${formatNumber(grandTotal)}</span>`;
    box.appendChild(totalRow);
  }

  function renderTabs(){
    const tabs=$("tabs"); tabs.innerHTML="";
    SYSTEMS.concat(Object.keys(expList)).forEach(s=>{
      const t=document.createElement("div"); t.className="tab"+(state.activeTab===s?" active":""); t.textContent=s;
      const color=s==="Lửa"?"var(--fire)":s==="Cung"?"var(--light)":s==="Độc"?"var(--wind)":s==="Băng"?"var(--water)":"var(--exp)";
      if(state.activeTab===s){ t.style.background=color; t.style.color="#fff"; t.style.fontWeight="600"; } else { t.style.background="#eaeaea"; t.style.color="#555"; t.style.fontWeight="400"; }
      t.onclick=()=>{ state.activeTab=s; saveState(); renderTabs(); renderHeroList(); $("systemTitle").innerText=s; };
      tabs.appendChild(t);
    });
  }

  function saveState(){ localStorage.setItem(LS_KEY,JSON.stringify(state)); }
  function loadState(){
    const data=localStorage.getItem(LS_KEY); if(data) state=JSON.parse(data); 
    SYSTEMS.concat(Object.keys(expList)).forEach(s=>{ (heroesData[s]||[]).forEach(n=>{ if(!state.heroes.find(h=>h.name===n)) state.heroes.push(defaultHeroData(n,s)); }); });
    for(const cat in expList) expList[cat].forEach(n=>{ if(!state.heroes.find(h=>h.name===n)) state.heroes.push(defaultHeroData(n,"Exp")); });
    saveState();
  }

  $("filterHero").oninput=renderHeroList;
  $("btnCalcAll").onclick=()=>{renderSummary();};

  loadState();
  renderTabs();
  renderHeroList();
  renderSummary();
});
