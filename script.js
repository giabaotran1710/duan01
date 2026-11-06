document.addEventListener('DOMContentLoaded', function () {

    // ============================================================
    // 1. THAM CHIẾU PHẦN TỬ DOM
    // ============================================================
    const overlay = document.getElementById('intro-overlay');
    const line1 = document.getElementById('intro-line1');
    const line2 = document.getElementById('intro-line2');
    const petalContainer = document.getElementById('petal-container');
    const skipIntroBtn = document.getElementById('skip-intro');
    const chillBtn = document.getElementById('chillBar');          // Nút mở Chill Bar (trên thanh đầu trang)
    const chillPanel = document.getElementById('chillBarPanel'); // Bảng mini-game
    const actions = document.getElementById('hActions');          // Cụm nút bên phải thanh đầu trang

    if (!overlay || !line1 || !line2 || !petalContainer || !skipIntroBtn || !chillBtn || !chillPanel) {
        console.error('Thiếu phần tử DOM cần thiết. Kiểm tra lại HTML.');
        return;
    }

    // Người dùng bật "giảm chuyển động" trong hệ điều hành
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Biến cho intro skip & timers
    let introSkipped = false;
    let introTimer1 = null;
    let introTimer2 = null;
    let introTimer3 = null;

    // ============================================================  
    // 2. CÁNH HOA ANH ĐÀO (INTRO)  
    // ============================================================  
    function createPetals(count = 35) {
        for (let i = 0; i < count; i++) {
            const petal = document.createElement('div');
            petal.className = 'petal';
            const size = Math.random() * 12 + 8;
            petal.style.width = size + 'px';
            petal.style.height = size + 'px';
            petal.style.left = Math.random() * 100 + '%';
            petal.style.animationDuration = Math.random() * 5 + 5 + 's';
            petal.style.animationDelay = Math.random() * 3 + 's';
            petal.style.background = `rgba(255, ${150 + Math.random() * 100}, 200, ${0.6 + Math.random() * 0.4})`;
            petalContainer.appendChild(petal);
        }
    }

    // ============================================================  
    // 3. GÕ CHỮ DÒNG GIỚI THIỆU (INTRO TYPING)  
    // ============================================================  
    const text1 = 'Thách thức mọi giới hạn của bản thân.';
    let charIndex = 0;
    const typingSpeed = 70;

    function typeLine1() {
        if (introSkipped) return;

        if (charIndex < text1.length) {
            line1.textContent += text1.charAt(charIndex);
            charIndex++;
            introTimer1 = setTimeout(typeLine1, typingSpeed);
        } else {
            line1.style.borderRight = 'none';
            line2.style.opacity = '1';
            line2.classList.add('is-visible');
            introTimer2 = setTimeout(() => {
                if (introSkipped) return;
                overlay.classList.add('is-leaving');
                overlay.style.opacity = '0';
                introTimer3 = setTimeout(() => {
                    if (introSkipped) return;
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 1200);
            }, 1000);
        }
    }

    // Khởi động intro
    introTimer1 = setTimeout(() => {
        if (introSkipped) return;
        if (!reduceMotionQuery.matches) createPetals(35);
        introTimer2 = setTimeout(typeLine1, 1000);
    }, 2000);

    // ============================================================
    // 4. CHILL BAR (bảng mini-game mở từ nút xúc xắc trên thanh đầu trang)
    // ============================================================
    function openChillBar() {
        chillPanel.hidden = false;
        requestAnimationFrame(() => chillPanel.classList.add('open'));
        chillBtn.classList.add('active');
        chillBtn.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(checkDescOverflow);
    }
    function closeChillBar() {
        if (chillPanel.hidden) return;
        chillPanel.classList.remove('open');
        chillBtn.classList.remove('active');
        chillBtn.setAttribute('aria-expanded', 'false');
        setTimeout(() => { if (!chillPanel.classList.contains('open')) chillPanel.hidden = true; }, 220);
    }
    chillBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (chillPanel.classList.contains('open')) closeChillBar(); else openChillBar();
    });
    // Bấm ra ngoài khi bảng đang mở: chỉ đóng bảng, không mở nhầm game nằm bên dưới
    document.addEventListener('click', function (e) {
        if (!chillPanel.classList.contains('open')) return;
        if (chillPanel.contains(e.target) || chillBtn.contains(e.target)) return;
        e.stopPropagation(); e.preventDefault();
        closeChillBar();
    }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeChillBar(); });

    // ============================================================
    // 5. GOM CÁC NÚT CỦA SCRIPT KHÁC VÀO THANH ĐẦU TRANG
    //    (bảng xếp hạng, patch note, nhật ký và quản trị tự tạo nút riêng; đưa chúng về cùng một hàng)
    // ============================================================
    if (actions) {
        const ORDER = ['mgrBtn', 'admBtn', 'lbBtn', 'pn-btn'];
        const adopt = () => {
            ORDER.forEach(id => {
                const b = document.getElementById(id);
                if (b && b.parentElement !== actions) { b.classList.add('h-act'); actions.appendChild(b); }
            });
            // giữ thứ tự cố định: xúc xắc, quản trị, nhật ký, bảng xếp hạng, patch note
            ORDER.forEach(id => { const b = document.getElementById(id); if (b && b.parentElement === actions) actions.appendChild(b); });
        };
        adopt();
        new MutationObserver(adopt).observe(document.body, { childList: true });
    }

    // ============================================================  
    // 7. SKIP INTRO  
    // ============================================================  
    function skipIntro() {
        if (introSkipped) return;
        introSkipped = true;

        clearTimeout(introTimer1);
        clearTimeout(introTimer2);
        clearTimeout(introTimer3);

        overlay.classList.add('is-leaving');
        overlay.style.opacity = '0';

        setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 500);
    }

    skipIntroBtn.addEventListener('click', skipIntro);
    
    let navigateTimer = null;

    window.navigateToGame = function(url, gameName) {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingGameName = document.getElementById('loading-game-name');
    
    if (loadingOverlay && loadingGameName) {
        loadingGameName.innerHTML = '<span style="opacity:0.7;">Đang mở:</span> ' + gameName;
        loadingOverlay.style.display = 'flex';
        
        const randomDelay = Math.floor(Math.random() * 4501) + 1500;
        
        clearTimeout(navigateTimer);
        navigateTimer = setTimeout(() => {
            window.location.href = url;
        }, randomDelay);
    } else {
        window.location.href = url;
    }
};

    // Quay lại bằng nút Back: trình duyệt khôi phục trang từ bộ nhớ đệm (bfcache)
    // nên lớp "Đang mở" vẫn còn hiện. Ẩn nó đi và huỷ lần chuyển trang đang chờ.
    window.addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        clearTimeout(navigateTimer);
        navigateTimer = null;
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    });
    
    function checkDescOverflow() {
        document.querySelectorAll(".chill-game-desc-wrap").forEach(wrap => {
            const text = wrap.querySelector(".chill-game-desc");
            if (!text) return;
            wrap.classList.remove("is-overflowing");
            if (text.scrollWidth > wrap.clientWidth) {
                wrap.classList.add("is-overflowing");
            }
        });
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => requestAnimationFrame(checkDescOverflow));
    } else {
        setTimeout(checkDescOverflow, 300);
    }

}); // END DOMContentLoaded
