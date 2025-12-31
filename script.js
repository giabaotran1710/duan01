document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.querySelector('.close-popup');

closeBtn.addEventListener('click', () => {
    popup.classList.remove('active');
    overlay.classList.remove('active');
});


  const volumeBtn = document.querySelector(".volume");
  const audio = document.getElementById("bgMusic");

  if (volumeBtn && audio) {
    volumeBtn.onclick = () => {
      if (audio.paused) {
        audio.play();
        volumeBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      } else {
        audio.pause();
        volumeBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
      }
    };
  }

  const textEl = document.getElementById("glitchText");
  if (!textEl) return;

  const original = textEl.innerText;
  const chars = "*#!?";

  function glitchOnce() {
    let arr = original.split("");
    const i = Math.floor(Math.random() * arr.length);

    arr[i] = `<span class="glitch-char">${chars[Math.floor(Math.random() * chars.length)]}</span>`;
    textEl.innerHTML = arr.join("");

    setTimeout(() => {
      textEl.innerText = original;
    }, 150);
  }

  setInterval(glitchOnce, 500);


const sky = document.querySelector('.sky');
const METEOR_COUNT = 6;
const BASE_DURATION = 3.5; // giây
const VARIANCE = 0.2;      // ±20%

for (let i = 0; i < METEOR_COUNT; i++) {
    const meteor = document.createElement('span');
    meteor.className = 'meteor';

    // random vị trí ngang
    meteor.style.left = Math.random() * 100 + '%';

    // random delay (để không sync)
    meteor.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';

    // random tốc độ ±20%
    const speedFactor = 1 + (Math.random() * 2 - 1) * VARIANCE;
    const duration = (BASE_DURATION * speedFactor).toFixed(2);

    meteor.style.animationDuration = duration + 's';

    // random độ dài đuôi
    meteor.style.setProperty(
        '--tail',
        150 + Math.random() * 120 + 'px'
    );

    sky.appendChild(meteor);
}
const pass = document.getElementById('password');
const show = document.getElementById('showPass');

show.addEventListener('change', () => {
    pass.type = show.checked ? 'text' : 'password';
});
const popup = document.getElementById('popup');
const overlay = document.getElementById('overlay');
const openBtn = document.getElementById('account');

overlay.onclick = () => {
    popup.classList.remove('active');
    overlay.classList.remove('active');
};

const usernameInput = document.getElementById('username');
const loginBtn = document.querySelector('.login-btn');

const usernameRegex = /^[a-zA-Z0-9@.]{6,}$/;
let usernameTouched = false;

/* ===== RESET + KHÓA KHI MỞ POPUP ===== */
openBtn.onclick = () => {
    popup.classList.add('active');
    overlay.classList.add('active');

    usernameInput.value = '';
    usernameTouched = false;
    

    const field = usernameInput.closest('.field');
    field.classList.remove('invalid', 'valid');
    field.querySelector('.error').textContent = '';
    pass.value = '';
    pass.type = 'password';
    show.checked = false;

    const passField = pass.closest('.field');
    passField.classList.remove('invalid', 'valid');

    loginBtn.disabled = true;
};

/* ĐÁNH DẤU ĐÃ TƯƠNG TÁC */
usernameInput.addEventListener('focus', () => {
    usernameTouched = true;
});

/* VALIDATE REALTIME */
usernameInput.addEventListener('input', validateUsername);

function validateUsername() {
    const value = usernameInput.value.trim();
    const field = usernameInput.closest('.field');
    const error = field.querySelector('.error');

    field.classList.remove('invalid', 'valid');

    /* CHƯA TƯƠNG TÁC → KHÔNG HIỆN LỖI */
    if (!usernameTouched) {
        error.textContent = '';
        loginBtn.disabled = true;
        return false;
    }

    if (value.length < 6) {
        error.textContent = 'Tên người dùng phải có ít nhất 6 ký tự';
        field.classList.add('invalid');
        loginBtn.disabled = true;
        return false;
    }

    if (value.length > 20) {
        error.textContent = 'Tên người dùng quá dài';
        field.classList.add('invalid');
        loginBtn.disabled = true;
        return false;
    }


    if (!usernameRegex.test(value)) {
        error.textContent = 'Tên người dùng không được chứa các kí tự đặc biệt';
        field.classList.add('invalid');
        loginBtn.disabled = true;
        return false;
    }

    field.classList.add('valid');
    error.textContent = '';
    loginBtn.disabled = false;
    return true;
}

/* CHẶN CLICK KHI CÒN SAI */
loginBtn.addEventListener('click', (e) => {
    if (!validateUsername()) {
        e.preventDefault();
    }
});

const btn = document.querySelector(".login-btn");
  const text = btn.querySelector(".btn-text");

  btn.addEventListener("click", () => {
    if (btn.classList.contains("processing")) return;

    btn.classList.add("processing");
    text.textContent = "Đang xử lý";

    // giả lập xử lý xong
    setTimeout(() => {
      btn.classList.remove("processing");
      text.textContent = "Tiếp theo";
    }, 2500);
  });


  const toast = document.getElementById("toast-disabled");
const disabledLinks = document.querySelectorAll(".disabled-link");
const guestLogin = document.getElementById("guestLogin");
const accountBtn = document.querySelector(".account .dangnhap");

let toastTimer;

/* ===== HÀM TOAST DÙNG CHUNG ===== */
function showToast(message, duration = 1800) {
    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, duration);
}

/* ===== LINK BỊ VÔ HIỆU HÓA ===== */
disabledLinks.forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();
        showToast("Tính năng đang bị vô hiệu hóa");
    });
});

/* ===== TẠO TÊN GUEST ===== */
function generateGuestName() {
    let digits = "";
    for (let i = 0; i < 5; i++) {
        digits += Math.floor(Math.random() * 10);
    }
    return "Guest" + digits;
}

/* ===== ĐĂNG NHẬP KHÁCH ===== */
guestLogin.addEventListener("click", e => {
    e.preventDefault();

    showToast("⏳ Đang đăng nhập bằng tài khoản khách...", 1500);

    setTimeout(() => {
        popup.classList.remove("active");
        overlay.classList.remove("active");

        const guestName = generateGuestName();
        accountBtn.textContent = guestName;

        document.body.classList.add("guest-mode");
    }, 1500);
})})
