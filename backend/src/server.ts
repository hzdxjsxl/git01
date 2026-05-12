import express, { Request, Response } from 'express'
import cors from 'cors'

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

interface Building {
  id: string
  name: string
  width: number
  depth: number
  height: number
  x: number
  y: number
  z: number
}

const buildings: Building[] = [
  {
    id: 'building-A',
    name: '办公楼 A',
    width: 30,
    depth: 25,
    height: 45,
    x: 0,
    y: 0,
    z: 0
  },
  {
    id: 'building-B',
    name: '办公楼 B',
    width: 25,
    depth: 20,
    height: 60,
    x: 50,
    y: 0,
    z: 30
  },
  {
    id: 'building-C',
    name: '研发中心',
    width: 40,
    depth: 30,
    height: 35,
    x: -60,
    y: 0,
    z: 40
  },
  {
    id: 'building-D',
    name: '会议中心',
    width: 35,
    depth: 25,
    height: 20,
    x: 40,
    y: 0,
    z: -40
  },
  {
    id: 'building-E',
    name: '员工宿舍',
    width: 30,
    depth: 15,
    height: 50,
    x: -40,
    y: 0,
    z: -30
  }
]

app.get('/api/buildings', (req: Request, res: Response) => {
  res.json(buildings)
})

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.listen(PORT, () => {
  console.log(`Sunlight Analysis Backend running on http://localhost:${PORT}`)
  console.log(`Buildings endpoint: http://localhost:${PORT}/api/buildings`)
})
