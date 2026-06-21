import math

# Simulated authority directory — NOT real government contacts.
# Demo purposes only: maps rough regions of Nepal to a placeholder
# contact. Replace with real Department of Forests contacts if this
# project moves beyond hackathon stage.
AUTHORITIES = [
    {"name": "Kathmandu District Forest Office", "lat": 27.7172, "lng": 85.3240},
    {"name": "Pokhara Division Forest Office", "lat": 28.2096, "lng": 83.9856},
    {"name": "Chitwan Division Forest Office", "lat": 27.5291, "lng": 84.3542},
    {"name": "Dhangadhi Division Forest Office", "lat": 28.6987, "lng": 80.5826},
    {"name": "Biratnagar Division Forest Office", "lat": 26.4525, "lng": 87.2718},
]


def _distance_km(lat1, lng1, lat2, lng2):
    """Haversine distance — good enough for 'nearest' matching."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def find_nearest_authority(lat: float, lng: float):
    nearest = min(AUTHORITIES, key=lambda a: _distance_km(lat, lng, a["lat"], a["lng"]))
    distance = _distance_km(lat, lng, nearest["lat"], nearest["lng"])
    return nearest, round(distance, 1)