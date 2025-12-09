window.addEventListener('tab.open', async (e)=>{
  if(e.detail.id !== 'thienphu') return;
  const container = document.getElementById('tab_thienphu');
  container.innerHTML = `<div class="small">Thiên Phú - nhập điểm</div>
    <label>Số điểm thiên phú: <input id="tp_val" type="number" min="0" value="0"></label>
    <div class="controls"><button id="tp_compute" class="primary">Tính</button></div>
    <div id="tp_result" class="result" style="display:none"></div>`;
  document.getElementById('tp_compute').addEventListener('click', async ()=>{
    const v = Number(document.getElementById('tp_val').value)||0;
    const pts = v*50;
    document.getElementById('tp_result').style.display='block';
    document.getElementById('tp_result').innerHTML = `<div>Điểm TP: ${pts.toLocaleString()}</div>`;
    if(auth.currentUser){
      await db.collection('users').doc(auth.currentUser.uid).collection('tabs').doc('thienphu').set({ lastPoints: pts, lastVal: v, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
      window.dispatchEvent(new Event('summary.refresh'));
    }
  });
});
