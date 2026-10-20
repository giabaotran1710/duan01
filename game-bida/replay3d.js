/* =========================================================
   REPLAY 3D (three.js) — dựng lại bàn bida và phát lại cú đánh đã ghi như truyền hình:
   1. Góc nhìn thứ nhất: mắt người đánh sau cây cơ; cơ ngắm, thụt rồi đánh đúng điểm đặt đầu cơ (áp phê, culê, retro).
   2. Bám bi: camera bay theo bi quan trọng (bi rơi lỗ / bi cái ghi điểm), quay chậm lúc bi vào lỗ hay ghi điểm.
   3. Toàn cảnh: máy quay chính nhìn chéo từ cạnh bàn, lia nhẹ tới khi bi dừng.
   Cả replay phát chậm hơn thật một chút để dễ xem.
   Toạ độ: x của bàn → X, y của bàn → Z, chiều cao → Y (đơn vị: điểm ảnh ảo của bàn, tâm bàn ở gốc).
   ========================================================= */

import * as THREE from "./vendor/three.module.min.js";

const PRELUDE = 1.8;    // giây: cơ ngắm (3 nhịp thụt), lấy đà, đánh
const HOLD = 1.2;       // giây giữ khung cuối
const BASE = 0.8;       // tốc độ phát thường (chậm hơn thật một chút)
const SLOW = 0.3;       // tốc độ quay chậm lúc bi vào lỗ / ghi điểm
const TAIL = 0.9;       // tốc độ đoạn cuối (bi chạy nốt rồi dừng)
const MAX_LEN = 16;     // giây: replay dài nhất
const UP = new THREE.Vector3(0, 1, 0);

export function createReplayPlayer(canvas, env){
  return new ReplayPlayer(canvas, env);
}

const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function makeCanvas(w, h){
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function canvasTexture(cv){
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Điểm trên cung tròn (toạ độ bàn, y hướng xuống) từ góc a0 tới a1
function arc(cx, cy, r, a0, a1, n){
  const out = [];
  for(let i = 0; i <= n; i++){
    const a = a0 + (a1 - a0) * i / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

function roundRectPts(x0, y0, x1, y1, r){
  return [
    ...arc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, 8),
    ...arc(x1 - r, y0 + r, r, Math.PI * 1.5, Math.PI * 2, 8),
    ...arc(x1 - r, y1 - r, r, 0, Math.PI * 0.5, 8),
    ...arc(x0 + r, y1 - r, r, Math.PI * 0.5, Math.PI, 8)
  ];
}

class ReplayPlayer{
  constructor(canvas, env){
    this.env = env;
    this.R = env.BALL_R;

    const T = env.table;
    this.cx = T.x + T.w / 2;
    this.cz = T.y + T.h / 2;

    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;

    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color(0x030604);
    s.fog = new THREE.Fog(0x030604, 2800, 6500);

    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 4, 14000);

    // Đèn treo trên bàn như phòng thi đấu: sáng từ trên xuống, chếch trái; đèn phụ ấm phía đối diện
    s.add(new THREE.HemisphereLight(0xeafff0, 0x1c1208, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 2.3);
    key.position.set(-320, 1500, -380);
    s.add(key);
    const fill = new THREE.DirectionalLight(0xffe0b0, 0.8);
    fill.position.set(760, 700, 900);
    s.add(fill);

    this.tables = {};
    this.ballGeo = new THREE.SphereGeometry(this.R, 40, 28);
    this.ballMats = {};
    this.ballMeshes = [];
    this.shadowMeshes = [];
    this.shadowMat = new THREE.MeshBasicMaterial({ map: this.makeShadowTexture(), transparent: true, depthWrite: false });
    this.shadowGeo = new THREE.CircleGeometry(this.R * 1.4, 28).rotateX(-Math.PI / 2);

    this.cue = this.makeCue();
    s.add(this.cue);
    s.add(this.makeFloor());

    this.raf = 0;
    this.clip = null;
    this.hooks = {};
    this.resize();
  }

  /* ---------- toạ độ ---------- */

  v3(x, y, h = 0){
    return new THREE.Vector3(x - this.cx, h, y - this.cz);
  }

  shapeOf(pts){
    const sh = new THREE.Shape();
    pts.forEach(([x, y], i) => {
      const u = x - this.cx;
      const v = -(y - this.cz);
      if(i) sh.lineTo(u, v);
      else sh.moveTo(u, v);
    });
    sh.closePath();
    return sh;
  }

  pathOf(pts){
    const p = new THREE.Path();
    pts.forEach(([x, y], i) => {
      const u = x - this.cx;
      const v = -(y - this.cz);
      if(i) p.lineTo(u, v);
      else p.moveTo(u, v);
    });
    p.closePath();
    return p;
  }

  // Hình phẳng vẽ theo toạ độ bàn → nằm trên mặt Y = h, hoặc đùn lên cao `depth`
  flat(shape, mat, h = 0){
    const g = new THREE.ShapeGeometry(shape, 12).rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat);
    m.position.y = h;
    return m;
  }

  extrude(shape, depth, mats, y0 = 0){
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 12 }).rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mats);
    m.position.y = y0;
    return m;
  }

  /* ---------- bàn ---------- */

  // Mép mặt nỉ: hình chữ nhật bàn khoét các lỗ (cung tròn đi vào trong bàn)
  feltOutline(pool){
    const E = this.env;
    const T = E.table;
    const L = T.x, Tp = T.y, R = T.x + T.w, B = T.y + T.h, M = T.x + T.w / 2;

    if(!pool) return [[L, Tp], [R, Tp], [R, B], [L, B]];

    const rc = E.CORNER_POCKET_R;
    const rs = E.SIDE_POCKET_R;
    const so = this.sideOffset();
    const dx = Math.sqrt(rs * rs - so * so);
    const a = Math.atan2(so, dx);
    const PI = Math.PI;

    return [
      [L + rc, Tp], [M - dx, Tp],
      ...arc(M, Tp - so, rs, PI - a, a, 14),
      [R - rc, Tp],
      ...arc(R, Tp, rc, PI, PI / 2, 10),
      [R, B - rc],
      ...arc(R, B, rc, -PI / 2, -PI, 10),
      [M + dx, B],
      ...arc(M, B + so, rs, -a, -(PI - a), 14),
      [L + rc, B],
      ...arc(L, B, rc, 0, -PI / 2, 10),
      [L, Tp + rc],
      ...arc(L, Tp, rc, PI / 2, 0.02, 10)
    ];
  }

  // Lòng khung gỗ: hình chữ nhật bàn cộng các lỗ (cung tròn đi ra ngoài)
  woodHoleOutline(pool){
    const E = this.env;
    const T = E.table;
    const L = T.x, Tp = T.y, R = T.x + T.w, B = T.y + T.h, M = T.x + T.w / 2;

    if(!pool) return [[L, Tp], [R, Tp], [R, B], [L, B]];

    const rc = E.CORNER_POCKET_R;
    const rs = E.SIDE_POCKET_R;
    const so = this.sideOffset();
    const dx = Math.sqrt(rs * rs - so * so);
    const a = Math.atan2(so, dx);
    const PI = Math.PI;

    return [
      [L + rc, Tp], [M - dx, Tp],
      ...arc(M, Tp - so, rs, PI - a, 2 * PI + a, 22),
      [R - rc, Tp],
      ...arc(R, Tp, rc, PI, PI * 2.5, 20),
      [R, B - rc],
      ...arc(R, B, rc, -PI / 2, PI, 20),
      [M + dx, B],
      ...arc(M, B + so, rs, -a, PI + a, 22),
      [L + rc, B],
      ...arc(L, B, rc, 0, PI * 1.5, 20),
      [L, Tp + rc],
      ...arc(L, Tp, rc, PI / 2, PI * 2 - 0.02, 20)
    ];
  }

  sideOffset(){
    const tm = this.env.pockets.find(p => p.id === "tm");
    return tm ? this.env.table.y - tm.y : 8;
  }

  // Các đoạn băng cao su (giống drawCushionRails: miệng lỗ vát 0,62 độ dày)
  cushionPolys(pool){
    const E = this.env;
    const T = E.table;
    const c = E.CUSHION_THICKNESS;
    const L = T.x, Tp = T.y, R = T.x + T.w, B = T.y + T.h, M = T.x + T.w / 2;

    if(!pool){
      return [
        [[L, Tp], [R, Tp], [R - c, Tp + c], [L + c, Tp + c]],
        [[L, B], [R, B], [R - c, B - c], [L + c, B - c]],
        [[L, Tp], [L, B], [L + c, B - c], [L + c, Tp + c]],
        [[R, Tp], [R, B], [R - c, B - c], [R - c, Tp + c]]
      ];
    }

    const cg = E.CORNER_MOUTH;
    const sg = E.SIDE_MOUTH / 2;
    const bv = c * 0.62;

    return [
      [[L + cg, Tp], [M - sg, Tp], [M - sg - bv, Tp + c], [L + cg + bv, Tp + c]],
      [[M + sg, Tp], [R - cg, Tp], [R - cg - bv, Tp + c], [M + sg + bv, Tp + c]],
      [[L + cg, B], [M - sg, B], [M - sg - bv, B - c], [L + cg + bv, B - c]],
      [[M + sg, B], [R - cg, B], [R - cg - bv, B - c], [M + sg + bv, B - c]],
      [[L, Tp + cg], [L, B - cg], [L + c, B - cg - bv], [L + c, Tp + cg + bv]],
      [[R, Tp + cg], [R, B - cg], [R - c, B - cg - bv], [R - c, Tp + cg + bv]]
    ];
  }

  feltTexture(pool){
    const E = this.env;
    const T = E.table;
    const W = 1024;
    const H = Math.round(W * T.h / T.w);
    const cv = makeCanvas(W, H);
    const g = cv.getContext("2d");

    const rg = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.62);
    rg.addColorStop(0, "#26a65a");
    rg.addColorStop(0.7, "#178445");
    rg.addColorStop(1, "#0f6634");
    g.fillStyle = rg;
    g.fillRect(0, 0, W, H);

    // Sợi nỉ
    for(let i = 0; i < 9000; i++){
      g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.05)";
      g.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
    }

    const sx = x => (x - T.x) / T.w * W;
    const sy = y => (y - T.y) / T.h * H;
    const dot = (x, y) => {
      g.fillStyle = "rgba(255,255,255,.75)";
      g.beginPath();
      g.arc(sx(x), sy(y), 2.6, 0, Math.PI * 2);
      g.fill();
    };

    const midY = T.y + T.h / 2;
    dot(E.FOOT_SPOT_X, midY);
    dot(E.HEAD_STRING_X, midY);
    if(!pool) dot(T.x + T.w / 2, midY);

    return canvasTexture(cv);
  }

  woodTexture(){
    const cv = makeCanvas(1024, 256);
    const g = cv.getContext("2d");
    const lg = g.createLinearGradient(0, 0, 0, 256);
    lg.addColorStop(0, "#8f4f20");
    lg.addColorStop(0.5, "#6b3514");
    lg.addColorStop(1, "#4a220b");
    g.fillStyle = lg;
    g.fillRect(0, 0, 1024, 256);

    for(let i = 0; i < 70; i++){
      const y = Math.random() * 256;
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? "30,10,0" : "190,110,50"},${0.08 + Math.random() * 0.12})`;
      g.lineWidth = 0.6 + Math.random() * 1.8;
      g.beginPath();
      g.moveTo(0, y);
      for(let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 4);
      g.stroke();
    }

    const t = canvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / 700, 1 / 180);
    return t;
  }

  makeShadowTexture(){
    const cv = makeCanvas(64, 64);
    const g = cv.getContext("2d");
    const rg = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    rg.addColorStop(0, "rgba(0,0,0,.62)");
    rg.addColorStop(0.55, "rgba(0,0,0,.34)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  }

  makeFloor(){
    const cv = makeCanvas(512, 512);
    const g = cv.getContext("2d");
    const rg = g.createRadialGradient(256, 256, 10, 256, 256, 256);
    rg.addColorStop(0, "#173a22");
    rg.addColorStop(0.45, "#0a1a10");
    rg.addColorStop(1, "#030604");
    g.fillStyle = rg;
    g.fillRect(0, 0, 512, 512);

    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: canvasTexture(cv) })
    );
    m.position.y = -170;
    return m;
  }

  buildTable(mode){
    const pool = mode !== "carom";
    const E = this.env;
    const T = E.table;
    const c = E.CUSHION_THICKNESS;
    const L = T.x, Tp = T.y, R = T.x + T.w, B = T.y + T.h;
    const grp = new THREE.Group();

    // Mặt nỉ
    const feltTex = this.feltTexture(pool);
    feltTex.repeat.set(1 / T.w, 1 / T.h);
    feltTex.offset.set(0.5, 0.5);
    grp.add(this.flat(this.shapeOf(this.feltOutline(pool)), new THREE.MeshLambertMaterial({ map: feltTex })));

    // Băng cao su
    const cushTop = new THREE.MeshLambertMaterial({ color: 0x1f9a4e });
    const cushSide = new THREE.MeshLambertMaterial({ color: 0x147a3b });
    for(const poly of this.cushionPolys(pool)){
      grp.add(this.extrude(this.shapeOf(poly), 30, [cushTop, cushSide]));
    }

    // Khung gỗ (khoét đúng hình các lỗ), viền tối bên ngoài, thân bàn
    const woodTex = this.woodTexture();
    const woodTop = new THREE.MeshPhongMaterial({ map: woodTex, shininess: 55, specular: 0x3a2412 });
    const woodSide = new THREE.MeshPhongMaterial({ color: 0x4a220b, shininess: 30, specular: 0x1a0d05 });
    const dark = new THREE.MeshPhongMaterial({ color: 0x2c1408, shininess: 20, specular: 0x140a04 });

    const woodShape = this.shapeOf(roundRectPts(L - 52, Tp - 52, R + 52, B + 52, 44));
    woodShape.holes.push(this.pathOf(this.woodHoleOutline(pool)));
    grp.add(this.extrude(woodShape, 34, [woodTop, woodSide]));

    const rimShape = this.shapeOf(roundRectPts(L - 68, Tp - 68, R + 68, B + 68, 58));
    rimShape.holes.push(this.pathOf(roundRectPts(L - 51, Tp - 51, R + 51, B + 51, 43)));
    grp.add(this.extrude(rimShape, 26, dark));

    // Thân bàn dưới mặt nỉ (chừa chỗ các lỗ để nhìn xuống lòng lỗ vẫn thấy sâu)
    const body = this.shapeOf(roundRectPts(L - 60, Tp - 60, R + 60, B + 60, 50));
    if(pool){
      for(const p of E.pockets){
        const r = (p.type === "side" ? E.SIDE_POCKET_R : E.CORNER_POCKET_R) + 1;
        body.holes.push(this.pathOf(arc(p.x, p.y, r, 0, Math.PI * 2 - 0.05, 24)));
      }
    }
    grp.add(this.extrude(body, 150, dark, -151));

    // Kim cương trên khung gỗ
    const diaMat = new THREE.MeshLambertMaterial({ color: 0xf6e3a2, emissive: 0x3a3010 });
    const diaGeo = new THREE.PlaneGeometry(11, 11).rotateX(-Math.PI / 2).rotateY(Math.PI / 4);
    const playL = T.w - 2 * c;
    const playW = T.h - 2 * c;
    const addDia = (x, y) => {
      const d = new THREE.Mesh(diaGeo, diaMat);
      d.position.copy(this.v3(x, y, 34.4));
      grp.add(d);
    };
    for(let i = 1; i < 8; i++){
      if(i === 4) continue;
      const x = L + c + playL * i / 8;
      addDia(x, Tp - 27);
      addDia(x, B + 27);
    }
    for(let i = 1; i < 4; i++){
      const y = Tp + c + playW * i / 4;
      addDia(L - 27, y);
      addDia(R + 27, y);
    }

    // Lỗ: ống lót đen sâu xuống, đáy đen, vành da
    if(pool){
      const liner = new THREE.MeshLambertMaterial({ color: 0x060606, side: THREE.DoubleSide });
      const rimMat = new THREE.MeshPhongMaterial({ color: 0x151515, shininess: 40, specular: 0x333333 });

      for(const p of E.pockets){
        const r = p.type === "side" ? E.SIDE_POCKET_R : E.CORNER_POCKET_R;
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.4, r - 0.6, 130, 32, 1, true), liner);
        cyl.position.copy(this.v3(p.x, p.y, 35 - 65));
        grp.add(cyl);

        const bottom = new THREE.Mesh(new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2), liner);
        bottom.position.copy(this.v3(p.x, p.y, -94));
        grp.add(bottom);

        const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 1.5, 2.6, 8, 36).rotateX(Math.PI / 2), rimMat);
        ring.position.copy(this.v3(p.x, p.y, 34.2));
        grp.add(ring);
      }
    }

    return grp;
  }

  useTable(mode){
    const key = mode === "carom" ? "carom" : "pool";

    if(!this.tables[key]){
      this.tables[key] = this.buildTable(key);
      this.scene.add(this.tables[key]);
    }

    for(const k in this.tables) this.tables[k].visible = k === key;
  }

  /* ---------- bi ---------- */

  ballMaterial(meta, mode){
    const key = mode + ":" + meta.num;
    if(this.ballMats[key]) return this.ballMats[key];

    const W = 512;
    const H = 256;
    const cv = makeCanvas(W, H);
    const g = cv.getContext("2d");
    const color = meta.color || "#f4f1e6";
    const ivory = "#f7f4ea";

    const disc = (u, v, r, fill) => {
      g.fillStyle = fill;
      g.beginPath();
      g.ellipse(u * W, v * H, r, r, 0, 0, Math.PI * 2);
      g.fill();
    };

    if(mode !== "carom" && meta.num === 0){
      // Bi cái: chấm đỏ để thấy bi xoáy (như bi cái trên truyền hình)
      g.fillStyle = ivory;
      g.fillRect(0, 0, W, H);
      for(const u of [0, 0.25, 0.5, 0.75, 1]) disc(u, 0.5, 9, "#d4242b");
      g.fillStyle = "#d4242b";
      g.fillRect(0, 0, W, 7);
      g.fillRect(0, H - 7, W, 7);
    }else if(mode === "carom"){
      g.fillStyle = color;
      g.fillRect(0, 0, W, H);
      const shade = meta.num === 0 ? "#9a968a" : "rgba(0,0,0,.35)";
      for(const u of [0.25, 0.75]) disc(u, 0.5, 12, shade);
    }else{
      if(meta.type === "stripe"){
        g.fillStyle = ivory;
        g.fillRect(0, 0, W, H);
        g.fillStyle = color;
        g.fillRect(0, H * 0.26, W, H * 0.48);
      }else{
        g.fillStyle = color;
        g.fillRect(0, 0, W, H);
      }

      g.font = "900 40px Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";

      for(const u of [0.25, 0.75]){
        disc(u, 0.5, 34, ivory);
        g.fillStyle = "#111";
        g.fillText(String(meta.num), u * W, H * 0.5 + 2);
      }
    }

    const mat = new THREE.MeshPhongMaterial({ map: canvasTexture(cv), shininess: 120, specular: 0x666666 });
    this.ballMats[key] = mat;
    return mat;
  }

  // Hướng ban đầu của bi: số quay gần lên trên, xoay ngẫu nhiên nhưng cố định theo số bi
  initQuat(num){
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2 + Math.sin(num * 7.31) * 0.5);
    const yaw = new THREE.Quaternion().setFromAxisAngle(UP, (num * 2.39996) % (Math.PI * 2));
    return q.premultiply(yaw);
  }

  setupBalls(clip){
    const n = clip.n;

    while(this.ballMeshes.length < n){
      const m = new THREE.Mesh(this.ballGeo, null);
      const sh = new THREE.Mesh(this.shadowGeo, this.shadowMat);
      this.scene.add(m);
      this.scene.add(sh);
      this.ballMeshes.push(m);
      this.shadowMeshes.push(sh);
    }

    this.ballMeshes.forEach((m, i) => {
      m.visible = i < n;
      this.shadowMeshes[i].visible = i < n;
      if(i < n) m.material = this.ballMaterial(clip.meta[i], clip.mode);
    });

    // Hướng quay của từng bi ở mỗi khung: cộng dồn độ lăn (rx, ry) và xoáy đứng (sz) đã ghi
    const F = clip.times.length;
    const cur = clip.meta.map(m => this.initQuat(m.num));
    const axis = new THREE.Vector3();
    const qd = new THREE.Quaternion();
    this.Q = new Array(F);
    this.Q[0] = cur.map(q => q.clone());

    for(let k = 1; k < F; k++){
      const roll = clip.rolls[k];
      const row = new Array(n);

      for(let i = 0; i < n; i++){
        const dx = roll[i * 3];
        const dy = roll[i * 3 + 1];
        const dz = roll[i * 3 + 2];
        const d = Math.hypot(dx, dy);

        if(d > 1e-6){
          axis.set(dy / d, 0, -dx / d);
          cur[i].premultiply(qd.setFromAxisAngle(axis, d / this.R));
        }
        if(Math.abs(dz) > 1e-6) cur[i].premultiply(qd.setFromAxisAngle(UP, -dz));

        row[i] = cur[i].clone();
      }

      this.Q[k] = row;
    }

    // Bi rơi lỗ: thời điểm + lỗ
    this.pots = new Array(n).fill(null);
    for(const e of clip.events){
      if(e.k === "pot" && !this.pots[e.i]) this.pots[e.i] = e;
    }
  }

  frameAt(s){
    const t = this.clip.times;
    let lo = 0;
    let hi = t.length - 1;

    if(s <= t[0]) return [0, 0];
    if(s >= t[hi]) return [hi, 0];

    while(hi - lo > 1){
      const mid = (lo + hi) >> 1;
      if(t[mid] <= s) lo = mid;
      else hi = mid;
    }

    return [lo, (s - t[lo]) / Math.max(1e-6, t[lo + 1] - t[lo])];
  }

  posAt(i, s){
    const c = this.clip;
    const [k, f] = this.frameAt(s);
    const k2 = Math.min(k + 1, c.times.length - 1);
    return {
      x: c.xs[k][i] + (c.xs[k2][i] - c.xs[k][i]) * f,
      y: c.ys[k][i] + (c.ys[k2][i] - c.ys[k][i]) * f
    };
  }

  velAt(i, s){
    const a = this.posAt(i, Math.max(0, s - 3));
    const b = this.posAt(i, s);
    return { x: b.x - a.x, y: b.y - a.y };
  }

  updateBalls(s){
    const c = this.clip;
    const [k, f] = this.frameAt(s);
    const k2 = Math.min(k + 1, c.times.length - 1);
    const R = this.R;

    for(let i = 0; i < c.n; i++){
      const m = this.ballMeshes[i];
      const sh = this.shadowMeshes[i];
      const pot = this.pots[i];
      let x, y;
      let h = R;
      let shade = 1;

      if(pot && s >= pot.t){
        // Rơi lỗ: trôi nốt vào tâm lỗ rồi rơi xuống lòng lỗ
        const p0 = this.posAt(i, pot.t);
        const d = s - pot.t;
        const w = smooth(0, 12, d);
        const fx = p0.x + (pot.vx || 0) * Math.min(d, 6) * 0.7;
        const fy = p0.y + (pot.vy || 0) * Math.min(d, 6) * 0.7;
        x = fx + (pot.px - fx) * w;
        y = fy + (pot.py - fy) * w;
        h = R - 0.8 * d * d;
        shade = clamp01(1 - d / 5);

        if(h < -110){
          m.visible = false;
          sh.visible = false;
          continue;
        }
      }else if(!c.act[k][i] && !(pot && s < pot.t)){
        m.visible = false;
        sh.visible = false;
        continue;
      }else{
        x = c.xs[k][i] + (c.xs[k2][i] - c.xs[k][i]) * f;
        y = c.ys[k][i] + (c.ys[k2][i] - c.ys[k][i]) * f;
      }

      m.visible = true;
      m.position.copy(this.v3(x, y, h));
      m.quaternion.slerpQuaternions(this.Q[k][i], this.Q[k2][i], f);

      sh.visible = shade > 0.02;
      sh.position.copy(this.v3(x + 5, y + 8, 0.45));
      sh.scale.setScalar(0.6 + 0.4 * shade);
    }
  }

  /* ---------- cây cơ ---------- */

  makeCue(){
    const L = this.R * 24;
    const cv = makeCanvas(8, 1024);
    const g = cv.getContext("2d");
    const lg = g.createLinearGradient(0, 0, 0, 1024);
    lg.addColorStop(0, "#3a6fd8");
    lg.addColorStop(0.008, "#3a6fd8");
    lg.addColorStop(0.009, "#f4f1e6");
    lg.addColorStop(0.03, "#f4f1e6");
    lg.addColorStop(0.031, "#ecd09c");
    lg.addColorStop(0.55, "#d6a764");
    lg.addColorStop(0.6, "#9c5a24");
    lg.addColorStop(0.62, "#1b0b04");
    lg.addColorStop(0.63, "#c9a24a");
    lg.addColorStop(0.64, "#3a1606");
    lg.addColorStop(1, "#1d0903");
    g.fillStyle = lg;
    g.fillRect(0, 0, 8, 1024);
    g.fillStyle = "#c9a24a";
    for(const y of [700, 760, 940]) g.fillRect(0, y, 8, 5);

    const geo = new THREE.CylinderGeometry(3.1, 7.2, L, 20, 1);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, -L / 2);

    const cue = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ map: canvasTexture(cv), shininess: 70, specular: 0x555555 }));
    const grp = new THREE.Group();
    grp.add(cue);
    grp.visible = false;
    return grp;
  }

  updateCue(tau, s, show){
    if(!show){
      this.cue.visible = false;
      return;
    }

    const c = this.clip;
    const R = this.R;
    const i = c.cueIdx;
    const x0 = c.xs[0][i];
    const y0 = c.ys[0][i];
    const D = c.dir;
    const rx = -D.y;
    const ry = D.x;
    const tip = this.env.TIP_MAX;
    const a = (c.spin.x || 0) * tip * R;
    const h = (c.spin.y || 0) * tip * R;
    const depth = Math.sqrt(Math.max(0, R * R - a * a - h * h));

    // Điểm đầu cơ chạm bi: đúng điểm đặt trên bảng áp phê
    const hit = this.v3(x0 - D.x * depth + rx * a, y0 - D.y * depth + ry * a, R + h);
    const elev = 0.12 + Math.max(0, -(c.spin.y || 0)) * 0.08;
    const fwd = new THREE.Vector3(D.x * Math.cos(elev), -Math.sin(elev), D.y * Math.cos(elev));

    let gap;
    const back = 40 + c.power * 110;

    const aim = PRELUDE - 0.45;   // hết các nhịp thụt ngắm
    const swing = PRELUDE - 0.2;  // lấy đà xong, bắt đầu đẩy cơ

    if(tau < PRELUDE){
      if(tau < aim){
        gap = 30 + 14 * (1 - Math.cos(tau / 0.45 * Math.PI * 2)) / 2;
      }else if(tau < swing){
        const u = (tau - aim) / (swing - aim);
        gap = 30 + (back - 30) * (1 - (1 - u) * (1 - u));
      }else{
        const u = clamp01((tau - swing) / (PRELUDE - swing));
        gap = back * (1 - u * u);
      }
    }else{
      gap = -Math.min(28, s * 5);
    }

    this.cue.visible = true;
    this.cue.position.copy(hit).addScaledVector(fwd, -gap);
    this.cue.lookAt(this.cue.position.clone().add(fwd));
  }

  /* ---------- kịch bản phát ---------- */

  plan(clip){
    const t = clip.times;
    const T = t[t.length - 1];
    const tFirst = clip.tFirst >= 0 ? clip.tFirst : Math.min(T, 20);
    const tKey = clip.tKey >= 0 ? Math.max(clip.tKey, tFirst) : tFirst;
    // Phát tới khi bi dừng hẳn (tối đa 5 giây sau thời điểm then chốt)
    const tStop = Math.max(Math.min(T, tKey + 300), Math.min(T, tFirst + 40));

    // Quay chậm bắt đầu trước thời điểm then chốt (cú ăn quá gần thì chậm ngay từ lúc chạm)
    let slow0 = Math.max(0, Math.min(Math.max(tFirst + 3, tKey - 32), tKey - 6));
    let slow1 = Math.min(tStop, tKey + 22);
    if(slow1 - slow0 < 10){
      slow0 = Math.max(0, tKey - 14);
      slow1 = Math.min(tStop, tKey + 14);
    }

    // Đoạn cuối phát chậm vừa phải, nhưng cả replay không dài quá MAX_LEN giây
    const head = PRELUDE + slow0 / (60 * BASE) + (slow1 - slow0) / (60 * SLOW) + HOLD;
    const tail = Math.max(TAIL, (tStop - slow1) / (60 * Math.max(1.5, MAX_LEN - head)));

    this.segs = [];
    const add = (a, b, sp, slow = false) => {
      if(b > a) this.segs.push({ a, b, sp, slow, d: (b - a) / (60 * sp) });
    };
    add(0, slow0, BASE);
    add(slow0, slow1, SLOW, true);
    add(slow1, tStop, tail);

    this.tStop = tStop;
    this.total = PRELUDE + this.segs.reduce((n, g) => n + g.d, 0) + HOLD;

    // Lúc bi cái dừng hẳn (cú điều bi: bám bi cái tới gần lúc đó)
    this.cueStop = 0;
    for(let f = t.length - 1; f > 0; f--){
      const i = clip.cueIdx;
      if(Math.hypot(clip.xs[f][i] - clip.xs[f - 1][i], clip.ys[f][i] - clip.ys[f - 1][i]) > 0.3){
        this.cueStop = t[f];
        break;
      }
    }

    // Góc thứ nhất → bám bi (bắt đầu trước thời điểm then chốt để luôn thấy bi lăn tới) → toàn cảnh.
    // Bida lỗ: sang toàn cảnh ngay sau khi bi rơi, không đứng nhìn miệng lỗ trống.
    const chaseFrom = Math.max(18, Math.min(tFirst + 24, tKey - 30));
    let wideFrom = clip.mode !== "carom" && clip.keyPocket ? tKey + 24 : slow1 + 36;
    if(clip.focusCue) wideFrom = Math.max(wideFrom, this.cueStop - 30);
    wideFrom = Math.min(wideFrom, tStop);

    this.cuts = [{ from: -1, cam: "fpv" }];
    if(wideFrom - chaseFrom > 20) this.cuts.push({ from: chaseFrom, cam: "chase" });
    this.cuts.push({ from: wideFrom, cam: "wide" });

    // Bida lỗ: bám bi cái tới khi bi sẽ rơi lỗ bắt đầu chạy, rồi bám bi đó
    this.keyMove = Infinity;
    if(clip.mode !== "carom" && clip.keyIdx >= 0){
      const k = clip.keyIdx;
      for(let f = 1; f < t.length; f++){
        if(Math.hypot(clip.xs[f][k] - clip.xs[0][k], clip.ys[f][k] - clip.ys[0][k]) > 1){
          this.keyMove = t[f - 1];
          break;
        }
      }
    }

    this.tFirst = tFirst;
    this.tKey = tKey;
  }

  simAt(tau){
    if(tau < PRELUDE) return { s: 0, slow: false };

    let x = tau - PRELUDE;
    for(const g of this.segs){
      if(x < g.d) return { s: g.a + x * 60 * g.sp, slow: g.slow };
      x -= g.d;
    }

    return { s: this.tStop, slow: false };
  }

  /* ---------- camera ---------- */

  follow(key, target, dt, rate){
    const st = this.camState;
    if(!st[key]){
      st[key] = target.clone();
    }else{
      st[key].lerp(target, 1 - Math.exp(-dt * rate));
    }
    return st[key];
  }

  updateCamera(cam, tau, s, dt){
    const c = this.clip;
    const cm = this.camera;
    const R = this.R;
    const st = this.camState;

    if(cam === "fpv"){
      const i = c.cueIdx;
      const x0 = c.xs[0][i];
      const y0 = c.ys[0][i];
      const D = c.dir;
      const push = tau < PRELUDE ? tau / PRELUDE * 10 : 10 + Math.min(1, s / 50) * 70;
      const eye = this.v3(x0 - D.x * (205 - push), y0 - D.y * (205 - push), 64 - push * 0.15);
      let look = this.v3(x0 + D.x * 330, y0 + D.y * 330, R * 0.5);

      if(tau >= PRELUDE){
        const p = this.posAt(i, s);
        look = look.lerp(this.v3(p.x, p.y, R), 0.35);
      }

      cm.fov = 46;
      cm.position.copy(eye);
      cm.lookAt(this.follow("look", look, dt, 6));
    }else if(cam === "chase"){
      // Máy bám đúng vị trí bi (không trễ, bi chạy nhanh cỡ nào cũng nằm trong khung);
      // chỉ hướng máy được làm mượt để khi bi dội băng máy lượn vòng chứ không giật
      const i = this.chaseTarget(s);
      const pot = this.pots[i];
      const potted = pot && s > pot.t;
      const sAt = potted ? pot.t : s;
      const p = this.posAt(i, sAt);
      const v = this.velAt(i, sAt);
      const vl = Math.hypot(v.x, v.y);
      const sp = vl / 3;

      if(!st.dir) st.dir = vl > 0.5 ? { x: v.x / vl, y: v.y / vl } : { x: c.dir.x, y: c.dir.y };
      if(vl > 0.5){
        const k = 1 - Math.exp(-dt * 5);
        const nx = st.dir.x + (v.x / vl - st.dir.x) * k;
        const ny = st.dir.y + (v.y / vl - st.dir.y) * k;
        const nl = Math.hypot(nx, ny);
        if(nl > 0.2) st.dir = { x: nx / nl, y: ny / nl };
      }
      const d = st.dir;

      const back = 200 + Math.min(150, sp * 5);
      const eye = this.v3(p.x - d.x * back, p.y - d.y * back, 120 + Math.min(70, sp * 3));
      // Bi đang rơi lỗ: nhìn vào miệng lỗ (máy vẫn đứng sau bi nên thấy bi rơi xuống)
      const look = potted ? this.v3(pot.px, pot.py, -6) : this.v3(p.x + d.x * 80, p.y + d.y * 80, R);

      cm.fov = 46;
      cm.position.copy(eye);
      cm.lookAt(look);
    }else{
      // Máy quay chính: chéo từ cạnh dài, lia nhẹ; lùi xa vừa đủ để thấy trọn bàn ở mọi tỉ lệ màn hình
      const span = Math.max(1, this.tStop - this.cutStart);
      const u = clamp01((s - this.cutStart) / span);
      const yaw = -0.22 + u * 0.32;
      if(!st.dist) st.dist = this.fitWide([-0.22, 0.1]);
      const eye = new THREE.Vector3(Math.sin(yaw) * st.dist, st.dist * 0.78, Math.cos(yaw) * st.dist);
      const i = c.keyIdx >= 0 && !(this.pots[c.keyIdx] && s > this.pots[c.keyIdx].t) ? c.keyIdx : c.cueIdx;
      const p = this.posAt(i, s);
      const look = new THREE.Vector3(0, 0, 40).lerp(this.v3(p.x, p.y, 0), 0.22);

      cm.fov = 40;
      cm.position.copy(eye);
      cm.lookAt(this.follow("look", look, dt, 3));
    }

    cm.updateProjectionMatrix();
  }

  // Bi camera bám: bida phăng bám bi cái; bida lỗ bám bi cái tới khi bi sẽ rơi lỗ bắt đầu chạy,
  // bám bi đó tới lúc rơi xong, sau đó (cú điều bi) quay lại bám bi cái
  chaseTarget(s){
    const c = this.clip;
    if(c.mode === "carom" || c.keyIdx < 0 || s < this.keyMove) return c.cueIdx;

    const pot = this.pots[c.keyIdx];
    if(pot && s > pot.t + 20) return c.cueIdx;
    return c.keyIdx;
  }

  // Khoảng cách nhỏ nhất để bốn góc khung bàn đều nằm trong khung hình (trừ dải đen và chữ)
  fitWide(yaws){
    const T = this.env.table;
    const corners = [
      this.v3(T.x - 68, T.y - 68, 34), this.v3(T.x + T.w + 68, T.y - 68, 34),
      this.v3(T.x + T.w + 68, T.y + T.h + 68, 34), this.v3(T.x - 68, T.y + T.h + 68, 34)
    ];
    const cam = new THREE.PerspectiveCamera(40, this.camera.aspect, 4, 14000);
    const look = new THREE.Vector3(0, 0, 40);
    const v = new THREE.Vector3();

    for(let d = 760; d < 3000; d += 30){
      let ok = true;

      for(const yaw of yaws){
        cam.position.set(Math.sin(yaw) * d, d * 0.78, Math.cos(yaw) * d);
        cam.lookAt(look);
        cam.updateMatrixWorld();

        for(const c of corners){
          v.copy(c).project(cam);
          if(Math.abs(v.x) > 0.9 || v.y > 0.8 || v.y < -0.72){
            ok = false;
            break;
          }
        }
        if(!ok) break;
      }

      if(ok) return d;
    }

    return 3000;
  }

  /* ---------- phát ---------- */

  prepare(clip){
    this.clip = clip;
    this.useTable(clip.mode);
    this.setupBalls(clip);
    this.plan(clip);
    this.cut = null;
    this.camState = {};
    this.slowOn = null;
    this.lastTau = 0;
  }

  frame(tau){
    const dt = Math.max(0, Math.min(0.1, tau - this.lastTau));
    this.lastTau = tau;

    const { s, slow } = this.simAt(tau);
    const key = tau < PRELUDE ? -1 : s;
    let cut = this.cuts[0];
    for(const k of this.cuts) if(key >= k.from) cut = k;

    if(cut !== this.cut){
      this.cut = cut;
      this.cutStart = Math.max(0, cut.from);
      this.camState = {};
      if(this.hooks.onCam) this.hooks.onCam(cut.cam);
    }

    if(slow !== this.slowOn){
      this.slowOn = slow;
      if(this.hooks.onSlow) this.hooks.onSlow(slow);
    }

    this.updateBalls(s);
    this.updateCue(tau, s, cut.cam === "fpv");
    this.updateCamera(cut.cam, tau, s, dt);
    this.renderer.render(this.scene, this.camera);
  }

  play(clip, hooks = {}){
    this.stop();
    this.hooks = hooks;
    this.prepare(clip);
    this.resize();

    let tau = 0;
    let last = performance.now();
    const step = now => {
      tau += Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;

      if(tau >= this.total){
        this.frame(this.total);
        this.finish();
        return;
      }

      this.frame(tau);
      this.raf = requestAnimationFrame(step);
    };

    this.frame(0);
    this.raf = requestAnimationFrame(step);
  }

  // Vẽ đúng một thời điểm (dùng khi kiểm thử)
  renderAt(clip, tau){
    if(this.clip !== clip){
      this.hooks = {};
      this.prepare(clip);
      this.resize();
    }
    this.cut = null;
    this.lastTau = tau;
    this.frame(tau);
  }

  finish(){
    const cb = this.hooks.onEnd;
    this.stop();
    if(cb) cb();
  }

  stop(){
    if(this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  resize(){
    const w = Math.max(2, window.innerWidth);
    const h = Math.max(2, window.innerHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
