const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/employees', (req, res) => {
  const data = fs.readFileSync(path.join(__dirname, 'data', 'employees.json'), 'utf8');
  const employees = JSON.parse(data);
  res.json({
    total: employees.length,
    relationships: employees.map(e => ({
      id: e.id,
      name: e.name,
      dept: e.dept,
      title: e.title,
      manager: e.manager,
      approvalLimit: e.approvalLimit
    }))
  });
});

app.get('/api/employees/:id', (req, res) => {
  const data = fs.readFileSync(path.join(__dirname, 'data', 'employees.json'), 'utf8');
  const employees = JSON.parse(data);
  const emp = employees.find(e => e.id === req.params.id);
  if (!emp) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.json(emp);
});

app.get('/api/reporting-chain/:id', (req, res) => {
  const data = fs.readFileSync(path.join(__dirname, 'data', 'employees.json'), 'utf8');
  const employees = JSON.parse(data);
  const empMap = {};
  employees.forEach(e => { empMap[e.id] = e; });

  const chain = [];
  let current = empMap[req.params.id];
  while (current) {
    chain.push({
      id: current.id,
      name: current.name,
      dept: current.dept,
      title: current.title,
      approvalLimit: current.approvalLimit
    });
    if (!current.manager) break;
    current = empMap[current.manager];
  }
  res.json({ chain });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  审批流系统已启动`);
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`========================================\n`);
});
