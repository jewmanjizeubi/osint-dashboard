function updateClock() {
    document.getElementById("clock").innerHTML = new Date().toLocaleTimeString("fr-FR");
}
setInterval(updateClock, 1000);
updateClock();