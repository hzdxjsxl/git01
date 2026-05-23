const express = require('express');
const path = require('path');
const app = express();
const PORT = 3001;

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json({ limit: '50mb' }));

app.get('/api/building', (req, res) => {
  const building = generateBuildingVertices();
  res.json(building);
});

function generateBuildingVertices() {
  const vertices = [];
  const faces = [];
  const groups = [];

  // 主塔楼 (中心)
  const tower = {
    width: 40,
    depth: 30,
    height: 180,
    x: 0,
    y: 0,
    z: 0
  };
  addBox(vertices, faces, groups, tower, 'tower');

  // 左副楼
  const leftWing = {
    width: 25,
    depth: 25,
    height: 100,
    x: -45,
    y: 0,
    z: 5
  };
  addBox(vertices, faces, groups, leftWing, 'left-wing');

  // 右副楼
  const rightWing = {
    width: 28,
    depth: 22,
    height: 120,
    x: 42,
    y: 0,
    z: -3
  };
  addBox(vertices, faces, groups, rightWing, 'right-wing');

  // 顶部装饰尖顶
  const spire = {
    width: 8,
    depth: 8,
    height: 30,
    x: 0,
    y: 180,
    z: 0
  };
  addBox(vertices, faces, groups, spire, 'spire');

  // 底层裙房
  const podium = {
    width: 80,
    depth: 45,
    height: 20,
    x: 0,
    y: -10,
    z: 0
  };
  addBox(vertices, faces, groups, podium, 'podium');

  return {
    vertices: new Float32Array(vertices),
    faces,
    groups,
    bounds: {
      minX: -60,
      maxX: 60,
      minY: -20,
      maxY: 220,
      minZ: -30,
      maxZ: 30
    }
  };
}

function addBox(vertices, faces, groups, box, groupName) {
  const { width, depth, height, x, y, z } = box;
  const hw = width / 2;
  const hd = depth / 2;

  const v0 = [x - hw, y, z - hd];
  const v1 = [x + hw, y, z - hd];
  const v2 = [x + hw, y, z + hd];
  const v3 = [x - hw, y, z + hd];
  const v4 = [x - hw, y + height, z - hd];
  const v5 = [x + hw, y + height, z - hd];
  const v6 = [x + hw, y + height, z + hd];
  const v7 = [x - hw, y + height, z + hd];

  const baseIndex = vertices.length / 3;
  const verts = [v0, v1, v2, v3, v4, v5, v6, v7];
  verts.forEach(v => {
    vertices.push(v[0], v[1], v[2]);
  });

  const faceIndices = [
    [0, 1, 2], [0, 2, 3],
    [4, 6, 5], [4, 7, 6],
    [0, 4, 5], [0, 5, 1],
    [1, 5, 6], [1, 6, 2],
    [2, 6, 7], [2, 7, 3],
    [3, 7, 4], [3, 4, 0]
  ];

  faceIndices.forEach(f => {
    faces.push([baseIndex + f[0], baseIndex + f[1], baseIndex + f[2]]);
  });

  groups.push({
    name: groupName,
    startIndex: baseIndex,
    count: verts.length
  });
}

app.listen(PORT, () => {
  console.log(`Wind Tunnel Sandbox running at http://localhost:${PORT}`);
});
