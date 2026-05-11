import asyncio
import json
import random
import math
import uuid
import time
import websockets

TOTAL_PLANES = 50
PUSH_INTERVAL = 5
EARTH_RADIUS_KM = 6371.0
CENTER_LAT = 31.2304
CENTER_LON = 121.4737

_planes = None
_planes_lock = asyncio.Lock()
_last_update = 0
_inited = False

def _gen_planes():
    planes = []
    airlines = [
        "CA", "MU", "CZ", "HU", "ZH", "FM", "SC", "3U",
        "AA", "UA", "DL", "BA", "LH", "AF", "KL", "QF",
        "EK", "EY", "QR", "TK", "SQ", "CX", "NH", "JL"
    ]
    
    for i in range(TOTAL_PLANES):
        airline = random.choice(airlines)
        flight_num = airline + str(random.randint(100, 9999))
        
        angle = random.uniform(0, 2 * math.pi)
        distance_km = random.uniform(5, 150)
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

def _update_pos(plane, dt):
    speed_ms = plane["speed_kmh"] / 3.6
    dist_m = speed_ms * dt
    dist_km = dist_m / 1000.0
    
    heading_rad = plane["heading"] * math.pi / 180
    lat_rad = plane["latitude"] * math.pi / 180
    
    d_lat = (dist_km / EARTH_RADIUS_KM) * (180 / math.pi) * math.cos(heading_rad)
    d_lon = (dist_km / EARTH_RADIUS_KM) * (180 / math.pi) * math.sin(heading_rad) / math.cos(lat_rad)
    
    plane["latitude"] += d_lat
    plane["longitude"] += d_lon
    
    if (abs(plane["latitude"] - CENTER_LAT) > 1.0 or 
        abs(plane["longitude"] - CENTER_LON) > 1.5):
        plane["heading"] = (plane["heading"] + 180 + random.uniform(-30, 30)) % 360
    
    plane["heading"] += random.uniform(-1, 1)
    plane["speed_kmh"] = max(300, min(900, plane["speed_kmh"] + random.uniform(-5, 5)))

async def _get_planes():
    global _planes, _last_update, _inited
    async with _planes_lock:
        if not _inited:
            _planes = _gen_planes()
            _last_update = time.time()
            _inited = True
        else:
            now = time.time()
            dt = now - _last_update
            _last_update = now
            for p in _planes:
                _update_pos(p, dt)
        return [dict(p) for p in _planes]

async def handler(websocket):
    print(f"New connection from {websocket.remote_address}")
    try:
        planes = await _get_planes()
        msg = json.dumps({
            "timestamp": time.time(),
            "interval_seconds": PUSH_INTERVAL,
            "planes": planes
        })
        await websocket.send(msg)
        
        while True:
            await asyncio.sleep(PUSH_INTERVAL)
            planes = await _get_planes()
            msg = json.dumps({
                "timestamp": time.time(),
                "interval_seconds": PUSH_INTERVAL,
                "planes": planes
            })
            await websocket.send(msg)
    except Exception as e:
        print(f"Connection error: {e}")
    finally:
        print(f"Connection closed from {websocket.remote_address}")

async def main():
    print("Starting WebSocket server on ws://localhost:8000/ws/flights/")
    async with websockets.serve(handler, "localhost", 8000):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
