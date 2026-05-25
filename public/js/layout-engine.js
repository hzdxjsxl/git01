const LayoutEngine = (() => {

  function assignLayers(graph, sourceId) {
    const depths = graph.computeAllDepths(sourceId);
    const maxDepth = Math.max(...Array.from(depths.values()), 0);

    const layers = new Map();
    for (let i = 0; i <= maxDepth; i++) {
      layers.set(i, []);
    }

    graph.getAllNodes().forEach(node => {
      const depth = depths.get(node.id) || 0;
      if (!layers.has(depth)) {
        layers.set(depth, []);
      }
      layers.get(depth).push(node);
    });

    for (let d = 0; d <= maxDepth; d++) {
      if (!layers.has(d) || layers.get(d).length === 0) {
        layers.set(d, []);
      }
    }

    return { layers, depths, maxDepth };
  }

  function insertVirtualNodes(graph, layers, depths) {
    const maxDepth = Math.max(...Array.from(layers.keys()));
    const virtualNodes = [];
    const edgesToRemove = [];

    graph.getAllEdges().forEach(edge => {
      const fromDepth = depths.get(edge.from);
      const toDepth = depths.get(edge.to);

      if (fromDepth === undefined || toDepth === undefined) return;

      if (toDepth - fromDepth > 1) {
        edgesToRemove.push(edge);

        let prevId = edge.from;
        for (let d = fromDepth + 1; d < toDepth; d++) {
          const virtId = `__virt_${edge.from}_${edge.to}_${d}`;
          const virtNode = {
            id: virtId,
            isVirtual: true,
            data: {
              isVirtual: true,
              nodeType: 'virtual',
              name: '',
              title: '',
              dept: ''
            },
            incoming: [],
            outgoing: []
          };

          graph.nodes.set(virtId, virtNode);
          virtualNodes.push({ id: virtId, depth: d });

          graph.addEdge(prevId, virtId, '', { isLongEdgeSegment: true, originalEdge: edge });
          prevId = virtId;
          depths.set(virtId, d);
        }

        graph.addEdge(prevId, edge.to, '', { isLongEdgeSegment: true, originalEdge: edge });
      }
    });

    edgesToRemove.forEach(edge => {
      graph.edges = graph.edges.filter(e => e !== edge);
      const fromNode = graph.getNode(edge.from);
      const toNode = graph.getNode(edge.to);
      if (fromNode) {
        fromNode.outgoing = fromNode.outgoing.filter(e => e !== edge);
      }
      if (toNode) {
        toNode.incoming = toNode.incoming.filter(e => e !== edge);
      }
    });

    virtualNodes.forEach(vn => {
      if (!layers.has(vn.depth)) {
        layers.set(vn.depth, []);
      }
      const node = graph.getNode(vn.id);
      if (node) {
        layers.get(vn.depth).push(node);
      }
    });

    return { virtualNodes };
  }

  function computeBarycenter(nodeId, adjLayer, adjMap) {
    const neighbors = adjMap.get(nodeId) || [];
    if (neighbors.length === 0) return -1;

    let sum = 0;
    neighbors.forEach(nId => {
      const idx = adjLayer.findIndex(n => n.id === nId);
      sum += idx >= 0 ? idx : 0;
    });
    return sum / neighbors.length;
  }

  function sortLayerByBarycenter(layer, adjLayer, adjMap) {
    const sorted = [...layer].map((node, idx) => ({
      node,
      bc: computeBarycenter(node.id, adjLayer, adjMap)
    }));

    sorted.sort((a, b) => {
      if (a.bc === -1 && b.bc === -1) return 0;
      if (a.bc === -1) return 1;
      if (b.bc === -1) return -1;
      return a.bc - b.bc;
    });

    return sorted.map(s => s.node);
  }

  function countLayerCrossings(layer1, layer2, upMap) {
    const positions = new Map();
    layer2.forEach((node, i) => positions.set(node.id, i));

    let crossings = 0;
    for (let i = 0; i < layer2.length; i++) {
      const node1 = layer2[i];
      const preds1 = upMap.get(node1.id) || [];

      for (let j = i + 1; j < layer2.length; j++) {
        const node2 = layer2[j];
        const preds2 = upMap.get(node2.id) || [];

        for (const p1 of preds1) {
          for (const p2 of preds2) {
            const pos1 = positions.get(p1);
            const pos2 = positions.get(p2);
            if (pos1 !== undefined && pos2 !== undefined && pos1 > pos2) {
              crossings++;
            }
          }
        }
      }
    }

    return crossings;
  }

  function buildAdjacencyMaps(graph) {
    const upMap = new Map();
    const downMap = new Map();

    graph.getAllNodes().forEach(node => {
      upMap.set(node.id, new Set());
      downMap.set(node.id, new Set());
    });

    graph.getAllEdges().forEach(edge => {
      downMap.get(edge.from).add(edge.to);
      upMap.get(edge.to).add(edge.from);
    });

    return { upMap, downMap };
  }

  function minimizeCrossings(graph, layers, maxDepth, iterations = 20) {
    const { upMap, downMap } = buildAdjacencyMaps(graph);
    const orderedLayers = new Map();

    layers.forEach((nodes, depth) => {
      orderedLayers.set(depth, [...nodes]);
    });

    let bestLayers = new Map();
    orderedLayers.forEach((nodes, depth) => {
      bestLayers.set(depth, [...nodes]);
    });

    let minCrossings = computeTotalCrossings(orderedLayers, maxDepth, upMap);

    for (let iter = 0; iter < iterations; iter++) {
      for (let depth = 1; depth <= maxDepth; depth++) {
        const currentLayer = orderedLayers.get(depth) || [];
        const prevLayer = orderedLayers.get(depth - 1) || [];
        if (currentLayer.length > 1) {
          const sorted = sortLayerByBarycenter(currentLayer, prevLayer, upMap);
          orderedLayers.set(depth, sorted);
        }
      }

      for (let depth = maxDepth - 1; depth >= 0; depth--) {
        const currentLayer = orderedLayers.get(depth) || [];
        const nextLayer = orderedLayers.get(depth + 1) || [];
        if (currentLayer.length > 1) {
          const sorted = sortLayerByBarycenter(currentLayer, nextLayer, downMap);
          orderedLayers.set(depth, sorted);
        }
      }

      const totalCrossings = computeTotalCrossings(orderedLayers, maxDepth, upMap);
      if (totalCrossings < minCrossings) {
        minCrossings = totalCrossings;
        bestLayers = new Map();
        orderedLayers.forEach((nodes, depth) => {
          bestLayers.set(depth, [...nodes]);
        });
      }
    }

    for (let trial = 0; trial < 30; trial++) {
      const shuffled = new Map();
      orderedLayers.forEach((nodes, depth) => {
        shuffled.set(depth, [...nodes].sort(() => Math.random() - 0.5));
      });

      for (let iter = 0; iter < 5; iter++) {
        for (let depth = 1; depth <= maxDepth; depth++) {
          const currentLayer = shuffled.get(depth) || [];
          const prevLayer = shuffled.get(depth - 1) || [];
          if (currentLayer.length > 1) {
            shuffled.set(depth, sortLayerByBarycenter(currentLayer, prevLayer, upMap));
          }
        }
        for (let depth = maxDepth - 1; depth >= 0; depth--) {
          const currentLayer = shuffled.get(depth) || [];
          const nextLayer = shuffled.get(depth + 1) || [];
          if (currentLayer.length > 1) {
            shuffled.set(depth, sortLayerByBarycenter(currentLayer, nextLayer, downMap));
          }
        }
      }

      const totalCrossings = computeTotalCrossings(shuffled, maxDepth, upMap);
      if (totalCrossings < minCrossings) {
        minCrossings = totalCrossings;
        bestLayers = new Map();
        shuffled.forEach((nodes, depth) => {
          bestLayers.set(depth, [...nodes]);
        });
      }
    }

    return { orderedLayers: bestLayers, totalCrossings: minCrossings };
  }

  function computeTotalCrossings(orderedLayers, maxDepth, upMap) {
    let total = 0;
    for (let d = 0; d < maxDepth; d++) {
      total += countLayerCrossings(
        orderedLayers.get(d) || [],
        orderedLayers.get(d + 1) || [],
        upMap
      );
    }
    return total;
  }

  function assignCoordinates(orderedLayers, maxDepth, options) {
    const { nodeWidth, nodeHeight, hSpacing, vSpacing, canvasWidth, padding } = options;
    const coords = new Map();

    let maxLayerWidth = 0;
    orderedLayers.forEach(nodes => {
      const w = nodes.length * nodeWidth + Math.max(0, nodes.length - 1) * hSpacing;
      if (w > maxLayerWidth) maxLayerWidth = w;
    });

    const contentWidth = Math.max(canvasWidth - padding * 2, maxLayerWidth);
    const actualCanvasWidth = contentWidth + padding * 2;

    for (let depth = 0; depth <= maxDepth; depth++) {
      const layer = orderedLayers.get(depth) || [];
      const y = padding + depth * (nodeHeight + vSpacing);
      const count = layer.length;

      const totalWidth = count * nodeWidth + Math.max(0, count - 1) * hSpacing;
      const startX = (actualCanvasWidth - totalWidth) / 2;

      layer.forEach((node, i) => {
        const x = startX + i * (nodeWidth + hSpacing);
        coords.set(node.id, {
          x: x + nodeWidth / 2,
          y: y + nodeHeight / 2,
          left: x,
          top: y,
          width: node.isVirtual ? 20 : nodeWidth,
          height: node.isVirtual ? 20 : nodeHeight,
          depth: depth,
          isVirtual: node.isVirtual
        });
      });
    }

    const totalHeight = (maxDepth + 1) * (nodeHeight + vSpacing) + padding * 2;
    return { coords, totalHeight, actualCanvasWidth };
  }

  function computeLayout(graph, sourceId, options = {}) {
    const opts = {
      nodeWidth: 180,
      nodeHeight: 70,
      hSpacing: 30,
      vSpacing: 80,
      canvasWidth: options.canvasWidth || 900,
      padding: 60,
      ...options
    };

    const { layers, depths, maxDepth } = assignLayers(graph, sourceId);

    if (maxDepth === 0) {
      const nodes = layers.get(0) || [];
      const coords = new Map();
      const x = (opts.canvasWidth - opts.nodeWidth) / 2;
      nodes.forEach(node => {
        coords.set(node.id, {
          x: x + opts.nodeWidth / 2,
          y: opts.padding + opts.nodeHeight / 2,
          left: x,
          top: opts.padding,
          width: opts.nodeWidth,
          height: opts.nodeHeight,
          depth: 0,
          isVirtual: false
        });
      });
      return {
        coordinates: coords,
        totalHeight: opts.padding * 2 + opts.nodeHeight,
        canvasWidth: opts.canvasWidth,
        virtualNodeIds: []
      };
    }

    insertVirtualNodes(graph, layers, depths);
    const virtualNodeIds = graph.getAllNodes()
      .filter(n => n.isVirtual)
      .map(n => n.id);

    const { orderedLayers } = minimizeCrossings(graph, layers, maxDepth);

    const { coords, totalHeight, actualCanvasWidth } = assignCoordinates(
      orderedLayers, maxDepth, {
        nodeWidth: opts.nodeWidth,
        nodeHeight: opts.nodeHeight,
        hSpacing: opts.hSpacing,
        vSpacing: opts.vSpacing,
        canvasWidth: opts.canvasWidth,
        padding: opts.padding
      }
    );

    return {
      coordinates: coords,
      totalHeight,
      canvasWidth: actualCanvasWidth,
      virtualNodeIds
    };
  }

  return { computeLayout };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LayoutEngine;
}
