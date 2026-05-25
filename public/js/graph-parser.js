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

    hasNode(id) {
      return this.nodes.has(id);
    }

    addEdge(fromId, toId, label = '', style = {}) {
      const fromNode = this.addNode(fromId);
      const toNode = this.addNode(toId);
      const edge = { from: fromId, to: toId, label, style };
      this.edges.push(edge);
      fromNode.outgoing.push(edge);
      toNode.incoming.push(edge);
      return edge;
    }

    getNode(id) {
      return this.nodes.get(id);
    }

    getAllNodes() {
      return Array.from(this.nodes.values());
    }

    getAllEdges() {
      return [...this.edges];
    }

    getIncomingEdges(nodeId) {
      const node = this.nodes.get(nodeId);
      return node ? node.incoming : [];
    }

    getOutgoingEdges(nodeId) {
      const node = this.nodes.get(nodeId);
      return node ? node.outgoing : [];
    }

    getPredecessors(nodeId) {
      return this.getIncomingEdges(nodeId).map(e => e.from);
    }

    getSuccessors(nodeId) {
      return this.getOutgoingEdges(nodeId).map(e => e.to);
    }

    getSources() {
      return this.getAllNodes().filter(n => n.incoming.length === 0);
    }

    getSinks() {
      return this.getAllNodes().filter(n => n.outgoing.length === 0);
    }

    getTopologicalOrder() {
      const inDegree = new Map();
      this.nodes.forEach((node, id) => {
        inDegree.set(id, node.incoming.length);
      });

      const queue = [];
      inDegree.forEach((deg, id) => {
        if (deg === 0) queue.push(id);
      });

      const order = [];
      while (queue.length > 0) {
        const id = queue.shift();
        order.push(id);
        const node = this.nodes.get(id);
        node.outgoing.forEach(edge => {
          inDegree.set(edge.to, inDegree.get(edge.to) - 1);
          if (inDegree.get(edge.to) === 0) {
            queue.push(edge.to);
          }
        });
      }

      if (order.length !== this.nodes.size) {
        throw new Error('检测到循环依赖');
      }
      return order;
    }

    computeLongestPaths(sourceId) {
      const order = this.getTopologicalOrder();
      const dist = new Map();
      const prev = new Map();

      this.nodes.forEach((_, id) => {
        dist.set(id, -Infinity);
        prev.set(id, null);
      });
      dist.set(sourceId, 0);

      for (const id of order) {
        if (dist.get(id) === -Infinity) continue;
        const node = this.nodes.get(id);
        node.outgoing.forEach(edge => {
          const newDist = dist.get(id) + 1;
          if (newDist > dist.get(edge.to)) {
            dist.set(edge.to, newDist);
            prev.set(edge.to, id);
          }
        });
      }

      return { dist, prev };
    }

    computeAllDepths(sourceId) {
      const { dist } = this.computeLongestPaths(sourceId);
      const depths = new Map();
      dist.forEach((d, id) => {
        depths.set(id, d === -Infinity ? 0 : d);
      });
      return depths;
    }

    findMergePoints() {
      const mergePoints = [];
      this.nodes.forEach(node => {
        const uniquePreds = new Set(node.incoming.map(e => e.from));
        if (uniquePreds.size > 1) {
          mergePoints.push(node.id);
        }
      });
      return mergePoints;
    }

    findBranchPoints() {
      const branchPoints = [];
      this.nodes.forEach(node => {
        const uniqueSuccs = new Set(node.outgoing.map(e => e.to));
        if (uniqueSuccs.size > 1) {
          branchPoints.push(node.id);
        }
      });
      return branchPoints;
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
