window.addEventListener("tab.open", async (e)=>{
  if(e.detail.id !== "phao") return;

  const container = document.getElementById("tab_phao");

  container.innerHTML = `
    <div class="small">Pháo: nhập tài nguyên</div>

    <label>Level pháo hiện tại:
      <input id="cannonLevel" type="number" min="0" value="0">
    </label>

    <label>Tài nguyên đá:
      <input id="stone" type="number" min="0" value="0">
    </label>

    <label>Tài nguyên gỗ:
      <input id="wood" type="number" min="0" value="0">
    </label>

    <label>Tài nguyên quặng:
      <input id="ore" type="number" min="0" value="0">
    </label>

    <label>Số hộp pháo:
      <input id="boxes" type="number" min="0" value="0">
    </label>

    <div id="targetInfo" class="result" style="display:none"></div>

    <div class="controls">
      <button id="btnCompute" class="primary">Tính</button>
    </div>

    <div id="output" class="result" style="display:none"></div>
  `;

  const user = auth.currentUser;

  // -------------------
  // TẢI MỤC TIÊU PHÁO
  // -------------------
  let targetLeft = null;
  let lastLevel  = null;
  const targetStart = 3000;

  let docRef = null;

  if(user){
    const isMinh = user.email?.toLowerCase().includes("minhlanne");

    if(isMinh){
      docRef = db.collection("users")
                 .doc(user.uid)
                 .collection("tabs")
                 .doc("cannon");

      const snap = await docRef.get();

      if(!snap.exists){
        await docRef.set({
          targetStart: 3000,
          targetLeft : 3000,
          lastLevel  : 0,
          lastPoints : 0,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        targetLeft = 3000;
        lastLevel  = 0;
      } else {
        const d = snap.data();
        targetLeft = d.targetLeft ?? 3000;
        lastLevel  = d.lastLevel ?? 0;
      }

      document.getElementById("targetInfo").style.display="block";
      document.getElementById("targetInfo").innerHTML = `
        <div>Mục tiêu: 3000</div>
        <div>Còn lại: ${targetLeft}</div>
        <div>Last level: ${lastLevel}</div>
      `;
    }
  }

  // -------------------
  // NÚT TÍNH
  // -------------------
  document.getElementById("btnCompute").onclick = async ()=>{
    const cannonLevel = Number(document.getElementById("cannonLevel").value)||0;
    const points = cannonLevel * 10;

    document.getElementById("output").style.display="block";
    document.getElementById("output").innerHTML =
      `<div>Điểm pháo: ${points.toLocaleString()}</div>`;

    if(user && docRef){
      let gained = 0;

      if(cannonLevel > lastLevel){
        gained = cannonLevel - lastLevel;
        targetLeft -= gained;
        if(targetLeft < 0) targetLeft = 0;
      }

      await docRef.set({
        targetStart,
        targetLeft,
        lastLevel: cannonLevel,
        lastPoints: points,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge:true});

      document.getElementById("targetInfo").innerHTML = `
        <div>Mục tiêu: 3000</div>
        <div>Đã tăng: ${gained}</div>
        <div>Còn lại: ${targetLeft}</div>
        <div>Level mới: ${cannonLevel}</div>
      `;
    }

    window.dispatchEvent(new Event("summary.refresh"));
  };
});
