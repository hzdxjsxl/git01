import { useState, useEffect } from 'react'

const CATEGORY_COLORS = {
  Wall: '#8B4513',
  Floor: '#696969',
  Roof: '#8B0000',
  Column: '#4682B4',
  Beam: '#2F4F4F',
  Window: '#87CEEB',
  Door: '#8B4513',
  Stair: '#708090',
}

export default function ControlPanel({
  elements,
  categories,
  visibleCategories,
  explodeFactor,
  selectedElement,
  onExplodeChange,
  onCategoryToggle,
  onReset,
  onLoadTestData,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsCollapsed((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const allCategoriesVisible = visibleCategories?.length === categories.length || visibleCategories === null

  const handleSelectAll = () => {
    onCategoryToggle(null)
  }

  const handleSelectNone = () => {
    onCategoryToggle([])
  }

  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCategoryCount = (category) => {
    return elements.filter((el) => el.category === category).length
  }

  return (
    <div
      className={`absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl transition-all duration-300 ${
        isCollapsed ? 'w-12' : 'w-80'
      }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-3 top-4 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors z-10"
        title={isCollapsed ? '展开面板' : '收起面板'}
      >
        <svg
          className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {!isCollapsed && (
        <div className="p-4 space-y-5">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              控制面板
            </h2>
            <p className="text-xs text-gray-500 mt-1">控制模型显示和爆炸效果</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">爆炸效果</label>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-mono">
                {(explodeFactor * 100).toFixed(0)}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={explodeFactor}
              onChange={(e) => onExplodeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => onExplodeChange(0)}
                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                复原
              </button>
              <button
                onClick={() => onExplodeChange(0.5)}
                className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
              >
                50%
              </button>
              <button
                onClick={() => onExplodeChange(1)}
                className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                100%
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">分类显示</label>
              <div className="flex gap-1">
                <button
                  onClick={handleSelectAll}
                  className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                  disabled={allCategoriesVisible}
                >
                  全选
                </button>
                <button
                  onClick={handleSelectNone}
                  className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                  disabled={visibleCategories?.length === 0}
                >
                  清空
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="搜索分类..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
              {filteredCategories.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">未找到分类</div>
              ) : (
                filteredCategories.map((category) => {
                  const isVisible = !visibleCategories || visibleCategories.includes(category)
                  const count = getCategoryCount(category)
                  const color = CATEGORY_COLORS[category] || '#aaaaaa'

                  return (
                    <label
                      key={category}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        isVisible ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-50 hover:bg-gray-100 opacity-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => {
                          if (visibleCategories === null) {
                            const newVisible = categories.filter((c) => c !== category)
                            onCategoryToggle(newVisible)
                          } else {
                            if (isVisible) {
                              const newVisible = visibleCategories.filter((c) => c !== category)
                              onCategoryToggle(newVisible)
                            } else {
                              const newVisible = [...visibleCategories, category]
                              onCategoryToggle(newVisible)
                            }
                          }
                        }}
                        className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                      />
                      <div
                        className="w-4 h-4 rounded border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm text-gray-700 flex-1">{category}</span>
                      <span className="text-xs text-gray-400 font-mono">{count}</span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {selectedElement && (
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                选中构件
              </h3>
              <div className="space-y-1 text-xs text-blue-700">
                <div className="flex justify-between">
                  <span className="font-medium">ID:</span>
                  <span className="font-mono">{selectedElement.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">分类:</span>
                  <span>{selectedElement.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">位置:</span>
                  <span className="font-mono">
                    ({selectedElement.position.x.toFixed(2)}, {selectedElement.position.y.toFixed(2)},{' '}
                    {selectedElement.position.z.toFixed(2)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">尺寸:</span>
                  <span className="font-mono">
                    {selectedElement.size.x.toFixed(2)} × {selectedElement.size.y.toFixed(2)} ×{' '}
                    {selectedElement.size.z.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-gray-200">
            <button
              onClick={onReset}
              className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              重置视图
            </button>

            <button
              onClick={onLoadTestData}
              className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              加载测试数据
            </button>
          </div>

          <div className="pt-2 text-center">
            <p className="text-xs text-gray-400">按 ESC 键切换面板</p>
          </div>
        </div>
      )}
    </div>
  )
}
