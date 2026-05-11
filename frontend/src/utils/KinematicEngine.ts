const EARTH_RADIUS_KM = 6371.0;

export interface FlightData {
  id: string;
  flight_number: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed_kmh: number;
}

export interface InferredPosition {
  id: string;
  flight_number: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed_kmh: number;
  inferred: boolean;
}

interface TrackedPlane {
  id: string;
  flight_number: string;
  lastKnownLat: number;
  lastKnownLon: number;
  lastKnownHeading: number;
  lastKnownSpeedKmh: number;
  lastServerTimestamp: number;
}

export class KinematicEngine {
  private planes: Map<string, TrackedPlane> = new Map();
  private lastServerTimestamp: number = 0;

  updateFromServer(data: FlightData[], serverTimestamp: number): void {
    this.lastServerTimestamp = serverTimestamp;
    
    for (const flight of data) {
      this.planes.set(flight.id, {
        id: flight.id,
        flight_number: flight.flight_number,
        lastKnownLat: flight.latitude,
        lastKnownLon: flight.longitude,
        lastKnownHeading: flight.heading,
        lastKnownSpeedKmh: flight.speed_kmh,
        lastServerTimestamp: serverTimestamp,
      });
    }

    const currentIds = new Set(data.map(f => f.id));
    for (const id of this.planes.keys()) {
      if (!currentIds.has(id)) {
        this.planes.delete(id);
      }
    }
  }

  private deadReckon(
    lat: number,
    lon: number,
    heading: number,
    speedKmh: number,
    elapsedSeconds: number
  ): { latitude: number; longitude: number } {
    const speedMs = speedKmh / 3.6;
    const distanceM = speedMs * elapsedSeconds;
    const distanceKm = distanceM / 1000.0;

    const headingRad = (heading * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;

    const angularDistance = distanceKm / EARTH_RADIUS_KM;

    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const sinAngDist = Math.sin(angularDistance);
    const cosAngDist = Math.cos(angularDistance);
    const cosHeading = Math.cos(headingRad);
    const sinHeading = Math.sin(headingRad);

    const newLatRad = Math.asin(
      sinLat * cosAngDist + cosLat * sinAngDist * cosHeading
    );

    const newLonRad =
      Math.atan2(
        sinHeading * sinAngDist * cosLat,
        cosAngDist - sinLat * Math.sin(newLatRad)
      ) + (lon * Math.PI) / 180;

    return {
      latitude: (newLatRad * 180) / Math.PI,
      longitude: (newLonRad * 180) / Math.PI,
    };
  }

  getPositionsAt(currentTime: number): InferredPosition[] {
    const result: InferredPosition[] = [];

    for (const plane of this.planes.values()) {
      const elapsed = currentTime - plane.lastServerTimestamp;

      if (elapsed <= 0) {
        result.push({
          id: plane.id,
          flight_number: plane.flight_number,
          latitude: plane.lastKnownLat,
          longitude: plane.lastKnownLon,
          heading: plane.lastKnownHeading,
          speed_kmh: plane.lastKnownSpeedKmh,
          inferred: false,
        });
      } else {
        const inferred = this.deadReckon(
          plane.lastKnownLat,
          plane.lastKnownLon,
          plane.lastKnownHeading,
          plane.lastKnownSpeedKmh,
          elapsed
        );

        result.push({
          id: plane.id,
          flight_number: plane.flight_number,
          latitude: inferred.latitude,
          longitude: inferred.longitude,
          heading: plane.lastKnownHeading,
          speed_kmh: plane.lastKnownSpeedKmh,
          inferred: true,
        });
      }
    }

    return result;
  }

  getPlaneCount(): number {
    return this.planes.size;
  }

  clear(): void {
    this.planes.clear();
    this.lastServerTimestamp = 0;
  }
}
