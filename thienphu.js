window.addEventListener("tab.open", (e)=>{
  if(e.detail.id !== "thienphu") return;

  const box = document.getElementById("tab_thienphu");

  box.innerHTML = `
    <div class="small">Thiên Phú</div>
    <label>Điểm nguyên liệu:
      <input id="tp_val" type="number" min="0" value="0">
    </label>
    <div class="controls"><button id="tp_compute" class="primary">Tính</button></div>
    <div id="tp_result" class="result" style="display:none"></div>
  `;

  document.getElementById("tp_compute").onclick = async ()=>{
    const v = Number(document.getElementById("tp_val").value)||0;
    const pts = v * 50;

    const r = document.getElementById("tp_result");
    r.style.display="block";
    r.innerHTML = `Điểm: ${pts.toLocaleString()}`;

    if(auth.currentUser){
      await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("tabs")
        .doc("thienphu")
        .set({
          lastPoints: pts,
          val: v,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});

      window.dispatchEvent(new Event("summary.refresh"));
    }
  };
});
