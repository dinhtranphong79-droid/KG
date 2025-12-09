window.addEventListener("tab.open", (e) => {
  if (e.detail.id !== "phuthuy") return;

  const container = document.getElementById("tab_phuthuy");

  /* =========================================
      RENDER HTML
  ========================================== */
  container.innerHTML = `
  <style>
    .t-card{background:#fff;padding:12px;border-radius:8px;width:300px;box-shadow:0 2px 6px rgba(0,0,0,0.1);margin-bottom:12px}
    .buoi{display:flex;justify-content:space-between;align-items:center;padding:6px;border-radius:6px;margin-bottom:6px;font-weight:bold;color:white;transition:0.25s}
    .xanh-duong{background:#93c5fd}.xanh-duong.active{background:#3b82f6}
    .do{background:#fca5a5}.do.active{background:#ef4444}
    .xanh-ngoc{background:#5eead4}.xanh-ngoc.active{background:#14b8a6}
    .tim{background:#d8b4fe}.tim.active{background:#a855f7}
    .vang{background:#fde047;color:black}.vang.active{background:#facc15;color:black}
    .xanh-la{background:#86efac}.xanh-la.active{background:#22c55e}
    input[type=number]{width:60px}
    .summary{margin-top:20px;padding:12px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
    button{margin-top:20px;padding:10px 14px;border:none;border-radius:6px;background:#3b82f6;color:white;cursor:pointer}
  </style>

  <h3>Phù Thủy</h3>

  <div>
    <label>Thuốc thử ánh sáng: <input id="thuocThu" type="number" value="0" min="0"></label>
    <label>Thuốc tăng cường: <input id="thuocTangCuong" type="number" value="0" min="0"></label>
    <label>Thuốc may mắn: <input id="thuocMayMan" type="number" value="0" min="0"></label>
  </div>

  <div id="tContainer" class="container"></div>
  <button id="btnTinh">Tính điểm & lưu Firestore</button>

  <div class="summary">
    <h3>Bảng tổng kết</h3>
    <div id="summaryDetail"></div>
    <h4>Gợi ý nâng</h4>
    <ul id="suggestList"></ul>
  </div>
  `;

  /* =========================================
      LOGIC DỮ LIỆU
  ========================================== */
  const TData = {
    T1:{boost:30,luck:5},
    T2:{boost:90,luck:20},
    T3:{boost:430,luck:80},
    T4:{boost:2110,luck:400},
    T5:{boost:10530,luck:2000},
    T6:{boost:52640,luck:10000},
    T7:{boost:263160,luck:50000},
    T8:{boost:1315790,luck:250000},
    T9:{boost:6578950,luck:1250000}
  };

  const COLORS = [
    {name:"Xanh Dương", cls:"xanh-duong"},
    {name:"Đỏ", cls:"do"},
    {name:"Xanh Ngọc", cls:"xanh-ngoc"},
    {name:"Tím", cls:"tim"},
    {name:"Vàng", cls:"vang"},
    {name:"Xanh Lá", cls:"xanh-la"}
  ];

  const MAX_LV = 20;

  const box = document.getElementById("tContainer");

  /* =========================================
      RENDER BỤI T1 → T9
  ========================================== */
  for(const T in TData){
    const card = document.createElement("div");
    card.className = "t-card";
    card.innerHTML = `<h4>${T}</h4>`;

    COLORS.forEach(c=>{
      const div = document.createElement("div");
      div.className = `buoi ${c.cls}`;
      div.innerHTML = `
        <label><input type="checkbox" class="cb" data-t="${T}" data-b="${c.name}"> ${c.name}</label>
        <input type="number" class="lv" min="0" max="${MAX_LV}" disabled data-t="${T}" data-b="${c.name}" value="0">
      `;
      card.appendChild(div);
    });

    box.appendChild(card);
  }

  /* =========================================
      CHECKBOX ON/OFF LEVEL
  ========================================== */
  document.querySelectorAll(".cb").forEach(cb=>{
    cb.addEventListener("change",()=>{
      const t = cb.dataset.t;
      const b = cb.dataset.b;
      const inp = document.querySelector(`.lv[data-t="${t}"][data-b="${b}"]`);
      const div = cb.closest(".buoi");

      if(cb.checked){
        inp.disabled = false;
        div.classList.add("active");
      } else {
        inp.disabled = true;
        inp.value = 0;
        div.classList.remove("active");
      }
    });
  });

  /* =========================================
      CLICK TÍNH + LƯU FIRESTORE
  ========================================== */
  document.getElementById("btnTinh").onclick = async ()=>{

    let thu = +document.getElementById("thuocThu").value || 0;
    let tc  = +document.getElementById("thuocTangCuong").value || 0;
    let mm  = +document.getElementById("thuocMayMan").value || 0;

    let usedTC = 0;
    let usedMM = 0;
    const suggest = [];
    const saveDetail = {};

    const list = document.querySelectorAll(".lv");

    // Duyệt từng bụi
    list.forEach(inp=>{
      const t = inp.dataset.t;
      const b = inp.dataset.b;
      const cb = document.querySelector(`.cb[data-t="${t}"][data-b="${b}"]`);

      if(!cb.checked) return;

      const key = `${t}_${b}`;
      saveDetail[key] = {};

      let lv = +inp.value;
      if(lv > MAX_LV) lv = MAX_LV;

      saveDetail[key].level = lv;

      const boost = TData[t].boost;
      const luck  = TData[t].luck;

      // dùng thuốc tăng cường
      const needTC = boost * lv;
      const tcUse = Math.min(needTC, tc);
      usedTC += tcUse;
      tc -= tcUse;

      // dùng thuốc may mắn
      let mmUse = 0;
      if(lv >= 10){
        const needMM = luck * (lv - 9);
        mmUse = Math.min(needMM, mm);
        usedMM += mmUse;
        mm -= mmUse;
      }
      saveDetail[key].usedTC = tcUse;
      saveDetail[key].usedMM = mmUse;

      // gợi ý nâng tối ưu
      let extra = 0;
      let tempTC = tc;
      let tempMM = mm;

      for(let L = lv+1; L <= MAX_LV; L++){
        const reqTC = boost;
        const reqMM = (L >= 10 ? luck : 0);

        if(tempTC >= reqTC && tempMM >= reqMM){
          tempTC -= reqTC;
          tempMM -= reqMM;
          extra++;
        } else break;
      }

      suggest.push(`${t} - ${b}: ${lv} → ${lv+extra}`);
      saveDetail[key].suggestTo = lv+extra;
    });

    /* =========================================
        TÍNH ĐIỂM
    ========================================== */
    const diemThu = thu * 70;
    const diemTC  = Math.round((usedTC / 25) * 70);
    const diemMM  = Math.round((usedMM / 5) * 140);
    const total = diemThu + diemTC + diemMM;

    document.getElementById("summaryDetail").innerHTML = `
      Thuốc thử ánh sáng: ${diemThu}<br>
      Thuốc tăng cường: ${diemTC}<br>
      Thuốc may mắn: ${diemMM}<br>
      <b>Tổng điểm: ${total.toLocaleString()}</b>
    `;

    document.getElementById("suggestList").innerHTML =
      suggest.map(s=>`<li>${s}</li>`).join("");

    /* =========================================
        LƯU FIRESTORE
    ========================================== */
    if(auth.currentUser){
      try{
        await db.collection("users")
          .doc(auth.currentUser.uid)
          .collection("tabs")
          .doc("phuthuy")
          .set({
            lastPoints: total,
            usedTC, usedMM, thu,
            detail: saveDetail,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          }, {merge:true});

        window.dispatchEvent(new Event("summary.refresh"));
      } catch(err){
        console.error("Lỗi lưu Firestore:", err);
      }
    }
  };

});
