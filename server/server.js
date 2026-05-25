const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

const rooms = [
  { id: 'r1', name: '静谧厅', capacity: 20 },
  { id: 'r2', name: '阳光房', capacity: 15 },
  { id: 'r3', name: '禅心室', capacity: 10 },
  { id: 'r4', name: '活力馆', capacity: 25 }
];

const coaches = [
  { id: 'c1', name: '林静', style: '哈他瑜伽' },
  { id: 'c2', name: '苏晓', style: '流瑜伽' },
  { id: 'c3', name: '张慧', style: '阴瑜伽' },
  { id: 'c4', name: '王丽', style: '阿斯汤加' },
  { id: 'c5', name: '陈晨', style: '高温瑜伽' }
];

const timeSlots = [
  { id: 't1', day: 1, start: '08:00', end: '09:30' },
  { id: 't2', day: 1, start: '10:00', end: '11:30' },
  { id: 't3', day: 1, start: '14:00', end: '15:30' },
  { id: 't4', day: 1, start: '16:00', end: '17:30' },
  { id: 't5', day: 1, start: '18:30', end: '20:00' },
  { id: 't6', day: 2, start: '08:00', end: '09:30' },
  { id: 't7', day: 2, start: '10:00', end: '11:30' },
  { id: 't8', day: 2, start: '14:00', end: '15:30' },
  { id: 't9', day: 2, start: '16:00', end: '17:30' },
  { id: 't10', day: 2, start: '18:30', end: '20:00' },
  { id: 't11', day: 3, start: '08:00', end: '09:30' },
  { id: 't12', day: 3, start: '10:00', end: '11:30' },
  { id: 't13', day: 3, start: '14:00', end: '15:30' },
  { id: 't14', day: 3, start: '16:00', end: '17:30' },
  { id: 't15', day: 3, start: '18:30', end: '20:00' },
  { id: 't16', day: 4, start: '08:00', end: '09:30' },
  { id: 't17', day: 4, start: '10:00', end: '11:30' },
  { id: 't18', day: 4, start: '14:00', end: '15:30' },
  { id: 't19', day: 4, start: '16:00', end: '17:30' },
  { id: 't20', day: 4, start: '18:30', end: '20:00' },
  { id: 't21', day: 5, start: '08:00', end: '09:30' },
  { id: 't22', day: 5, start: '10:00', end: '11:30' },
  { id: 't23', day: 5, start: '14:00', end: '15:30' },
  { id: 't24', day: 5, start: '16:00', end: '17:30' },
  { id: 't25', day: 5, start: '18:30', end: '20:00' },
  { id: 't26', day: 6, start: '08:00', end: '09:30' },
  { id: 't27', day: 6, start: '10:00', end: '11:30' },
  { id: 't28', day: 6, start: '14:00', end: '15:30' },
  { id: 't29', day: 6, start: '16:00', end: '17:30' },
  { id: 't30', day: 6, start: '18:30', end: '20:00' },
  { id: 't31', day: 0, start: '09:00', end: '10:30' },
  { id: 't32', day: 0, start: '14:00', end: '15:30' },
  { id: 't33', day: 0, start: '16:00', end: '17:30' }
];

app.get('/api/data', (req, res) => {
  res.json({ rooms, coaches, timeSlots });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Yoga schedule server running at http://localhost:${PORT}`);
});
