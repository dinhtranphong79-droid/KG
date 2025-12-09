// tabs/cannon.js
(function(){

  function toNum(id){
    let v = Number(document.getElementById(id).value);
    return (isNaN(v) || v<0) ? 0 : v;
  }

  // ------------- LOGIC TÍNH ----------------
  function simulateOptimal(S, W, Q, B, lv){
    let stone=S, wood=W, ore=Q, box=B, log=[];
    const needStone = 1260*lv, needWood = 340*lv, needOre = 130*lv;

    let boxForOre = Math.min(box, Math.max(0, needOre - ore));
    if(boxForOre>0){
      ore += boxForOre;
      box -= boxForOre;
      log.push(`Dùng ${boxForOre} hộp pháo → +${boxForOre} quặng`);
    }

    while(true){
      let needMoreWood = Math.max(0, needWood - wood);
      let woodChange = Math.min(Math.floor(stone/4), needMoreWood);
      if(woodChange>0){
        stone -= woodChange*4; wood += woodChange;
        log.push(`Đổi ${woodChange*4} đá → ${woodChange} gỗ`);
      }

      let needMoreOre = Math.max(0, needOre - ore);
      let oreChange = Math.min(Math.floor(wood/4), needMoreOre);
      if(oreChange>0){
        wood -= oreChange*4; ore += oreChange;
        log.push(`Đổi ${oreChange*4} gỗ → ${oreChange} quặng`);
      }

      if(woodChange===0 && oreChange===0) break;
    }

    let missStone = needStone - stone, missWood = needWood - wood, missOre = needOre - ore;
    if(missStone>0 || missWood>0 || missOre>0)
      return {ok:false, missing:{stone:missStone, wood:missWood, ore:missOre}, log};

    return {
      ok:true, 
      log, 
      remaining:{ stone:stone-needStone, wood:wood-needWood, ore:ore-needOre }
    };
  }

  function computeMaxLv(S,W,Q,B){
    let lo=0, hi=20000, lastLog=null, lastRemain=null;
    while(lo<hi){
      let mid=Math.floor((lo+hi+1)/2);
      let r = simulateOptimal(S,W,Q,B,mid);
      if(r.ok){ lo=mid; lastLog=r.log; lastRemain=r.remaining; }
      else hi=mid-1;
    }
    return {maxLv:lo, log:lastLog, remaining:lastRemain};
  }

  // ----------- MỤC TIÊU MINHLANNE -------------
  async function applyCannonGoal(user,gainedLv){
    if(!user || !user.email.toLowerCase().includes("minhlanne")) return;

    const ref = db.collection("users").doc(user.uid);
    const snap = await ref.get();
    let d = snap.exists? snap.data(): {};

    let target = d.targetCannon || 3000;
    let remaining = Math.max(0, (d.remainingTarget ?? 3000) - gainedLv);

    await ref.set({
      targetCannon: target,
      remainingTarget: remaining,
      lastCannonAdded: gainedLv,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true});

    return remaining;
  }

  // ----------- LOAD DỮ LIỆU NGƯỜI DÙNG -------------
  async function loadSavedInputs(user){
    if(!user) return {};
    let doc = await db.collection("users")
      .doc(user.uid)
      .collection("tabs")
      .doc("cannon")
      .get();
    return doc.exists ? doc.data() : {};
  }

  // ----------- UI TAB ----------------
  window.addEventListener("tab.open", async (e)=>{
    if(e.detail.id!=="phao") return;
    
    const user = auth.currentUser;
    const saved = await loadSavedInputs(user);

    const container=document.getElementById("tab_phao");
    container.innerHTML=`
      <div class="cannon-container">
        <h2>Level Pháo</h2>
        <div class="input-column">
          <label>Đá<input id="stone" type="number" value="${saved.stone ?? 0}"></label>
          <label>Gỗ<input id="wood" type="number" value="${saved.wood ?? 0}"></label>
          <label>Quặng<input id="ore" type="number" value="${saved.ore ?? 0}"></label>
          <label>Hộp pháo<input id="boxes" type="number" value="${saved.boxes ?? 0}"></label>
          <label>Cấp mục tiêu<input id="targetLevel" type="number" value="${saved.targetLevel ?? ""}" placeholder="Để trống = max"></label>
        </div>
        <button class="primary" id="btnCompute">Tính</button>

        <div id="goalOutput" class="result" style="display:none;background:#fff7d6"></div>
        <div id="output" class="result" style="display:none"></div>
      </div>

      <style>
        .cannon-container{padding:20px;background:#fff;border-radius:12px;max-width:480px;margin:auto;}
        .input-column{display:flex;flex-direction:column;gap:12px;margin-bottom:16px;}
        label{font-weight:600;color:#333;display:flex;flex-direction:column;}
        input{padding:8px;border-radius:8px;border:1px solid #ccc;font-size:14px;}
        button.primary{width:100%;padding:12px;background:#4a90e2;color:white;border:none;border-radius:8px;margin-bottom:15px;font-size:16px;cursor:pointer;transition:0.2s;}
        button.primary:hover{background:#3571d3;}
        .result{padding:12px;border:1px solid #ddd;border-radius:8px;margin-top:12px;white-space:pre-wrap;font-size:14px;}
      </style>
    `;

    const goalBox=document.getElementById("goalOutput");

    // 🔥 nếu là minhlanne → load mục tiêu ngay
    if(user && user.email.toLowerCase().includes("minhlanne")){
      let userDoc=await db.collection("users").doc(user.uid).get();
      if(userDoc.exists){
        let d=userDoc.data();
        if(d.remainingTarget!==undefined){
          goalBox.style.display="block";
          goalBox.innerHTML=`🎯 <b>Mục tiêu pháo</b><br>Ban đầu: ${d.targetCannon}<br><b>Còn lại: ${d.remainingTarget}</b>`;
        }
      }
    }

    document.getElementById("btnCompute").addEventListener("click", async ()=>{
      const S=toNum("stone"),W=toNum("wood"),Q=toNum("ore"),B=toNum("boxes");
      const targetRaw=document.getElementById("targetLevel").value.trim();
      const out=document.getElementById("output");
      
      let gainedLv=0,finalLv=0;

      if(targetRaw!==""){
        let t=Number(targetRaw);
        let r=simulateOptimal(S,W,Q,B,t);
        if(r.ok){
          gainedLv=t; finalLv=t;
          out.innerHTML=`Cấp đạt được: ${t}\nĐiểm: ${t*556}\n\nCác bước đổi:\n${r.log.join("\n")}\n\nCòn lại:\n- Đá: ${r.remaining.stone}\n- Gỗ: ${r.remaining.wood}\n- Quặng: ${r.remaining.ore}`;
        } else {
          out.innerHTML=`❌ Thiếu tài nguyên để đạt cấp ${t}\nCòn thiếu:\n- Đá: ${r.missing.stone}\n- Gỗ: ${r.missing.wood}\n- Quặng: ${r.missing.ore}`;
        }
      } else {
        let r=computeMaxLv(S,W,Q,B);
        gainedLv=r.maxLv; finalLv=r.maxLv;
        out.innerHTML=`Cấp tối đa: ${r.maxLv}\nĐiểm: ${r.maxLv*556}\n\nCác bước đổi:\n${r.log.join("\n")}\n\nCòn lại:\n- Đá: ${r.remaining.stone}\n- Gỗ: ${r.remaining.wood}\n- Quặng: ${r.remaining.ore}`;
      }

      out.style.display="block";
      
      if(user){
        // lưu input + kết quả vào Firestore
        await db.collection("users").doc(user.uid).collection("tabs").doc("cannon").set({
          stone:S, wood:W, ore:Q, boxes:B, targetLevel:targetRaw,
          lastComputedLevel:finalLv,
          lastPoints:finalLv*556,
          lastUpdated:firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});

        const remaining=await applyCannonGoal(user,gainedLv);

        if(remaining!==undefined){
          goalBox.style.display="block";
          goalBox.innerHTML=`🎯 <b>Mục tiêu pháo</b><br>Tăng: +${gainedLv}<br><b>Còn lại: ${remaining}</b>`;
        }

        window.dispatchEvent(new Event("summary.refresh"));
      }
    });

  });

})();
