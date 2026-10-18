// Patch Note trên trang chủ: đọc patchnote.txt (sửa trực tiếp trên GitHub), hiển thị thành bảng thông báo.
// - Tự bật sau intro khi nội dung mới (mỗi bản 1 lần, theo @hienthi trong file); nút góc trên phải để xem lại.
// - Chỉ hỗ trợ một tập Markdown nhỏ; mọi HTML trong file đều bị escape.
(function () {
  'use strict';

  var FILE = 'patchnote.txt';
  var SEEN_KEY = 'patchnote:seen';

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Băm nội dung hiển thị (bỏ ghi chú) để biết đã có bản mới chưa
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function safeUrl(u) {
    // Chỉ cho http(s), mailto và đường dẫn tương đối; chặn javascript:, data:, ...
    if (/^(https?:\/\/|mailto:|\/|\.\/|\.\.\/|#)/i.test(u)) return u;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
    return null;
  }

  function inline(raw) {
    var keep = [];
    function hold(html) { keep.push(html); return '\u0000' + (keep.length - 1) + '\u0000'; }
    var s = esc(raw);
    s = s.replace(/`([^`]+)`/g, function (_, c) { return hold('<code>' + c + '</code>'); });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
      var url = safeUrl(u.replace(/&amp;/g, '&'));
      if (!url) return t;
      var ext = /^https?:/i.test(url);
      return hold('<a href="' + esc(url) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + t + '</a>');
    });
    s = s.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, function (u) {
      return hold('<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>');
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
    s = s.replace(/(^|[^*\w])\*([^*\s](?:[^*]*[^*\s])?)\*(?![*\w])/g, '$1<em>$2</em>');
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return keep[+i]; });
  }

  function parse(text) {
    var lines = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
    var mode = 'motlan', body = [], html = '';
    var para = [], quote = [], lists = [];

    lines.forEach(function (ln) {
      if (/^\s*\/\//.test(ln)) return;
      var d = /^\s*@hienthi\s*:\s*(\S+)/i.exec(ln);
      if (d) { mode = d[1].toLowerCase(); return; }
      body.push(ln);
    });

    function flushPara() {
      if (para.length) html += '<p>' + para.join('<br>') + '</p>';
      para = [];
    }
    function flushQuote() {
      if (quote.length) html += '<blockquote>' + quote.join('<br>') + '</blockquote>';
      quote = [];
    }
    function closeLists(toIndent) {
      while (lists.length && lists[lists.length - 1].indent > toIndent) {
        html += '</li></' + lists.pop().tag + '>';
      }
    }
    function flushAll() { flushPara(); flushQuote(); closeLists(-1); }

    body.forEach(function (ln) {
      var line = ln.replace(/\t/g, '  ');
      var m;
      if (!line.trim()) { flushAll(); return; }

      if ((m = /^\s*(#{1,3})\s+(.*)$/.exec(line))) {
        flushAll();
        var lv = m[1].length + 1;
        html += '<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>';
        return;
      }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flushAll(); html += '<hr>'; return; }
      if ((m = /^\s*>\s?(.*)$/.exec(line))) {
        flushPara(); closeLists(-1);
        quote.push(inline(m[1]));
        return;
      }
      if ((m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line))) {
        flushPara(); flushQuote();
        var indent = m[1].length, tag = /\d/.test(m[2]) ? 'ol' : 'ul';
        closeLists(indent);
        var top = lists[lists.length - 1];
        if (top && top.indent === indent && top.tag !== tag) { html += '</li></' + lists.pop().tag + '>'; top = lists[lists.length - 1]; }
        if (!top || indent > top.indent) {
          lists.push({ tag: tag, indent: indent });
          html += '<' + tag + '><li>';
        } else {
          html += '</li><li>';
        }
        html += inline(m[3]);
        return;
      }
      if (lists.length && /^\s+\S/.test(line)) { html += '<br>' + inline(line.trim()); return; }
      flushQuote(); closeLists(-1);
      para.push(inline(line.trim()));
    });
    flushAll();

    var visible = body.join('\n').trim();
    return { mode: mode, html: html, empty: !visible, id: hash(visible) };
  }

  var CSS = '' +
    '#pn-btn{position:fixed;top:calc(24px + env(safe-area-inset-top,0px));right:calc(24px + env(safe-area-inset-right,0px));z-index:1000;' +
      'width:50px;height:50px;border-radius:10px;border:5px solid rgba(255,255,255,.15);background:rgba(20,25,40,.75);' +
      '-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);color:#fff;font-size:19px;cursor:pointer;display:flex;' +
      'align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(0,0,0,.4);transition:transform .2s,background .2s;padding:0}' +
    '#pn-btn[hidden]{display:none}#pn-btn:hover{transform:scale(1.06);background:rgba(40,50,80,.85)}#pn-btn:active{transform:scale(.92)}' +
    '#pn-btn .pn-dot{position:absolute;top:-7px;right:-7px;width:12px;height:12px;border-radius:50%;background:#ff4d6d;' +
      'box-shadow:0 0 0 3px rgba(10,14,23,.9);animation:pnPulse 1.6s ease-in-out infinite}' +
    '@keyframes pnPulse{50%{transform:scale(1.35);opacity:.7}}' +
    '#pn-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;' +
      'padding:calc(16px + env(safe-area-inset-top,0px)) calc(16px + env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) calc(16px + env(safe-area-inset-left,0px));' +
      'background:rgba(4,6,12,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .25s ease}' +
    '#pn-overlay.pn-open{opacity:1}' +
    '#pn-card{width:min(560px,100%);max-height:100%;display:flex;flex-direction:column;color:#e8ecf6;border-radius:18px;' +
      'background:linear-gradient(160deg,rgba(30,36,60,.97),rgba(13,17,30,.97));border:1px solid rgba(255,255,255,.14);' +
      'box-shadow:0 24px 64px rgba(0,0,0,.55);transform:translateY(14px) scale(.97);transition:transform .25s ease;overflow:hidden}' +
    '.pn-open #pn-card{transform:none}' +
    '#pn-head{display:flex;align-items:center;gap:10px;padding:14px 14px 12px 20px;border-bottom:1px solid rgba(255,255,255,.08)}' +
    '#pn-title{margin:0;font:700 13px/1 "Exo 2","Segoe UI",sans-serif;letter-spacing:2.5px;text-transform:uppercase;color:#8cc0ff}' +
    '#pn-x{margin-left:auto;width:36px;height:36px;border-radius:10px;border:0;background:rgba(255,255,255,.07);color:#cfd6e6;font-size:20px;line-height:1;cursor:pointer}' +
    '#pn-x:hover{background:rgba(255,255,255,.15);color:#fff}' +
    '#pn-body{overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:4px 22px 10px;' +
      'font:15px/1.6 "Quicksand","Segoe UI",system-ui,sans-serif;word-wrap:break-word}' +
    '#pn-body h2{margin:14px 0 6px;font:700 22px/1.25 "Exo 2","Segoe UI",sans-serif;color:#fff}' +
    '#pn-body h3{margin:16px 0 4px;font:700 17px/1.3 "Exo 2","Segoe UI",sans-serif;color:#ffd166}' +
    '#pn-body h4{margin:12px 0 2px;font:700 15px/1.3 "Exo 2","Segoe UI",sans-serif;color:#9fd3ff}' +
    '#pn-body p{margin:6px 0}#pn-body ul,#pn-body ol{margin:4px 0 8px;padding-left:22px}#pn-body li{margin:3px 0}' +
    '#pn-body li::marker{color:#7fb4ff}#pn-body strong{color:#fff}' +
    '#pn-body blockquote{margin:8px 0;padding:8px 12px;border-left:3px solid #7fb4ff;background:rgba(127,180,255,.08);border-radius:0 10px 10px 0;color:#cfdcf5}' +
    '#pn-body code{font:13px ui-monospace,Consolas,monospace;background:rgba(255,255,255,.09);padding:1px 6px;border-radius:6px}' +
    '#pn-body hr{border:0;height:1px;background:rgba(255,255,255,.12);margin:16px 0}#pn-body a{color:#8cc8ff}' +
    '#pn-foot{display:flex;justify-content:flex-end;padding:12px 18px 16px;border-top:1px solid rgba(255,255,255,.08)}' +
    '#pn-ok{font:700 14px "Exo 2","Segoe UI",sans-serif;letter-spacing:.5px;padding:10px 24px;border:0;border-radius:12px;color:#fff;cursor:pointer;' +
      'background:linear-gradient(135deg,#4f8cff,#7a5cff);box-shadow:0 6px 18px rgba(80,110,255,.35)}#pn-ok:hover{filter:brightness(1.1)}' +
    '#pn-btn:focus-visible,#pn-x:focus-visible,#pn-ok:focus-visible{outline:2px solid #8cc0ff;outline-offset:2px}' +
    '@media (max-width:480px){#pn-body{font-size:14px;padding:2px 16px 8px}#pn-body h2{font-size:19px}#pn-head{padding-left:16px}}' +
    '@media (max-height:500px){#pn-head{padding:8px 10px 8px 16px}#pn-x{width:32px;height:32px}#pn-foot{padding:8px 14px}#pn-ok{padding:8px 20px}#pn-body h2{font-size:18px;margin-top:8px}}' +
    '@media (prefers-reduced-motion:reduce){#pn-overlay,#pn-card{transition:none}#pn-btn .pn-dot{animation:none}}';

  var note = null, btn = null, overlay = null, lastFocus = null;

  function load() {
    return fetch(FILE + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(parse);
  }

  function markSeen() {
    if (!note) return;
    store(SEEN_KEY, note.id);
    var dot = btn && btn.querySelector('.pn-dot');
    if (dot) dot.remove();
  }

  function ensureButton() {
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'pn-btn';
      btn.type = 'button';
      btn.title = 'Patch Note – nội dung bản cập nhật';
      btn.setAttribute('aria-label', 'Xem Patch Note');
      btn.innerHTML = '<i class="fa-solid fa-scroll" aria-hidden="true"></i>';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        open();
        load().then(function (n) {
          if (!overlay || n.empty || n.id === note.id) return;
          note = n;
          overlay.querySelector('#pn-body').innerHTML = n.html;
          markSeen();
        }).catch(function () {});
      });
      document.body.appendChild(btn);
    }
    btn.hidden = note.empty;
    if (!note.empty && store(SEEN_KEY) !== note.id && !btn.querySelector('.pn-dot')) {
      btn.insertAdjacentHTML('beforeend', '<span class="pn-dot" aria-hidden="true"></span>');
    }
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab' || !overlay) return;
    var f = overlay.querySelectorAll('button, a[href]');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open() {
    if (overlay || !note || note.empty) return;
    lastFocus = document.activeElement;
    overlay = document.createElement('div');
    overlay.id = 'pn-overlay';
    overlay.innerHTML =
      '<div id="pn-card" role="dialog" aria-modal="true" aria-labelledby="pn-title">' +
        '<div id="pn-head"><h2 id="pn-title">📋 Patch Note</h2>' +
          '<button id="pn-x" type="button" aria-label="Đóng">×</button></div>' +
        '<div id="pn-body"></div>' +
        '<div id="pn-foot"><button id="pn-ok" type="button">Đã hiểu</button></div>' +
      '</div>';
    overlay.querySelector('#pn-body').innerHTML = note.html;
    // Chặn click lan ra trang (trang chủ đóng thanh game khi click ra ngoài)
    overlay.addEventListener('click', function (e) {
      e.stopPropagation();
      if (e.target === overlay || e.target.id === 'pn-x' || e.target.id === 'pn-ok') close();
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (overlay) overlay.classList.add('pn-open'); }); });
    overlay.querySelector('#pn-ok').focus({ preventScroll: true });
    markSeen();
  }

  function close() {
    if (!overlay) return;
    var el = overlay;
    overlay = null;
    document.removeEventListener('keydown', onKey, true);
    el.classList.remove('pn-open');
    setTimeout(function () { el.remove(); }, 260);
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  // Đợi intro kết thúc (overlay intro bị gỡ khỏi trang) rồi mới tự bật
  function afterIntro(cb) {
    if (!document.getElementById('intro-overlay')) { cb(); return; }
    var mo = new MutationObserver(function () {
      if (document.getElementById('intro-overlay')) return;
      mo.disconnect();
      cb();
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function start() {
    var st = document.createElement('style');
    st.id = 'pn-style';
    st.textContent = CSS;
    document.head.appendChild(st);

    load().then(function (n) {
      note = n;
      ensureButton();
      if (n.empty || n.mode === 'tat') return;
      if (n.mode !== 'moilan' && store(SEEN_KEY) === n.id) return;
      afterIntro(function () { setTimeout(open, 600); });
    }).catch(function () { /* không đọc được file (mở offline / file://) → bỏ qua */ });
  }

  window.PatchNote = {
    open: function () { if (note) open(); },
    close: close,
    parse: parse
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
