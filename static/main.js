// --- Monitoring ---
function updateMetrics() {
    fetch("/api/metrics")
        .then(function (r) { return r.json(); })
        .then(function (data) {
            document.getElementById("cpu-val").textContent = data.cpu + "%";
            document.getElementById("ram-val").textContent = data.ram + "%";
            document.getElementById("latence-val").textContent = data.latence + "ms";
            document.getElementById("uptime-val").textContent = data.uptime + "%";
        })
        .catch(function () {});
}

setInterval(updateMetrics, 2000);
updateMetrics();

// --- Graphique ECG ---
const canvas = document.getElementById("ecg");
const ctx = canvas.getContext("2d");
let points = [];

function drawECG() {
    const raw = document.getElementById("cpu-val").textContent;
    const cpuValue = parseFloat(raw) || 0;

    points.push(cpuValue);
    if (points.length > canvas.width) {
        points.shift();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = "#4a9eca";
    ctx.lineWidth = 1.5;

    for (let i = 0; i < points.length; i++) {
        // Invert Y: 0% CPU → bottom, 100% CPU → top
        const y = canvas.height - (points[i] / 100) * canvas.height;
        if (i === 0) {
            ctx.moveTo(i, y);
        } else {
            ctx.lineTo(i, y);
        }
    }

    ctx.stroke();
    requestAnimationFrame(drawECG);
}

// --- Cibles ---
let cibleSelectionnee = null;

function creerItemCible(cible) {
    const li = document.createElement("li");
    li.className = "cible";
    li.dataset.id = cible.id;

    const nomSpan = document.createElement("span");
    nomSpan.className = "cible-nom";
    nomSpan.textContent = cible.nom + " " + cible.prenom;

    const btnSupp = document.createElement("button");
    btnSupp.className = "btn-supprimer";
    btnSupp.textContent = "✕";
    btnSupp.addEventListener("click", function (e) {
        e.stopPropagation();
        supprimerCible(cible.id, li);
    });

    const ulInfos = document.createElement("ul");
    const liCat = document.createElement("li");
    liCat.className = "categorie";
    liCat.textContent = "Infos";
    liCat.addEventListener("click", function (e) {
        e.stopPropagation();
        afficherDonnees(cible);
        document.getElementById("bc-cible").textContent = cible.nom + " " + cible.prenom;
        document.getElementById("bc-cat").textContent = "Infos";
    });
    ulInfos.appendChild(liCat);

    li.appendChild(nomSpan);
    li.appendChild(btnSupp);
    li.appendChild(ulInfos);
    return li;
}

function afficherDonnees(cible) {
    cibleSelectionnee = cible;
    const table = document.getElementById("table-donnees");
    table.innerHTML = "";

    const champs = [
        { label: "Nom - Prénom", valeur: cible.nom + " " + cible.prenom },
        { label: "Email", valeur: cible.email || "—" },
        { label: "Téléphone", valeur: cible.telephone || "—" }
    ];

    champs.forEach(function (champ) {
        const tr = document.createElement("tr");
        const tdKey = document.createElement("td");
        tdKey.className = "data-key";
        tdKey.textContent = champ.label;

        const tdVal = document.createElement("td");
        tdVal.textContent = champ.valeur;

        const btnCopier = document.createElement("button");
        btnCopier.className = "btn-copier";
        btnCopier.textContent = "⎘";
        btnCopier.addEventListener("click", function () {
            navigator.clipboard.writeText(champ.valeur).then(function () {
                btnCopier.textContent = "✓";
                setTimeout(function () { btnCopier.textContent = "⎘"; }, 1500);
            });
        });

        tdVal.appendChild(btnCopier);
        tr.appendChild(tdKey);
        tr.appendChild(tdVal);
        table.appendChild(tr);
    });
}

function supprimerCible(id, li) {
    fetch("/api/cibles/" + id, { method: "DELETE" })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.status === "ok") {
                li.remove();
                mettreAJourCompteur();
                if (cibleSelectionnee && cibleSelectionnee.id === id) {
                    cibleSelectionnee = null;
                    document.getElementById("table-donnees").innerHTML =
                        '<tr id="no-data"><td colspan="2">Sélectionnez une cible pour afficher ses données</td></tr>';
                    document.getElementById("bc-cible").textContent = "—";
                    document.getElementById("bc-cat").textContent = "—";
                }
            }
        });
}

function mettreAJourCompteur() {
    const count = document.querySelectorAll("#liste-cibles .cible").length;
    document.getElementById("compteur-cibles").textContent = "(" + count + ")";
}

function chargerCibles() {
    fetch("/api/cibles")
        .then(function (r) { return r.json(); })
        .then(function (cibles) {
            const ul = document.getElementById("liste-cibles");
            ul.innerHTML = "";
            cibles.forEach(function (cible) {
                ul.appendChild(creerItemCible(cible));
            });
            mettreAJourCompteur();
        });
}

// --- Recherche sidebar ---
document.getElementById("search").addEventListener("input", function () {
    const query = this.value.toLowerCase();
    document.querySelectorAll("#liste-cibles .cible").forEach(function (li) {
        const nom = li.querySelector(".cible-nom").textContent.toLowerCase();
        li.style.display = nom.includes(query) ? "" : "none";
    });
});

// --- Init ---
window.onload = function () {
    canvas.width = canvas.parentElement.offsetWidth - 20;
    canvas.height = 100;
    drawECG();

    const modal = document.getElementById("modal");

    document.getElementById("btn-nouvelle-cible").addEventListener("click", function () {
        modal.classList.add("active");
    });

    document.getElementById("modal-close").addEventListener("click", function () {
        modal.classList.remove("active");
    });

    modal.addEventListener("click", function (e) {
        if (e.target === modal) {
            modal.classList.remove("active");
        }
    });

    document.getElementById("form-cible").addEventListener("submit", function (e) {
        e.preventDefault();
        const data = {
            nom: document.getElementById("input-nom").value.trim(),
            prenom: document.getElementById("input-prenom").value.trim(),
            email: document.getElementById("input-email").value.trim(),
            telephone: document.getElementById("input-tel").value.trim()
        };

        fetch("/api/cibles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
            .then(function (r) { return r.json(); })
            .then(function (resp) {
                if (resp.status === "ok") {
                    modal.classList.remove("active");
                    this.reset();
                    chargerCibles();
                }
            }.bind(this));
    });

    document.getElementById("btn-toggle-sidebar").addEventListener("click", function () {
        const sidebar = document.querySelector("aside");
        const layout = document.querySelector(".layout");
        sidebar.classList.toggle("hidden");
        layout.classList.toggle("sidebar-hidden");
    });

    chargerCibles();
};
