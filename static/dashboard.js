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

    // Champs extra — nettoyer d'abord
    const table = document.getElementById('infos-table');
    table.querySelectorAll('.extra-row').forEach(r => r.remove());

    if (c.champsExtra && c.champsExtra.length > 0) {
        c.champsExtra.forEach(champ => {
            const tr = document.createElement('tr');
            tr.className = 'extra-row';
            tr.innerHTML = `
                <td class="data-key">${champ.cle.toUpperCase()}</td>
                <td>${champ.val}</td>
                <td>
                    <button class="btn-copier">⎘</button>
                    <button onclick="deleteChampExtra(${champ.id})"
                            style="background:none;border:none;color:#ff3333;cursor:pointer;font-size:10px;opacity:0.6;">✕</button>
                </td>
            `;
            table.appendChild(tr);
        });
    }

    renderReseaux(c);
    renderFichiers(c);
    renderCibles();
    renderTimeline(c);
    updateRiskBadge(c);
    renderHistorique(c);

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('.tab[data-tab="infos"]').classList.add('active');
    document.getElementById('tab-infos').classList.add('active');
}

// En dehors de openDossier !
window.deleteChampExtra = function (id) {
    const c = cibles.find(x => x.id === activeCibleId);
    if (!c) return;
    c.champsExtra = c.champsExtra.filter(ch => ch.id !== id);
    saveCibles();
    addHistorique(c, 'Champ supprimé');
    openDossier(c.id);
};

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

window.deleteReseau = function (index) {
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
    addHistorique(newCible, `Dossier créé — ${newCible.prenom} ${newCible.nom}`);
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
    addHistorique(c, 'Notes modifiées');
});

// ============ DELETE CIBLE (dossier) ============
document.getElementById('btn-delete-cible').addEventListener('click', () => {
    if (activeCibleId) deleteCible(activeCibleId);
});

// ============ TIMELINE ============
function renderTimeline(c) {
    const list = document.getElementById('timeline-list');
    list.innerHTML = '';

    if (!c.timeline || c.timeline.length === 0) {
        list.innerHTML = '<div style="color: var(--text-dim); font-size:11px; opacity:0.4; padding: 10px 0;">Aucun événement enregistré.</div>';
        return;
    }

    // Tri du plus récent au plus ancien
    const sorted = [...c.timeline].sort((a, b) => b.date - a.date);

    sorted.forEach((evt, i) => {
        const div = document.createElement('div');
        div.className = `timeline-item ${evt.type}`;
        const date = new Date(evt.date).toLocaleString('fr-FR');
        div.innerHTML = `
            <div class="timeline-date">${date}</div>
            <span class="timeline-type ${evt.type}">${evt.type.toUpperCase()}</span>
            <div class="timeline-text">${evt.text}</div>
            <button class="timeline-delete" data-index="${evt.id}">✕</button>
        `;
        div.querySelector('.timeline-delete').addEventListener('click', () => {
            deleteTimelineEvent(c, evt.id);
        });
        list.appendChild(div);
    });
}

function deleteTimelineEvent(c, id) {
    c.timeline = c.timeline.filter(e => e.id !== id);
    saveCibles();
    renderTimeline(c);
}

function addTimelineEvent() {
    const c = cibles.find(x => x.id === activeCibleId);
    if (!c) return;

    const text = document.getElementById('timeline-input').value.trim();
    const type = document.getElementById('timeline-type').value;
    if (!text) return;

    if (!c.timeline) c.timeline = [];

    c.timeline.push({
        id: Date.now(),
        date: Date.now(),
        type: type,
        text: text
    });

    saveCibles();
    document.getElementById('timeline-input').value = '';
    renderTimeline(c);
    updateRiskBadge(cibles.find(x => x.id === activeCibleId));
    addHistorique(c, `Événement ajouté : [${type.toUpperCase()}] ${text}`);
}

document.getElementById('btn-add-event').addEventListener('click', addTimelineEvent);

document.getElementById('timeline-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') addTimelineEvent();
});

// ============ SCORE DE RISQUE ============
function calculateRisk(c) {
    let score = 0;

    // Infos de base
    if (c.email) score += 10;
    if (c.telephone) score += 10;

    // Réseaux sociaux
    score += (c.reseaux?.length || 0) * 15;

    // Fichiers
    score += (c.fichiers?.length || 0) * 10;

    // Timeline — alertes comptent double
    if (c.timeline) {
        score += c.timeline.filter(e => e.type === 'info').length * 5;
        score += c.timeline.filter(e => e.type === 'action').length * 8;
        score += c.timeline.filter(e => e.type === 'contact').length * 8;
        score += c.timeline.filter(e => e.type === 'alert').length * 20;
    }

    // Notes remplies
    if (c.notes && c.notes.length > 20) score += 10;

    // Déterminer le niveau
    let level, label;
    if (score < 30) {
        level = 'low';
        label = 'RISQUE FAIBLE';
    } else if (score < 70) {
        level = 'medium';
        label = 'RISQUE MODÉRÉ';
    } else {
        level = 'high';
        label = 'RISQUE ÉLEVÉ';
    }

    return { score, level, label };
}

function updateRiskBadge(c) {
    const { level, label } = calculateRisk(c);
    const badge = document.getElementById('risk-badge');
    const dot = document.getElementById('risk-dot');
    const text = document.getElementById('risk-label');

    badge.className = `risk-badge ${level}`;
    dot.className = `risk-dot ${level}`;
    text.textContent = label;
}

// ============ HISTORIQUE ============
function addHistorique(c, text) {
    if (!c.historique) c.historique = [];
    c.historique.unshift({
        id: Date.now(),
        date: Date.now(),
        text: text
    });
    // Garder max 50 entrées
    if (c.historique.length > 50) c.historique.pop();
    saveCibles();
}

function renderHistorique(c) {
    const list = document.getElementById('historique-list');
    list.innerHTML = '';

    if (!c.historique || c.historique.length === 0) {
        list.innerHTML = '<div style="color:var(--text);opacity:0.3;font-size:11px;padding:10px 0;">Aucune modification enregistrée.</div>';
        return;
    }

    c.historique.forEach(h => {
        const div = document.createElement('div');
        div.className = 'historique-item';
        div.innerHTML = `
            <span class="historique-item-date">${new Date(h.date).toLocaleString('fr-FR')}</span>
            <span class="historique-item-text">${h.text}</span>
        `;
        list.appendChild(div);
    });
}

document.getElementById('btn-clear-historique').addEventListener('click', () => {
    const c = cibles.find(x => x.id === activeCibleId);
    if (!c) return;
    if (!confirm('Effacer tout l\'historique ?')) return;
    c.historique = [];
    saveCibles();
    renderHistorique(c);
});

// ============ AJOUTER CHAMP INFO ============
document.getElementById('tab-infos').addEventListener('click', function (e) {
    if (!e.target.classList.contains('btn-add-info')) return;
    const c = cibles.find(x => x.id === activeCibleId);
    if (!c) return;

    const cle = prompt('Nom du champ (ex: Adresse, Profession...) :');
    if (!cle) return;
    const val = prompt(`Valeur pour "${cle}" :`);
    if (!val) return;

    if (!c.champsExtra) c.champsExtra = [];
    c.champsExtra.push({ id: Date.now(), cle, val });
    saveCibles();
    addHistorique(c, `Champ ajouté : ${cle} — ${val}`);
    openDossier(c.id);
});

// ============ AJOUTER RÉSEAU ============
document.getElementById('tab-reseaux').addEventListener('click', function (e) {
    if (!e.target.classList.contains('btn-add-info')) return;
    const c = cibles.find(x => x.id === activeCibleId);
    if (!c) return;

    const type = prompt('Type de réseau (ex: Twitter, Instagram, LinkedIn...) :');
    if (!type) return;
    const url = prompt(`URL ou identifiant pour "${type}" :`);
    if (!url) return;

    if (!c.reseaux) c.reseaux = [];
    c.reseaux.push({ id: Date.now(), type, url });
    saveCibles();
    addHistorique(c, `Réseau ajouté : ${type} — ${url}`);
    renderReseaux(c);
    updateRiskBadge(c);
});

// ============ WIDGET FRIDAY ============
const FRIDAY_WEBHOOK = "https://jewman.app.n8n.cloud/webhook/friday";
const NTFY_TOPIC = "friday-v1-2026";

let widgetOpen = false;
let lastNtfyMsg = "";

// Toggle widget
document.getElementById('friday-fab').addEventListener('click', () => {
    widgetOpen = !widgetOpen;
    document.getElementById('friday-widget').classList.toggle('open', widgetOpen);
    document.getElementById('friday-fab').textContent = widgetOpen ? '✕ FERMER' : '⬡ FRIDAY';
    if (widgetOpen) document.getElementById('friday-widget-input').focus();
});

document.getElementById('friday-widget-toggle').addEventListener('click', () => {
    widgetOpen = false;
    document.getElementById('friday-widget').classList.remove('open');
    document.getElementById('friday-fab').textContent = '⬡ FRIDAY';
});

// Ajouter message dans le log
function widgetLog(text, type = 'friday') {
    const log = document.getElementById('friday-widget-log');
    const div = document.createElement('div');
    div.className = `widget-msg ${type}`;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

// Mettre à jour le status
function widgetSetStatus(text, color = null) {
    const el = document.getElementById('friday-widget-status');
    el.textContent = text;
    el.style.color = color || '';
    el.style.opacity = color ? '1' : '0.6';
}

// Envoyer message à Friday
function widgetSend() {
    const input = document.getElementById('friday-widget-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    widgetLog(msg, 'user');
    widgetSetStatus('● TRAITEMENT...', '#ffa500');

    fetch(FRIDAY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
    }).catch(e => {
        widgetLog('Erreur de connexion.', 'system');
        widgetSetStatus('● ERREUR', '#ff3333');
    });
}

document.getElementById('friday-widget-send').addEventListener('click', widgetSend);
document.getElementById('friday-widget-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') widgetSend();
});

// Écoute ntfy pour les réponses
function listenNtfy() {
    const url = `https://ntfy.sh/${NTFY_TOPIC}/sse`;

    const es = new EventSource(url);

    es.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            const msg = data.message?.trim();
            if (msg && msg !== lastNtfyMsg) {
                lastNtfyMsg = msg;
                widgetLog(msg, 'friday');
                widgetSetStatus('● STANDBY');
            }
        } catch (e) { }
    };

    es.onerror = function () {
        setTimeout(listenNtfy, 3000);
        es.close();
    };
}

// Orbe animée widget
const widgetOrbCanvas = document.getElementById('widget-orb');
const widgetOrbCtx = widgetOrbCanvas.getContext('2d');
let widgetAngle = 0, widgetPulse = 0;

function drawWidgetOrb() {
    widgetOrbCtx.clearRect(0, 0, 40, 40);
    widgetAngle = (widgetAngle + 2) % 360;
    widgetPulse += 0.05;

    const cx = 20, cy = 20;
    const blue = '#00d4ff';

    // Anneau rotatif
    widgetOrbCtx.save();
    widgetOrbCtx.translate(cx, cy);
    widgetOrbCtx.rotate(widgetAngle * Math.PI / 180);
    widgetOrbCtx.setLineDash([3, 3]);
    widgetOrbCtx.beginPath();
    widgetOrbCtx.arc(0, 0, 16, 0, Math.PI * 2);
    widgetOrbCtx.strokeStyle = 'rgba(0,212,255,0.4)';
    widgetOrbCtx.lineWidth = 1;
    widgetOrbCtx.stroke();
    widgetOrbCtx.setLineDash([]);
    widgetOrbCtx.restore();

    // Cercle solide
    const r = 10 + Math.sin(widgetPulse) * 1.5;
    widgetOrbCtx.beginPath();
    widgetOrbCtx.arc(cx, cy, r, 0, Math.PI * 2);
    widgetOrbCtx.strokeStyle = blue;
    widgetOrbCtx.lineWidth = 1.5;
    widgetOrbCtx.stroke();

    // Noyau
    const cr = 4 + Math.sin(widgetPulse * 2) * 1;
    widgetOrbCtx.beginPath();
    widgetOrbCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    widgetOrbCtx.fillStyle = blue;
    widgetOrbCtx.fill();

    requestAnimationFrame(drawWidgetOrb);
}

// Init widget
widgetLog('Système Friday initialisé.', 'system');
widgetLog('Tapez une commande ou posez une question.', 'system');
drawWidgetOrb();
listenNtfy();

// ============ INIT ============
renderCibles();

// ============ EXPORT PDF ============
document.getElementById('btn-export-pdf').addEventListener('click', () => {
    const c = cibles.find(x => x.id === activeCibleId);
    if (!c) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Fond noir
    doc.setFillColor(2, 8, 16);
    doc.rect(0, 0, 210, 297, 'F');

    // Ligne déco haut
    doc.setDrawColor(0, 212, 255);
    doc.setLineWidth(0.5);
    doc.line(15, 20, 195, 20);

    // Titre FRIDAY
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 212, 255);
    doc.text('F · R · I · D · A · Y  —  OSINT DASHBOARD', 105, 15, { align: 'center' });

    // Nom cible
    doc.setFontSize(22);
    doc.text(`${c.nom.toUpperCase()} ${c.prenom.toUpperCase()}`, 105, 35, { align: 'center' });

    // ID + date
    doc.setFontSize(8);
    doc.setTextColor(122, 184, 204);
    doc.text(`CIBLE #${c.id}  —  GÉNÉRÉ LE ${new Date().toLocaleDateString('fr-FR')} À ${new Date().toLocaleTimeString('fr-FR')}`, 105, 42, { align: 'center' });

    // Ligne déco
    doc.setDrawColor(0, 212, 255);
    doc.line(15, 46, 195, 46);

    // Section INFORMATIONS
    let y = 58;
    doc.setFontSize(9);
    doc.setTextColor(0, 212, 255);
    doc.text('// INFORMATIONS', 15, y);
    y += 8;

    const infos = [
        ['NOM COMPLET', `${c.prenom} ${c.nom}`],
        ['EMAIL', c.email || '—'],
        ['TÉLÉPHONE', c.telephone || '—'],
    ];

    infos.forEach(([key, val]) => {
        doc.setTextColor(0, 136, 170);
        doc.setFontSize(8);
        doc.text(key, 15, y);
        doc.setTextColor(168, 216, 234);
        doc.text(val, 70, y);
        doc.setDrawColor(13, 37, 53);
        doc.line(15, y + 2, 195, y + 2);
        y += 10;
    });

    // Section RÉSEAUX SOCIAUX
    if (c.reseaux && c.reseaux.length > 0) {
        y += 6;
        doc.setFontSize(9);
        doc.setTextColor(0, 212, 255);
        doc.text('// RÉSEAUX SOCIAUX', 15, y);
        y += 8;

        c.reseaux.forEach(r => {
            doc.setTextColor(0, 136, 170);
            doc.setFontSize(8);
            doc.text(r.type.toUpperCase(), 15, y);
            doc.setTextColor(168, 216, 234);
            doc.text(r.url || '—', 70, y);
            doc.setDrawColor(13, 37, 53);
            doc.line(15, y + 2, 195, y + 2);
            y += 10;
        });
    }

    // Section NOTES
    if (c.notes) {
        y += 6;
        doc.setFontSize(9);
        doc.setTextColor(0, 212, 255);
        doc.text('// NOTES', 15, y);
        y += 8;
        doc.setFontSize(8);
        doc.setTextColor(168, 216, 234);
        const lines = doc.splitTextToSize(c.notes, 175);
        doc.text(lines, 15, y);
        y += lines.length * 5 + 6;
    }

    // Ligne déco bas
    doc.setDrawColor(0, 212, 255);
    doc.line(15, 280, 195, 280);
    doc.setFontSize(7);
    doc.setTextColor(13, 37, 53);
    doc.text('FRIDAY OSINT DASHBOARD — DOCUMENT CONFIDENTIEL', 105, 285, { align: 'center' });

    // Télécharger
    doc.save(`FRIDAY_${c.nom.toUpperCase()}_${c.prenom.toUpperCase()}.pdf`);
});