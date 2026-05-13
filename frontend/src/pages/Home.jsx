import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="home-page">
      <h1>物流车队实时轨迹系统</h1>
      <p>基于 React + Leaflet 的海量 GPS 轨迹可视化平台</p>
      
      {stats && (
        <div style={{ marginTop: '16px', textAlign: 'center', opacity: 0.9 }}>
          <p>车辆总数: <strong>{stats.total_vehicles}</strong></p>
          <p>GPS 轨迹点总数: <strong>{stats.total_gps_points?.toLocaleString()}</strong></p>
        </div>
      )}

      <div className="home-links">
        <Link to="/vehicles">查看车辆列表</Link>
      </div>

      <div style={{ marginTop: '32px', padding: '24px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', maxWidth: '600px' }}>
        <h3 style={{ marginBottom: '16px' }}>核心技术特性</h3>
        <ul style={{ listStyle: 'none', textAlign: 'left', lineHeight: '2' }}>
          <li>✅ Python FastAPI 后端，高效查询海量 GPS 数据</li>
          <li>✅ 前端手写 Douglas-Peucker 算法实现轨迹抽稀</li>
          <li>✅ 支持地理距离计算，确保抽稀准确性</li>
          <li>✅ 实时调整抽稀参数，对比可视化效果</li>
          <li>✅ Leaflet 地图平滑渲染数万条轨迹</li>
        </ul>
      </div>
    </div>
  );
}
