// Đèn kéo quân - lõi luật (không đụng tới giao diện). Dùng chung cho game và công cụ kiểm màn (tool/denkeoquan-solver.js).
//
// Bản đồ: '#' tường, '.' sàn, 'S' xuất phát, 'E' cửa trăng (đích),
//         'a'..'c' bệ đạp, 'A'..'C' cửa cùng màu (mở khi có ai đứng trên bệ cùng chữ, hoặc có ai đang đứng trong ô cửa).
// Hành động: 'U','D','L','R' đi 1 ô, 'W' đứng chờ.
// Mỗi nhịp: trạng thái cửa tính theo vị trí ĐẦU nhịp, rồi mọi người cùng đi. Bị chặn thì đứng yên (bóng thì "vấp").
(function (root) {
  'use strict';

  const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0], W: [0, 0] };

  function parse(level) {
    const rows = level.map;
    const h = rows.length, w = rows[0].length;
    let start = null, exit = null;
    for (let y = 0; y < h; y++) {
      if (rows[y].length !== w) throw new Error(level.name + ': dòng ' + y + ' lệch độ dài');
      for (let x = 0; x < w; x++) {
        const c = rows[y][x];
        if (c === 'S') start = [x, y];
        if (c === 'E') exit = [x, y];
      }
    }
    if (!start || !exit) throw new Error(level.name + ': thiếu S hoặc E');
    return { w, h, rows, start, exit, loop: level.loop, maxShadows: level.maxShadows };
  }

  const cell = (g, x, y) => (x < 0 || y < 0 || x >= g.w || y >= g.h) ? '#' : g.rows[y][x];
  const isGate = c => c >= 'A' && c <= 'C';
  const isPlate = c => c >= 'a' && c <= 'c';

  // Những chữ cửa đang mở với các vị trí cho trước.
  function openLetters(g, positions) {
    const open = {};
    for (const [x, y] of positions) {
      const c = cell(g, x, y);
      if (isPlate(c)) open[c.toUpperCase()] = true;
    }
    return open;
  }

  function passable(g, x, y, open, positions) {
    const c = cell(g, x, y);
    if (c === '#') return false;
    if (isGate(c)) {
      if (open[c]) return true;
      for (const [px, py] of positions) if (px === x && py === y) return true; // không đóng cửa lên người
      return false;
    }
    return true;
  }

  // Một nhịp: positions[i] đi theo actions[i]. Trả về { next, bumped[] }.
  function step(g, positions, actions) {
    const open = openLetters(g, positions);
    const next = [], bumped = [];
    for (let i = 0; i < positions.length; i++) {
      const [x, y] = positions[i];
      const d = DIRS[actions[i] || 'W'];
      const nx = x + d[0], ny = y + d[1];
      if ((d[0] || d[1]) && !passable(g, nx, ny, open, positions)) {
        next.push([x, y]); bumped.push(true);
      } else {
        next.push([nx, ny]); bumped.push(false);
      }
    }
    return { next, bumped };
  }

  // Mô phỏng một vòng: các bóng (mảng chuỗi hành động) + chuỗi hành động của người chơi.
  // Trả về các khung (frames) từ nhịp 0, và nhịp thắng (nếu có).
  function simulate(g, shadows, moves) {
    const n = shadows.length;
    let pos = [];
    for (let i = 0; i <= n; i++) pos.push(g.start.slice());
    const frames = [{ pos, bumped: new Array(n + 1).fill(false), open: openLetters(g, pos) }];
    let win = -1;
    for (let t = 0; t < moves.length; t++) {
      const acts = shadows.map(s => s[t] || 'W');
      acts.push(moves[t]);
      const r = step(g, pos, acts);
      pos = r.next;
      frames.push({ pos, bumped: r.bumped, open: openLetters(g, pos) });
      const me = pos[n];
      if (me[0] === g.exit[0] && me[1] === g.exit[1]) { win = t + 1; break; }
    }
    return { frames, win };
  }

  function stars(level, shadowsUsed, totalSteps) {
    let s = 1;
    if (shadowsUsed <= level.par.shadows) s = 2;
    if (s === 2 && totalSteps <= level.par.steps) s = 3;
    return s;
  }

  const api = { DIRS, parse, cell, isGate, isPlate, openLetters, passable, step, simulate, stars };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DKQ = api;
})(this);
