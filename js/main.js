(function () {
    'use strict';

    const cvs = document.getElementById('bgCanvas');
    const ctx = cvs.getContext('2d');
    const cCvs = document.getElementById('cursorCanvas');
    const cCtx = cCvs ? cCvs.getContext('2d') : null;
    let W, H;
    let targetScroll = window.scrollY || 0;
    let smoothScroll = targetScroll;
    let smoothVel = 0;
    let mouseX = -9999, mouseY = -9999;

    function resize() { 
        W = window.innerWidth; 
        H = window.innerHeight;
        cvs.width = W; 
        cvs.height = H; 
        if(cCvs) { cCvs.width = W; cCvs.height = H; }
    }
    resize();
    window.addEventListener('resize', resize);

    // Mouse tracking
    document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
    document.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });

    // =============================================
    //  BACKGROUND — Deep Space & Asteroids
    // =============================================
    const particles = [];
    const isMobile = window.innerWidth <= 768;
    const PARTICLE_COUNT = isMobile ? 80 : 160;
    const CONNECT_DIST = isMobile ? 100 : 160;
    const MOUSE_RADIUS = 200;

    // Dala constellation palette: plum-dominant, amber/lichen/bone accents
    const PARTICLE_COLORS = [
        '128, 82, 255',   // Plum Voltage
        '128, 82, 255',
        '128, 82, 255',
        '255, 184, 41',   // Amber Spark
        '21, 132, 110',   // Lichen
        '255, 255, 255'   // Bone
    ];

    class Particle {
        constructor() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.homeX = this.x;
            this.homeY = this.y;
            this.vx = (Math.random() - 0.5) * 0.55;
            this.vy = (Math.random() - 0.5) * 0.55;
            this.radius = 1.8 + Math.random() * 2.2;
            this.baseAlpha = 0.35 + Math.random() * 0.3;
            this.alpha = this.baseAlpha;
            this.pushX = 0;
            this.pushY = 0;
            this.phase = Math.random() * Math.PI * 2;
            this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
        }

        update(time) {
            this.pushX *= 0.96;
            this.pushY *= 0.96;
            if (Math.abs(this.pushX) < 0.01) this.pushX = 0;
            if (Math.abs(this.pushY) < 0.01) this.pushY = 0;

            const fx = Math.sin(time * 0.0005 + this.phase) * 0.3;
            const fy = Math.cos(time * 0.0004 + this.phase * 1.4) * 0.25;

            // Optional: minimal scroll drift (much softer than what frustrated them earlier)
            this.y -= (targetScroll - smoothScroll) * 0.02;

            this.x += this.vx + this.pushX + fx;
            this.y += this.vy + this.pushY + fy;

            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < MOUSE_RADIUS && dist > 1) {
                const force = (1 - dist / MOUSE_RADIUS) * 0.4;
                this.x += (dx / dist) * force;
                this.y += (dy / dist) * force;
                this.alpha = this.baseAlpha + (1 - dist / MOUSE_RADIUS) * 0.5;
            } else {
                this.alpha += (this.baseAlpha - this.alpha) * 0.05;
            }

            if (Math.abs(this.pushX) < 0.1 && Math.abs(this.pushY) < 0.1) {
                this.x += (this.homeX - this.x) * 0.001;
                this.y += (this.homeY - this.y) * 0.001;
            }

            if (this.x < -20) this.x = W + 20;
            if (this.x > W + 20) this.x = -20;
            if (this.y < -20) this.y = H + 20;
            if (this.y > H + 20) this.y = -20;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const a = particles[i];
                const b = particles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < CONNECT_DIST) {
                    const opacity = (1 - dist / CONNECT_DIST) * 0.22;
                    const midX = (a.x + b.x) / 2;
                    const midY = (a.y + b.y) / 2;
                    const mDist = Math.sqrt((mouseX - midX) ** 2 + (mouseY - midY) ** 2);
                    const mouseBoost = mDist < MOUSE_RADIUS ? (1 - mDist / MOUSE_RADIUS) * 0.35 : 0;

                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `rgba(128, 82, 255, ${opacity + mouseBoost})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
    }

    // =============================================
    //  CLICK WAVES
    // =============================================
    const waves = [];
    document.addEventListener('click', e => {
        // Find nearest interactable
        let target = e.target;
        while(target && target !== document.body) {
            if(target.hasAttribute('data-h') || target.tagName.toLowerCase() === 'a' || target.tagName.toLowerCase() === 'button') {
                return; // Don't trigger background wave if clicking a button/link
            }
            target = target.parentElement;
        }
        waves.push({ x: e.clientX, y: e.clientY, time: 0 });
    });

    function processWaves(time) {
        for (let i = waves.length - 1; i >= 0; i--) {
            const w = waves[i];
            w.time += 16;
            
            const maxDuration = 1500;
            if (w.time > maxDuration) {
                waves.splice(i, 1);
                continue;
            }

            const progress = w.time / maxDuration;
            const waveRadius = progress * 300;
            const waveFade = 1 - Math.pow(progress, 1.5);

            for (let r = 0; r < 3; r++) {
                const radius = waveRadius - r * 20;
                if (radius < 0) continue;
                const a = waveFade * (1 - r * 0.3) * 0.18;
                if (cCtx) {
                    cCtx.beginPath();
                    cCtx.arc(w.x, w.y, radius, 0, Math.PI * 2);
                    cCtx.strokeStyle = `rgba(128, 82, 255, ${a})`;
                    cCtx.lineWidth = 2.5 - r * 0.6;
                    cCtx.stroke();
                }
            }

            particles.forEach(pt => {
                const dx = pt.x - w.x;
                const dy = pt.y - w.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (Math.abs(dist - waveRadius) < 40) {
                    const force = (40 - Math.abs(dist - waveRadius)) / 40;
                    pt.pushX += (dx / dist) * force * 1.5;
                    pt.pushY += (dy / dist) * force * 1.5;
                }
            });
        }
    }

    // =============================================
    //  CURSOR — Comet trail on canvas
    // =============================================
    const TRAIL_LENGTH = 25;
    const trail = [];
    let smoothMX = 0, smoothMY = 0;

    function updateTrail() {
        smoothMX += (mouseX - smoothMX) * 0.35;
        smoothMY += (mouseY - smoothMY) * 0.35;

        if (mouseX > -1000) {
            trail.unshift({ x: smoothMX, y: smoothMY });
            if (trail.length > TRAIL_LENGTH) trail.pop();
        }
    }

    function drawCursorTrail() {
        if (!cCtx || trail.length < 2) return;

        const isHover = document.body.classList.contains('ch');
        const isText = document.body.classList.contains('ct');

        for (let i = 0; i < trail.length; i++) {
            const t = trail[i];
            const progress = i / trail.length;
            let size = 6 * (1 - progress * 0.85);
            let alpha = 0.6 * (1 - progress);

            if (isHover && i === 0) {
                size = 18; // Large glowing orb on hover
                alpha = 0.8;
            } else if (isText && i === 0) {
                size = 2; // Tiny dot for text
            }

            // Glow halo
            const glow = cCtx.createRadialGradient(t.x, t.y, 0, t.x, t.y, size * 3);
            glow.addColorStop(0, `rgba(128, 82, 255, ${alpha * 0.3})`);
            glow.addColorStop(1, 'rgba(128, 82, 255, 0)');
            cCtx.beginPath();
            cCtx.arc(t.x, t.y, size * 3, 0, Math.PI * 2);
            cCtx.fillStyle = glow;
            cCtx.fill();

            // Core dot
            cCtx.beginPath();
            cCtx.arc(t.x, t.y, size, 0, Math.PI * 2);
            cCtx.fillStyle = `rgba(128, 82, 255, ${alpha})`;
            cCtx.fill();
        }

        // Connecting line
        cCtx.beginPath();
        cCtx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            cCtx.lineTo(trail[i].x, trail[i].y);
        }
        cCtx.strokeStyle = 'rgba(128, 82, 255, 0.12)';
        cCtx.lineWidth = 1;
        cCtx.stroke();
    }

    // =============================================
    //  RENDER LOOP
    // =============================================
    function render(time) {
        smoothScroll += (targetScroll - smoothScroll) * 0.06;
        smoothVel = targetScroll - smoothScroll;

        updateTrail();
        ctx.clearRect(0, 0, W, H);
        if (cCtx) cCtx.clearRect(0, 0, W, H);
        particles.forEach(pt => pt.update(time));
        drawConnections();
        particles.forEach(pt => pt.draw());
        processWaves();
        drawCursorTrail();
        requestAnimationFrame(render);
    }
    render(0);

    // =============================================
    //  HOVER STATES
    // =============================================
    document.querySelectorAll('[data-h], .srv-row, .prod-card, .ind-card').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('ch'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('ch'));
    });
    document.querySelectorAll('input, textarea, select').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('ct'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('ct'));
    });

    // =============================================
    //  SCROLL EFFECTS — the sexiest on the planet
    // =============================================
    const scrollBar = document.getElementById('scrollBar');
    let lastSy = 0;
    let scrollSpeed = 0;

    function applyScrollEffects() {
        const sy = targetScroll;
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollBar) scrollBar.style.width = (sy / docH * 100) + '%';

        // Track scroll velocity
        scrollSpeed = Math.abs(sy - lastSy);
        lastSy = sy;

        const nav = document.getElementById('nav');
        if (sy > 50) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');

        // ---- HERO: parallax layers at different speeds ----
        const heroH1 = document.querySelector('.hero-h1');
        const heroSub = document.querySelector('.hero-sub');
        const heroChip = document.querySelector('.hero-chip');
        const heroBtns = document.querySelector('.hero-btns');
        const heroMetrics = document.querySelector('.hero-metrics');
        
        const r = Math.max(0, Math.min(1, sy / window.innerHeight));
        if (heroH1) { 
            heroH1.style.transform = `translateY(${sy * 0.25}px) scale(${1 - r * 0.05})`; 
        }
        if (heroSub) { 
            heroSub.style.transform = `translateY(${sy * 0.15}px)`; 
        }
        if (heroChip) { 
            heroChip.style.transform = `translateY(${sy * 0.3}px)`; 
        }
        if (heroBtns) { 
            heroBtns.style.transform = `translateY(${sy * 0.1}px)`; 
        }
        if (heroMetrics) { 
            heroMetrics.style.transform = `translateY(${sy * 0.05}px)`; 
        }

        // ---- SECTION HEADINGS: clip-path wipe + blur ----
        document.querySelectorAll('.sec-h, .contact-h').forEach(h => {
            const rect = h.getBoundingClientRect();
            if (rect.top < H * 0.88 && rect.bottom > 0) {
                const prog = Math.max(0, Math.min(1, (H * 0.88 - rect.top) / (H * 0.28)));
                const blur = (1 - prog) * 8;
                h.style.transform = `translateY(${(1 - prog) * 30}px)`;
                h.style.opacity = prog;
                h.style.filter = `blur(${blur}px)`;
                h.style.clipPath = `inset(0 ${(1 - prog) * 40}% 0 0)`;
            } else if (rect.top >= H * 0.88) {
                h.style.clipPath = 'inset(0 100% 0 0)';
                h.style.opacity = 0;
            }
        });

        // ---- TAGS: slide up ----
        document.querySelectorAll('.tag').forEach(tag => {
            const rect = tag.getBoundingClientRect();
            if (rect.top < H * 0.92 && rect.bottom > 0) {
                const prog = Math.max(0, Math.min(1, (H * 0.92 - rect.top) / (H * 0.2)));
                tag.style.transform = `translateY(${(1 - prog) * 20}px)`;
                tag.style.opacity = prog;
            }
        });

        // ---- SERVICE ROWS: 3D perspective tilt from sides ----
        document.querySelectorAll('.srv-row').forEach((row, i) => {
            const rect = row.getBoundingClientRect();
            if (rect.top < H * 0.9 && rect.bottom > 0) {
                const prog = Math.max(0, Math.min(1, (H * 0.9 - rect.top) / (H * 0.35)));
                const dir = i % 2 === 0 ? 1 : -1;
                const rotY = (1 - prog) * 8 * dir;
                const tX = (1 - prog) * 60 * dir;
                row.style.transform = `perspective(800px) translateX(${tX}px) rotateY(${rotY}deg)`;
                row.style.opacity = prog;
            }
        });

        // ---- INDUSTRY CARDS: stagger rise + 3D tilt ----
        document.querySelectorAll('.ind-card').forEach((card, i) => {
            const rect = card.getBoundingClientRect();
            if (rect.top < H * 0.92 && rect.bottom > 0) {
                const base = Math.max(0, Math.min(1, (H * 0.92 - rect.top) / (H * 0.35)));
                const delay = (i % 4) * 0.08;
                const prog = Math.max(0, Math.min(1, (base - delay) / (1 - delay)));
                const y = (1 - prog) * 70;
                const rotX = (1 - prog) * 12;
                card.style.transform = `perspective(600px) translateY(${y}px) rotateX(${rotX}deg)`;
                card.style.opacity = prog;
            }
        });

        // ---- STATEMENT: cinematic text reveal ----
        document.querySelectorAll('.s-line').forEach((line, i) => {
            const rect = line.getBoundingClientRect();
            if (rect.top < H * 0.85 && rect.bottom > 0) {
                const prog = Math.max(0, Math.min(1, (H * 0.85 - rect.top) / (H * 0.22)));
                const dir = i % 2 === 0 ? -1 : 1;
                const scale = 0.85 + prog * 0.15;
                const blur = (1 - prog) * 5;
                line.style.transform = `translateX(${(1 - prog) * 80 * dir}px) scale(${scale})`;
                line.style.opacity = prog;
                line.style.filter = `blur(${blur}px)`;
            }
        });

        // ---- PRODUCT CARDS: flip in from bottom with rotation ----
        document.querySelectorAll('.prod-card').forEach((card, i) => {
            const rect = card.getBoundingClientRect();
            if (rect.top < H * 0.9 && rect.bottom > 0) {
                const base = Math.max(0, Math.min(1, (H * 0.9 - rect.top) / (H * 0.3)));
                const delay = i * 0.12;
                const prog = Math.max(0, Math.min(1, (base - delay) / (1 - delay)));
                const rotX = (1 - prog) * 20;
                const y = (1 - prog) * 80;
                card.style.transform = `perspective(800px) translateY(${y}px) rotateX(${rotX}deg)`;
                card.style.opacity = prog;
            }
        });

        // ---- ABOUT: paragraph + KPI split reveal ----
        const aboutP = document.querySelector('.about-right .body-p');
        if (aboutP) {
            const rect = aboutP.getBoundingClientRect();
            if (rect.top < H * 0.9 && rect.bottom > 0) {
                const prog = Math.max(0, Math.min(1, (H * 0.9 - rect.top) / (H * 0.35)));
                aboutP.style.transform = `translateY(${(1 - prog) * 35}px)`;
                aboutP.style.opacity = prog;
            }
        }

        // ---- KPI ROW: elastic pop ----
        document.querySelectorAll('.kpi').forEach((kpi, i) => {
            const rect = kpi.getBoundingClientRect();
            if (rect.top < H * 0.9 && rect.bottom > 0) {
                const base = Math.max(0, Math.min(1, (H * 0.9 - rect.top) / (H * 0.25)));
                const delay = i * 0.12;
                const prog = Math.max(0, Math.min(1, (base - delay) / (1 - delay)));
                // Elastic overshoot
                const elastic = prog < 1 ? prog : 1;
                const scale = elastic < 0.8 ? elastic * 1.25 : 1 + (1 - elastic) * 0.3;
                kpi.style.transform = `scale(${Math.min(scale, 1.15)}) translateY(${(1 - prog) * 30}px)`;
                kpi.style.opacity = prog;
            }
        });

        // ---- STATEMENT STATS: bounce up stagger ----
        document.querySelectorAll('.ss').forEach((ss, i) => {
            const rect = ss.getBoundingClientRect();
            if (rect.top < H * 0.9 && rect.bottom > 0) {
                const base = Math.max(0, Math.min(1, (H * 0.9 - rect.top) / (H * 0.22)));
                const delay = i * 0.18;
                const prog = Math.max(0, Math.min(1, (base - delay) / (1 - delay)));
                const scale = prog < 0.85 ? prog * 1.18 : 1 + (1 - prog) * 0.2;
                ss.style.transform = `translateY(${(1 - prog) * 60}px) scale(${Math.min(scale, 1.1)})`;
                ss.style.opacity = prog;
            }
        });

        // ---- CONTACT: cinematic slide from sides ----
        const contactLeft = document.querySelector('.contact-left');
        const contactRight = document.querySelector('.contact-right');
        if (contactLeft) {
            const rect = contactLeft.getBoundingClientRect();
            if (rect.top < H * 0.92 && rect.bottom > 0) {
                const prog = Math.max(0, Math.min(1, (H * 0.92 - rect.top) / (H * 0.32)));
                const rotY = (1 - prog) * 6;
                contactLeft.style.transform = `perspective(800px) translateX(${(1 - prog) * -50}px) rotateY(${rotY}deg)`;
                contactLeft.style.opacity = prog;
            }
        }
        if (contactRight) {
            const rect = contactRight.getBoundingClientRect();
            if (rect.top < H * 0.92 && rect.bottom > 0) {
                const prog = Math.max(0, Math.min(1, (H * 0.92 - rect.top) / (H * 0.32)));
                const rotY = (1 - prog) * -6;
                contactRight.style.transform = `perspective(800px) translateX(${(1 - prog) * 50}px) rotateY(${rotY}deg)`;
                contactRight.style.opacity = prog;
            }
        }

        // ---- PARTICLE NETWORK: speed boost on fast scroll ----
        if (scrollSpeed > 3) {
            const boost = Math.min(scrollSpeed * 0.15, 4);
            particles.forEach(pt => {
                pt.pushX += (Math.random() - 0.5) * boost;
                pt.pushY += (Math.random() - 0.5) * boost;
            });
        }
    }

    window.addEventListener('scroll', () => {
        targetScroll = window.scrollY;
        applyScrollEffects();
    }, { passive: true });

    // =============================================
    //  REVEAL
    // =============================================
    const rvEls = document.querySelectorAll('.rv');
    const rvObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const d = parseInt(entry.target.dataset.d || 0);
                setTimeout(() => entry.target.classList.add('v'), d);
                rvObs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
    rvEls.forEach(el => rvObs.observe(el));

    // =============================================
    //  COUNTERS
    // =============================================
    const nums = document.querySelectorAll('[data-count]');
    const numObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseFloat(el.dataset.count);
                const isInt = el.hasAttribute('data-int');
                let cur = 0;
                const step = target / 55;
                function tick() {
                    cur += step;
                    if (cur >= target) {
                        el.textContent = isInt ? Math.round(target) : target;
                    } else {
                        el.textContent = isInt ? Math.floor(cur) : cur.toFixed(1);
                        requestAnimationFrame(tick);
                    }
                }
                tick();
                numObs.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    nums.forEach(n => numObs.observe(n));

    // =============================================
    //  TERMINAL
    // =============================================
    const termBody = document.getElementById('terminalBody');
    const termLines = [
        '$ vrindaelys init growth-engine',
        '  Initializing tracking...',
        '  Connecting to 42 countries...',
        '  AI model loaded.',
        '',
        '$ vrindaelys deploy --prod',
        '  Building optimized bundle...',
        '  SEO analysis: 98/100',
        '  AEO compliance: passed',
        '',
        '$ vrindaelys agents start',
        '  WhatsApp agent: online',
        '  Call agent: online',
        '  \u2713 All systems operational',
        '  \u2713 Live at vrindaelys.com',
    ];
    let lineIdx = 0, charIdx = 0;
    function typeLine() {
        if (lineIdx >= termLines.length) { lineIdx = 0; termBody.textContent = ''; }
        const line = termLines[lineIdx];
        if (charIdx <= line.length) {
            termBody.textContent = termLines.slice(0, lineIdx).join('\n') + '\n' + line.substring(0, charIdx);
            charIdx++;
            setTimeout(typeLine, line.startsWith('$') ? 40 : 18);
        } else {
            charIdx = 0;
            lineIdx++;
            setTimeout(typeLine, line === '' ? 200 : 400);
        }
    }
    const termObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) { typeLine(); termObs.disconnect(); }
    }, { threshold: 0.3 });
    if (termBody) termObs.observe(termBody);

    // =============================================
    //  MOBILE MENU
    // =============================================
    const burger = document.getElementById('burger');
    const mobOverlay = document.getElementById('mobOverlay');

    burger.addEventListener('click', () => {
        burger.classList.toggle('open');
        mobOverlay.classList.toggle('open');
        document.body.style.overflow = mobOverlay.classList.contains('open') ? 'hidden' : '';
    });
    mobOverlay.querySelectorAll('.mob-link').forEach(link => {
        link.addEventListener('click', () => {
            burger.classList.remove('open');
            mobOverlay.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // =============================================
    //  FORM (NO BACKEND SETUP VIA WEB3FORMS)
    // =============================================
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const btn = form.querySelector('.submit-btn');
            btn.classList.add('ld');
            btn.disabled = true;

            const formData = new FormData(form);
            formData.append('access_key', 'd9a10ac1-4b1b-47c3-86a2-17b905184ae3');

            try {
                const res = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    btn.classList.remove('ld');
                    btn.classList.add('ok');
                    form.reset();
                    setTimeout(() => { btn.classList.remove('ok'); btn.disabled = false; }, 3500);
                } else {
                    throw new Error('Form submission failed');
                }
            } catch (err) {
                console.error(err);
                btn.classList.remove('ld');
                alert("Something went wrong. Please try again.");
                btn.disabled = false;
            }
        });
    }
    const ta = document.getElementById('cMsg');
    if (ta) ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; });

    // =============================================
    //  HERO REVEAL
    // =============================================
    // Reveal the hero as soon as the DOM is ready — do NOT wait for window 'load'
    // (which blocks on fonts, images and the external analytics script).
    requestAnimationFrame(() => {
        document.querySelectorAll('.hero .rv, .hero .rv-mask').forEach(el => {
            const d = parseInt(el.dataset.d || 0);
            setTimeout(() => el.classList.add('v'), d);
        });
    });

})();
