'use strict';

(function () {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const loadingText = document.getElementById('loading');

  const stats = {
    total: document.getElementById('s-total'),
    depth: document.getElementById('s-depth'),
    draw: document.getElementById('s-draw'),
    edge: document.getElementById('s-edge'),
    fps: document.getElementById('s-fps'),
    scale: document.getElementById('s-scale'),
  };

  let DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let W = 0, H = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const NODE_W = 140;
  const NODE_H = 42;
  const H_GAP = 18;
  const V_GAP = 80;

  const state = {
    nodes: [],
    edges: [],
    minX: 0, maxX: 0, minY: 0, maxY: 0,
    totalNodes: 0,
    maxDepth: 0,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    minScale: 0.02,
    maxScale: 6,
    hoverId: -1,
    hoverRect: null,
  };

  function flatToTree(flat) {
    const n = flat.length;
    const nodes = new Array(n);
    for (let i = 0; i < n; i++) {
      const f = flat[i];
      nodes[i] = {
        id: f.id,
        parentId: f.parentId,
        name: f.name,
        level: f.level,
        children: [],
        x: 0,
        y: 0,
        width: NODE_W,
        height: NODE_H,
        prelim: 0,
        mod: 0,
        thread: null,
        ancestor: i,
        change: 0,
        shift: 0,
        number: 0,
      };
    }
    let rootId = -1;
    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      if (node.parentId === -1 || node.parentId === null || node.parentId === undefined) {
        rootId = i;
      } else if (nodes[node.parentId]) {
        nodes[node.parentId].children.push(node);
      }
    }
    for (let i = 0; i < n; i++) {
      nodes[i].children.sort((a, b) => a.id - b.id);
    }
    return { nodes, rootId };
  }

  function layoutTree(nodes, rootId) {
    let numberCounter = 0;

    function leftSibling(v) {
      const p = nodes[v.parentId];
      if (!p) return null;
      let left = null;
      for (const c of p.children) {
        if (c.id === v.id) return left;
        left = c;
      }
      return left;
    }

    function leftmostSibling(v) {
      const p = nodes[v.parentId];
      if (!p) return null;
      return p.children[0].id === v.id ? null : p.children[0];
    }

    function apportion(v) {
      const w = leftSibling(v);
      if (w) {
        let vip = v, vop = v, vim = w, vom = leftmostSibling(v);
        let sip = v.mod, sop = v.mod, sim = w.mod, som = vom ? vom.mod : 0;
        while (nextRight(vim) && nextLeft(vip)) {
          vim = nextRight(vim);
          vip = nextLeft(vip);
          vom = vom ? nextLeft(vom) : null;
          vop = vop ? nextRight(vop) : null;
          if (vop) vop.ancestor = v.id;
          const shift = (vim.prelim + sim) - (vip.prelim + sip) + H_GAP + NODE_W;
          if (shift > 0) {
            const a = ancestor(vim, v);
            moveSubtree(a, v, shift);
            sip += shift;
            sop += shift;
          }
          sim += vim.mod;
          sip += vip.mod;
          if (vom) som += vom.mod;
          if (vop) sop += vop.mod;
        }
        if (nextRight(vim) && !nextRight(vop)) {
          v.thread = nextRight(vim);
          v.mod += sim - sop;
        }
        if (nextLeft(vip) && !nextLeft(vom)) {
          vom.thread = nextLeft(vip);
          vom.mod += sip - som;
        }
      }
    }

    function nextLeft(v) {
      return v.children.length ? v.children[0] : v.thread;
    }
    function nextRight(v) {
      return v.children.length ? v.children[v.children.length - 1] : v.thread;
    }

    function moveSubtree(wm, wp, shift) {
      const subtrees = wp.number - wm.number;
      wp.change -= shift / subtrees;
      wp.shift += shift;
      wm.change += shift / subtrees;
      wp.prelim += shift;
      wp.mod += shift;
    }

    function ancestor(vim, v) {
      const sibs = nodes[v.parentId] ? nodes[v.parentId].children : [];
      for (const s of sibs) {
        if (s.id === vim.ancestor) return s;
      }
      return sibs[0] || vim;
    }

    function firstwalk(v) {
      v.number = numberCounter++;
      if (!v.children.length) {
        const ls = leftSibling(v);
        v.prelim = ls ? ls.prelim + H_GAP + NODE_W : 0;
      } else {
        let defaultAncestor = v.children[0];
        for (const c of v.children) {
          firstwalk(c);
          defaultAncestor = apportion2(c, defaultAncestor);
        }
        const midpoint = (v.children[0].prelim + v.children[v.children.length - 1].prelim) / 2;
        const ls = leftSibling(v);
        if (ls) {
          v.prelim = ls.prelim + H_GAP + NODE_W;
          v.mod = v.prelim - midpoint;
        } else {
          v.prelim = midpoint;
        }
      }
    }

    function apportion2(v, defaultAncestor) {
      const w = leftSibling(v);
      if (w) {
        let vip = v, vop = v, vim = w, vom = leftmostSibling(v);
        let sip = v.mod, sop = v.mod, sim = w.mod, som = vom ? vom.mod : 0;
        while (nextRight(vim) && nextLeft(vip)) {
          vim = nextRight(vim);
          vip = nextLeft(vip);
          vom = vom ? nextLeft(vom) : null;
          vop = vop ? nextRight(vop) : null;
          if (vop) vop.ancestor = v.id;
          const shift = (vim.prelim + sim) - (vip.prelim + sip) + H_GAP + NODE_W;
          if (shift > 0) {
            const a = ancestorNode(vim, v, defaultAncestor);
            moveSubtree2(a, v, shift);
            sip += shift;
            sop += shift;
          }
          sim += vim.mod;
          sip += vip.mod;
          if (vom) som += vom.mod;
          if (vop) sop += vop.mod;
        }
        if (nextRight(vim) && !nextRight(vop)) {
          v.thread = nextRight(vim);
          v.mod += sim - sop;
        }
        if (nextLeft(vip) && !nextLeft(vom)) {
          vom.thread = nextLeft(vip);
          vom.mod += sip - som;
        }
        return defaultAncestor;
      }
      return defaultAncestor;
    }

    function ancestorNode(vim, v, defaultAncestor) {
      const parent = nodes[v.parentId];
      if (!parent) return defaultAncestor;
      for (const s of parent.children) {
        if (s.id === vim.ancestor) return s;
      }
      return defaultAncestor;
    }

    function moveSubtree2(wm, wp, shift) {
      const subtrees = wp.number - wm.number;
      wp.change -= shift / subtrees;
      wp.shift += shift;
      wm.change += shift / subtrees;
      wp.prelim += shift;
      wp.mod += shift;
    }

    function secondwalk(v, m, depth) {
      v.x = v.prelim + m;
      v.y = depth * (NODE_H + V_GAP);
      let s = v.shift;
      const cs = v.children;
      for (let i = cs.length - 1; i >= 0; i--) {
        const c = cs[i];
        secondwalk(c, m + v.mod + s, depth + 1);
        s += c.change;
      }
    }

    const root = nodes[rootId];
    root.ancestor = rootId;
    firstwalk(root);
    secondwalk(root, 0, 0);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxDepth = 0;
    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.x + NODE_W > maxX) maxX = n.x + NODE_W;
      if (n.y < minY) minY = n.y;
      if (n.y + NODE_H > maxY) maxY = n.y + NODE_H;
      if (n.level > maxDepth) maxDepth = n.level;
    }
    for (const n of nodes) {
      n.x -= minX;
      n.y -= minY;
    }
    const edges = [];
    for (const n of nodes) {
      if (n.parentId !== -1 && nodes[n.parentId]) {
        edges.push({ from: nodes[n.parentId], to: n });
      }
    }
    return {
      nodes,
      edges,
      minX: 0, maxX: maxX - minX, minY: 0, maxY: maxY - minY,
      maxDepth,
    };
  }

  function pointInNode(n, x, y) {
    return x >= n.x && x <= n.x + NODE_W && y >= n.y && y <= n.y + NODE_H;
  }

  function viewToWorld(sx, sy) {
    return {
      x: (sx - state.offsetX) / state.scale,
      y: (sy - state.offsetY) / state.scale,
    };
  }

  function draw() {
    ctx.fillStyle = '#0b0f1a';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(state.offsetX, state.offsetY);
    ctx.scale(state.scale, state.scale);

    const tl = viewToWorld(0, 0);
    const br = viewToWorld(W, H);
    const pad = 40 / state.scale;
    const vx0 = tl.x - pad, vy0 = tl.y - pad;
    const vx1 = br.x + pad, vy1 = br.y + pad;

    let drawnNodes = 0, drawnEdges = 0;

    ctx.lineWidth = 1 / state.scale;
    ctx.strokeStyle = 'rgba(127,209,255,0.35)';
    for (const e of state.edges) {
      const a = e.from, b = e.to;
      if ((a.x + NODE_W < vx0 || a.x > vx1 || a.y + NODE_H < vy0 || a.y > vy1) &&
          (b.x + NODE_W < vx0 || b.x > vx1 || b.y + NODE_H < vy0 || b.y > vy1)) continue;
      const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H;
      const x2 = b.x + NODE_W / 2, y2 = b.y;
      const midY = (y1 + y2) / 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2);
      ctx.stroke();
      drawnEdges++;
    }

    for (const n of state.nodes) {
      if (n.x + NODE_W < vx0 || n.x > vx1 || n.y + NODE_H < vy0 || n.y > vy1) continue;
      const isHover = n.id === state.hoverId;
      const grad = ctx.createLinearGradient(n.x, n.y, n.x, n.y + NODE_H);
      if (isHover) {
        grad.addColorStop(0, '#1f3a5f');
        grad.addColorStop(1, '#0f1f3a');
      } else if (n.level === 0) {
        grad.addColorStop(0, '#2a4a7a');
        grad.addColorStop(1, '#14263f');
      } else {
        grad.addColorStop(0, '#16253d');
        grad.addColorStop(1, '#0c1727');
      }
      ctx.fillStyle = grad;
      roundRect(ctx, n.x, n.y, NODE_W, NODE_H, 6);
      ctx.fill();
      ctx.strokeStyle = isHover ? '#7fd1ff' : 'rgba(127,209,255,0.5)';
      ctx.lineWidth = (isHover ? 2 : 1) / state.scale;
      ctx.stroke();

      if (state.scale > 0.35) {
        ctx.fillStyle = '#dce3ef';
        ctx.font = `${Math.min(13, 13 * state.scale) / state.scale}px -apple-system, "Segoe UI", sans-serif`;
        ctx.textBaseline = 'middle';
        const label = n.name.length > 16 ? n.name.slice(0, 15) + '…' : n.name;
        ctx.fillText(label, n.x + 10 / state.scale, n.y + NODE_H / 2);
      }
      drawnNodes++;
    }

    ctx.restore();

    stats.draw.textContent = drawnNodes;
    stats.edge.textContent = drawnEdges;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  let lastTime = performance.now();
  let fps = 60, fpsAcc = 0, fpsFrames = 0;
  function loop() {
    const now = performance.now();
    const dt = now - lastTime;
    lastTime = now;
    fpsAcc += dt; fpsFrames++;
    if (fpsAcc >= 500) {
      fps = Math.round(1000 / (fpsAcc / fpsFrames));
      stats.fps.textContent = fps;
      fpsAcc = 0; fpsFrames = 0;
    }
    draw();
    requestAnimationFrame(loop);
  }

  let dragging = false;
  let lastX = 0, lastY = 0;
  let dragMoved = false;

  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    dragMoved = false;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.classList.add('grabbing');
  });
  window.addEventListener('mousemove', (e) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
      state.offsetX += dx;
      state.offsetY += dy;
      lastX = e.clientX;
      lastY = e.clientY;
    } else {
      const w = viewToWorld(e.clientX, e.clientY);
      let hit = -1;
      for (const n of state.nodes) {
        if (pointInNode(n, w.x, w.y)) { hit = n.id; break; }
      }
      if (hit !== state.hoverId) state.hoverId = hit;
    }
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
    canvas.classList.remove('grabbing');
  });
  canvas.addEventListener('dblclick', () => {
    fitView();
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  function zoomAt(cx, cy, factor) {
    const ns = clamp(state.scale * factor, state.minScale, state.maxScale);
    const realFactor = ns / state.scale;
    state.offsetX = cx - (cx - state.offsetX) * realFactor;
    state.offsetY = cy - (cy - state.offsetY) * realFactor;
    state.scale = ns;
    stats.scale.textContent = state.scale.toFixed(2);
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function fitView() {
    const w = state.maxX - state.minX;
    const h = state.maxY - state.minY;
    const pad = 60;
    const sx = (W - pad * 2) / w;
    const sy = (H - pad * 2) / h;
    state.scale = Math.min(sx, sy, 2);
    state.offsetX = (W - w * state.scale) / 2 - state.minX * state.scale;
    state.offsetY = pad - state.minY * state.scale;
    stats.scale.textContent = state.scale.toFixed(2);
  }

  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let pinchCenter = { x: 0, y: 0 };
  const touches = new Map();

  canvas.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) touches.set(t.identifier, t);
    if (e.touches.length === 2) {
      const [a, b] = [touches.values()].map(() => null);
      const arr = [...touches.values()];
      const ta = arr[0], tb = arr[1];
      pinchStartDist = Math.hypot(ta.clientX - tb.clientX, ta.clientY - tb.clientY);
      pinchStartScale = state.scale;
      pinchCenter = { x: (ta.clientX + tb.clientX) / 2, y: (ta.clientY + tb.clientY) / 2 };
    }
    if (e.touches.length === 1) {
      dragging = true;
      dragMoved = false;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) touches.set(t.identifier, t);
    if (e.touches.length === 2) {
      const arr = [...touches.values()];
      const ta = arr[0], tb = arr[1];
      const d = Math.hypot(ta.clientX - tb.clientX, ta.clientY - tb.clientY);
      const factor = (d / pinchStartDist) * (pinchStartScale / state.scale);
      zoomAt(pinchCenter.x, pinchCenter.y, factor);
    } else if (e.touches.length === 1 && dragging) {
      const t = e.touches[0];
      const dx = t.clientX - lastX;
      const dy = t.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
      state.offsetX += dx;
      state.offsetY += dy;
      lastX = t.clientX;
      lastY = t.clientY;
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) touches.delete(t.identifier);
    if (e.touches.length < 2) {
      pinchStartDist = 0;
    }
    if (e.touches.length === 0) dragging = false;
  });

  async function load() {
    try {
      loadingText.textContent = '正在获取组织数据…';
      const res = await fetch('/api/org', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      loadingText.textContent = '正在解析数据…';
      const flat = await res.json();
      loadingText.textContent = '正在构建树形结构…';
      const { nodes, rootId } = flatToTree(flat);
      loadingText.textContent = '正在计算布局（Buchheim）…';
      const r = layoutTree(nodes, rootId);
      state.nodes = r.nodes;
      state.edges = r.edges;
      state.minX = r.minX; state.maxX = r.maxX;
      state.minY = r.minY; state.maxY = r.maxY;
      state.totalNodes = r.nodes.length;
      state.maxDepth = r.maxDepth;
      stats.total.textContent = state.totalNodes.toLocaleString();
      stats.depth.textContent = state.maxDepth;
      fitView();
      overlay.classList.add('hide');
      requestAnimationFrame(loop);
    } catch (err) {
      console.error(err);
      loadingText.textContent = '加载失败: ' + err.message;
    }
  }

  load();
})();
