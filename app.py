from flask import Flask, render_template, redirect, url_for, session

app = Flask(__name__)
app.secret_key = "changeme"  # à changer par une vraie clé secrète sur la VM

@app.route("/")
def index():
    if "user" in session:
        return render_template("index.html")
    return redirect(url_for("login"))

@app.route("/login")
def login():
    return render_template("login.html")

import psutil

@app.route("/api/metrics")
def metrics():
    return {
        "cpu": psutil.cpu_percent(interval=1),
        "ram": psutil.virtual_memory().percent,
        "latence": 0,
        "uptime": 99.9
    }

@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)