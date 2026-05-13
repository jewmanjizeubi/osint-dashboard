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

    let filtered = cibles.filter(c =>
        (c.nom + ' ' + c.prenom).toLowerCase().includes(search)
    );

    // Filtre par risque
    if (filtreActif !== 'tous') {
        filtered = filtered.filter(c => calculateRisk(c).level === filtreActif);
    }

    // Filtre par tag
    if (filtreTag) {
        filtered = filtered.filter(c => (c.tags || []).includes(filtreTag));
    }

    // Tri par date
    if (triDate) {
        filtered = [...filtered].sort((a, b) => b.id - a.id);
    }

    document.getElementById('compteur-cibles').textContent = cibles.length;

    filtered.forEach(c => {
        const risk = calculateRisk(c);
        const riskColors = { low: '#00e87a', medium: '#ffa500', high: '#ff3333' };
        const li = document.createElement('li');
        li.className = 'cible-item' + (c.id === activeCibleId ? ' active' : '');
        li.dataset.id = c.id;
        li.innerHTML = `
            <div>
                <div class="cible-nom">${c.nom.toUpperCase()}</div>
                <div class="cible-prenom">${c.prenom}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
                <span style="width:6px;height:6px;border-radius:50%;background:${riskColors[risk.level]};display:inline-block;"></span>
                <button class="btn-supprimer-item" data-id="${c.id}">✕</button>
            </div>
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
    document.getElementById('edit-ville').value = c.ville || '';

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
    renderTags(c);
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
        ville: document.getElementById('input-ville').value.trim(),
        reseaux: [],
        fichiers: [],
        notes: ''
    };
    if (!newCible.nom) return;
    cibles.push(newCible);
    const doublons = checkDoublons(newCible);
    showDoublonsAlert(doublons);
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

// ============ GRAPHE DE RELATIONS ============

// Stockage des relations
let relations = JSON.parse(localStorage.getItem('friday-relations') || '[]');

function saveRelations() {
    localStorage.setItem('friday-relations', JSON.stringify(relations));
}

// Couleurs par type de relation
const RELATION_COLORS = {
    famille: '#00e87a',
    associe: '#00d4ff',
    employeur: '#ffa500',
    contact: '#7ab8cc',
    suspect: '#ff3333'
};

// Toggle graphe
document.getElementById('btn-graphe').addEventListener('click', () => {
    document.getElementById('graphe-panel').style.display = 'flex';
    document.getElementById('btn-graphe').classList.add('active');
    renderGraphe();
});

document.getElementById('btn-close-graphe').addEventListener('click', () => {
    document.getElementById('graphe-panel').style.display = 'none';
    document.getElementById('btn-graphe').classList.remove('active');
});

// Modal relation
document.getElementById('btn-add-relation').addEventListener('click', () => {
    const sourceSelect = document.getElementById('relation-source');
    const targetSelect = document.getElementById('relation-target');
    sourceSelect.innerHTML = '';
    targetSelect.innerHTML = '';
    cibles.forEach(c => {
        const opt1 = document.createElement('option');
        opt1.value = c.id;
        opt1.textContent = `${c.nom} ${c.prenom}`;
        sourceSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = c.id;
        opt2.textContent = `${c.nom} ${c.prenom}`;
        targetSelect.appendChild(opt2);
    });
    document.getElementById('modal-relation').classList.add('active');
});

document.getElementById('modal-relation-close').addEventListener('click', () => {
    document.getElementById('modal-relation').classList.remove('active');
});

document.getElementById('btn-save-relation').addEventListener('click', () => {
    const source = document.getElementById('relation-source').value;
    const target = document.getElementById('relation-target').value;
    const type = document.getElementById('relation-type').value;
    const desc = document.getElementById('relation-desc').value.trim();
    const editId = document.getElementById('btn-save-relation').dataset.editId;

    if (source === target) {
        alert('Source et cible ne peuvent pas être identiques.');
        return;
    }

    if (editId) {
        // Mode édition
        const rel = relations.find(r => r.id === parseInt(editId));
        if (rel) {
            rel.source = parseInt(source);
            rel.target = parseInt(target);
            rel.type = type;
            rel.desc = desc;
        }
        delete document.getElementById('btn-save-relation').dataset.editId;
        document.getElementById('btn-save-relation').textContent = 'CRÉER LE LIEN';
    } else {
        // Mode création
        relations.push({
            id: Date.now(),
            source: parseInt(source),
            target: parseInt(target),
            type: type,
            desc: desc
        });
    }

    saveRelations();
    document.getElementById('modal-relation').classList.remove('active');
    document.getElementById('relation-desc').value = '';
    renderGraphe();
});
// Rendu D3
function renderGraphe() {
    const svg = d3.select('#graphe-svg');
    svg.selectAll('*').remove();

    const w = document.getElementById('graphe-svg').clientWidth;
    const h = document.getElementById('graphe-svg').clientHeight;

    // Fond grille
    const defs = svg.append('defs');
    const pattern = defs.append('pattern')
        .attr('id', 'grid')
        .attr('width', 40).attr('height', 40)
        .attr('patternUnits', 'userSpaceOnUse');
    pattern.append('path')
        .attr('d', 'M 40 0 L 0 0 0 40')
        .attr('fill', 'none')
        .attr('stroke', '#0d2535')
        .attr('stroke-width', 0.5);
    svg.append('rect')
        .attr('width', w).attr('height', h)
        .attr('fill', 'url(#grid)');

    // Flèche
    defs.append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#0077aa');

    // Nodes et liens
    const nodes = cibles.map(c => ({
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        risk: calculateRisk(c).level
    }));

    const links = relations.filter(r =>
        nodes.find(n => n.id === r.source) &&
        nodes.find(n => n.id === r.target)
    ).map(r => ({ ...r }));

    // Simulation D3
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links)
            .id(d => d.id)
            .distance(160))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(w / 2, h / 2))
        .force('collision', d3.forceCollide(50));

    // Liens
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke', d => RELATION_COLORS[d.type] || '#0077aa')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.6)
        .attr('marker-end', 'url(#arrow)');

    // Labels liens
    const linkLabel = svg.append('g')
        .selectAll('text')
        .data(links)
        .enter().append('text')
        .attr('fill', d => RELATION_COLORS[d.type] || '#0077aa')
        .attr('font-size', '9px')
        .attr('font-family', 'Courier New')
        .attr('text-anchor', 'middle')
        .attr('opacity', 0.7)
        .text(d => d.type.toUpperCase());

    // Bouton supprimer lien
    // Bouton supprimer + modifier lien
    const linkActions = svg.append('g')
        .selectAll('g')
        .data(links)
        .enter().append('g')
        .attr('opacity', 0)
        .on('mouseover', function () { d3.select(this).attr('opacity', 1); })
        .on('mouseout', function () { d3.select(this).attr('opacity', 0); });

    // Bouton supprimer
    linkActions.append('text')
        .attr('fill', '#ff3333')
        .attr('font-size', '11px')
        .attr('text-anchor', 'middle')
        .attr('cursor', 'pointer')
        .attr('dx', 10)
        .text('✕')
        .on('click', function (event, d) {
            event.stopPropagation();
            relations = relations.filter(r => r.id !== d.id);
            saveRelations();
            renderGraphe();
        });

    // Bouton modifier
    linkActions.append('text')
        .attr('fill', '#00d4ff')
        .attr('font-size', '11px')
        .attr('text-anchor', 'middle')
        .attr('cursor', 'pointer')
        .attr('dx', -10)
        .text('✎')
        .on('click', function (event, d) {
            event.stopPropagation();
            // Pré-remplir la modal avec les valeurs actuelles
            const sourceSelect = document.getElementById('relation-source');
            const targetSelect = document.getElementById('relation-target');
            sourceSelect.innerHTML = '';
            targetSelect.innerHTML = '';
            cibles.forEach(c => {
                const opt1 = document.createElement('option');
                opt1.value = c.id;
                opt1.textContent = `${c.nom} ${c.prenom}`;
                if (c.id === d.source.id) opt1.selected = true;
                sourceSelect.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = c.id;
                opt2.textContent = `${c.nom} ${c.prenom}`;
                if (c.id === d.target.id) opt2.selected = true;
                targetSelect.appendChild(opt2);
            });
            document.getElementById('relation-type').value = d.type;
            document.getElementById('relation-desc').value = d.desc || '';

            // Passer en mode édition
            document.getElementById('btn-save-relation').dataset.editId = d.id;
            document.getElementById('btn-save-relation').textContent = 'MODIFIER LE LIEN';
            document.getElementById('modal-relation').classList.add('active');
        });

    // Noeuds
    const nodeColor = { low: '#00e87a', medium: '#ffa500', high: '#ff3333' };

    const node = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .enter().append('g')
        .attr('cursor', 'pointer')
        .call(d3.drag()
            .on('start', (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on('end', (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null; d.fy = null;
            })
        )
        .on('click', (event, d) => {
            document.getElementById('graphe-panel').style.display = 'none';
            document.getElementById('btn-graphe').classList.remove('active');
            openDossier(d.id);
        })
        .on('mouseover', (event, d) => {
            const tooltip = document.getElementById('graphe-tooltip');
            tooltip.innerHTML = `
                <strong style="color:#00d4ff">${d.nom} ${d.prenom}</strong><br>
                Risque : ${calculateRisk(cibles.find(c => c.id === d.id)).label}
            `;
            tooltip.classList.add('visible');
            tooltip.style.left = (event.pageX + 12) + 'px';
            tooltip.style.top = (event.pageY - 10) + 'px';
        })
        .on('mouseout', () => {
            document.getElementById('graphe-tooltip').classList.remove('visible');
        });

    // Cercle extérieur (ring)
    node.append('circle')
        .attr('r', 28)
        .attr('fill', 'none')
        .attr('stroke', d => nodeColor[d.risk] || '#00d4ff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.5);

    // Cercle principal
    node.append('circle')
        .attr('r', 22)
        .attr('fill', '#050f1c')
        .attr('stroke', d => nodeColor[d.risk] || '#00d4ff')
        .attr('stroke-width', 2);

    // Initiales
    node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#00d4ff')
        .attr('font-family', 'Orbitron, monospace')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .text(d => d.nom[0].toUpperCase() + d.prenom[0].toUpperCase());

    // Nom sous le nœud
    node.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', 36)
        .attr('fill', '#7ab8cc')
        .attr('font-family', 'Courier New')
        .attr('font-size', '9px')
        .text(d => `${d.nom.toUpperCase()} ${d.prenom}`);

    // Légende
    const legende = svg.append('g').attr('transform', 'translate(20, ' + (h - 120) + ')');
    Object.entries(RELATION_COLORS).forEach(([type, color], i) => {
        legende.append('rect')
            .attr('x', 0).attr('y', i * 18)
            .attr('width', 20).attr('height', 3)
            .attr('fill', color).attr('rx', 1);
        legende.append('text')
            .attr('x', 28).attr('y', i * 18 + 3)
            .attr('fill', '#7ab8cc')
            .attr('font-size', '9px')
            .attr('font-family', 'Courier New')
            .attr('dominant-baseline', 'middle')
            .text(type.toUpperCase());
    });

    // Tick simulation
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        linkLabel
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2 - 8);

        linkActions.attr('transform', d =>
            `translate(${(d.source.x + d.target.x) / 2}, ${(d.source.y + d.target.y) / 2})`
        );

        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
}

// ============ MODIFIER CIBLE ============
document.getElementById('modal-edit-close').addEventListener('click', () => {
    document.getElementById('modal-edit').classList.remove('active');
});

document.querySelector('.btn-edit-cible').addEventListener('click', () => {
    const c = cibles.find(x => x.id === activeCibleId);
    if (!c) return;

    document.getElementById('edit-nom').value = c.nom;
    document.getElementById('edit-prenom').value = c.prenom;
    document.getElementById('edit-email').value = c.email || '';
    document.getElementById('edit-tel').value = c.telephone || '';

    document.getElementById('modal-edit').classList.add('active');
});

document.getElementById('form-edit-cible').addEventListener('submit', e => {
    e.preventDefault();
    const c = cibles.find(x => x.id === activeCibleId);
    if (!c) return;

    const oldNom = `${c.prenom} ${c.nom}`;

    c.nom = document.getElementById('edit-nom').value.trim();
    c.prenom = document.getElementById('edit-prenom').value.trim();
    c.email = document.getElementById('edit-email').value.trim();
    c.telephone = document.getElementById('edit-tel').value.trim();
    c.ville = document.getElementById('edit-ville').value.trim();

    saveCibles();
    const doublons = checkDoublons(c);
    showDoublonsAlert(doublons);
    addHistorique(c, `Informations modifiées — anciennement : ${oldNom}`);
    document.getElementById('modal-edit').classList.remove('active');
    openDossier(c.id);
    renderCibles();
});

// ============ RECHERCHE GLOBALE ============
const globalSearch = document.getElementById('global-search');
const globalResults = document.getElementById('global-search-results');

globalSearch.addEventListener('input', function () {
    const query = this.value.toLowerCase().trim();
    globalResults.innerHTML = '';

    if (query.length < 2) {
        globalResults.classList.remove('visible');
        return;
    }

    const matches = [];

    cibles.forEach(c => {
        const fields = [
            { label: 'NOM', val: `${c.nom} ${c.prenom}` },
            { label: 'EMAIL', val: c.email || '' },
            { label: 'TÉL', val: c.telephone || '' },
            { label: 'NOTES', val: c.notes || '' },
        ];

        // Champs extra
        (c.champsExtra || []).forEach(ch => {
            fields.push({ label: ch.cle.toUpperCase(), val: ch.val });
        });

        // Réseaux
        (c.reseaux || []).forEach(r => {
            fields.push({ label: r.type.toUpperCase(), val: r.url });
        });

        // Timeline
        (c.timeline || []).forEach(t => {
            fields.push({ label: 'TIMELINE', val: t.text });
        });

        fields.forEach(f => {
            if (f.val && f.val.toLowerCase().includes(query)) {
                matches.push({
                    cible: c,
                    label: f.label,
                    val: f.val
                });
            }
        });
    });

    // Dédoublonner par cible
    const seen = new Set();
    const unique = matches.filter(m => {
        if (seen.has(m.cible.id + m.label)) return false;
        seen.add(m.cible.id + m.label);
        return true;
    });

    if (unique.length === 0) {
        globalResults.innerHTML = '<div class="search-no-result">Aucun résultat</div>';
        globalResults.classList.add('visible');
        return;
    }

    unique.slice(0, 8).forEach(m => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
            <div class="search-result-name">${m.cible.nom.toUpperCase()} ${m.cible.prenom}</div>
            <div class="search-result-detail">${m.cible.email || '—'} · ${m.cible.telephone || '—'}</div>
            <div class="search-result-match">Trouvé dans : ${m.label} — "${m.val.substring(0, 40)}${m.val.length > 40 ? '...' : ''}"</div>
        `;
        div.addEventListener('click', () => {
            globalSearch.value = '';
            globalResults.classList.remove('visible');
            openDossier(m.cible.id);
        });
        globalResults.appendChild(div);
    });

    globalResults.classList.add('visible');
});

// Fermer les résultats en cliquant ailleurs
document.addEventListener('click', e => {
    if (!e.target.closest('.header-search')) {
        globalResults.classList.remove('visible');
    }
});

// ============ FILTRES ============
let filtreActif = 'tous';
let triDate = false;

document.querySelectorAll('.filtre-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.filtre-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const filtre = this.dataset.filtre;

        if (filtre === 'date') {
            triDate = !triDate;
            this.textContent = triDate ? 'DATE ↑' : 'DATE ↓';
        } else {
            filtreActif = filtre;
            triDate = false;
            document.querySelector('.filtre-btn[data-filtre="date"]').textContent = 'DATE';
        }

        renderCibles();
    });
});

// ============ DÉTECTION DE DOUBLONS ============
function checkDoublons(cible) {
    const doublons = [];

    cibles.forEach(c => {
        if (c.id === cible.id) return;

        if (cible.email && c.email &&
            cible.email.toLowerCase() === c.email.toLowerCase()) {
            doublons.push({
                cible: c,
                champ: 'EMAIL',
                valeur: cible.email
            });
        }

        if (cible.telephone && c.telephone &&
            cible.telephone.replace(/\s/g, '') === c.telephone.replace(/\s/g, '')) {
            doublons.push({
                cible: c,
                champ: 'TÉLÉPHONE',
                valeur: cible.telephone
            });
        }

        // Vérifier aussi les champs extra
        (cible.champsExtra || []).forEach(ce => {
            (c.champsExtra || []).forEach(ce2 => {
                if (ce.cle.toLowerCase() === ce2.cle.toLowerCase() &&
                    ce.val.toLowerCase() === ce2.val.toLowerCase()) {
                    doublons.push({
                        cible: c,
                        champ: ce.cle.toUpperCase(),
                        valeur: ce.val
                    });
                }
            });
        });
    });

    return doublons;
}

function showDoublonsAlert(doublons) {
    if (doublons.length === 0) return;

    const messages = doublons.map(d =>
        `⚠️ ${d.champ} "${d.valeur}" déjà utilisé par ${d.cible.nom} ${d.cible.prenom}`
    ).join('\n');

    // Afficher dans une notification HUD
    const notif = document.createElement('div');
    notif.className = 'doublon-notif';
    notif.innerHTML = `
        <div class="doublon-notif-title">⚠️ DOUBLONS DÉTECTÉS</div>
        ${doublons.map(d => `
            <div class="doublon-notif-item">
                <span class="doublon-champ">${d.champ}</span>
                <span class="doublon-val">"${d.valeur}"</span>
                <span class="doublon-cible">→ ${d.cible.nom.toUpperCase()} ${d.cible.prenom}</span>
            </div>
        `).join('')}
        <button class="doublon-close">✕</button>
    `;
    document.body.appendChild(notif);

    notif.querySelector('.doublon-close').addEventListener('click', () => notif.remove());
    setTimeout(() => notif.remove(), 8000);
}

// ============ TAGS ============
const TAGS_PREDEFINIS = [
    { nom: 'POLITIQUE', classe: 'tag-politique' },
    { nom: 'CRIMINEL', classe: 'tag-criminel' },
    { nom: 'ENTREPRISE', classe: 'tag-entreprise' },
    { nom: 'SUSPECT', classe: 'tag-suspect' },
    { nom: 'CONTACT', classe: 'tag-contact' },
    { nom: 'VIP', classe: 'tag-vip' },
    { nom: 'ARCHIVE', classe: 'tag-archive' },
];

let filtreTag = null;

function getTagClasse(nom) {
    const predef = TAGS_PREDEFINIS.find(t => t.nom === nom.toUpperCase());
    return predef ? predef.classe : 'tag-custom';
}

function renderTags(c) {
    const wrap = document.getElementById('tags-wrap');
    wrap.innerHTML = '';

    (c.tags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = `tag ${getTagClasse(tag)}`;
        span.innerHTML = `
            ${tag}
            <button class="tag-remove" onclick="removeTag('${tag}')">✕</button>
        `;
        wrap.appendChild(span);
    });

    // Bouton ajouter tag
    const btn = document.createElement('button');
    btn.className = 'btn-add-tag';
    btn.textContent = '+ TAG';
    btn.addEventListener('click', () => showTagPicker(c));
    wrap.appendChild(btn);
}

function showTagPicker(c) {
    // Supprimer picker existant
    const existing = document.getElementById('tag-picker');
    if (existing) { existing.remove(); return; }

    const picker = document.createElement('div');
    picker.id = 'tag-picker';
    picker.style.cssText = `
        position: absolute;
        background: #050f1c;
        border: 1px solid #0077aa;
        padding: 8px;
        z-index: 200;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        max-width: 240px;
    `;

    // Tags prédéfinis
    TAGS_PREDEFINIS.forEach(t => {
        if ((c.tags || []).includes(t.nom)) return;
        const btn = document.createElement('button');
        btn.className = `tag ${t.classe}`;
        btn.style.cursor = 'pointer';
        btn.textContent = t.nom;
        btn.addEventListener('click', () => {
            addTag(c, t.nom);
            picker.remove();
        });
        picker.appendChild(btn);
    });

    // Tag custom
    const input = document.createElement('input');
    input.placeholder = 'Tag custom...';
    input.style.cssText = `
        background: transparent;
        border: 1px dashed #0d2535;
        color: #7ab8cc;
        font-family: 'Share Tech Mono', monospace;
        font-size: 10px;
        padding: 4px 8px;
        outline: none;
        width: 100%;
    `;
    input.addEventListener('keypress', e => {
        if (e.key === 'Enter' && input.value.trim()) {
            addTag(c, input.value.trim().toUpperCase());
            picker.remove();
        }
    });
    picker.appendChild(input);

    document.getElementById('tags-wrap').appendChild(picker);
}

function addTag(c, tag) {
    if (!c.tags) c.tags = [];
    if (c.tags.includes(tag)) return;
    c.tags.push(tag);
    saveCibles();
    addHistorique(c, `Tag ajouté : ${tag}`);
    renderTags(c);
    renderTagsFiltres();
    renderCibles();
}

window.removeTag = function (tag) {
    const c = cibles.find(x => x.id === activeCibleId);
    if (!c) return;
    c.tags = (c.tags || []).filter(t => t !== tag);
    saveCibles();
    addHistorique(c, `Tag supprimé : ${tag}`);
    renderTags(c);
    renderTagsFiltres();
    renderCibles();
};

function renderTagsFiltres() {
    const wrap = document.getElementById('tags-filtres');
    wrap.innerHTML = '';

    // Récupérer tous les tags uniques
    const allTags = [...new Set(cibles.flatMap(c => c.tags || []))];
    if (allTags.length === 0) return;

    allTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-filtre-btn' + (filtreTag === tag ? ' active' : '');
        btn.textContent = tag;
        btn.addEventListener('click', () => {
            filtreTag = filtreTag === tag ? null : tag;
            renderTagsFiltres();
            renderCibles();
        });
        wrap.appendChild(btn);
    });
}

// ============ STATISTIQUES ============
Chart.defaults.color = '#7ab8cc';
Chart.defaults.borderColor = '#0d2535';
Chart.defaults.font.family = 'Courier New';

let chartRisques = null;
let chartTags = null;
let chartTimeline = null;

document.getElementById('btn-stats').addEventListener('click', () => {
    document.getElementById('stats-panel').style.display = 'flex';
    document.getElementById('btn-stats').classList.add('active');
    renderStats();
});

document.getElementById('btn-close-stats').addEventListener('click', () => {
    document.getElementById('stats-panel').style.display = 'none';
    document.getElementById('btn-stats').classList.remove('active');
});

function renderStats() {
    // Détruire les anciens charts
    if (chartRisques) { chartRisques.destroy(); chartRisques = null; }
    if (chartTags) { chartTags.destroy(); chartTags = null; }
    if (chartTimeline) { chartTimeline.destroy(); chartTimeline = null; }

    // ---- Données ----
    const risques = { low: 0, medium: 0, high: 0 };
    cibles.forEach(c => risques[calculateRisk(c).level]++);

    const tagsCount = {};
    cibles.forEach(c => (c.tags || []).forEach(t => {
        tagsCount[t] = (tagsCount[t] || 0) + 1;
    }));

    const timelineTypes = { info: 0, alert: 0, action: 0, contact: 0 };
    cibles.forEach(c => (c.timeline || []).forEach(e => {
        if (timelineTypes[e.type] !== undefined) timelineTypes[e.type]++;
    }));

    // ---- Chart Risques ----
    chartRisques = new Chart(document.getElementById('chart-risques'), {
        type: 'doughnut',
        data: {
            labels: ['FAIBLE', 'MODÉRÉ', 'ÉLEVÉ'],
            datasets: [{
                data: [risques.low, risques.medium, risques.high],
                backgroundColor: ['#00e87a33', '#ffa50033', '#ff333333'],
                borderColor: ['#00e87a', '#ffa500', '#ff3333'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: '#7ab8cc', font: { size: 10 } }
                }
            },
            cutout: '65%'
        }
    });

    // ---- Chart Tags ----
    const tagLabels = Object.keys(tagsCount);
    const tagValues = Object.values(tagsCount);

    chartTags = new Chart(document.getElementById('chart-tags'), {
        type: 'bar',
        data: {
            labels: tagLabels,
            datasets: [{
                data: tagValues,
                backgroundColor: '#00d4ff22',
                borderColor: '#00d4ff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { color: '#7ab8cc', font: { size: 9 } },
                    grid: { color: '#0d2535' }
                },
                y: {
                    ticks: { color: '#7ab8cc', font: { size: 9 }, stepSize: 1 },
                    grid: { color: '#0d2535' }
                }
            }
        }
    });

    // ---- Chart Timeline ----
    chartTimeline = new Chart(document.getElementById('chart-timeline'), {
        type: 'polarArea',
        data: {
            labels: ['INFO', 'ALERTE', 'ACTION', 'CONTACT'],
            datasets: [{
                data: [
                    timelineTypes.info,
                    timelineTypes.alert,
                    timelineTypes.action,
                    timelineTypes.contact
                ],
                backgroundColor: [
                    '#00d4ff22', '#ff333322',
                    '#ffa50022', '#00e87a22'
                ],
                borderColor: [
                    '#00d4ff', '#ff3333',
                    '#ffa500', '#00e87a'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: '#7ab8cc', font: { size: 10 } }
                }
            }
        }
    });

    // ---- Overview ----
    const totalTimeline = Object.values(timelineTypes).reduce((a, b) => a + b, 0);
    const totalRelations = relations.length;
    const totalFichiers = cibles.reduce((a, c) => a + (c.fichiers?.length || 0), 0);
    const totalReseaux = cibles.reduce((a, c) => a + (c.reseaux?.length || 0), 0);

    document.getElementById('stats-overview').innerHTML = `
        <div class="stat-overview-item">
            <span class="stat-overview-label">TOTAL CIBLES</span>
            <span class="stat-overview-value">${cibles.length}</span>
        </div>
        <div class="stat-overview-item">
            <span class="stat-overview-label">RELATIONS</span>
            <span class="stat-overview-value">${totalRelations}</span>
        </div>
        <div class="stat-overview-item">
            <span class="stat-overview-label">ÉVÉNEMENTS</span>
            <span class="stat-overview-value">${totalTimeline}</span>
        </div>
        <div class="stat-overview-item">
            <span class="stat-overview-label">FICHIERS</span>
            <span class="stat-overview-value">${totalFichiers}</span>
        </div>
        <div class="stat-overview-item">
            <span class="stat-overview-label">RÉSEAUX</span>
            <span class="stat-overview-value">${totalReseaux}</span>
        </div>
    `;
}

// ============ TIMELINE GLOBALE ============
let tgFiltre = 'tous';

document.getElementById('btn-timeline-global').addEventListener('click', () => {
    document.getElementById('timeline-global-panel').style.display = 'flex';
    document.getElementById('btn-timeline-global').classList.add('active');
    renderTimelineGlobale();
});

document.getElementById('btn-close-timeline-global').addEventListener('click', () => {
    document.getElementById('timeline-global-panel').style.display = 'none';
    document.getElementById('btn-timeline-global').classList.remove('active');
});

document.querySelectorAll('.tg-filtre').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.tg-filtre').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        tgFiltre = this.dataset.type;
        renderTimelineGlobale();
    });
});

function renderTimelineGlobale() {
    const list = document.getElementById('timeline-global-list');
    list.innerHTML = '';

    // Collecter tous les événements de toutes les cibles
    let events = [];
    cibles.forEach(c => {
        (c.timeline || []).forEach(e => {
            events.push({
                ...e,
                cible: c
            });
        });
    });

    // Filtrer par type
    if (tgFiltre !== 'tous') {
        events = events.filter(e => e.type === tgFiltre);
    }

    // Trier par date décroissante
    events.sort((a, b) => b.date - a.date);

    if (events.length === 0) {
        list.innerHTML = '<div class="tg-empty">Aucun événement dans la timeline globale.</div>';
        return;
    }

    events.forEach((evt, i) => {
        const side = i % 2 === 0 ? 'left' : 'right';
        const date = new Date(evt.date).toLocaleString('fr-FR');

        const div = document.createElement('div');
        div.className = `tg-item ${side}`;
        div.innerHTML = `
            <div class="tg-dot ${evt.type}"></div>
            <div class="tg-content" data-cible-id="${evt.cible.id}">
                <div class="tg-content-date">${date}</div>
                <div class="tg-content-cible">${evt.cible.nom.toUpperCase()} ${evt.cible.prenom}</div>
                <span class="tg-content-type ${evt.type}">${evt.type.toUpperCase()}</span>
                <div class="tg-content-text">${evt.text}</div>
            </div>
        `;

        div.querySelector('.tg-content').addEventListener('click', () => {
            document.getElementById('timeline-global-panel').style.display = 'none';
            document.getElementById('btn-timeline-global').classList.remove('active');
            openDossier(evt.cible.id);
        });

        list.appendChild(div);
    });
}

// ============ CARTE GÉOGRAPHIQUE ============
let carteMap = null;
let carteMarkers = [];

document.getElementById('btn-carte').addEventListener('click', () => {
    document.getElementById('carte-panel').style.display = 'flex';
    document.getElementById('btn-carte').classList.add('active');
    setTimeout(() => initCarte(), 100);
});

document.getElementById('btn-close-carte').addEventListener('click', () => {
    document.getElementById('carte-panel').style.display = 'none';
    document.getElementById('btn-carte').classList.remove('active');
});

function initCarte() {
    if (!carteMap) {
        carteMap = L.map('carte-map', {
            center: [46.5, 2.5],
            zoom: 5,
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(carteMap);
    }

    carteMap.invalidateSize();
    renderCarteMarkers();
}

function renderCarteMarkers() {
    // Supprimer anciens markers
    carteMarkers.forEach(m => m.remove());
    carteMarkers = [];

    const riskColors = { low: '#00e87a', medium: '#ffa500', high: '#ff3333' };

    cibles.forEach(c => {
        if (!c.ville) return;

        // Géocoder la ville via Nominatim
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(c.ville)}&format=json&limit=1`)
            .then(r => r.json())
            .then(data => {
                if (!data || data.length === 0) return;

                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                const risk = calculateRisk(c);
                const color = riskColors[risk.level] || '#00d4ff';

                // Icône custom HUD
                const icon = L.divIcon({
                    className: '',
                    html: `
                        <div style="
                            width: 14px; height: 14px;
                            border-radius: 50%;
                            background: ${color};
                            border: 2px solid ${color};
                            box-shadow: 0 0 8px ${color};
                            cursor: pointer;
                        "></div>
                    `,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });

                const marker = L.marker([lat, lon], { icon })
                    .addTo(carteMap)
                    .bindPopup(`
                        <div class="carte-popup">
                            <div class="carte-popup-nom">${c.nom.toUpperCase()} ${c.prenom}</div>
                            <div class="carte-popup-detail">${c.ville}</div>
                            <div class="carte-popup-detail">${risk.label}</div>
                            <button class="carte-popup-btn" onclick="
                                document.getElementById('carte-panel').style.display='none';
                                document.getElementById('btn-carte').classList.remove('active');
                                openDossier(${c.id});
                            ">OUVRIR LE DOSSIER</button>
                        </div>
                    `, { className: '' });

                carteMarkers.push(marker);

                // Sauvegarder les coords pour éviter de re-géocoder
                c.coords = { lat, lon };
                saveCibles();
            })
            .catch(() => { });
    });
}

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