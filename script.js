/* =============================================
   UTILITY BAR
============================================= */
(function () {
  const toggleBtn  = document.getElementById("toggleBar");
  const utilityBar = document.getElementById("utilityBar");
  const content    = document.querySelector(".content");

  if (!toggleBtn || !utilityBar || !content) {
    console.error("Không tìm thấy toggleBar / utilityBar / content");
    return;
  }

  let autoCloseTimer = null;

  function closeBar() {
    utilityBar.classList.remove("show");
    content.classList.remove("hide");

    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
  }

  function openBar() {
    utilityBar.classList.add("show");
    content.classList.add("hide");

    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(closeBar, 30000);
  }

  toggleBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (utilityBar.classList.contains("show")) {
      closeBar();
    } else {
      openBar();
    }
  });

  utilityBar.addEventListener("click", function () {
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(closeBar, 30000);
  });
})();


/* =============================================
   CANVAS BACKGROUND
============================================= */
(function () {
  const canvas = document.getElementById("bg");

  if (!canvas) {
    console.error("Không tìm thấy canvas #bg");
    return;
  }

  const ctx = canvas.getContext("2d");

  let W;
  let H;
  let t = 0;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStars();
  }

  window.addEventListener("resize", resize);

  const waves = [
    { a:0.055, wl:0.012, sp:0.018, yo:0.62, alpha:0.18, r:100, g:200, b:255 },
    { a:0.040, wl:0.018, sp:0.012, yo:0.68, alpha:0.14, r:60,  g:160, b:230 },
    { a:0.030, wl:0.025, sp:0.022, yo:0.73, alpha:0.22, r:30,  g:120, b:200 },
    { a:0.022, wl:0.035, sp:0.008, yo:0.78, alpha:0.30, r:10,  g:80,  b:170 },
    { a:0.015, wl:0.050, sp:0.030, yo:0.82, alpha:0.35, r:5,   g:50,  b:130 },
  ];

  let stars = [];

  function initStars() {
    stars = [];

    let rng = 1;

    for (let s = 0; s < 80; s++) {
      rng = (rng * 16807) % 2147483647;
      const sx = rng % W;

      rng = (rng * 16807) % 2147483647;
      const sy = rng % Math.floor(H * 0.45);

      rng = (rng * 16807) % 2147483647;

      stars.push({
        x: sx,
        y: sy,
        r: 0.5 + (rng % 10) / 10
      });
    }
  }

  function draw() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#050d1a");
    sky.addColorStop(0.4, "#0a1a30");
    sky.addColorStop(0.7, "#0d2540");
    sky.addColorStop(1, "#0a1828");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(
      W * 0.5, H * 0.22, 0,
      W * 0.5, H * 0.22, W * 0.45
    );

    glow.addColorStop(0, "rgba(120,190,255,0.07)");
    glow.addColorStop(0.5, "rgba(60,130,200,0.03)");
    glow.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    stars.forEach(function (st) {
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.2 + st.x));

      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,230,255," + (tw * 0.8) + ")";
      ctx.fill();
    });

    waves.forEach(function (w) {
      const baseY = H * w.yo;
      const amp = H * w.a;

      ctx.beginPath();
      ctx.moveTo(0, H);

      for (let x = 0; x <= W; x += 3) {
        const y = baseY
          + Math.sin(x * w.wl + t * w.sp * 60) * amp
          + Math.sin(x * w.wl * 1.6 + t * w.sp * 40 + 1) * amp * 0.4;

        ctx.lineTo(x, y);
      }

      ctx.lineTo(W, H);
      ctx.closePath();

      const wg = ctx.createLinearGradient(0, baseY - amp, 0, H);
      wg.addColorStop(0, "rgba(" + w.r + "," + w.g + "," + w.b + "," + w.alpha + ")");
      wg.addColorStop(1, "rgba(5,15,30,0.6)");

      ctx.fillStyle = wg;
      ctx.fill();
    });

    waves.slice(0, 3).forEach(function (w) {
      const baseY = H * w.yo;
      const amp = H * w.a;

      ctx.beginPath();

      for (let x = 0; x <= W; x += 3) {
        const y = baseY
          + Math.sin(x * w.wl + t * w.sp * 60) * amp
          + Math.sin(x * w.wl * 1.6 + t * w.sp * 40 + 1) * amp * 0.4;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = "rgba(180,230,255,0.12)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    t += 0.016;
    requestAnimationFrame(draw);
  }

  resize();
  draw();
})();