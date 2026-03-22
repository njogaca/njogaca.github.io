/* ===== Message Queue Flow Background ===== */
(function () {
    const canvas = document.getElementById('networkCanvas');
    const ctx = canvas.getContext('2d');
    let services = [];
    let connections = [];
    let messages = [];
    let mouse = { x: -1000, y: -1000 };
    const P = { r: 0, g: 200, b: 83 };
    const A = { r: 255, g: 183, b: 50 }; // Amber/Gold for messages

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        buildTopology();
    }

    function isMobile() {
        return window.innerWidth < 768;
    }

    // Service node types with labels
    const SERVICE_TYPES = ['SVC', 'API', 'MQ', 'DB', 'ESB', 'GW', 'REG', 'APP'];

    function makeService(x, y, type, size) {
        return {
            x, y, type, size,
            opacity: Math.random() * 0.12 + 0.25,
            pulsePhase: Math.random() * Math.PI * 2
        };
    }

    function addConnection(i, j, baseOpacity) {
        const a = services[i];
        const b = services[j];
        // L-shaped orthogonal trace
        const goHoriz = Math.abs(a.x - b.x) > Math.abs(a.y - b.y);
        const midX = goHoriz ? b.x : a.x;
        const midY = goHoriz ? a.y : b.y;
        connections.push({
            from: i, to: j,
            path: [
                { x: a.x, y: a.y },
                { x: midX, y: midY },
                { x: b.x, y: b.y }
            ],
            opacity: baseOpacity + Math.random() * 0.04
        });
    }

    function buildTopology() {
        services = [];
        connections = [];
        messages = [];

        const W = canvas.width;
        const H = canvas.height;
        const mobile = isMobile();

        // ── Chip layout: repeating tile of a microchip module ──
        // Each chip has a central bus (ESB/MQ) with peripheral services around it
        const chipW = mobile ? 320 : 360;
        const chipH = mobile ? 280 : 300;
        const cols = Math.ceil(W / chipW) + 1;
        const rows = Math.ceil(H / chipH) + 1;
        // Offset so chips tile across the full page
        const offX = -chipW * 0.3;
        const offY = -chipH * 0.3;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cx = offX + col * chipW + chipW / 2;
                const cy = offY + row * chipH + chipH / 2;

                // Slight jitter so it doesn't look perfectly rigid
                const jit = () => (Math.random() - 0.5) * 8;

                // Central bus nodes (ESB + MQ side by side)
                const baseIdx = services.length;
                const busSpacing = mobile ? 36 : 44;

                // Core: ESB left, MQ right
                services.push(makeService(cx - busSpacing + jit(), cy + jit(), 'ESB', 22));
                services.push(makeService(cx + busSpacing + jit(), cy + jit(), 'MQ', 22));

                // Connect ESB ↔ MQ (horizontal bus)
                addConnection(baseIdx, baseIdx + 1, 0.12);

                // Peripheral services arranged as chip pins
                // Top row: API, GW
                const topY = cy - chipH * 0.35 + jit();
                services.push(makeService(cx - busSpacing + jit(), topY, 'API', 16));
                services.push(makeService(cx + busSpacing + jit(), topY, 'GW', 16));

                // Bottom row: DB, REG
                const botY = cy + chipH * 0.35 + jit();
                services.push(makeService(cx - busSpacing + jit(), botY, 'DB', 16));
                services.push(makeService(cx + busSpacing + jit(), botY, 'REG', 16));

                // Left pin: SVC
                const leftX = cx - chipW * 0.4 + jit();
                services.push(makeService(leftX, cy + jit(), 'SVC', 16));

                // Right pin: APP
                const rightX = cx + chipW * 0.4 + jit();
                services.push(makeService(rightX, cy + jit(), 'APP', 16));

                // ── Connections: pins → central bus via L-shaped traces ──
                // API → ESB (top-left to center-left)
                addConnection(baseIdx + 2, baseIdx, 0.10);
                // GW → MQ (top-right to center-right)
                addConnection(baseIdx + 3, baseIdx + 1, 0.10);
                // DB → ESB (bottom-left to center-left)
                addConnection(baseIdx + 4, baseIdx, 0.10);
                // REG → MQ (bottom-right to center-right)
                addConnection(baseIdx + 5, baseIdx + 1, 0.10);
                // SVC → ESB (left pin to center-left)
                addConnection(baseIdx + 6, baseIdx, 0.10);
                // APP → MQ (right pin to center-right)
                addConnection(baseIdx + 7, baseIdx + 1, 0.10);

                // Cross connections for richer network
                if (Math.random() < 0.5) addConnection(baseIdx + 2, baseIdx + 1, 0.06);
                if (Math.random() < 0.5) addConnection(baseIdx + 4, baseIdx + 1, 0.06);
                if (Math.random() < 0.5) addConnection(baseIdx + 3, baseIdx, 0.06);
                if (Math.random() < 0.5) addConnection(baseIdx + 5, baseIdx, 0.06);
            }
        }

        // Spawn messages
        const msgCount = mobile ? 8 : 25;
        for (let i = 0; i < msgCount; i++) {
            spawnMessage();
        }
    }

    function spawnMessage() {
        if (connections.length === 0) return;
        const conn = connections[Math.floor(Math.random() * connections.length)];
        const reverse = Math.random() < 0.5;
        messages.push({
            conn,
            progress: 0,
            speed: Math.random() * 0.006 + 0.002,
            reverse,
            opacity: Math.random() * 0.5 + 0.35,
            width: Math.random() * 4 + 8,
            height: Math.random() * 2 + 5
        });
    }

    function getPathPoint(path, t) {
        let totalLen = 0;
        const segs = [];
        for (let i = 0; i < path.length - 1; i++) {
            const dx = path[i + 1].x - path[i].x;
            const dy = path[i + 1].y - path[i].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            segs.push({ s: path[i], e: path[i + 1], len });
            totalLen += len;
        }
        let target = t * totalLen;
        for (const seg of segs) {
            if (target <= seg.len) {
                const r = seg.len > 0 ? target / seg.len : 0;
                return {
                    x: seg.s.x + (seg.e.x - seg.s.x) * r,
                    y: seg.s.y + (seg.e.y - seg.s.y) * r
                };
            }
            target -= seg.len;
        }
        return path[path.length - 1];
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const time = Date.now() * 0.001;

        // Draw connections (pipes/channels)
        for (const conn of connections) {
            // Mouse proximity check
            let nearMouse = false;
            for (const p of conn.path) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                if (Math.sqrt(dx * dx + dy * dy) < 160) { nearMouse = true; break; }
            }

            const op = nearMouse ? conn.opacity + 0.06 : conn.opacity;
            const lw = nearMouse ? 1.5 : 1;

            ctx.beginPath();
            ctx.moveTo(conn.path[0].x, conn.path[0].y);
            for (let i = 1; i < conn.path.length; i++) {
                ctx.lineTo(conn.path[i].x, conn.path[i].y);
            }
            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${op})`;
            ctx.lineWidth = lw;
            ctx.setLineDash([4, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw service nodes
        for (const svc of services) {
            const dx = svc.x - mouse.x;
            const dy = svc.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const mouseBoost = dist < 140 ? (1 - dist / 140) * 0.3 : 0;
            const pulse = Math.sin(time * 1.5 + svc.pulsePhase) * 0.03;
            const op = svc.opacity + mouseBoost + pulse;

            const s = svc.size;

            // Rounded rectangle body
            const rx = svc.x - s;
            const ry = svc.y - s * 0.7;
            const rw = s * 2;
            const rh = s * 1.4;
            const cr = 3;

            ctx.beginPath();
            ctx.moveTo(rx + cr, ry);
            ctx.lineTo(rx + rw - cr, ry);
            ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + cr);
            ctx.lineTo(rx + rw, ry + rh - cr);
            ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - cr, ry + rh);
            ctx.lineTo(rx + cr, ry + rh);
            ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - cr);
            ctx.lineTo(rx, ry + cr);
            ctx.quadraticCurveTo(rx, ry, rx + cr, ry);
            ctx.closePath();

            ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${op})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${op * 0.15})`;
            ctx.fill();

            // Label
            ctx.font = `${Math.max(8, s * 0.55)}px Inter, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${op * 0.8})`;
            ctx.fillText(svc.type, svc.x, svc.y);

            // Connection dot on top
            ctx.beginPath();
            ctx.arc(svc.x, ry, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${op * 1.2})`;
            ctx.fill();

            // Glow ring on mouse hover
            if (mouseBoost > 0.1) {
                ctx.beginPath();
                ctx.arc(svc.x, svc.y, s + 8, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${P.r}, ${P.g}, ${P.b}, ${mouseBoost * 0.3})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }

        // Draw messages (small rectangles traveling along connections)
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            msg.progress += msg.speed;

            if (msg.progress > 1) {
                messages.splice(i, 1);
                spawnMessage();
                continue;
            }

            const t = msg.reverse ? 1 - msg.progress : msg.progress;
            const pos = getPathPoint(msg.conn.path, t);

            // Fade in/out
            const fade = Math.min(msg.progress / 0.1, 1) * Math.min((1 - msg.progress) / 0.1, 1);
            const alpha = msg.opacity * fade;

            // Message envelope rectangle
            const mw = msg.width;
            const mh = msg.height;

            ctx.save();
            ctx.translate(pos.x, pos.y);

            // Body
            ctx.fillStyle = `rgba(${A.r}, ${A.g}, ${A.b}, ${alpha * 0.25})`;
            ctx.fillRect(-mw / 2, -mh / 2, mw, mh);
            ctx.strokeStyle = `rgba(${A.r}, ${A.g}, ${A.b}, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.strokeRect(-mw / 2, -mh / 2, mw, mh);

            // Envelope flap (triangle on top)
            ctx.beginPath();
            ctx.moveTo(-mw / 2, -mh / 2);
            ctx.lineTo(0, -mh / 2 + mh * 0.35);
            ctx.lineTo(mw / 2, -mh / 2);
            ctx.strokeStyle = `rgba(${A.r}, ${A.g}, ${A.b}, ${alpha * 0.6})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // Glow trail
            ctx.beginPath();
            ctx.arc(0, 0, mw * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${A.r}, ${A.g}, ${A.b}, ${alpha * 0.08})`;
            ctx.fill();

            ctx.restore();
        }

        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseout', () => { mouse.x = -1000; mouse.y = -1000; });

    resize();
    draw();
})();

/* ===== Navbar Scroll ===== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

/* ===== Mobile Nav Toggle ===== */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

/* ===== Timeline Card Toggle ===== */
function toggleCard(header) {
    const item = header.closest('.timeline-item');
    const wasActive = item.classList.contains('active');

    // Close all
    document.querySelectorAll('.timeline-item.active').forEach(el => {
        el.classList.remove('active');
    });

    // Open clicked if it wasn't active
    if (!wasActive) {
        item.classList.add('active');
    }
}

/* ===== Timeline Scroll Progress ===== */
function updateTimelineProgress() {
    const timeline = document.querySelector('.timeline');
    const progress = document.getElementById('timelineProgress');
    if (!timeline || !progress) return;

    const rect = timeline.getBoundingClientRect();
    const timelineTop = rect.top + window.scrollY;
    const timelineHeight = rect.height;
    const scrollPos = window.scrollY + window.innerHeight * 0.5;

    const progressAmount = Math.min(
        Math.max((scrollPos - timelineTop) / timelineHeight, 0),
        1
    );

    progress.style.height = (progressAmount * timelineHeight) + 'px';
}

window.addEventListener('scroll', updateTimelineProgress);

/* ===== Fade-in Observer ===== */
const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            fadeObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

/* ===== Skill Badge Stagger Animation ===== */
const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.querySelectorAll('.skill-badge').forEach((badge, i) => {
                setTimeout(() => {
                    badge.style.opacity = '1';
                    badge.style.transform = 'translateX(0)';
                }, i * 80);
            });
            skillObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.2 });

document.querySelectorAll('.skill-category').forEach(el => {
    el.querySelectorAll('.skill-badge').forEach(badge => {
        badge.style.opacity = '0';
        badge.style.transform = 'translateX(-16px)';
        badge.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    });
    skillObserver.observe(el);
});

/* ===== Smooth Scroll ===== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
