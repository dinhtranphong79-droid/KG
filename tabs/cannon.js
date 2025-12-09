window.addEventListener('tab.open', async (e) => {
  if(e.detail.id !== 'phao') return;

  const container = document.getElementById('tab_phao');
  container.innerHTML = `
    <h2>Level pháo</h2>
    <div class="input-group"><label>Đá</label><input type="number" id="stone" value="0" min="0"></div>
    <div class="input-group"><label>Gỗ</label><input type="number" id="wood" value="0" min="0"></div>
    <div class="input-group"><label>Quặng</label><input type="number" id="ore" value="0" min="0"></div>
    <div class="input-group"><label>Hộp pháo</label><input type="number" id="boxes" value="0" min="0"></div>
    <div class="input-group"><label>Cấp mục tiêu</label><input type="number" id="targetLevel" placeholder="Để trống = max"></div>
    <button id="btnCompute">Tính</button>
    <div id="output" class="result" style="visibility:hidden"></div>
  `;

  const stone = container.querySelector('#stone');
  const wood  = container.querySelector('#wood');
  const ore   = container.querySelector('#ore');
  const boxes = container.querySelector('#boxes');
  const targetLevel = container.querySelector('#targetLevel');
  const btnCompute = container.querySelector('#btnCompute');
  const output = container.querySelector('#output');

  const user = auth.currentUser;
  if(!user){
    output.style.visibility = 'visible';
    output.innerText = "Chưa đăng nhập, không thể lưu dữ liệu.";
    return;
  }

  const cannonRef = db.collection('users').doc(user.uid).collection('tabs').doc('cannon');

  // Load dữ liệu từ Firestore khi mở tab
  const doc = await cannonRef.get();
  if(doc.exists){
    const data = doc.data();
    stone.value = data.stone || 0;
    wood.value  = data.wood || 0;
    ore.value   = data.ore || 0;
    boxes.value = data.boxes || 0;
    targetLevel.value = data.targetLevel || '';
  }

  // Hàm lưu dữ liệu lên Firestore
  function saveCannon(){
    cannonRef.set({
      stone: Number(stone.value)||0,
      wood: Number(wood.value)||0,
      ore: Number(ore.value)||0,
      boxes: Number(boxes.value)||0,
      targetLevel: targetLevel.value
    });
  }

  // Gọi save khi thay đổi input
  [stone, wood, ore, boxes, targetLevel].forEach(inp => {
    inp.addEventListener('input', saveCannon);
  });

  // --- Logic tính toán như trước ---
  function toNum(el){ return Number(el.value)||0; }
  function simulateOptimal(S,W,Q,B,lv){ /* giữ nguyên logic hiện tại */ }
  function computeMaxLv(S,W,Q,B){ /* giữ nguyên logic hiện tại */ }

  function compute(){
    // tính toán ...
    saveCannon(); // lưu khi bấm tính
  }

  btnCompute.addEventListener('click', compute);

});
