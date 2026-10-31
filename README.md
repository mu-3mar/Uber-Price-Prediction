# RideFare — Uber Fare Prediction

An end-to-end machine-learning regression project that estimates an Uber ride fare from trip details, coordinates, distance and time. The project includes the preprocessing notebooks, several regression experiments, a Flask API, and a dependency-free browser interface.

> **Scope:** This is an educational estimate, not an official Uber quote. Results depend on the dataset and trained model and may differ from a real fare.

## Project overview

The model predicts `fare_amount` from 18 features:

`Weather`, `pickup_longitude`, `pickup_latitude`, `dropoff_longitude`, `dropoff_latitude`, `passenger_count`, `hour`, `day`, `month`, `weekday`, `year`, `jfk_dist`, `ewr_dist`, `lga_dist`, `sol_dist`, `nyc_dist`, `distance`, and `bearing`.

The feature order is kept identical to the training notebooks and the API. Date and time are collected as user-friendly controls in the frontend and converted into `day`, `month`, `weekday`, `year`, and `hour` before the request is sent.

## Repository structure

```text
Uber-Price-Prediction/
├── README.md
├── Dockerfile                           # Docker image definition for the inference API
├── requirements.txt                    # Full training, notebook and runtime dependencies
├── requirements-runtime.txt            # Minimal dependencies for the inference/Docker image
├── data/
│   └── data.md                         # Dataset notes and reference link
├── notebooks/
│   ├── preprocessing/
│   │   └── Uber_project.ipynb          # Cleaning, feature engineering and EDA
│   └── modeling/                       # Regression experiments
│       ├── Linear Regression.ipynb
│       ├── Random Forest Regression.ipynb
│       ├── Decision Tree Regression.ipynb
│       ├── Polynomial Regression.ipynb
│       ├── Ridge.ipynb
│       └── XGBoost Regressor.ipynb
├── src/
│   ├── __init__.py
│   └── main.py                         # Flask JSON API
├── models/
│   ├── model.pkl                       # Trained regression model
│   └── scaler.pkl                      # Fitted feature scaler
└── frontend/
    ├── index.html                      # Independent static frontend
    ├── app.js                          # Form, API connection and result rendering
    ├── styles.css                      # Existing visual design and colors
    └── logo-animated.html              # Project logo animation
```

## Run the frontend independently

The frontend is static and does not require Flask, Streamlit, Node.js or any frontend build tool.

```bash
cd frontend
python3 -m http.server 5500
```

Open <http://127.0.0.1:5500>. The form, randomize button and reset button work without a backend. Prediction requests are sent to `http://127.0.0.1:5000` when the API is available. You can point the page to another API without editing the files:

```text
http://127.0.0.1:5500/?api=http://localhost:5000
```

The API status pill shows whether the configured backend can be reached.

## Run the Flask API

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
flask --app src.main run --debug --port 5000
```

Run the command from the repository root. The API loads the artifacts from `models/`, so the source code, model files and frontend have clear separate responsibilities.

For Docker or any inference-only environment, install the smaller runtime set
instead:

```bash
pip install -r requirements-runtime.txt
```

The runtime file intentionally keeps `xgboost`: the committed `model.pkl` is an
`XGBRegressor` and needs that package when it is loaded.

## Dockerization

The inference API is containerized using the [`Dockerfile`](Dockerfile). The
image contains only the API source, trained model artifacts and the runtime
dependencies from [`requirements-runtime.txt`](requirements-runtime.txt), so
the training and notebook packages are not installed in the production image.

### Docker image

The published image is available on Docker Hub:

**[mu3mar/uber-price-prediction](https://hub.docker.com/r/mu3mar/uber-price-prediction)**

Pull and run the image:

```bash
docker pull mu3mar/uber-price-prediction:latest
docker run --rm -p 5000:8000 \
  --name uber-price-prediction \
  mu3mar/uber-price-prediction:latest
```

The API is then available at <http://127.0.0.1:5000>. The container listens on
port `8000`, which is mapped to port `5000` on the host.

### Build the image locally

From the repository root:

```bash
docker build -t mu3mar/uber-price-prediction:latest .
docker run --rm -p 5000:8000 \
  --name uber-price-prediction \
  mu3mar/uber-price-prediction:latest
```

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | API liveness response |
| `POST` | `/predict` | Return the estimated fare |

Example request:

```bash
curl -X POST http://127.0.0.1:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"features":{"Weather":3,"pickup_longitude":-73.985,"pickup_latitude":40.748,"dropoff_longitude":-73.977,"dropoff_latitude":40.752,"passenger_count":1,"hour":14,"day":15,"month":6,"weekday":5,"year":2015,"jfk_dist":10,"ewr_dist":15,"lga_dist":8,"sol_dist":4,"nyc_dist":3,"distance":3,"bearing":0}}'
```

Response:

```json
{"prediction": 12.34}
```

The API accepts JSON from the independent frontend and keeps the original form-value flow compatible. Missing or incorrectly sized feature lists return HTTP 422.

## Data and modeling workflow

1. Download or provide the project dataset according to [`data/data.md`](data/data.md).
2. Run [`notebooks/preprocessing/Uber_project.ipynb`](notebooks/preprocessing/Uber_project.ipynb) to clean the data and create engineered features.
3. Use the notebooks in [`notebooks/modeling/`](notebooks/modeling/) to compare regression algorithms.
4. The deployed artifacts are [`models/model.pkl`](models/model.pkl) and [`models/scaler.pkl`](models/scaler.pkl).

The repository does not include the original private dataset. The public Kaggle dataset linked in `data/data.md` is a reference and may not reproduce the committed artifacts or metrics.

## Technologies

Python, pandas, NumPy, scikit-learn, Jupyter, Flask, HTML, CSS and vanilla JavaScript.

## Author

**Muhammad Ammar**
