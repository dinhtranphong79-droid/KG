window.addEventListener('tab.open', async (e)=>{
  if(e.detail.id !== 'tongdiem') return;
  const container = document.getElementById('tab_tongdiem');
  container.innerHTML = `<div class="small">Tổng điểm — chọn tab để cộng</div><div id="summaryList"></div><div class="controls"><button id="computeSummary" class="primary">Tính Tổng</button><button id="exportCSV" class="secondary">Xuất CSV</button></div><div id="summaryResult" class="result" style="display:none"></div>`;
  await renderSummary();
  document.getElementById('computeSummary').onclick = renderSummary;
  document.getElementById('exportCSV').onclick = exportCSV;
});

async function renderSummary(){
  const container = document.getElementById('summaryList');
  container.innerHTML='';
  const user = auth.currentUser; if(!user){ container.innerHTML='<div>Đăng nhập để xem tổng điểm</div>'; return; }
  const tabs = ['cannon','thienphu','phuthuy','bua','dragon','hero'];
  const rows=[];
  for(const t of tabs){
    const doc = await db.collection('users').doc(user.uid).collection('tabs').doc(t).get();
    const pts = doc.exists && doc.data().lastPoints ? doc.data().lastPoints : 0;
    const el = document.createElement('div'); el.className='checkbox-row';
    el.innerHTML = `<div><label><input type="checkbox" data-tab="${t}" checked> ${t}</label></div><div>Điểm: ${pts}</div>`;
    container.appendChild(el);
    rows.push({tab:t,pts});
  }
  const total = rows.reduce((s,r)=>s+r.pts,0);
  const out = document.getElementById('summaryResult');
  out.style.display='block';
  out.innerHTML = `<div>Chi tiết: ${rows.map(r=>r.tab+':'+r.pts).join(', ')}</div><div><strong>Tổng điểm: ${total.toLocaleString()}</strong></div>`;
}

function exportCSV(){
  const user = auth.currentUser; if(!user){ alert('Đăng nhập'); return; }
  const txt = document.getElementById('summaryResult').innerText || '';
  const blob = new Blob([txt], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = (user.email||'summary')+'.txt'; a.click();
  URL.revokeObjectURL(url);
}
