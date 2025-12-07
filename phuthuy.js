window.addEventListener("tab.open", (e)=>{
  if(e.detail.id !== "phuthuy") return;

  const box = document.getElementById("tab_phuthuy");

  box.innerHTML = `
    <div class="small">Phù Thủy</div>

    <label>GM1:
      <input id="gm1" type="number" min="0" value="0">
    </label>

    <label>Thuốc:
      <input id="potion" type="number" min="0" value="0">
    </label>

    <div class="controls"><button id="ph_compute" class="primary">Tính</button></div>

    <div id="ph_result" class="result" style="display:none"></div>
  `;

  document.getElementById("ph_compute").onclick = async ()=>{
    const gm1 = Number(document.getElementById("gm1").value)||0;
    const p   = Number(document.getElementById("potion").value)||0;

    const gm2 = Math.floor(gm1/8);
    const pts = gm2*500 + p*100;

    const r = document.getElementById("ph_result");
    r.style.display="block";
    r.innerHTML = `
      GM2 tạo: ${gm2}<br>
      Điểm: ${pts.toLocaleString()}
    `;

    if(auth.currentUser){
      await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("tabs")
        .doc("phuthuy")
        .set({
          lastPoints: pts,
          gm1, potion:p, gm2,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});

      window.dispatchEvent(new Event("summary.refresh"));
    }
  };
});
