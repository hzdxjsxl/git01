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
}

export interface GraphBuilderOptions {
  maxSteps?: number;
  minLinkValue?: number;
  startPage?: string;
  endPage?: string;
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
      endPage: options.endPage
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
        const reachableNodes = this.findReachableNodes(startNode.id, links, new Set());
        nodes = nodes.filter(n => reachableNodes.has(n.id));
        links = links.filter(l => reachableNodes.has(l.source) && reachableNodes.has(l.target));
      }
    }

    return {
      nodes,
      links,
      totalSessions: this.sessionPaths.size,
      totalRecords: this.records.length
    };
  }

  private findReachableNodes(startId: string, links: GraphLink[], visited: Set<string>): Set<string> {
    if (visited.has(startId)) return visited;
    visited.add(startId);

    const outgoing = links.filter(l => l.source === startId);
    for (const link of outgoing) {
      this.findReachableNodes(link.target, links, visited);
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

    for (const record of records) {
      if (path.length === 0 || record.pagePath !== path[path.length - 1].pagePath) {
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
      outDegree: 0
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
}

export function createSankeyGraphBuilder(
  options: GraphBuilderOptions = {}
): SankeyGraphBuilder {
  return new SankeyGraphBuilder(options);
}
