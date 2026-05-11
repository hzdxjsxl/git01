import asyncio
import json
import random
import math
import uuid
import time
from channels.generic.websocket import AsyncWebsocketConsumer

TOTAL_PLANES = 500
PUSH_INTERVAL = 5
EARTH_RADIUS_KM = 6371.0
CENTER_LAT = 31.2304
CENTER_LON = 121.4737

def gen_planes():
    planes = []
    airlines = ["CA", "MU", "CZ", "HU"]
    
    for i in range(TOTAL_PLANES):
        airline = random.choice(airlines)
        flight_num = airline + str(random.randint(100, 999))
        
        angle = random.uniform(0, 2 * math.pi)
        distance_km = random.uniform(5, 50)
        delta_lat = (distance_km / EARTH_RADIUS_KM) * (180 / math.pi)
        delta_lon = (distance_km / EARTH_RADIUS_KM) * (180 / math.pi) / math.cos(CENTER_LAT * math.pi / 180)
        
        lat = CENTER_LAT + delta_lat * math.sin(angle)
        lon = CENTER_LON + delta_lon * math.cos(angle)
        
        heading = random.uniform(0, 360)
        speed_kmh = random.uniform(300, 900)
        
        planes.append({
            "id": str(uuid.uuid4()),
            "flight_number": flight_num,
            "latitude": lat,
            "longitude": lon,
            "heading": heading,
            "speed_kmh": speed_kmh
        })
    return planes

class FlightConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        
        planes = gen_planes()
        last_update = time.time()
        
        msg = json.dumps({
            "timestamp": time.time(),
            "interval_seconds": PUSH_INTERVAL,
            "planes": planes
        })
        await self.send(text_data=msg)
        
        try:
            while True:
                await asyncio.sleep(PUSH_INTERVAL)
                
                now = time.time()
                dt = now - last_update
                last_update = now
                
                for plane in planes:
                    speed_ms = plane["speed_kmh"] / 3.6
                    dist_m = speed_ms * dt
                    dist_km = dist_m / 1000.0
                    
                    heading_rad = plane["heading"] * math.pi / 180
                    lat_rad = plane["latitude"] * math.pi / 180
                    
                    d_lat = (dist_km / EARTH_RADIUS_KM) * (180 / math.pi) * math.cos(heading_rad)
                    d_lon = (dist_km / EARTH_RADIUS_KM) * (180 / math.pi) * math.sin(heading_rad) / math.cos(lat_rad)
                    
                    plane["latitude"] += d_lat
                    plane["longitude"] += d_lon
                    
                    if (abs(plane["latitude"] - CENTER_LAT) > 0.5 or 
                        abs(plane["longitude"] - CENTER_LON) > 0.8):
                        plane["heading"] = (plane["heading"] + 180 + random.uniform(-20, 20)) % 360
                    
                    plane["heading"] += random.uniform(-0.5, 0.5)
                    plane["speed_kmh"] = max(300, min(900, plane["speed_kmh"] + random.uniform(-3, 3)))
                
                msg = json.dumps({
                    "timestamp": time.time(),
                    "interval_seconds": PUSH_INTERVAL,
                    "planes": planes
                })
                await self.send(text_data=msg)
        except Exception:
            pass

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        pass
