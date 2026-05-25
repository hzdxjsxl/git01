const ApprovalEngine = (() => {

  let virtualIdCounter = 0;

  function createVirtualNode(type, data = {}) {
    virtualIdCounter++;
    return {
      id: `__virtual_${type}_${virtualIdCounter}`,
      name: data.name || '',
      dept: data.dept || '',
      title: data.title || '',
      approvalLimit: data.approvalLimit || 0,
      manager: null,
      isVirtual: true,
      nodeType: type
    };
  }

  function buildApprovalGraph(employees, applicantId, amount, options = {}) {
    const graph = new GraphParser.Graph();
    const empMap = new Map();

    employees.forEach(emp => {
      empMap.set(emp.id, emp);
    });

    const applicant = empMap.get(applicantId);
    if (!applicant) {
      throw new Error(`未找到申请人: ${applicantId}`);
    }

    virtualIdCounter = 0;

    graph.addNode(applicant.id, {
      ...applicant,
      nodeType: 'applicant',
      isVirtual: false
    });

    const departments = options.departments || [];
    const requireMultiDept = options.requireMultiDept || false;
    const coApproverDepts = options.coApproverDepts || [];

    const chain = traceReportingChain(applicant, empMap, amount, graph);
    const lastNodeInChain = chain[chain.length - 1];

    if (requireMultiDept && coApproverDepts.length > 0) {
      return buildParallelApprovalGraph(
        graph, applicant, empMap, amount,
        chain, lastNodeInChain, coApproverDepts, employees
      );
    }

    return { graph, applicantNodeId: applicant.id };
  }

  function traceReportingChain(applicant, empMap, amount, graph) {
    const chain = [];
    let currentId = applicant.id;
    let currentEmp = applicant;
    const visited = new Set([applicant.id]);

    chain.push({ id: applicant.id, emp: applicant });

    while (currentEmp.manager && currentEmp.manager !== currentEmp.id) {
      const managerId = currentEmp.manager;
      if (visited.has(managerId)) break;

      const manager = empMap.get(managerId);
      if (!manager) break;

      visited.add(managerId);

      const isFinalApprover = manager.approvalLimit >= amount;

      graph.addNode(manager.id, {
        ...manager,
        nodeType: isFinalApprover ? 'final_approver' : 'approver',
        isVirtual: false
      });

      graph.addEdge(currentId, manager.id, isFinalApprover
        ? `终审 ￥${amount.toLocaleString()}`
        : '审批'
      );

      chain.push({ id: manager.id, emp: manager, isFinalApprover });
      currentId = managerId;
      currentEmp = manager;

      if (isFinalApprover) break;
    }

    if (currentEmp.approvalLimit < amount && currentEmp.manager === null) {
      const topNode = graph.getNode(currentId);
      if (topNode) {
        topNode.data.nodeType = 'final_approver';
      }
    }

    return chain;
  }

  function buildParallelApprovalGraph(
    graph, applicant, empMap, amount,
    chain, lastChainNode, coApproverDepts, employees
  ) {
    const deptHeads = [];
    coApproverDepts.forEach(deptName => {
      const head = employees.find(e => e.dept === deptName && e.deptHead);
      if (head) {
        deptHeads.push(head);
      }
    });

    if (deptHeads.length === 0) {
      return { graph, applicantNodeId: applicant.id };
    }

    const forkNode = createVirtualNode('fork', {
      name: '联合审批',
      title: '并行分支'
    });
    graph.addNode(forkNode.id, forkNode);

    const applicantDeptHead = chain.find(c => c.emp.deptHead && c.emp.dept === applicant.dept);

    if (applicantDeptHead) {
      graph.addEdge(applicantDeptHead.id, forkNode.id, '发起并行', { dashed: true });
    } else {
      graph.addEdge(applicant.id, forkNode.id, '发起并行', { dashed: true });
    }

    const mergeNode = createVirtualNode('merge', {
      name: '审批通过',
      title: '并行汇聚'
    });
    graph.addNode(mergeNode.id, mergeNode);

    deptHeads.forEach(head => {
      graph.addNode(head.id, {
        ...head,
        nodeType: 'approver',
        isVirtual: false
      });

      graph.addEdge(forkNode.id, head.id, `${head.dept}审批`, { color: '#3b82f6' });

      const headChain = traceDeptChain(head, empMap, amount, graph);
      const lastDeptNode = headChain[headChain.length - 1];

      graph.addEdge(lastDeptNode.id, mergeNode.id, '完成', { dashed: true });
    });

    const ceo = employees.find(e => e.title === 'CEO');
    if (ceo) {
      graph.addNode(ceo.id, {
        ...ceo,
        nodeType: 'final_approver',
        isVirtual: false
      });
      graph.addEdge(mergeNode.id, ceo.id, '终审', { color: '#f59e0b' });
    }

    return {
      graph,
      applicantNodeId: applicant.id,
      virtualNodes: { fork: forkNode.id, merge: mergeNode.id }
    };
  }

  function traceDeptChain(head, empMap, amount, graph) {
    const chain = [];
    let currentId = head.id;
    let currentEmp = head;
    const visited = new Set([head.id]);

    chain.push({ id: head.id, emp: head });

    while (currentEmp.manager && currentEmp.manager !== currentEmp.id) {
      const managerId = currentEmp.manager;
      if (visited.has(managerId)) break;

      const manager = empMap.get(managerId);
      if (!manager) break;

      visited.add(managerId);

      const isFinalApprover = manager.approvalLimit >= amount;

      if (!graph.hasNode(manager.id)) {
        graph.addNode(manager.id, {
          ...manager,
          nodeType: isFinalApprover ? 'final_approver' : 'approver',
          isVirtual: false
        });
      }

      graph.addEdge(currentId, manager.id, isFinalApprover
        ? `终审 ￥${amount.toLocaleString()}`
        : '审批'
      );

      chain.push({ id: manager.id, emp: manager, isFinalApprover });
      currentId = managerId;
      currentEmp = manager;

      if (isFinalApprover) break;
    }

    return chain;
  }

  function getApprovalChain(graph, startId) {
    const startNode = graph.getNode(startId);
    if (!startNode) return [];

    const result = [];
    const visited = new Set();

    const traverse = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = graph.getNode(nodeId);
      if (node && !node.data.isVirtual) {
        result.push(node.data);
      }

      const nodeRef = graph.getNode(nodeId);
      if (nodeRef) {
        nodeRef.outgoing.forEach(edge => {
          traverse(edge.to);
        });
      }
    };

    traverse(startId);
    return result;
  }

  return { buildApprovalGraph, getApprovalChain };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApprovalEngine;
}
