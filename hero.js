window.addEventListener('tab.open',(e)=>{
  if(e.detail.id !== 'hero') return;
  const container = document.getElementById('tab_hero');
  container.innerHTML = `<div class="small">Hero — tính điểm tướng (mẫu)</div>
    <label>Số hero SSR <input id="h_ssr" type="number" min="0" value="0"></label>
    <label>Số hero SR <input id="h_sr" type="number" min="0" value="0"></label>
    <div class="controls"><button id="h_compute" class="primary">Tính</button></div>
    <div id="h_result" class="result" style="display:none"></div>`;
  document.getElementById('h_compute').addEventListener('click', async ()=>{
    const ssr = Number(document.getElementById('h_ssr').value)||0;
    const sr = Number(document.getElementById('h_sr').value)||0;
    const pts = ssr*1000 + sr*200;
    document.getElementById('h_result').style.display='block';
    document.getElementById('h_result').innerHTML = `<div>Điểm Hero: ${pts.toLocaleString()}</div>`;
    if(auth.currentUser){
      await db.collection('users').doc(auth.currentUser.uid).collection('tabs').doc('hero').set({ lastPoints: pts, ssr, sr, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
      window.dispatchEvent(new Event('summary.refresh'));
    }
  });
});
