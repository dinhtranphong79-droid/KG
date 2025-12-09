window.addEventListener('tab.open', async (e)=>{
  if(e.detail.id !== 'phao') return;

  const container = document.getElementById('tab_phao');

  // --- Render HTML ---
  container.innerHTML = `
    <div class="small">Nhập tài nguyên</div>

    <label>Đá:
      <input id="stone" type="number" min="0" value="0">
    </label>

    <label>Gỗ:
      <input id="wood" type="number" min="0" value="0">
    </label>

    <label>Quặng:
      <input id="ore" type="number" min="0" value="0">
    </label>

    <label>Số hộp pháo:
      <input id="boxes" type="number" min="0" value="0">
    </label>

    <label>Cấp mục tiêu:
      <input id="targetLevel" type="number" min="0" placeholder="Để trống = max">
    </label>

    <div id="targetInfo" class="result" style="display:none"></div>

    <div class="controls">
      <button id="btnCompute" class="primary">Tính</button>
    </div>

    <div id="output" class="result" style="display:none"></div>
  `;

  const targetInfo = container.querySelector('#targetInfo');
  const output = container.querySelector('#output');
  const btnCompute = container.querySelector('#btnCompute');

  // --- localStorage để tự lưu dữ liệu ---
  const LS_KEY = 'cannon_tab_state';
  let state = {cannonLevel:0, stone:0, wood:0, ore:0, boxes:0};

  function saveState(){
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }
  function loadState(){
    const d = localStorage.getItem(LS_KEY);
    if(d) state = JSON.parse(d);
    container.querySelector('#cannonLevel').value = state.cannonLevel;
    container.querySelector('#stone').value = state.stone;
    container.querySelector('#wood').value = state.wood;
    container.querySelector('#ore').value = state.ore;
    container.querySelector('#boxes').value = state.boxes;
  }
  loadState();

  function toNum(id){
    return Math.max(0, Math.floor(Number(container.querySelector(`#${id}`).value)||0));
  }

  function simulateOptimal(S,W,Q,B,lv){
    let stone=S, wood=W, ore=Q, box=B, log=[];
    const needStone=1260*lv, needWood=340*lv, needOre=130*lv;

    let boxForOre = Math.min(box, needOre-ore);
    if(boxForOre>0){ ore+=boxForOre; box-=boxForOre; log.push(`Dùng ${boxForOre} hộp → +${boxForOre} quặng`); }
    let boxForWood = Math.min(box, Math.ceil((needWood-wood)/4));
    if(boxForWood>0){ wood+=boxForWood*4; box-=boxForWood; log.push(`Dùng ${boxForWood} hộp → +${boxForWood*4} gỗ`); }
    if(box>0){ stone+=box*20; log.push(`Dùng ${box} hộp → +${box*20} đá`); box=0; }

    while(true){
      let missOre=Math.max(0, needOre-ore);
      let missWood=Math.max(0, needWood-wood);
      let stoneToWood=Math.min(Math.floor(stone/5), missWood+missOre*4);
      if(stoneToWood>0){ stone-=stoneToWood*5; wood+=stoneToWood; log.push(`Đổi ${stoneToWood*5} đá → +${stoneToWood} gỗ`); }
      let woodToOre=Math.min(Math.floor(wood/4), missOre);
      if(woodToOre>0){ wood-=woodToOre*4; ore+=woodToOre; log.push(`Đổi ${woodToOre*4} gỗ → +${woodToOre} quặng`); }
      if(stoneToWood===0 && woodToOre===0) break;
    }

    let missStone=Math.max(0, needStone-stone);
    let missWood=Math.max(0, needWood-wood);
    let missOre=Math.max(0, needOre-ore);
    if(missStone>0 || missWood>0 || missOre>0) return {ok:false, missing:{stone:missStone, wood:missWood, ore:missOre}, log};
    stone-=needStone; wood-=needWood; ore-=needOre;
    return {ok:true, log, remaining:{stone, wood, ore}};
  }

  function computeMaxLv(S,W,Q,B){
    let lo=0, hi=20000, lastLog=[], lastRemaining=null;
    while(lo<hi){
      let mid=Math.floor((lo+hi+1)/2);
      let r=simulateOptimal(S,W,Q,B,mid);
      if(r.ok){ lo=mid; lastLog=r.log; lastRemaining=r.remaining; } else hi=mid-1;
    }
    return {maxLv:lo, log:lastLog, remaining:lastRemaining};
  }

  // --- Firestore minhlanne ---
  const isMinhlanne = user?.email?.toLowerCase().includes("minhlanne");
  let targetStart = 3000, lastLevel = 0, targetLeft = targetStart;
  let docRef = null;
  if(isMinhlanne){
    docRef = db.collection("users").doc(user.uid).collection('tabs').doc('cannon');
    const snap = await docRef.get();
    if(snap.exists){
      const d = snap.data();
      lastLevel = d.lastLevel ?? 0;
      targetLeft = d.targetLeft ?? targetStart;
    } else {
      await docRef.set({
        targetStart,
        targetLeft: targetStart,
        lastLevel: 0,
        lastPoints:0,
        updated: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    targetInfo.style.display = "block";
    targetInfo.innerHTML = `<div><b>Mục tiêu pháo:</b> ${targetStart}</div>
                            <div><b>Còn lại:</b> ${targetLeft}</div>
                            <div><b>Last level:</b> ${lastLevel}</div>`;
  }

  // --- Gắn sự kiện Tính ---
  btnCompute.addEventListener('click', async ()=>{
    state.cannonLevel = toNum('cannonLevel');
    state.stone = toNum('stone');
    state.wood = toNum('wood');
    state.ore = toNum('ore');
    state.boxes = toNum('boxes');
    saveState(); // lưu localStorage

    const targetInput = container.querySelector('#targetLevel').value.trim();
    let gained=0, finalLv=0;

    let outHtml = "";
    if(targetInput!==''){
      const t = Number(targetInput);
      const r = simulateOptimal(state.stone, state.wood, state.ore, state.boxes, t);
      if(r.ok){ finalLv=t; gained=finalLv-lastLevel; outHtml=`<b>Có thể đạt cấp:</b> ${t}<br><b>Tổng điểm:</b> ${t*556}<br><pre>${r.log.join('\n')}</pre>`; }
      else { const m=r.missing; outHtml=`⚠️ Thiếu: đá ${m.stone}, gỗ ${m.wood}, quặng ${m.ore}`; }
    } else {
      const r = computeMaxLv(state.stone, state.wood, state.ore, state.boxes);
      finalLv=r.maxLv;
      gained = finalLv-lastLevel;
      outHtml=`<b>Cấp tối đa:</b> ${r.maxLv}<br><b>Tổng điểm:</b> ${r.maxLv*556000}<br><pre>${r.log.join('\n')}</pre>`;
      if(r.remaining) outHtml+=`<br>Còn lại: đá ${r.remaining.stone}, gỗ ${r.remaining.wood}, quặng ${r.remaining.ore}`;
    }
    output.style.display="block";
    output.innerHTML = outHtml;

    // Firestore minhlanne
    if(isMinhlanne && docRef){
      targetLeft = Math.max(0, targetLeft - gained);
      lastLevel = finalLv;

      await docRef.set({
        targetStart,
        targetLeft,
        lastLevel,
        lastPoints: finalLv*556000,
        updated: firebase.firestore.FieldValue.serverTimestamp()
      },{merge:true});

      targetInfo.innerHTML = `<div><b>Mục tiêu pháo:</b> ${targetStart}</div>
                              <div><b>Đã tăng:</b> +${gained}</div>
                              <div><b>Còn lại:</b> ${targetLeft}</div>
                              <div><b>Level mới:</b> ${finalLv}</div>`;
    }

    window.dispatchEvent(new Event('summary.refresh'));
  });
});
