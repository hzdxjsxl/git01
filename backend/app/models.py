from sqlalchemy import Column, Integer, Float, DateTime, String, Index
from datetime import datetime
from app.database import Base


class GPSPoint(Base):
    __tablename__ = "gps_points"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(String(50), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    speed = Column(Float, default=0.0)
    direction = Column(Float, default=0.0)

    __table_args__ = (
        Index('ix_gps_vehicle_time', 'vehicle_id', 'timestamp'),
    )


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(String(50), unique=True, index=True, nullable=False)
    plate_number = Column(String(50), nullable=False)
    driver_name = Column(String(50))
    status = Column(String(20), default="running")
