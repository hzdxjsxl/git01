import VirtualSeatGrid from './VirtualSeatGrid.jsx';
import './SeatMap.css';

export default function SeatMap({
  seatData,
  cols,
  rows,
  selectedSeats,
  pendingSeats,
  onSeatClick,
}) {
  return (
    <div className="seat-map">
      <div className="stage">🎭 舞台 STAGE 🎭</div>
      <VirtualSeatGrid
        seatData={seatData}
        cols={cols}
        rows={rows}
        selectedSeats={selectedSeats}
        pendingSeats={pendingSeats}
        onSeatClick={onSeatClick}
      />
      <div className="legend">
        <div className="legend-item">
          <span className="legend-swatch available" /> 可用
        </div>
        <div className="legend-item">
          <span className="legend-swatch taken" /> 已售
        </div>
        <div className="legend-item">
          <span className="legend-swatch selected" /> 已选
        </div>
        <div className="legend-item">
          <span className="legend-swatch pending" /> 处理中
        </div>
      </div>
    </div>
  );
}
