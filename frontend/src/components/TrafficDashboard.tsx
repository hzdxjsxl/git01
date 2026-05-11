import { useEffect, useRef, useState } from 'react';
import { QuadTree, Vehicle } from '../utils/QuadTree';
import { VehicleData, CollisionPair } from '../types/vehicle';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;
const VEHICLE_SIZE = 20;
const COLLISION_TIME_THRESHOLD = 3;
const SEARCH_RADIUS = 150;

function predictCollision(
  v1: VehicleData,
  v2: VehicleData
): { collides: boolean; time: number; pos1: { x: number; y: number }; pos2: { x: number; y: number } } {
  const headingRad1 = (v1.heading * Math.PI) / 180;
  const headingRad2 = (v2.heading * Math.PI) / 180;

  const vx1 = v1.speed * 2 * Math.cos(headingRad1);
  const vy1 = v1.speed * 2 * Math.sin(headingRad1);
  const vx2 = v2.speed * 2 * Math.cos(headingRad2);
  const vy2 = v2.speed * 2 * Math.sin(headingRad2);

  const relVx = vx1 - vx2;
  const relVy = vy1 - vy2;
  const relX = v1.x - v2.x;
  const relY = v1.y - v2.y;

  const distSquared = relX * relX + relY * relY;
  const radius = VEHICLE_SIZE * 1.5;
  const radiusSquared = radius * radius;

  if (distSquared <= radiusSquared) {
    return {
      collides: true,
      time: 0,
      pos1: { x: v1.x, y: v1.y },
      pos2: { x: v2.x, y: v2.y },
    };
  }

  const a = relVx * relVx + relVy * relVy;
  const b = 2 * (relX * relVx + relY * relVy);
  const c = distSquared - radiusSquared;

  const discriminant = b * b - 4 * a * c;

  if (a === 0 || discriminant < 0) {
    return { collides: false, time: Infinity, pos1: { x: 0, y: 0 }, pos2: { x: 0, y: 0 } };
  }

  const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
  const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

  const t = t1 > 0 ? t1 : t2 > 0 ? t2 : -1;

  if (t < 0 || t > COLLISION_TIME_THRESHOLD) {
    return { collides: false, time: Infinity, pos1: { x: 0, y: 0 }, pos2: { x: 0, y: 0 } };
  }

  return {
    collides: true,
    time: t,
    pos1: { x: v1.x + vx1 * t, y: v1.y + vy1 * t },
    pos2: { x: v2.x + vx2 * t, y: v2.y + vy2 * t },
  };
}

function detectCollisions(vehicles: VehicleData[]): CollisionPair[] {
  const quadTree = new QuadTree({ x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

  for (const v of vehicles) {
    quadTree.insert(v as Vehicle);
  }

  const collisionPairs: CollisionPair[] = [];
  const checked = new Set<string>();

  for (const v1 of vehicles) {
    const nearby = quadTree.retrieve(v1 as Vehicle, SEARCH_RADIUS);

    for (const v2 of nearby) {
      if (v1.id === v2.id) continue;

      const pairKey = [Math.min(v1.id, v2.id), Math.max(v1.id, v2.id)].join('-');
      if (checked.has(pairKey)) continue;
      checked.add(pairKey);

      const result = predictCollision(v1, v2 as VehicleData);
      if (result.collides) {
        collisionPairs.push({
          vehicle1Id: v1.id,
          vehicle2Id: v2.id,
          timeToCollision: result.time,
          projectedPosition1: result.pos1,
          projectedPosition2: result.pos2,
        });
      }
    }
  }

  return collisionPairs;
}

function drawVehicles(
  ctx: CanvasRenderingContext2D,
  vehicles: VehicleData[],
  collisionVehicles: Set<number>
) {
  for (const v of vehicles) {
    const headingRad = (v.heading * Math.PI) / 180;

    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(headingRad);

    if (collisionVehicles.has(v.id)) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(-VEHICLE_SIZE / 2 - 5, -VEHICLE_SIZE / 4 - 5, VEHICLE_SIZE + 10, VEHICLE_SIZE / 2 + 10);

      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(-VEHICLE_SIZE / 2 - 5, -VEHICLE_SIZE / 4 - 5, VEHICLE_SIZE + 10, VEHICLE_SIZE / 2 + 10);
    }

    ctx.fillStyle = collisionVehicles.has(v.id) ? '#ff4444' : '#00ff88';
    ctx.fillRect(-VEHICLE_SIZE / 2, -VEHICLE_SIZE / 4, VEHICLE_SIZE, VEHICLE_SIZE / 2);

    ctx.strokeStyle = collisionVehicles.has(v.id) ? '#ff6666' : '#00cc66';
    ctx.lineWidth = 1;
    ctx.strokeRect(-VEHICLE_SIZE / 2, -VEHICLE_SIZE / 4, VEHICLE_SIZE, VEHICLE_SIZE / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(VEHICLE_SIZE / 4, -VEHICLE_SIZE / 8, VEHICLE_SIZE / 6, VEHICLE_SIZE / 4);

    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`#${v.id}`, v.x, v.y - VEHICLE_SIZE / 2 - 5);
  }
}

function drawCollisionLines(ctx: CanvasRenderingContext2D, collisions: CollisionPair[], vehicles: Map<number, VehicleData>) {
  for (const c of collisions) {
    const v1 = vehicles.get(c.vehicle1Id);
    const v2 = vehicles.get(c.vehicle2Id);

    if (v1 && v2) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(v1.x, v1.y);
      ctx.lineTo(v2.x, v2.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const midX = (v1.x + v2.x) / 2;
      const midY = (v1.y + v2.y) / 2;

      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${c.timeToCollision.toFixed(1)}s`, midX, midY - 10);
    }
  }
}

function drawIntersection(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#2a2a4e';
  ctx.fillRect(0, CANVAS_HEIGHT / 2 - 60, CANVAS_WIDTH, 120);
  ctx.fillRect(CANVAS_WIDTH / 2 - 60, 0, 120, CANVAS_HEIGHT);

  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 10]);

  ctx.beginPath();
  ctx.moveTo(0, CANVAS_HEIGHT / 2);
  ctx.lineTo(CANVAS_WIDTH / 2 - 60, CANVAS_HEIGHT / 2);
  ctx.moveTo(CANVAS_WIDTH / 2 + 60, CANVAS_HEIGHT / 2);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
  ctx.moveTo(CANVAS_WIDTH / 2, 0);
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
  ctx.moveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

export function TrafficDashboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vehiclesRef = useRef<VehicleData[]>([]);
  const collisionCountRef = useRef(0);
  const [connected, setConnected] = useState(false);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [collisionCount, setCollisionCount] = useState(0);

  useEffect(() => {
    const wsUrl = 'ws://localhost:8081';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data: VehicleData[] = JSON.parse(event.data);
        vehiclesRef.current = data;
        setVehicleCount(data.length);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastStatsUpdate = 0;

    const render = (timestamp: number) => {
      const vehicles = vehiclesRef.current;
      const collisions = detectCollisions(vehicles);
      const collisionVehicles = new Set<number>();

      for (const c of collisions) {
        collisionVehicles.add(c.vehicle1Id);
        collisionVehicles.add(c.vehicle2Id);
      }

      collisionCountRef.current = collisions.length;

      if (timestamp - lastStatsUpdate > 500) {
        setCollisionCount(collisions.length);
        lastStatsUpdate = timestamp;
      }

      const vehicleMap = new Map<number, VehicleData>();
      for (const v of vehicles) {
        vehicleMap.set(v.id, v);
      }

      drawIntersection(ctx);
      drawVehicles(ctx, vehicles, collisionVehicles);
      drawCollisionLines(ctx, collisions, vehicleMap);

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>路口交通推演大盘</h1>
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>连接状态</span>
            <span style={{ ...styles.statValue, color: connected ? '#00ff88' : '#ff4444' }}>
              {connected ? '已连接' : '断开'}
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>车辆数量</span>
            <span style={styles.statValue}>{vehicleCount}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>潜在碰撞</span>
            <span style={{ ...styles.statValue, color: collisionCount > 0 ? '#ff4444' : '#00ff88' }}>
              {collisionCount}
            </span>
          </div>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={styles.canvas}
      />
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, backgroundColor: '#00ff88' }}></div>
          <span>正常车辆</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, backgroundColor: '#ff0000' }}></div>
          <span>潜在碰撞（3秒内）</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '20px',
  },
  header: {
    width: '1200px',
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: 'bold' as const,
    margin: 0,
    letterSpacing: '2px',
  },
  stats: {
    display: 'flex',
    gap: '30px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
  },
  statLabel: {
    color: '#888888',
    fontSize: '12px',
  },
  statValue: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold' as const,
  },
  canvas: {
    border: '2px solid #333366',
    borderRadius: '8px',
    boxShadow: '0 0 30px rgba(0, 255, 136, 0.1)',
  },
  legend: {
    display: 'flex',
    gap: '30px',
    color: '#ffffff',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  legendBox: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
  },
};
