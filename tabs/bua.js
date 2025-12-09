window.addEventListener("tab.open", (e)=>{
  if(e.detail.id !== "bua") return;

  const box = document.getElementById("tab_bua");

  box.innerHTML = `
    <div class="small">Búa & Jennifer</div>

    <label>Số búa:
      <input id="m_hammer" type="number" min="0" value="0">
    </label>

    <label>Số Jennifer:
      <input id="m_jenn" type="number" min="0" value="0">
    </label>

    <div class="controls"><button id="m_compute" class="primary">Tính</button></div>

    <div id="m_result" class="result" style="display:none"></div>
  `;

  document.getElementById("m_compute").onclick = async ()=>{
    const h = Number(document.getElementById("m_hammer").value)||0;
    const j = Number(document.getElementById("m_jenn").value)||0;

    const pts = h*100 + j*1000;

    const r = document.getElementById("m_result");
    r.style.display="block";
    r.innerHTML = `Điểm: ${pts.toLocaleString()}`;

    if(auth.currentUser){
      await db.collection("users")
        .doc(auth.currentUser.uid)
        .collection("tabs")
        .doc("bua")
        .set({
          lastPoints: pts, h, j,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});

      window.dispatchEvent(new Event("summary.refresh"));
    }
  };
});
