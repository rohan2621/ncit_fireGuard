import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split

FEATURE_NAMES = ["temp", "humidity", "wind_speed", "vegetation_density", "hour_of_day", "is_dry_season"]

_model = None


def _train_mock_model():
    """TODO: replace with real historical fire-incident data.
    Synthetic data only, lets the rest of the pipeline run end-to-end
    today instead of blocking on a real dataset."""
    rng = np.random.default_rng(42)
    n = 500
    X = np.column_stack([
        rng.uniform(15, 40, n),    # temp
        rng.uniform(5, 90, n),     # humidity
        rng.uniform(0, 40, n),     # wind_speed
        rng.uniform(0, 1, n),      # vegetation_density
        rng.uniform(0, 24, n),     # hour_of_day
        rng.integers(0, 2, n),     # is_dry_season
    ])
    # crude synthetic label: hotter, drier, windier, denser vegetation -> higher risk
    y = X[:, 0] * 1.2 - X[:, 1] * 0.8 + X[:, 2] * 1.5 + X[:, 3] * 30 + X[:, 5] * 15
    y = np.clip((y - y.min()) / (y.max() - y.min()) * 100, 0, 100)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = xgb.XGBRegressor(n_estimators=100, max_depth=4)
    model.fit(X_train, y_train)
    return model


def get_model():
    global _model
    if _model is None:
        _model = _train_mock_model()
    return _model


def predict_risk(weather: dict, vegetation_density: float, hour_of_day: int, is_dry_season: bool):
    model = get_model()
    X = np.array([[
        weather["temp"], weather["humidity"], weather["wind_speed"],
        vegetation_density, hour_of_day, int(is_dry_season),
    ]])
    score = float(model.predict(X)[0])
    importances = model.feature_importances_
    feature_importance = {name: float(round(imp, 3)) for name, imp in zip(FEATURE_NAMES, importances)}
    return round(score, 1), feature_importance
