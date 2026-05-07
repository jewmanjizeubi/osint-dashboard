function updateClock() {
    const now = new Date();
    const date = now.toLocaleDateString("fr-FR");
    const time = now.toLocaleTimeString("fr-FR");
    document.getElementById("clock").innerHTML = date + "-" + time;
}
setInterval(updateClock, 1000);
updateClock();