import os
import sys
import random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal, Base
from app.models import GPSPoint, Vehicle


def generate_realistic_trajectory(start_lat, start_lng, num_points, start_time):
    points = []
    current_lat = start_lat
    current_lng = start_lng
    current_time = start_time

    for i in range(num_points):
        lat_change = random.uniform(-0.0008, 0.0008) + random.choice([0, 0, 0.0005, -0.0005])
        lng_change = random.uniform(-0.001, 0.001) + random.choice([0, 0, 0.0008, -0.0008])
        
        current_lat += lat_change
        current_lng += lng_change
        
        current_lat = max(-90, min(90, current_lat))
        current_lng = max(-180, min(180, current_lng))
        
        speed = random.uniform(30, 100)
        direction = random.uniform(0, 360)
        
        points.append({
            'latitude': round(current_lat, 6),
            'longitude': round(current_lng, 6),
            'timestamp': current_time,
            'speed': round(speed, 1),
            'direction': round(direction, 1)
        })
        
        current_time += timedelta(seconds=random.choice([1, 2, 3]))
    
    return points


def init_database():
    print("Creating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        print("Creating test vehicles...")
        vehicles = [
            Vehicle(vehicle_id="V001", plate_number="京A12345", driver_name="张三", status="running"),
            Vehicle(vehicle_id="V002", plate_number="京B67890", driver_name="李四", status="running"),
            Vehicle(vehicle_id="V003", plate_number="京C54321", driver_name="王五", status="idle"),
            Vehicle(vehicle_id="V004", plate_number="京D98765", driver_name="赵六", status="running"),
            Vehicle(vehicle_id="V005", plate_number="京E24680", driver_name="钱七", status="running"),
        ]
        db.add_all(vehicles)
        db.commit()
        
        print("Generating GPS trajectory data...")
        
        base_locations = [
            (39.9042, 116.4074),
            (39.9542, 116.3074),
            (39.8542, 116.5074),
            (40.0042, 116.4574),
            (39.9242, 116.3574),
        ]
        
        total_points_generated = 0
        points_per_vehicle = [6000, 7000, 5000, 8000, 7500]
        
        for idx, vehicle in enumerate(vehicles):
            num_points = points_per_vehicle[idx]
            start_lat, start_lng = base_locations[idx]
            start_time = datetime.now() - timedelta(hours=24)
            
            print(f"  Vehicle {vehicle.vehicle_id}: generating {num_points} points...")
            
            trajectory = generate_realistic_trajectory(
                start_lat, start_lng, num_points, start_time
            )
            
            gps_points = [
                GPSPoint(
                    vehicle_id=vehicle.vehicle_id,
                    latitude=p['latitude'],
                    longitude=p['longitude'],
                    timestamp=p['timestamp'],
                    speed=p['speed'],
                    direction=p['direction']
                )
                for p in trajectory
            ]
            
            db.bulk_save_objects(gps_points)
            total_points_generated += num_points
        
        db.commit()
        
        print(f"\nSuccess! Total GPS points generated: {total_points_generated}")
        print("Database initialization complete.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
