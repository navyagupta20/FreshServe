
from flask import Flask, render_template, request, jsonify
from pathlib import Path
import sqlite3
import subprocess

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "freshserve.db"
CPP_EXE = BASE_DIR / "cpp" / "freshserve.exe"


# -------------------- DATABASE --------------------

def get_db():
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS donations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                food TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                hours_left INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'Available',
                ngo_name TEXT,
                pickup_location TEXT,
                pickup_time TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


def donation_dict(row):
    return {
        "id": row["id"],
        "food": row["food"],
        "quantity": row["quantity"],
        "hoursLeft": row["hours_left"],
        "status": row["status"],
        "ngoName": row["ngo_name"],
        "pickupLocation": row["pickup_location"],
        "pickupTime": row["pickup_time"]
    }


# -------------------- PAGES --------------------

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/ngo")
def ngo_dashboard():
    return render_template("ngo.html")


# -------------------- GET DONATIONS --------------------

@app.route("/api/donations", methods=["GET"])
def get_donations():
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM donations ORDER BY id DESC"
        ).fetchall()

    return jsonify({
        "donations": [donation_dict(row) for row in rows]
    })


# -------------------- ADD DONATION --------------------

@app.route("/api/donations", methods=["POST"])
def add_donation():
    data = request.get_json(silent=True) or {}

    food = str(data.get("food", "")).strip()
    quantity = data.get("quantity")
    hours = data.get("hoursLeft")

    if (
        not food
        or len(food) > 60
        or not food.replace(" ", "").isalnum()
    ):
        return jsonify({"error": "Enter a valid food name."}), 400

    try:
        quantity = int(quantity)
        hours = int(hours)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Quantity and expiry must be numbers."
        }), 400

    if not 1 <= quantity <= 100000 or not 0 <= hours <= 8760:
        return jsonify({
            "error": "Quantity or expiry is out of range."
        }), 400

    with get_db() as db:
        cursor = db.execute("""
            INSERT INTO donations (food, quantity, hours_left)
            VALUES (?, ?, ?)
        """, (food, quantity, hours))

        row = db.execute(
            "SELECT * FROM donations WHERE id = ?",
            (cursor.lastrowid,)
        ).fetchone()

    return jsonify({"donation": donation_dict(row)}), 201


# -------------------- UPDATE DONATION --------------------

@app.route("/api/donations/<int:donation_id>", methods=["PUT"])
def update_donation(donation_id):
    data = request.get_json(silent=True) or {}

    food = str(data.get("food", "")).strip()

    try:
        quantity = int(data.get("quantity"))
        hours = int(data.get("hoursLeft"))
    except (TypeError, ValueError):
        return jsonify({
            "error": "Invalid quantity or expiry."
        }), 400

    if (
        not food
        or len(food) > 60
        or not food.replace(" ", "").isalnum()
        or not 1 <= quantity <= 100000
        or not 0 <= hours <= 8760
    ):
        return jsonify({
            "error": "Invalid donation details."
        }), 400

    with get_db() as db:
        cursor = db.execute("""
            UPDATE donations
            SET food = ?, quantity = ?, hours_left = ?
            WHERE id = ? AND status = 'Available'
        """, (food, quantity, hours, donation_id))

    if cursor.rowcount == 0:
        return jsonify({
            "error": "Donation not found or already claimed."
        }), 409

    return jsonify({"message": "Donation updated."})


# -------------------- DELETE DONATION --------------------

@app.route("/api/donations/<int:donation_id>", methods=["DELETE"])
def delete_donation(donation_id):
    with get_db() as db:
        cursor = db.execute("""
            DELETE FROM donations
            WHERE id = ? AND status = 'Available'
        """, (donation_id,))

    if cursor.rowcount == 0:
        return jsonify({
            "error": "Donation not found or already claimed."
        }), 409

    return jsonify({"message": "Donation deleted."})


# -------------------- CLAIM DONATION --------------------

@app.route("/api/donations/<int:donation_id>/claim", methods=["POST"])
def claim_donation(donation_id):
    data = request.get_json(silent=True) or {}

    ngo_name = str(data.get("ngoName", "")).strip()
    location = str(data.get("pickupLocation", "")).strip()
    pickup_time = str(data.get("pickupTime", "")).strip()

    if not ngo_name or len(ngo_name) > 100:
        return jsonify({"error": "Enter a valid NGO name."}), 400

    if not location or len(location) > 200:
        return jsonify({"error": "Enter a pickup location."}), 400

    if not pickup_time or len(pickup_time) > 100:
        return jsonify({"error": "Enter a pickup time."}), 400

    with get_db() as db:
        cursor = db.execute("""
            UPDATE donations
            SET status = 'Claimed',
                ngo_name = ?,
                pickup_location = ?,
                pickup_time = ?
            WHERE id = ? AND status = 'Available'
        """, (ngo_name, location, pickup_time, donation_id))

    if cursor.rowcount == 0:
        return jsonify({
            "error": "This donation has already been claimed or removed."
        }), 409

    return jsonify({"message": "Donation successfully claimed."})


# -------------------- UPDATE DONATION STATUS --------------------

@app.route("/api/donations/<int:donation_id>/status", methods=["PATCH"])
def update_status(donation_id):
    data = request.get_json(silent=True) or {}
    status = data.get("status")

    if status != "Collected":
        return jsonify({"error": "Invalid status."}), 400

    with get_db() as db:
        cursor = db.execute("""
            UPDATE donations
            SET status = 'Collected'
            WHERE id = ? AND status = 'Claimed'
        """, (donation_id,))

    if cursor.rowcount == 0:
        return jsonify({
            "error": "Claimed donation not found."
        }), 409

    return jsonify({"message": "Donation marked collected."})


# -------------------- C++ DSA PRIORITIZATION --------------------

@app.route("/api/prioritize", methods=["POST"])
def prioritize():
    if not CPP_EXE.exists():
        return jsonify({
            "error": "C++ engine not found. Compile cpp/main.cpp first."
        }), 500

    try:
        # Fetch real available donations from SQLite.
        with get_db() as db:
            rows = db.execute("""
                SELECT id, food, quantity, hours_left
                FROM donations
                WHERE status = 'Available'
            """).fetchall()

        if not rows:
            return jsonify({"donations": []})

        lines = [str(len(rows))]

        # Pass the real database IDs to the C++ priority queue.
        for row in rows:
            food = row["food"].strip()

            # The C++ input format uses spaces as separators.
            if (
                not food
                or not food.replace(" ", "").isalnum()
            ):
                return jsonify({
                    "error": "A donation has an invalid food name."
                }), 400

            food_for_cpp = food.replace(" ", "_")

            lines.append(
                f'{row["id"]} {food_for_cpp} '
                f'{row["quantity"]} {row["hours_left"]}'
            )

        result = subprocess.run(
            [str(CPP_EXE)],
            input="\n".join(lines) + "\n",
            text=True,
            capture_output=True,
            timeout=5,
            check=True
        )

        ordered = []

        for line in result.stdout.splitlines():
            if not line.strip():
                continue

            donation_id, food, quantity, hours = line.split()

            ordered.append({
                "id": int(donation_id),
                "food": food.replace("_", " "),
                "quantity": int(quantity),
                "hoursLeft": int(hours)
            })

        return jsonify({"donations": ordered})

    except (subprocess.SubprocessError, OSError) as error:
        app.logger.error("C++ prioritization failed: %s", error)
        return jsonify({
            "error": "C++ prioritization failed. Check the C++ executable."
        }), 500

    except (ValueError, TypeError) as error:
        app.logger.error("Invalid prioritization data: %s", error)
        return jsonify({
            "error": "Invalid donation data for prioritization."
        }), 400


# -------------------- START APPLICATION --------------------

init_db()

if __name__ == "__main__":
    app.run(debug=True)
