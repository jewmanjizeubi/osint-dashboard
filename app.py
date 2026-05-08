from flask import Flask, render_template, redirect, url_for, session, jsonify, request
import hashlib
import sqlite3
import psutil

app = Flask(__name__)
# WARNING: change this secret key before deploying to production
app.secret_key = "changeme"


@app.route("/")
def index():
    if "user" in session:
        return render_template("index.html")
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = hashlib.sha256(request.form["password"].encode()).hexdigest()

        con = sqlite3.connect("database.db")
        user = con.execute(
            "SELECT * FROM users WHERE username=? AND password=?",
            (username, password)
        ).fetchone()
        con.close()

        if user:
            session["user"] = username
            return redirect(url_for("index"))
        else:
            return render_template("login.html", error=True)

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))


@app.route("/api/metrics")
def metrics():
    if "user" not in session:
        return jsonify({"error": "non autorisé"}), 401
    return jsonify({
        "cpu": psutil.cpu_percent(interval=1),
        "ram": psutil.virtual_memory().percent,
        "latence": 0,
        "uptime": 99.9
    })


@app.route("/api/cibles", methods=["POST"])
def ajouter_cible():
    if "user" not in session:
        return jsonify({"error": "non autorisé"}), 401

    data = request.json
    con = sqlite3.connect("database.db")
    con.execute(
        "INSERT INTO cibles (nom, prenom, email, telephone) VALUES (?, ?, ?, ?)",
        (data["nom"], data["prenom"], data["email"], data["telephone"])
    )
    con.commit()
    con.close()
    return jsonify({"status": "ok"})


@app.route("/api/cibles", methods=["GET"])
def get_cibles():
    if "user" not in session:
        return jsonify({"error": "non autorisé"}), 401

    con = sqlite3.connect("database.db")
    rows = con.execute("SELECT * FROM cibles").fetchall()
    con.close()
    return jsonify([
        {"id": r[0], "nom": r[1], "prenom": r[2], "email": r[3], "telephone": r[4]}
        for r in rows
    ])


@app.route("/api/cibles/<int:cible_id>", methods=["DELETE"])
def supprimer_cible(cible_id):
    if "user" not in session:
        return jsonify({"error": "non autorisé"}), 401

    con = sqlite3.connect("database.db")
    con.execute("DELETE FROM cibles WHERE id=?", (cible_id,))
    con.commit()
    con.close()
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
