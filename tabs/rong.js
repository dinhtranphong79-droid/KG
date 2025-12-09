window.addEventListener("tab.open", (e)=>{
  if(e.detail.id !== "rong") return;

  const box = document.getElementById("tab_rong");

  box.innerHTML = `
    <div class="small">Rồng — tính nâng phù hiệu</div>
    <div class="grid">
      <div class="card">
        <label>Phù văn B (viên) <input id="d_haveB" type="number" min="0" value="0"></label>
        <label>Phù văn A (viên) <input id="d_haveA" type="number" min="0" value="0"></label>
        <label>Phù văn SR (viên) <input id="d_haveSR" type="number" min="0" value="0"></label>
        <label>Phù văn SSR (viên) <input id="d_haveSSR" type="number" min="0" value="0"></label>
      </div>

      <div class="card">
        <label>Đồng (lv) <input id="d_lvlDong" type="number" min="0" value="0"></label>
        <label>Bạc (lv) <input id="d_lvlBac" type="number" min="0" value="0"></label>
        <label>Vàng (lv) <input id="d_lvlVang" type="number" min="0" value="0"></label>
        <label>Truyền Kỳ (lv) <input id="d_lvlTK" type="number" min="0" value="0"></label>
        <label>Level rồng <input id="d_lvlDragon" type="number" min="0" value="0"></label>
      </div>
    </div>

    <div class="controls"><button id="d_compute" class="primary">Tính</button></div>
    <div id="d_result" class="result" style="display:none"></div>
  `;

  document.getElementById("d_compute").onclick = async ()=>{
    const COST_B = 250, COST_A = 125, COST_SR = 66;
    const PT_B = 70, PT_A = 700, PT_SR = 7000, PT_SSR = 14000;

    let have = {
      B: Number(document.getElementById("d_haveB").value)||0,
      A: Number(document.getElementById("d_haveA").value)||0,
      SR: Number(document.getElementById("d_haveSR").value)||0,
      SSR: Number(document.getElementById("d_haveSSR").value)||0
    };

    let st = {
      dong: Number(document.getElementById("d_lvlDong").value)||0,
      bac: Number(document.getElementById("d_lvlBac").value)||0,
      vang: Number(document.getElementById("d_lvlVang").value)||0,
      tk: Number(document.getElementById("d_lvlTK").value)||0,
      dragon: Number(document.getElementById("d_lvlDragon").value)||0
    };

    const start = JSON.parse(JSON.stringify(st));
    let used = {B:0,A:0,SR:0,SSR:0};
    let gain = {dong:0,bac:0,vang:0,tk:0,dragon:0};

    function promote(){
      let changed = true;
      while(changed){
        changed = false;
        if(st.dong >= 5){
          let c = Math.floor(st.dong / 5);
          st.dong -= c*5; st.bac += c; changed = true;
        }
        if(st.bac >= 4){
          let c = Math.floor(st.bac / 4);
          st.bac -= c*4; st.vang += c; changed = true;
        }
        if(st.vang >= 5){
          let c = Math.floor(st.vang / 5);
          st.vang -= c*5; st.tk += c; changed = true;
        }
      }
    }

    promote();

    let loop = true;
    while(loop){
      loop = false;

      if(have.B >= COST_B){
        have.B -= COST_B; used.B += COST_B;
        st.dong += 1; gain.dong += 1; promote(); loop = true; continue;
      }

      if(have.A >= COST_A){
        have.A -= COST_A; used.A += COST_A;
        st.bac += 1; gain.bac += 1; promote(); loop = true; continue;
      }

      if(have.SR >= COST_SR){
        have.SR -= COST_SR; used.SR += COST_SR;
        st.vang += 1; gain.vang += 1; promote(); loop = true; continue;
      }

      let ssrCost = (st.dragon + 1) * 10;
      if(have.SSR >= ssrCost){
        have.SSR -= ssrCost; used.SSR += ssrCost;
        st.tk += 1; gain.tk += 1;
        st.dragon += 1; gain.dragon += 1;
        promote(); loop = true; continue;
      }
    }

    const pts = used.B*PT_B + used.A*PT_A + used.SR*PT_SR + used.SSR*PT_SSR;

    const out = document.getElementById("d_result");
    out.style.display = "block";
    out.innerHTML = `
      <div><b>Trạng thái</b></div>
      <div>Đồng: ${start.dong} → ${start.dong + gain.dong}</div>
      <div>Bạc: ${start.bac} → ${start.bac + gain.bac}</div>
      <div>Vàng: ${start.vang} → ${start.vang + gain.vang}</div>
      <div>Truyền Kỳ: ${start.tk} → ${start.tk + gain.tk}</div>
      <div>Rồng: ${start.dragon} → ${start.dragon + gain.dragon}</div>
      <hr>
      <div><b>Tài nguyên dùng</b></div>
      <div>B: ${used.B} A: ${used.A} SR: ${used.SR} SSR: ${used.SSR}</div>
      <div><b>Điểm tab:</b> ${pts.toLocaleString()}</div>
    `;

    if(auth.currentUser){
      try{
        await db.collection("users").doc(auth.currentUser.uid).collection("tabs").doc("dragon")
          .set({ lastPoints: pts, used, gain, lastStart: start, lastEnd: { dong: start.dong+gain.dong, bac: start.bac+gain.bac, vang: start.vang+gain.vang, tk: start.tk+gain.tk, dragon: start.dragon+gain.dragon }, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
        window.dispatchEvent(new Event("summary.refresh"));
      }catch(err){console.error(err)}
    }
  };
});
