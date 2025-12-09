import { db, auth } from "../firebase.js";

const container = document.getElementById("tab_bua");

function renderHTML() {
  container.innerHTML = `
    <div class="wrap">
      <h2>Búa & Jennifer</h2>
      <p class="lead">Nhập số lượng Búa và Jennifer - 1 Búa = 100 điểm, 1 Jennifer = 1000 điểm.</p>
      <div class="row">
        <div class="col">
          <label for="bua_hammers">Búa</label>
          <input id="bua_hammers" type="number" min="0" value="0">
        </div>
        <div class="col">
          <label for="bua_jennifers">Jennifer</label>
          <input id="bua_jennifers" type="number" min="0" value="0">
        </div>
      </div>
      <div class="controls">
        <button id="bua_calcBtn" class="btn">Tính</button>
        <button id="bua_clearBtn" class="clear">Đặt lại</button>
      </div>
      <div id="bua_error" class="error" style="display:none"></div>
      <div id="bua_result" class="result-card" style="display:none">
        <table>
          <thead>
            <tr>
              <th>Loại</th>
              <th>Số lượng</th>
              <th>Điểm mỗi cái</th>
              <th>Tổng điểm</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Búa</td>
              <td class="value" id="bua_out-hammers">0</td>
              <td class="value">100</td>
              <td class="value" id="bua_out-hammer-points">0</td>
            </tr>
            <tr>
              <td>Jennifer</td>
              <td class="value" id="bua_out-jennifers">0</td>
              <td class="value">1000</td>
              <td class="value" id="bua_out-jennifer-points">0</td>
            </tr>
            <tr class="total">
              <td><b>Tổng</b></td>
              <td></td>
              <td></td>
              <td class="value" id="bua_out-total">0</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// --- Constants ---
const POINT_PER_HAMMER = 100;
const POINT_PER_JENNIFER = 1000;

// --- State ---
let state = {
  hammers: 0,
  jennifers: 0
};

// --- Compute ---
function fmt(n){ return Number(n).toLocaleString('vi-VN'); }

function parseNonNegInt(v){ 
  const n = Math.floor(Number(v)||0); 
  return n>=0 ? n : 0; 
}

function showError(msg){
  const err = container.querySelector("#bua_error");
  err.style.display="block";
  err.textContent = msg;
}

function clearError(){
  const err = container.querySelector("#bua_error");
  err.style.display="none";
  err.textContent = "";
}

function compute(){
  clearError();
  const hInput = container.querySelector("#bua_hammers");
  const jInput = container.querySelector("#bua_jennifers");
  let h = parseNonNegInt(hInput.value);
  let j = parseNonNegInt(jInput.value);

  state.hammers = h;
  state.jennifers = j;
  saveState();

  const hammerPoints = h * POINT_PER_HAMMER;
  const jenniferPoints = j * POINT_PER_JENNIFER;
  const total = hammerPoints + jenniferPoints;

  container.querySelector("#bua_out-hammers").textContent = fmt(h);
  container.querySelector("#bua_out-jennifers").textContent = fmt(j);
  container.querySelector("#bua_out-hammer-points").textContent = fmt(hammerPoints);
  container.querySelector("#bua_out-jennifer-points").textContent = fmt(jenniferPoints);
  container.querySelector("#bua_out-total").textContent = fmt(total);
  container.querySelector("#bua_result").style.display = "block";
}

// --- Firestore ---
export function getState(){ return state; }

export function setState(s){
  if(!s) return;
  state = s;
  container.querySelector("#bua_hammers").value = state.hammers || 0;
  container.querySelector("#bua_jennifers").value = state.jennifers || 0;
}

export async function loadState(){
  const user = auth.currentUser;
  if(!user) return;
  const docRef = await db.collection("users").doc(user.uid).collection("modules").doc("bua").get();
  if(docRef.exists) setState(docRef.data());
}

export async function saveState(){
  const user = auth.currentUser;
  if(!user) return;
  await db.collection("users").doc(user.uid).collection("modules").doc("bua").set(state);
}

// --- Event listeners ---
renderHTML();

const hInput = container.querySelector("#bua_hammers");
const jInput = container.querySelector("#bua_jennifers");

container.querySelector("#bua_calcBtn").addEventListener("click", compute);
container.querySelector("#bua_clearBtn").addEventListener("click", ()=>{
  state.hammers = 0; state.jennifers = 0;
  hInput.value = 0; jInput.value = 0;
  clearError();
  container.querySelector("#bua_result").style.display = "none";
  saveState();
});

// Enter cũng tính
[hInput,jInput].forEach(inp=>{
  inp.addEventListener("keydown", e=>{
    if(e.key==='Enter'){ compute(); e.preventDefault(); }
  });
});

// Auto save khi thay đổi
[hInput,jInput].forEach(inp=>{
  inp.addEventListener("input", saveState);
});
