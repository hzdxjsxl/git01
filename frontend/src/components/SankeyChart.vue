<template>
  <div class="sankey-chart-container" ref="containerRef">
    <div class="sankey-header">
      <h2>用户行为路径分析 - 桑基图</h2>
      <div class="stats-info">
        <span>总记录数: {{ stats.totalRecords?.toLocaleString() || 0 }}</span>
        <span>总Session数: {{ stats.totalSessions?.toLocaleString() || 0 }}</span>
        <span>节点数: {{ graphData.nodes?.length || 0 }}</span>
        <span>连接数: {{ graphData.links?.length || 0 }}</span>
      </div>
    </div>
    <svg ref="svgRef" :width="width" :height="height"></svg>
    <div v-if="tooltip.visible" class="tooltip" :style="tooltip.style">
      <div class="title">{{ tooltip.title }}</div>
      <div class="info">{{ tooltip.content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';
import type { GraphNode, GraphLink } from '../utils/SankeyGraphBuilder';

interface Props {
  graphData: {
    nodes: GraphNode[];
    links: GraphLink[];
    totalSessions: number;
    totalRecords: number;
  };
  width?: number;
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  width: 1200,
  height: 700
});

const containerRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);

const stats = computed(() => ({
  totalRecords: props.graphData?.totalRecords,
  totalSessions: props.graphData?.totalSessions
}));

const tooltip = ref({
  visible: false,
  title: '',
  content: '',
  style: { left: '0px', top: '0px' }
});

let sankeyGenerator: ReturnType<typeof sankey> | null = null;

const colorScale = d3.scaleOrdinal<string>()
  .domain([
    '/home', '/products', '/products/list', '/products/detail',
    '/cart', '/checkout', '/checkout/payment', '/checkout/success',
    '/user/profile', '/user/orders', '/search', '/about',
    '/contact', '/blog', '/blog/post'
  ])
  .range([
    '#1f77b4', '#ff7f0e', '#ffbb78', '#ff9896',
    '#2ca02c', '#d62728', '#98df8a', '#9467bd',
    '#8c564b', '#c5b0d5', '#e377c2', '#17becf',
    '#7f7f7f', '#bcbd22', '#9edae5'
  ]);

function initSankey() {
  sankeyGenerator = sankey()
    .nodeWidth(20)
    .nodePadding(15)
    .extent([[50, 20], [props.width - 50, props.height - 20]])
    .nodeId((d: any) => d.id)
    .nodeAlign(sankeyJustify);
}

function renderSankey() {
  if (!svgRef.value || !sankeyGenerator || !props.graphData || props.graphData.nodes.length === 0) {
    return;
  }

  const svg = d3.select(svgRef.value);
  svg.selectAll('*').remove();

  const graph = sankeyGenerator({
    nodes: props.graphData.nodes.map(node => ({ ...node })),
    links: props.graphData.links.map(link => ({ ...link }))
  });

  const defs = svg.append('defs');
  graph.links.forEach((link: any, i: number) => {
    const gradient = defs.append('linearGradient')
      .attr('id', `gradient-${i}`)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', link.source.x1)
      .attr('x2', link.target.x0);

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', colorScale(link.source.id) || '#999');

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', colorScale(link.target.id) || '#999');
  });

  const link = svg.append('g')
    .attr('class', 'links')
    .selectAll('.link')
    .data(graph.links)
    .join('path')
    .attr('class', 'link')
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke', (d: any, i: number) => `url(#gradient-${i})`)
    .attr('stroke-width', (d: any) => Math.max(1, d.width))
    .on('mouseenter', (event: MouseEvent, d: any) => {
      handleLinkMouseEnter(event, d);
    })
    .on('mouseleave', handleMouseLeave)
    .on('click', (event: MouseEvent, d: any) => {
      highlightPath(d);
    });

  const node = svg.append('g')
    .attr('class', 'nodes')
    .selectAll('.node')
    .data(graph.nodes)
    .join('g')
    .attr('class', 'node')
    .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
    .on('mouseenter', (event: MouseEvent, d: any) => {
      handleNodeMouseEnter(event, d);
    })
    .on('mouseleave', handleMouseLeave)
    .on('click', (event: MouseEvent, d: any) => {
      highlightConnectedNodes(d);
    });

  node.append('rect')
    .attr('class', 'node-rect')
    .attr('height', (d: any) => Math.max(1, d.y1 - d.y0))
    .attr('width', (d: any) => d.x1 - d.x0)
    .attr('fill', (d: any) => colorScale(d.id) || '#999')
    .attr('rx', 2)
    .attr('ry', 2);

  node.append('text')
    .attr('class', 'node-text')
    .attr('x', (d: any) => d.x0 < props.width / 2 ? (d.x1 - d.x0) + 6 : -6)
    .attr('y', (d: any) => (d.y1 - d.y0) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', (d: any) => d.x0 < props.width / 2 ? 'start' : 'end')
    .text((d: any) => d.name);

  node.append('text')
    .attr('class', 'node-text')
    .attr('x', (d: any) => d.x0 < props.width / 2 ? (d.x1 - d.x0) + 6 : -6)
    .attr('y', (d: any) => (d.y1 - d.y0) / 2 + 16)
    .attr('dy', '0.35em')
    .attr('text-anchor', (d: any) => d.x0 < props.width / 2 ? 'start' : 'end')
    .attr('font-size', '10px')
    .attr('fill', '#666')
    .text((d: any) => `访问: ${d.value}`);
}

function handleNodeMouseEnter(event: MouseEvent, d: any) {
  const connectedLinks = props.graphData.links.filter(
    (l: GraphLink) => l.source === d.id || l.target === d.id
  );
  const connectedNodeIds = new Set<string>([d.id]);
  connectedLinks.forEach((l: GraphLink) => {
    connectedNodeIds.add(l.source as string);
    connectedNodeIds.add(l.target as string);
  });

  const svg = d3.select(svgRef.value);
  svg.selectAll('.node').classed('dimmed', (node: any) => !connectedNodeIds.has(node.id));
  svg.selectAll('.link')
    .classed('dimmed', (link: any) => link.source.id !== d.id && link.target.id !== d.id)
    .classed('highlighted', (link: any) => link.source.id === d.id || link.target.id === d.id);

  showTooltip(event, {
    title: d.name,
    content: `页面路径: ${d.pagePath}\n总访问: ${d.value}\n入度: ${d.inDegree}\n出度: ${d.outDegree}`
  });
}

function handleLinkMouseEnter(event: MouseEvent, d: any) {
  const svg = d3.select(svgRef.value);
  const sourceId = d.source.id;
  const targetId = d.target.id;

  svg.selectAll('.node').classed('dimmed', (node: any) => 
    node.id !== sourceId && node.id !== targetId
  );
  svg.selectAll('.link')
    .classed('dimmed', (link: any) => link !== d)
    .classed('highlighted', (link: any) => link === d);

  showTooltip(event, {
    title: `${d.source.name} → ${d.target.name}`,
    content: `流量: ${d.value}\n转化率: ${((d.value / d.source.value) * 100).toFixed(2)}%`
  });
}

function handleMouseLeave() {
  const svg = d3.select(svgRef.value);
  svg.selectAll('.node').classed('dimmed', false);
  svg.selectAll('.link').classed('dimmed', false).classed('highlighted', false);
  hideTooltip();
}

function highlightConnectedNodes(d: any) {
  const connectedLinks = props.graphData.links.filter(
    (l: GraphLink) => l.source === d.id || l.target === d.id
  );
  const connectedNodeIds = new Set<string>([d.id]);
  connectedLinks.forEach((l: GraphLink) => {
    connectedNodeIds.add(l.source as string);
    connectedNodeIds.add(l.target as string);
  });

  const svg = d3.select(svgRef.value);
  svg.selectAll('.node').classed('dimmed', (node: any) => !connectedNodeIds.has(node.id));
  svg.selectAll('.link')
    .classed('dimmed', (link: any) => link.source.id !== d.id && link.target.id !== d.id)
    .classed('highlighted', (link: any) => link.source.id === d.id || link.target.id === d.id);
}

function highlightPath(d: any) {
  const svg = d3.select(svgRef.value);
  const sourceId = d.source.id;
  const targetId = d.target.id;

  svg.selectAll('.node').classed('dimmed', (node: any) => 
    node.id !== sourceId && node.id !== targetId
  );
  svg.selectAll('.link')
    .classed('dimmed', (link: any) => link !== d)
    .classed('highlighted', (link: any) => link === d);
}

function showTooltip(event: MouseEvent, data: { title: string; content: string }) {
  if (!containerRef.value) return;

  const containerRect = containerRef.value.getBoundingClientRect();
  const x = event.clientX - containerRect.left + 10;
  const y = event.clientY - containerRect.top + 10;

  tooltip.value = {
    visible: true,
    title: data.title,
    content: data.content,
    style: {
      left: `${x}px`,
      top: `${y}px`
    }
  };
}

function hideTooltip() {
  tooltip.value.visible = false;
}

import { computed } from 'vue';

onMounted(() => {
  initSankey();
  renderSankey();

  window.addEventListener('resize', handleResize);
});

function handleResize() {
  if (containerRef.value) {
    renderSankey();
  }
}

watch(
  () => props.graphData,
  () => {
    renderSankey();
  },
  { deep: true }
);

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.sankey-chart-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.sankey-header {
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sankey-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.stats-info {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: #666;
}

svg {
  display: block;
}
</style>
