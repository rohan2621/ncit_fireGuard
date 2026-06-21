import math

# Rough, defensible per-hectare estimates for Nepal's context — predominantly
# Sal (Shorea robusta) forest in the Terai and Chir pine / mixed broadleaf in
# the mid-hills, where most of Nepal's wildfire incidents occur. These are
# order-of-magnitude planning estimates, not forestry-survey-grade figures —
# real values vary significantly by elevation, forest type, and density.
TREES_PER_HECTARE = 400
CO2_TONS_PER_HECTARE = 30
WILDLIFE_PER_HECTARE = 0.8
DOLLAR_DAMAGE_PER_HECTARE = 8000  # land + timber + infrastructure, blended estimate


def estimate_impact(burned_area_hectares: float):
    return {
        "trees_lost": round(burned_area_hectares * TREES_PER_HECTARE),
        "wildlife_affected": round(burned_area_hectares * WILDLIFE_PER_HECTARE),
        "co2_tons": round(burned_area_hectares * CO2_TONS_PER_HECTARE, 1),
        "dollar_damage": round(burned_area_hectares * DOLLAR_DAMAGE_PER_HECTARE),
    }


def polygon_area_hectares(polygon_geojson: dict) -> float:
    """Computes the actual polygon area (shoelace formula) rather than a
    bounding-box approximation, since a bounding box significantly
    overestimates area for elongated or irregular fire-spread shapes —
    which is the normal shape wind-driven fire spread produces."""
    coords = polygon_geojson.get("coordinates", [[]])[0]
    if len(coords) < 4:
        return 0.1

    # Equirectangular projection: convert lat/lng degrees to local planar km.
    # Accurate enough for polygons spanning a few km (typical fire spread)
    # since the latitude correction for longitude is applied per-polygon.
    avg_lat = sum(c[1] for c in coords) / len(coords)
    km_per_deg_lat = 111.32
    km_per_deg_lng = 111.32 * math.cos(math.radians(avg_lat))
    pts_km = [(lng * km_per_deg_lng, lat * km_per_deg_lat) for lng, lat in coords]

    # Shoelace formula for true polygon area in km²
    area_km2 = 0.0
    n = len(pts_km)
    for i in range(n):
        x1, y1 = pts_km[i]
        x2, y2 = pts_km[(i + 1) % n]
        area_km2 += x1 * y2 - x2 * y1
    area_km2 = abs(area_km2) / 2.0

    area_hectares = area_km2 * 100  # km² → hectares
    return max(area_hectares, 0.1)