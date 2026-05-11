import React from 'react';
import ReactDOM from 'react-dom/client';
import { EditorBoard } from './components/EditorBoard';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="app-container">
      <h1 className="text-2xl font-bold mb-4">块级文档编辑器</h1>
      <EditorBoard />
    </div>
  </React.StrictMode>
);