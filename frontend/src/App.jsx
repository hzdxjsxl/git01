import React, { useState, useRef, useCallback, useEffect } from 'react';
import DiffViewer from './components/DiffViewer';

const API_BASE = '/api';

function App() {
  const [oldText, setOldText] = useState('');
  const [newText, setNewText] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [isComputing, setIsComputing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [sampleSize, setSampleSize] = useState('large');
  const [backendStatus, setBackendStatus] = useState('unknown');
  
  const workerRef = useRef(null);
  
  useEffect(() => {
    checkBackendHealth();
  }, []);
  
  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();
      if (data.status === 'ok') {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch (err) {
      setBackendStatus('offline');
    }
  };
  
  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('./workers/diffWorker.js', import.meta.url), {
        type: 'module'
      });
    }
    return workerRef.current;
  }, []);
  
  const loadSampleData = async () => {
    setIsLoading(true);
    setError(null);
    setDiffResult(null);
    
    try {
      const response = await fetch(`${API_BASE}/sample-texts?size=${sampleSize}`);
      const data = await response.json();
      
      setOldText(data.oldText);
      setNewText(data.newText);
      setBackendStatus('online');
      
    } catch (err) {
      setError(`无法从后端加载数据: ${err.message}`);
      setBackendStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };
  
  const runDiff = async () => {
    if (!oldText.trim() || !newText.trim()) {
      setError('请先加载或输入两份文本进行比较');
      return;
    }
    
    setIsComputing(true);
    setError(null);
    setProgress({ stage: 'initializing', message: '初始化中...' });
    setDiffResult(null);
    
    try {
      const worker = getWorker();
      
      worker.onmessage = (e) => {
        const { type, payload } = e.data;
        
        switch (type) {
          case 'PROGRESS':
            setProgress(payload);
            break;
            
          case 'DIFF_COMPLETE':
            setDiffResult(payload);
            setProgress(null);
            setIsComputing(false);
            break;
            
          case 'DIFF_ERROR':
            setError(`Diff计算错误: ${payload.message}`);
            setProgress(null);
            setIsComputing(false);
            break;
        }
      };
      
      worker.onerror = (err) => {
        setError(`Worker错误: ${err.message}`);
        setProgress(null);
        setIsComputing(false);
      };
      
      worker.postMessage({
        type: 'COMPUTE_DIFF',
        payload: { oldText, newText }
      });
      
    } catch (err) {
      setError(`启动Diff失败: ${err.message}`);
      setProgress(null);
      setIsComputing(false);
    }
  };
  
  const clearAll = () => {
    setOldText('');
    setNewText('');
    setDiffResult(null);
    setError(null);
    setProgress(null);
  };
  
  const canCompute = !isComputing && oldText.trim() && newText.trim();
  const isReady = oldText.trim() && newText.trim();
  
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Full-Stack Large-Scale Text Diff Tool</h1>
          <p className="subtitle">万行级文本差异比对 - Web Worker + Myers Diff算法</p>
          <div className="status-bar">
            <span className={`status-indicator ${backendStatus}`}>
              后端: {backendStatus === 'online' ? '在线' : backendStatus === 'offline' ? '离线' : '检查中'}
            </span>
          </div>
        </div>
      </header>
      
      <main className="app-main">
        <section className="control-panel">
          <div className="control-group">
            <label>样本数据大小:</label>
            <select 
              value={sampleSize} 
              onChange={(e) => setSampleSize(e.target.value)}
              disabled={isLoading}
            >
              <option value="small">Small (100行)</option>
              <option value="medium">Medium (1000行)</option>
              <option value="large">Large (10000行)</option>
              <option value="xlarge">X-Large (50000行)</option>
            </select>
          </div>
          
          <div className="button-group">
            <button 
              onClick={loadSampleData} 
              disabled={isLoading}
              className="btn btn-secondary"
            >
              {isLoading ? '加载中...' : '从后端加载样本数据'}
            </button>
            
            <button 
              onClick={runDiff} 
              disabled={!canCompute}
              className="btn btn-primary"
            >
              {isComputing ? '计算中...' : '开始比对'}
            </button>
            
            <button 
              onClick={clearAll} 
              disabled={isComputing || isLoading}
              className="btn btn-danger"
            >
              清空
            </button>
          </div>
        </section>
        
        {error && (
          <div className="error-message">
            <strong>错误:</strong> {error}
          </div>
        )}
        
        {isComputing && progress && (
          <div className="progress-indicator">
            <div className="spinner"></div>
            <span>{progress.message}</span>
          </div>
        )}
        
        <section className="input-section">
          <div className="input-panel">
            <div className="panel-header">
              <h3>旧版本文本 (Original)</h3>
              {oldText && (
                <span className="line-count-info">
                  {oldText.split('\n').length.toLocaleString()} 行
                </span>
              )}
            </div>
            <textarea
              value={oldText}
              onChange={(e) => {
                setOldText(e.target.value);
                if (diffResult) setDiffResult(null);
              }}
              placeholder="在此粘贴旧版本文本..."
              disabled={isComputing}
              spellCheck={false}
            />
          </div>
          
          <div className="input-panel">
            <div className="panel-header">
              <h3>新版本文本 (Modified)</h3>
              {newText && (
                <span className="line-count-info">
                  {newText.split('\n').length.toLocaleString()} 行
                </span>
              )}
            </div>
            <textarea
              value={newText}
              onChange={(e) => {
                setNewText(e.target.value);
                if (diffResult) setDiffResult(null);
              }}
              placeholder="在此粘贴新版本文本..."
              disabled={isComputing}
              spellCheck={false}
            />
          </div>
        </section>
        
        <section className="results-section">
          <DiffViewer result={diffResult} />
        </section>
      </main>
      
      <footer className="app-footer">
        <p>全栈Diff工具 v1.0 | 技术栈: Python Flask + React + Vite + Web Workers</p>
      </footer>
    </div>
  );
}

export default App;
