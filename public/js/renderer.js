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
        glow: 'rgba(59, 130, 246, 0.4)'
      },
      approver: {
        fill: '#10b981',
        stroke: '#059669',
        text: '#ffffff',
        subText: '#d1fae5',
        glow: 'rgba(16, 185, 129, 0.4)'
      },
      final_approver: {
        fill: '#f59e0b',
        stroke: '#d97706',
        text: '#ffffff',
        subText: '#fef3c7',
        glow: 'rgba(245, 158, 11, 0.4)'
      },
      fork: {
        fill: '#8b5cf6',
        stroke: '#7c3aed',
        text: '#ffffff',
        subText: '#ede9fe',
        glow: 'rgba(139, 92, 246, 0.4)'
      },
      merge: {
        fill: '#ec4899',
        stroke: '#db2777',
        text: '#ffffff',
        subText: '#fce7f3',
        glow: 'rgba(236, 72, 153, 0.4)'
      },
      virtual: {
        fill: 'transparent',
        stroke: 'transparent',
        text: '#64748b',
        subText: '#94a3b8',
        glow: 'transparent'
      }
    };
    return colors[nodeType] || colors.approver;
  }

  function drawVirtualNode(ctx, coord) {
    ctx.save();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(coord.x, coord.y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawApprovalNode(ctx, node, coord) {
    const colors = getNodeColors(node.data.nodeType);
    const { left, top, width, height } = coord;
    const radius = 12;

    ctx.save();
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 20;
    createRoundedRect(ctx, left, top, width, height, radius);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    ctx.restore();

    ctx.save();
    createRoundedRect(ctx, left, top, width, height, radius);
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = colors.text;
    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.data.name || node.data.title, left + width / 2, top + 24);

    ctx.fillStyle = colors.subText;
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    if (node.data.title && node.data.nodeType !== 'fork' && node.data.nodeType !== 'merge') {
      ctx.fillText(node.data.title, left + width / 2, top + 44);
    }

    if (node.data.dept && node.data.nodeType !== 'fork' && node.data.nodeType !== 'merge') {
      const limitText = node.data.approvalLimit >= 999999999
        ? '不限'
        : `￥${node.data.approvalLimit.toLocaleString()}`;
      ctx.font = '10px "Microsoft YaHei", sans-serif';
      ctx.fillText(`${node.data.dept} · ${limitText}`, left + width / 2, top + 58);
    }

    const typeLabels = {
      applicant: '申请人',
      approver: '审批人',
      final_approver: '终审人',
      fork: '并行分支',
      merge: '并行汇聚'
    };
    const label = typeLabels[node.data.nodeType];
    if (label) {
      const badgeWidth = 60;
      const badgeHeight = 18;
      const badgeX = left + width - badgeWidth - 6;
      const badgeY = top + 6;

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
      ctx.fill();

      ctx.fillStyle = colors.text;
      ctx.font = 'bold 10px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
    }
  }

  function drawArrowHead(ctx, x, y, angle, color, size = 10) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 2.5);
    ctx.lineTo(-size, size / 2.5);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawEdge(ctx, fromCoord, toCoord, label, edgeStyle) {
    const color = edgeStyle.color || '#94a3b8';
    const isDashed = edgeStyle.dashed || false;
    const fromX = fromCoord.x;
    const fromY = fromCoord.top;
    const toX = toCoord.x;
    const toY = toCoord.top + toCoord.height;

    const dx = toX - fromX;
    const midY = (fromY + toY) / 2;

    ctx.save();

    if (isDashed) {
      ctx.setLineDash([8, 6]);
    }

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);

    if (Math.abs(dx) < 20) {
      ctx.lineTo(fromX, fromY - 15);
      ctx.lineTo(toX, fromY - 15);
      ctx.lineTo(toX, toY);
    } else {
      const controlY1 = fromY - 25;
      const controlY2 = toY + 25;

      ctx.bezierCurveTo(
        fromX, controlY1,
        toX, controlY2,
        toX, toY
      );
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const angle = Math.atan2(toY - midY, toX - fromX);
    drawArrowHead(ctx, toX, toY, angle, color, 12);

    if (label) {
      ctx.save();
      const labelY = Math.min(fromY - 15, midY);
      const padding = 8;

      ctx.font = '11px "Microsoft YaHei", sans-serif';
      const textWidth = ctx.measureText(label).width;
      const labelWidth = textWidth + padding * 2;
      const labelHeight = 22;
      const labelX = fromX + (toX - fromX) / 2 - labelWidth / 2;

      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(labelX, labelY - labelHeight / 2, labelWidth, labelHeight, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, fromX + (toX - fromX) / 2, labelY);
      ctx.restore();
    }
  }

  function drawGrid(ctx, width, height) {
    ctx.strokeStyle = '#e8edf3';
    ctx.lineWidth = 0.5;
    const gridSize = 40;

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

  function drawBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function render(ctx, graph, layout, options = {}) {
    const { canvasWidth, canvasHeight, showGrid } = options;
    const { coordinates, virtualNodeIds } = layout;

    drawBackground(ctx, canvasWidth, canvasHeight);

    if (showGrid) {
      drawGrid(ctx, canvasWidth, canvasHeight);
    }

    const drawnEdges = new Set();
    const edgeLabels = new Map();

    graph.getAllEdges().forEach(edge => {
      const key = `${edge.from}->${edge.to}`;
      if (drawnEdges.has(key)) return;

      const fromCoord = coordinates.get(edge.from);
      const toCoord = coordinates.get(edge.to);

      if (fromCoord && toCoord) {
        const fromNode = graph.getNode(edge.from);
        const isFromApplicant = fromNode && fromNode.data.nodeType === 'applicant';

        const edgeStyle = {
          color: isFromApplicant ? '#60a5fa' : '#94a3b8',
          dashed: edge.style.dashed || false
        };

        if (edge.style.color) {
          edgeStyle.color = edge.style.color;
        }

        drawEdge(ctx, fromCoord, toCoord, edge.label, edgeStyle);
        drawnEdges.add(key);
      }
    });

    virtualNodeIds.forEach(vid => {
      const coord = coordinates.get(vid);
      if (coord) {
        drawVirtualNode(ctx, coord);
      }
    });

    graph.getAllNodes().forEach(node => {
      if (node.isVirtual) return;
      const coord = coordinates.get(node.id);
      if (coord) {
        drawApprovalNode(ctx, node, coord);
      }
    });
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Renderer;
}
