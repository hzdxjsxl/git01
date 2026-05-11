import { useState, useCallback, useEffect } from 'react'
import BimViewer from './components/BimViewer'
import ControlPanel from './components/ControlPanel'
import { ExplodeMath } from './math/ExplodeMath'

export default function App() {
  const [elements, setElements] = useState([])
  const [categories, setCategories] = useState([])
  const [visibleCategories, setVisibleCategories] = useState(null)
  const [explodeFactor, setExplodeFactor] = useState(0)
  const [selectedElement, setSelectedElement] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadTestData = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => {
      const testData = ExplodeMath.createTestData(200)
      setElements(testData)

      const cats = [...new Set(testData.map((e) => e.category))].sort()
      setCategories(cats)
      setVisibleCategories(null)
      setExplodeFactor(0)
      setSelectedElement(null)
      setIsLoading(false)
    }, 300)
  }, [])

  useEffect(() => {
    loadTestData()
  }, [loadTestData])

  const handleExplodeChange = useCallback((value) => {
    setExplodeFactor(value)
  }, [])

  const handleCategoryToggle = useCallback((newVisible) => {
    setVisibleCategories(newVisible)
  }, [])

  const handleReset = useCallback(() => {
    setExplodeFactor(0)
    setVisibleCategories(null)
    setSelectedElement(null)
  }, [])

  const handleElementClick = useCallback((element) => {
    setSelectedElement(element)
  }, [])

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-gray-100">
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-6 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">BIM 模型查看器</h1>
            <p className="text-xs text-gray-500">支持构件爆炸分离效果</p>
          </div>
        </div>
      </div>

      <div className="w-full h-full">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600">加载模型数据中...</p>
            </div>
          </div>
        ) : elements.length > 0 ? (
          <BimViewer
            elements={elements}
            explodeFactor={explodeFactor}
            onElementClick={handleElementClick}
            visibleCategories={visibleCategories}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="flex flex-col items-center gap-4 max-w-md text-center p-8">
              <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">暂无模型数据</h2>
              <p className="text-gray-500">点击右上角控制面板中的"加载测试数据"按钮开始体验</p>
            </div>
          </div>
        )}
      </div>

      <ControlPanel
        elements={elements}
        categories={categories}
        visibleCategories={visibleCategories}
        explodeFactor={explodeFactor}
        selectedElement={selectedElement}
        onExplodeChange={handleExplodeChange}
        onCategoryToggle={handleCategoryToggle}
        onReset={handleReset}
        onLoadTestData={loadTestData}
      />

      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700">操作提示</p>
          <p>🖱️ 左键拖动: 旋转视角</p>
          <p>🖱️ 右键拖动: 平移视角</p>
          <p>🖱️ 滚轮: 缩放视图</p>
          <p>🖱️ 点击构件: 查看详情</p>
        </div>
      </div>
    </div>
  )
}
