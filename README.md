# RideFare — Uber Fare Prediction

End-to-end machine-learning project for estimating the fare of an Uber ride
from trip coordinates, distance, time and weather information. The project
covers data preparation, exploratory analysis, comparison of regression
models, model serialization, a FastAPI inference service, Docker deployment
and a standalone browser interface.

> **Important:** This is an educational estimate, not an official Uber quote.
> The original dataset was privately provided and is not included in this
> repository. Predictions therefore depend on the trained artifact and may
> differ from a live commercial fare.

## Demo

Watch the project walkthrough to see the prediction interface and API in
action:

https://github.com/user-attachments/assets/0da0742c-3450-4061-b995-6c934f1a9142

## What the project does

The target is `fare_amount`. The final inference pipeline expects these 18
features in the exact order used by the notebooks and API:

```text
Weather
pickup_longitude, pickup_latitude
dropoff_longitude, dropoff_latitude
passenger_count
hour, day, month, weekday, year
jfk_dist, ewr_dist, lga_dist, sol_dist, nyc_dist
distance, bearing
```

The frontend collects a date and time from the user, then converts them into
`hour`, `day`, `month`, `weekday` and `year` before sending the prediction
request.

## Model experiments and results

The modeling notebooks use an 80/20 train-test split with
`random_state=2`. The preprocessing workflow starts with approximately
500,000 records, removes unused identifier/date columns, drops missing
values, encodes categorical columns, removes selected outliers, and keeps
features selected through correlation analysis.

The following values are the outputs recorded in the modeling notebooks:

| Model | Configuration | MAE | MSE | RMSE | R² |
|---|---|---:|---:|---:|---:|
| **XGBoost** | `XGBRegressor`, `random_state=42` | **1.0148** | **2.1999** | **1.4832*** | **0.7419** |
| Polynomial Regression | Degree 3 + Linear Regression | 1.1182 | 2.5434 | 1.5948 | 0.6917 |
| Random Forest | `n_estimators=100`, `max_depth=5` | 1.3479 | 3.3733 | 1.8367 | 0.5351 |
| Linear Regression | Linear baseline | 1.3641 | 3.4459 | 1.8563 | 0.5287 |
| Ridge Regression | `alpha=0.1` | 1.3641 | 3.4459 | 1.8563 | 0.5287 |
| Decision Tree | `random_state=42` | 1.5540 | 5.1074 | 2.2600 | — |

**Selected model:** XGBoost, because it achieved the lowest recorded MAE and
MSE and the highest recorded R² among the tested models. The committed
[`models/model.pkl`](models/model.pkl) is an `XGBRegressor`; the corresponding
fitted scaler is [`models/scaler.pkl`](models/scaler.pkl).

### How to read the metrics

- **MAE**: average absolute prediction error in fare units; lower is better.
- **MSE**: squares larger errors more heavily; lower is better.
- **RMSE**: square root of MSE, in the same unit as the fare; lower is better.
- **R²**: proportion of target variance explained by the model; higher is
  generally better.

The `RMSE` shown for XGBoost is the square root of its recorded MSE because the
notebook did not print RMSE for that experiment. The values above are
single-split benchmark results, not a production accuracy guarantee. In
addition, the notebooks currently call the scikit-learn metric functions with
the prediction array before the target array; rerunning the notebooks after
correcting that argument order is recommended before using R² as a formal
reported statistic.

## Repository structure

```text
Uber-Price-Prediction/
├── README.md
├── Dockerfile
├── requirements.txt                    # Training, notebook and API dependencies
├── requirements-runtime.txt            # Minimal inference dependencies
├── data/
│   └── data.md                         # Dataset availability and reference link
├── notebooks/
│   ├── preprocessing/
│   │   └── Uber_project.ipynb          # Cleaning, EDA and feature engineering
│   └── modeling/
│       ├── Linear Regression.ipynb
│       ├── Ridge.ipynb
│       ├── Polynomial Regression.ipynb
│       ├── Decision Tree Regression.ipynb
│       ├── Random Forest Regression.ipynb
│       └── XGBoost Regressor.ipynb
├── src/
│   ├── __init__.py
│   └── main.py                         # FastAPI inference API
├── models/
│   ├── model.pkl                       # Serialized XGBoost model
│   └── scaler.pkl                      # Fitted StandardScaler
└── frontend/
    ├── index.html                      # Static prediction interface
    ├── app.js                          # Form and API integration
    ├── styles.css                      # UI styles
    └── logo-animated.html              # Logo animation
```

## Run locally

### 1. Start the API

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 5000
```

The API loads the committed model artifacts from `models/`. For inference-only
use, install the smaller runtime set:

```bash
pip install -r requirements-runtime.txt
```

### 2. Start the frontend

The frontend is static and needs no Node.js or build step:

```bash
cd frontend
python3 -m http.server 5500
```

Open <http://127.0.0.1:5500>. The form, randomize button and reset button work
independently. When the API is running, predictions are sent to
`http://127.0.0.1:5000`.

To use another API origin without editing source files:

```text
http://127.0.0.1:5500/?api=http://localhost:5000
```

The status indicator in the interface reports whether the configured backend
is reachable.

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Liveness response |
| `POST` | `/predict` | Returns the estimated fare |

Example request:

```bash
curl -X POST http://127.0.0.1:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"features":{"Weather":3,"pickup_longitude":-73.985,"pickup_latitude":40.748,"dropoff_longitude":-73.977,"dropoff_latitude":40.752,"passenger_count":1,"hour":14,"day":15,"month":6,"weekday":5,"year":2015,"jfk_dist":10,"ewr_dist":15,"lga_dist":8,"sol_dist":4,"nyc_dist":3,"distance":3,"bearing":0}}'
```

Example response:

```json
{"prediction": 12.34}
```

The endpoint validates that all 18 named features are present and numeric.
Invalid JSON feature objects, missing fields, non-numeric values or an
incorrect feature count return HTTP `422` with an explanatory error.

## Docker deployment

The inference image contains the API, model artifacts and only the runtime
dependencies. The published image is available at
[`mu3mar/uber-price-prediction`](https://hub.docker.com/r/mu3mar/uber-price-prediction).

Pull and run:

```bash
docker pull mu3mar/uber-price-prediction:latest
docker run --rm -p 5000:8000 \
  --name uber-price-prediction \
  mu3mar/uber-price-prediction:latest
```

The API is then available at <http://127.0.0.1:5000>. The container listens on
port `8000`, mapped to port `5000` on the host.

Build locally:

```bash
docker build -t mu3mar/uber-price-prediction:latest .
docker run --rm -p 5000:8000 \
  --name uber-price-prediction \
  mu3mar/uber-price-prediction:latest
```

## Reproduce the workflow

1. Read the dataset notes in [`data/data.md`](data/data.md).
2. Run [`notebooks/preprocessing/Uber_project.ipynb`](notebooks/preprocessing/Uber_project.ipynb).
3. Run the six notebooks in [`notebooks/modeling/`](notebooks/modeling/) to
   compare the regressors.
4. Save the selected model and scaler to [`models/`](models/) before starting
   the API.

The original dataset is not redistributed. The Kaggle dataset linked in
[`data/data.md`](data/data.md) is a similar public reference only and will not
necessarily reproduce the committed model, split or metrics.

## Technology stack

Python · pandas · NumPy · scikit-learn · XGBoost · Jupyter · FastAPI · Uvicorn
· HTML · CSS · Vanilla JavaScript · Docker

## Author

**Muhammad Ammar**
