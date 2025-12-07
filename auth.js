/* auth.js - simple Firebase Auth handlers (email/password) */
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const who = document.getElementById('who');

btnLogin.addEventListener('click', async ()=>{
  const email = emailInput.value.trim();
  const pass = passInput.value.trim();
  if(!email || !pass){ alert('Nhập email và password'); return; }
  try{
    await auth.signInWithEmailAndPassword(email, pass);
  }catch(err){
    alert('Đăng nhập lỗi: '+err.message);
  }
});

btnLogout.addEventListener('click', async ()=>{
  await auth.signOut();
});

auth.onAuthStateChanged(user=>{
  if(user){
    who.textContent = user.email;
    btnLogin.style.display='none';
    btnLogout.style.display='inline-block';
    emailInput.style.display='none'; passInput.style.display='none';
    loadAllTabs();
  } else {
    who.textContent='';
    btnLogin.style.display='inline-block';
    btnLogout.style.display='none';
    emailInput.style.display='inline-block'; passInput.style.display='inline-block';
    showTab('home');
  }
});

async function loadAllTabs(){
  const active = document.querySelector('#main .container h2')?.textContent || 'Trang chủ';
  const tabId = TABS.find(t=>t.label===active)?.id || 'home';
  window.dispatchEvent(new CustomEvent('tab.open',{detail:{id:tabId}}));
}
