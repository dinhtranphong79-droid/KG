// cannon.js
window.addEventListener('tab.open', async (e)=>{
  if(e.detail.id !== 'phao') return; // chỉ chạy khi tab phao được chọn

  const container = document.getElementById('tab_phao');
  if(!container) return;

  // Render HTML qua JS
  container.innerHTML = `
    <h2>Level pháo</h2>
    <div class="input-group"><label>Đá</label><input type="number" id="stone" value="0" min="0"></div>
    <div class="input-group"><label>Gỗ</label><input type="number" id="wood" value="0" min="0"></div>
    <div class="input-group"><label>Quặng</label><input type="number" id="ore" value="0" min="0"></div>
    <div class="input-group"><label>Hộp pháo</label><input type="number" id="boxes" value="0" min="0"></div>
    <div class="input-group"><label>Cấp mục tiêu</label><input type="number" id="targetLevel" value="" min="1" placeholder="Để trống = max"></div>
    <button id="btnCompute">Tính</button>
    <div id="output" class="result" style="visibility:hidden"></div>
  `;

  // --- Selector scope trong container ---
  const stone = container.querySelector('#stone');
  const wood  = container.querySelector('#wood');
  const ore   = container.querySelector('#ore');
  const boxes = container.querySelector('#boxes');
  const targetLevel = container.querySelector('#targetLevel');
  const btnCompute = container.querySelector('#btnCompute');
  const output = container.querySelector('#output');

  const toNum = (el) => {
    const v = Number(el.value);
    return isNaN(v) || v<0 ? 0 : v;
  }

  // --- Logic tính toán ---
  function simulateOptimal(S, W, Q, B, lv){
    let stone=S, wood=W, ore=Q, box=B, log=[];
    const needStone = 1260*lv;
    const needWood = 340*lv;
    const needOre = 130*lv;

    let boxForOre = Math.min(box, needOre - ore);
    if(boxForOre>0){ log.push(`Dùng ${boxForOre} hộp → +${boxForOre} quặng`); ore += boxForOre; box -= boxForOre; }
    let boxForWood = Math.min(box, Math.ceil((needWood - wood)/4));
    if(boxForWood>0){ log.push(`Dùng ${boxForWood} hộp → +${boxForWood*4} gỗ`); wood += boxForWood*4; box -= boxForWood; }
    if(box>0){ log.push(`Dùng ${box} hộp → +${box*20} đá`); stone += box; box=0; }

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
    if(missStone>0 || missWood>0 || missOre>0) return {ok:false, missing:{stone:missStone, wood:missWood, ore:missOre}, log:log};

    stone -= needStone; wood -= needWood; ore -= needOre;
    return {ok:true, log, remaining:{stone, wood, ore}};
  }

  function computeMaxLv(S,W,Q,B){
    let lo=0, hi=20000, lastLog=[], lastRemaining=null;
    while(lo<hi){
      let mid = Math.floor((lo+hi+1)/2);
      let result = simulateOptimal(S,W,Q,B,mid);
      if(result.ok){ lo = mid; lastLog = result.log; lastRemaining = result.remaining; }
      else hi = mid-1;
    }
    return {maxLv: lo, log: lastLog, remaining: lastRemaining};
  }

  // --- Xử lý click ---
  function compute(){
    const S = toNum(stone);
    const W = toNum(wood);
    const Q = toNum(ore);
    const B = toNum(boxes);
    const targetInput = targetLevel.value.trim();
    output.style.visibility='visible';

    if(targetInput!==""){
      const target = Math.max(1, Number(targetInput));
      const result = simulateOptimal(S,W,Q,B,target);
      if(result.ok){
        output.innerHTML=`<b>Có thể đạt cấp:</b> ${target}<br>
        <b>Tổng điểm:</b> ${target*556000}<br><br>
        <b>Các bước đổi:</b><br><pre class="log">${result.log.join('\n')}</pre><br>
        <b>Còn lại:</b><br>
        <ul><li>Đá: ${result.remaining.stone}</li>
        <li>Gỗ: ${result.remaining.wood}</li>
        <li>Quặng: ${result.remaining.ore}</li></ul>`;
      } else {
        const miss = result.missing;
        output.innerHTML=`<b>Không đủ tài nguyên để đạt cấp ${target}</b><br>
        <b>Còn thiếu:</b><br>
        <ul><li>Đá: ${miss.stone}</li>
        <li>Gỗ: ${miss.wood}</li>
        <li>Quặng: ${miss.ore}</li></ul>`;
      }
    } else {
      const res = computeMaxLv(S,W,Q,B);
      if(res.remaining){
        output.innerHTML=`<b>Cấp tối đa:</b> ${res.maxLv}<br>
        <b>Tổng điểm:</b> ${res.maxLv*556}<br><br>
        <b>Các bước đổi:</b><br><pre class="log">${res.log.join('\n')}</pre><br>
        <b>Còn lại:</b><br>
        <ul><li>Đá: ${res.remaining.stone}</li>
        <li>Gỗ: ${res.remaining.wood}</li>
        <li>Quặng: ${res.remaining.ore}</li></ul>`;
      } else {
        output.innerHTML=`<b>Không đủ tài nguyên để nâng cấp</b>`;
      }
    }
  }

  btnCompute.addEventListener('click', compute);

});
