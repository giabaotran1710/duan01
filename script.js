/* =====================================================
   BASIC ELEMENTS
===================================================== */
const popup = document.getElementById('popup');
const overlay = document.getElementById('overlay');
const closeBtn = document.querySelector('.close-popup');
const openBtn = document.getElementById('account');

/* =====================================================
   POPUP OPEN / CLOSE
===================================================== */
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        popup.classList.remove('active');
        overlay.classList.remove('active');
    });
}

if (overlay) {
    overlay.addEventListener('click', () => {
        popup.classList.remove('active');
        overlay.classList.remove('active');
    });
}

if (openBtn) {
    openBtn.addEventListener('click', () => {
        popup.classList.add('active');
        overlay.classList.add('active');
        resetLoginForm();
    });
}

/* =====================================================
   AUDIO CONTROL
===================================================== */
const volumeBtn = document.querySelector(".volume");
const audio = document.getElementById("bgMusic");

if (volumeBtn && audio) {
    volumeBtn.addEventListener("click", () => {
        if (audio.paused) {
            audio.play();
            volumeBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        } else {
            audio.pause();
            volumeBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        }
    });
}

/* =====================================================
   GLITCH TEXT
===================================================== */


const glitchText = document.getElementById("glitchText");

if (glitchText) {
    const originalText = glitchText.innerText;
    const chars = "*#!?";

    setInterval(() => {
        let arr = originalText.split("");
        const i = Math.floor(Math.random() * arr.length);
        arr[i] = `<span class="glitch-char">${chars[Math.floor(Math.random() * chars.length)]}</span>`;
        glitchText.innerHTML = arr.join("");

        setTimeout(() => {
            glitchText.innerText = originalText;
        }, 150);
    }, 500);
}




/* =====================================================
   METEOR EFFECT
===================================================== */
const sky = document.querySelector('.sky');

if (sky) {
    const METEOR_COUNT = 6;

    for (let i = 0; i < METEOR_COUNT; i++) {
        const meteor = document.createElement('span');
        meteor.className = 'meteor';

        meteor.style.left = Math.random() * 100 + '%';
        meteor.style.animationDelay = (Math.random() * 4) + 's';
        meteor.style.animationDuration = (3 + Math.random()) + 's';
        meteor.style.setProperty('--tail', 150 + Math.random() * 120 + 'px');

        sky.appendChild(meteor);
    }
}

/* =====================================================
   PASSWORD SHOW / HIDE
===================================================== */
const passwordInput = document.getElementById('password');
const showPass = document.getElementById('showPass');

if (passwordInput && showPass) {
    showPass.addEventListener('change', () => {
        passwordInput.type = showPass.checked ? 'text' : 'password';
    });
}

/* =====================================================
   LOGIN FORM VALIDATION
===================================================== */
const usernameInput = document.getElementById('username');
const loginBtn = document.querySelector('.login-btn');
const usernameRegex = /^[a-zA-Z0-9@.]{6,}$/;
let usernameTouched = false;

function resetLoginForm() {
    if (!usernameInput || !loginBtn) return;

    usernameInput.value = '';
    usernameTouched = false;
    loginBtn.disabled = true;

    const field = usernameInput.closest('.field');
    const error = field?.querySelector('.error');

    field?.classList.remove('invalid', 'valid');
    if (error) error.textContent = '';

    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.type = 'password';
    }

    if (showPass) showPass.checked = false;
}

if (usernameInput) {
    usernameInput.addEventListener('focus', () => {
        usernameTouched = true;
    });

    usernameInput.addEventListener('input', validateUsername);
}

function validateUsername() {
    if (!usernameInput || !loginBtn) return false;

    const value = usernameInput.value.trim();
    const field = usernameInput.closest('.field');
    const error = field.querySelector('.error');

    field.classList.remove('invalid', 'valid');

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
        error.textContent = 'Tên người dùng không được chứa ký tự đặc biệt';
        field.classList.add('invalid');
        loginBtn.disabled = true;
        return false;
    }

    field.classList.add('valid');
    error.textContent = '';
    loginBtn.disabled = false;
    return true;
}

if (loginBtn) {
    loginBtn.addEventListener('click', e => {
        if (!validateUsername()) {
            e.preventDefault();
        }
    });
}

/* =====================================================
   LOGIN BUTTON LOADING
===================================================== */
const loginBtnText = document.querySelector(".login-btn .btn-text");

if (loginBtn && loginBtnText) {
    loginBtn.addEventListener("click", () => {
        if (loginBtn.classList.contains("processing")) return;

        loginBtn.classList.add("processing");
        loginBtnText.textContent = "Đang xử lý";

        setTimeout(() => {
            loginBtn.classList.remove("processing");
            loginBtnText.textContent = "Tiếp theo";
        }, 2500);
    });
}

/* =====================================================
   TOAST SYSTEM
===================================================== */
const toast = document.getElementById("toast-disabled");
const disabledLinks = document.querySelectorAll(".disabled-link");
let toastTimer;

function showToast(message, duration = 1800) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, duration);
}

disabledLinks.forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();
        showToast("Tính năng đang bị vô hiệu hóa");
    });
});

/* =====================================================
   ACCOUNT STATE (HOVER / STATIC)
===================================================== */
const account = document.querySelector('.account');
const accountText = account?.querySelector('.dangnhap');

function updateAccountState() {
    if (!account || !accountText) return;

    if (accountText.textContent.trim() !== "Đăng nhập") {
        account.classList.add('static');
    } else {
        account.classList.remove('static');
    }
}

// chạy khi load trang
updateAccountState();

/* =====================================================
   GUEST LOGIN
===================================================== */
const guestLogin = document.getElementById("guestLogin");

function generateGuestName() {
    let digits = "";
    for (let i = 0; i < 5; i++) {
        digits += Math.floor(Math.random() * 10);
    }
    return "Guest" + digits;
}

if (guestLogin) {
    guestLogin.addEventListener("click", e => {
        e.preventDefault();

        showToast("⏳ Đang đăng nhập bằng tài khoản khách...", 1500);

        setTimeout(() => {
            popup.classList.remove("active");
            overlay.classList.remove("active");

            accountText.textContent = generateGuestName();
            updateAccountState();

            document.body.classList.add("guest-mode");
        }, 1500);
    });
}
