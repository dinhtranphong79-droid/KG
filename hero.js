window.addEventListener('tab.open', (e) => {
  if (e.detail.id !== 'hero') return;

  const container = document.getElementById('tab_hero');

  /* --- RENDER HTML --- */
  container.innerHTML = `
    <style>
      .hero-box{background:#fff;padding:12px;border-radius:8px;margin-bottom:8px;
        border-left:6px solid #999;display:grid;grid-template-columns:1fr 80px 80px 100px 70px;gap:8px;}
      .hero-box.fire{border-color:#e11d48;}
      .hero-box.cung{border-color:#facc15;}
      .hero-box.doc{border-color:#10b981;}
      .hero-box.bang{border-color:#0284c7;}
      .hero-box.exp{border-color:#6b7280;}
      .hero-box small{color:#777}
      #heroModal{position:fixed;inset:0;background:rgba(0,0,0,.4);display:none;
        align-items:center;justify-content:center;z-index:9999;}
      #heroModalBox{background:#fff;padding:20px;border-radius:12px;width:90%;max-width:420px;}
    </style>

    <div style="font-weight:600;margin-bottom:10px">Tính điểm tướng SSR & EXP</div>

    <div style="margin-bottom:12px">
      <input id="heroFilter" placeholder="Tìm tướng theo tên" style="width:100%;padding:6px;border-radius:6px;border:1px solid #ccc">
    </div>

    <div id="heroList"></div>

    <div id="heroSummary" style="margin-top:18px;font-weight:600"></div>

    <!-- MODAL -->
    <div id="heroModal">
      <div id="heroModalBox">
        <div id="heroModalTitle" style="font-size:18px;font-weight:700;margin-bottom:10px"></div>
        <div id="heroModalBody" style="white-space:pre-line"></div>
        <div style="margin-top:14px;text-align:right">
          <button onclick="document.getElementById('heroModal').style.display='none'"
            style="padding:8px 14px;border-radius:6px;border:none;background:#333;color:#fff">
            Đóng
          </button>
        </div>
      </div>
    </div>
  `;

  /* =====================================================================================
     DỮ LIỆU CỐT LÕI
  ===================================================================================== */

  const CARD_POINT = 14000;

  const COST_ARRAY = {
    0:[20,20],
    1:[30,40,50],
    2:[60,70,80,80],
    3:[100,110,120,130,140],
    4:[170,180,190,200,210],
    5:[]
  };

  const SYSTEMS = ["Lửa","Cung","Độc","Băng"];
  const EXP_CATS = {"B+":100,"B":700,"SR":3500};

  const heroesData = {
    "Lửa": ["Dolvar","Paul","Alex","Allen","Anko","Apollo","Blaise","Brie","Catrina","Christie","Cosette","Dain","Darcy","Daria","Dean","Edmund","Erika","Fiona","Gisele","Gro","Ivy","Kenshiro","Kirona","Kyle","Lovelace","Mirai","Penny","Seraphin","Simon","Sindra","Theodore","Tracy","Vanessa","Wallis"],
    "Cung": ["Aidan","Alden","Ariza","Authur","Bella","Colin","Doris","Dylan","Eleanora","Fatima","Gabriel","Green","Jennifer","Johannes","Kadir","Kailin","Layla","Livia","Maya","Meg","Mira","Montag","O'Neil","Padme","Pan","Ptolemy","Richard","Ryan","Sahar","Sebastian","Seraphia","Solder","Torvi","Trist"],
    "Độc": ["Allison","Angelina","Arwin","Benjamin","Blackwell","Boudica","Catherine","Chiyoko","Claudia","Daisy","Elia","Gruen","Issac","Lilith","Lomax","Luvia","Maxwell","Meniere","Morgana","Mycelia","Naga","Pythia","Rila","Rogers","Rosamond","Suad","Tumnus","Viper","Viola","Webster","Wendy"],
    "Băng": ["Aurora","Christine","Clarence","Enzo","Eslaine","Filius","Hadi","Hana","Hathes","Havik","Jessica","Judy","Keith","Lilani","Loka","Maud","Nathaniel","Nicole","Nina","Nivea","Olaf","Parr","Paula","Pedra","Ralph","Rebecca","Rudolph","Selene","Trishy","Vera","Ao Deng","Ao Yue"]
  };

  const expList = {
    "B+": ["Daniel"],
    "B": ["Anton","Peter","Etley"],
    "SR": ["Alucard","Samar","Harold","Kris","Merlin","Ophelia","Arwyn"]
  };

  /* =====================================================================================
     STORAGE LOCAL
  ===================================================================================== */

  const LS_KEY = "hero_tab_state";
  let state = { heroes: [] };

  function idNow(){ return "h-"+Math.random().toString(36).slice(2,9); }
  function maxBarForStar(st){ return (COST_ARRAY[st]||[]).length; }
  function costFor(st,bar){ return (COST_ARRAY[st]||[])[bar]||null; }
  function format(n){ return Number(n).toLocaleString("vi-VN"); }

  function defaultHero(name, sys){
    let s = sys;
    for(const cat in expList){
      if(expList[cat].includes(name)) s = "Exp";
    }
    return {
      id:idNow(),
      name,
      system:s,
      current_star:0,
      current_bar:0,
      cards_owned:0
    };
  }

  function loadState(){
    const data = localStorage.getItem(LS_KEY);
    if(data) state = JSON.parse(data);

    // đảm bảo đủ hero
    SYSTEMS.forEach(sys=>{
      heroesData[sys].forEach(n=>{
        if(!state.heroes.find(h=>h.name===n)) state.heroes.push(defaultHero(n,sys));
      });
    });
    for(const cat in expList){
      expList[cat].forEach(n=>{
        if(!state.heroes.find(h=>h.name===n)) state.heroes.push(defaultHero(n,"Exp"));
      });
    }
    saveState();
  }
  function saveState(){ localStorage.setItem(LS_KEY,JSON.stringify(state)); }

  /* =====================================================================================
     TÍNH NÂNG SAO
  ===================================================================================== */

  function calculateUpgrade(hero){
    if(hero.system==="Exp"){
      let rank = Object.keys(expList).find(c=>expList[c].includes(hero.name));
      let per = rank? EXP_CATS[rank] : 0;
      let cards = hero.cards_owned||0;
      return {
        isExp:true,
        total_points: cards*per,
        detail:`Hạng EXP: ${rank}\nSố thẻ: ${cards}\nĐiểm EXP: ${cards*per}`
      };
    }

    let star = hero.current_star;
    let bar  = hero.current_bar;
    let cards = hero.cards_owned;
    let used  = 0;

    while(cards > 0){
      if(star >= 5) break;
      const maxBar = maxBarForStar(star);
      if(bar >= maxBar){ star++; bar=0; continue; }
      const need = costFor(star,bar);
      if(!need) break;

      if(cards >= need){
        cards -= need;
        used  += need;
        bar++;
      } else break;
    }

    const leftover = (star>=5) ? cards : 0;
    const totalPoints = (used + leftover) * CARD_POINT;

    return {
      isExp:false,
      total_points: totalPoints,
      detail: `Sao/Bậc hiện tại: ${hero.current_star}★ bậc ${hero.current_bar}
Nâng đến: ${star}★ bậc ${bar}

Thẻ dùng: ${used}
Thẻ dư: ${leftover}

Tổng điểm: ${format(totalPoints)}
`
    };
  }

  /* =====================================================================================
     RENDER HERO LIST
  ===================================================================================== */

  function createHeroBox(h){
    const box = document.createElement("div");

    const cls =
      h.system==="Lửa" ? "fire" :
      h.system==="Cung" ? "cung" :
      h.system==="Độc" ? "doc" :
      h.system==="Băng" ? "bang" : "exp";

    box.className = "hero-box " + cls;

    box.innerHTML = `
      <div><b>${h.name}</b><br><small>${h.system}</small></div>
      <div>
        <select class="h_star">
          ${[0,1,2,3,4,5].map(i=>`<option value="${i}" ${i===h.current_star?'selected':''}>${i}★</option>`).join("")}
        </select>
      </div>
      <div>
        <select class="h_bar"></select>
      </div>
      <div>
        <input type="number" min="0" class="h_cards" value="${h.cards_owned}">
      </div>
      <div>
        <button class="h_calc" style="padding:4px 6px">Tính</button>
      </div>
    `;

    // render bậc
    const barSel = box.querySelector(".h_bar");
    const maxB = maxBarForStar(h.current_star);
    barSel.innerHTML = Array.from({length:maxB+1})
      .map((_,i)=>`<option value="${i}" ${i===h.current_bar?'selected':''}>${i}</option>`)
      .join("");

    // event star
    box.querySelector(".h_star").onchange = e=>{
      h.current_star = Number(e.target.value);
      if(h.current_bar > maxBarForStar(h.current_star)) h.current_bar = 0;
      saveState();
      renderHeroList();  // render lại dropdown bậc
      renderSummary();
    };

    // event bar
    barSel.onchange = e=>{
      h.current_bar = Number(e.target.value);
      saveState();
      renderSummary();
    };

    // event cards
    box.querySelector(".h_cards").onchange = e=>{
      h.cards_owned = Math.max(0, Number(e.target.value)||0);
      saveState();
      renderSummary();
    };

    // event calc
    box.querySelector(".h_calc").onclick = ()=>{
      const result = calculateUpgrade(h);
      document.getElementById("heroModalTitle").innerText = h.name + " – Kết quả";
      document.getElementById("heroModalBody").innerText = result.detail;
      document.getElementById("heroModal").style.display = "flex";
    };

    return box;
  }

  function renderHeroList(){
    const list = document.getElementById("heroList");
    const f = document.getElementById("heroFilter").value.toLowerCase();

    list.innerHTML = "";

    state.heroes.forEach(h=>{
      if(f && !h.name.toLowerCase().includes(f)) return;
      list.appendChild(createHeroBox(h));
    });
  }

  /* =====================================================================================
     SUMMARY
  ===================================================================================== */

  function renderSummary(){
    const box = document.getElementById("heroSummary");
    let total = 0;

    state.heroes.forEach(h=>{
      const r = calculateUpgrade(h);
      total += r.total_points;
    });

    box.innerHTML = `Tổng điểm tướng: <span style="color:#d00">${format(total)}</span>`;
  }

  /* =====================================================================================
     CHẠY
  ===================================================================================== */

  document.getElementById("heroFilter").oninput = renderHeroList;

  loadState();
  renderHeroList();
  renderSummary();

});
