// ----------------- tabs/bua.js -----------------
(function(){

  const POINT_PER_HAMMER = 100;
  const POINT_PER_JENNIFER = 1000;

  function fmt(n){ return Number(n).toLocaleString('vi-VN'); }
  function parseNonNegInt(v){
    if(v==='' || v===null || v===undefined) return 0;
    const n = Math.floor(Number(v));
    if(Number.isNaN(n) || n<0) return null;
    return n;
  }

  async function loadSaved(user){
    if(!user) return {};
    const doc = await db.collection('users')
      .doc(user.uid)
      .collection('tabs')
      .doc('bua')
      .get();
    return doc.exists ? doc.data() : {};
  }

  async function renderBuaTab(){
    const user = auth.currentUser;
    const saved = await loadSaved(user);

    const container = document.getElementById('tab_bua');
    if(!container) return;

    container.innerHTML = `
      <div class="small">Búa & Jennifer</div>
      <label>Số búa: <input id="m_hammer" type="number" min="0" value="${saved.h ?? 0}"></label>
      <label>Số jennifer: <input id="m_jenn" type="number" min="0" value="${saved.j ?? 0}"></label>
      <div class="controls">
        <button id="m_compute" class="primary">Tính</button>
        <button id="m_clear" class="clear">Đặt lại</button>
      </div>
      <div id="m_error" class="error" style="display:none"></div>
      <div id="m_result" class="result" style="display:none"></div>
    `;

    const hammerInput = document.getElementById('m_hammer');
    const jennInput = document.getElementById('m_jenn');
    const resultDiv = document.getElementById('m_result');
    const errorDiv = document.getElementById('m_error');
    const btnCompute = document.getElementById('m_compute');
    const btnClear = document.getElementById('m_clear');

    function showError(msg){
      errorDiv.style.display='block';
      errorDiv.textContent = msg;
    }
    function clearError(){
      errorDiv.style.display='none';
      errorDiv.textContent = '';
    }

    async function compute(){
      clearError();
      let h = parseNonNegInt(hammerInput.value);
      let j = parseNonNegInt(jennInput.value);
      if(h===null || j===null){
        showError('Vui lòng nhập số nguyên >= 0 cho cả hai ô.');
        resultDiv.style.display='none';
        return;
      }

      const hammerPoints = h * POINT_PER_HAMMER;
      const jennPoints = j * POINT_PER_JENNIFER;
      const total = hammerPoints + jennPoints;

      resultDiv.innerHTML = `
        <div>Điểm Búa: ${fmt(hammerPoints)}</div>
        <div>Điểm Jennifer: ${fmt(jennPoints)}</div>
        <div><b>Tổng: ${fmt(total)}</b></div>
      `;
      resultDiv.style.display='block';

      if(user){
        await db.collection('users').doc(user.uid)
          .collection('tabs').doc('bua')
          .set({
            h, j, lastPoints: total,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          }, {merge:true});

        window.dispatchEvent(new Event('summary.refresh'));
      }
    }

    btnCompute.addEventListener('click', compute);

    // Enter key tính luôn
    [hammerInput, jennInput].forEach(inp=>{
      inp.addEventListener('keydown', e=>{
        if(e.key==='Enter'){ compute(); e.preventDefault(); }
      });
    });

    // Clear button
    btnClear.addEventListener('click', ()=>{
      hammerInput.value = 0;
      jennInput.value = 0;
      clearError();
      resultDiv.style.display='none';
      hammerInput.focus();
    });

    clearError();
    resultDiv.style.display='none';
  }

  // Lắng nghe mở tab
  window.addEventListener('tab.open', e=>{
    if(e.detail.id==='bua') renderBuaTab();
  });

  // Mở tab tự động khi load web
  document.addEventListener('DOMContentLoaded', ()=>{
    window.dispatchEvent(new CustomEvent('tab.open',{detail:{id:'bua'}}));
  });

})();
