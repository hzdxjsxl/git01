const LayoutEngine = (() => {

  function computeNodeDepths(graph, startId) {
    const depths = new Map();
    const queue = [{ id: startId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift();
      if (depths.has(id)) continue;
      depths.set(id, depth);

      const node = graph.getNode(id);
      if (!node) continue;

      node.outgoing.forEach(edge => {
        if (!depths.has(edge.to)) {
          queue.push({ id: edge.to, depth: depth + 1 });
        }
      });
    }

    return depths;
  }

  function assignLayers(graph, startId) {
    const depths = computeNodeDepths(graph, startId);
    const maxDepth = Math.max(...Array.from(depths.values()));

    const layers = new Map();
    for (let i = 0; i <= maxDepth; i++) {
      layers.set(i, []);
    }

    graph.getAllNodes().forEach(node => {
      const depth = depths.get(node.id) || 0;
      layers.get(depth).push(node);
    });

    return { layers, depths, maxDepth };
  }

  function buildAdjacencyMap(graph) {
    const upMap = new Map();
    const downMap = new Map();

    graph.getAllNodes().forEach(node => {
      upMap.set(node.id, new Set());
      downMap.set(node.id, new Set());
    });

    graph.edges.forEach(edge => {
      downMap.get(edge.from).add(edge.to);
      upMap.get(edge.to).add(edge.from);
    });

    return { upMap, downMap };
  }

  function barycenterOrder(layers, { upMap, downMap }, maxDepth) {
    const orderedLayers = new Map();
    layers.forEach((nodes, depth) => {
      orderedLayers.set(depth, [...nodes]);
    });

    const iterations = 10;

    for (let iter = 0; iter < iterations; iter++) {
      for (let depth = 1; depth <= maxDepth; depth++) {
        const currentLayer = orderedLayers.get(depth);
        const prevLayer = orderedLayers.get(depth - 1);

        if (currentLayer.length <= 1) continue;

        const barycenters = currentLayer.map(node => {
          const neighbors = [...upMap.get(node.id)];
          if (neighbors.length === 0) {
            return { node, bc: currentLayer.indexOf(node) };
          }

          let sum = 0;
          neighbors.forEach(nId => {
            const idx = prevLayer.findIndex(n => n.id === nId);
            sum += idx >= 0 ? idx : 0;
          });
          return { node, bc: sum / neighbors.length };
        });

        barycenters.sort((a, b) => a.bc - b.bc);
        orderedLayers.set(depth, barycenters.map(b => b.node));
      }

      for (let depth = maxDepth - 1; depth >= 0; depth--) {
        const currentLayer = orderedLayers.get(depth);
        const nextLayer = orderedLayers.get(depth + 1);

        if (currentLayer.length <= 1) continue;

        const barycenters = currentLayer.map(node => {
          const neighbors = [...downMap.get(node.id)];
          if (neighbors.length === 0) {
            return { node, bc: currentLayer.indexOf(node) };
          }

          let sum = 0;
          neighbors.forEach(nId => {
            const idx = nextLayer.findIndex(n => n.id === nId);
            sum += idx >= 0 ? idx : 0;
          });
          return { node, bc: sum / neighbors.length };
        });

        barycenters.sort((a, b) => a.bc - b.bc);
        orderedLayers.set(depth, barycenters.map(b => b.node));
      }
    }

    return orderedLayers;
  }

  function countCrossings(layer1, layer2, adjacency) {
    const positions = new Map();
    layer1.forEach((node, i) => positions.set(node.id, i));
    layer2.forEach((node, i) => positions.set(node.id, i));

    let crossings = 0;
    for (let i = 0; i < layer2.length; i++) {
      const node1 = layer2[i];
      const neighbors1 = [...adjacency.get(node1.id)];

      for (let j = i + 1; j < layer2.length; j++) {
        const node2 = layer2[j];
        const neighbors2 = [...adjacency.get(node2.id)];

        for (const n1 of neighbors1) {
          for (const n2 of neighbors2) {
            const p1 = positions.get(n1);
            const p2 = positions.get(n2);
            if (p1 !== undefined && p2 !== undefined && p1 > p2) {
              crossings++;
            }
          }
        }
      }
    }

    return crossings;
  }

  function assignCoordinates(orderedLayers, maxDepth, options) {
    const { nodeWidth, nodeHeight, hSpacing, vSpacing, canvasWidth, padding } = options;
    const coords = new Map();

    const totalHeight = maxDepth * (nodeHeight + vSpacing) + padding * 2;

    for (let depth = 0; depth <= maxDepth; depth++) {
      const layer = orderedLayers.get(depth);
      const y = padding + depth * (nodeHeight + vSpacing);

      const count = layer.length;
      const totalWidth = count * nodeWidth + (count - 1) * hSpacing;
      const startX = (canvasWidth - totalWidth) / 2;

      layer.forEach((node, i) => {
        const x = startX + i * (nodeWidth + hSpacing);
        coords.set(node.id, {
          x: x + nodeWidth / 2,
          y: y + nodeHeight / 2,
          width: nodeWidth,
          height: nodeHeight,
          left: x,
          top: y,
          depth: depth
        });
      });
    }

    return { coords, totalHeight };
  }

  function computeLayout(graph, startId, options = {}) {
    const opts = {
      nodeWidth: 180,
      nodeHeight: 70,
      hSpacing: 40,
      vSpacing: 60,
      canvasWidth: options.canvasWidth || 800,
      padding: 50,
      ...options
    };

    const { layers, depths, maxDepth } = assignLayers(graph, startId);

    if (maxDepth === 0) {
      const nodes = layers.get(0);
      const coords = new Map();
      const x = (opts.canvasWidth - opts.nodeWidth) / 2;
      nodes.forEach(node => {
        coords.set(node.id, {
          x: x + opts.nodeWidth / 2,
          y: opts.padding + opts.nodeHeight / 2,
          width: opts.nodeWidth,
          height: opts.nodeHeight,
          left: x,
          top: opts.padding,
          depth: 0
        });
      });
      return {
        coordinates: coords,
        totalHeight: opts.padding * 2 + opts.nodeHeight,
        nodeDepths: depths,
        maxDepth: 0
      };
    }

    const adjacency = buildAdjacencyMap(graph);

    let orderedLayers = barycenterOrder(layers, adjacency, maxDepth);

    let bestLayers = orderedLayers;
    let minCrossings = Infinity;

    for (let trial = 0; trial < 20; trial++) {
      const shuffled = new Map();
      orderedLayers.forEach((nodes, depth) => {
        shuffled.set(depth, [...nodes].sort(() => Math.random() - 0.5));
      });
      const refined = barycenterOrder(shuffled, adjacency, maxDepth);

      let totalCrossings = 0;
      for (let d = 0; d < maxDepth; d++) {
        totalCrossings += countCrossings(
          refined.get(d),
          refined.get(d + 1),
          adjacency.upMap
        );
      }

      if (totalCrossings < minCrossings) {
        minCrossings = totalCrossings;
        bestLayers = refined;
      }
    }

    const { coords, totalHeight } = assignCoordinates(bestLayers, maxDepth, {
      nodeWidth: opts.nodeWidth,
      nodeHeight: opts.nodeHeight,
      hSpacing: opts.hSpacing,
      vSpacing: opts.vSpacing,
      canvasWidth: opts.canvasWidth,
      padding: opts.padding
    });

    return {
      coordinates: coords,
      totalHeight,
      nodeDepths: depths,
      maxDepth
    };
  }

  return { computeLayout, computeNodeDepths };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LayoutEngine;
}
