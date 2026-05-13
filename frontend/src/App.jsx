import React from 'react';
import { NavLink } from 'react-router-dom';
import Router from './router/index.js';

function App() {
  return (
    <div className="app-container">
      <header className="header">
        <h1>🚚 物流车队实时轨迹系统</h1>
        <nav className="nav-links">
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            首页
          </NavLink>
          <NavLink 
            to="/vehicles" 
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            车辆列表
          </NavLink>
        </nav>
      </header>
      <main className="content">
        <Router />
      </main>
    </div>
  );
}

export default App;
