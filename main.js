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
    document.getElementById("cpu-val").innerHTML = cpu +"%";
    const ram = Math.round(Math.random() * 100);
    document.getElementById("ram-val").innerHTML = ram + "%";
    const latence = Math.round(Math.random() * 100);
    document.getElementById("latence-val").innerHTML = latence + "ms";
    const uptime = Math.round(Math.random() * 100);
    document.getElementById("uptime-val").innerHTML = "99.9%";
}

setInterval(updateMetrics, 2000);
updateMetrics();