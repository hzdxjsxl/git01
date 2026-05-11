<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'
import type { ParsedLogEntry, LogStatistics } from '../utils/logParser'
import { getStatusCodeColor } from '../utils/logParser'

const props = defineProps<{
  entries: ParsedLogEntry[]
  statistics: LogStatistics
}>()

const chartRef = ref<HTMLDivElement | null>(null)
let svg: any = null
let resizeObserver: ResizeObserver | null = null

function createChart() {
  if (!chartRef.value || props.entries.length === 0) return

  const validEntries = props.entries.filter(e => e.isValid)
  if (validEntries.length === 0) return

  d3.select(chartRef.value).selectAll('*').remove()

  const containerWidth = chartRef.value.clientWidth
  const containerHeight = 500
  const margin = { top: 40, right: 40, bottom: 60, left: 70 }
  const width = containerWidth - margin.left - margin.right
  const height = containerHeight - margin.top - margin.bottom

  svg = d3.select(chartRef.value)
    .append('svg')
    .attr('width', containerWidth)
    .attr('height', containerHeight)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  const xScale = d3.scaleLinear()
    .domain([0, validEntries.length - 1])
    .range([0, width])

  const maxLatency = props.statistics.maxLatency > 0 ? props.statistics.maxLatency : 1
  const yScale = d3.scaleLinear()
    .domain([0, Math.max(maxLatency * 1.1, 1)])
    .range([height, 0])

  const xAxis = d3.axisBottom(xScale)
    .ticks(10)
    .tickFormat((d: any) => `#${d + 1}`)

  const yAxis = d3.axisLeft(yScale)
    .ticks(10)
    .tickFormat((d: any) => `${d}s`)

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .selectAll('text')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end')

  svg.append('g')
    .call(yAxis)

  svg.append('text')
    .attr('transform', `translate(${width / 2},${height + 50})`)
    .style('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#6b7280')
    .text('请求序号')

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0 - margin.left + 20)
    .attr('x', 0 - (height / 2))
    .style('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#6b7280')
    .text('响应时间 (秒)')

  const tooltip = d3.select(chartRef.value)
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', 'rgba(17, 24, 39, 0.95)')
    .style('color', 'white')
    .style('padding', '12px')
    .style('border-radius', '8px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('z-index', '1000')
    .style('box-shadow', '0 4px 6px rgba(0, 0, 0, 0.3)')

  const dots = svg.selectAll('.dot')
    .data(validEntries)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', (d: ParsedLogEntry, i: number) => xScale(i))
    .attr('cy', (d: ParsedLogEntry) => yScale(d.latency))
    .attr('r', 0)
    .attr('fill', (d: ParsedLogEntry) => getStatusCodeColor(d.statusCode))
    .attr('opacity', 0.7)
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .on('mouseover', function(event: any, d: ParsedLogEntry) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('r', 8)
        .attr('opacity', 1)

      tooltip
        .style('visibility', 'visible')
        .html(`
          <div style="font-weight: 600; margin-bottom: 8px;">${d.method} ${d.path}</div>
          <div style="display: grid; grid-template-columns: auto auto; gap: 4px 12px;">
            <span style="color: #9ca3af;">IP:</span>
            <span>${d.ip}</span>
            <span style="color: #9ca3af;">状态码:</span>
            <span style="color: ${getStatusCodeColor(d.statusCode)}; font-weight: 600;">${d.statusCode}</span>
            <span style="color: #9ca3af;">响应时间:</span>
            <span>${d.latency.toFixed(3)}s</span>
            <span style="color: #9ca3af;">时间:</span>
            <span>${d.timestamp}</span>
          </div>
        `)
    })
    .on('mousemove', function(event: any) {
      tooltip
        .style('top', (event.pageY + 10) + 'px')
        .style('left', (event.pageX + 10) + 'px')
    })
    .on('mouseout', function() {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('r', 5)
        .attr('opacity', 0.7)

      tooltip.style('visibility', 'hidden')
    })

  dots.transition()
    .duration(800)
    .delay((d: any, i: number) => i * 20)
    .attr('r', 5)

  if (props.statistics.p99Latency > 0) {
    svg.append('line')
      .attr('x1', 0)
      .attr('y1', yScale(props.statistics.p99Latency))
      .attr('x2', width)
      .attr('y2', yScale(props.statistics.p99Latency))
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0)
      .transition()
      .delay(500)
      .duration(800)
      .attr('opacity', 0.8)

    svg.append('text')
      .attr('x', width - 5)
      .attr('y', yScale(props.statistics.p99Latency) - 8)
      .attr('text-anchor', 'end')
      .attr('fill', '#ef4444')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('opacity', 0)
      .text(`P99: ${props.statistics.p99Latency.toFixed(3)}s`)
      .transition()
      .delay(500)
      .duration(800)
      .attr('opacity', 1)
  }

  if (props.statistics.p95Latency > 0) {
    svg.append('line')
      .attr('x1', 0)
      .attr('y1', yScale(props.statistics.p95Latency))
      .attr('x2', width)
      .attr('y2', yScale(props.statistics.p95Latency))
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0)
      .transition()
      .delay(600)
      .duration(800)
      .attr('opacity', 0.8)

    svg.append('text')
      .attr('x', width - 5)
      .attr('y', yScale(props.statistics.p95Latency) - 8)
      .attr('text-anchor', 'end')
      .attr('fill', '#f59e0b')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('opacity', 0)
      .text(`P95: ${props.statistics.p95Latency.toFixed(3)}s`)
      .transition()
      .delay(600)
      .duration(800)
      .attr('opacity', 1)
  }

  const legendData = [
    { label: '2xx 成功', color: '#10b981' },
    { label: '3xx 重定向', color: '#3b82f6' },
    { label: '4xx 客户端错误', color: '#f59e0b' },
    { label: '5xx 服务器错误', color: '#ef4444' }
  ]

  const legend = svg.append('g')
    .attr('transform', 'translate(10, 10)')

  legendData.forEach((item, i) => {
    const legendRow = legend.append('g')
      .attr('transform', `translate(0, ${i * 20})`)

    legendRow.append('circle')
      .attr('r', 6)
      .attr('fill', item.color)
      .attr('opacity', 0.8)

    legendRow.append('text')
      .attr('x', 14)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#6b7280')
      .text(item.label)
  })
}

function handleResize() {
  createChart()
}

onMounted(() => {
  createChart()
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(chartRef.value)
  }
})

watch(() => [props.entries, props.statistics], () => {
  createChart()
}, { deep: true })

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<template>
  <div ref="chartRef" class="scatter-plot"></div>
</template>

<style scoped>
.scatter-plot {
  width: 100%;
  min-height: 500px;
}
</style>
