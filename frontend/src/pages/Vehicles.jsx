import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesRes, statsRes] = await Promise.all([
          axios.get('/api/vehicles'),
          axios.get('/api/stats')
        ]);
        setVehicles(vehiclesRes.data);
        setStats(statsRes.data.points_per_vehicle || {});
      } catch (error) {
        console.error('Failed to fetch vehicles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="vehicles-page">
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <div className="loading-text">加载车辆数据中...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vehicles-page">
      <div className="vehicles-header">
        <h2>车队车辆列表</h2>
        <p>点击车辆卡片查看其详细轨迹</p>
      </div>
      <div className="vehicles-list">
        {vehicles.map((vehicle) => (
          <Link
            key={vehicle.vehicle_id}
            to={`/trajectory/${vehicle.vehicle_id}`}
            className="vehicle-card"
          >
            <div className="vehicle-card-header">
              <h3>{vehicle.vehicle_id}</h3>
              <span className={`vehicle-status status-${vehicle.status}`}>
                {vehicle.status === 'running' ? '运行中' : '空闲'}
              </span>
            </div>
            <div className="vehicle-info">
              <p>
                <strong>车牌:</strong> {vehicle.plate_number}
              </p>
              <p>
                <strong>司机:</strong> {vehicle.driver_name || '未分配'}
              </p>
              <p>
                <strong>轨迹点:</strong> {stats[vehicle.vehicle_id]?.toLocaleString() || 0} 个
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
