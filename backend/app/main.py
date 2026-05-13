from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db, Base, engine
from app.models import GPSPoint, Vehicle
from app.schemas import GPSPointSchema, VehicleSchema, TrajectoryResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="物流车队轨迹系统 API",
    description="提供 GPS 轨迹数据查询接口",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "name": "物流车队轨迹系统 API",
        "version": "1.0.0",
        "endpoints": {
            "GET /api/vehicles": "获取所有车辆列表",
            "GET /api/vehicles/{vehicle_id}": "获取单个车辆信息",
            "GET /api/trajectory/{vehicle_id}": "获取车辆轨迹点（原始数据，不抽稀）",
            "GET /api/realtime/{vehicle_id}": "获取车辆最新位置"
        }
    }


@app.get("/api/vehicles", response_model=List[VehicleSchema])
def get_vehicles(db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).all()
    return vehicles


@app.get("/api/vehicles/{vehicle_id}", response_model=VehicleSchema)
def get_vehicle(vehicle_id: str, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@app.get("/api/trajectory/{vehicle_id}", response_model=TrajectoryResponse)
def get_trajectory(
    vehicle_id: str,
    limit: Optional[int] = Query(None, description="限制返回的点数，默认返回全部"),
    offset: Optional[int] = Query(0, description="偏移量"),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    query = db.query(GPSPoint).filter(
        GPSPoint.vehicle_id == vehicle_id
    ).order_by(GPSPoint.timestamp.asc())
    
    total_count = query.count()
    
    if limit:
        query = query.offset(offset).limit(limit)
    
    points = query.all()
    
    return TrajectoryResponse(
        vehicle_id=vehicle_id,
        total_points=total_count,
        points=points
    )


@app.get("/api/realtime/{vehicle_id}", response_model=GPSPointSchema)
def get_realtime_position(vehicle_id: str, db: Session = Depends(get_db)):
    latest_point = db.query(GPSPoint).filter(
        GPSPoint.vehicle_id == vehicle_id
    ).order_by(GPSPoint.timestamp.desc()).first()
    
    if not latest_point:
        raise HTTPException(status_code=404, detail="No GPS data found")
    
    return latest_point


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total_vehicles = db.query(func.count(Vehicle.id)).scalar()
    total_points = db.query(func.count(GPSPoint.id)).scalar()
    
    point_counts = db.query(
        GPSPoint.vehicle_id,
        func.count(GPSPoint.id).label('count')
    ).group_by(GPSPoint.vehicle_id).all()
    
    return {
        "total_vehicles": total_vehicles,
        "total_gps_points": total_points,
        "points_per_vehicle": {pc.vehicle_id: pc.count for pc in point_counts}
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
