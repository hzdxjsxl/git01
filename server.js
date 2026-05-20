const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const inventoryData = [
  {
    batchNo: '202401001',
    name: '一次性注射器',
    spec: '5ml',
    quantity: 200,
    unit: '支',
    inDate: '2024-01-15',
    expireDate: '2026-01-14',
    manufacturer: 'A医疗器械有限公司'
  },
  {
    batchNo: '202402001',
    name: '一次性注射器',
    spec: '5ml',
    quantity: 300,
    unit: '支',
    inDate: '2024-02-20',
    expireDate: '2026-02-19',
    manufacturer: 'A医疗器械有限公司'
  },
  {
    batchNo: '202403001',
    name: '一次性注射器',
    spec: '5ml',
    quantity: 150,
    unit: '支',
    inDate: '2024-03-10',
    expireDate: '2026-03-09',
    manufacturer: 'B医疗器械有限公司'
  },
  {
    batchNo: '202311001',
    name: '一次性口罩',
    spec: '医用外科',
    quantity: 500,
    unit: '只',
    inDate: '2023-11-05',
    expireDate: '2025-11-04',
    manufacturer: 'C防护用品公司'
  },
  {
    batchNo: '202401002',
    name: '一次性口罩',
    spec: '医用外科',
    quantity: 400,
    unit: '只',
    inDate: '2024-01-20',
    expireDate: '2026-01-19',
    manufacturer: 'C防护用品公司'
  },
  {
    batchNo: '202404001',
    name: '一次性口罩',
    spec: '医用外科',
    quantity: 300,
    unit: '只',
    inDate: '2024-04-15',
    expireDate: '2026-04-14',
    manufacturer: 'D医疗科技公司'
  },
  {
    batchNo: '202309001',
    name: '碘伏消毒液',
    spec: '500ml',
    quantity: 100,
    unit: '瓶',
    inDate: '2023-09-10',
    expireDate: '2025-09-09',
    manufacturer: 'E消毒用品厂'
  },
  {
    batchNo: '202402002',
    name: '碘伏消毒液',
    spec: '500ml',
    quantity: 200,
    unit: '瓶',
    inDate: '2024-02-25',
    expireDate: '2026-02-24',
    manufacturer: 'E消毒用品厂'
  },
  {
    batchNo: '202405001',
    name: '碘伏消毒液',
    spec: '500ml',
    quantity: 150,
    unit: '瓶',
    inDate: '2024-05-12',
    expireDate: '2026-05-11',
    manufacturer: 'F医药集团'
  },
  {
    batchNo: '202310001',
    name: '医用手套',
    spec: 'M号 无菌',
    quantity: 250,
    unit: '副',
    inDate: '2023-10-18',
    expireDate: '2025-10-17',
    manufacturer: 'G医疗用品公司'
  },
  {
    batchNo: '202403002',
    name: '医用手套',
    spec: 'M号 无菌',
    quantity: 350,
    unit: '副',
    inDate: '2024-03-22',
    expireDate: '2026-03-21',
    manufacturer: 'G医疗用品公司'
  },
  {
    batchNo: '202406001',
    name: '医用纱布',
    spec: '10cm×10cm',
    quantity: 400,
    unit: '包',
    inDate: '2024-06-01',
    expireDate: '2026-05-31',
    manufacturer: 'H卫生材料厂'
  },
  {
    batchNo: '202312001',
    name: '医用纱布',
    spec: '10cm×10cm',
    quantity: 200,
    unit: '包',
    inDate: '2023-12-15',
    expireDate: '2025-12-14',
    manufacturer: 'H卫生材料厂'
  }
];

app.get('/api/inventory', (req, res) => {
  res.json({
    success: true,
    data: inventoryData,
    total: inventoryData.length,
    generateTime: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`医院耗材库存系统已启动: http://localhost:${port}`);
});
