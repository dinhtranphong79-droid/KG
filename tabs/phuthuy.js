import { db, auth } from "../firebase.js";

const container = document.getElementById("tab_phuthuy"); // Hoặc "tab_witch" nếu bạn đổi tên container

// --- Render HTML ---
function renderHTML() {
  container.innerHTML = `
    <div class="container">
      <h2>Phù Thủy</h2>
      <div class="inputs">
        <label>Thuốc thử ánh sáng: <input type="number" id="witch_thuocThu" value="0" min="0"></label>
        <label>Thuốc tăng cường: <input type="number" id="witch_thuocTangCuong" value="0" min="0"></label>
        <label>Thuốc may mắn: <input type="number" id="witch_thuocMayMan" value="0" min="0"></label>
      </div>
      <div class="container" id="witch_tContainer"></div>
      <button id="witch_btnCompute">Tính điểm và nâng tối ưu</button>
      <div class="summary" id="witch_summary">
        <h2>Bảng tổng kết</h2>
        <p id="witch_summaryDetail"></p>
        <h3>Nâng từng bụi</h3>
        <ul id="witch_suggestList"></ul>
      </div>
    </div>
  `;
}

// --- Constants ---
const TData = {
  T1: {boost: 30, luck: 5}, T2: {boost: 90, luck: 20}, T3: {boost: 430, luck: 80},
  T4: {boost: 2110, luck: 400}, T5: {boost: 10530, luck: 2000}, T6: {boost: 52640, luck: 10000},
  T7: {boost: 263160, luck: 50000}, T8: {boost: 1315790, luck: 250000}, T9: {boost: 6578950, luck: 1250000}
};
const buoiColors = [
  {name:"Xanh Dương", class:"xanh-duong"},
  {name:"Đỏ", class:"do"},
  {name:"Xanh Ngọc", class:"xanh-ngoc"},
  {name:"Tím", class:"tim"},
  {name:"Vàng", class:"vang"},
  {name:"Xanh Lá", class:"xanh-la"}
];
const MAX_LEVEL = 20;

let state = { 
  thuocThu: 0, 
  thuocTangCuong: 0, 
  thuocMayMan: 0, 
  buoiLevels: {} // { "T1-Xanh Dương": 0, "T1-Đỏ": 0, ... }
};

// --- Render Bụi ---
function renderBuoi(){
  const tContainer = container.querySelector("#witch_tContainer");
  tContainer.innerHTML = "";
  for (let t in TData){
    const tCard = document.createElement("div");
    tCard.className = "t-card";
    tCard.innerHTML = `<h3>${t}</h3>`;
    buoiColors.forEach(b=>{
      const key = `${t}-${b.name}`;
      const buoiDiv = document.createElement("div");
      buoiDiv.className = `buoi ${b.class} ${state.buoiLevels[key] > 0 ? "active" : ""}`;
      buoiDiv.innerHTML = `
        <label>
          <input type="checkbox" class="witch-checkbox-buoi" data-key="${key}" ${state.buoiLevels[key]>0 ? "checked":""}>
          ${b.name}
        </label>
        <input type="number" class="witch-input-level" data-key="${key}" value="${state.buoiLevels[key] || 0}" min="0" max="${MAX_LEVEL}" ${state.buoiLevels[key]>0?"":"disabled"}>
      `;
      tCard.appendChild(buoiDiv);
    });
    tContainer.appendChild(tCard);
  }

  // Event checkbox
  tContainer.querySelectorAll(".witch-checkbox-buoi").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      const key = cb.dataset.key;
      const input = tContainer.querySelector(`.witch-input-level[data-key="${key}"]`);
      input.disabled = !cb.checked;
      if(!cb.checked) input.value = 0;
      tContainer.querySelector(`.buoi.${key.split('-')[1].toLowerCase()}`).classList.toggle("active", cb.checked);
      saveState();
    });
  });

  // Event input
  tContainer.querySelectorAll(".witch-input-level").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const key = inp.dataset.key;
      state.buoiLevels[key] = Math.min(MAX_LEVEL, Math.max(0, Number(inp.value)||0));
      saveState();
    });
  });
}

// --- Compute ---
function tinhToan(){
  const thuocThu = Number(container.querySelector("#witch_thuocThu").value||0);
  const thuocTangCuong = Number(container.querySelector("#witch_thuocTangCuong").value||0);
  const thuocMayMan = Number(container.querySelector("#witch_thuocMayMan").value||0);

  state.thuocThu = thuocThu;
  state.thuocTangCuong = thuocTangCuong;
  state.thuocMayMan = thuocMayMan;
  saveState();

  let totalTCUsed=0, totalMMUsed=0;
  const suggestList = [];

  const inputs = container.querySelectorAll(".witch-input-level");
  inputs.forEach(inp=>{
    const key = inp.dataset.key;
    const cb = container.querySelector(`.witch-checkbox-buoi[data-key="${key}"]`);
    if(!cb.checked) return;

    let level = Math.min(MAX_LEVEL, Number(inp.value)||0);
    const [t] = key.split("-");
    const boost = TData[t].boost;
    const luck = TData[t].luck;

    const tcNeeded = boost*level;
    totalTCUsed += Math.min(tcNeeded, thuocTangCuong);

    let mmUsed = 0;
    if(level>=10){
      mmUsed = luck*(level-9);
      totalMMUsed += Math.min(mmUsed, thuocMayMan);
    }

    // Gợi ý nâng tối đa
    let maxExtraLevel = 0, tempTC=thuocTangCuong, tempMM=thuocMayMan;
    for(let l = level+1; l <= MAX_LEVEL; l++){
      const tcReq = boost, mmReq = l>=10?luck:0;
      if(tcReq<=tempTC && mmReq<=tempMM){ tempTC-=tcReq; tempMM-=mmReq; maxExtraLevel++; }
      else break;
    }
    const suggestedLevel = level + maxExtraLevel;
    suggestList.push(`${t} - ${key.split('-')[1]}: hiện tại ${level} → gợi ý nâng tối đa ${suggestedLevel}`);
  });

  const diemTC = Math.round(totalTCUsed*2.8);
  const diemMM = Math.round(totalMMUsed*28);
  const diemThu = Math.round(thuocThu*70);
  const tongDiem = diemTC+diemMM+diemThu;

  container.querySelector("#witch_summaryDetail").innerHTML = `
    Thuốc tăng cường: ${diemTC} điểm<br>
    Thuốc may mắn: ${diemMM} điểm<br>
    Thuốc thử ánh sáng: ${diemThu} điểm<br>
    <b>Tổng điểm: ${tongDiem}</b>
  `;

  const ul = container.querySelector("#witch_suggestList");
  ul.innerHTML = "";
  suggestList.forEach(item=>{
    const li=document.createElement("li");
    li.textContent=item;
    ul.appendChild(li);
  });
}

// --- Firestore ---
export function getState(){
  return state;
}

export function setState(data){
  if(!data) return;
  state = data;
}

export async function loadState(){
  const user = auth.currentUser;
  if(!user) return;
  const docRef = await db.collection("users").doc(user.uid).collection("modules").doc("witch").get();
  if(docRef.exists) setState(docRef.data());
  renderBuoi();
}

export async function saveState(){
  const user = auth.currentUser;
  if(!user) return;
  await db.collection("users").doc(user.uid).collection("modules").doc("witch").set(state);
}

// --- Events ---
renderHTML();
container.querySelector("#witch_btnCompute").addEventListener("click", tinhToan);
container.querySelectorAll("#witch_thuocThu, #witch_thuocTangCuong, #witch_thuocMayMan").forEach(inp=>{
  inp.addEventListener("input", saveState);
});

renderBuoi();
