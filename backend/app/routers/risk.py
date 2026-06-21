from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import Incident, RiskScore
from app.services.weather import get_weather
from app.ml.risk_model import predict_risk
from app.ws_manager import manager

router = APIRouter(prefix="/risk", tags=["risk"])


@router.post("/{incident_id}")
async def compute_risk(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(404, "Incident not found")

    weather = get_weather(incident.lat, incident.lng)
    vegetation_density = 0.6  # TODO: mock until a real land-cover dataset is wired in
    score, feature_importance = predict_risk(
        weather, vegetation_density,
        hour_of_day=datetime.utcnow().hour,
        is_dry_season=True,
    )

    risk = RiskScore(incident_id=incident.id, score=score,
                      feature_importance=feature_importance, weather_data=weather)
    db.add(risk)
    db.commit()

    await manager.broadcast("risk_update", incident.id, {
    "score": score,
    "feature_importance": feature_importance,
    "weather_data": {
        **weather,
        "temperature": weather["temp"],
        "wind_direction": weather["wind_dir"],
	    },	
	})
    return {"score": score, "feature_importance": feature_importance, "weather_data": weather}
