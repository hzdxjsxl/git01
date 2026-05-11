import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const quadTreeRef = useRef(null);
  const lastClusterLevelRef = useRef(-1);
  const updateTimeoutRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState('正在准备地图...');
  const [stats, setStats] = useState({
    totalPoints: 0,
    visibleClusters: 0,
    currentZoom: 0
  });

  const updateClustersOptimized = useCallback(() => {
    const map = mapRef.current;
    const qt = quadTreeRef.current;
    const layerGroup = layerGroupRef.current;

    if (!map || !qt || !layerGroup) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const t0 = performance.now();

      const zoom = map.getZoom();
      const clusterLevel = zoomToClusterLevel(zoom);

      const t1 = performance.now();
      const clusters = qt.getClustersFast(clusterLevel);
      const t2 = performance.now();

      setStats({
        totalPoints: qt.getCount(),
        visibleClusters: clusters.length,
        currentZoom: zoom
      });

      layerGroup.clearLayers();

      const zoomFactor = Math.max(0.5, Math.min(1.2, (zoom - 2) / 8 + 0.5));
      const showHeat = zoom < 5;
      const showLabels = zoom >= 6;

      const popupTemplate = (count, avgDays) => `
        <div style="font-size: 14px;">
          <strong>${count.toLocaleString()} 例确诊</strong>
          <div style="margin-top: 6px; color: #94a3b8; font-size: 12px;">
            平均确诊天数: ${Math.round(avgDays)} 天
          </div>
        </div>
      `;

      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        const count = cluster.count;
        const size = getClusterSize(count) * zoomFactor;
        const color = getColorByCount(count);
        const lat = cluster.lat;
        const lng = cluster.lng;

        if (showHeat && count > 10) {
          const heatOpacity = Math.max(0.3, Math.min(0.8, 0.8 - (zoom - 2) * 0.2));
          const heatRadius = Math.max(10000, 50000 - (zoom - 2) * 8000);
          const heatIntensity = Math.min(1, count / 1000);
          const heatColor = getHeatColor(count);

          layerGroup.addLayer(L.circle([lat, lng], {
            radius: heatRadius,
            color: heatColor,
            fillColor: heatColor,
            fillOpacity: heatOpacity * heatIntensity,
            opacity: 0,
            weight: 0,
            interactive: false
          }));
        }

        const circleOpacity = zoom < 5 ? 0.6 : 0.85;
        const marker = L.circleMarker([lat, lng], {
          radius: size / 2,
          color: 'rgba(255, 255, 255, 0.4)',
          weight: count > 100 ? 2 : 1,
          fillColor: color,
          fillOpacity: circleOpacity
        });

        marker.bindPopup(popupTemplate(count, cluster.avgDays));
        layerGroup.addLayer(marker);

        if (showLabels && count > 1) {
          const fontSize = Math.max(10, 10 + (zoom - 6) * 0.8);
          const label = L.divIcon({
            className: 'custom-label',
            html: `<div style="color: white; font-weight: 600; text-shadow: 0 0 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9); font-size: ${fontSize}px; white-space: nowrap; pointer-events: none;">${count}</div>`,
            iconSize: [30, 20],
            iconAnchor: [15, 10]
          });

          layerGroup.addLayer(L.marker([lat, lng], {
            icon: label,
            interactive: false
          }));
        }
      }

      const t3 = performance.now();
      console.log(`[Cluster] Level=${clusterLevel}, Clusters=${clusters.length}, QT=${(t2 - t1).toFixed(2)}ms, Render=${(t3 - t2).toFixed(2)}ms, Total=${(t3 - t0).toFixed(2)}ms`);

      lastClusterLevelRef.current = clusterLevel;
      animationFrameRef.current = null;
    });
  }, []);

  const scheduleUpdate = useCallback(() => {
    if (!quadTreeRef.current) return;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      updateClustersOptimized();
    }, 80);
  }, [updateClustersOptimized]);

  useEffect(() => {
    const map = L.map(mapContainerRef.current, {
      center: [35, 108],
      zoom: 4,
      minZoom: 2,
      maxZoom: 12,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
      updateWhenZooming: false,
      updateWhenIdle: true
    }).addTo(map);

    mapRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);

    const buildQuadTree = async (cases) => {
      setLoadingProgress('构建四叉树索引...');
      await new Promise(resolve => setTimeout(resolve, 50));

      const boundary = new Rectangle(104.25, 35.75, 61.5, 35.5);
      const qt = new QuadTree(boundary, 32);

      const batchSize = 100000;
      for (let i = 0; i < cases.length; i += batchSize) {
        const end = Math.min(i + batchSize, cases.length);
        for (let j = i; j < end; j++) {
          const c = cases[j];
          qt.insert(new Point(c[0], c[1], c[2]));
        }
        setLoadingProgress(`构建四叉树索引... ${Math.min(100, Math.round((end / cases.length) * 100))}%`);
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
        await new Promise(resolve => setTimeout(resolve, 300));

        const qt = await buildQuadTree(cases);

        setLoadingProgress('预处理缓存...');
        for (let level = 1; level <= 6; level++) {
          qt.getClustersFast(level);
        }

        setStats(prev => ({ ...prev, totalPoints: cases.length }));
        updateClustersOptimized();

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setLoadingProgress('加载失败，请确保后端服务器已启动');
      }
    };

    setTimeout(fetchData, 100);

    map.on('moveend', scheduleUpdate);
    map.on('zoomend', scheduleUpdate);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      map.off('moveend', scheduleUpdate);
      map.off('zoomend', scheduleUpdate);
      map.remove();
    };
  }, [scheduleUpdate, updateClustersOptimized]);

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
}

function getHeatColor(count) {
  if (count <= 10) return 'rgba(254, 243, 199, 0.6)';
  if (count <= 50) return 'rgba(253, 224, 71, 0.7)';
  if (count <= 200) return 'rgba(251, 146, 60, 0.75)';
  if (count <= 1000) return 'rgba(249, 115, 22, 0.8)';
  return 'rgba(239, 68, 68, 0.85)';
}

export default App;
