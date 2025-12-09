window.addEventListener('tab.open', async (e)=>{
  if(e.detail.id !== 'phuthuy') return;
  const container = document.getElementById('tab_phuthuy');
  container.innerHTML = `<div class="small">Phù Thủy - GM & thuốc</div>
    <label>GM1 số lượng: <input id="gm1" type="number" min="0" value="0"></label>
    <label>Thuốc tăng cường: <input id="potion" type="number" min="0" value="0"></label>
    <div class="controls"><button id="ph_compute" class="primary">Tính</button></div>
    <div id="ph_result" class="result" style="display:none"></div>`;
  document.getElementById('ph_compute').addEventListener('click', async ()=>{
    const gm1 = Number(document.getElementById('gm1').value)||0;
    const potion = Number(document.getElementById('potion').value)||0;
    const gm2 = Math.floor(gm1/8);
    const pts = potion*100 + gm2*500;
    document.getElementById('ph_result').style.display='block';
    document.getElementById('ph_result').innerHTML = `<div>GM2 tạo: ${gm2}</div><div>Điểm: ${pts.toLocaleString()}</div>`;
    if(auth.currentUser){
      await db.collection('users').doc(auth.currentUser.uid).collection('tabs').doc('phuthuy').set({ lastPoints: pts, gm1, potion, gm2, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
      window.dispatchEvent(new Event('summary.refresh'));
    }
  });
});
