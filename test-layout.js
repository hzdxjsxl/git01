'use strict';

const NODE_W = 140;
const NODE_H = 42;
const H_GAP = 18;
const V_GAP = 80;

function flatToTree(flat) {
  const n = flat.length;
  const nodes = new Array(n);
  for (let i = 0; i < n; i++) {
    const f = flat[i];
    nodes[i] = { id: f.id, parentId: f.parentId, name: f.name, level: f.level, children: [], x: 0, y: 0, subtreeWidth: 0 };
  }
  let rootId = -1;
  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    if (node.parentId === -1) rootId = i;
    else if (nodes[node.parentId]) nodes[node.parentId].children.push(node);
  }
  for (let i = 0; i < n; i++) nodes[i].children.sort((a, b) => a.id - b.id);
  return { nodes, rootId };
}

function layoutTree(nodes, rootId) {
  function compute(v) {
    if (!v.children.length) {
      v.subtreeWidth = NODE_W;
    } else {
      let total = 0;
      for (let i = 0; i < v.children.length; i++) {
        compute(v.children[i]);
        if (i > 0) total += H_GAP;
        total += v.children[i].subtreeWidth;
      }
      v.subtreeWidth = Math.max(NODE_W, total);
    }
  }

  function place(v, leftX, depth) {
    v.y = depth * (NODE_H + V_GAP);
    if (!v.children.length) {
      v.x = leftX;
    } else {
      let childTotal = 0;
      for (let i = 0; i < v.children.length; i++) {
        if (i > 0) childTotal += H_GAP;
        childTotal += v.children[i].subtreeWidth;
      }
      let curX = leftX + (v.subtreeWidth - childTotal) / 2;
      for (const c of v.children) {
        place(c, curX, depth + 1);
        curX += c.subtreeWidth + H_GAP;
      }
      const first = v.children[0];
      const last = v.children[v.children.length - 1];
      v.x = (first.x + last.x + NODE_W) / 2 - NODE_W / 2;
    }
  }

  const root = nodes[rootId];
  compute(root);
  place(root, 0, 0);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxDepth = 0;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x + NODE_W > maxX) maxX = n.x + NODE_W;
    if (n.y < minY) minY = n.y;
    if (n.y + NODE_H > maxY) maxY = n.y + NODE_H;
    if (n.level > maxDepth) maxDepth = n.level;
  }
  for (const n of nodes) { n.x -= minX; n.y -= minY; }
  return { nodes, minX: 0, maxX: maxX - minX, minY: 0, maxY: maxY - minY, maxDepth };
}

async function main() {
  const res = await fetch('http://localhost:3000/api/org');
  const flat = await res.json();
  console.log(`Got ${flat.length} nodes`);

  const { nodes, rootId } = flatToTree(flat);
  console.log(`Root id=${rootId}, children=${nodes[rootId].children.length}`);

  const t0 = Date.now();
  const r = layoutTree(nodes, rootId);
  const t1 = Date.now();
  console.log(`Layout in ${t1 - t0}ms`);

  console.log(`\n=== Stats ===`);
  console.log(`Width: ${r.maxX.toFixed(0)}px (${(r.maxX/1000).toFixed(1)}k)`);
  console.log(`Height: ${r.maxY.toFixed(0)}px`);
  console.log(`Max depth: ${r.maxDepth}`);

  const root = nodes[rootId];
  console.log(`Root: x=${root.x.toFixed(0)} y=${root.y.toFixed(0)}`);

  let overlaps = 0;
  const levelNodes = new Map();
  for (const n of nodes) {
    if (!levelNodes.has(n.level)) levelNodes.set(n.level, []);
    levelNodes.get(n.level).push(n);
  }

  for (const [level, arr] of levelNodes) {
    arr.sort((a, b) => a.x - b.x);
    for (let i = 1; i < arr.length; i++) {
      const gap = arr[i].x - arr[i-1].x - NODE_W;
      if (gap < -0.5) {
        overlaps++;
        if (overlaps <= 5) console.log(`  OVERLAP L${level}: ${arr[i-1].id} x=${arr[i-1].x.toFixed(0)} <-> ${arr[i].id} x=${arr[i].x.toFixed(0)} gap=${gap.toFixed(1)}`);
      }
    }
  }
  console.log(`Overlaps: ${overlaps}`);

  let misaligned = 0;
  for (const n of nodes) {
    if (n.children.length >= 2) {
      const first = n.children[0];
      const last = n.children[n.children.length - 1];
      const childMid = (first.x + last.x + NODE_W) / 2;
      const parentCenter = n.x + NODE_W / 2;
      const diff = Math.abs(childMid - parentCenter);
      if (diff > 0.5) {
        misaligned++;
        if (misaligned <= 5) console.log(`  MISALIGNED id=${n.id} center=${parentCenter.toFixed(1)} childMid=${childMid.toFixed(1)} diff=${diff.toFixed(1)}`);
      }
    }
  }
  console.log(`Misaligned: ${misaligned}`);

  for (let lv = 0; lv <= 6; lv++) {
    const arr = levelNodes.get(lv) || [];
    if (arr.length > 0) {
      console.log(`L${lv}: count=${arr.length} firstId=${arr[0].id} x=${arr[0].x.toFixed(0)} lastId=${arr[arr.length-1].id} x=${arr[arr.length-1].x.toFixed(0)}`);
    }
  }

  console.log(`\n=== ${overlaps === 0 && misaligned === 0 ? 'PASS' : 'FAIL'} ===`);
}

main().catch(console.error);
