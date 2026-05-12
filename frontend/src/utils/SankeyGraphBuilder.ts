export interface ClickRecord {
  sessionId: string;
  pagePath: string;
  timestamp: number;
  sequence: number;
}

export interface GraphNode {
  id: string;
  name: string;
  pagePath: string;
  value: number;
  inDegree: number;
  outDegree: number;
  level?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
  sourcePage: string;
  targetPage: string;
}

export interface GraphResult {
  nodes: GraphNode[];
  links: GraphLink[];
  totalSessions: number;
  totalRecords: number;
  cyclesBroken: number;
  cyclesDetected: number;
}

export interface GraphBuilderOptions {
  maxSteps?: number;
  minLinkValue?: number;
  startPage?: string;
  endPage?: string;
  cycleRemovalStrategy?: 'remove_weakest' | 'remove_backward' | 'split_node';
  enableDagEnforcement?: boolean;
}

interface CycleInfo {
  nodes: string[];
  backwardLinks: GraphLink[];
  totalWeight: number;
}

export class SankeyGraphBuilder {
  private records: ClickRecord[] = [];
  private sessionPaths: Map<string, ClickRecord[]> = new Map();
  private options: GraphBuilderOptions;

  constructor(options: GraphBuilderOptions = {}) {
    this.options = {
      maxSteps: options.maxSteps || 10,
      minLinkValue: options.minLinkValue || 0,
      startPage: options.startPage,
      endPage: options.endPage,
      cycleRemovalStrategy: options.cycleRemovalStrategy || 'remove_backward',
      enableDagEnforcement: options.enableDagEnforcement !== false
    };
  }

  public addRecords(newRecords: ClickRecord[]): void {
    this.records.push(...newRecords);
    this.groupBySession(newRecords);
  }

  public clear(): void {
    this.records = [];
    this.sessionPaths.clear();
  }

  private groupBySession(newRecords: ClickRecord[]): void {
    for (const record of newRecords) {
      if (!this.sessionPaths.has(record.sessionId)) {
        this.sessionPaths.set(record.sessionId, []);
      }
      this.sessionPaths.get(record.sessionId)!.push(record);
    }

    for (const [sessionId, records] of this.sessionPaths) {
      records.sort((a, b) => {
        if (a.sequence !== b.sequence) {
          return a.sequence - b.sequence;
        }
        return a.timestamp - b.timestamp;
      });
      this.sessionPaths.set(sessionId, records);
    }
  }

  public buildGraph(): GraphResult {
    const nodeMap: Map<string, GraphNode> = new Map();
    const linkMap: Map<string, GraphLink> = new Map();

    for (const [sessionId, records] of this.sessionPaths) {
      this.processSessionPath(records, nodeMap, linkMap);
    }

    let links = Array.from(linkMap.values());
    if (this.options.minLinkValue! > 0) {
      links = links.filter(link => link.value >= this.options.minLinkValue!);
    }

    let cyclesDetected = 0;
    let cyclesBroken = 0;

    if (this.options.enableDagEnforcement) {
      const dagResult = this.enforceDag(links, nodeMap);
      links = dagResult.links;
      cyclesDetected = dagResult.cyclesDetected;
      cyclesBroken = dagResult.cyclesBroken;
    }

    const activeNodeIds: Set<string> = new Set();
    for (const link of links) {
      activeNodeIds.add(link.source);
      activeNodeIds.add(link.target);
    }

    let nodes = Array.from(nodeMap.values())
      .filter(node => activeNodeIds.has(node.id))
      .filter(node => node.value > 0);

    if (this.options.startPage) {
      const startNode = nodeMap.get(this.getNodeId(this.options.startPage));
      if (startNode) {
        const reachableNodes = this.findReachableNodesDag(startNode.id, links, new Set());
        nodes = nodes.filter(n => reachableNodes.has(n.id));
        links = links.filter(l => reachableNodes.has(l.source) && reachableNodes.has(l.target));
      }
    }

    return {
      nodes,
      links,
      totalSessions: this.sessionPaths.size,
      totalRecords: this.records.length,
      cyclesDetected,
      cyclesBroken
    };
  }

  private enforceDag(
    links: GraphLink[],
    nodeMap: Map<string, GraphNode>
  ): { links: GraphLink[]; cyclesDetected: number; cyclesBroken: number } {
    let workingLinks = [...links];
    let totalCyclesDetected = 0;
    let totalCyclesBroken = 0;
    let iterations = 0;
    const maxIterations = 100;

    const nodeIds = Array.from(nodeMap.keys());
    const levels = this.assignTopologicalLevels(nodeIds, workingLinks);

    for (const [nodeId, level] of levels) {
      const node = nodeMap.get(nodeId);
      if (node) {
        node.level = level;
      }
    }

    while (iterations < maxIterations) {
      iterations++;
      
      const cycles = this.detectAllCycles(workingLinks, nodeIds);
      if (cycles.length === 0) break;

      totalCyclesDetected += cycles.length;

      for (const cycle of cycles) {
        const linkToRemove = this.selectLinkToRemove(cycle, levels);
        
        if (linkToRemove) {
          const index = workingLinks.findIndex(
            l => l.source === linkToRemove.source && l.target === linkToRemove.target
          );
          
          if (index !== -1) {
            const removed = workingLinks.splice(index, 1)[0];
            totalCyclesBroken++;

            if (nodeMap.has(removed.source)) {
              nodeMap.get(removed.source)!.outDegree--;
            }
            if (nodeMap.has(removed.target)) {
              nodeMap.get(removed.target)!.inDegree--;
            }
          }
        }
      }
    }

    return {
      links: workingLinks,
      cyclesDetected: totalCyclesDetected,
      cyclesBroken: totalCyclesBroken
    };
  }

  private assignTopologicalLevels(
    nodeIds: string[],
    links: GraphLink[]
  ): Map<string, number> {
    const levels = new Map<string, number>();
    const inDegreeCount = new Map<string, number>();
    const outgoingEdges = new Map<string, GraphLink[]>();

    for (const nodeId of nodeIds) {
      levels.set(nodeId, 0);
      inDegreeCount.set(nodeId, 0);
      outgoingEdges.set(nodeId, []);
    }

    for (const link of links) {
      outgoingEdges.get(link.source)!.push(link);
      inDegreeCount.set(link.target, (inDegreeCount.get(link.target) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegreeCount) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const visited = new Set<string>();
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const outgoing = outgoingEdges.get(nodeId) || [];
      for (const link of outgoing) {
        const currentLevel = levels.get(link.target) || 0;
        const newLevel = (levels.get(link.source) || 0) + 1;
        
        if (newLevel > currentLevel) {
          levels.set(link.target, newLevel);
        }

        const remaining = (inDegreeCount.get(link.target) || 0) - 1;
        inDegreeCount.set(link.target, remaining);
        
        if (remaining === 0) {
          queue.push(link.target);
        }
      }
    }

    const maxLevel = Math.max(...Array.from(levels.values()), 0);
    for (const [nodeId, level] of levels) {
      if (!visited.has(nodeId)) {
        levels.set(nodeId, maxLevel + 1);
      }
    }

    return levels;
  }

  private detectAllCycles(
    links: GraphLink[],
    nodeIds: string[]
  ): CycleInfo[] {
    const cycles: CycleInfo[] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const outgoing = new Map<string, GraphLink[]>();
    for (const link of links) {
      if (!outgoing.has(link.source)) {
        outgoing.set(link.source, []);
      }
      outgoing.get(link.source)!.push(link);
    }

    const dfs = (
      nodeId: string,
      path: string[],
      pathLinks: GraphLink[]
    ): boolean => {
      if (recStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1) {
          const cycleNodes = path.slice(cycleStart);
          const cycleLinks = pathLinks.slice(cycleStart);
          
          const totalWeight = cycleLinks.reduce((sum, l) => sum + l.value, 0);
          
          const existingCycle = cycles.find(c => 
            this.cyclesEqual(c.nodes, cycleNodes)
          );
          
          if (!existingCycle) {
            cycles.push({
              nodes: cycleNodes,
              backwardLinks: cycleLinks,
              totalWeight
            });
          }
        }
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const nodeOutgoing = outgoing.get(nodeId) || [];
      for (const link of nodeOutgoing) {
        pathLinks.push(link);
        if (dfs(link.target, path, pathLinks)) {
        }
        pathLinks.pop();
      }

      recStack.delete(nodeId);
      path.pop();
      
      return false;
    };

    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, [], []);
      }
    }

    return cycles;
  }

  private cyclesEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    
    return sortedA.every((v, i) => v === sortedB[i]);
  }

  private selectLinkToRemove(
    cycle: CycleInfo,
    levels: Map<string, number>
  ): GraphLink | null {
    if (cycle.backwardLinks.length === 0) return null;

    const strategy = this.options.cycleRemovalStrategy;

    if (strategy === 'remove_weakest') {
      return [...cycle.backwardLinks].sort((a, b) => a.value - b.value)[0];
    }

    if (strategy === 'remove_backward') {
      let bestCandidate: GraphLink | null = null;
      let bestBackwardScore = Infinity;

      for (const link of cycle.backwardLinks) {
        const sourceLevel = levels.get(link.source) || 0;
        const targetLevel = levels.get(link.target) || 0;
        const backwardScore = sourceLevel - targetLevel;

        if (backwardScore < bestBackwardScore) {
          bestBackwardScore = backwardScore;
          bestCandidate = link;
        }
      }

      if (bestCandidate && bestBackwardScore <= 0) {
        return bestCandidate;
      }

      return [...cycle.backwardLinks].sort((a, b) => a.value - b.value)[0];
    }

    return [...cycle.backwardLinks].sort((a, b) => a.value - b.value)[0];
  }

  private findReachableNodesDag(
    startId: string,
    links: GraphLink[],
    visited: Set<string>
  ): Set<string> {
    if (visited.has(startId)) return visited;
    visited.add(startId);

    const outgoing = links.filter(l => l.source === startId);
    for (const link of outgoing) {
      this.findReachableNodesDag(link.target, links, visited);
    }

    return visited;
  }

  private processSessionPath(
    records: ClickRecord[],
    nodeMap: Map<string, GraphNode>,
    linkMap: Map<string, GraphLink>
  ): void {
    if (records.length < 2) return;

    const maxSteps = this.options.maxSteps!;
    const path: ClickRecord[] = [];
    const visitedNodes = new Map<string, number>();
    const sessionCycleNodes = new Set<string>();

    for (const record of records) {
      if (path.length === 0 || record.pagePath !== path[path.length - 1].pagePath) {
        if (visitedNodes.has(record.pagePath)) {
          sessionCycleNodes.add(record.pagePath);
          visitedNodes.set(record.pagePath, visitedNodes.get(record.pagePath)! + 1);
        } else {
          visitedNodes.set(record.pagePath, 1);
        }
        path.push(record);
      }
    }

    if (path.length < 2) return;

    const effectiveLength = Math.min(path.length, maxSteps + 1);

    for (let i = 0; i < effectiveLength - 1; i++) {
      const source = path[i];
      const target = path[i + 1];

      if (source.pagePath === target.pagePath) continue;

      const sourceNodeId = this.getNodeId(source.pagePath);
      const targetNodeId = this.getNodeId(target.pagePath);

      if (!nodeMap.has(sourceNodeId)) {
        nodeMap.set(sourceNodeId, this.createNode(source.pagePath));
      }
      if (!nodeMap.has(targetNodeId)) {
        nodeMap.set(targetNodeId, this.createNode(target.pagePath));
      }

      const sourceNode = nodeMap.get(sourceNodeId)!;
      const targetNode = nodeMap.get(targetNodeId)!;

      sourceNode.value++;
      sourceNode.outDegree++;
      targetNode.value++;
      targetNode.inDegree++;

      const linkKey = `${sourceNodeId}->${targetNodeId}`;
      if (!linkMap.has(linkKey)) {
        linkMap.set(linkKey, {
          source: sourceNodeId,
          target: targetNodeId,
          value: 0,
          sourcePage: source.pagePath,
          targetPage: target.pagePath
        });
      }
      linkMap.get(linkKey)!.value++;
    }

    const lastRecord = path[effectiveLength - 1];
    const lastNodeId = this.getNodeId(lastRecord.pagePath);
    if (!nodeMap.has(lastNodeId)) {
      nodeMap.set(lastNodeId, this.createNode(lastRecord.pagePath));
    }
    nodeMap.get(lastNodeId)!.value++;
  }

  private getNodeId(pagePath: string): string {
    return pagePath;
  }

  private createNode(pagePath: string): GraphNode {
    return {
      id: pagePath,
      name: this.formatPageName(pagePath),
      pagePath,
      value: 0,
      inDegree: 0,
      outDegree: 0,
      level: 0
    };
  }

  private formatPageName(path: string): string {
    if (path === '/home') return '首页';
    if (path === '/products') return '产品中心';
    if (path === '/products/list') return '产品列表';
    if (path === '/products/detail') return '产品详情';
    if (path === '/cart') return '购物车';
    if (path === '/checkout') return '结账';
    if (path === '/checkout/payment') return '支付';
    if (path === '/checkout/success') return '支付成功';
    if (path === '/user/profile') return '个人中心';
    if (path === '/user/orders') return '我的订单';
    if (path === '/search') return '搜索';
    if (path === '/about') return '关于我们';
    if (path === '/contact') return '联系我们';
    if (path === '/blog') return '博客';
    if (path === '/blog/post') return '文章';
    return path;
  }

  public updateOptions(options: Partial<GraphBuilderOptions>): void {
    this.options = { ...this.options, ...options };
  }

  public getStats(): {
    totalRecords: number;
    totalSessions: number;
    uniquePages: number;
  } {
    const uniquePages = new Set<string>();
    for (const [, records] of this.sessionPaths) {
      for (const record of records) {
        uniquePages.add(record.pagePath);
      }
    }

    return {
      totalRecords: this.records.length,
      totalSessions: this.sessionPaths.size,
      uniquePages: uniquePages.size
    };
  }

  public filterByPage(pagePath: string): { nodes: GraphNode[]; links: GraphLink[] } {
    const graph = this.buildGraph();
    const nodeIds: Set<string> = new Set([pagePath]);

    for (const link of graph.links) {
      if (link.source === pagePath || link.target === pagePath) {
        nodeIds.add(link.source);
        nodeIds.add(link.target);
      }
    }

    return {
      nodes: graph.nodes.filter(n => nodeIds.has(n.id)),
      links: graph.links.filter(l => l.source === pagePath || l.target === pagePath)
    };
  }

  public detectCycles(): { hasCycles: boolean; cycles: CycleInfo[] } {
    const nodeMap: Map<string, GraphNode> = new Map();
    const linkMap: Map<string, GraphLink> = new Map();

    for (const [sessionId, records] of this.sessionPaths) {
      this.processSessionPath(records, nodeMap, linkMap);
    }

    const links = Array.from(linkMap.values());
    const nodeIds = Array.from(nodeMap.keys());
    const cycles = this.detectAllCycles(links, nodeIds);

    return {
      hasCycles: cycles.length > 0,
      cycles
    };
  }
}

export function createSankeyGraphBuilder(
  options: GraphBuilderOptions = {}
): SankeyGraphBuilder {
  return new SankeyGraphBuilder(options);
}
