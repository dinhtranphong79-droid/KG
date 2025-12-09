// tabs/cannon.js
(function(){
  // --- Chuyển input sang số ---
  function toNum(id){
    let v = Number(document.getElementById(id).value);
    return (isNaN(v) || v<0) ? 0 : v;
  }

  // --- Logic tính tối ưu ---
  function simulateOptimal(S, W, Q, B, lv){
    let stone=S, wood=W, ore=Q, box=B, log=[];
    const needStone = 1260*lv;
    const needWood  = 340*lv;
    const needOre   = 130*lv;

    let boxForOre = Math.min(box, Math.max(0, needOre - ore));
    if(boxForOre > 0){
      ore += boxForOre;
      box -= boxForOre;
      log.push(`Dùng ${boxForOre} hộp pháo → +${boxForOre} quặng`);
    }

    while(true){
      let needMoreWood = Math.max(0, needWood - wood);
      let woodFromStone = Math.min(Math.floor(stone/4), needMoreWood);
      if(woodFromStone>0){
        stone -= woodFromStone*4; wood += woodFromStone;
        log.push(`Đổi ${woodFromStone*4} đá → ${woodFromStone} gỗ`);
      }

      let needMoreOre = Math.max(0, needOre - ore);
      let oreFromWood = Math.min(Math.floor(wood/4), needMoreOre);
      if(oreFromWood>0){
        wood -= oreFromWood*4; ore += oreFromWood;
        log.push(`Đổi ${oreFromWood*4} gỗ → ${oreFromWood} quặng`);
      }

      if(woodFromStone === 0 && oreFromWood === 0) break;
    }

    let missStone = Math.max(0, needStone - stone);
    let missWood  = Math.max(0, needWood - wood);
    let missOre   = Math.max(0, needOre - ore);

    if(missStone>0 || missWood>0 || missOre>0){
      return {ok:false, missing:{stone:missStone, wood:missWood, ore:missOre}, log};
    }

    stone -= needStone;
    wood  -= needWood;
    ore   -= needOre;

    return {ok:true, log, remaining:{stone, wood, ore}};
  }

  function computeMaxLv(S,W,Q,B){
    let lo=0, hi=20000, lastLog=[], lastRemaining=null;
    while(lo<hi){
      let mid = Math.floor((lo+hi+1)/2);
      let result = simulateOptimal(S,W,Q,B,mid);
      if(result.ok){
        lo = mid;
        lastLog = result.log;
        lastRemaining = result.remaining;
      } else {
        hi = mid-1;
      }
    }
    return {maxLv: lo, log: lastLog, remaining: lastRemaining};
  }

  // --- Mục tiêu pháo riêng minhlanne ---
  async function applyCannonGoal(user, gainedLv){
    const uid = user.uid;
    const email = user.email;
    if (!email || !email.toLowerCase().includes("minhlanne")) return;

    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();
    let data = snap.exists ? snap.data() : {};

    let target = data.targetCannon || 3000;
    let remaining = data.remainingTarget || 3000;
    remaining = Math.max(0, remaining - gainedLv);

    await ref.set({
      targetCannon: target,
      remainingTarget: remaining,
      lastCannonAdded: gainedLv,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true});

    return remaining;
  }

  // --- Giao diện tab ---
  window.addEventListener('tab.open', (e)=>{
    if(e.detail.id !== 'phao') return;
    const container = document.getElementById('tab_phao');
    container.innerHTML = `
      <div class="cannon-container">
        <h2>Level Pháo</h2>
        <div class="input-grid">
          <label>Đá <input id="stone" type="number" min="0" value="0"></label>
          <label>Gỗ <input id="wood" type="number" min="0" value="0"></label>
          <label>Quặng <input id="ore" type="number" min="0" value="0"></label>
          <label>Hộp pháo <input id="boxes" type="number" min="0" value="0"></label>
          <label>Cấp mục tiêu <input id="targetLevel" type="number" min="1" value="" placeholder="Để trống = max"></label>
        </div>
        <div class="controls"><button id="btnCompute" class="primary">Tính</button></div>
        <div id="output" class="result" style="display:none"></div>
        <div id="goalOutput" class="result" style="display:none;background:#fff3d4"></div>
      </div>

      <style>
        .cannon-container { background:#f9f9f9; padding:20px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1); max-width:700px; margin:auto; }
        .cannon-container h2 { margin-bottom:16px; text-align:center; color:#1f2937; }
        .input-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:12px; margin-bottom:16px; }
        .input-grid label { display:flex; flex-direction:column; font-weight:500; color:#374151; }
        .input-grid input { padding:8px 10px; border-radius:8px; border:1px solid #d1d5db; font-size:14px; }
        .controls { text-align:center; margin-bottom:16px; }
        .controls button.primary { padding:10px 20px; font-size:16px; border:none; border-radius:8px; background:#3b82f6; color:white; cursor:pointer; transition:0.2s; }
        .controls button.primary:hover { background:#2563eb; }
        .result { background:white; padding:14px; border-radius:8px; border:1px solid #e5e7eb; margin-bottom:12px; line-height:1.5; white-space:pre-wrap; }
        #goalOutput { border-left:4px solid #f59e0b; }
      </style>
    `;

    document.getElementById('btnCompute').addEventListener('click', async ()=>{
      const S = toNum('stone'), W = toNum('wood'), Q = toNum('ore'), B = toNum('boxes');
      const out = document.getElementById('output');
      const goalOut = document.getElementById('goalOutput');
      out.style.display='block';

      let gainedLv = 0, finalLv = 0;
      const targetRaw = document.getElementById('targetLevel').value.trim();

      if(targetRaw !== ""){
        const target = Math.max(1, Number(targetRaw));
        const result = simulateOptimal(S,W,Q,B,target);
        if(result.ok){
          gainedLv = target; finalLv = target;
          out.innerHTML = `<b>Có thể đạt cấp:</b> ${target}<br><b>Tổng điểm:</b> ${target*556}<br><pre class="log">${result.log.join('\n')}</pre><div>Còn lại: Đá ${result.remaining.stone}, Gỗ ${result.remaining.wood}, Quặng ${result.remaining.ore}</div>`;
        } else {
          const miss = result.missing;
          out.innerHTML = `<b>Không đủ tài nguyên để đạt cấp ${target}</b><br>Còn thiếu: Đá ${miss.stone}, Gỗ ${miss.wood}, Quặng ${miss.ore}`;
        }
      } else {
        const res = computeMaxLv(S,W,Q,B);
        gainedLv = res.maxLv; finalLv = res.maxLv;
        if(res.remaining){
          out.innerHTML = `<b>Cấp tối đa:</b> ${res.maxLv}<br><b>Tổng điểm:</b> ${res.maxLv*556}<br><pre class="log">${res.log.join('\n')}</pre><div>Còn lại: Đá ${res.remaining.stone}, Gỗ ${res.remaining.wood}, Quặng ${res.remaining.ore}</div>`;
        } else {
          out.innerHTML = `<b>Không đủ tài nguyên để nâng cấp</b>`;
        }
      }

      // --- Lưu dữ liệu vào Firestore ---
      if(auth.currentUser){
        try{
          await db.collection('users')
            .doc(auth.currentUser.uid)
            .collection('tabs')
            .doc('cannon')
            .set({
              lastComputedLevel: finalLv,
              lastPoints: finalLv*556,
              lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, {merge:true});

          const remaining = await applyCannonGoal(auth.currentUser, gainedLv);
          if(remaining !== undefined){
            goalOut.style.display='block';
            goalOut.innerHTML = `<b>MỤC TIÊU PHÁO (dành riêng cho acc minhlanne)</b><br>Mục tiêu ban đầu: 3000<br>Lần này tăng: ${gainedLv}<br><b>Mục tiêu còn lại: ${remaining}</b>`;
          }

          window.dispatchEvent(new Event("summary.refresh"));
        }catch(e){ console.error(e); }
      }
    });
  });

  document.addEventListener('DOMContentLoaded', ()=>{
    window.dispatchEvent(new CustomEvent('tab.open', { detail: { id: 'phao' } }));
  });

})();
