import React, { useState, useEffect, useMemo } from 'react';
import { ruleEngine } from './expression/index.js';

function App() {
  const [products, setProducts] = useState([]);
  const [presets, setPresets] = useState([]);
  const [expression, setExpression] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/data');
        const data = await res.json();
        setProducts(data.products);
        setPresets(data.rules);
        if (data.rules.length > 0) {
          setExpression(data.rules[0].expression);
          setSelectedPresetId(data.rules[0].id);
        }
        setLoading(false);
      } catch (e) {
        setError('无法加载数据，请确保后端服务已启动');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const result = useMemo(() => {
    if (expression.trim() === '') {
      return { matched: products, error: null, tokens: [], ast: null };
    }
    return ruleEngine.filter(products, expression);
  }, [expression, products]);

  const matchedIds = useMemo(() => {
    return new Set(result.matched.map((p) => p.id));
  }, [result.matched]);

  const handlePresetClick = (preset) => {
    setExpression(preset.expression);
    setSelectedPresetId(preset.id);
  };

  const handleExpressionChange = (e) => {
    setExpression(e.target.value);
    setSelectedPresetId(null);
  };

  const getTagClass = (tag) => {
    const lower = tag.toLowerCase();
    if (lower === 'vip') return 'tag vip';
    if (lower === 'electronics') return 'tag electronics';
    if (lower === 'fashion') return 'tag fashion';
    if (lower === 'home') return 'tag home';
    if (lower === 'new') return 'tag new';
    return 'tag';
  };

  const debugInfo = useMemo(() => {
    const parts = [];
    if (expression) {
      parts.push('Tokens:');
      parts.push(JSON.stringify(result.tokens, null, 2));
      parts.push('');
      parts.push('AST:');
      parts.push(JSON.stringify(result.ast, null, 2));
    }
    return parts.join('\n') || '输入表达式查看语法分析结果';
  }, [expression, result]);

  if (loading) {
    return (
      <div className="app">
        <div className="app-header">
          <h1>电商促销规则测试台</h1>
          <p>正在加载数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="app-header">
          <h1>电商促销规则测试台</h1>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>电商促销规则测试台</h1>
        <p>基于自定义 AST 解析器的规则引擎 · 无 eval · 实时过滤</p>
      </div>

      <div className="app-content">
        <div className="left-panel">
          <div className="panel">
            <h2 className="panel-title">规则编辑器</h2>
            
            <div className="rule-editor">
              <textarea
                value={expression}
                onChange={handleExpressionChange}
                className={result.error ? 'has-error' : ''}
                placeholder="输入表达式，例如：price > 1000 && tag == 'VIP'"
              />
              {result.error && (
                <div className="error-message">{result.error}</div>
              )}
            </div>

            <div className="presets-section">
              <h3>预设规则</h3>
              <div className="preset-list">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`preset-item ${selectedPresetId === preset.id ? 'selected' : ''}`}
                    onClick={() => handlePresetClick(preset)}
                  >
                    <div className="preset-name">{preset.name}</div>
                    <div className="preset-expression">{preset.expression}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="help-section">
              <h3>语法说明</h3>
              <ul>
                <li><code>price</code> - 商品价格（数字）</li>
                <li><code>stock</code> - 商品库存（数字）</li>
                <li><code>tag == 'VIP'</code> - 标签匹配检查</li>
                <li><code>&gt;</code> <code>&lt;</code> <code>&gt;=</code> <code>&lt;=</code> <code>==</code> <code>!=</code> - 比较</li>
                <li><code>&amp;&amp;</code> <code>||</code> <code>!</code> - 逻辑运算</li>
                <li><code>( )</code> - 括号分组</li>
              </ul>
            </div>
          </div>

          <div className="panel" style={{ marginTop: '20px' }}>
            <h2 className="panel-title">语法分析 (Debug)</h2>
            <div className="debug-section">
              <div className="debug-box">{debugInfo}</div>
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="panel">
            <div className="products-header">
              <h2 className="panel-title" style={{ marginBottom: 0 }}>商品列表</h2>
              <div className="stats">
                匹配: <strong>{result.matched.length}</strong> / {products.length}
              </div>
            </div>

            <div className="product-grid">
              {products.map((product) => {
                const isMatched = matchedIds.has(product.id);
                return (
                  <div
                    key={product.id}
                    className={`product-card ${isMatched ? 'matched' : 'unmatched'}`}
                  >
                    <div className="product-header">
                      <span className="product-id">#{product.id}</span>
                      <span className="product-price">{product.price}</span>
                    </div>
                    
                    <div className="product-name">{product.name}</div>
                    
                    <div className="product-meta">
                      <span className="meta-item">库存: {product.stock}</span>
                    </div>
                    
                    <div className="product-tags">
                      {product.tags.map((tag) => (
                        <span key={tag} className={getTagClass(tag)}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className={`match-badge ${isMatched ? 'matched' : 'unmatched'}`}>
                      {isMatched ? '符合规则' : '不符合规则'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
