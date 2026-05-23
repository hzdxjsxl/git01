const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;
let SQL;

const DB_PATH = path.join(__dirname, 'carbon.db');

async function initDB() {
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS provinces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS carbon_transfer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (source_id) REFERENCES provinces(id),
      FOREIGN KEY (target_id) REFERENCES provinces(id)
    );
  `);

  const provinceCount = db.exec('SELECT COUNT(*) as cnt FROM provinces')[0].values[0][0];

  if (provinceCount === 0) {
    const provinces = [
      '北京', '上海', '广东', '江苏', '浙江',
      '山东', '河北', '四川', '湖北', '湖南'
    ];

    provinces.forEach(name => {
      db.run('INSERT INTO provinces (name) VALUES (?)', [name]);
    });

    const transferData = [
      [0, 80, 180, 420, 260, 350, 480, 150, 200, 170],
      [150, 0, 220, 180, 200, 110, 140, 170, 140, 120],
      [300, 150, 0, 350, 250, 280, 200, 230, 280, 230],
      [250, 120, 200, 0, 300, 140, 180, 120, 160, 140],
      [180, 130, 150, 200, 0, 180, 150, 170, 200, 170],
      [220, 160, 180, 150, 120, 0, 320, 230, 180, 160],
      [280, 100, 140, 170, 110, 200, 0, 260, 160, 140],
      [210, 180, 120, 140, 150, 160, 180, 0, 280, 250],
      [130, 110, 160, 170, 120, 150, 130, 190, 0, 280],
      [110, 90, 140, 150, 110, 130, 110, 160, 170, 0]
    ];

    for (let i = 0; i < transferData.length; i++) {
      for (let j = 0; j < transferData[i].length; j++) {
        if (transferData[i][j] > 0) {
          db.run('INSERT INTO carbon_transfer (source_id, target_id, amount) VALUES (?, ?, ?)',
            [i + 1, j + 1, transferData[i][j]]);
        }
      }
    }

    saveDB();
  }
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function query(sql, params = []) {
  const results = db.exec(sql, params);
  if (results.length === 0) return [];
  const columns = results[0].columns;
  return results[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

app.get('/api/provinces', (req, res) => {
  const provinces = query('SELECT * FROM provinces ORDER BY id');
  res.json(provinces);
});

app.get('/api/carbon-matrix', (req, res) => {
  const provinces = query('SELECT * FROM provinces ORDER BY id');
  const transfers = query('SELECT * FROM carbon_transfer');

  const n = provinces.length;
  const matrix = [];

  for (let i = 0; i < n; i++) {
    matrix.push(new Array(n).fill(0));
  }

  transfers.forEach(t => {
    matrix[t.source_id - 1][t.target_id - 1] = t.amount;
  });

  res.json({
    provinces: provinces.map(p => p.name),
    matrix: matrix
  });
});

app.get('/api/carbon-stats', (req, res) => {
  const provinces = query('SELECT * FROM provinces ORDER BY id');
  const transfers = query('SELECT * FROM carbon_transfer');

  const n = provinces.length;
  const matrix = [];

  for (let i = 0; i < n; i++) {
    matrix.push(new Array(n).fill(0));
  }

  transfers.forEach(t => {
    matrix[t.source_id - 1][t.target_id - 1] = t.amount;
  });

  const stats = provinces.map((p, i) => {
    const outflow = matrix[i].reduce((a, b) => a + b, 0);
    const inflow = matrix.reduce((a, b) => a + b[i], 0);
    return {
      id: p.id,
      name: p.name,
      outflow: parseFloat(outflow.toFixed(2)),
      inflow: parseFloat(inflow.toFixed(2)),
      total: parseFloat((outflow + inflow).toFixed(2))
    };
  });

  res.json(stats);
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  环保数据大屏 - 碳排放转移和弦图`);
    console.log(`========================================`);
    console.log(`  服务已启动: http://localhost:${PORT}`);
    console.log(`  API接口:`);
    console.log(`    GET /api/provinces      - 省份列表`);
    console.log(`    GET /api/carbon-matrix  - 碳排放转移矩阵`);
    console.log(`    GET /api/carbon-stats   - 碳排放统计`);
    console.log(`========================================\n`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
