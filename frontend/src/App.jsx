import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Point,
  Rectangle,
  QuadTree,
  zoomToClusterLevel,
  getClusterSize,
  getColorByCount
} from './utils/QuadTree';

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const heatLayerRef = useRef(null);
  const quadTreeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState('正在准备地图...');
  const [stats, setStats] = useState({
    totalPoints: 0,
    visibleClusters: 0,
    currentZoom: 0
  });

  useEffect(() => {
    const map = L.map(mapContainerRef.current, {
      center: [35, 108],
      zoom: 4,
      minZoom: 2,
      maxZoom: 12
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    mapRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);

    const buildQuadTree = async (cases) => {
      setLoadingProgress('构建四叉树索引...');
      
      await new Promise(resolve => setTimeout(resolve, 50));

      const boundary = new Rectangle(104.25, 35.75, 61.5, 35.5);
      const qt = new QuadTree(boundary, 16);

      const batchSize = 50000;
      for (let i = 0; i < cases.length; i += batchSize) {
        const batch = cases.slice(i, i + batchSize);
        for (const c of batch) {
          qt.insert(new Point(c[0], c[1], c[2]));
        }
        setLoadingProgress(`构建四叉树索引... ${Math.min(100, Math.round(((i + batchSize) / cases.length) * 100))}%`);
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      quadTreeRef.current = qt;
      return qt;
    };

    const fetchData = async () => {
      try {
        setLoadingProgress('从服务器获取病例数据...');
        const response = await fetch('/api/cases');
        const cases = await response.json();
        
        setLoadingProgress(`获取到 ${cases.length.toLocaleString()} 条病例数据`);
        await new Promise(resolve => setTimeout(resolve, 500));

        const qt = await buildQuadTree(cases);
        
        setLoadingProgress('准备渲染...');
        await new Promise(resolve => setTimeout(resolve, 200));

        setStats(prev => ({ ...prev, totalPoints: cases.length }));
        
        updateClusters(map, qt);
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setLoadingProgress('加载失败，请确保后端服务器已启动');
      }
    };

    setTimeout(fetchData, 100);

    const onMoveEnd = () => {
      if (quadTreeRef.current && !loading) {
        updateClusters(map, quadTreeRef.current);
      }
    };

    map.on('moveend', onMoveEnd);
    map.on('zoomend', onMoveEnd);

    return () => {
      map.off('moveend', onMoveEnd);
      map.off('zoomend', onMoveEnd);
      map.remove();
    };
  }, [loading]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} className="map-container" />

      <div className="controls">
        <h1>🦠 传染病扩散态势</h1>
        <div className="stat">
          <span className="stat-label">总病例数</span>
          <span className="stat-value">{stats.totalPoints.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">可见聚类数</span>
          <span className="stat-value">{stats.visibleClusters.toLocaleString()}</span>
        </div>
        <div className="stat">
          <span className="stat-label">当前缩放</span>
          <span className="stat-value">{stats.currentZoom.toFixed(1)}</span>
        </div>
      </div>

      <div className="legend">
        <h3>病例密度</h3>
        <div className="legend-item">
          <span className="legend-bubble small"></span>
          <span>1-5 例</span>
        </div>
        <div className="legend-item">
          <span className="legend-bubble medium"></span>
          <span>20-100 例</span>
        </div>
        <div className="legend-item">
          <span className="legend-bubble large"></span>
          <span>100-500 例</span>
        </div>
        <div className="legend-item">
          <span className="legend-bubble huge"></span>
          <span>2000+ 例</span>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <h2>加载中</h2>
          <p>{loadingProgress}</p>
        </div>
      )}
    </div>
  );

  function updateClusters(map, qt) {
    const zoom = map.getZoom();
    const clusterLevel = zoomToClusterLevel(zoom);
    const clusters = qt.getClusters(clusterLevel);

    setStats({
      totalPoints: qt.getCount(),
      visibleClusters: clusters.length,
      currentZoom: zoom
    });

    const layerGroup = layerGroupRef.current;
    if (layerGroup) {
      layerGroup.clearLayers();
    }

    const zoomFactor = Math.max(0.5, Math.min(1.2, (zoom - 2) / 8 + 0.5));

    for (const cluster of clusters) {
      const size = getClusterSize(cluster.count) * zoomFactor;
      const color = getColorByCount(cluster.count);

      if (zoom < 5) {
        const heatOpacity = Math.max(0.3, Math.min(0.8, 0.8 - (zoom - 2) * 0.2));
        const heatRadius = Math.max(10000, 50000 - (zoom - 2) * 8000);
        const heatIntensity = Math.min(1, cluster.count / 1000);
        const heatColor = getHeatColor(cluster.count);

        const heatCircle = L.circle([cluster.lat, cluster.lng], {
          radius: heatRadius,
          color: heatColor,
          fillColor: heatColor,
          fillOpacity: heatOpacity * heatIntensity,
          opacity: 0,
          weight: 0
        });
        layerGroup.addLayer(heatCircle);
      }

      const circleOpacity = zoom < 5 ? 0.6 : 0.85;
      const blur = zoom < 6 ? 8 : 0;

      const marker = L.circleMarker([cluster.lat, cluster.lng], {
        radius: size / 2,
        color: 'rgba(255, 255, 255, 0.4)',
        weight: cluster.count > 100 ? 2 : 1,
        fillColor: color,
        fillOpacity: circleOpacity
      });

      const popupContent = `
        <div style="font-size: 14px;">
          <strong>${cluster.count.toLocaleString()} 例确诊</strong>
          <div style="margin-top: 6px; color: #94a3b8; font-size: 12px;">
            平均确诊天数: ${Math.round(cluster.avgDays)} 天
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      layerGroup.addLayer(marker);

      if (zoom >= 6 && cluster.count > 1) {
        const label = L.divIcon({
          className: 'custom-label',
          html: `<div style="color: white; font-weight: 600; text-shadow: 0 0 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9); font-size: ${Math.max(10, 10 + (zoom - 6) * 0.8)}px; white-space: nowrap; pointer-events: none;">${cluster.count}</div>`,
          iconSize: [30, 20],
          iconAnchor: [15, 10]
        });

        const labelMarker = L.marker([cluster.lat, cluster.lng], {
          icon: label,
          interactive: false
        });
        layerGroup.addLayer(labelMarker);
      }
    }
  }
}

function getHeatColor(count) {
  if (count <= 10) return 'rgba(254, 243, 199, 0.6)';
  if (count <= 50) return 'rgba(253, 224, 71, 0.7)';
  if (count <= 200) return 'rgba(251, 146, 60, 0.75)';
  if (count <= 1000) return 'rgba(249, 115, 22, 0.8)';
  return 'rgba(239, 68, 68, 0.85)';
}

export default App;
