import Koa from 'koa'
import Router from 'koa-router'
import cors from 'koa2-cors'

const app = new Koa()
const router = new Router()

function createMockData() {
  const rows = 15
  const cols = 10
  const cells = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const colLetter = String.fromCharCode(65 + col)
      const cellId = `${colLetter}${row + 1}`
      let raw = ''

      if (row === 0 && col < 3) {
        raw = String(col + 1)
      } else if (row === 1 && col < 3) {
        raw = String((col + 1) * 10)
      } else if (row === 0 && col === 3) {
        raw = '=A1+B1+C1'
      } else if (row === 1 && col === 3) {
        raw = '=A2+B2+C2'
      } else if (row === 2 && col === 3) {
        raw = '=D1+D2'
      } else if (row === 3 && col === 0) {
        raw = '=D3/2'
      }

      cells.push({
        id: cellId,
        row,
        col,
        raw
      })
    }
  }

  return cells
}

const dataStore = createMockData()

router.get('/api/cells', (ctx) => {
  ctx.body = {
    success: true,
    data: dataStore
  }
})

router.put('/api/cells/:id', async (ctx) => {
  const { id } = ctx.params
  const body = await parseBody(ctx)
  const cell = dataStore.find((c) => c.id === id)
  
  if (cell) {
    cell.raw = body.raw || ''
    ctx.body = {
      success: true,
      data: cell
    }
  } else {
    ctx.status = 404
    ctx.body = {
      success: false,
      message: 'Cell not found'
    }
  }
})

function parseBody(ctx) {
  return new Promise((resolve) => {
    let data = ''
    ctx.req.on('data', (chunk) => {
      data += chunk
    })
    ctx.req.on('end', () => {
      try {
        resolve(JSON.parse(data))
      } catch {
        resolve({})
      }
    })
  })
}

app.use(cors())
app.use(router.routes())
app.use(router.allowedMethods())

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
