# 智能家居电费峰谷优化计算大盘

基于Spring Boot + Svelte的智能家居电费优化系统。后端提供原始数据API，前端使用动态规划算法计算最优电器调度策略，并以甘特图形式展示。

## 项目架构

```
.
├── backend/          # Spring Boot后端
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/smart/home/
│       │   ├── HomeEnergyOptimizerApplication.java
│       │   ├── config/WebConfig.java
│       │   └── controller/EnergyController.java
│       └── resources/application.properties
└── frontend/         # Svelte前端
    ├── package.json
    ├── vite.config.js
    ├── svelte.config.js
    ├── index.html
    └── src/
        ├── main.js
        ├── App.svelte
        ├── GanttChart.svelte
        ├── api.js
        └── optimizer.js
```

## 快速启动

### 前置要求
- JDK 11+
- Maven 3.6+
- Node.js 16+
- npm 7+

### 方式一：分别启动

**1. 启动后端**
```bash
cd backend
mvn spring-boot:run
```
后端将在 http://localhost:8080 启动

**2. 启动前端**
```bash
cd frontend
npm install
npm run dev
```
前端将在 http://localhost:5173 启动

### 方式二：使用启动脚本（PowerShell）

**启动后端：**
```powershell
cd backend
mvn clean compile
mvn spring-boot:run
```

**启动前端（新终端）：**
```powershell
cd frontend
npm install
npm run dev
```

## API接口

后端提供两个极简的JSON接口：

### GET /api/appliances
返回所有电器的原始参数：
```json
{
  "appliances": [
    {
      "id": "air_conditioner",
      "name": "空调",
      "powerWatts": 1500,
      "durationHours": 8,
      "usageWindow": [10, 22],
      "unit": "瓦"
    }
  ]
}
```

### GET /api/electricity-prices
返回24小时峰谷电价：
```json
{
  "hourlyPrices": [0.25, 0.25, ...],
  "periods": [
    {"type": "谷时", "time": "00:00-06:00", "price": 0.25},
    {"type": "平时", "time": "06:00-10:00", "price": 0.85}
  ],
  "currency": "元/度"
}
```

## 优化算法说明

前端使用动态规划算法（类似背包问题思路）进行优化：

1. **电器排序**：按功耗×时长降序排列，优先安排高耗能电器
2. **时间窗口约束**：每个电器只能在指定的使用时段内运行
3. **成本计算**：遍历所有可能的运行时段，计算电费成本
4. **冲突避免**：避免电器运行时段冲突（考虑可用窗口）
5. **最优选择**：选择总成本最低的调度方案

## 功能特性

- ✅ 后端极简：只返回原始数据，不做任何计算
- ✅ 前端智能：动态规划算法计算最优调度
- ✅ 甘特图展示：可视化电器运行时段
- ✅ 电价分层：谷时/平时/峰时/尖峰四段定价
- ✅ 节省对比：自动计算优化前后的电费差异
- ✅ 响应式设计：支持桌面和移动端

## 技术栈

**后端：**
- Spring Boot 2.7.x
- Java 11+
- Maven

**前端：**
- Svelte 4.x
- Vite 4.x
- 原生CSS（无额外UI库依赖）
