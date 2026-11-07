/* Thách đấu lại (rematch) cho các game trực tuyến: đối thủ bấm "Ván mới" thì mình KHÔNG bị kéo vào ván mới.
 * Thay vào đó: bên bấm gửi lời thách đấu, bên kia thấy popup treo ở trên cùng màn hình (kèm tiếng báo) và chọn Đồng ý / Từ chối.
 * Chỉ khi Đồng ý, khoá "round" của phòng mới đổi và hai bên cùng sang ván mới.
 *
 * Dữ liệu thêm trong phòng: rematch = { by: 'host'|'guest', g: 'gN', s: 0|1 }
 *   by = người thách đấu, g = ván mới (đã được người thách tạo sẵn trong rounds/gN), s: 0 = đang hỏi, 1 = đã bị từ chối.
 *
 * Dùng: const RM = Rematch.create({ game, http, path, tree, round, role, oppName, newRound, onWait, toast });
 *   RM.ask() khi bấm nút ván mới; RM.onTree() gọi mỗi lần dữ liệu phòng đổi; RM.reset() khi rời phòng/bắt đầu phòng mới.
 *   http(method, path, body) trả Promise; path() = đường dẫn phòng (không có .json), vd '/caro_rooms/ABCDE';
 *   newRound(curRoundObj, nextKey) = nội dung rounds/{nextKey}. */
(function () {
  'use strict';
  var ASK_MS = 30000;          // chờ phản hồi tối đa 30 giây
  var el = null, ac = null, hideT = 0;

  function css() {
    if (document.getElementById('rmCss')) return;
    var s = document.createElement('style'); s.id = 'rmCss';
    s.textContent =
      '#rmBar{position:fixed;left:0;right:0;top:0;z-index:2147483000;display:flex;justify-content:center;padding:calc(10px + env(safe-area-inset-top)) 10px 0;pointer-events:none;transform:translateY(-130%);transition:transform .35s cubic-bezier(.2,.9,.3,1.2)}' +
      '#rmBar.show{transform:translateY(0)}' +
      '#rmBar .rmBox{pointer-events:auto;box-sizing:border-box;width:100%;max-width:520px;display:flex;align-items:center;gap:12px;padding:12px 14px;background:#fff;color:#1d1a1b;border:4px solid #3f3a3b;border-radius:12px;box-shadow:0 10px 28px rgba(0,0,0,.4);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
      '#rmBar .rmTx{flex:1;min-width:0;line-height:1.25}' +
      '#rmBar .rmL1{font-size:16px;font-weight:600;overflow-wrap:anywhere}' +
      '#rmBar .rmL1 b{font-weight:800}' +
      '#rmBar .rmL2{font-size:20px;font-weight:800;margin-top:4px;color:#b3261e}' +
      '#rmBar .rmBt{flex:none;width:52px;height:52px;padding:0;display:grid;place-items:center;border:4px solid #3f3a3b;border-radius:8px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
      '#rmBar .rmBt:active{transform:translateY(2px)}' +
      '#rmBar .rmBt:focus-visible{outline:3px solid #1a73e8;outline-offset:2px}' +
      '#rmBar .rmY{background:#6ee04a}#rmBar .rmN{background:#d42c1f}' +
      '#rmBar svg{width:28px;height:28px;stroke:#fff;fill:none;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round}' +
      '@media (prefers-reduced-motion:reduce){#rmBar{transition:none}}';
    document.head.appendChild(s);
  }

  function chime() {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      var t = ac.currentTime;
      [[880, 0], [1320, 0.16]].forEach(function (n) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, t + n[1]);
        g.gain.exponentialRampToValueAtTime(0.18, t + n[1] + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + n[1] + 0.34);
        o.connect(g); g.connect(ac.destination); o.start(t + n[1]); o.stop(t + n[1] + 0.36);
      });
    } catch (e) { /* trình duyệt chặn âm thanh: bỏ qua */ }
    try { if (navigator.vibrate) navigator.vibrate([80, 60, 80]); } catch (e) {}
  }

  function show(name, game, yes, no) {
    css();
    if (!el) {
      el = document.createElement('div'); el.id = 'rmBar';
      el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-live', 'assertive'); el.setAttribute('aria-label', 'Lời thách đấu');
      el.innerHTML =
        '<div class="rmBox"><div class="rmTx"><div class="rmL1"><b class="rmName"></b> muốn thách đấu bạn</div><div class="rmL2"></div></div>' +
        '<button type="button" class="rmBt rmY" aria-label="Đồng ý"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg></button>' +
        '<button type="button" class="rmBt rmN" aria-label="Từ chối"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button></div>';
      document.body.appendChild(el);
    }
    el.querySelector('.rmName').textContent = name;
    el.querySelector('.rmL2').textContent = game;
    el.setAttribute('aria-label', name + ' muốn thách đấu bạn ' + game);
    el.querySelector('.rmY').onclick = function () { hide(); yes(); };
    el.querySelector('.rmN').onclick = function () { hide(); no(); };
    void el.offsetWidth;
    el.classList.add('show');
    chime();
    clearTimeout(hideT); hideT = setTimeout(hide, ASK_MS);
  }
  function hide() { clearTimeout(hideT); if (el) el.classList.remove('show'); }

  function create(cfg) {
    var mine = null, mineT = 0, shownFor = null, busy = false;

    function nextKey(tree) {
      var max = 0, rs = (tree && tree.rounds) || {};
      Object.keys(rs).forEach(function (k) { var n = parseInt(k.slice(1), 10); if (n > max) max = n; });
      return 'g' + (max + 1);
    }
    function clearMine() { clearTimeout(mineT); mine = null; if (cfg.onWait) cfg.onWait(false); }
    function drop() { return cfg.http('PUT', cfg.path() + '/rematch', null).catch(function () {}); }

    async function accept(g) {
      var t = cfg.tree(), r = t && t.rematch;
      if (!r || r.g !== g || r.s !== 0) { cfg.toast('Lời thách đấu đã hết hạn.'); return; }   // bên kia đã huỷ: không kéo họ vào ván mới
      try {
        await cfg.http('PUT', cfg.path() + '/round', g);
        drop();
      } catch (e) { cfg.toast('Không bắt đầu được ván mới. Thử lại.'); }
    }
    function decline(r) {
      cfg.http('PUT', cfg.path() + '/rematch', { by: r.by, g: r.g, s: 1 }).catch(function () {});
    }

    return {
      ask: async function () {
        if (busy || mine) return;
        var t = cfg.tree(); if (!t) return;
        busy = true;
        var g = nextKey(t), cur = t.rounds && t.rounds[cfg.round()];
        try {
          try { await cfg.http('PUT', cfg.path() + '/rounds/' + g, cfg.newRound(cur, g)); } catch (e) { /* đã có */ }
          await cfg.http('PUT', cfg.path() + '/rematch', { by: cfg.role(), g: g, s: 0 });
          mine = { g: g }; if (cfg.onWait) cfg.onWait(true);
          cfg.toast('Đã gửi lời thách đấu. Đang chờ ' + cfg.oppName() + '...');
          mineT = setTimeout(function () { if (!mine) return; drop(); clearMine(); cfg.toast(cfg.oppName() + ' chưa trả lời. Bạn có thể thách đấu lại.'); }, ASK_MS);
        } catch (e) {
          cfg.toast('Chưa gửi được lời thách đấu. Thử lại sau.');
        } finally { busy = false; }
      },
      onTree: function () {
        var t = cfg.tree(), r = t && t.rematch;
        if (!r) { hide(); if (mine && t && t.round && parseInt(t.round.slice(1), 10) >= parseInt(mine.g.slice(1), 10)) clearMine(); return; }
        if (t.round === r.g) { hide(); if (mine) clearMine(); return; }       // đã đồng ý: hai bên cùng sang ván mới
        if (r.by === cfg.role()) {                                              // lời thách của mình
          if (r.s === 1 && mine) { clearMine(); drop(); cfg.toast(cfg.oppName() + ' đã từ chối thách đấu.'); }
          return;
        }
        if (r.s !== 0) { hide(); return; }                                      // mình đã từ chối
        if (mine) { var g = r.g; clearMine(); accept(g); return; }              // cả hai cùng muốn chơi lại: tự đồng ý
        if (shownFor === r.g) return;
        shownFor = r.g;
        show(cfg.oppName(), cfg.game, function () { accept(r.g); }, function () { decline(r); });
      },
      reset: function () { hide(); clearTimeout(mineT); mine = null; shownFor = null; busy = false; }
    };
  }

  window.Rematch = { create: create, hide: hide };
})();
