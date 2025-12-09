// --- Hằng điểm ---
const POINT_PER_HAMMER = 100;
const POINT_PER_JENNIFER = 1000;

// --- DOM ---
const hammersInput = document.getElementById('hammers');
const jennifersInput = document.getElementById('jennifers');
const calcBtn = document.getElementById('calcBtn');
const clearBtn = document.getElementById('clearBtn');
const resultCard = document.getElementById('result');
const errorBox = document.getElementById('error');

const outHammers = document.getElementById('out-hammers');
const outJennifers = document.getElementById('out-jennifers');
const outHammerPoints = document.getElementById('out-hammer-points');
const outJenniferPoints = document.getElementById('out-jennifer-points');
const outTotal = document.getElementById('out-total');

// --- Hàm tiện ích ---
function fmt(n){ return Number(n).toLocaleString('vi-VN'); }
function parseNonNegInt(v){
  if(v === '' || v === null || v === undefined) return 0;
  const n = Math.floor(Number(v));
  if(Number.isNaN(n) || n < 0) return null;
  return n;
}
function showError(msg){
  errorBox.style.display = 'block';
  errorBox.textContent = msg;
}
function clearError(){
  errorBox.style.display = 'none';
  errorBox.textContent = '';
}

// --- Tính điểm ---
async function compute(){
  clearError();
  const h = parseNonNegInt(hammersInput.value);
  const j = parseNonNegInt(jennifersInput.value);

  if(h === null || j === null){
    showError('Vui lòng nhập số nguyên >= 0 cho cả hai ô.');
    resultCard.style.display = 'none';
    return;
  }

  const hammerPoints = h * POINT_PER_HAMMER;
  const jenniferPoints = j * POINT_PER_JENNIFER;
  const total = hammerPoints + jenniferPoints;

  outHammers.textContent = fmt(h);
  outJennifers.textContent = fmt(j);
  outHammerPoints.textContent = fmt(hammerPoints);
  outJenniferPoints.textContent = fmt(jenniferPoints);
  outTotal.textContent = fmt(total);
  resultCard.style.display = 'block';

  // --- Lưu Firestore nếu có auth ---
  if(typeof auth !== 'undefined' && auth.currentUser){
    try{
      await db.collection('users')
        .doc(auth.currentUser.uid)
        .collection('tabs')
        .doc('bua')
        .set({
          lastPoints: total,
          hammers: h,
          jennifers: j,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, {merge:true});
      window.dispatchEvent(new Event('summary.refresh'));
    }catch(err){
      console.error('Lỗi lưu Firestore:', err);
    }
  }
}

// --- Event listeners ---
calcBtn.addEventListener('click', compute);

[hammersInput, jennifersInput].forEach(inp=>{
  inp.addEventListener('keydown', e=>{
    if(e.key === 'Enter') { compute(); e.preventDefault(); }
  });
});

clearBtn.addEventListener('click', ()=>{
  hammersInput.value = 0;
  jennifersInput.value = 0;
  clearError();
  resultCard.style.display = 'none';
  hammersInput.focus();
});

// --- Khởi tạo ---
clearError();
resultCard.style.display = 'none';
