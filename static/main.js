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

function resizeBg() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
}
resizeBg();
window.addEventListener('resize', resizeBg);

const particles = Array.from({ length: 50 }, () => ({
    x: Math.random() * bgCanvas.width,
    y: Math.random() * bgCanvas.height,
    r: Math.random() * 1.2 + 0.2,
    vx: (Math.random() - 0.5) * 0.1,
    vy: (Math.random() - 0.5) * 0.1,
    a: Math.random() * 0.5
}));

function drawBg() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = bgCanvas.width;
        if (p.x > bgCanvas.width) p.x = 0;
        if (p.y < 0) p.y = bgCanvas.height;
        if (p.y > bgCanvas.height) p.y = 0;
        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(0,212,255,${p.a * 0.3})`;
        bgCtx.fill();
    });
    requestAnimationFrame(drawBg);
}
drawBg();

// ============ ECG GRAPH ============
const ecgCanvas = document.getElementById('ecg');
const ecgCtx = ecgCanvas.getContext('2d');
let ecgPoints = [];

function resizeEcg() {
    ecgCanvas.width = ecgCanvas.parentElement.offsetWidth - 28;
    ecgCanvas.height = 60;
}
resizeEcg();
window.addEventListener('resize', resizeEcg);

function drawEcg() {
    ecgCtx.clearRect(0, 0, ecgCanvas.width, ecgCanvas.height);
    if (ecgPoints.length < 2) return;

    ecgCtx.beginPath();
    ecgCtx.strokeStyle = '#00d4ff';
    ecgCtx.lineWidth = 1.5;
    ecgCtx.shadowColor = '#00d4ff';
    ecgCtx.shadowBlur = 4;

    const step = ecgCanvas.width / Math.max(ecgPoints.length - 1, 1);
    ecgPoints.forEach((val, i) => {
        const x = i * step;
        const y = ecgCanvas.height - (val / 100) * ecgCanvas.height;
        i === 0 ? ecgCtx.moveTo(x, y) : ecgCtx.lineTo(x, y);
    });
    ecgCtx.stroke();
    ecgCtx.shadowBlur = 0;
}

// ============ METRICS ============
function updateBar(id, value, max = 100) {
    const bar = document.getElementById(id);
    if (!bar) return;
    const pct = Math.min((value / max) * 100, 100);
    bar.style.width = pct + '%';
    bar.className = 'metric-fill';
    if (pct > 80) bar.classList.add('danger');
    else if (pct > 60) bar.classList.add('warn');
}

function updateMetrics() {
    fetch('/api/metrics')
        .then(r => r.json())
        .then(data => {
            document.getElementById('cpu-val').textContent = data.cpu + '%';
            document.getElementById('ram-val').textContent = data.ram + '%';
            document.getElementById('temp-val').textContent = (data.temp || '—') + (data.temp ? '°C' : '');
            document.getElementById('disk-val').textContent = data.disk + '%';
            document.getElementById('uptime-val').textContent = data.uptime || '—';

            updateBar('cpu-bar', data.cpu);
            updateBar('ram-bar', data.ram);
            updateBar('temp-bar', data.temp || 0, 85);
            updateBar('disk-bar', data.disk);

            ecgPoints.push(data.cpu);
            if (ecgPoints.length > ecgCanvas.width / 3) ecgPoints.shift();
            drawEcg();
        })
        .catch(() => {
            // Mode local sans backend — valeurs simulées
            const cpu = Math.floor(Math.random() * 40 + 10);
            const ram = Math.floor(Math.random() * 30 + 30);
            document.getElementById('cpu-val').textContent = cpu + '%';
            document.getElementById('ram-val').textContent = ram + '%';
            document.getElementById('temp-val').textContent = '—';
            document.getElementById('disk-val').textContent = '—';
            document.getElementById('uptime-val').textContent = '—';
            updateBar('cpu-bar', cpu);
            updateBar('ram-bar', ram);
            ecgPoints.push(cpu);
            if (ecgPoints.length > ecgCanvas.width / 3) ecgPoints.shift();
            drawEcg();
        });
}

setInterval(updateMetrics, 2000);
updateMetrics();

// ============ CIBLES (LOCAL STORAGE) ============
let cibles = JSON.parse(localStorage.getItem('friday-cibles') || '[]');
let activeCibleId = null;

function saveCibles() {
    localStorage.setItem('friday-cibles', JSON.stringify(cibles));
}

function renderCibles() {
    const list = document.getElementById('cible-list');
    const search = document.getElementById('search').value.toLowerCase();
    list.innerHTML = '';

    const filtered = cibles.filter(c =>
        (c.nom + ' ' + c.prenom).toLowerCase().includes(search)
    );

    document.getElementById('compteur-cibles').textContent = cibles.length;

    filtered.forEach(c => {
        const li = document.createElement('li');
        li.className = 'cible-item' + (c.id === activeCibleId ? ' active' : '');
        li.dataset.id = c.id;
        li.innerHTML = `
            <div>
                <div class="cible-nom">${c.nom.toUpperCase()}</div>
                <div class="cible-prenom">${c.prenom}</div>
            </div>
            <button class="btn-supprimer-item" data-id="${c.id}">✕</button>
        `;
        li.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-supprimer-item')) return;
            openDossier(c.id);
        });
        li.querySelector('.btn-supprimer-item').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteCible(c.id);
        });
        list.appendChild(li);
    });
}

function openDossier(id) {
    activeCibleId = id;
    const c = cibles.find(x => x.id === id);
    if (!c) return;

    document.getElementById('dossier-empty').style.display = 'none';
    document.getElementById('dossier-content').style.display = 'flex';

    document.getElementById('d-id').textContent = id;
    document.getElementById('d-name').textContent = c.nom.toUpperCase() + ' ' + c.prenom;
    document.getElementById('d-fullname').textContent = c.prenom + ' ' + c.nom;
    document.getElementById('d-email').textContent = c.email || '—';
    document.getElementById('d-tel').textContent = c.telephone || '—';
    document.getElementById('notes-area').value = c.notes || '';

    renderReseaux(c);
    renderFichiers(c);
    renderCibles();

    // Reset tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('.tab[data-tab="infos"]').classList.add('active');
    document.getElementById('tab-infos').classList.add('active');
}

function deleteCible(id) {
    if (!confirm('Supprimer cette cible ?')) return;
    cibles = cibles.filter(c => c.id !== id);
    saveCibles();
    if (activeCibleId === id) {
        activeCibleId = null;
        document.getElementById('dossier-empty').style.display = 'flex';
        document.getElementById('dossier-content').style.display = 'none';
    }
    renderCibles();
}

function renderReseaux(c) {
    const list = document.getElementById('reseaux-list');
    list.innerHTML = '';
    (c.reseaux || []).forEach((r, i) => {
        const div = document.createElement('div');
        div.className = 'reseau-tag';
        div.innerHTML = `<span>${r.type.toUpperCase()}</span> ${r.url} <button onclick="deleteReseau(${i})" style="background:none;border:none;color:#ff3333;cursor:pointer;font-size:10px;">✕</button>`;
        list.appendChild(div);
    });
}

function renderFichiers(c) {
    const list = document.getElementById('fichiers-list');
    list.innerHTML = '';
    (c.fichiers || []).forEach((f, i) => {
        const div = document.createElement('div');
        div.className = 'fichier-card';
        const ext = f.nom.split('.').pop().toUpperCase();
        div.innerHTML = `
            <div class="fichier-icon">📄</div>
            <div class="fichier-nom">${f.nom}</div>
            <div class="fichier-type">${ext}</div>
        `;
        list.appendChild(div);
    });
}

window.deleteReseau = function(index) {
    const c = cibles.find(x => x.id === activeCibleId);
    if (!c) return;
    c.reseaux.splice(index, 1);
    saveCibles();
    renderReseaux(c);
};

// ============ FORM NOUVELLE CIBLE ============
const modal = document.getElementById('modal');

document.getElementById('btn-nouvelle-cible').addEventListener('click', () => {
    modal.classList.add('active');
});

document.getElementById('modal-close').addEventListener('click', () => {
    modal.classList.remove('active');
});

modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('active');
});

document.getElementById('form-cible').addEventListener('submit', e => {
    e.preventDefault();
    const newCible = {
        id: Date.now(),
        nom: document.getElementById('input-nom').value.trim(),
        prenom: document.getElementById('input-prenom').value.trim(),
        email: document.getElementById('input-email').value.trim(),
        telephone: document.getElementById('input-tel').value.trim(),
        reseaux: [],
        fichiers: [],
        notes: ''
    };
    if (!newCible.nom) return;
    cibles.push(newCible);
    saveCibles();
    renderCibles();
    modal.classList.remove('active');
    e.target.reset();
    openDossier(newCible.id);
});

// ============ TABS ============
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
});

// ============ SEARCH ============
document.getElementById('search').addEventListener('input', renderCibles);

// ============ COPIER ============
document.querySelectorAll('.btn-copier').forEach(btn => {
    btn.addEventListener('click', () => {
        const text = btn.parentElement.textContent.trim();
        navigator.clipboard.writeText(text).then(() => {
            btn.textContent = '✓';
            setTimeout(() => btn.textContent = '⎘', 1500);
        });
    });
});

// ============ NOTES ============
document.getElementById('btn-save-notes').addEventListener('click', () => {
    const c = cibles.find(x => x.id === activeCibleId);
    if (!c) return;
    c.notes = document.getElementById('notes-area').value;
    saveCibles();
    document.getElementById('btn-save-notes').textContent = '✓ SAUVEGARDÉ';
    setTimeout(() => document.getElementById('btn-save-notes').textContent = 'SAUVEGARDER', 2000);
});

// ============ DELETE CIBLE (dossier) ============
document.getElementById('btn-delete-cible').addEventListener('click', () => {
    if (activeCibleId) deleteCible(activeCibleId);
});

// ============ INIT ============
renderCibles();