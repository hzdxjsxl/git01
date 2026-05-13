import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="not-found">
      <h2>404</h2>
      <p>页面不存在</p>
      <Link to="/" className="back-link">返回首页</Link>
    </div>
  );
}
