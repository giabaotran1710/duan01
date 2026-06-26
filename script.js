document.addEventListener('DOMContentLoaded', function () {

    // ========== INTRO HANDLING ==========
    const overlay = document.getElementById('intro-overlay');
    const line1 = document.getElementById('intro-line1');
    const line2 = document.getElementById('intro-line2');
    const petalContainer = document.getElementById('petal-container');
    const contentEl = document.querySelector('.content');
    const utilityContainer = document.querySelector('.utility-container');
    const utilityBar = document.getElementById('utilityBar');
    const toggleBtn = document.getElementById('toggleBar');

    // ========== TẠO CÁNH HOA ANH ĐÀO ==========
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

    // ========== DÒNG THỜI GIAN ==========
    const text1 = 'Thách thức mọi giới hạn của bản thân.';
    let charIndex = 0;
    const typingSpeed = 70;

    function typeLine1() {
        if (charIndex < text1.length) {
            line1.textContent += text1.charAt(charIndex);
            charIndex++;
            setTimeout(typeLine1, typingSpeed);
        } else {
            // Gõ xong -> bỏ con trỏ, hiện dòng 2 ngay
            line1.style.borderRight = 'none';
            line2.style.opacity = '1';

            // Sau khi dòng 2 hiện 1 giây, bắt đầu fade out overlay
            setTimeout(() => {
                overlay.style.opacity = '0';

                // Đợi transition kết thúc (1.2s) rồi xóa overlay và mở menu
                setTimeout(() => {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    openBar();
                }, 1200);
            }, 1000);
        }
    }

    // 2 giây đầu: đen hoàn toàn
    setTimeout(() => {
        createPetals(35);       // hoa bắt đầu rơi
        // 1 giây sau khi hoa rơi -> bắt đầu gõ chữ
        setTimeout(typeLine1, 1000);
    }, 2000);

    // ========== DỮ LIỆU GAME ==========
    const games = [
        { id: 'word-game', name: 'Ghép từ', diff: '5/5', genre: ['tri-tue'] },
        { id: 'gamecaro', name: 'Cờ Caro', diff: '3/5', genre: ['chien-thuat', 'co'] },
        { id: 'memori', name: 'Ghi nhớ màu sắc', diff: '3/5', genre: ['ghi-nho'] },
        { id: 'magic', name: 'Tìm bóng', diff: '3/5', genre: ['quan-sat'] },
        { id: 'crab', name: 'Chặn cua', diff: '2/5', genre: ['chien-thuat'] },
        { id: 'reversi', name: 'Reversi', diff: '2/5', genre: ['chien-thuat', 'co'] },
        { id: 'domin', name: 'Minesweeper', diff: '5/5', genre: ['tri-tue'] },
        { id: 'haichien', name: 'Hải chiến', diff: '3/5', genre: ['chien-thuat'] },
        { id: 'musicgame', name: 'Nhịp điệu âm nhạc', diff: '4/5', genre: ['giai-tri'] },
        { id: 'nedan', name: 'Né đạn', diff: '5/5', genre: ['phan-xa'] },
        { id: 'ghinho', name: 'Ghi nhớ Emoji', diff: '4/5', genre: ['ghi-nho','giai-tri'] },
        { id: 'thaphaycao', name: 'Thấp hay cao', diff: '2/5', genre: ['giai-tri'] },
        { id: 'codam', name: 'Cờ đam', diff: '2/5', genre: ['chien-thuat', 'co'] },
        { id: 'neonreflex', name: 'Neon Reflex', diff: '5/5', genre: ['phan-xa'] },
        { id: 'dapquai', name: 'Đập quái rừng sâu', diff: '4/5', genre: ['phan-xa'] },
        { id: 'unogame', name: 'UNO!', diff: '1/5', genre: ['giai-tri'] },
        { id: 'sieuduoibat', name: 'Siêu đuổi bắt', diff: '5/5', genre: ['phan-xa'] },
        { id: 'hungbi', name: 'Hứng bi', diff: '4/5', genre: ['ghi-nho', 'phan-xa'] },
        { id: 'duaxucxac', name: 'Đua xúc xắc bãi biển', diff: '1/5', genre: ['giai-tri'] },
        { id: 'blockjump', name: 'Nhảy! Nhảy và nhảy!', diff: '4/5', genre: ['giai-tri'] },
        { id: 'bidaBtn', name: 'Bida', diff: '4/5', genre: ['giai-tri'] },
        { id: 'khinhkhi', name: 'Khinh khí cầu', diff: '3/5', genre: ['giai-tri', 'phan-xa'] },
        { id: 'xepbonggai', name: 'Xếp bóng gai', diff: '2/5', genre: ['giai-tri'] },
        { id: 'truottuyet', name: 'Trượt tuyết', diff: '3/5', genre: ['giai-tri', 'tri-tue'] },
        { id: 'demsao', name: 'Quan sát chòm sao', diff: '2/5', genre: ['quan-sat', 'giai-tri'] },
        { id: 'bongnay', name: 'Bóng nảy', diff: '4/5', genre: ['quan-sat'] },
        { id: 'echnhayho', name: 'Ếch nhảy hồ', diff: '5/5', genre: ['quan-sat'] },
        { id: 'comet', name: 'Trốn khỏi thiên thạch', diff: '5/5', genre: ['phan-xa'] },
        { id: 'sudoku', name: 'Sudoku', diff: '5/5', genre: ['tri-tue'] },
    ];

    const routes = {
        'word-game': 'wordgame/wordgamev1.html',
        'gamecaro': 'caro/caro.html',
        'memori': 'wordgame/memori.html',
        'magic': 'timbong.html',
        'crab': 'chancua.html',
        'reversi': 'caro/reversi-game.html',
        'domin': 'caro/domin.html',
        'haichien': 'game/haichien.html',
        'musicgame': 'wordgame/musicgame.html',
        'nedan': 'game/nedan.html',
        'ghinho': 'game/ghinho.html',
        'thaphaycao': 'game/thaphaycao.html',
        'codam': 'game/codam.html',
        'neonreflex': 'game/neon-reflex.html',
        'dapquai': 'game/dapquai.html',
        'unogame': 'game/uno.html',
        'sieuduoibat': 'game/sieuduoibat.html',
        'hungbi': 'game/hungbi.html',
        'duaxucxac': 'game-duaxucxac/duaxucxac.html',
        'blockjump': 'game/blockjump.html',
        'bidaBtn': 'game-bida/bida.html',
        'khinhkhi': 'game/khinhkhicau.html',
        'xepbonggai': 'game/xepbonggai.html',
        'truottuyet': 'game/truottuyet.html',
        'demsao': 'game/quansatchomsao.html',
        'bongnay': 'game/bongnay.html',
        'echnhayho': 'game/echnhayho.html',
        'comet': 'game/tronkhoithienthach.html',
        'sudoku': 'game/sudoku.html',
    };

    games.forEach(g => {
        if (typeof g.genre === 'string') g.genre = [g.genre];
    });

    const filterSection = document.querySelector('.filter-section');
    const gamesGrid = document.querySelector('.games-grid');

    const genreNames = {
        'tri-tue': 'Trí tuệ',
        'phan-xa': 'Phản xạ',
        'chien-thuat': 'Chiến thuật',
        'giai-tri': 'Giải trí',
        'ghi-nho': 'Ghi nhớ',
        'co': 'Cờ',
        'quan-sat':'Quan sát'
    };

    const allGenres = new Set();
    games.forEach(g => g.genre.forEach(genre => allGenres.add(genre)));
    const sortedGenres = Array.from(allGenres).sort();

    filterSection.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.dataset.genre = 'all';
    allBtn.textContent = 'Tất cả';
    filterSection.appendChild(allBtn);

    sortedGenres.forEach(genre => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.genre = genre;
        btn.textContent = genreNames[genre] || genre;
        filterSection.appendChild(btn);
    });

    let currentGenre = 'all';

    function getButtonHTML(gameId) {
        const originalBtn = document.getElementById(gameId);
        if (originalBtn) return originalBtn.outerHTML;
        console.warn('Không tìm thấy nút:', gameId);
        return '';
    }

    function renderGames(genre) {
        gamesGrid.innerHTML = '';
        const filtered = genre === 'all'
            ? games
            : games.filter(g => g.genre.includes(genre));

        filtered.forEach((game, index) => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.style.animationDelay = `${index * 0.03}s`;
            card.setAttribute('data-id', game.id);

            const btnHTML = getButtonHTML(game.id);
            if (btnHTML) card.innerHTML += btnHTML;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'game-info';
            const genreDisplay = game.genre.map(g => genreNames[g] || g).join(', ');
            infoDiv.innerHTML = `
                <span class="game-name">${game.name}</span>
                <span class="game-genre">${genreDisplay}</span>
                <span class="game-difficulty">Độ khó: ${game.diff}</span>
            `;
            card.appendChild(infoDiv);

            card.addEventListener('click', () => {
                const url = routes[game.id];
                if (url) window.location.href = url;
            });

            gamesGrid.appendChild(card);
        });
    }

    filterSection.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        filterSection.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentGenre = btn.dataset.genre;
        renderGames(currentGenre);
    });

    renderGames('all');

    // ========== TOGGLE BAR ==========
    let autoCloseTimer;

    function closeBar() {
        utilityBar.classList.remove('show');
        contentEl.classList.remove('hide');
        toggleBtn.classList.remove('active');
        if (autoCloseTimer) {
            clearTimeout(autoCloseTimer);
            autoCloseTimer = null;
        }
    }

    function openBar() {
        utilityBar.classList.add('show');
        contentEl.classList.add('hide');
        toggleBtn.classList.add('active');
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
        autoCloseTimer = setTimeout(closeBar, 30000);
    }

    toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (utilityBar.classList.contains('show')) {
            closeBar();
        } else {
            openBar();
        }
    });

    utilityBar.addEventListener('click', function () {
        if (autoCloseTimer) {
            clearTimeout(autoCloseTimer);
            autoCloseTimer = setTimeout(closeBar, 30000);
        }
    });

    // ========== CANVAS BACKGROUND ==========
    const canvas = document.getElementById('bg');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let W, H, t = 0;

        function resize() {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
            initStars();
        }
        window.addEventListener('resize', resize);

        const waves = [
            { a: 0.055, wl: 0.012, sp: 0.018, yo: 0.62, alpha: 0.18, r: 100, g: 200, b: 255 },
            { a: 0.040, wl: 0.018, sp: 0.012, yo: 0.68, alpha: 0.14, r: 60, g: 160, b: 230 },
            { a: 0.030, wl: 0.025, sp: 0.022, yo: 0.73, alpha: 0.22, r: 30, g: 120, b: 200 },
            { a: 0.022, wl: 0.035, sp: 0.008, yo: 0.78, alpha: 0.30, r: 10, g: 80, b: 170 },
            { a: 0.015, wl: 0.050, sp: 0.030, yo: 0.82, alpha: 0.35, r: 5, g: 50, b: 130 },
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
                stars.push({ x: sx, y: sy, r: 0.5 + (rng % 10) / 10 });
            }
        }

        function draw() {
            const sky = ctx.createLinearGradient(0, 0, 0, H);
            sky.addColorStop(0, '#050d1a');
            sky.addColorStop(0.4, '#0a1a30');
            sky.addColorStop(0.7, '#0d2540');
            sky.addColorStop(1, '#0a1828');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, W, H);

            const glow = ctx.createRadialGradient(W * 0.5, H * 0.22, 0, W * 0.5, H * 0.22, W * 0.45);
            glow.addColorStop(0, 'rgba(120,190,255,0.07)');
            glow.addColorStop(0.5, 'rgba(60,130,200,0.03)');
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, W, H);

            stars.forEach(st => {
                const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.2 + st.x));
                ctx.beginPath();
                ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(200,230,255,' + (tw * 0.8) + ')';
                ctx.fill();
            });

            waves.forEach(w => {
                const baseY = H * w.yo;
                const amp = H * w.a;
                ctx.beginPath();
                ctx.moveTo(0, H);
                for (let x = 0; x <= W; x += 3) {
                    const y = baseY + Math.sin(x * w.wl + t * w.sp * 60) * amp + Math.sin(x * w.wl * 1.6 + t * w.sp * 40 + 1) * amp * 0.4;
                    ctx.lineTo(x, y);
                }
                ctx.lineTo(W, H);
                ctx.closePath();
                const wg = ctx.createLinearGradient(0, baseY - amp, 0, H);
                wg.addColorStop(0, 'rgba(' + w.r + ',' + w.g + ',' + w.b + ',' + w.alpha + ')');
                wg.addColorStop(1, 'rgba(5,15,30,0.6)');
                ctx.fillStyle = wg;
                ctx.fill();
            });

            waves.slice(0, 3).forEach(w => {
                const baseY = H * w.yo;
                const amp = H * w.a;
                ctx.beginPath();
                for (let x = 0; x <= W; x += 3) {
                    const y = baseY + Math.sin(x * w.wl + t * w.sp * 60) * amp + Math.sin(x * w.wl * 1.6 + t * w.sp * 40 + 1) * amp * 0.4;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = 'rgba(180,230,255,0.12)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });

            t += 0.016;
            requestAnimationFrame(draw);
        }

        resize();
        draw();
    }

    // ========== WORD GAME LETTER CYCLE ==========
    const LETTERS = [
        { ch: 'W' }, { ch: 'O' }, { ch: 'R' }, { ch: 'D' },
        { ch: 'G' }, { ch: 'A' }, { ch: 'M' }, { ch: 'E' },
    ];
    let idx = 0;
    const elLetter = document.getElementById('word-letter');
    if (elLetter) {
        setInterval(() => {
            idx = (idx + 1) % LETTERS.length;
            elLetter.classList.remove('pop');
            void elLetter.offsetWidth;
            elLetter.textContent = LETTERS[idx].ch;
            elLetter.classList.add('pop');
        }, 900);
    }

});