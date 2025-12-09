window.addEventListener('tab.open', async (e)=>{
  if(e.detail.id !== 'phao') return;
  const container = document.getElementById('tab_phao');
  container.innerHTML = `
    <div class="small">Nhập tài nguyên</div>
    <label>Đá: <input id="stone" type="number" min="0" value="0"></label>
    <label>Gỗ: <input id="wood" type="number" min="0" value="0"></label>
    <label>Quặng: <input id="ore" type="number" min="0" value="0"></label>
    <label>Hộp pháo: <input id="boxes" type="number" min="0" value="0"></label>
    <label>Cấp mục tiêu: <input id="targetLevel" type="number" min="1" placeholder="Để trống nếu muốn tối đa"></label>
    <button id="btnCompute">Tính</button>
    <div id="output" class="result" style="visibility:hidden"></div>
  `;

  const user = auth.currentUser;
  if(!user) return;

  // Load dữ liệu nếu có
  const data = await loadTabData(user.uid, 'cannon');
  if(data){
    document.getElementById('stone').value = data.stone || 0;
    document.getElementById('wood').value = data.wood || 0;
    document.getElementById('ore').value = data.ore || 0;
    document.getElementById('boxes').value = data.boxes || 0;
    document.getElementById('targetLevel').value = data.targetLevel || '';
  }

  function toNum(id){
    let v = Number(document.getElementById(id).value);
    return (isNaN(v) || v<0) ? 0 : v;
  }

  function simulateOptimal(S, W, Q, B, lv){
    let stone=S, wood=W, ore=Q, box=B, log=[];
    const needStone = 1260*lv;
    const needWood = 340*lv;
    const needOre = 130*lv;

    let boxForOre = Math.min(box, needOre - ore);
    if(boxForOre>0){ log.push(`Dùng ${boxForOre} hộp → +${boxForOre} quặng`); ore+=boxForOre; box-=boxForOre; }
    let boxForWood = Math.min(box, Math.ceil((needWood - wood)/4));
    if(boxForWood>0){ log.push(`Dùng ${boxForWood} hộp → +${boxForWood*4} gỗ`); wood+=boxForWood*4; box-=boxForWood; }
    if(box>0){ log.push(`Dùng ${box} hộp → +${box*20} đá`); stone+=box; box=0; }

    while(true){
      let missOre = Math.max(0, needOre - ore);
      let missWood = Math.max(0, needWood - wood);

      let stoneToWood = Math.min(Math.floor(stone/5), missWood + missOre*4);
      if(stoneToWood>0){ log.push(`Đổi ${stoneToWood*5} đá → +${stoneToWood} gỗ`); stone-=stoneToWood*5; wood+=stoneToWood; }

      let woodToOre = Math.min(Math.floor(wood/4), missOre);
      if(woodToOre>0){ log.push(`Đổi ${woodToOre*4} gỗ → +${woodToOre} quặng`); wood-=woodToOre*4; ore+=woodToOre; }

      if(stoneToWood===0 && woodToOre===0) break;
    }

    let missStone = Math.max(0, needStone - stone);
    let missWood = Math.max(0, needWood - wood);
    let missOre = Math.max(0, needOre - ore);
    if(missStone>0 || missWood>0 || missOre>0) return {ok:false, missing:{stone:missStone, wood:missWood, ore:missOre}, log:log};

    stone -= needStone; wood -= needWood; ore -= needOre;
    return {ok:true, log, remaining:{stone, wood, ore}};
  }

  function computeMaxLv(S,W,Q,B){
    let lo=0, hi=20000, lastLog=[], lastRemaining=null;
    while(lo<hi){
      let mid = Math.floor((lo+hi+1)/2);
      let result = simulateOptimal(S,W,Q,B,mid);
      if(result.ok){ lo=mid; lastLog=result.log; lastRemaining=result.remaining; } 
      else { hi=mid-1; }
    }
    return {maxLv: lo, log: lastLog, remaining: lastRemaining};
  }

  async function compute(){
    let S = toNum('stone'), W = toNum('wood'), Q = toNum('ore'), B = toNum('boxes');
    let targetInput = document.getElementById('targetLevel').value.trim();
    const out = document.getElementById('output');
    out.style.visibility='visible';

    let target = targetInput!=="" ? Math.max(1, Number(targetInput)) : null;
    
    // Nếu là minhlanne -> thêm giới hạn 3000
    if(user.email==='minhlanne@dolvar.app'){
      if(!target || target>3000) target = 3000;
    }

    let result = target ? simulateOptimal(S,W,Q,B,target) : computeMaxLv(S,W,Q,B);

    if(result.ok){
      out.innerHTML=`<b>Có thể đạt cấp:</b> ${target || result.maxLv}<br>
        <b>Tổng điểm:</b> ${(target||result.maxLv)*556000}<br><br>
        <b>Các bước đổi:</b><br><pre>${result.log.join('\n')}</pre>
        <br><b>Còn lại:</b>
        <ul><li>Đá: ${result.remaining.stone}</li>
        <li>Gỗ: ${result.remaining.wood}</li>
        <li>Quặng: ${result.remaining.ore}</li></ul>`;
    } else {
      let miss = result.missing;
      out.innerHTML=`<b>Không đủ tài nguyên để đạt cấp ${target}</b><br>
        <b>Còn thiếu:</b>
        <ul><li>Đá: ${miss.stone}</li>
        <li>Gỗ: ${miss.wood}</li>
        <li>Quặng: ${miss.ore}</li></ul>`;
    }

    // Auto-save dữ liệu
    await saveTabData(user.uid, 'cannon', {
      stone: S, wood: W, ore: Q, boxes: B, targetLevel: target || null, log: result.log
    });
  }

  document.getElementById('btnCompute').addEventListener('click', compute);
});
