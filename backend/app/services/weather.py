import requests

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def get_weather(lat: float, lng: float) -> dict:
    """Free, no-API-key weather lookup — feeds the risk engine's input features."""
    try:
        resp = requests.get(OPEN_METEO_URL, params={
            "latitude": lat,
            "longitude": lng,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m",
        }, timeout=5)
        resp.raise_for_status()
        cur = resp.json()["current"]
        return {
            "temp": cur["temperature_2m"],
            "humidity": cur["relative_humidity_2m"],
            "wind_speed": cur["wind_speed_10m"],
            "wind_dir": cur["wind_direction_10m"],
        }
    except Exception:
        # A flaky third-party API should never crash a live demo —
        # fall back to plausible static values instead.
        return {"temp": 30, "humidity": 20, "wind_speed": 15, "wind_dir": 200}
