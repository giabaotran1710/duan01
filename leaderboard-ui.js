// Giao diện bảng xếp hạng trên trang chủ: nút cúp (dùng chung kiểu .toggle-btn) + cửa sổ xếp hạng.
// Cần nạp sau scores.js. Tự chèn CSS và HTML; biểu tượng dùng Font Awesome đã có sẵn trên trang.
(function () {
  'use strict';
  if (!window.Scores || window.__lbUi) return;
  window.__lbUi = true;

  const css = `
  /* ---------- Nút cúp: cùng kiểu với các nút .toggle-btn, nằm bên trái nút Patch Note ---------- */
  #lbBtn{position:fixed;top:calc(24px + env(safe-area-inset-top,0px));right:calc(24px + 50px + 8px + env(safe-area-inset-right,0px));z-index:1000;
    color:#ffd35a;font-size:21px;overflow:visible;padding:0;border-radius:10px}
  #lbBtn i{filter:drop-shadow(0 0 6px rgba(255,200,60,.75));position:relative;z-index:2;animation:lbTrophy 3.6s ease-in-out infinite}
  @keyframes lbTrophy{0%,70%,100%{transform:none}78%{transform:rotate(-12deg) scale(1.12)}86%{transform:rotate(10deg) scale(1.12)}94%{transform:rotate(-4deg)}}
  #lbBtn:hover{box-shadow:0 12px 40px rgba(255,190,60,.35)}
  /* ánh lướt qua nút: lớp con có overflow kín, vệt sáng đi bằng transform ở ngoài nút cả lúc đầu và cuối nên không khựng */
  .lbSh{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none;z-index:2}
  .lbSh::before{content:"";position:absolute;top:-10%;bottom:-10%;left:0;width:55%;
    background:linear-gradient(100deg,transparent 0%,rgba(255,240,180,.0) 20%,rgba(255,240,180,.6) 50%,rgba(255,240,180,0) 80%,transparent 100%);
    transform:translateX(-130%) skewX(-18deg);animation:lbShine 3.6s linear infinite}
  @keyframes lbShine{0%,55%{transform:translateX(-130%) skewX(-18deg)}85%,100%{transform:translateX(260%) skewX(-18deg)}}
  /* lấp lánh: các ngôi sao nhỏ nhấp nháy quanh nút */
  .lbSp{position:absolute;width:12px;height:12px;pointer-events:none;z-index:3;opacity:0;
    background:radial-gradient(circle,#fff 0 22%,rgba(255,235,150,.9) 23% 40%,transparent 41%);
    clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);animation:lbTwinkle 2.4s ease-in-out infinite}
  .lbSp.s1{top:-7px;left:-6px;animation-delay:.1s}
  .lbSp.s2{top:-9px;right:6px;width:9px;height:9px;animation-delay:.9s}
  .lbSp.s3{bottom:-6px;right:-7px;width:14px;height:14px;animation-delay:1.5s}
  .lbSp.s4{bottom:-4px;left:4px;width:8px;height:8px;animation-delay:2s}
  @keyframes lbTwinkle{0%,100%{opacity:0;transform:scale(.2) rotate(0)}45%{opacity:1;transform:scale(1.1) rotate(45deg)}70%{opacity:0;transform:scale(.4) rotate(90deg)}}
  /* rắc hạt (sprinkle): hạt màu bắn ra xung quanh rồi rơi xuống, lặp lại */
  .lbDot{position:absolute;left:50%;top:50%;width:5px;height:5px;border-radius:50%;pointer-events:none;z-index:1;opacity:0;
    background:var(--c);animation:lbSprinkle 3.6s ease-out infinite;animation-delay:var(--d)}
  .lbDot.sq{border-radius:1px;width:4px;height:7px}
  @keyframes lbSprinkle{0%,62%{opacity:0;transform:translate(-50%,-50%) scale(.3)}66%{opacity:1}
    100%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) rotate(var(--r)) scale(1)}}
  @media (prefers-reduced-motion:reduce){#lbBtn i,.lbSh::before,.lbSp,.lbDot{animation:none!important}.lbSp,.lbDot,.lbSh{display:none}}

  /* ---------- Cửa sổ ---------- */
  #lbModal{position:fixed;inset:0;z-index:2147483200;display:none;align-items:center;justify-content:center;background:rgba(3,6,16,.72);
    -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);padding:12px;font-family:'Quicksand','Segoe UI',system-ui,-apple-system,Roboto,sans-serif;color:#e9edff}
  #lbModal.show{display:flex;animation:lbFade .22s}
  @keyframes lbFade{from{opacity:0}}
  #lbBox{position:relative;width:100%;max-width:480px;height:min(760px,94vh);display:flex;flex-direction:column;overflow:hidden;
    background:linear-gradient(170deg,#1a2147 0%,#11172f 45%,#0d1226 100%);border:1px solid rgba(255,255,255,.12);border-radius:22px;
    box-shadow:0 30px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.08);animation:lbPop .3s cubic-bezier(.2,.9,.3,1.2)}
  @keyframes lbPop{from{opacity:0;transform:translateY(18px) scale(.96)}}
  #lbHead{position:relative;display:flex;align-items:center;gap:12px;padding:16px 16px 12px;
    background:radial-gradient(120% 140% at 0 0,rgba(255,190,70,.22),transparent 60%)}
  #lbCrest{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:22px;color:#4a2c00;
    background:linear-gradient(145deg,#ffe082,#f5a623);box-shadow:0 6px 18px rgba(245,166,35,.4),inset 0 1px 0 rgba(255,255,255,.6)}
  #lbTitle{flex:1;min-width:0}
  #lbTitle h2{margin:0;font-family:'Exo 2','Segoe UI',sans-serif;font-size:20px;letter-spacing:1px;text-transform:uppercase}
  #lbTitle p{margin:2px 0 0;font-size:12px;color:#9aa6d8}
  .lbIcoBtn{width:38px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.07);color:#cfd6f5;
    font-size:15px;cursor:pointer;display:grid;place-items:center;transition:.15s}
  .lbIcoBtn:hover{background:rgba(255,255,255,.16);color:#fff}
  .lbIcoBtn:active{transform:scale(.92)}
  /* chọn game */
  #lbPick{position:relative;display:flex;gap:8px;padding:0 16px 12px}
  #lbCur{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:14px;cursor:pointer;
    background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:#fff;font:inherit;font-size:15px;font-weight:700;text-align:left}
  #lbCur span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #lbCur i{color:#9aa6d8;transition:transform .2s}
  #lbPick.open #lbCur i{transform:rotate(180deg)}
  #lbMenu{position:absolute;left:16px;right:16px;top:100%;z-index:5;margin-top:-6px;max-height:300px;overflow-y:auto;display:none;
    grid-template-columns:1fr 1fr;gap:6px;padding:10px;border-radius:16px;background:#1c2350;border:1px solid rgba(255,255,255,.16);
    box-shadow:0 18px 44px rgba(0,0,0,.55)}
  #lbPick.open #lbMenu{display:grid;animation:lbFade .15s}
  #lbMenu button{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:11px;border:1px solid transparent;background:rgba(255,255,255,.05);
    color:#d4dbfa;font:inherit;font-size:13px;font-weight:600;cursor:pointer;text-align:left}
  #lbMenu button:hover{background:rgba(255,255,255,.12)}
  #lbMenu button.on{background:linear-gradient(135deg,rgba(255,200,80,.25),rgba(245,166,35,.15));border-color:rgba(255,200,80,.6);color:#ffe9a8}
  #lbMenu button i{width:14px;opacity:0;font-size:11px}#lbMenu button.on i{opacity:1}
  /* nội dung cuộn */
  #lbScroll{flex:1;overflow-y:auto;padding:0 14px 8px;scrollbar-width:thin;scrollbar-color:#38427a transparent}
  #lbNote{margin:0 2px 10px;padding:8px 12px;border-radius:10px;font-size:12px;color:#ffd98a;background:rgba(255,190,70,.1);border:1px solid rgba(255,190,70,.25);display:none}
  /* bục top 3 */
  #lbPodium{display:grid;grid-template-columns:1fr 1.12fr 1fr;gap:8px;align-items:end;padding:22px 2px 12px}
  .lbPod{display:flex;flex-direction:column;align-items:center;min-width:0;animation:lbRise .5s cubic-bezier(.2,.9,.3,1.1) both}
  .lbPod.p1{animation-delay:.05s}.lbPod.p2{animation-delay:.15s}.lbPod.p3{animation-delay:.25s}
  @keyframes lbRise{from{opacity:0;transform:translateY(26px)}}
  .lbCrown{color:#ffd35a;font-size:20px;margin-bottom:-6px;filter:drop-shadow(0 0 8px rgba(255,200,60,.8));animation:lbBob 2.2s ease-in-out infinite;z-index:2}
  @keyframes lbBob{50%{transform:translateY(-3px)}}
  .lbAv{display:grid;place-items:center;border-radius:50%;font-weight:800;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.35);flex:none;
    background:linear-gradient(145deg,var(--a),var(--b));box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
  .lbPod .lbAv{width:54px;height:54px;font-size:22px;border:3px solid var(--ring)}
  .lbPod.p1 .lbAv{width:68px;height:68px;font-size:28px;box-shadow:0 0 0 3px rgba(255,211,90,.25),0 0 28px rgba(255,200,60,.45),inset 0 1px 0 rgba(255,255,255,.35)}
  .lbPodName{margin-top:6px;max-width:100%;font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lbPodScore{font-family:'Exo 2',sans-serif;font-size:13px;font-weight:800;color:#ffe08a;font-variant-numeric:tabular-nums}
  .lbStep{margin-top:8px;width:100%;border-radius:12px 12px 4px 4px;display:grid;place-items:start center;padding-top:8px;font-family:'Exo 2',sans-serif;
    font-size:24px;font-weight:900;color:rgba(255,255,255,.92);background:linear-gradient(180deg,var(--s1),var(--s2));box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
  .p1 .lbStep{height:84px;--s1:#f7c948;--s2:#b97d12}.p2 .lbStep{height:60px;--s1:#cfd6e4;--s2:#7b869c}.p3 .lbStep{height:44px;--s1:#d9965a;--s2:#8a5326}
  .p1{--ring:#ffd35a}.p2{--ring:#d5dbea}.p3{--ring:#e0a06a}
  .lbPod.me .lbPodName{color:#7ff0d7}
  /* danh sách */
  .lbRow{display:flex;align-items:center;gap:10px;padding:8px 12px 8px 10px;margin-bottom:6px;border-radius:14px;position:relative;overflow:hidden;
    background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);animation:lbRowIn .35s both;animation-delay:calc(var(--i) * 22ms)}
  @keyframes lbRowIn{from{opacity:0;transform:translateX(-10px)}}
  .lbRow .bar{position:absolute;left:0;top:0;bottom:0;width:var(--w);background:linear-gradient(90deg,rgba(120,150,255,.16),transparent);pointer-events:none}
  .lbRow.me{background:rgba(70,230,200,.12);border-color:rgba(70,230,200,.5)}
  .lbRow.me .bar{background:linear-gradient(90deg,rgba(70,230,200,.2),transparent)}
  .lbRk{width:30px;text-align:center;font-family:'Exo 2',sans-serif;font-weight:800;font-size:15px;color:#8f9bd0;z-index:1}
  .lbRow .lbAv{width:34px;height:34px;font-size:15px;z-index:1}
  .lbNm{flex:1;min-width:0;font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:1}
  .lbNm small{margin-left:6px;font-size:10px;font-weight:800;letter-spacing:.5px;color:#06332b;background:#5eead4;border-radius:6px;padding:1px 6px;vertical-align:1px}
  .lbSc{font-family:'Exo 2',sans-serif;font-weight:800;font-size:14px;color:#ffe08a;font-variant-numeric:tabular-nums;z-index:1}
  /* trạng thái */
  .lbSkel{height:50px;border-radius:14px;margin-bottom:6px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.04) 75%);background-size:300% 100%;animation:lbShimmer 1.2s linear infinite}
  @keyframes lbShimmer{to{background-position:-300% 0}}
  .lbEmpty{padding:34px 16px;text-align:center;color:#8f9bd0;font-size:14px;line-height:1.6}
  .lbEmpty i{display:block;font-size:42px;margin-bottom:10px;color:#3a4580}
  /* thẻ của bạn */
  #lbMe{display:flex;align-items:center;gap:12px;padding:12px 14px calc(12px + env(safe-area-inset-bottom,0px));background:rgba(8,11,26,.85);border-top:1px solid rgba(255,255,255,.1)}
  #lbMe .lbAv{width:44px;height:44px;font-size:19px}
  #lbMeInfo{flex:1;min-width:0}
  #lbMeName{display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px}
  #lbMeName span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #lbMeName button{border:0;background:rgba(255,255,255,.08);color:#aab4e6;width:26px;height:26px;border-radius:8px;font-size:11px;cursor:pointer;flex:none}
  #lbMeName button:hover{background:rgba(255,255,255,.18);color:#fff}
  #lbMeSub{margin-top:2px;font-size:12px;color:#8f9bd0}
  #lbMeSub b{color:#ffe08a;font-family:'Exo 2',sans-serif}
  #lbMeRank{text-align:center;min-width:64px}
  #lbMeRank div:first-child{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8f9bd0}
  #lbMeRank div:last-child{font-family:'Exo 2',sans-serif;font-size:22px;font-weight:900;color:#5eead4;line-height:1.1}
  #lbEdit{display:none;flex:1;gap:8px}
  #lbMe.editing #lbMeInfo,#lbMe.editing #lbMeRank{display:none}#lbMe.editing #lbEdit{display:flex}
  #lbEdit input{flex:1;min-width:0;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:#0a0e20;color:#fff;font:inherit;font-size:15px;outline:none}
  #lbEdit input:focus{border-color:#5eead4}
  #lbEdit .ok{border:0;padding:0 16px;border-radius:12px;background:linear-gradient(#5eead4,#22b8a3);color:#04352d;font:inherit;font-weight:800;cursor:pointer}
  @media (max-height:640px){#lbPodium{padding-top:14px}.p1 .lbStep{height:56px}.p2 .lbStep{height:40px}.p3 .lbStep{height:28px}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- Nút ----------
  const btn = document.createElement('button');
  btn.id = 'lbBtn'; btn.type = 'button'; btn.className = 'toggle-btn';
  btn.title = 'Bảng xếp hạng'; btn.setAttribute('aria-label', 'Bảng xếp hạng');
  const dots = [[-26, -30, '#ffd35a'], [28, -26, '#ff6b9d'], [-32, 8, '#5eead4'], [34, 12, '#8ab4ff'], [-14, 34, '#ffd35a'], [10, -36, '#fff'], [26, 32, '#ff9f43'], [-34, -8, '#c4a1ff']];
  btn.innerHTML = '<i class="fa-solid fa-trophy"></i><span class="lbSh"></span><span class="lbSp s1"></span><span class="lbSp s2"></span><span class="lbSp s3"></span><span class="lbSp s4"></span>' +
    dots.map((d, i) => `<span class="lbDot${i % 2 ? ' sq' : ''}" style="--x:${d[0]}px;--y:${d[1]}px;--c:${d[2]};--r:${(i * 70) % 360}deg;--d:${(i * 0.09).toFixed(2)}s"></span>`).join('');

  const modal = document.createElement('div');
  modal.id = 'lbModal';
  modal.innerHTML = `<div id="lbBox" role="dialog" aria-modal="true" aria-label="Bảng xếp hạng">
    <div id="lbHead">
      <div id="lbCrest"><i class="fa-solid fa-trophy"></i></div>
      <div id="lbTitle"><h2>Bảng xếp hạng</h2><p id="lbSub">Top 50 người chơi</p></div>
      <button class="lbIcoBtn" id="lbRefresh" type="button" title="Tải lại"><i class="fa-solid fa-rotate"></i></button>
      <button class="lbIcoBtn" id="lbClose" type="button" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div id="lbPick"><button id="lbCur" type="button" aria-haspopup="listbox"><span id="lbCurName"></span><i class="fa-solid fa-chevron-down"></i></button><div id="lbMenu" role="listbox"></div></div>
    <div id="lbScroll"><div id="lbNote"></div><div id="lbPodium"></div><div id="lbList"></div></div>
    <div id="lbMe">
      <div class="lbAv" id="lbMeAv"></div>
      <div id="lbMeInfo"><div id="lbMeName"><span></span><button id="lbEditBtn" type="button" title="Đổi biệt danh"><i class="fa-solid fa-pen"></i></button></div><div id="lbMeSub"></div></div>
      <div id="lbMeRank"><div>Hạng</div><div id="lbMeRk">—</div></div>
      <div id="lbEdit"><input id="lbName" maxlength="20" placeholder="Biệt danh của bạn"><button class="ok" id="lbSave" type="button">Lưu</button><button class="lbIcoBtn" id="lbCancel" type="button" title="Hủy"><i class="fa-solid fa-xmark"></i></button></div>
    </div></div>`;
  document.body.appendChild(btn);
  document.body.appendChild(modal);

  const $ = id => document.getElementById(id);
  const games = Scores.games;
  let current = games[0].id, token = 0;
  try { current = localStorage.getItem('lb_last_game') || current; } catch (e) {}
  if (!games.some(g => g.id === current)) current = games[0].id;

  // màu avatar cố định theo tên
  const PAL = [['#7c8cff', '#4b57d6'], ['#ff8fa3', '#d6406a'], ['#5eead4', '#1e9c88'], ['#ffb86b', '#d9731f'], ['#c4a1ff', '#7a45d6'], ['#7dd87f', '#2e9a3c'], ['#6bc8ff', '#1f7fc4'], ['#ff9d6b', '#cf4a28']];
  function avatar(name, cls) {
    let h = 0; for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    const p = PAL[h % PAL.length], el = document.createElement('div');
    el.className = 'lbAv' + (cls ? ' ' + cls : ''); el.style.setProperty('--a', p[0]); el.style.setProperty('--b', p[1]);
    el.textContent = (Array.from(name.trim())[0] || '?').toUpperCase();
    return el;
  }
  const fmt = v => Scores.format(current, v);

  // ---------- Chọn game ----------
  function buildMenu() {
    const menu = $('lbMenu'); menu.innerHTML = '';
    games.forEach(g => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'option');
      b.className = g.id === current ? 'on' : '';
      b.innerHTML = '<i class="fa-solid fa-check"></i><span></span>'; b.lastChild.textContent = g.name;
      b.onclick = () => { current = g.id; try { localStorage.setItem('lb_last_game', current); } catch (e) {} $('lbPick').classList.remove('open'); syncCur(); buildMenu(); load(); };
      menu.appendChild(b);
    });
    $('lbCurName').textContent = (games.find(g => g.id === current) || {}).name || '';
  }
  const syncCur = () => { $('lbCurName').textContent = (games.find(g => g.id === current) || {}).name || ''; };
  $('lbCur').onclick = () => $('lbPick').classList.toggle('open');

  // ---------- Tải và vẽ ----------
  function skeleton() {
    $('lbPodium').innerHTML = '';
    $('lbList').innerHTML = Array.from({ length: 6 }, () => '<div class="lbSkel"></div>').join('');
  }
  async function load() {
    const my = ++token;
    $('lbNote').style.display = 'none';
    skeleton();
    const res = await Scores.top(current, 50);
    if (my !== token) return;   // người dùng đã chuyển game khác
    render(res);
  }
  function render(res) {
    const pod = $('lbPodium'), list = $('lbList'), note = $('lbNote');
    pod.innerHTML = ''; list.innerHTML = '';
    const myName = Scores.getName();
    const isMe = s => s.me || (!res.online && s.name === myName);
    if (!res.online) { note.style.display = 'block'; note.innerHTML = '<i class="fa-solid fa-wifi"></i>&nbsp; Không kết nối được mạng: đang xem điểm lưu trên máy này.'; }
    $('lbSub').textContent = res.online ? 'Top 50 người chơi' : 'Điểm trên máy này';
    const S = res.scores;
    if (!S.length) {
      list.innerHTML = '<div class="lbEmpty"><i class="fa-solid fa-ranking-star"></i>Chưa có ai trên bảng này.<br>Hãy chơi để ghi tên bạn lên đầu bảng!</div>';
    } else {
      // bục top 3 (thứ tự hiển thị: hạng 2, 1, 3)
      [1, 0, 2].forEach(i => {
        const s = S[i]; if (!s) { pod.appendChild(document.createElement('div')); return; }
        const d = document.createElement('div'); d.className = `lbPod p${i + 1}` + (isMe(s) ? ' me' : '');
        if (i === 0) d.innerHTML = '<i class="fa-solid fa-crown lbCrown"></i>';
        d.appendChild(avatar(s.name));
        const n = document.createElement('div'); n.className = 'lbPodName'; n.textContent = s.name; d.appendChild(n);
        const sc = document.createElement('div'); sc.className = 'lbPodScore'; sc.textContent = fmt(s.score); d.appendChild(sc);
        const step = document.createElement('div'); step.className = 'lbStep'; step.textContent = i + 1; d.appendChild(step);
        pod.appendChild(d);
      });
      const max = S[0].score || 1;
      S.slice(3).forEach((s, k) => {
        const row = document.createElement('div'); row.className = 'lbRow' + (isMe(s) ? ' me' : ''); row.style.setProperty('--i', k);
        const bar = document.createElement('div'); bar.className = 'bar'; bar.style.setProperty('--w', Math.max(6, s.score / max * 100) + '%');
        const rk = document.createElement('div'); rk.className = 'lbRk'; rk.textContent = k + 4;
        const nm = document.createElement('div'); nm.className = 'lbNm'; nm.textContent = s.name;
        if (isMe(s)) { const t = document.createElement('small'); t.textContent = 'BẠN'; nm.appendChild(t); }
        const sc = document.createElement('div'); sc.className = 'lbSc'; sc.textContent = fmt(s.score);
        row.append(bar, rk, avatar(s.name), nm, sc); list.appendChild(row);
      });
    }
    // thẻ của bạn
    const idx = S.findIndex(isMe), local = Scores.localTop(current, 1)[0];
    $('lbMeRk').textContent = idx >= 0 ? '#' + (idx + 1) : '—';
    const best = idx >= 0 ? S[idx].score : (local ? local.score : null);
    $('lbMeSub').innerHTML = best != null ? `Điểm cao nhất: <b>${fmt(best)}</b>` : 'Bạn chưa chơi game này';
    if (idx < 0 && local && res.online) $('lbMeSub').innerHTML += ' · ngoài top 50';
  }
  function renderMe() {
    const name = Scores.hasName() ? Scores.getName() : 'Người chơi';
    $('lbMeName').firstElementChild.textContent = name;
    const av = avatar(name); $('lbMeAv').replaceWith(av); av.id = 'lbMeAv';
  }

  // ---------- Mở / đóng / đổi tên ----------
  function open() {
    modal.classList.add('show'); $('lbMe').classList.remove('editing'); $('lbPick').classList.remove('open');
    renderMe(); syncCur(); buildMenu(); load();
  }
  function close() { modal.classList.remove('show'); }
  btn.onclick = open;
  $('lbClose').onclick = close;
  modal.addEventListener('click', e => { if (e.target === modal) close(); else if (!e.target.closest('#lbPick')) $('lbPick').classList.remove('open'); });
  $('lbRefresh').onclick = () => { const i = $('lbRefresh').firstElementChild; i.style.transition = 'transform .6s'; i.style.transform = 'rotate(360deg)'; setTimeout(() => { i.style.transition = 'none'; i.style.transform = ''; }, 650); load(); };
  $('lbEditBtn').onclick = () => { $('lbMe').classList.add('editing'); $('lbName').value = Scores.hasName() ? Scores.getName() : ''; setTimeout(() => $('lbName').focus(), 30); };
  $('lbCancel').onclick = () => $('lbMe').classList.remove('editing');
  $('lbSave').onclick = () => {
    const v = $('lbName').value;
    if (!v.trim()) return;
    Scores.setName(v);
    $('lbMe').classList.remove('editing'); renderMe();
    setTimeout(load, 700);   // chờ máy chủ cập nhật tên rồi tải lại
  };
  $('lbName').addEventListener('keydown', e => { if (e.key === 'Enter') $('lbSave').click(); if (e.key === 'Escape') { e.stopPropagation(); $('lbCancel').click(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('show')) close(); });
})();
