import { db, auth } from "../firebase.js"; // Firebase Firestore + Auth

const container = document.getElementById('tab_phao');

function renderHTML() {
  container.innerHTML = `
    <div class="container">
      <h2>Level Pháo</h2>
      <div class="input-group"><label>Đá</label><input id="phao_stone" type="number" value="0" min="0"></div>
      <div class="input-group"><label>Gỗ</label><input id="phao_wood" type="number" value="0" min="0"></div>
      <div class="input-group"><label>Quặng</label><input id="phao_ore" type="number" value="0" min="0"></div>
      <div class="input-group"><label>Hộp pháo</label><input id="phao_boxes" type="number" value="0" min="0"></div>
      <div class="input-group"><label>Cấp mục tiêu</label><input id="phao_targetLevel" type="number" placeholder="Để trống nếu muốn tính cấp tối đa" min="1"></div>
      <button id="phao_btnCompute">Tính</button>
      <div id="phao_output" class="result" style="visibility:hidden"></div>
    </div>
  `;
}

// --- Các hàm xử lý gốc ---
function toNum(id){
  const v = Number(container.querySelector(id).value);
  return (isNaN(v) || v < 0) ? 0 : v;
}

function simulateOptimal(S, W, Q, B, lv){
  let stone=S, wood=W, ore=Q, box=B, log=[];
  const needStone = 1260*lv;
  const needWood = 340*lv;
  const needOre = 130*lv;

  // Dùng hộp pháo tối ưu
  let boxForOre = Math.min(box, needOre - ore);
  if(boxForOre>0){ log.push(`Dùng ${boxForOre} hộp → +${boxForOre} quặng`); ore+=boxForOre; box-=boxForOre; }
  let boxForWood = Math.min(box, Math.ceil((needWood - wood)/4));
  if(boxForWood>0){ log.push(`Dùng ${boxForWood} hộp → +${boxForWood*4} gỗ`); wood+=boxForWood*4; box-=boxForWood; }
  if(box>0){ log.push(`Dùng ${box} hộp → +${box*20} đá`); stone+=box; box=0; }

  // Quy đổi đá→gỗ→quặng tối ưu
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
  if(missStone>0 || missWood>0 || missOre>0){ return {ok:false, missing:{stone:missStone, wood:missWood, ore:missOre}, log}; }

  stone-=needStone; wood-=needWood; ore-=needOre;
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
  return {maxLv: lo, log:lastLog, remaining:lastRemaining};
}

function compute(){
  const S = Number(container.querySelector('#phao_stone').value || 0);
  const W = Number(container.querySelector('#phao_wood').value || 0);
  const Q = Number(container.querySelector('#phao_ore').value || 0);
  const B = Number(container.querySelector('#phao_boxes').value || 0);
  const targetInput = container.querySelector('#phao_targetLevel').value.trim();
  const out = container.querySelector('#phao_output');
  out.style.visibility='visible';

  if(targetInput !== ""){
    let target = Math.max(1, Number(targetInput));
    const result = simulateOptimal(S,W,Q,B,target);
    if(result.ok){
      out.innerHTML=`<b>Có thể đạt cấp:</b> ${target}<br>
        <b>Tổng điểm:</b> ${target*556}<br><br>
        <b>Các bước đổi:</b><br><pre>${result.log.join('\n')}</pre><br>
        <b>Còn lại:</b><ul><li>Đá: ${result.remaining.stone}</li><li>Gỗ: ${result.remaining.wood}</li><li>Quặng: ${result.remaining.ore}</li></ul>`;
    } else {
      let miss = result.missing;
      out.innerHTML=`<b>Không đủ tài nguyên để đạt cấp ${target}</b><br>
        <b>Còn thiếu:</b><ul><li>Đá: ${miss.stone}</li><li>Gỗ: ${miss.wood}</li><li>Quặng: ${miss.ore}</li></ul>`;
    }
  } else {
    let res = computeMaxLv(S,W,Q,B);
    if(res.remaining){
      out.innerHTML=`<b>Cấp tối đa:</b> ${res.maxLv}<br>
        <b>Tổng điểm:</b> ${res.maxLv*556}<br><br>
        <b>Các bước đổi:</b><br><pre>${res.log.join('\n')}</pre><br>
        <b>Còn lại:</b><ul><li>Đá: ${res.remaining.stone}</li><li>Gỗ: ${res.remaining.wood}</li><li>Quặng: ${res.remaining.ore}</li></ul>`;
    } else {
      out.innerHTML=`<b>Không đủ tài nguyên để nâng cấp</b>`;
    }
  }
}

// --- Auto save + load Firestore ---
export function getState(){
  return {
    stone: Number(container.querySelector('#phao_stone').value || 0),
    wood: Number(container.querySelector('#phao_wood').value || 0),
    ore: Number(container.querySelector('#phao_ore').value || 0),
    boxes: Number(container.querySelector('#phao_boxes').value || 0),
    targetLevel: container.querySelector('#phao_targetLevel').value || ""
  };
}

export function setState(state){
  if(!state) return;
  container.querySelector('#phao_stone').value = state.stone || 0;
  container.querySelector('#phao_wood').value = state.wood || 0;
  container.querySelector('#phao_ore').value = state.ore || 0;
  container.querySelector('#phao_boxes').value = state.boxes || 0;
  container.querySelector('#phao_targetLevel').value = state.targetLevel || "";
}

export async function loadState(){
  const user = auth.currentUser;
  if(!user) return;
  const docRef = await db.collection('users').doc(user.uid).collection('modules').doc('phao').get();
  if(docRef.exists) setState(docRef.data());
}

export async function saveState(){
  const user = auth.currentUser;
  if(!user) return;
  await db.collection('users').doc(user.uid).collection('modules').doc('phao')
    .set(getState());
}

// --- Event listeners ---
renderHTML();
const btn = container.querySelector('#phao_btnCompute');
btn.addEventListener('click', compute);

// Auto save khi input thay đổi
container.querySelectorAll('input').forEach(input=>{
  input.addEventListener('input', saveState);
});
