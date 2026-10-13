
from flask import Flask, render_template, request, jsonify
import subprocess
from pathlib import Path

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
CPP_EXE = BASE_DIR / "cpp" / "freshserve.exe"


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/prioritize", methods=["POST"])
def prioritize():
    data = request.get_json(silent=True) or {}
    donations = data.get("donations", [])

    if not isinstance(donations, list) or len(donations) > 100:
        return jsonify({"error": "Invalid donation list"}), 400

    lines = [str(len(donations))]

    try:
        for i, item in enumerate(donations, start=1):
            if not isinstance(item, dict):
                return jsonify({"error": "Invalid donation"}), 400

            food = str(item.get("food", "Food")).strip().replace(" ", "_")
            quantity = int(item.get("quantity", 1))
            hours = int(item.get("hoursLeft", 24))

            if not food.replace("_", "").isalnum():
                return jsonify({"error": "Use letters and numbers for food names"}), 400

            if not 1 <= quantity <= 100000 or not 0 <= hours <= 8760:
                return jsonify({"error": "Invalid quantity or expiry time"}), 400

            lines.append(f"{i} {food} {quantity} {hours}")

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
            if line.strip():
                donation_id, food, quantity, hours = line.split()
                ordered.append({
                    "id": int(donation_id),
                    "food": food.replace("_", " "),
                    "quantity": int(quantity),
                    "hoursLeft": int(hours)
                })

        return jsonify({"donations": ordered})

    except (ValueError, TypeError):
        return jsonify({"error": "Please enter valid donation details"}), 400
    except (subprocess.SubprocessError, OSError):
        return jsonify({"error": "C++ engine failed. Compile cpp/main.cpp first."}), 500


if __name__ == "__main__":
    app.run(debug=True)
