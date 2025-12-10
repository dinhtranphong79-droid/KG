window.addEventListener("tab.open", async (e) => {
  if (e.detail.id !== "phao") return;

  const container = document.getElementById("tab_phao");
  if (!container) return;

  /* ---- Render HTML ---- */
  container.innerHTML = `
    <h2 style="margin-bottom:20px;">Level pháo</h2>

    <div class="cannon-group"><label>Đá</label><input type="number" id="stone" min="0"></div>
    <div class="cannon-group"><label>Gỗ</label><input type="number" id="wood" min="0"></div>
    <div class="cannon-group"><label>Quặng</label><input type="number" id="ore" min="0"></div>
    <div class="cannon-group"><label>Hộp pháo</label><input type="number" id="boxes" min="0"></div>
    <div class="cannon-group"><label>Cấp mục tiêu</label><input type="number" id="targetLevel" min="1" placeholder="Để trống = max"></div>

    <button id="btnCompute">Tính</button>
    <div id="output" class="cannon-output"></div>
  `;

  /* ---- CSS đặt vào CSS file chính (style.css) ---- */
  // Không chèn <style> inline nữa – đây là lý do khiến nút không hoạt động!

  /* ---- Query Elements ---- */
  const stone = container.querySelector("#stone");
  const wood = container.querySelector("#wood");
  const ore = container.querySelector("#ore");
  const boxes = container.querySelector("#boxes");
  const targetLevel = container.querySelector("#targetLevel");
  const btnCompute = container.querySelector("#btnCompute");
  const output = container.querySelector("#output");

  /* ---- Đợi Auth ---- */
  let user = auth.currentUser;
  if (!user) {
    await new Promise(r => setTimeout(r, 100));
    user = auth.currentUser;
  }

  if (!user) {
    output.style.display = "block";
    output.innerText = "⚠ Bạn cần đăng nhập để dùng tab này.";
    btnCompute.disabled = true;
    return;
  }

  /* ---- Firestore ---- */
  const cannonRef = db
      .collection("users")
      .doc(user.uid)
      .collection("tabs")
      .doc("phao");

  const snap = await cannonRef.get();
  if (snap.exists) {
    const d = snap.data();
    stone.value = d.stone ?? 0;
    wood.value = d.wood ?? 0;
    ore.value = d.ore ?? 0;
    boxes.value = d.boxes ?? 0;
    targetLevel.value = d.targetLevel ?? "";
  }

  const toNum = (el) => Math.max(0, Number(el.value) || 0);

  /* ---- Logic giữ nguyên ---- */
  function simulateOptimal(S, W, Q, B, lv) {
    let stone=S, wood=W, ore=Q, box=B, log=[];

    const needStone = 1260 * lv;
    const needWood = 340 * lv;
    const needOre = 130 * lv;

    let boxForOre = Math.min(box, needOre - ore);
    if (boxForOre>0){ log.push(`Dùng ${boxForOre} hộp → +${boxForOre} quặng`); ore += boxForOre; box -= boxForOre; }

    let boxForWood = Math.min(box, Math.ceil((needWood - wood)/4));
    if (boxForWood>0){ log.push(`Dùng ${boxForWood} hộp → +${boxForWood*4} gỗ`); wood += boxForWood*4; box -= boxForWood; }

    if (box>0){ log.push(`Dùng ${box} hộp → +${box*20} đá`); stone += box; box=0; }

    while(true){
      let missOre = Math.max(0, needOre - ore);
      let missWood = Math.max(0, needWood - wood);

      let stoneToWood = Math.min(Math.floor(stone/5), missWood + missOre*4);
      if(stoneToWood>0){ log.push(`Đổi ${stoneToWood*5} đá → +${stoneToWood} gỗ`); stone -= stoneToWood*5; wood += stoneToWood; }

      let woodToOre = Math.min(Math.floor(wood/4), missOre);
      if(woodToOre>0){ log.push(`Đổi ${woodToOre*4} gỗ → +${woodToOre} quặng`); wood -= woodToOre*4; ore += woodToOre; }

      if(stoneToWood===0 && woodToOre===0) break;
    }

    let missStone = Math.max(0, needStone - stone);
    let missWood = Math.max(0, needWood - wood);
    let missOre = Math.max(0, needOre - ore);

    if (missStone||missWood||missOre)
      return {ok:false, missing:{stone:missStone, wood:missWood, ore:missOre}, log};

    stone -= needStone;
    wood -= needWood;
    ore -= needOre;

    return {ok:true, log, remaining:{stone, wood, ore}};
  }

  function computeMaxLv(S, W, Q, B) {
    let lo=0, hi=20000, best=null;
    while(lo<hi){
      let mid = Math.floor((lo+hi+1)/2);
      let r = simulateOptimal(S,W,Q,B,mid);
      if(r.ok){ lo=mid; best=r; }
      else hi=mid-1;
    }
    return {maxLv:lo, ...best};
  }

  /* ---- BUTTON CLICK (hoạt động 100%) ---- */
  btnCompute.addEventListener("click", async () => {
    const S = toNum(stone);
    const W = toNum(wood);
    const Q = toNum(ore);
    const B = toNum(boxes);
    const target = targetLevel.value.trim();

    let html = "";

    if (target !== "") {
      const lv = Math.max(1, Number(target));
      const r = simulateOptimal(S,W,Q,B,lv);
      if (r.ok) {
        html = `
🎯 Cấp đạt được: ${lv}
⭐ Tổng điểm: ${lv * 556000}

📌 Các bước đổi:
<pre class="log">${r.log.join("\n")}</pre>

📦 Còn lại:
Đá: ${r.remaining.stone}
Gỗ: ${r.remaining.wood}
Quặng: ${r.remaining.ore}`;
      } else {
        html = `
❌ Không đủ tài nguyên đạt cấp ${lv}

Thiếu:
Đá: ${r.missing.stone}
Gỗ: ${r.missing.wood}
Quặng: ${r.missing.ore}`;
      }
    } else {
      const r = computeMaxLv(S,W,Q,B);
      html = `
🔥 Cấp tối đa: ${r.maxLv}
⭐ Tổng điểm: ${r.maxLv * 556000}

📌 Các bước đổi:
<pre class="log">${r.log.join("\n")}</pre>

📦 Còn lại:
Đá: ${r.remaining.stone}
Gỗ: ${r.remaining.wood}
Quặng: ${r.remaining.ore}`;
    }

    output.style.display = "block";
    output.innerHTML = html;

    // SAVE to Firestore
    await cannonRef.set({
      stone: S,
      wood: W,
      ore: Q,
      boxes: B,
      targetLevel: target
    });
  });
});
