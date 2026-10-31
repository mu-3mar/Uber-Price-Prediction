from pathlib import Path
import pickle

import numpy as np
from flask import Flask, jsonify, request

app = Flask(__name__)
PROJECT_ROOT = Path(__file__).resolve().parents[1]
model = pickle.load((PROJECT_ROOT / "models" / "model.pkl").open("rb"))
scaler = pickle.load((PROJECT_ROOT / "models" / "scaler.pkl").open("rb"))
FEATURES = [
    "Weather", "pickup_longitude", "pickup_latitude", "dropoff_longitude",
    "dropoff_latitude", "passenger_count", "hour", "day", "month", "weekday",
    "year", "jfk_dist", "ewr_dist", "lga_dist", "sol_dist", "nyc_dist",
    "distance", "bearing",
]


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/")
def home():
    return jsonify({"message": "Uber fare prediction API is running"})

@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True)
    if payload and "features" in payload:
        values = payload["features"]
        if not isinstance(values, dict):
            return jsonify({"error": "'features' must be an object."}), 422
        missing = [name for name in FEATURES if name not in values]
        if missing:
            return jsonify({"error": f"Missing features: {missing}"}), 422
        try:
            float_features = [float(values[name]) for name in FEATURES]
        except (TypeError, ValueError):
            return jsonify({"error": "All features must be numeric."}), 422
    else:
        try:
            float_features = [float(value) for value in request.form.values()]
        except (TypeError, ValueError):
            return jsonify({"error": "All features must be numeric."}), 422
    if len(float_features) != len(FEATURES):
        return jsonify({"error": f"Expected {len(FEATURES)} features."}), 422
    scaled_feature = scaler.transform([np.array(float_features)])
    prediction = float(model.predict(scaled_feature)[0])
    return jsonify({"prediction": round(prediction, 2)})


@app.route("/predict", methods=["OPTIONS"])
def predict_options():
    return ("", 204)

if __name__ == "__main__":
    app.run(debug=True, port=5000)