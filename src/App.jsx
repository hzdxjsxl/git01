import { Carousel3D } from './components/Carousel3D'

const items = [
  {
    title: '极光之境',
    description: '在北极圈的冬夜，追逐神秘的绿色光芒',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    title: '深海探秘',
    description: '潜入未知的深蓝世界，发现生命的奇迹',
    color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
  },
  {
    title: '星际穿越',
    description: '穿越时空的边界，探索宇宙的无限可能',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  {
    title: '火山奇观',
    description: '感受大地的脉搏，见证自然的力量',
    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
  },
  {
    title: '雪山之巅',
    description: '征服冰雪的世界，超越自我的极限',
    color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
  },
  {
    title: '雨林秘境',
    description: '在绿色的迷宫中，寻找生命的韵律',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  }
]

function App() {
  return (
    <div className="app">
      <div className="app-background">
        <div className="bg-circle bg-circle-1"></div>
        <div className="bg-circle bg-circle-2"></div>
        <div className="bg-circle bg-circle-3"></div>
      </div>
      
      <div className="app-content">
        <header className="app-header">
          <h1>React 3D 轮播图</h1>
          <p className="app-desc">
            纯手写实现 • 物理引擎 • 手势拖拽 • 惯性回弹
          </p>
        </header>
        
        <main className="app-main">
          <Carousel3D items={items} itemWidth={320} gap={50} />
        </main>
        
        <footer className="app-footer">
          <p>拖动卡片或使用下方指示器切换 • 支持触屏和鼠标</p>
        </footer>
      </div>
    </div>
  )
}

export default App
