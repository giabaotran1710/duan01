// Giao diện bảng xếp hạng trên trang chủ: nút 🏆 + cửa sổ chọn game, top 50, đổi biệt danh.
// Cần nạp sau scores.js. Tự chèn CSS và HTML, không phụ thuộc phần còn lại của trang.
(function () {
  'use strict';
  if (!window.Scores || window.__lbUi) return;
  window.__lbUi = true;

  const css = `
  /* nằm ngay bên trái nút Patch Note (#pn-btn: top 24, right 24, rộng 50) */
  #lbBtn{position:fixed;top:26px;right:84px;z-index:9000;width:46px;height:46px;border-radius:50%;
    border:1px solid rgba(255,255,255,.35);background:linear-gradient(145deg,#ffd76a,#f0a21f);color:#5a3200;font-size:22px;line-height:1;
    display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35);transition:transform .15s}
  #lbBtn:active{transform:scale(.92)}
  #lbBtn:hover{transform:translateY(-1px) scale(1.05)}
  #lbModal{position:fixed;inset:0;z-index:2147483200;display:none;align-items:center;justify-content:center;background:rgba(4,7,18,.78);
    padding:12px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#eef1ff}
  #lbModal.show{display:flex;animation:lbFade .2s}
  @keyframes lbFade{from{opacity:0}}
  #lbBox{width:100%;max-width:460px;max-height:min(720px,94vh);display:flex;flex-direction:column;background:#141b34;border:1px solid #2f3a68;
    border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.55);overflow:hidden}
  #lbHead{display:flex;align-items:center;gap:10px;padding:14px 16px 10px}
  #lbHead h2{margin:0;font-size:19px;letter-spacing:.5px;flex:1}
  #lbClose{border:0;background:#222b52;color:#c8d0f5;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer}
  #lbGames{display:flex;gap:6px;overflow-x:auto;padding:0 14px 10px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  #lbGames::-webkit-scrollbar{display:none}
  #lbGames button{flex:none;border:1px solid #2f3a68;background:#1b2447;color:#a9b4e6;padding:7px 12px;border-radius:99px;font:inherit;font-size:13px;
    font-weight:600;cursor:pointer;white-space:nowrap}
  #lbGames button.on{background:linear-gradient(#ffd76a,#f0a21f);color:#4a2a00;border-color:transparent}
  #lbStatus{padding:0 16px 8px;font-size:12px;color:#8f9bd0}
  #lbList{flex:1;overflow-y:auto;padding:0 10px 8px;min-height:160px}
  .lbRow{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;margin-bottom:4px;background:#1a2244}
  .lbRow.me{background:rgba(94,224,200,.14);outline:1px solid rgba(94,224,200,.5)}
  .lbRank{width:34px;text-align:center;font-weight:800;color:#9aa6d6;font-size:15px}
  .lbRow:nth-child(1) .lbRank{font-size:22px}.lbRow:nth-child(2) .lbRank{font-size:20px}.lbRow:nth-child(3) .lbRank{font-size:20px}
  .lbName{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
  .lbScore{font-weight:800;font-variant-numeric:tabular-nums;color:#ffe08a}
  .lbEmpty{padding:34px 14px;text-align:center;color:#8f9bd0;font-size:14px}
  #lbFoot{padding:10px 14px 14px;border-top:1px solid #26305a;display:flex;flex-direction:column;gap:8px}
  #lbMine{font-size:13px;color:#b9c3f0}
  #lbMine b{color:#ffe08a}
  #lbNameRow{display:flex;gap:8px}
  #lbName{flex:1;min-width:0;padding:10px 12px;border-radius:12px;border:1px solid #2f3a68;background:#0d1226;color:#fff;font-size:15px;outline:none}
  #lbSave,#lbRefresh{border:0;padding:10px 14px;border-radius:12px;font:inherit;font-weight:800;font-size:14px;cursor:pointer}
  #lbSave{background:linear-gradient(#5ee0c8,#2bb39a);color:#052a24}
  #lbRefresh{background:#222b52;color:#c8d0f5}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const btn = document.createElement('button');
  btn.id = 'lbBtn'; btn.type = 'button'; btn.title = 'Bảng xếp hạng'; btn.setAttribute('aria-label', 'Bảng xếp hạng'); btn.textContent = '🏆';
  const modal = document.createElement('div');
  modal.id = 'lbModal';
  modal.innerHTML = `<div id="lbBox" role="dialog" aria-label="Bảng xếp hạng">
    <div id="lbHead"><h2>🏆 Bảng xếp hạng</h2><button id="lbClose" type="button" aria-label="Đóng">✕</button></div>
    <div id="lbGames"></div>
    <div id="lbStatus"></div>
    <div id="lbList"></div>
    <div id="lbFoot">
      <div id="lbMine"></div>
      <div id="lbNameRow"><input id="lbName" maxlength="20" placeholder="Biệt danh của bạn"><button id="lbSave" type="button">Lưu tên</button><button id="lbRefresh" type="button" title="Tải lại">⟳</button></div>
    </div></div>`;
  document.body.appendChild(btn);
  document.body.appendChild(modal);

  const $ = id => document.getElementById(id);
  const games = Scores.games;
  let current = games[0].id, token = 0;
  try { current = localStorage.getItem('lb_last_game') || current; } catch (e) {}
  if (!games.some(g => g.id === current)) current = games[0].id;

  function buildChips() {
    const wrap = $('lbGames'); wrap.innerHTML = '';
    games.forEach(g => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = g.name; b.dataset.id = g.id;
      if (g.id === current) b.className = 'on';
      b.onclick = () => { current = g.id; try { localStorage.setItem('lb_last_game', current); } catch (e) {} buildChips(); load(); };
      wrap.appendChild(b);
    });
    const on = wrap.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  const MEDAL = ['🥇', '🥈', '🥉'];
  async function load() {
    const my = ++token, list = $('lbList'), status = $('lbStatus');
    list.innerHTML = '<div class="lbEmpty">Đang tải…</div>'; status.textContent = '';
    const res = await Scores.top(current, 50);
    if (my !== token) return;   // người dùng đã chuyển game khác
    status.textContent = res.online ? 'Top 50 người chơi' : 'Không kết nối được mạng: đang xem điểm lưu trên máy này';
    list.innerHTML = '';
    if (!res.scores.length) { list.innerHTML = '<div class="lbEmpty">Chưa có điểm nào.<br>Hãy chơi để ghi tên lên bảng!</div>'; }
    const myName = Scores.getName();
    res.scores.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'lbRow' + (s.me || (!res.online && s.name === myName) ? ' me' : '');
      const r = document.createElement('div'); r.className = 'lbRank'; r.textContent = i < 3 ? MEDAL[i] : String(i + 1);
      const n = document.createElement('div'); n.className = 'lbName'; n.textContent = s.name;
      const v = document.createElement('div'); v.className = 'lbScore'; v.textContent = Scores.format(current, s.score);
      row.append(r, n, v); list.appendChild(row);
    });
    const local = Scores.localTop(current, 1)[0];
    $('lbMine').innerHTML = local ? `Điểm cao nhất của bạn ở game này: <b>${Scores.format(current, local.score)}</b>` : 'Bạn chưa có điểm ở game này.';
  }

  function open() {
    modal.classList.add('show');
    $('lbName').value = Scores.hasName() ? Scores.getName() : '';
    buildChips(); load();
  }
  function close() { modal.classList.remove('show'); }
  btn.onclick = open;
  $('lbClose').onclick = close;
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  $('lbRefresh').onclick = load;
  $('lbSave').onclick = () => {
    const v = $('lbName').value;
    if (!v.trim()) return;
    Scores.setName(v);
    $('lbName').value = Scores.getName();
    $('lbSave').textContent = 'Đã lưu ✓';
    setTimeout(() => { $('lbSave').textContent = 'Lưu tên'; load(); }, 900);
  };
  $('lbName').addEventListener('keydown', e => { if (e.key === 'Enter') $('lbSave').click(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('show')) close(); });
})();
