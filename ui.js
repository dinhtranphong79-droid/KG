/* UI: render nav & sections */
const TABS = [
  {id:'home', label:'Trang chủ'},
  {id:'phao', label:'Pháo'},
  {id:'thienphu', label:'Thiên Phú'},
  {id:'phuthuy', label:'Phù Thủy'},
  {id:'bua', label:'Búa & Jennifer'},
  {id:'rong', label:'Rồng'},
  {id:'hero', label:'Hero'},
  {id:'tongdiem', label:'Tổng điểm'},
  {id:'account', label:'Tài khoản'}
];

const nav = document.getElementById('nav');
const main = document.getElementById('main');

/* -------------------------
   RENDER NAV BUTTONS
-------------------------- */
TABS.forEach(t => {
  const btn = document.createElement('button');
  btn.textContent = t.label;
  btn.dataset.tab = t.id;
  btn.onclick = () => showTab(t.id);
  nav.appendChild(btn);
});

/* -------------------------
   RENDER TAB WITHOUT 
   WIPING JS EVENTS
-------------------------- */
function showTab(id) {
  // KHÔNG dùng main.innerHTML = '' nữa
  // → thay bằng .replaceChildren(), không đụng event wiring
  main.replaceChildren();

  const wrap = document.createElement('div');
  wrap.className = 'container';

  const h = document.createElement('h2');
  h.textContent = TABS.find(x => x.id === id).label;
  wrap.appendChild(h);

  const content = document.createElement('div');
  content.id = 'tab_' + id;
  content.className = 'card';
  wrap.appendChild(content);

  main.appendChild(wrap);

  // TAB READY → phát event
  requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent("tab.open", { detail: { id } }));
  });
}

showTab('home');
