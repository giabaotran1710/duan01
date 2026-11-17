/* =========================================================
   MENU: VỚI MÁY (bida lỗ / bida phăng) · ONLINE (tìm đối thủ, xem bida-online.js) · LUẬT CHƠI.
   Mở khi vào trang và khi bấm nút ☰. Khi menu mở, bàn tạm dừng như lúc thoát toàn màn hình.
   ========================================================= */

const modeMenu = document.getElementById("modeMenu");
const mmResume = document.getElementById("mmResume");
const homeBtn = document.getElementById("homeBtn");

let ruleMode = "pool";
let gameInProgress = false;

try{
  if(localStorage.getItem("bida:rule") === "carom") ruleMode = "carom";
}catch(e){}

/* ---------- chuyển màn trong menu ---------- */

function showView(name){
  document.querySelectorAll(".mmView").forEach(v => { v.hidden = v.dataset.view !== name; });
  if(name === "rules") showRule(ruleMode);
  if(window.onlineMenuView) onlineMenuView(name);
}

function showRule(mode){
  ruleMode = mode;

  document.querySelectorAll(".mmTabs button").forEach(b => {
    const on = b.dataset.rule === mode;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });

  document.querySelectorAll(".mmRules").forEach(el => { el.hidden = el.dataset.rule !== mode; });

  try{ localStorage.setItem("bida:rule", mode); }catch(e){}
}

document.querySelectorAll("[data-go]").forEach(b => {
  b.addEventListener("click", () => showView(b.dataset.go));
});

document.querySelectorAll(".mmTabs button").forEach(b => {
  b.addEventListener("click", () => showRule(b.dataset.rule));
});

/* ---------- mở / đóng menu ---------- */

function openMenu(view = "home"){
  menuOpen = true;
  modeMenu.classList.remove("hide");
  mmResume.hidden = !(gameInProgress && !gameOver && !ONLINE_ON);
  showView(view);
  fsRefresh();
}

function closeMenu(){
  menuOpen = false;
  modeMenu.classList.add("hide");
  fsRefresh();
}

function startMode(mode){
  if(ONLINE_ON && window.onlineExit) onlineExit();   // đang ở chế độ online thì thoát hẳn trước khi chơi với máy
  GAME_MODE = mode === "carom" ? "carom" : "pool";
  resize();
  resetGame();
  gameInProgress = true;
  closeMenu();
}

document.querySelectorAll("[data-mode]").forEach(card => {
  card.addEventListener("click", () => startMode(card.dataset.mode));
});

mmResume.addEventListener("click", closeMenu);

homeBtn.addEventListener("pointerdown", e => { e.stopPropagation(); });
homeBtn.addEventListener("pointerup", e => { e.stopPropagation(); });
homeBtn.addEventListener("click", e => {
  e.preventDefault();
  e.stopPropagation();
  openMenu();
});

// Vào trang: hiện menu
openMenu();
