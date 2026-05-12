import { useState, useCallback, useEffect, useRef } from 'react';
import { SqlValidator } from './utils/SqlValidator';
import { DatabaseWorkerManager, QueryResult } from './utils/DatabaseWorker';
import { ResultTable } from './components/ResultTable';

const DEFAULT_SQL = `-- 创建测试表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  age INTEGER,
  created_at TEXT
);

-- 插入一些测试数据
INSERT INTO users (name, email, age, created_at) VALUES 
  ('张三', 'zhangsan@example.com', 25, '2024-01-15'),
  ('李四', 'lisi@example.com', 30, '2024-02-20'),
  ('王五', 'wangwu@example.com', 28, '2024-03-10'),
  ('赵六', 'zhaoliu@example.com', 35, '2024-04-05');

-- 查询数据
SELECT * FROM users;`;

const BIG_DATA_SQL = `-- 创建大数据测试表
CREATE TABLE big_data (
  id INTEGER PRIMARY KEY,
  value TEXT,
  random_num INTEGER,
  created_at TEXT
);

-- 生成 10 万条测试数据
WITH RECURSIVE
  cnt(x) AS (
    SELECT 0
    UNION ALL
    SELECT x+1 FROM cnt
    WHERE x < 99999
  )
INSERT INTO big_data (id, value, random_num, created_at)
SELECT 
  x,
  'Item ' || x,
  ABS(RANDOM() % 1000),
  date('2024-01-01', '+' || (x % 365) || ' days')
FROM cnt;

-- 查询所有数据
SELECT * FROM big_data;`;

export default function App() {
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [validation, setValidation] = useState<ReturnType<typeof SqlValidator.validate> | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const dbWorkerRef = useRef<DatabaseWorkerManager | null>(null);

  useEffect(() => {
    dbWorkerRef.current = new DatabaseWorkerManager({
      onReady: () => {
        setIsDbReady(true);
        setMessage('数据库已就绪');
        setTimeout(() => setMessage(null), 2000);
      },
      onResult: (queryResults) => {
        setResults(queryResults);
        setIsExecuting(false);
        setError(null);
      },
      onError: (err) => {
        setError(err);
        setIsExecuting(false);
        setResults([]);
      },
      onExport: (data) => {
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'database.sqlite';
        a.click();
        URL.revokeObjectURL(url);
      }
    });
    
    dbWorkerRef.current.init();

    return () => {
      dbWorkerRef.current?.close();
    };
  }, []);

  const handleValidate = useCallback((value: string) => {
    const result = SqlValidator.validate(value);
    setValidation(result);
    return result;
  }, []);

  const handleExecute = useCallback(() => {
    if (!dbWorkerRef.current || !isDbReady) {
      setError('数据库尚未就绪');
      return;
    }

    const validationResult = handleValidate(sql);
    if (!validationResult.isValid) {
      setError(validationResult.errors.join('\n'));
      return;
    }

    setIsExecuting(true);
    setError(null);
    dbWorkerRef.current.execute(sql);
  }, [sql, isDbReady, handleValidate]);

  const handleExport = useCallback(() => {
    dbWorkerRef.current?.export();
  }, []);

  const handleLoadBigData = useCallback(() => {
    setSql(BIG_DATA_SQL);
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#f8f9fa'
    }}>
      <header style={{
        background: '#1a73e8',
        color: 'white',
        padding: '12px 24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>本地 SQL 客户端</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%',
                background: isDbReady ? '#34a853' : '#ea4335',
                animation: isDbReady ? 'none' : 'pulse 1.5s infinite'
              }}></span>
              {isDbReady ? '已连接' : '连接中...'}
            </span>
            <button
              onClick={handleExport}
              disabled={!isDbReady}
              style={{
                padding: '6px 16px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: '4px',
                cursor: isDbReady ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              导出数据库
            </button>
          </div>
        </div>
      </header>

      {message && (
        <div style={{
          background: '#e6f4ea',
          color: '#137333',
          padding: '8px 24px',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{
          background: '#fce8e6',
          color: '#a50e0e',
          padding: '8px 24px',
          fontSize: '14px',
          whiteSpace: 'pre-line'
        }}>
          错误: {error}
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden' 
      }}>
        <div style={{ 
          flex: 1, 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>SQL 编辑器</h2>
            <button
              onClick={handleLoadBigData}
              style={{
                padding: '4px 12px',
                background: '#fff',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#1a73e8'
              }}
            >
              加载 10 万条测试数据
            </button>
          </div>
          
          <textarea
            value={sql}
            onChange={(e) => {
              setSql(e.target.value);
              handleValidate(e.target.value);
            }}
            placeholder="输入 SQL 语句..."
            style={{
              flex: 1,
              padding: '16px',
              fontSize: '14px',
              fontFamily: '"SF Mono", Monaco, "Courier New", monospace',
              border: '1px solid #dadce0',
              borderRadius: '8px',
              resize: 'none',
              background: 'white',
              minHeight: '200px',
              lineHeight: '1.6'
            }}
          />

          <div style={{ marginTop: '12px' }}>
            {validation && (
              <>
                {validation.warnings.length > 0 && (
                  <div style={{ 
                    background: '#fef6e4', 
                    color: '#b37d00', 
                    padding: '8px 12px', 
                    borderRadius: '4px', 
                    fontSize: '13px',
                    marginBottom: '8px'
                  }}>
                    ⚠️ {validation.warnings.join(' | ')}
                  </div>
                )}
                {validation.isValid && sql.trim().length > 0 && (
                  <div style={{ 
                    background: '#e6f4ea', 
                    color: '#137333', 
                    padding: '8px 12px', 
                    borderRadius: '4px', 
                    fontSize: '13px'
                  }}>
                    ✅ 语法检查通过
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ marginTop: '16px' }}>
            <button
              onClick={handleExecute}
              disabled={!isDbReady || isExecuting}
              style={{
                padding: '10px 32px',
                background: isDbReady && !isExecuting ? '#1a73e8' : '#9aa0a6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: isDbReady && !isExecuting ? 'pointer' : 'not-allowed'
              }}
            >
              {isExecuting ? '执行中...' : '执行 SQL'}
            </button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div style={{ 
          borderTop: '1px solid #e0e0e0',
          background: 'white',
          padding: '24px',
          height: '60%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              查询结果 ({results.length} 个结果集)
            </h2>
            {results[0] && (
              <span style={{ fontSize: '13px', color: '#5f6368' }}>
                共 {results[0].values.length} 行数据
              </span>
            )}
          </div>
          
          {results.map((result, index) => (
            <div key={index} style={{ flex: 1, overflow: 'hidden' }}>
              <ResultTable
                columns={result.columns}
                data={result.values}
                height={400}
              />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
