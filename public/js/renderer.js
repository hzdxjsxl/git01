const Renderer = (() => {

  function createRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function getNodeColors(nodeType) {
    const colors = {
      applicant: {
        fill: '#3b82f6',
        stroke: '#1d4ed8',
        text: '#ffffff',
        subText: '#dbeafe',
        glow: 'rgba(59, 130, 246, 0.3)'
      },
      approver: {
        fill: '#10b981',
        stroke: '#059669',
        text: '#ffffff',
        subText: '#d1fae5',
        glow: 'rgba(16, 185, 129, 0.3)'
      },
      final_approver: {
        fill: '#f59e0b',
        stroke: '#d97706',
        text: '#ffffff',
        subText: '#fef3c7',
        glow: 'rgba(245, 158, 11, 0.3)'
      }
    };
    return colors[nodeType] || colors.approver;
  }

  function drawNode(ctx, node, coord) {
    const colors = getNodeColors(node.data.nodeType);
    const { left, top, width, height } = coord;
    const radius = 10;

    ctx.save();
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 15;
    createRoundedRect(ctx, left, top, width, height, radius);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.restore();

    ctx.save();
    createRoundedRect(ctx, left, top, width, height, radius);
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = colors.text;
    ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.data.name, left + width / 2, top + 22);

    ctx.fillStyle = colors.subText;
    ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.fillText(node.data.title, left + width / 2, top + 40);

    const limitText = node.data.approvalLimit >= 999999999
      ? '不限'
      : `￥${node.data.approvalLimit.toLocaleString()}`;
    ctx.font = '10px "Microsoft YaHei", sans-serif';
    ctx.fillText(`${node.data.dept} · 限额: ${limitText}`, left + width / 2, top + 55);

    const typeLabels = {
      applicant: '申请人',
      approver: '审批人',
      final_approver: '终审人'
    };
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 10px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(typeLabels[node.data.nodeType] || '', left + width - 8, top + 14);
  }

  function drawArrowHead(ctx, x, y, angle, color) {
    const size = 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 2);
    ctx.lineTo(-size, size / 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawEdge(ctx, fromCoord, toCoord, label, edgeColor) {
    const color = edgeColor || '#94a3b8';
    const fromX = fromCoord.x;
    const fromY = fromCoord.top;
    const toX = toCoord.x;
    const toY = toCoord.top + toCoord.height;

    const controlY1 = fromY - 20;
    const controlY2 = toY + 20;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.bezierCurveTo(fromX, controlY1, toX, controlY2, toX, toY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    const midX = (fromX + toX) / 2;
    const midY = (controlY1 + controlY2) / 2;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    drawArrowHead(ctx, toX, toY, angle, color);

    if (label) {
      const labelWidth = ctx.measureText(label).width;
      ctx.font = '11px "Microsoft YaHei", sans-serif';
      const padding = 6;
      const labelHeight = 20;

      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;

      const textWidth = ctx.measureText(label).width + padding * 2;
      ctx.beginPath();
      ctx.roundRect(midX - textWidth / 2, midY - labelHeight / 2, textWidth, labelHeight, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, midX, midY);
    }
  }

  function drawGrid(ctx, width, height) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridSize = 30;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function render(ctx, graph, layout, options = {}) {
    const { canvasWidth, canvasHeight } = options;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (options.showGrid) {
      drawGrid(ctx, canvasWidth, canvasHeight);
    }

    const { coordinates } = layout;

    const drawnEdges = new Set();
    graph.edges.forEach(edge => {
      const key = `${edge.from}->${edge.to}`;
      if (drawnEdges.has(key)) return;
      drawnEdges.add(key);

      const fromCoord = coordinates.get(edge.from);
      const toCoord = coordinates.get(edge.to);

      if (fromCoord && toCoord) {
        const fromNode = graph.getNode(edge.from);
        const edgeColor = fromNode && fromNode.data.nodeType === 'applicant'
          ? '#60a5fa'
          : '#94a3b8';
        drawEdge(ctx, fromCoord, toCoord, edge.label, edgeColor);
      }
    });

    graph.getAllNodes().forEach(node => {
      const coord = coordinates.get(node.id);
      if (coord) {
        drawNode(ctx, node, coord);
      }
    });
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Renderer;
}
