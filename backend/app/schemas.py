from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class GPSPointSchema(BaseModel):
    id: int
    vehicle_id: str
    latitude: float
    longitude: float
    timestamp: datetime
    speed: Optional[float] = 0.0
    direction: Optional[float] = 0.0

    class Config:
        from_attributes = True


class VehicleSchema(BaseModel):
    id: int
    vehicle_id: str
    plate_number: str
    driver_name: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class TrajectoryResponse(BaseModel):
    vehicle_id: str
    total_points: int
    points: List[GPSPointSchema]
