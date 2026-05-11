import { MarkdownView } from './markdown'
import './App.css'

const sampleMarkdown = `# 极简 Markdown 渲染引擎

## 功能特性

这是一个**从零手写**的 Markdown 渲染引擎，_不依赖任何三方包_。

### 支持的语法

- 标题 (H1 ~ H6)
- **粗体** 和 *斜体*
- \`行内代码\`
- [链接](https://react.dev)
- 有序列表
- 无序列表
- 引用块

## 嵌套语法测试

### 粗体内部包含斜体

这是**粗体 *内含斜体* 文本**的演示。

### 斜体内部包含粗体

这是*斜体 **内含粗体** 文本*的演示。

### 多重嵌套

**粗体 *斜体 再加粗*** 的组合效果。

### 链接与格式结合

访问 [**React 官网**](https://react.dev) 了解更多。

## 示例

> 这是一段引用文字。
> 可以包含多行。

1. 第一步
2. 第二步
3. 第三步

## 代码结构

核心组件：
- \`Parser.ts\` - 分词和生成 AST
- \`Renderer.tsx\` - AST 转 React 元素
- \`MarkdownView.tsx\` - 对外暴露的组件`

function App() {
  return (
    <div className="container">
      <MarkdownView source={sampleMarkdown} className="markdown" />
    </div>
  )
}

export default App
