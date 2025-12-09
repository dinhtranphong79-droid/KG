window.addEventListener('tab.open', async (e)=>{
  if(e.detail.id !== 'account') return;
  const container = document.getElementById('tab_account');
  container.innerHTML = `<div class="small">Tài khoản: hiển thị thông tin, đăng xuất</div><div id="acct"></div>`;
  const user = auth.currentUser;
  if(!user){ document.getElementById('acct').innerText='Chưa đăng nhập'; return; }
  const doc = await db.collection('users').doc(user.uid).get();
  const data = doc.exists ? doc.data() : {};
  document.getElementById('acct').innerHTML = `<div>Email: ${user.email}</div><div>UID: ${user.uid}</div><div>Profile: ${JSON.stringify(data)}</div>`;
});
