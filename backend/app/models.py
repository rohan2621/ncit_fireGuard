import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, JSON, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=gen_uuid)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    confidence = Column(Float, nullable=False)
    status = Column(String, default="detected")     # detected | confirmed | contained
    source = Column(String, nullable=False)          # upload | webcam | stream | satellite

    risk_scores = relationship("RiskScore", back_populates="incident")
    simulation_frames = relationship("SimulationFrame", back_populates="incident")
    impact_estimate = relationship("ImpactEstimate", back_populates="incident", uselist=False)
    report = relationship("Report", back_populates="incident", uselist=False)


class RiskScore(Base):
    __tablename__ = "risk_scores"
    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    score = Column(Float, nullable=False)
    feature_importance = Column(JSON)
    weather_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    incident = relationship("Incident", back_populates="risk_scores")


class SimulationFrame(Base):
    __tablename__ = "simulation_frames"
    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    minute_offset = Column(Integer, nullable=False)
    polygon_geojson = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    incident = relationship("Incident", back_populates="simulation_frames")


class ImpactEstimate(Base):
    __tablename__ = "impact_estimates"
    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    trees_lost = Column(Float)
    wildlife_affected = Column(Integer)
    co2_tons = Column(Float)
    dollar_damage = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    incident = relationship("Incident", back_populates="impact_estimate")


class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    content = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    incident = relationship("Incident", back_populates="report")
