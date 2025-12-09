// ----------------- tabs/cannon.js -----------------
(function(){

  function toNum(id){
    let v = Number(document.getElementById(id).value);
    return (isNaN(v) || v<0)?0:v;
  }

  // 🔥 GIỮ NGUYÊN LOGIC TÍNH
  function simulateOptimal(S,W,Q,B,lv){
    let stone=S, wood=W, ore=Q, box=B, log=[];
    const needStone=1260*lv, needWood=340*lv, needOre=130*lv;

    // 1️⃣ Dùng hộp pháo → quặng
    let boxForOre = Math.min(box, Math.max(0, needOre - ore));
    if(boxForOre>0){ ore+=boxForOre; box-=boxForOre; log.push(`Dùng ${boxForOre} hộp → +${boxForOre} quặng`); }

    // 2️⃣ Dùng hộp pháo → gỗ
    let boxForWood = Math.min(box, Math.ceil((needWood-wood)/4));
    if(boxForWood>0){ wood+=boxForWood*4; box-=boxForWood; log.push(`Dùng ${boxForWood} hộp → +${boxForWood*4} gỗ`); }

    // 3️⃣ Hộp còn → đá
    if(box>0){ stone+=box*20; log.push(`Dùng ${box} hộp → +${box*20} đá`); box=0; }

    // 4️⃣ Đổi đá → gỗ → quặng
    while(true){
      let missOre=Math.max(0, needOre-ore);
      let missWood=Math.max(0, needWood-wood);
      let stoneToWood = Math.min(Math.floor(stone/5), missWood + missOre*4);
      if(stoneToWood>0){ stone-=stoneToWood*5; wood+=stoneToWood; log.push(`Đổi ${stoneToWood*5} đá → +${stoneToWood} gỗ`); }
      let woodToOre = Math.min(Math.floor(wood/4), missOre);
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
    let lo=0, hi=20000, lastLog=[], lastRemain=null;
    while(lo<hi){
      let mid = Math.floor((lo+hi+1)/2);
      let r = simulateOptimal(S,W,Q,B,mid);
      if(r.ok){ lo=mid; lastLog=r.log; lastRemain=r.remaining; }
      else hi=mid-1;
    }
    return {maxLv:lo, log:lastLog, remaining:lastRemain};
  }

  // 🔥 Firestore mục tiêu minhlanne
  async function applyCannonGoal(user,gained){
    if(!user || !user.email.toLowerCase().includes("minhlanne@dolvar.app")) return;
    const ref = db.collection("users").doc(user.uid);
    const snap = await ref.get();
    let data = snap.exists? snap.data(): {};
    let base = data.targetCannon || 3000;
    let remaining = Math.max(0, (data.remainingTarget ?? 3000)-gained);
    await ref.set({targetCannon:base, remainingTarget:remaining, lastCannonAdd:gained, updated:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    return remaining;
  }

  async function loadUserData(user){
    if(!user) return {};
    const doc = await db.collection('users').doc(user.uid).collection('tabs').doc('cannon').get();
    return doc.exists? doc.data(): {};
  }

  async function renderCannonTab(){
    const user = auth.currentUser;
    const saved = await loadUserData(user);
    const el = document.getElementById('tab_phao');
    if(!el) return;

    el.innerHTML = `
      <div class="cannon">
        <h2>Level Pháo</h2>
        <label>Đá<input id="stone" type="number" value="${saved.stone ?? 0}" min="0"></label>
        <label>Gỗ<input id="wood" type="number" value="${saved.wood ?? 0}" min="0"></label>
        <label>Quặng<input id="ore" type="number" value="${saved.ore ?? 0}" min="0"></label>
        <label>Hộp pháo<input id="boxes" type="number" value="${saved.boxes ?? 0}" min="0"></label>
        <label>Cấp mục tiêu<input id="targetLevel" type="number" value="${saved.targetLevel ?? ''}" placeholder="Để trống → MAX"></label>
        <button id="btnCompute">Tính</button>
        <div id="goal" class="goal"></div>
        <pre id="output" class="out"></pre>
      </div>

      <style>
        .cannon{max-width:460px;margin:auto;background:white;padding:18px;border-radius:12px;}
        label{display:flex;flex-direction:column;margin-bottom:10px;font-weight:600;}
        input{padding:8px;border-radius:6px;border:1px solid #bbb;}
        button{width:100%;padding:10px;background:#2563eb;color:white;border:none;border-radius:6px;margin-top:10px;}
        .goal{background:#fff3c4;padding:10px;border-radius:8px;margin-top:10px;display:none;}
        .out{background:#f4f4f4;padding:12px;border-radius:8px;margin-top:14px;white-space:pre-wrap;display:none;}
      </style>
    `;

    const out = document.getElementById('output');
    const goalUI = document.getElementById('goal');

    document.getElementById('btnCompute').onclick = async ()=>{
      const S=toNum('stone'), W=toNum('wood'), Q=toNum('ore'), B=toNum('boxes');
      const targetRaw = document.getElementById('targetLevel').value.trim();
      let gained=0, finalLv=0;

      if(targetRaw!==''){
        const t = Number(targetRaw);
        const r = simulateOptimal(S,W,Q,B,t);
        if(r.ok){ gained=finalLv=t; out.innerHTML=`Cấp đạt: ${t}\nĐiểm: ${t*556}\n\n${r.log.join('\n')}\n\nCòn lại: đá ${r.remaining.stone}, gỗ ${r.remaining.wood}, quặng ${r.remaining.ore}`; }
        else{ const m=r.missing; out.innerHTML=`⚠️ Thiếu: đá ${m.stone}, gỗ ${m.wood}, quặng ${m.ore}`; }
      } else{
        const r = computeMaxLv(S,W,Q,B);
        gained=finalLv=r.maxLv;
        out.innerHTML=`Cấp tối đa: ${r.maxLv}\nĐiểm: ${r.maxLv*556000}\n\n${r.log.join('\n')}`;
      }
      out.style.display='block';

      if(user){
        await db.collection('users').doc(user.uid).collection('tabs').doc('cannon').set({
          stone:S, wood:W, ore:Q, boxes:B, targetLevel:targetRaw,
          lastLevel:finalLv, points:finalLv*556,
          updated:firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});

        const remaining = await applyCannonGoal(user,gained);
        if(remaining!==undefined){ goalUI.style.display='block'; goalUI.innerHTML=`🎯 Mục tiêu còn lại: <b>${remaining}</b>`; }
        window.dispatchEvent(new Event('summary.refresh'));
      }
    };
  }

  window.addEventListener('tab.open', e=>{ if(e.detail.id==='phao') renderCannonTab(); });
  document.addEventListener('DOMContentLoaded', ()=>{ window.dispatchEvent(new CustomEvent('tab.open',{detail:{id:'phao'}})); });

})();

