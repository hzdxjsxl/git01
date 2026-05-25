const GraphParser = (() => {

  class Graph {
    constructor() {
      this.nodes = new Map();
      this.edges = [];
    }

    addNode(id, data) {
      if (!this.nodes.has(id)) {
        this.nodes.set(id, { id, data, incoming: [], outgoing: [] });
      }
      return this.nodes.get(id);
    }

    addEdge(fromId, toId, label = '') {
      const fromNode = this.addNode(fromId);
      const toNode = this.addNode(toId);
      const edge = { from: fromId, to: toId, label };
      this.edges.push(edge);
      fromNode.outgoing.push(edge);
      toNode.incoming.push(edge);
    }

    getNode(id) {
      return this.nodes.get(id);
    }

    getAllNodes() {
      return Array.from(this.nodes.values());
    }

    getTopologicalOrder() {
      const visited = new Set();
      const temp = new Set();
      const order = [];

      const visit = (nodeId) => {
        if (visited.has(nodeId)) return;
        if (temp.has(nodeId)) throw new Error('检测到循环依赖，无法进行拓扑排序');
        temp.add(nodeId);
        const node = this.nodes.get(nodeId);
        node.outgoing.forEach(edge => visit(edge.to));
        temp.delete(nodeId);
        visited.add(nodeId);
        order.push(nodeId);
      };

      this.nodes.forEach((_, id) => {
        if (!visited.has(id)) visit(id);
      });

      return order;
    }

    getLongestPaths(startId) {
      const order = this.getTopologicalOrder();
      const dist = new Map();
      const prev = new Map();
      this.nodes.forEach((_, id) => {
        dist.set(id, -Infinity);
        prev.set(id, null);
      });
      dist.set(startId, 0);

      for (const nodeId of order) {
        const node = this.nodes.get(nodeId);
        if (dist.get(nodeId) === -Infinity) continue;
        for (const edge of node.outgoing) {
          const newDist = dist.get(nodeId) + 1;
          if (newDist > dist.get(edge.to)) {
            dist.set(edge.to, newDist);
            prev.set(edge.to, nodeId);
          }
        }
      }

      return { dist, prev };
    }

    getLongestPath(startId, endId) {
      const { dist, prev } = this.getLongestPaths(startId);
      if (dist.get(endId) === -Infinity || dist.get(endId) === undefined) {
        return null;
      }
      const path = [];
      let current = endId;
      while (current !== null) {
        path.unshift(current);
        current = prev.get(current);
      }
      return path;
    }
  }

  function buildReportingGraph(employees) {
    const graph = new Graph();
    const empMap = new Map();

    employees.forEach(emp => {
      empMap.set(emp.id, emp);
      graph.addNode(emp.id, emp);
    });

    employees.forEach(emp => {
      if (emp.manager) {
        graph.addEdge(emp.id, emp.manager, '汇报');
      }
    });

    return { graph, empMap };
  }

  return { Graph, buildReportingGraph };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphParser;
}
