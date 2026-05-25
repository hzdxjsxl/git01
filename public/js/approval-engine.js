const ApprovalEngine = (() => {

  function buildApprovalGraph(employees, applicantId, amount, dept) {
    const { graph, empMap } = GraphParser.buildReportingGraph(employees);
    const approvalGraph = new GraphParser.Graph();

    const applicant = empMap.get(applicantId);
    if (!applicant) {
      throw new Error(`未找到申请人: ${applicantId}`);
    }

    approvalGraph.addNode(applicant.id, {
      ...applicant,
      nodeType: 'applicant'
    });

    let currentId = applicantId;
    let currentEmp = applicant;
    const visited = new Set([applicantId]);

    while (currentEmp.manager && currentEmp.manager !== currentEmp.id) {
      const managerId = currentEmp.manager;
      if (visited.has(managerId)) break;

      const manager = empMap.get(managerId);
      if (!manager) break;

      visited.add(managerId);

      const nodeType = manager.approvalLimit >= amount ? 'final_approver' : 'approver';

      approvalGraph.addNode(manager.id, {
        ...manager,
        nodeType: nodeType
      });

      approvalGraph.addEdge(currentId, manager.id,
        manager.approvalLimit >= amount ? `≤￥${amount.toLocaleString()} 终审` : '审批'
      );

      currentId = managerId;
      currentEmp = manager;

      if (manager.approvalLimit >= amount) {
        break;
      }
    }

    const approvalNodes = approvalGraph.getAllNodes();
    const hasFinal = approvalNodes.some(n => n.data.nodeType === 'final_approver');
    if (!hasFinal && currentEmp.manager === null) {
      const topNode = approvalGraph.getNode(currentId);
      if (topNode) {
        topNode.data.nodeType = 'final_approver';
      }
    }

    return approvalGraph;
  }

  function getApprovalChain(graph) {
    const startNodes = graph.getAllNodes().filter(n => n.data.nodeType === 'applicant');
    if (startNodes.length === 0) return [];

    const result = [];
    const visited = new Set();

    const traverse = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = graph.getNode(nodeId);
      result.push(node.data);

      node.outgoing.forEach(edge => {
        traverse(edge.to);
      });
    };

    traverse(startNodes[0].id);
    return result;
  }

  return { buildApprovalGraph, getApprovalChain };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApprovalEngine;
}
