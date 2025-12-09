window.addEventListener("tab.open", (e) => {
  if (e.detail.id !== "thienphu") return;

  const box = document.getElementById("tab_thienphu");

  box.innerHTML = `
  <style>
    .tp-card { background:white; padding:15px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); margin-bottom:20px; }
    .tp-row { display:flex; gap:20px; margin-top:15px; }
    .tp-col { flex:1; }
    .tp-input { width:80px; padding:4px; }
    .tp-table { width:100%; border-collapse: collapse; margin-top:10px; }
    .tp-table th, .tp-table td { border:1px solid #ddd; padding:6px; text-align:center; }
    #tp_total { font-size:18px; font-weight:bold; padding:15px; background:#e7f4ff; border-radius:10px; text-align:center; }
  </style>

  <div class="tp-card">
    <h3>Season & Tài nguyên</h3>

    <div class="tp-row">
      <div class="tp-col">
        <label>Season:
          <select id="tp_season"></select>
        </label>
        <div>Sách thiên phú: <span id="tp_book_point">-</span></div>
        <div>Vương miện: <span id="tp_crown_point">-</span></div>
      </div>

      <div class="tp-col">
        <div>Sách: <input id="tp_books" type="number" class="tp-input" value="0"></div>
        <div>Vương miện: <input id="tp_crowns" type="number" class="tp-input" value="0"></div>
      </div>

      <div class="tp-col">
        <h4>Sách lính</h4>
        <div>T1 <input id="tp_t1" class="tp-input" type="number" value="0"></div>
        <div>T2 <input id="tp_t2" class="tp-input" type="number" value="0"></div>
        <div>T3 <input id="tp_t3" class="tp-input" type="number" value="0"></div>
        <div>T4 <input id="tp_t4" class="tp-input" type="number" value="0"></div>
      </div>
    </div>
  </div>

  <div class="tp-card">
    <h3>GM1</h3>
    <table class="tp-table">
      <thead>
        <tr><th>Tier</th>${"<th>"+[1,2,3,4,5,6,7,8,9,10].join("</th><th>")+"</th>"}</tr>
      </thead>
      <tbody>
        <tr>
          <td>Đã nâng</td>
          ${[...Array(10)].map((_,i)=>`<td><input type="number" class="tp-input tp_gm1_done" data-t="${i}" value="0" min="0" max="48"></td>`).join("")}
        </tr>
        <tr>
          <td>Nâng được</td>
          ${[...Array(10)].map((_,i)=>`<td class="tp_gm1_res" data-t="${i}">0</td>`).join("")}
        </tr>
      </tbody>
    </table>
  </div>

  <div class="tp-card">
    <h3>GM2</h3>
    <table class="tp-table">
      <thead>
        <tr><th>Tier</th>${"<th>"+[1,2,3,4,5,6,7,8,9,10].join("</th><th>")+"</th>"}</tr>
      </thead>
      <tbody>
        <tr>
          <td>Đã nâng</td>
          ${[...Array(10)].map((_,i)=>`<td><input type="number" class="tp-input tp_gm2_done" data-t="${i}" value="0" min="0" max="6"></td>`).join("")}
        </tr>
        <tr>
          <td>Nâng được</td>
          ${[...Array(10)].map((_,i)=>`<td class="tp_gm2_res" data-t="${i}">0</td>`).join("")}
        </tr>
      </tbody>
    </table>
  </div>

  <div id="tp_total">Tổng điểm: 0</div>
  `;

  // ==== DATA ====

  const seasons = [
    {name:"Season 20", book:2.8, crown:28},
    {name:"Season 21", book:1.12, crown:11.2},
    {name:"Season 22", book:1.12, crown:11.2},
    {name:"Season 23", book:1.12, crown:11.2},
    {name:"Season 24", book:1.12, crown:11.2},
    {name:"Season 25", book:0.56, crown:5.6},
    {name:"Season 26", book:0.56, crown:5.6},
    {name:"Season 27", book:0.224, crown:2.24}
  ];

  const gm1Cost = [5,20,100,500,2500,12500,62500,312500,1562500,7812500];
  const gm2Book = [10,40,200,1000,5000,25000,125000,625000,3125000,15625000];
  const gm2Crown = [5,20,100,500,2500,12500,62500,312500,1562500,78125000];

  // ==== DOM ====

  const selSeason = document.getElementById("tp_season");
  const bookPointSpan = document.getElementById("tp_book_point");
  const crownPointSpan = document.getElementById("tp_crown_point");

  seasons.forEach((s,i)=>{
    const opt=document.createElement("option");
    opt.value=i;
    opt.textContent=s.name;
    selSeason.appendChild(opt);
  });

  selSeason.value = 0;
  updateSeason();

  function updateSeason(){
    const s = seasons[selSeason.value];
    bookPointSpan.textContent = s.book;
    crownPointSpan.textContent = s.crown;
  }

  selSeason.onchange = ()=>{ updateSeason(); calc(); };

  // AUTO CALC
  box.addEventListener("input", calc);

  function calc(){
    const season = seasons[selSeason.value];

    let books = Number(document.getElementById("tp_books").value)||0;
    let crowns = Number(document.getElementById("tp_crowns").value)||0;

    let usedGM1Books = 0;
    let usedGM2Books = 0;
    let usedGM2Crowns = 0;

    // GM1
    const gm1Done = [...document.querySelectorAll(".tp_gm1_done")].map(x=>Number(x.value)||0);
    const gm1Res = document.querySelectorAll(".tp_gm1_res");

    let totalGM1up = 0;

    for(let i=0;i<10;i++){
      const remain = 48 - gm1Done[i];
      if(remain<=0){ gm1Res[i].textContent=0; continue; }

      const cost = gm1Cost[i];
      const up = Math.min(remain, Math.floor(books/cost));

      books -= up*cost;
      usedGM1Books += up*cost;
      totalGM1up += up;

      gm1Res[i].textContent = up;
    }

    // GM2
    const gm2Done = [...document.querySelectorAll(".tp_gm2_done")].map(x=>Number(x.value)||0);
    const gm2Res = document.querySelectorAll(".tp_gm2_res");

    let gm1Pool = totalGM1up;

    for(let i=0;i<10;i++){
      const remain = 6 - gm2Done[i];
      if(remain<=0){ gm2Res[i].textContent=0; continue; }

      const byGM1 = Math.floor(gm1Pool/8);
      const byBook = Math.floor(books / gm2Book[i]);
      const byCrown = Math.floor(crowns / gm2Crown[i]);

      const up = Math.min(remain, byGM1, byBook, byCrown);

      if(up>0){
        books -= up*gm2Book[i];
        crowns -= up*gm2Crown[i];

        usedGM2Books += up*gm2Book[i];
        usedGM2Crowns += up*gm2Crown[i];

        gm1Pool -= up*8;
      }

      gm2Res[i].textContent = up;
    }

    // Lính
    const t1 = Number(document.getElementById("tp_t1").value)||0;
    const t2 = Number(document.getElementById("tp_t2").value)||0;
    const t3 = Number(document.getElementById("tp_t3").value)||0;
    const t4 = Number(document.getElementById("tp_t4").value)||0;

    const troopPoints =
      t1*800 + t2*4000 + t3*20000 + t4*100000;

    const gm1Points = usedGM1Books * season.book;
    const gm2Points = usedGM2Books * season.book + usedGM2Crowns * season.crown;

    const total = gm1Points + gm2Points + troopPoints;

    document.getElementById("tp_total").textContent =
      "Tổng điểm: " + total.toLocaleString("vi-VN");

    // SAVE FIRESTORE
    if(auth.currentUser){
      db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("tabs")
        .doc("thienphu")
        .set({
          lastPoints: total,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, {merge:true});

      window.dispatchEvent(new Event("summary.refresh"));
    }
  }

  calc(); // initial
});
