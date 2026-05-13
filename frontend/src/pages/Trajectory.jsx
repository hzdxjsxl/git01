import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import L from 'leaflet';
import axios from 'axios';
import { douglasPeucker } from '../utils/douglasPeucker.js';

const TOLERANCE_PRESETS = [
  { label: '极高精度 (5m)', value: 5 },
  { label: '高精度 (10m)', value: 10 },
  { label: '中等 (25m)', value: 25 },
  { label: '较低 (50m)', value: 50 },
  { label: '低精度 (100m)', value: 100 },
  { label: '极低 (200m)', value: 200 },
  { label: '超精简 (500m)', value: 500 },
];

export default function Trajectory() {
  const { vehicleId } = useParams();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const originalLineRef = useRef(null);
  const simplifiedLineRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);

  const [vehicle, setVehicle] = useState(null);
  const [rawPoints, setRawPoints] = useState([]);
  const [simplifiedPoints, setSimplifiedPoints] = useState([]);
  const [tolerance, setTolerance] = useState(25);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showSimplified, setShowSimplified] = useState(true);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    originalCount: 0,
    simplifiedCount: 0,
    fetchTime: 0,
    simplifyTime: 0
  });

  const initMap = useCallback((points) => {
    if (mapRef.current || !points || points.length === 0) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const latLngs = points.map(p => [p.latitude, p.longitude]);
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [50, 50] });

    mapRef.current = map;
  }, []);

  const drawLines = useCallback(() => {
    if (!mapRef.current) return;

    if (originalLineRef.current) {
      mapRef.current.removeLayer(originalLineRef.current);
      originalLineRef.current = null;
    }
    if (simplifiedLineRef.current) {
      mapRef.current.removeLayer(simplifiedLineRef.current);
      simplifiedLineRef.current = null;
    }
    if (startMarkerRef.current) {
      mapRef.current.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      mapRef.current.removeLayer(endMarkerRef.current);
      endMarkerRef.current = null;
    }

    if (showOriginal && rawPoints.length > 1) {
      const latLngs = rawPoints.map(p => [p.latitude, p.longitude]);
      originalLineRef.current = L.polyline(latLngs, {
        color: '#ff4444',
        weight: 3,
        opacity: 0.6,
        interactive: false
      }).addTo(mapRef.current);
    }

    if (showSimplified && simplifiedPoints.length > 1) {
      const latLngs = simplifiedPoints.map(p => [p.latitude, p.longitude]);
      simplifiedLineRef.current = L.polyline(latLngs, {
        color: '#1890ff',
        weight: 3,
        opacity: 0.9,
        interactive: false
      }).addTo(mapRef.current);

      const startPoint = simplifiedPoints[0];
      const endPoint = simplifiedPoints[simplifiedPoints.length - 1];

      const startIcon = L.divIcon({
        className: 'custom-icon',
        html: '<div style="background:#52c41a;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      const endIcon = L.divIcon({
        className: 'custom-icon',
        html: '<div style="background:#ff4d4f;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      startMarkerRef.current = L.marker(
        [startPoint.latitude, startPoint.longitude],
        { icon: startIcon, title: '起点' }
      ).addTo(mapRef.current);

      endMarkerRef.current = L.marker(
        [endPoint.latitude, endPoint.longitude],
        { icon: endIcon, title: '终点' }
      ).addTo(mapRef.current);
    }
  }, [rawPoints, simplifiedPoints, showOriginal, showSimplified]);

  const simplifyAndDraw = useCallback((points, tol) => {
    if (points.length === 0) return;

    const startTime = performance.now();
    const simplified = douglasPeucker(points, tol, true);
    const endTime = performance.now();

    setSimplifiedPoints(simplified);
    setStats(prev => ({
      ...prev,
      simplifiedCount: simplified.length,
      simplifyTime: Math.round(endTime - startTime)
    }));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        const startTime = performance.now();
        
        const [vehicleRes, trajectoryRes] = await Promise.all([
          axios.get(`/api/vehicles/${vehicleId}`),
          axios.get(`/api/trajectory/${vehicleId}`)
        ]);

        const endTime = performance.now();
        const points = trajectoryRes.data.points;

        setVehicle(vehicleRes.data);
        setRawPoints(points);
        setStats(prev => ({
          ...prev,
          originalCount: points.length,
          fetchTime: Math.round(endTime - startTime)
        }));

        initMap(points);
        simplifyAndDraw(points, tolerance);

      } catch (error) {
        console.error('Failed to fetch trajectory:', error);
      } finally {
        setLoading(false);
      }
    };

    if (vehicleId) {
      fetchData();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [vehicleId, initMap]);

  useEffect(() => {
    if (rawPoints.length > 0) {
      simplifyAndDraw(rawPoints, tolerance);
    }
  }, [tolerance, rawPoints, simplifyAndDraw]);

  useEffect(() => {
    drawLines();
  }, [drawLines]);

  const compressionRate = stats.originalCount > 0
    ? ((1 - stats.simplifiedCount / stats.originalCount) * 100).toFixed(1)
    : 0;

  return (
    <div className="trajectory-page">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>车辆 {vehicleId}</h2>
          <p>{vehicle?.plate_number} - {vehicle?.driver_name || '未分配'}</p>
        </div>
        <div className="sidebar-content">
          <div className="control-group">
            <label>抽稀容差 (Tolerance): {tolerance}m</label>
            <input
              type="range"
              min="1"
              max="1000"
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
            />
            <div className="value-display">当前容差: {tolerance} 米</div>
          </div>

          <div className="control-group">
            <label>快速预设</label>
            <select
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
            >
              {TOLERANCE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>显示选项</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal' }}>
                <input
                  type="checkbox"
                  checked={showOriginal}
                  onChange={(e) => setShowOriginal(e.target.checked)}
                />
                显示原始轨迹 (红色)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal' }}>
                <input
                  type="checkbox"
                  checked={showSimplified}
                  onChange={(e) => setShowSimplified(e.target.checked)}
                />
                显示抽稀后轨迹 (蓝色)
              </label>
            </div>
          </div>

          <div className="stats-panel">
            <h3>📊 性能统计</h3>
            <div className="stat-item">
              <span className="stat-label">原始点数</span>
              <span className="stat-value">{stats.originalCount.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">抽稀后点数</span>
              <span className="stat-value">{stats.simplifiedCount.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">压缩率</span>
              <span className="stat-value" style={{ color: compressionRate > 50 ? '#52c41a' : '#1890ff' }}>
                {compressionRate}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">后端查询耗时</span>
              <span className="time-display">{stats.fetchTime} ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">前端抽稀耗时</span>
              <span className="time-display">{stats.simplifyTime} ms</span>
            </div>
          </div>
        </div>
      </div>

      <div className="map-container" ref={mapContainerRef}>
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <div className="loading-text">正在加载数万 GPS 轨迹点...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
