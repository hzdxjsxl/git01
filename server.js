const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const roomTypes = ['标准间', '大床房', '双床房', '豪华间', '套房'];
const rooms = [];
for (let i = 1; i <= 15; i++) {
  rooms.push({
    id: i,
    room_number: `${i}0${i < 10 ? '0' : ''}${i}`,
    type: roomTypes[(i - 1) % roomTypes.length]
  });
}

const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const guests = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];

let bookings = [];
let bookingIdCounter = 1;

for (let i = 0; i < 25; i++) {
  const roomId = Math.floor(Math.random() * 15) + 1;
  const startOffset = Math.floor(Math.random() * 14) - 3;
  const duration = Math.floor(Math.random() * 5) + 1;
  bookings.push({
    id: bookingIdCounter++,
    room_id: roomId,
    check_in: now + startOffset * day,
    check_out: now + (startOffset + duration) * day,
    guest_name: guests[Math.floor(Math.random() * guests.length)]
  });
}

app.get('/api/bookings', (req, res) => {
  const result = bookings.map(b => {
    const room = rooms.find(r => r.id === b.room_id);
    return {
      id: b.id,
      room_number: room.room_number,
      room_type: room.type,
      check_in: b.check_in,
      check_out: b.check_out,
      guest_name: b.guest_name
    };
  });
  res.json(result);
});

app.put('/api/bookings/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { check_in, check_out } = req.body;
  const booking = bookings.find(b => b.id === id);
  
  if (booking) {
    booking.check_in = check_in;
    booking.check_out = check_out;
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Booking not found' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`酒店预订排期系统已启动: http://localhost:${PORT}`);
});
