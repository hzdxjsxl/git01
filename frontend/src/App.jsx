import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  Point,
  Rectangle,
  QuadTree,
  zoomToClusterLevel,
  getClusterSize,
  getColorByCount
} from './utils/QuadTree';

mapboxgl.accessToken = 'pk.eyJ1IjoicHVibGljLXRlc3RlciIsImEiOiJja210bnV3OGgwM2lhMnBwNjR3dDQ2bmV0In0.fake-token';

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const quadTreeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState('正在准备地图...');
  const [stats, setStats] = useState({
    totalPoints: 0,
    visibleClusters: 0,
    currentZoom: 0
  });

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [108, 35],
      zoom: 4,
      minZoom: 2,
      maxZoom: 12
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    mapRef.current = map;

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

    map.on('load', fetchData);

    const onMoveEnd = () => {
      if (quadTreeRef.current && !loading) {
        updateClusters(map, quadTreeRef.current);
      }
    };

    map.on('moveend', onMoveEnd);
    map.on('zoomend', onMoveEnd);

    return () => {
      map.off('load', fetchData);
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

    const geojson = {
      type: 'FeatureCollection',
      features: clusters.map((cluster) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [cluster.lng, cluster.lat]
        },
        properties: {
          count: cluster.count,
          avgDays: Math.round(cluster.avgDays),
          size: getClusterSize(cluster.count),
          color: getColorByCount(cluster.count)
        }
      }))
    };

    const sourceId = 'infection-clusters';
    const circleLayerId = 'infection-circles';
    const labelLayerId = 'infection-labels';
    const heatLayerId = 'infection-heat';

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
        buffer: 64
      });

      map.addLayer({
        id: heatLayerId,
        type: 'heatmap',
        source: sourceId,
        maxzoom: 12,
        paint: {
          'heatmap-weight': [
            'interpolate',
            ['exponential', 0.5],
            ['get', 'count'],
            1, 0.1,
            100, 0.5,
            1000, 1
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            12, 3
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(254, 243, 199, 0)',
            0.1, 'rgba(254, 243, 199, 0.3)',
            0.2, 'rgba(253, 224, 71, 0.4)',
            0.4, 'rgba(251, 146, 60, 0.5)',
            0.6, 'rgba(249, 115, 22, 0.6)',
            0.8, 'rgba(239, 68, 68, 0.7)',
            1, 'rgba(220, 38, 38, 0.8)'
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 30,
            12, 60
          ],
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 0.8,
            8, 0.4,
            12, 0
          ]
        }
      });

      map.addLayer({
        id: circleLayerId,
        type: 'circle',
        source: sourceId,
        minzoom: 4,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, ['*', 0.6, ['get', 'size']],
            12, ['get', 'size']
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 0.6,
            8, 0.8
          ],
          'circle-stroke-width': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            1, 1,
            1000, 2
          ],
          'circle-stroke-color': 'rgba(255, 255, 255, 0.4)',
          'circle-blur': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 0.5,
            8, 0.2
          ]
        }
      });

      map.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: sourceId,
        minzoom: 6,
        layout: {
          'text-field': [
            'case',
            ['>', ['get', 'count'], 1],
            ['to-string', ['get', 'count']],
            ''
          ],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 10,
            12, 14
          ],
          'text-anchor': 'center',
          'text-ignore-placement': true,
          'text-allow-overlap': true
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0, 0, 0, 0.7)',
          'text-halo-width': 1.5
        }
      });

      map.on('click', circleLayerId, (e) => {
        const feature = e.features[0];
        const coordinates = feature.geometry.coordinates.slice();
        const count = feature.properties.count;
        const avgDays = feature.properties.avgDays;

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(
            `<div style="font-size: 14px;">
              <strong>${count.toLocaleString()} 例确诊</strong>
              <div style="margin-top: 6px; color: #94a3b8; font-size: 12px;">
                平均确诊天数: ${avgDays} 天
              </div>
            </div>`
          )
          .addTo(map);
      });

      map.getCanvas().style.cursor = 'pointer';
    } else {
      map.getSource(sourceId).setData(geojson);
    }
  }
}

export default App;
