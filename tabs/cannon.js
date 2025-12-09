window.addEventListener('tab.open', async (e)=>{
  if(e.detail.id !== 'phao') return;

  const container = document.getElementById('tab_phao');

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

  // ------------------------------
  // 1) TẢI MỤC TIÊU PHÁO TỪ FIRESTORE
  // ------------------------------
  let targetLeft = null;
  let lastLevel = null;
  let targetStart = 3000;      // chỉ dành cho minhlannè

  let docRef = null;

  if (user) {
    // Kiểm tra có phải email minhlanne hay không
    const isMinhlanne =
      user.email?.toLowerCase().includes("minhlanne");

    if (isMinhlanne) {
      docRef = db.collection("users")
                 .doc(user.uid)
                 .collection("tabs")
                 .doc("cannon");

      const snap = await docRef.get();

      if (!snap.exists) {
        // Lần đầu: tạo dữ liệu mặc định
        await docRef.set({
          targetStart: 3000,
          targetLeft: 3000,
          lastLevel: 0,
          lastPoints: 0,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        targetLeft = 3000;
        lastLevel = 0;
      } else {
        const d = snap.data();
        targetLeft = d.targetLeft ?? 3000;
        lastLevel = d.lastLevel ?? 0;
      }

      document.getElementById("targetInfo").style.display = "block";
      document.getElementById("targetInfo").innerHTML = `
        <div><b>Mục tiêu pháo:</b> ${targetStart}</div>
        <div><b>Còn lại:</b> ${targetLeft}</div>
        <div><b>Last level:</b> ${lastLevel}</div>
      `;
    }
  }

  // ------------------------------
  // 2) NÚT TÍNH
  // ------------------------------
  document.getElementById('btnCompute').addEventListener('click', async ()=>{

    const cannonLevel = Number(document.getElementById('cannonLevel').value)||0;

    // Logic tính thử (placeholder)
    const points = cannonLevel * 10;

    let out = document.getElementById("output");
    out.style.display = "block";
    out.innerHTML = `<div>Điểm pháo: ${points.toLocaleString()}</div>`;

    // ------------------------------
    // 3) CHỈ minhlannè mới trừ mục tiêu
    // ------------------------------
    if (user && docRef) {

      let gained = 0;

      if (cannonLevel > lastLevel) {
        gained = cannonLevel - lastLevel;
        targetLeft = targetLeft - gained;

        if (targetLeft < 0) targetLeft = 0;
      }

      // LƯU LẠI FIRESTORE
      await docRef.set({
        targetStart,
        targetLeft,
        lastLevel: cannonLevel,
        lastPoints: points,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge:true});

      document.getElementById("targetInfo").innerHTML = `
        <div><b>Mục tiêu pháo:</b> ${targetStart}</div>
        <div><b>Đã tăng:</b> +${gained}</div>
        <div><b>Còn lại:</b> ${targetLeft}</div>
        <div><b>Level mới:</b> ${cannonLevel}</div>
      `;
    }

    window.dispatchEvent(new Event('summary.refresh'));
  });

});
