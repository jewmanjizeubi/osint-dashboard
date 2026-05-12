"""
app.py — Serveur Flask pour FRIDAY OSINT Dashboard
Hébergé sur Raspberry Pi 5
"""

from flask import Flask, render_template, redirect, url_for, session, jsonify, request
import hashlib
import sqlite3
import psutil
import os
import time
import secrets

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))

# ============================================================
#  CONFIGURATION
# ============================================================

DB_PATH        = "database.db"
FRIDAY_API_KEY = os.environ.get("FRIDAY_API_KEY", "CHANGE_THIS_KEY")  # Clé pour les appels N8N → Flask
UPLOAD_FOLDER  = "static/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ============================================================
#  BASE DE DONNÉES — INIT
# ============================================================

def get_db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    con = get_db()
    con.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cibles (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            nom       TEXT NOT NULL,
            prenom    TEXT NOT NULL,
            email     TEXT,
            telephone TEXT,
            notes     TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE TABLE IF NOT EXISTS infos (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            cible_id  INTEGER NOT NULL,
            cle       TEXT NOT NULL,
            valeur    TEXT,
            FOREIGN KEY (cible_id) REFERENCES cibles(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reseaux (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            cible_id  INTEGER NOT NULL,
            type      TEXT NOT NULL,
            url       TEXT,
            FOREIGN KEY (cible_id) REFERENCES cibles(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS fichiers (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            cible_id  INTEGER NOT NULL,
            nom       TEXT NOT NULL,
            chemin    TEXT NOT NULL,
            type      TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (cible_id) REFERENCES cibles(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS timeline (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            cible_id  INTEGER NOT NULL,
            type      TEXT NOT NULL,
            texte     TEXT NOT NULL,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (cible_id) REFERENCES cibles(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS historique (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            cible_id  INTEGER NOT NULL,
            texte     TEXT NOT NULL,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (cible_id) REFERENCES cibles(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS alertes (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            cible_id  INTEGER,
            type      TEXT NOT NULL,
            message   TEXT NOT NULL,
            lu        INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
    """)
    con.commit()
    con.close()


# ============================================================
#  HELPERS
# ============================================================

def add_historique(con, cible_id, texte):
    con.execute(
        "INSERT INTO historique (cible_id, texte) VALUES (?, ?)",
        (cible_id, texte)
    )


def require_auth(f):
    """Décorateur de protection des routes."""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user" not in session:
            return jsonify({"error": "non autorisé"}), 401
        return f(*args, **kwargs)
    return decorated


def require_friday_key(f):
    """Décorateur pour les routes appelées par N8N."""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get("X-Friday-Key", "")
        if key != FRIDAY_API_KEY:
            return jsonify({"error": "clé invalide"}), 403
        return f(*args, **kwargs)
    return decorated


# ============================================================
#  ROUTES — PAGES
# ============================================================

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
        con = get_db()
        user = con.execute(
            "SELECT * FROM users WHERE username=? AND password=?",
            (username, password)
        ).fetchone()
        con.close()
        if user:
            session["user"] = username
            return redirect(url_for("index"))
        return render_template("login.html", error=True)
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))


# ============================================================
#  ROUTES — MONITORING RASPBERRY PI
# ============================================================

@app.route("/api/metrics")
@require_auth
def metrics():
    # CPU
    cpu = psutil.cpu_percent(interval=0.5)

    # RAM
    ram = psutil.virtual_memory().percent

    # Température (Raspberry Pi)
    temp = None
    try:
        with open("/sys/class/thermal/thermal_zone0/temp") as f:
            temp = round(int(f.read()) / 1000, 1)
    except Exception:
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                first = list(temps.values())[0]
                if first:
                    temp = round(first[0].current, 1)
        except Exception:
            temp = None

    # Disque
    disk = psutil.disk_usage("/").percent

    # Uptime
    boot_time = psutil.boot_time()
    uptime_seconds = int(time.time() - boot_time)
    hours   = uptime_seconds // 3600
    minutes = (uptime_seconds % 3600) // 60
    uptime_str = f"{hours}h {minutes}m"

    return jsonify({
        "cpu":    cpu,
        "ram":    ram,
        "temp":   temp,
        "disk":   disk,
        "uptime": uptime_str
    })


# ============================================================
#  ROUTES — CIBLES
# ============================================================

@app.route("/api/cibles", methods=["GET"])
@require_auth
def get_cibles():
    con = get_db()
    rows = con.execute("SELECT * FROM cibles ORDER BY created_at DESC").fetchall()
    result = []
    for r in rows:
        cible = dict(r)
        # Infos extra
        cible["champsExtra"] = [
            dict(i) for i in con.execute(
                "SELECT * FROM infos WHERE cible_id=?", (r["id"],)
            ).fetchall()
        ]
        # Réseaux
        cible["reseaux"] = [
            dict(i) for i in con.execute(
                "SELECT * FROM reseaux WHERE cible_id=?", (r["id"],)
            ).fetchall()
        ]
        # Fichiers
        cible["fichiers"] = [
            dict(i) for i in con.execute(
                "SELECT * FROM fichiers WHERE cible_id=?", (r["id"],)
            ).fetchall()
        ]
        # Timeline
        cible["timeline"] = [
            dict(i) for i in con.execute(
                "SELECT * FROM timeline WHERE cible_id=? ORDER BY created_at DESC",
                (r["id"],)
            ).fetchall()
        ]
        # Historique
        cible["historique"] = [
            dict(i) for i in con.execute(
                "SELECT * FROM historique WHERE cible_id=? ORDER BY created_at DESC LIMIT 50",
                (r["id"],)
            ).fetchall()
        ]
        result.append(cible)
    con.close()
    return jsonify(result)


@app.route("/api/cibles", methods=["POST"])
@require_auth
def ajouter_cible():
    data = request.json
    con = get_db()
    cur = con.execute(
        "INSERT INTO cibles (nom, prenom, email, telephone, notes) VALUES (?, ?, ?, ?, ?)",
        (data["nom"], data["prenom"],
         data.get("email", ""), data.get("telephone", ""),
         data.get("notes", ""))
    )
    cible_id = cur.lastrowid
    add_historique(con, cible_id, f"Dossier créé — {data['prenom']} {data['nom']}")
    con.commit()
    con.close()
    return jsonify({"status": "ok", "id": cible_id})


@app.route("/api/cibles/<int:cible_id>", methods=["PUT"])
@require_auth
def modifier_cible(cible_id):
    data = request.json
    con = get_db()
    con.execute(
        """UPDATE cibles SET nom=?, prenom=?, email=?, telephone=?, notes=?,
           updated_at=strftime('%s','now') WHERE id=?""",
        (data["nom"], data["prenom"], data.get("email", ""),
         data.get("telephone", ""), data.get("notes", ""), cible_id)
    )
    add_historique(con, cible_id, "Informations modifiées")
    con.commit()
    con.close()
    return jsonify({"status": "ok"})


@app.route("/api/cibles/<int:cible_id>", methods=["DELETE"])
@require_auth
def supprimer_cible(cible_id):
    con = get_db()
    con.execute("DELETE FROM cibles WHERE id=?", (cible_id,))
    con.commit()
    con.close()
    return jsonify({"status": "ok"})


# ============================================================
#  ROUTES — INFOS EXTRA
# ============================================================

@app.route("/api/cibles/<int:cible_id>/infos", methods=["POST"])
@require_auth
def ajouter_info(cible_id):
    data = request.json
    con = get_db()
    cur = con.execute(
        "INSERT INTO infos (cible_id, cle, valeur) VALUES (?, ?, ?)",
        (cible_id, data["cle"], data["valeur"])
    )
    add_historique(con, cible_id, f"Champ ajouté : {data['cle']}")
    con.commit()
    con.close()
    return jsonify({"status": "ok", "id": cur.lastrowid})


@app.route("/api/infos/<int:info_id>", methods=["DELETE"])
@require_auth
def supprimer_info(info_id):
    con = get_db()
    info = con.execute("SELECT * FROM infos WHERE id=?", (info_id,)).fetchone()
    if info:
        add_historique(con, info["cible_id"], f"Champ supprimé : {info['cle']}")
        con.execute("DELETE FROM infos WHERE id=?", (info_id,))
        con.commit()
    con.close()
    return jsonify({"status": "ok"})


# ============================================================
#  ROUTES — RÉSEAUX SOCIAUX
# ============================================================

@app.route("/api/cibles/<int:cible_id>/reseaux", methods=["POST"])
@require_auth
def ajouter_reseau(cible_id):
    data = request.json
    con = get_db()
    cur = con.execute(
        "INSERT INTO reseaux (cible_id, type, url) VALUES (?, ?, ?)",
        (cible_id, data["type"], data["url"])
    )
    add_historique(con, cible_id, f"Réseau ajouté : {data['type']}")
    con.commit()
    con.close()
    return jsonify({"status": "ok", "id": cur.lastrowid})


@app.route("/api/reseaux/<int:reseau_id>", methods=["DELETE"])
@require_auth
def supprimer_reseau(reseau_id):
    con = get_db()
    r = con.execute("SELECT * FROM reseaux WHERE id=?", (reseau_id,)).fetchone()
    if r:
        add_historique(con, r["cible_id"], f"Réseau supprimé : {r['type']}")
        con.execute("DELETE FROM reseaux WHERE id=?", (reseau_id,))
        con.commit()
    con.close()
    return jsonify({"status": "ok"})


# ============================================================
#  ROUTES — FICHIERS
# ============================================================

@app.route("/api/cibles/<int:cible_id>/fichiers", methods=["POST"])
@require_auth
def upload_fichier(cible_id):
    if "file" not in request.files:
        return jsonify({"error": "aucun fichier"}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "nom de fichier vide"}), 400
    filename  = f"{int(time.time())}_{f.filename}"
    filepath  = os.path.join(UPLOAD_FOLDER, filename)
    f.save(filepath)
    ext = f.filename.rsplit(".", 1)[-1].upper() if "." in f.filename else "FILE"
    con = get_db()
    cur = con.execute(
        "INSERT INTO fichiers (cible_id, nom, chemin, type) VALUES (?, ?, ?, ?)",
        (cible_id, f.filename, filepath, ext)
    )
    add_historique(con, cible_id, f"Fichier uploadé : {f.filename}")
    con.commit()
    con.close()
    return jsonify({"status": "ok", "id": cur.lastrowid, "chemin": filepath})


@app.route("/api/fichiers/<int:fichier_id>", methods=["DELETE"])
@require_auth
def supprimer_fichier(fichier_id):
    con = get_db()
    f = con.execute("SELECT * FROM fichiers WHERE id=?", (fichier_id,)).fetchone()
    if f:
        try:
            os.remove(f["chemin"])
        except Exception:
            pass
        add_historique(con, f["cible_id"], f"Fichier supprimé : {f['nom']}")
        con.execute("DELETE FROM fichiers WHERE id=?", (fichier_id,))
        con.commit()
    con.close()
    return jsonify({"status": "ok"})


# ============================================================
#  ROUTES — TIMELINE
# ============================================================

@app.route("/api/cibles/<int:cible_id>/timeline", methods=["POST"])
@require_auth
def ajouter_timeline(cible_id):
    data = request.json
    con = get_db()
    cur = con.execute(
        "INSERT INTO timeline (cible_id, type, texte) VALUES (?, ?, ?)",
        (cible_id, data["type"], data["texte"])
    )
    add_historique(con, cible_id,
                   f"Événement ajouté : [{data['type'].upper()}] {data['texte']}")
    con.commit()
    con.close()
    return jsonify({"status": "ok", "id": cur.lastrowid})


@app.route("/api/timeline/<int:event_id>", methods=["DELETE"])
@require_auth
def supprimer_timeline(event_id):
    con = get_db()
    e = con.execute("SELECT * FROM timeline WHERE id=?", (event_id,)).fetchone()
    if e:
        add_historique(con, e["cible_id"], "Événement timeline supprimé")
        con.execute("DELETE FROM timeline WHERE id=?", (event_id,))
        con.commit()
    con.close()
    return jsonify({"status": "ok"})


# ============================================================
#  ROUTES — FRIDAY (appelées par N8N)
# ============================================================

@app.route("/api/friday/cible", methods=["POST"])
@require_friday_key
def friday_creer_cible():
    """N8N appelle cette route pour créer une cible automatiquement."""
    data = request.json
    con = get_db()
    cur = con.execute(
        "INSERT INTO cibles (nom, prenom, email, telephone, notes) VALUES (?, ?, ?, ?, ?)",
        (data.get("nom", ""),
         data.get("prenom", ""),
         data.get("email", ""),
         data.get("telephone", ""),
         data.get("notes", "Créé automatiquement par Friday"))
    )
    cible_id = cur.lastrowid
    add_historique(con, cible_id,
                   f"Dossier créé par Friday — {data.get('prenom', '')} {data.get('nom', '')}")
    con.commit()
    con.close()
    return jsonify({"status": "ok", "id": cible_id})


@app.route("/api/friday/alerte", methods=["POST"])
@require_friday_key
def friday_alerte():
    """N8N appelle cette route pour créer une alerte sur une cible."""
    data = request.json
    con = get_db()
    con.execute(
        "INSERT INTO alertes (cible_id, type, message) VALUES (?, ?, ?)",
        (data.get("cible_id"), data.get("type", "info"), data.get("message", ""))
    )
    if data.get("cible_id"):
        add_historique(con, data["cible_id"],
                       f"Alerte Friday : {data.get('message', '')}")
    con.commit()
    con.close()
    return jsonify({"status": "ok"})


@app.route("/api/friday/timeline", methods=["POST"])
@require_friday_key
def friday_timeline():
    """N8N appelle cette route pour ajouter un événement timeline."""
    data = request.json
    con = get_db()
    cur = con.execute(
        "INSERT INTO timeline (cible_id, type, texte) VALUES (?, ?, ?)",
        (data["cible_id"], data.get("type", "info"), data["texte"])
    )
    add_historique(con, data["cible_id"],
                   f"Événement ajouté par Friday : {data['texte']}")
    con.commit()
    con.close()
    return jsonify({"status": "ok", "id": cur.lastrowid})


# ============================================================
#  ROUTES — ALERTES
# ============================================================

@app.route("/api/alertes", methods=["GET"])
@require_auth
def get_alertes():
    con = get_db()
    rows = con.execute(
        "SELECT * FROM alertes ORDER BY created_at DESC LIMIT 50"
    ).fetchall()
    con.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/alertes/<int:alerte_id>/lu", methods=["PUT"])
@require_auth
def marquer_alerte_lue(alerte_id):
    con = get_db()
    con.execute("UPDATE alertes SET lu=1 WHERE id=?", (alerte_id,))
    con.commit()
    con.close()
    return jsonify({"status": "ok"})


# ============================================================
#  LANCEMENT
# ============================================================

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=False)