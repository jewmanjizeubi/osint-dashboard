//Fonction monitoring
function updateMetrics() {
    fetch("/api/metrics")
        .then(function (response) { return response.json(); })
        .then(function (data) {
            document.getElementById("cpu-val").innerHTML = data.cpu + "%";
            document.getElementById("ram-val").innerHTML = data.ram + "%";
            document.getElementById("latence-val").innerHTML = data.latence + "ms";
            document.getElementById("uptime-val").innerHTML = data.uptime + "%";
        });
}

setInterval(updateMetrics, 2000);
updateMetrics();

//Graphique ECG
const canvas = document.getElementById("ecg");
const ctx = canvas.getContext("2d");

let points = [];

function drawECG() {
    const cpuValue = parseInt(document.getElementById("cpu-val").innerHTML);
    points.push(cpuValue);
    if (points.length > canvas.width) {
        points.shift;
    }


    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.strokeStyle = "#4a9eca";
    ctx.lineWidth = 1.5;

    for (let i = 0; i < points.length; i++) {
        if (i == 0) {
            ctx.moveTo(i, points[i]);
        } else {
            ctx.lineTo(i, points[i]);
        }
    }

    ctx.stroke();

    requestAnimationFrame(drawECG);
}

// Soumission formulaire nouvelle cible
document.getElementById("form-cible").addEventListener("submit", function (e) {
    e.preventDefault();

    const data = {
        nom: document.getElementById("input-nom").value,
        prenom: document.getElementById("input-prenom").value,
        email: document.getElementById("input-email").value,
        telephone: document.getElementById("input-tel").value
    };

    fetch("/api/cibles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
        .then(function (response) { return response.json(); })
        .then(function (data) {
            if (data.status === "ok") {
                modal.classList.remove("active");
                chargerCibles();
            }
        });
});

function chargerCibles() {
    fetch("/api/cibles")
        .then(function (r) { return r.json(); })
        .then(function (cibles) {
            const ul = document.querySelector(".tree ul");
            ul.innerHTML = "";
            cibles.forEach(function (cible) {
                ul.innerHTML += `
          <li class="cible">
            ${cible.nom} ${cible.prenom}
            <button class="btn-supprimer">✕</button>
            <ul>
              <li class="categorie">Infos
                <ul>
                  <li>${cible.email}</li>
                  <li>${cible.telephone}</li>
                </ul>
              </li>
            </ul>
          </li>
        `;
            });
        });
}

window.onload = function () {
    canvas.width = canvas.parentElement.offsetWidth - 20;
    canvas.height = 100;
    drawECG();
    //Popup formulaire nouvelle cible
    const modal = document.getElementById("modal");
    const btnNouvelleCible = document.getElementById("btn-nouvelle-cible");
    const btnClose = document.getElementById("modal-close");

    btnNouvelleCible.addEventListener("click", function () {
        modal.classList.add("active");
    });

    btnClose.addEventListener("click", function () {
        modal.classList.remove("active");
    });
    modal.addEventListener("click", function (e) {
        if (e.target === modal) {
            modal.classList.remove("active");
        }
    });
    document.querySelectorAll(".btn-supprimer").forEach(function (btn) {
        btn.addEventListener("click", function () {
            console.log("clic détecté");
            const cible = this.parentElement;
            cible.remove();
        });
    });
    document.querySelectorAll(".categorie").forEach(function (cat) {
        cat.addEventListener("click", function () {
            const cible = this.closest(".cible").childNodes[0].textContent.trim();
            const categorie = this.childNodes[0].textContent.trim();
            document.getElementById("bc-cible").innerHTML = cible;
            document.getElementById("bc-cat").innerHTML = categorie;
        });
    });

    document.getElementById("btn-toggle-sidebar").addEventListener("click", function () {
        const sidebar = document.querySelector("aside");
        const layout = document.querySelector(".layout");
        sidebar.classList.toggle("hidden");
        layout.classList.toggle("sidebar-hidden");
    });

    document.querySelectorAll(".btn-copier").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const texte = this.parentElement.textContent.trim();
            navigator.clipboard.writeText(texte).then(function () {
                btn.innerHTML = "✓";
                setTimeout(function () {
                    btn.innerHTML = "⎘";
                }, 1500);
            });
        });
    });
    chargerCibles();
}

//Recherche menu gauche
// Recherche sidebar
const searchInput = document.getElementById("search");

searchInput.addEventListener("input", function () {
    const query = this.value.toLowerCase();

    document.querySelectorAll(".cible").forEach(function (cible) {
        const nom = cible.textContent.toLowerCase();
        if (nom.includes(query)) {
            cible.style.display = "";
        } else {
            cible.style.display = "none";
        }
    });
});

