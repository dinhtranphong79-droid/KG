window.addEventListener('tab.open', async (e)=>{
  if(e.detail.id !== 'phao') return;

  const container = document.getElementById('tab_phao');

  container.innerHTML = `
    <div class="small">Pháo: nhập tài nguyên</div>

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

  const user = auth.currentUser;
  let targetLeft = null, lastLevel = null, targetStart = 3000;
  let docRef = null;

  // --- Khởi tạo dữ liệu Firestore minhlanne ---
  if(user && user.email?.toLowerCase().includes("minhlanne")){
    docRef = db.collection("users").doc(user.uid).collection("tabs").doc("cannon");
    const snap = await docRef.get();
    const targetInfo = document.getElementById("targetInfo");
    targetInfo.style.display = "block";

    if(!snap.exists){
      await docRef.set({
        targetStart: targetStart,
        targetLeft: targetStart,
        lastLevel: 0,
        lastPoints: 0,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
      targetLeft = targetStart;
      lastLevel = 0;
    } else {
      const d = snap.data();
      targetLeft = d.targetLeft ?? targetStart;
      lastLevel = d.lastLevel ?? 0;
    }

    targetInfo.innerHTML = `
      <div><b>Mục tiêu pháo:</b> ${targetStart}</div>
      <div><b>Còn lại:</b> ${targetLeft}</div>
      <div><b>Last level:</b> ${lastLevel}</div>
    `;
  }

  function toNum(id){
    let v = Number(document.getElementById(id).value);
    return (isNaN(v) || v<0) ? 0 : v;
  }

  // --- Simulate tối ưu
  function simulateOptimal(S,W,Q,B,lv){
    let stone=S, wood=W, ore=Q, box=B, log=[];
    const needStone=1260*lv, needWood=340*lv, needOre=130*lv;

    let boxForOre = Math.min(box, needOre-ore);
    if(boxForOre>0){ ore+=boxForOre; box-=boxForOre; log.push(`Dùng ${boxForOre} hộp → +${boxForOre} quặng`); }
    let boxForWood = Math.min(box, Math.ceil((needWood-wood)/4));
    if(boxForWood>0){ wood+=boxForWood*4; box-=boxForWood; log.push(`Dùng ${boxForWood} hộp → +${boxForWood*4} gỗ`); }
    if(box>0){ stone+=box*20; log.push(`Dùng ${box} hộp → +${box*20} đá`); box=0; }

    while(true){
      let missOre = Math.max(0, needOre-ore);
      let missWood = Math.max(0, needWood-wood);
      let stoneToWood = Math.min(Math.floor(stone/5), missWood+missOre*4);
      if(stoneToWood>0){ stone-=stoneToWood*5; wood+=stoneToWood; log.push(`Đổi ${stoneToWood*5} đá → +${stoneToWood} gỗ`); }
      let woodToOre = Math.min(Math.floor(wood/4), missOre);
      if(woodToOre>0){ wood-=woodToOre*4; ore+=woodToOre; log.push(`Đổi ${woodToOre*4} gỗ → +${woodToOre} quặng`); }
      if(stoneToWood===0 && woodToOre===0) break;
    }

    let missStone = Math.max(0, needStone-stone);
    let missWood = Math.max(0, needWood-wood);
    let missOre = Math.max(0, needOre-ore);
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

  // --- Xử lý click ---
  document.getElementById('btnCompute').addEventListener('click', async ()=>{
    const level = Number(document.getElementById('cannonLevel').value)||0;
    const S=toNum('stone'), W=toNum('wood'), Q=toNum('ore'), B=toNum('boxes');
    const targetInput=document.getElementById('targetLevel').value.trim();
    const out=document.getElementById('output'); out.style.display='block';

    let gained=0, finalLv=0;

    if(targetInput!==''){
      const t=Number(targetInput);
      const r=simulateOptimal(S,W,Q,B,t);
      if(r.ok){ gained=finalLv=t; out.innerHTML=`<b>Có thể đạt cấp:</b> ${t}<br><b>Tổng điểm:</b> ${t*556}<br><pre>${r.log.join('\n')}</pre><br>Còn lại: đá ${r.remaining.stone}, gỗ ${r.remaining.wood}, quặng ${r.remaining.ore}`; }
      else{ const m=r.missing; out.innerHTML=`⚠️ Thiếu: đá ${m.stone}, gỗ ${m.wood}, quặng ${m.ore}`; }
    } else {
      const r=computeMaxLv(S,W,Q,B);
      gained=finalLv=r.maxLv;
      out.innerHTML=`<b>Cấp tối đa:</b> ${r.maxLv}<br><b>Tổng điểm:</b> ${r.maxLv*556}<br><pre>${r.log.join('\n')}</pre>`;
      if(r.remaining) out.innerHTML+=`<br>Còn lại: đá ${r.remaining.stone}, gỗ ${r.remaining.wood}, quặng ${r.remaining.ore}`;
    }

    // --- Firestore minhlanne ---
    if(user && docRef){
      if(finalLv>lastLevel) gained=finalLv-lastLevel;
      targetLeft=Math.max(0,(targetLeft ?? targetStart)-gained);
      lastLevel=finalLv;

      await docRef.set({
        targetStart,
        targetLeft,
        lastLevel: finalLv,
        lastPoints: finalLv*556,
        updated: firebase.firestore.FieldValue.serverTimestamp()
      },{merge:true});

      document.getElementById("targetInfo").style.display="block";
      document.getElementById("targetInfo").innerHTML=`
        <div><b>Mục tiêu pháo:</b> ${targetStart}</div>
        <div><b>Đã tăng:</b> +${gained}</div>
        <div><b>Còn lại:</b> ${targetLeft}</div>
        <div><b>Level mới:</b> ${finalLv}</div>
      `;
    }

    window.dispatchEvent(new Event('summary.refresh'));
  });

});

