from datetime import datetime

RESPONSE_LEVELS = [(80, "Level 3 — Immediate evacuation advised"),
                    (50, "Level 2 — Elevated response, monitor closely"),
                    (0, "Level 1 — Routine monitoring")]


def response_level(risk_score: float) -> str:
    for threshold, label in RESPONSE_LEVELS:
        if risk_score >= threshold:
            return label
    return RESPONSE_LEVELS[-1][1]


def generate_report(incident, risk_score, weather, impact, spread_radius_m):
    level = response_level(risk_score)
    return (
        f"WILDFIRE INCIDENT REPORT\n"
        f"Generated: {datetime.utcnow().isoformat()}\n\n"
        f"Location: {incident.lat:.4f}, {incident.lng:.4f}\n"
        f"Detected: {incident.timestamp} (source: {incident.source})\n"
        f"Detection confidence: {incident.confidence * 100:.1f}%\n\n"
        f"Risk score: {risk_score}/100\n"
        f"Weather: {weather['temp']}°C, {weather['humidity']}% humidity, "
        f"wind {weather['wind_speed']} km/h\n\n"
        f"Projected spread radius (180 min): ~{spread_radius_m:.0f} m\n"
        f"Estimated impact: {impact['trees_lost']} trees, "
        f"{impact['wildlife_affected']} wildlife affected, "
        f"{impact['co2_tons']} tons CO2, ${impact['dollar_damage']:,}\n\n"
        f"RECOMMENDED RESPONSE: {level}"
    )
