<template>
  <div class="spreadsheet-container">
    <div class="toolbar">
      <h2>极简协同表格</h2>
      <div v-if="editingCell" class="formula-bar">
        <span class="cell-label">{{ editingCell }}</span>
        <input
          type="text"
          :value="cells.get(editingCell)?.raw || ''"
          @input="handleFormulaInput($event)"
          @keyup.enter="finishEditing"
          @keyup.esc="cancelEditing"
          ref="formulaInput"
          class="formula-input"
          placeholder="输入值或公式 (如 =A1+B1)"
        />
      </div>
    </div>
    
    <div class="table-wrapper" v-if="!loading">
      <table class="spreadsheet">
        <thead>
          <tr>
            <th class="corner-cell"></th>
            <th v-for="col in colCount" :key="col" class="col-header">
              {{ getColLabel(col - 1) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rowCount" :key="row">
            <td class="row-header">{{ row }}</td>
            <td
              v-for="col in colCount"
              :key="col"
              class="cell"
              :class="{
                'cell-selected': selectedCell === getCellId(col - 1, row - 1),
                'cell-editing': editingCell === getCellId(col - 1, row - 1),
                'cell-error': cells.get(getCellId(col - 1, row - 1))?.error
              }"
              @click="selectCell(getCellId(col - 1, row - 1))"
              @dblclick="startEditing(getCellId(col - 1, row - 1))"
            >
              <span v-if="editingCell !== getCellId(col - 1, row - 1)" class="cell-display">
                {{ getDisplayValue(col - 1, row - 1) }}
              </span>
              <input
                v-else
                type="text"
                :value="cells.get(getCellId(col - 1, row - 1))?.raw || ''"
                @input="handleCellInput($event, getCellId(col - 1, row - 1))"
                @keyup.enter="finishEditing"
                @keyup.esc="cancelEditing"
                @blur="finishEditing"
                ref="cellInput"
                class="cell-input"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div v-else class="loading">加载中...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { FormulaGraph, ComputedCell } from '../FormulaGraph'

const rowCount = ref(15)
const colCount = ref(10)
const loading = ref(true)
const selectedCell = ref<string | null>(null)
const editingCell = ref<string | null>(null)
const tempRaw = ref('')

const graph = new FormulaGraph()
const cells = ref<Map<string, ComputedCell>>(new Map())

function getColLabel(col: number): string {
  let label = ''
  let n = col + 1
  while (n > 0) {
    const remainder = n % 26
    if (remainder === 0) {
      label = 'Z' + label
      n = Math.floor(n / 26) - 1
    } else {
      label = String.fromCharCode(64 + remainder) + label
      n = Math.floor(n / 26)
    }
  }
  return label
}

function getCellId(col: number, row: number): string {
  return `${getColLabel(col)}${row + 1}`
}

function getDisplayValue(col: number, row: number): string | number {
  const cell = cells.value.get(getCellId(col, row))
  return cell?.value ?? ''
}

async function loadData() {
  loading.value = true
  try {
    const res = await fetch('/api/cells')
    const data = await res.json()
    if (data.success) {
      graph.load(data.data)
      const all = graph.getAllComputed()
      const map = new Map<string, ComputedCell>()
      for (const c of all) {
        map.set(c.id, c)
      }
      cells.value = map
    }
  } catch (e) {
    console.error('Failed to load cells:', e)
  } finally {
    loading.value = false
  }
}

function selectCell(cellId: string) {
  if (editingCell.value && editingCell.value !== cellId) {
    finishEditing()
  }
  selectedCell.value = cellId
}

function startEditing(cellId: string) {
  selectedCell.value = cellId
  editingCell.value = cellId
  tempRaw.value = cells.value.get(cellId)?.raw || ''
  
  nextTick(() => {
    const inputs = document.querySelectorAll('.cell-input')
    if (inputs.length > 0) {
      const input = inputs[inputs.length - 1] as HTMLInputElement
      input.focus()
      input.select()
    }
  })
}

function handleCellInput(e: Event, cellId: string) {
  const target = e.target as HTMLInputElement
  updateCell(cellId, target.value, false)
}

function handleFormulaInput(e: Event) {
  const target = e.target as HTMLInputElement
  if (editingCell.value) {
    updateCell(editingCell.value, target.value, false)
  }
}

function updateCell(cellId: string, raw: string, saveToServer: boolean = true) {
  const updated = graph.setCellRaw(cellId, raw)
  for (const c of updated) {
    cells.value.set(c.id, c)
  }
  cells.value = new Map(cells.value)
  
  if (saveToServer) {
    fetch(`/api/cells/${cellId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw })
    }).catch((e) => console.error('Failed to save cell:', e))
  }
}

function finishEditing() {
  if (editingCell.value) {
    const cell = cells.value.get(editingCell.value)
    if (cell) {
      updateCell(editingCell.value, cell.raw, true)
    }
  }
  editingCell.value = null
}

function cancelEditing() {
  if (editingCell.value) {
    updateCell(editingCell.value, tempRaw.value, false)
  }
  editingCell.value = null
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.spreadsheet-container {
  padding: 20px;
  max-width: 100%;
  overflow-x: auto;
}

.toolbar {
  margin-bottom: 16px;
}

.toolbar h2 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 18px;
}

.formula-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f5f5;
  padding: 8px 12px;
  border-radius: 6px;
}

.cell-label {
  font-family: monospace;
  font-weight: 600;
  color: #666;
  min-width: 40px;
  text-align: center;
}

.formula-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  outline: none;
}

.formula-input:focus {
  border-color: #4a90d9;
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
}

.table-wrapper {
  overflow: auto;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.spreadsheet {
  border-collapse: collapse;
  table-layout: fixed;
}

.spreadsheet th,
.spreadsheet td {
  min-width: 100px;
  max-width: 100px;
  height: 28px;
  border: 1px solid #e0e0e0;
  padding: 0;
  font-size: 13px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.corner-cell {
  min-width: 50px;
  max-width: 50px;
  background: #f0f0f0;
}

.col-header {
  background: #f5f5f5;
  color: #666;
  font-weight: 600;
  text-align: center;
}

.row-header {
  min-width: 50px;
  max-width: 50px;
  background: #f5f5f5;
  color: #666;
  font-weight: 600;
  text-align: center;
}

.cell {
  background: #fff;
  padding: 2px 6px;
  cursor: cell;
  position: relative;
}

.cell-display {
  display: block;
  height: 100%;
  line-height: 24px;
}

.cell-selected {
  outline: 2px solid #4a90d9;
  outline-offset: -2px;
  z-index: 1;
}

.cell-editing {
  padding: 0;
  outline: 2px solid #4a90d9;
  outline-offset: -2px;
  z-index: 2;
}

.cell-error {
  color: #d32f2f;
}

.cell-input {
  width: 100%;
  height: 100%;
  border: none;
  padding: 2px 6px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
}

.loading {
  padding: 40px;
  text-align: center;
  color: #666;
}
</style>
