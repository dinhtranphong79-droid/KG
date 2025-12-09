import { db, auth } from "../firebase.js";

const container = document.getElementById("tab_rong");

function renderHTML() {
  container.innerHTML = `
    <div class="wrap">
      <h2>Rồng</h2>
      <div class="grid">
        <div class="card">
          <h3>Tài nguyên</h3>
          <div>
            <label>Phù văn B <input type="number" id="haveB" min="0" value="0"></label>
            <label>Phù văn A <input type="number" id="haveA" min="0" value="0"></label>
            <label>Phù văn SR <input type="number" id="haveSR" min="0" value="0"></label>
            <label>Phù văn SSR <input type="number" id="haveSSR" min="0" value="0"></label>
          </div>
        </div>
        <div class="card">
          <h3>Level hiện tại</h3>
          <div>
            <label>Đồng <input type="number" id="lvlDong" min="0" value="0"></label>
            <label>Bạc <input type="number" id="lvlBac" min="0" value="0"></label>
            <label>Vàng <input type="number" id="lvlVang" min="0" value="0"></label>
            <label>Truyền Kỳ <input type="number" id="lvlTK" min="0" value="0"></label>
            <label>Level rồng <input type="number" id="lvlDragon" min="0" value="0"></label>
          </div>
        </div>
      </div>
      <div class="controls">
        <button id="compute" class="btn">Tính tối ưu</button>
        <button id="reset" class="secondary">Đặt lại</button>
        <div style="flex:1"></div>
        <div class="small">Điểm: B=70, A=700, SR=7000, SSR=14000</div>
      </div>
      <div id="resultArea" class="result" style="display:none">
        <h3>Kết quả</h3>
        <div class="summary">
          <div class="box">
            <div class="small">Level trước → sau</div>
            <table>
              <tr><td>Đồng</td><td class="right" id="startDong"></td><td class="right" id="endDong"></td></tr>
              <tr><td>Bạc</td><td class="right" id="startBac"></td><td class="right" id="endBac"></td></tr>
              <tr><td>Vàng</td><td class="right" id="startVang"></td><td class="right" id="endVang"></td></tr>
              <tr><td>Truyền Kỳ</td><td class="right" id="startTK"></td><td class="right" id="endTK"></td></tr>
              <tr><td>Level rồng</td><td class="right" id="startDragon"></td><td class="right" id="endDragon"></td></tr>
            </table>
          </div>
          <div class="box">
            <div class="small">Tài nguyên dùng / còn</div>
            <table>
              <tr><td>B</td><td class="right" id="usedB"></td><td class="right" id="leftB"></td></tr>
              <tr><td>A</td><td class="right" id="usedA"></td><td class="right" id="leftA"></td></tr>
              <tr><td>SR</td><td class="right" id="usedSR"></td><td class="right" id="leftSR"></td></tr>
              <tr><td>SSR</td><td class="right" id="usedSSR"></td><td class="right" id="leftSSR"></td></tr>
            </table>
          </div>
          <div class="box">
            <div class="small">Điểm</div>
            <table>
              <tr><td>B</td><td class="right" id="ptsB"></td></tr>
              <tr><td>A</td><td class="right" id="ptsA"></td></tr>
              <tr><td>SR</td><td class="right" id="ptsSR"></td></tr>
              <tr><td>SSR</td><td class="right" id="ptsSSR"></td></tr>
              <tr><td><b>Tổng</b></td><td class="right" id="ptsTotal"></td></tr>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- Logic ---
function computeValues(){
  const COST_B  = 250, COST_A  = 125, COST_SR = 66;
  const PT_B = 70, PT_A = 700, PT_SR = 7000, PT_SSR = 14000;

  const el = id => container.querySelector("#"+id);
  const parse = inp => Math.max(0, Number(inp.value)||0);
  const fmt = n => Number(n).toLocaleString("vi-VN");

  let have = {
    B: parse(el("haveB")),
    A: parse(el("haveA")),
    SR: parse(el("haveSR")),
    SSR: parse(el("haveSSR"))
  };

  let st = {
    dong: parse(el("lvlDong")),
    bac: parse(el("lvlBac")),
    vang: parse(el("lvlVang")),
    tk: parse(el("lvlTK")),
    dragon: parse(el("lvlDragon"))
  };

  let start = JSON.parse(JSON.stringify(st));
  let used = {B:0,A:0,SR:0,SSR:0};
  let gain = {dong:0,bac:0,vang:0,tk:0,dragon:0};

  function promote(){
    let c=true;
    while(c){
      c=false;
      if(st.dong>=5){ let x=Math.floor(st.dong/5); st.dong-=x*5; st.bac+=x; c=true; }
      if(st.bac>=4){ let x=Math.floor(st.bac/4); st.bac-=x*4; st.vang+=x; c=true; }
      if(st.vang>=5){ let x=Math.floor(st.vang/5); st.vang-=x*5; st.tk+=x; c=true; }
    }
  }
  promote();

  let go=true;
  while(go){
    go=false;
    if(have.B>=COST_B){ have.B-=COST_B; used.B+=COST_B; st.dong++; gain.dong++; promote(); go=true; continue; }
    if(have.A>=COST_A){ have.A-=COST_A; used.A+=COST_A; st.bac++; gain.bac++; promote(); go=true; continue; }
    if(have.SR>=COST_SR){ have.SR-=COST_SR; used.SR+=COST_SR; st.vang++; gain.vang++; promote(); go=true; continue; }
    let costSSR = (st.dragon+1)*10;
    if(have.SSR>=costSSR){ have.SSR-=costSSR; used.SSR+=costSSR; st.tk++; gain.tk++; st.dragon++; gain.dragon++; promote(); go=true; continue; }
  }

  container.querySelector("#resultArea").style.display="block";

  el("startDong").textContent=fmt(start.dong);
  el("startBac").textContent=fmt(start.bac);
  el("startVang").textContent=fmt(start.vang);
  el("startTK").textContent=fmt(start.tk);
  el("startDragon").textContent=fmt(start.dragon);

  el("endDong").textContent=fmt(start.dong+gain.dong);
  el("endBac").textContent=fmt(start.bac+gain.bac);
  el("endVang").textContent=fmt(start.vang+gain.vang);
  el("endTK").textContent=fmt(start.tk+gain.tk);
  el("endDragon").textContent=fmt(start.dragon+gain.dragon);

  el("usedB").textContent=fmt(used.B);
  el("usedA").textContent=fmt(used.A);
  el("usedSR").textContent=fmt(used.SR);
  el("usedSSR").textContent=fmt(used.SSR);

  el("leftB").textContent=fmt(have.B);
  el("leftA").textContent=fmt(have.A);
  el("leftSR").textContent=fmt(have.SR);
  el("leftSSR").textContent=fmt(have.SSR);

  el("ptsB").textContent=fmt(used.B*PT_B);
  el("ptsA").textContent=fmt(used.A*PT_A);
  el("ptsSR").textContent=fmt(used.SR*PT_SR);
  el("ptsSSR").textContent=fmt(used.SSR*PT_SSR);
  el("ptsTotal").textContent=fmt(used.B*PT_B + used.A*PT_A + used.SR*PT_SR + used.SSR*PT_SSR);
}

// --- Firestore ---
export function getState(){
  const el = id => container.querySelector("#"+id);
  return {
    haveB: Number(el("haveB").value||0),
    haveA: Number(el("haveA").value||0),
    haveSR: Number(el("haveSR").value||0),
    haveSSR: Number(el("haveSSR").value||0),
    lvlDong: Number(el("lvlDong").value||0),
    lvlBac: Number(el("lvlBac").value||0),
    lvlVang: Number(el("lvlVang").value||0),
    lvlTK: Number(el("lvlTK").value||0),
    lvlDragon: Number(el("lvlDragon").value||0)
  };
}

export function setState(state){
  if(!state) return;
  const el = id => container.querySelector("#"+id);
  el("haveB").value = state.haveB||0;
  el("haveA").value = state.haveA||0;
  el("haveSR").value = state.haveSR||0;
  el("haveSSR").value = state.haveSSR||0;
  el("lvlDong").value = state.lvlDong||0;
  el("lvlBac").value = state.lvlBac||0;
  el("lvlVang").value = state.lvlVang||0;
  el("lvlTK").value = state.lvlTK||0;
  el("lvlDragon").value = state.lvlDragon||0;
}

export async function loadState(){
  const user = auth.currentUser;
  if(!user) return;
  const docRef = await db.collection("users").doc(user.uid).collection("modules").doc("dragon").get();
  if(docRef.exists) setState(docRef.data());
}

export async function saveState(){
  const user = auth.currentUser;
  if(!user) return;
  await db.collection("users").doc(user.uid).collection("modules").doc("dragon").set(getState());
}

// --- Event listeners ---
renderHTML();
const el = id => container.querySelector("#"+id);

el("compute").addEventListener("click", computeValues);
el("reset").addEventListener("click", ()=>{
  ["haveB","haveA","haveSR","haveSSR","lvlDong","lvlBac","lvlVang","lvlTK","lvlDragon"]
    .forEach(id=>el(id).value=0);
  container.querySelector("#resultArea").style.display="none";
  saveState();
});
["haveB","haveA","haveSR","haveSSR","lvlDong","lvlBac","lvlVang","lvlTK","lvlDragon"]
  .forEach(id=>el(id).addEventListener("input", saveState));
