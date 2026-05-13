const http = require('http');

const PORT = 8080;

const data = {
  teachers: [
    { id: 1, name: '张老师', subjects: [1, 2] },
    { id: 2, name: '李老师', subjects: [2, 3] },
    { id: 3, name: '王老师', subjects: [1, 4] },
    { id: 4, name: '赵老师', subjects: [3, 5] },
    { id: 5, name: '刘老师', subjects: [4, 5] }
  ],
  classrooms: [
    { id: 1, name: 'A101', capacity: 30 },
    { id: 2, name: 'A102', capacity: 40 },
    { id: 3, name: 'B201', capacity: 50 },
    { id: 4, name: 'B202', capacity: 35 },
    { id: 5, name: '实验室1', capacity: 25 }
  ],
  courses: [
    { id: 1, name: '高等数学', teacherId: 1, classroomId: 1, students: 28, hoursPerWeek: 4 },
    { id: 2, name: '线性代数', teacherId: 1, classroomId: 2, students: 35, hoursPerWeek: 3 },
    { id: 3, name: '概率论', teacherId: 2, classroomId: 1, students: 25, hoursPerWeek: 3 },
    { id: 4, name: '数据结构', teacherId: 3, classroomId: 3, students: 45, hoursPerWeek: 4 },
    { id: 5, name: '操作系统', teacherId: 3, classroomId: 2, students: 30, hoursPerWeek: 3 },
    { id: 6, name: '计算机网络', teacherId: 4, classroomId: 4, students: 32, hoursPerWeek: 3 },
    { id: 7, name: '数据库原理', teacherId: 4, classroomId: 5, students: 22, hoursPerWeek: 3 },
    { id: 8, name: 'Java程序设计', teacherId: 5, classroomId: 3, students: 40, hoursPerWeek: 4 },
    { id: 9, name: 'Python编程', teacherId: 5, classroomId: 5, students: 20, hoursPerWeek: 3 },
    { id: 10, name: '算法分析', teacherId: 2, classroomId: 4, students: 30, hoursPerWeek: 2 }
  ]
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/data' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    console.log('[backend] /api/data 请求已处理');
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`[backend] 服务器运行在 http://localhost:${PORT}`);
  console.log(`[backend] /api/data 接口就绪`);
});
