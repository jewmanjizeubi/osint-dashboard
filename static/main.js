//Fonction heure
function updateClock() {
    const now = new Date();
    document.getElementById("clock").innerHTML = now.toLocaleTimeString("fr-FR");
}

setInterval(updateClock, 1000);
updateClock();

//Fonction monitoring
function updateMetrics() {
    const cpu = Math.round(Math.random() * 100);
    document.getElementById("cpu-val").innerHTML = cpu + "%";
    const ram = Math.round(Math.random() * 100);
    document.getElementById("ram-val").innerHTML = ram + "%";
    const latence = Math.round(Math.random() * 100);
    document.getElementById("latence-val").innerHTML = latence + "ms";
    const uptime = Math.round(Math.random() * 100);
    document.getElementById("uptime-val").innerHTML = "99.9%";
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

