const express = require('express');
const cors = require('cors');
const clickStreamRoutes = require('./routes/clickStream');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'User Behavior Analytics API',
    endpoints: {
      clickStream: '/api/click-stream'
    }
  });
});

app.use('/api/click-stream', clickStreamRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});