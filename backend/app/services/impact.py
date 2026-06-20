# Published per-hectare environmental constants — rough, defensible estimates,
# not meant to be forestry-grade precision.
TREES_PER_HECTARE = 400
CO2_TONS_PER_HECTARE = 30          # average temperate forest biomass burn
WILDLIFE_PER_HECTARE = 0.8
DOLLAR_DAMAGE_PER_HECTARE = 8000   # land + timber + infrastructure, rough blended estimate


def estimate_impact(burned_area_hectares: float):
    return {
        "trees_lost": round(burned_area_hectares * TREES_PER_HECTARE),
        "wildlife_affected": round(burned_area_hectares * WILDLIFE_PER_HECTARE),
        "co2_tons": round(burned_area_hectares * CO2_TONS_PER_HECTARE, 1),
        "dollar_damage": round(burned_area_hectares * DOLLAR_DAMAGE_PER_HECTARE),
    }


def polygon_area_hectares(polygon_geojson: dict) -> float:
    """Crude bounding-box area in hectares from a GeoJSON polygon."""
    coords = polygon_geojson.get("coordinates", [[]])[0]
    if len(coords) < 4:
        return 0.1
    lngs = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    width_km = (max(lngs) - min(lngs)) * 111
    height_km = (max(lats) - min(lats)) * 111
    return max(width_km * height_km * 100, 0.1)  # km² → hectares
