export interface Cell {
  id: string
  row: number
  col: number
  raw: string
}

export interface ComputedCell extends Cell {
  value: string | number
  error?: string
}

type DAGNode = {
  id: string
  dependencies: Set<string>
  dependents: Set<string>
}

const CELL_REF_REGEX = /([A-Za-z]+)(\d+)/g

function parseCellRef(ref: string): { col: number; row: number } | null {
  const match = ref.match(/^([A-Za-z]+)(\d+)$/)
  if (!match) return null
  
  const letters = match[1].toUpperCase()
  let col = 0
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64)
  }
  
  return {
    col: col - 1,
    row: parseInt(match[2], 10) - 1
  }
}

function toCellId(col: number, row: number): string {
  let letters = ''
  let n = col + 1
  while (n > 0) {
    const remainder = n % 26
    if (remainder === 0) {
      letters = 'Z' + letters
      n = Math.floor(n / 26) - 1
    } else {
      letters = String.fromCharCode(64 + remainder) + letters
      n = Math.floor(n / 26)
    }
  }
  return `${letters}${row + 1}`
}

function extractDependencies(raw: string): string[] {
  if (!raw || !raw.startsWith('=')) return []
  
  const deps = new Set<string>()
  let match
  
  CELL_REF_REGEX.lastIndex = 0
  while ((match = CELL_REF_REGEX.exec(raw)) !== null) {
    const ref = parseCellRef(match[0])
    if (ref) {
      deps.add(toCellId(ref.col, ref.row))
    }
  }
  
  return Array.from(deps)
}

function tokenize(formula: string): string[] {
  const tokens: string[] = []
  let current = ''
  
  for (let i = 0; i < formula.length; i++) {
    const char = formula[i]
    
    if (char === ' ') continue
    
    if (['+', '-', '*', '/', '(', ')'].includes(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      tokens.push(char)
    } else {
      current += char
    }
  }
  
  if (current) {
    tokens.push(current)
  }
  
  return tokens
}

function toPostfix(tokens: string[]): string[] {
  const output: string[] = []
  const ops: string[] = []
  
  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2
  }
  
  for (const token of tokens) {
    if (token === '(') {
      ops.push(token)
    } else if (token === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') {
        output.push(ops.pop()!)
      }
      ops.pop()
    } else if (precedence[token] !== undefined) {
      while (
        ops.length &&
        ops[ops.length - 1] !== '(' &&
        precedence[ops[ops.length - 1]] >= precedence[token]
      ) {
        output.push(ops.pop()!)
      }
      ops.push(token)
    } else {
      output.push(token)
    }
  }
  
  while (ops.length) {
    output.push(ops.pop()!)
  }
  
  return output
}

function evaluatePostfix(
  postfix: string[],
  cellValues: Map<string, number>
): number {
  const stack: number[] = []
  
  for (const token of postfix) {
    if (['+', '-', '*', '/'].includes(token)) {
      const b = stack.pop()!
      const a = stack.pop()!
      
      switch (token) {
        case '+':
          stack.push(a + b)
          break
        case '-':
          stack.push(a - b)
          break
        case '*':
          stack.push(a * b)
          break
        case '/':
          stack.push(a / b)
          break
      }
    } else {
      const ref = parseCellRef(token)
      if (ref) {
        const cellId = toCellId(ref.col, ref.row)
        const val = cellValues.get(cellId)
        if (val === undefined || isNaN(val)) {
          return NaN
        }
        stack.push(val)
      } else {
        const num = parseFloat(token)
        if (isNaN(num)) {
          return NaN
        }
        stack.push(num)
      }
    }
  }
  
  return stack[0] ?? 0
}

export class FormulaGraph {
  private cells: Map<string, Cell> = new Map()
  private computed: Map<string, ComputedCell> = new Map()
  private dag: Map<string, DAGNode> = new Map()

  load(cells: Cell[]): void {
    this.cells.clear()
    this.dag.clear()
    
    for (const cell of cells) {
      this.cells.set(cell.id, cell)
      this.dag.set(cell.id, {
        id: cell.id,
        dependencies: new Set(),
        dependents: new Set()
      })
    }
    
    this.buildDAG()
    this.computeAll()
  }

  private buildDAG(): void {
    for (const [cellId, cell] of this.cells) {
      const deps = extractDependencies(cell.raw)
      const node = this.dag.get(cellId)!
      
      node.dependencies.clear()
      for (const dep of deps) {
        if (this.cells.has(dep)) {
          node.dependencies.add(dep)
          const depNode = this.dag.get(dep)!
          depNode.dependents.add(cellId)
        }
      }
    }
  }

  private topologicalSort(): string[] {
    const inDegree: Map<string, number> = new Map()
    const result: string[] = []
    const queue: string[] = []
    
    for (const [id, node] of this.dag) {
      inDegree.set(id, node.dependencies.size)
      if (node.dependencies.size === 0) {
        queue.push(id)
      }
    }
    
    while (queue.length > 0) {
      const current = queue.shift()!
      result.push(current)
      
      const node = this.dag.get(current)!
      for (const dep of node.dependents) {
        const deg = inDegree.get(dep)! - 1
        inDegree.set(dep, deg)
        if (deg === 0) {
          queue.push(dep)
        }
      }
    }
    
    return result
  }

  private computeAll(): void {
    const order = this.topologicalSort()
    const values: Map<string, number> = new Map()
    
    for (const cellId of order) {
      const cell = this.cells.get(cellId)!
      const base: ComputedCell = {
        ...cell,
        value: cell.raw
      }
      
      if (cell.raw && cell.raw.startsWith('=')) {
        try {
          const formula = cell.raw.slice(1)
          const tokens = tokenize(formula)
          const postfix = toPostfix(tokens)
          const result = evaluatePostfix(postfix, values)
          
          if (isNaN(result) || !isFinite(result)) {
            base.value = '#ERR'
            base.error = 'Invalid formula'
          } else {
            base.value = result
            values.set(cellId, result)
          }
        } catch (e) {
          base.value = '#ERR'
          base.error = 'Formula error'
        }
      } else if (cell.raw !== '') {
        const num = parseFloat(cell.raw)
        if (!isNaN(num) && isFinite(num)) {
          base.value = num
          values.set(cellId, num)
        } else {
          base.value = cell.raw
        }
      } else {
        base.value = ''
      }
      
      this.computed.set(cellId, base)
    }
  }

  setCellRaw(cellId: string, raw: string): ComputedCell[] {
    const cell = this.cells.get(cellId)
    if (!cell) return []
    
    cell.raw = raw
    
    const oldDeps = this.dag.get(cellId)!.dependencies
    for (const dep of oldDeps) {
      const depNode = this.dag.get(dep)!
      depNode.dependents.delete(cellId)
    }
    
    this.dag.get(cellId)!.dependencies.clear()
    
    const newDeps = extractDependencies(raw)
    for (const dep of newDeps) {
      if (this.cells.has(dep)) {
        this.dag.get(cellId)!.dependencies.add(dep)
        const depNode = this.dag.get(dep)!
        depNode.dependents.add(cellId)
      }
    }
    
    const affected = this.getAffectedCells(cellId)
    
    this.recomputeAffected(affected)
    
    const updated: ComputedCell[] = []
    for (const id of affected) {
      const computed = this.computed.get(id)
      if (computed) {
        updated.push(computed)
      }
    }
    
    return updated
  }

  private getAffectedCells(startId: string): string[] {
    const visited = new Set<string>()
    const queue: string[] = [startId]
    
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      
      const node = this.dag.get(current)
      if (!node) continue
      
      for (const dep of node.dependents) {
        if (!visited.has(dep)) {
          queue.push(dep)
        }
      }
    }
    
    return Array.from(visited)
  }

  private recomputeAffected(affected: string[]): void {
    const allOrder = this.topologicalSort()
    const affectedSet = new Set(affected)
    const order = allOrder.filter((id) => affectedSet.has(id))
    
    const values: Map<string, number> = new Map()
    
    for (const [id, computed] of this.computed) {
      if (!affectedSet.has(id) && typeof computed.value === 'number') {
        values.set(id, computed.value)
      }
    }
    
    for (const cellId of order) {
      const cell = this.cells.get(cellId)!
      const base: ComputedCell = {
        ...cell,
        value: cell.raw
      }
      
      if (cell.raw && cell.raw.startsWith('=')) {
        try {
          const formula = cell.raw.slice(1)
          const tokens = tokenize(formula)
          const postfix = toPostfix(tokens)
          const result = evaluatePostfix(postfix, values)
          
          if (isNaN(result) || !isFinite(result)) {
            base.value = '#ERR'
            base.error = 'Invalid formula'
          } else {
            base.value = result
            values.set(cellId, result)
          }
        } catch (e) {
          base.value = '#ERR'
          base.error = 'Formula error'
        }
      } else if (cell.raw !== '') {
        const num = parseFloat(cell.raw)
        if (!isNaN(num) && isFinite(num)) {
          base.value = num
          values.set(cellId, num)
        } else {
          base.value = cell.raw
        }
      } else {
        base.value = ''
      }
      
      this.computed.set(cellId, base)
    }
  }

  getComputed(cellId: string): ComputedCell | undefined {
    return this.computed.get(cellId)
  }

  getAllComputed(): ComputedCell[] {
    return Array.from(this.computed.values())
  }
}
