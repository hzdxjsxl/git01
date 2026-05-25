import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;
const TOTAL_SEATS = 100000;
const COLS = 500;
const ROWS = TOTAL_SEATS / COLS;

app.use(cors());
app.use(express.json());

let seatData = null;

function generateSeatData() {
  const arr = new Uint8Array(TOTAL_SEATS);
  for (let i = 0; i < TOTAL_SEATS; i++) {
    arr[i] = Math.random() < 0.3 ? 1 : 0;
  }
  return arr;
}

app.get('/api/seats', (_req, res) => {
  if (!seatData) {
    seatData = generateSeatData();
  }
  res.json({
    total: TOTAL_SEATS,
    cols: COLS,
    rows: ROWS,
    data: Array.from(seatData),
  });
});

app.post('/api/seats/reserve', (req, res) => {
  const { index } = req.body;
  if (index == null || index < 0 || index >= TOTAL_SEATS) {
    return res.status(400).json({ error: 'Invalid seat index' });
  }
  if (!seatData) {
    seatData = generateSeatData();
  }
  if (seatData[index] === 1) {
    return res.status(409).json({ error: 'Seat already taken' });
  }
  seatData[index] = 1;
  res.json({ success: true, index });
});

app.post('/api/seats/release', (req, res) => {
  const { index } = req.body;
  if (index == null || index < 0 || index >= TOTAL_SEATS) {
    return res.status(400).json({ error: 'Invalid seat index' });
  }
  if (!seatData) {
    seatData = generateSeatData();
  }
  seatData[index] = 0;
  res.json({ success: true, index });
});

app.get('/api/seats/reset', (_req, res) => {
  seatData = generateSeatData();
  res.json({ success: true, total: TOTAL_SEATS });
});

app.listen(PORT, () => {
  console.log(`Concert seat server running on http://localhost:${PORT}`);
});
