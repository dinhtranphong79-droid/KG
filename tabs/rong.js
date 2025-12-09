window.addEventListener('tab.open', async (e)=>{
  if(e.detail.id !== 'rong') return;
  const container = document.getElementById('tab_rong');
  container.innerHTML = `<div class="small">Dragon</div>
    <div class="grid">
      <div class="card">
        <label>Phù văn B <input id="d_haveB" type="number" min="0" value="0"></label>
        <label>Phù văn A <input id="d_haveA" type="number" min="0" value="0"></label>
        <label>Phù văn SR <input id="d_haveSR" type="number" min="0" value="0"></label>
        <label>Phù văn SSR <input id="d_haveSSR" type="number" min="0" value="0"></label>
      </div>
      <div class="card">
        <label>Đồng <input id="d_lvlDong" type="number" min="0" value="0"></label>
        <label>Bạc <input id="d_lvlBac" type="number" min="0" value="0"></label>
        <label>Vàng <input id="d_lvlVang" type="number" min="0" value="0"></label>
        <label>Truyền Kỳ <input id="d_lvlTK" type="number" min="0" value="0"></label>
        <label>Level rồng <input id="d_lvlDragon" type="number" min="0" value="0"></label>
      </div>
    </div>
    <div class="controls"><button id="d_compute" class="primary">Tính</button></div>
    <div id="d_result" class="result" style="display:none"></div>`;

  document.getElementById('d_compute').addEventListener('click', async ()=>{
    const COST_B = 250, COST_A=125, COST_SR=66;
    const PT_B=70, PT_A=700, PT_SR=7000, PT_SSR=14000;
    let have = {B: Number(document.getElementById('d_haveB').value)||0, A: Number(document.getElementById('d_haveA').value)||0, SR: Number(document.getElementById('d_haveSR').value)||0, SSR: Number(document.getElementById('d_haveSSR').value)||0};
    let st = {dong: Number(document.getElementById('d_lvlDong').value)||0, bac: Number(document.getElementById('d_lvlBac').value)||0, vang: Number(document.getElementById('d_lvlVang').value)||0, tk: Number(document.getElementById('d_lvlTK').value)||0, dragon: Number(document.getElementById('d_lvlDragon').value)||0};
    const start = JSON.parse(JSON.stringify(st));
    let used={B:0,A:0,SR:0,SSR:0}, gain={dong:0,bac:0,vang:0,tk:0,dragon:0};

    function promote(){
      let c=true;
      while(c){
        c=false;
        if(st.dong>=5){ let x=Math.floor(st.dong/5); st.dong-=x*5; st.bac+=x; c=true; }
        if(st.bac>=4){ let x=Math.floor(st.bac/4); st.bac-=x*4; st.vang+=x; c=true; }
        if(st.vang>=5){ let x=Math.floor(st.vang/5); st.vang-=x*5; st.tk+=x; c=true; }
      }
    }
    promote();
    let progress=true;
    while(progress){
      progress=false;
      if(have.B>=COST_B){ have.B-=COST_B; used.B+=COST_B; st.dong++; gain.dong++; promote(); progress=true; continue; }
      if(have.A>=COST_A){ have.A-=COST_A; used.A+=COST_A; st.bac++; gain.bac++; promote(); progress=true; continue; }
      if(have.SR>=COST_SR){ have.SR-=COST_SR; used.SR+=COST_SR; st.vang++; gain.vang++; promote(); progress=true; continue; }
      let ssrCost = (st.dragon+1)*10;
      if(have.SSR>=ssrCost){ have.SSR-=ssrCost; used.SSR+=ssrCost; st.tk++; gain.tk++; st.dragon++; gain.dragon++; promote(); progress=true; continue; }
    }

    const pts = used.B*PT_B + used.A*PT_A + used.SR*PT_SR + used.SSR*PT_SSR;
    const out = document.getElementById('d_result');
    out.style.display='block';
    out.innerHTML = `<div>Đồng: ${start.dong} → ${start.dong+gain.dong}</div><div>Bạc: ${start.bac} → ${start.bac+gain.bac}</div><div>Vàng: ${start.vang} → ${start.vang+gain.vang}</div><div>Truyền Kỳ: ${start.tk} → ${start.tk+gain.tk}</div><div>Rồng: ${start.dragon} → ${start.dragon+gain.dragon}</div><hr><div>Tài nguyên dùng: B ${used.B}, A ${used.A}, SR ${used.SR}, SSR ${used.SSR}</div><div>Điểm tab: ${pts.toLocaleString()}</div>`;
    if(auth.currentUser){
      await db.collection('users').doc(auth.currentUser.uid).collection('tabs').doc('dragon').set({ lastPoints: pts, used, gain, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
      window.dispatchEvent(new Event('summary.refresh'));
    }
  });
});

