// ============ CLOCK ============
function updateClock() {
    const now = new Date();
    const d = now.toLocaleDateString('fr-FR');
    const t = now.toLocaleTimeString('fr-FR');
    document.getElementById('clock').textContent = d + '  —  ' + t;
}
setInterval(updateClock, 1000);
updateClock();

// ============ BACKGROUND PARTICLES ============
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

bgCanvas.width = window.innerWidth;
bgCanvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
});

const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * bgCanvas.width,
    y: Math.random() * bgCanvas.height,
    r: Math.random() * 1.5 + 0.3,
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.15,
    a: Math.random()
}));

function drawBg() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = bgCanvas.width;
        if (p.x > bgCanvas.width) p.x = 0;
        if (p.y < 0) p.y = bgCanvas.height;
        if (p.y > bgCanvas.height) p.y = 0;
        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(0,212,255,${p.a * 0.4})`;
        bgCtx.fill();
    });
    requestAnimationFrame(drawBg);
}
drawBg();

// ============ ORB ANIMATION ============
const orbCanvas = document.getElementById('orb-canvas');
const ctx = orbCanvas.getContext('2d');
const cx = 110, cy = 110;
let angle = 0, pulse = 0;

function drawOrb() {
    ctx.clearRect(0, 0, 220, 220);
    pulse += 0.03;
    angle += 1.2;

    const blue = '#00d4ff';

    // Ring 1 — static outer
    ctx.beginPath();
    ctx.arc(cx, cy, 95, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,212,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ring 2 — rotating dashes
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle * Math.PI / 180);
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 82, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,212,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Ring 3 — counter rotating
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-angle * 0.6 * Math.PI / 180);
    ctx.setLineDash([12, 8, 2, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,212,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Tick marks outer ring
    for (let i = 0; i < 36; i++) {
        const a = (i * 10) * Math.PI / 180;
        const len = i % 3 === 0 ? 8 : 4;
        const r1 = 95, r2 = r1 - len;
        ctx.beginPath();
        ctx.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
        ctx.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a));
        ctx.strokeStyle = i % 9 === 0 ? blue : 'rgba(0,212,255,0.3)';
        ctx.lineWidth = i % 9 === 0 ? 2 : 1;
        ctx.stroke();
    }

    // Ring 4 — solid inner glow
    const glowR = 52 + Math.sin(pulse) * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.strokeStyle = blue;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Halo
    const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 55);
    grad.addColorStop(0, 'rgba(0,212,255,0.12)');
    grad.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, 55, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 3 rotating dots
    for (let i = 0; i < 3; i++) {
        const a = (angle + i * 120) * Math.PI / 180;
        const dx = cx + 82 * Math.cos(a);
        const dy = cy + 82 * Math.sin(a);
        ctx.beginPath();
        ctx.arc(dx, dy, 3, 0, Math.PI * 2);
        ctx.fillStyle = blue;
        ctx.fill();
    }

    // Center text
    ctx.font = '700 13px Orbitron, monospace';
    ctx.fillStyle = blue;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FRIDAY', cx, cy);

    requestAnimationFrame(drawOrb);
}
drawOrb();