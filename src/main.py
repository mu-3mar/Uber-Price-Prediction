from pathlib import Path
import pickle

import numpy as np
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="RideFare API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
PROJECT_ROOT = Path(__file__).resolve().parents[1]
model = pickle.load((PROJECT_ROOT / "models" / "model.pkl").open("rb"))
scaler = pickle.load((PROJECT_ROOT / "models" / "scaler.pkl").open("rb"))
FEATURES = [
    "Weather", "pickup_longitude", "pickup_latitude", "dropoff_longitude",
    "dropoff_latitude", "passenger_count", "hour", "day", "month", "weekday",
    "year", "jfk_dist", "ewr_dist", "lga_dist", "sol_dist", "nyc_dist",
    "distance", "bearing",
]


@app.get("/")
def home():
    return {"message": "Uber fare prediction API is running"}


@app.post("/predict")
async def predict(request: Request):
    content_type = request.headers.get("content-type", "")
    payload = None
    if "application/json" in content_type:
        try:
            payload = await request.json()
        except ValueError:
            payload = None

    if payload and "features" in payload:
        values = payload["features"]
        if not isinstance(values, dict):
            return JSONResponse(
                {"error": "'features' must be an object."}, status_code=422
            )
        missing = [name for name in FEATURES if name not in values]
        if missing:
            return JSONResponse(
                {"error": f"Missing features: {missing}"}, status_code=422
            )
        try:
            float_features = [float(values[name]) for name in FEATURES]
        except (TypeError, ValueError):
            return JSONResponse(
                {"error": "All features must be numeric."}, status_code=422
            )
    else:
        try:
            form = await request.form()
            float_features = [float(value) for value in form.values()]
        except (TypeError, ValueError):
            return JSONResponse(
                {"error": "All features must be numeric."}, status_code=422
            )
    if len(float_features) != len(FEATURES):
        return JSONResponse(
            {"error": f"Expected {len(FEATURES)} features."}, status_code=422
        )
    scaled_feature = scaler.transform([np.array(float_features)])
    prediction = float(model.predict(scaled_feature)[0])
    return {"prediction": round(prediction, 2)}