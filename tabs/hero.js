// tabs/hero.js
// Hero tab: local state, Firestore sync (auto-save & load), highlight near-level heroes,
// and push hero total into users/{uid}/tabs/hero (lastPoints)
//
// Depends on firebase.js, ui.js, auth.js loaded before.

window.addEventListener('tab.open', (e)=>{
  if(e.detail.id !== 'hero') return;

  // ensure container markup only once
  const container = document.getElementById('tab_hero');
  container.innerHTML = `
    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div><strong id="systemTitle">Lửa</strong></div>
        <div><button id="btnCalcAll" class="btn">Tính toàn bộ</button></div>
      </div>
      <div style="margin-bottom:12px;display:flex;gap:10px">
        <input id="filterHero" placeholder="Tìm tướng" />
      </div>
      <div class="hero-list" id="heroList"></div>
    </div>
  `;

  // constants & data (keep same as UI you approved)
  const COST_ARRAY = {0:[20,20],1:[30,40,50],2:[60,70,80,80],3:[100,110,120,130,140],4:[170,180,190,200,210],5:[]};
  const CARD_POINT = 14000;
  const SYSTEMS = ["Lửa","Cung","Độc","Băng"];
  const EXP_CATS = {"B+":100,"B":700,"SR":3500};

  const heroesData = {
    "Lửa": ["Dolvar","Paul","Alex","Allen","Anko","Apollo","Blaise","Brie","Catrina","Christie","Cosette","Dain","Darcy","Daria","Dean","Edmund","Erika","Fiona","Gisele","Gro","Ivy","Kenshiro","Kirona","Kyle","Lovelace","Mirai","Penny","Seraphin","Simon","Sindra","Theodore","Tracy","Vanessa","Wallis"],
    "Cung": ["Aidan","Alden","Ariza","Authur","Bella","Colin","Doris","Dylan","Eleanora","Fatima","Gabriel","Green","Jennifer","Johannes","Kadir","Kailin","Layla","Livia","Maya","Meg","Mira","Montag","O'Neil","Padme","Pan","Ptolemy","Richard","Ryan","Sahar","Sebastian","Seraphia","Solder","Torvi","Trist"],
    "Độc": ["Allison","Angelina","Arwin","Benjamin","Blackwell","Boudica","Catherine","Chiyoko","Claudia","Daisy","Elia","Gruen","Issac","Lilith","Lomax","Luvia","Maxwell","Meniere","Morgana","Mycelia","Naga","Pythia","Rila","Rogers","Rosamond","Suad","Tumnus","Viper","Viola","Webster","Wendy"],
    "Băng": ["Aurora","Christine","Clarence","Enzo","Eslaine","Filius","Hadi","Hana","Hathes","Havik","Jessica","Judy","Keith","Lilani","Loka","Maud","Nathaniel","Nicole","Nina","Nivea","Olaf","Parr","Paula","Pedra","Ralph","Rebecca","Rudolph","Selene","Trishy","Vera","Ao Deng","Ao Yue"]
  };
  const expList = { "B+": ["Daniel"], "B": ["Anton","Peter","Etley"], "SR": ["Alucard","Samar","Harold","Kris","Merlin","Ophelia","Arwyn"]};

  // state
  const LS_KEY = 'hero_state_v3';
  let state = { heroes:[], activeTab: SYSTEMS[0] };
  let currentUser = null;

  // utils
  const $ = id => document.getElementById(id);
  function formatNumber(n){ return Number(n).toLocaleString('vi-VN'); }
  function idNow(){ return "h-"+Math.random().toString(36).slice(2,9); }
  function maxBarForStar(st){ return (COST_ARRAY[st]||[]).length; }
  function costFor(st,bar){ return (COST_ARRAY[st]||[])[bar]||null; }
  function defaultHeroData(name,system){
    let sys = system;
    for(const cat in expList) if(expList[cat].includes(name)) sys = "Exp";
    return { id:idNow(), name, system:sys, current_star:0, current_bar:0, cards_owned:0 };
  }

  // calculation: same as before
  function calculateUpgrade(h){
    if(h.system === "Exp"){
      let rank=null;
      for(const c in expList) if(expList[c].includes(h.name)) rank=c;
      return { isExp:true, exp_rank:rank, exp_points:(h.cards_owned||0)*EXP_CATS[rank] };
    }
    let star = h.current_star||0, bar = h.current_bar||0, cards = h.cards_owned||0, used=0;
    while(cards>0){
      if(star>=5) break;
      const max = maxBarForStar(star);
      if(bar>=max){ star++; bar=0; continue; }
      const need = costFor(star,bar);
      if(need===null) break;
      if(cards>=need){ cards-=need; used+=need; bar++; } else break;
    }
    return { isExp:false, final_star:star, final_bar:bar, cards_consumed:used, cards_left:cards, missing_to_next: (() => {
      // compute how many cards to next incremental bar (or 1 if just need something small)
      if(star>=5) return 0;
      const max = maxBarForStar(star);
      if(bar >= max) return 0; // next is next star
      const need = costFor(star, bar);
      if(need === null) return Infinity;
      return Math.max(0, need - (h.cards_owned||0));
    })() };
  }

  // rendering
  function createHeroElement(h){
    const box = document.createElement('div');
    box.className = 'hero';
    const cls = h.system==="Lửa"?"fire":h.system==="Cung"?"cung":h.system==="Độc"?"độc":h.system==="Băng"?"băng":"exp";
    box.classList.add(cls);

    // highlight if close to next small upgrade (threshold configurable)
    const res = calculateUpgrade(h);
    const nearThreshold = 6; // <= cards missing -> highlight
    if(!res.isExp && res.missing_to_next <= nearThreshold && res.missing_to_next > 0){
      box.style.boxShadow = '0 0 0 3px rgba(255,200,0,0.12)'; // subtle highlight
    }

    const nameCol = document.createElement('div');
    nameCol.innerHTML = `<div style="font-weight:600">${h.name}</div><small>${h.system}</small>`;
    const starCol = document.createElement('div');
    const starSel = document.createElement('select');
    starSel.innerHTML = Array.from({length:6}).map((_,i)=>`<option value="${i}" ${i===h.current_star?'selected':''}>${i}★</option>`).join('');
    starSel.onchange = ()=> {
      h.current_star = Number(starSel.value);
      if(h.current_bar > maxBarForStar(h.current_star)) h.current_bar = 0;
      onLocalChange();
    };
    starCol.appendChild(starSel);

    const barCol = document.createElement('div');
    const barSel = document.createElement('select');
    const maxBar = maxBarForStar(h.current_star);
    barSel.innerHTML = Array.from({length:maxBar+1}).map((_,i)=>`<option value="${i}" ${i===h.current_bar?'selected':''}>Bậc ${i}</option>`).join('');
    barSel.onchange = ()=> { h.current_bar = Number(barSel.value); onLocalChange(); };
    barCol.appendChild(barSel);

    const cardCol = document.createElement('div');
    const cardsInput = document.createElement('input');
    cardsInput.type='number'; cardsInput.min=0; cardsInput.value = h.cards_owned||0;
    cardsInput.oninput = ()=> { h.cards_owned = Math.max(0, Math.floor(Number(cardsInput.value)||0)); onLocalChange(); };
    cardCol.appendChild(cardsInput);

    const opsCol = document.createElement('div'); opsCol.className='hero-ops';
    const calcBtn = document.createElement('button'); calcBtn.className='btn ghost'; calcBtn.textContent='Tính';
    calcBtn.onclick = ()=> showModalResult(h);
    opsCol.appendChild(calcBtn);

    box.appendChild(nameCol);
    box.appendChild(starCol);
    box.appendChild(barCol);
    box.appendChild(cardCol);
    box.appendChild(opsCol);
    return box;
  }

  function renderHeroList(){
    const list = $('heroList');
    list.innerHTML = '';
    const f = ($('filterHero').value||'').trim().toLowerCase();
    if(SYSTEMS.includes(state.activeTab)){
      (heroesData[state.activeTab]||[]).forEach(n=>{
        if(f && !n.toLowerCase().includes(f)) return;
        const h = state.heroes.find(x=>x.name===n);
        if(h) list.appendChild(createHeroElement(h));
      });
    } else {
      for(const cat in expList) if(cat === state.activeTab) expList[cat].forEach(n=>{
        if(f && !n.toLowerCase().includes(f)) return;
        const h = state.heroes.find(x=>x.name===n);
        if(h) list.appendChild(createHeroElement(h));
      });
    }
  }

  function renderSummary(){
    // compute totals and write to Firestore (hero tab doc)
    const totals = {};
    SYSTEMS.concat(Object.keys(expList)).forEach(s=>totals[s]=0);
    state.heroes.forEach(h=>{
      if(h.system === 'Exp'){
        for(const cat in expList) if(expList[cat].includes(h.name)){
          totals[cat] += (h.cards_owned||0)*EXP_CATS[cat];
          break;
        }
      } else {
        const r = calculateUpgrade(h);
        let pCount = r.cards_consumed||0;
        if(r.final_star >= 5) pCount += r.cards_left||0;
        totals[h.system] += pCount * CARD_POINT;
      }
    });
    let grand = 0;
    for(const s in totals) grand += totals[s];

    // render in the small summary area (we don't have full aside here, but update system title)
    $('systemTitle').innerText = state.activeTab;

    // Save hero points and trigger summary.refresh
    saveToFirestoreDebounced();
    // also dispatch a local event to notify other tabs
    window.dispatchEvent(new CustomEvent('hero.summary', { detail:{ total: grand, bySystem: totals } }));
    // also update global summary
    window.dispatchEvent(new Event('summary.refresh'));
  }

  // modal
  const resultModalId = 'resultModal';
  function showModalResult(h){
    const r = calculateUpgrade(h);
    let msg = '';
    if(r.isExp){
      msg = `Hạng: ${r.exp_rank}\nĐiểm EXP: ${formatNumber(r.exp_points)}`;
      $('modalBox').className = 'modal-content sys-Exp';
    } else {
      const used = r.cards_consumed, left = r.final_star>=5 ? r.cards_left : 0;
      const usedPoints = used * CARD_POINT;
      const leftPoints = left * CARD_POINT;
      const total = usedPoints + leftPoints;
      msg =
`Sao/Bậc hiện tại: ${h.current_star}★ bậc ${h.current_bar}
Nâng tới: ${r.final_star}★ bậc ${r.final_bar}

Thẻ dùng: ${used} → Điểm: ${formatNumber(usedPoints)}
Thẻ dư: ${left} → Điểm: ${formatNumber(leftPoints)}

⭐ Tổng điểm: ${formatNumber(total)}`;
      $('modalBox').className = 'modal-content sys-'+h.system;
    }
    $('modalHeader').innerText = h.name;
    $('modalBody').innerText = msg;
    $(resultModalId).style.display = 'flex';
  }
  function closeModal(){ $(resultModalId).style.display = 'none'; }
  window.closeModal = closeModal; // expose for button

  // local storage
  function saveLocal(){
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }
  function loadLocal(){
    const s = localStorage.getItem(LS_KEY);
    if(s) state = JSON.parse(s);
    // ensure all heroes exist
    SYSTEMS.forEach(sys=>{
      (heroesData[sys]||[]).forEach(n=>{
        if(!state.heroes.find(h=>h.name===n)) state.heroes.push(defaultHeroData(n,sys));
      });
    });
    for(const cat in expList){
      expList[cat].forEach(n=>{
        if(!state.heroes.find(h=>h.name===n)) state.heroes.push(defaultHeroData(n,'Exp'));
      });
    }
    saveLocal();
  }

  // Firestore: save & load (debounced save)
  let saveTimer = null;
  function saveToFirestoreDebounced(delay=700){
    if(!currentUser) { saveLocal(); return; }
    if(saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(()=> saveToFirestore().catch(e=>console.error(e)), delay);
    saveLocal();
  }

  async function saveToFirestore(){
    if(!currentUser) return;
    const uid = currentUser.uid;
    // compute total
    let totals = computeTotals();
    await FB.db.collection('users').doc(uid).collection('tabs').doc('hero').set({
      heroData: state.heroes,
      bySystem: totals.bySystem,
      lastPoints: totals.total,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    },{ merge:true });
    // broadcast summary update
    window.dispatchEvent(new Event('summary.refresh'));
  }

  async function loadFromFirestore(){
    if(!currentUser) return;
    const uid = currentUser.uid;
    try{
      const doc = await FB.db.collection('users').doc(uid).collection('tabs').doc('hero').get();
      if(doc.exists){
        const data = doc.data();
        if(data.heroData && Array.isArray(data.heroData) && data.heroData.length>0){
          // merge firestore heroData into local state
          // Replace local entries by matching name
          data.heroData.forEach(hf=>{
            const local = state.heroes.find(x=>x.name===hf.name);
            if(local){
              // merge fields that user cares: current_star, current_bar, cards_owned, system
              local.current_star = (typeof hf.current_star === 'number') ? hf.current_star : local.current_star;
              local.current_bar  = (typeof hf.current_bar === 'number') ? hf.current_bar : local.current_bar;
              local.cards_owned  = (typeof hf.cards_owned === 'number') ? hf.cards_owned : local.cards_owned;
              local.system       = hf.system || local.system;
            } else {
              state.heroes.push(defaultHeroData(hf.name, hf.system || 'Lửa'));
            }
          });
          saveLocal();
        }
      }
    }catch(err){ console.error('Load hero from firestore failed', err); }
  }

  function computeTotals(){
    const totals = {};
    SYSTEMS.concat(Object.keys(expList)).forEach(s=>totals[s]=0);
    state.heroes.forEach(h=>{
      if(h.system==='Exp'){
        for(const cat in expList) if(expList[cat].includes(h.name)){
          totals[cat] += (h.cards_owned||0)*EXP_CATS[cat];
          break;
        }
      } else {
        const r = calculateUpgrade(h);
        let pCount = r.cards_consumed||0;
        if(r.final_star>=5) pCount += r.cards_left||0;
        totals[h.system] += pCount * CARD_POINT;
      }
    });
    let total = 0;
    for(const k in totals) total += totals[k];
    return { total, bySystem: totals };
  }

  // when local change occurs
  function onLocalChange(){
    saveLocal();
    renderSummary();
    renderHeroList(); // re-render to show highlights/updated selects
    saveToFirestoreDebounced();
  }

  // auth hooks
  window.addEventListener('user.login', async (ev)=>{
    currentUser = ev.detail.user;
    // when user logs in, pull their saved hero data
    await loadFromFirestore();
    renderHeroList();
    renderSummary();
  });
  window.addEventListener('user.logout', ()=>{
    currentUser = null;
    // keep local data; you may want to clear if you prefer
    renderHeroList();
    renderSummary();
  });

  // initial local load
  loadLocal();

  // bind UI controls
  $('filterHero').oninput = renderHeroList;
  $('btnCalcAll').onclick = ()=> { renderSummary(); };

  // when other parts request refresh (e.g., after saving), update summary
  window.addEventListener('summary.refresh', ()=>{ renderSummary(); });

  // initial render
  renderHeroList();
  renderSummary();
});
