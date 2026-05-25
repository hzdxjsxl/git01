import { useState, useEffect, useCallback } from 'react';
import SeatMap from './components/SeatMap.jsx';
import './App.css';

export default function App() {
  const [seatData, setSeatData] = useState(null);
  const [cols, setCols] = useState(0);
  const [rows, setRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState(new Set());
  const [pendingSeats, setPendingSeats] = useState(new Set());
  const [stats, setStats] = useState({ available: 0, taken: 0, selected: 0 });

  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/seats');
      if (!res.ok) throw new Error('Failed to fetch seats');
      const data = await res.json();
      const u8 = new Uint8Array(data.data);
      setSeatData(u8);
      setCols(data.cols);
      setRows(data.rows);
      let taken = 0;
      for (let i = 0; i < u8.length; i++) taken += u8[i];
      setStats({ available: u8.length - taken, taken, selected: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  const handleSeatClick = useCallback(
    async (index) => {
      if (!seatData) return;
      if (seatData[index] === 1) return;
      if (pendingSeats.has(index)) return;

      const isSelected = selectedSeats.has(index);

      setPendingSeats((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });

      try {
        if (isSelected) {
          await fetch('/api/seats/release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index }),
          });
          setSelectedSeats((prev) => {
            const next = new Set(prev);
            next.delete(index);
            return next;
          });
          setStats((prev) => ({ ...prev, selected: prev.selected - 1 }));
        } else {
          const res = await fetch('/api/seats/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Reservation failed');
          }
          setSelectedSeats((prev) => {
            const next = new Set(prev);
            next.add(index);
            return next;
          });
          setStats((prev) => ({ ...prev, selected: prev.selected + 1 }));
        }

        setSeatData((prev) => {
          if (!prev) return prev;
          const next = new Uint8Array(prev);
          next[index] = isSelected ? 0 : 1;
          return next;
        });
      } catch (err) {
        console.error('Seat operation failed:', err.message);
      } finally {
        setPendingSeats((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    },
    [seatData, selectedSeats, pendingSeats]
  );

  const handleReset = async () => {
    await fetch('/api/seats/reset');
    setSelectedSeats(new Set());
    setPendingSeats(new Set());
    fetchSeats();
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>正在加载 100,000 个座位数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <h2>加载失败</h2>
        <p>{error}</p>
        <button onClick={fetchSeats}>重试</button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎤 演唱会座位选座系统</h1>
        <div className="stats">
          <span className="stat available">
            <i className="dot available" /> 可用 {stats.available.toLocaleString()}
          </span>
          <span className="stat taken">
            <i className="dot taken" /> 已售 {stats.taken.toLocaleString()}
          </span>
          <span className="stat selected">
            <i className="dot selected" /> 已选 {stats.selected}
          </span>
        </div>
        <div className="actions">
          <button onClick={handleReset} className="reset-btn">
            重置座位
          </button>
          {selectedSeats.size > 0 && (
            <button className="confirm-btn">
              确认选座 ({selectedSeats.size})
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        <SeatMap
          seatData={seatData}
          cols={cols}
          rows={rows}
          selectedSeats={selectedSeats}
          pendingSeats={pendingSeats}
          onSeatClick={handleSeatClick}
        />
      </main>

      <footer className="app-footer">
        <p>虚拟滚动渲染 · 10万座位流畅浏览 · 点击座位进行选座/取消</p>
      </footer>
    </div>
  );
}
