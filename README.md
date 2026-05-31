# Web 前端界面层次可视化系统 · Frontend Hierarchy Visualizer

面向**大型 Web 前端项目**的层次化可视化与架构诊断平台。上传一个前端代码库（或 JSON），系统在浏览器内完成"静态解析 → 架构建模 → 图形渲染"，从 6 个维度层次化地呈现项目结构，并自动**检测循环依赖、孤儿模块与耦合热点**，帮助开发者快速理解架构、定位问题、规划重构。

> 纯前端、零构建、零后端：仅依赖本地 D3.js v7，双击 `index.html` 即可运行。

---

## ✨ 功能特性

| 视图 | 技术 | 说明 |
|------|------|------|
| 🌳 组件层次树 | D3 Tidy Tree | 由 JSX/模板用法解析出的**真实组件渲染层次**，可折叠、深度滑块控制层级 |
| 🔗 依赖关系图 | D3 力导向图 | 模块依赖，**按完整路径标识**、区分内部模块/外部 npm、**循环依赖红色高亮**、可隐藏外部依赖 |
| ☀️ 路由层级图 | D3 Partition 旭日图 | 解析 `<Route>` 配置或文件路由约定（含 `[id]`→`:id` 动态段） |
| 📦 模块矩形树图 | D3 Treemap | 按文件大小排布，支持下钻与面包屑 |
| ⚡ 数据流向图 | 自定义分层布局 | 按架构角色（服务→Store→Hooks→页面→组件）**从真实依赖推导**的数据流，带动画粒子 |
| 🩺 架构诊断 | 指标仪表盘 | 循环依赖链、孤儿模块、最被依赖/高耦合模块 Top 榜、规模指标卡片 |

其他：全局搜索高亮、悬停提示与详情面板、缩放/平移、全屏、颜色图例、**导出当前视图为 SVG**（论文/文档配图）、上传进度反馈。

---

## 🚀 快速开始

**方式一：直接打开**
双击 `index.html`（推荐用 Chrome / Edge）。

**方式二：本地静态服务（推荐，避免个别浏览器的 file:// 限制）**
```bash
npm run serve      # 启动 http://localhost:8080
```

**运行测试**
```bash
npm test           # 解析引擎单测 + 组件树深度测试 + 集成测试
```

---

## 📂 上传与解析

点击侧栏「上传项目文件」：

- **上传项目目录**：选择前端项目文件夹。系统会
  - 读取全部源文件（`.js/.jsx/.ts/.tsx/.vue/.mjs/.cjs`，单文件 ≤ 1.5MB，分块异步、无数量上限）；
  - 还原文件树 → 组件树 & 矩形树图；
  - 解析 `import / export from / require / import()` → 依赖图（含路径别名 `@/`、tsconfig/jsconfig `paths`）；
  - 运行 Tarjan 算法检测循环依赖、计算扇入/扇出等指标；
  - 解析路由与数据流。解析完成后默认进入「架构诊断」。
- **上传 JSON 配置**：直接提供已建模的数据（见下）。

---

## 📐 JSON 数据格式规范

顶层对象的字段**均为可选**，提供哪个就覆盖哪个视图：

```jsonc
{
  "componentTree": <TreeNode>,   // 组件层次树
  "treemap":       <TreeNode>,   // 模块矩形树图（需 size）
  "routes":        <RouteNode>,  // 路由层级
  "dependency":    <Graph>,      // 依赖关系图
  "dataflow":      <FlowGraph>   // 数据流向
}
```

也可直接上传一个 **`{name, children}` 树**，将同时用于组件树 / 矩形树图 / 路由。

**TreeNode**（树形）
```jsonc
{ "name": "App", "category": "layout", "size": 4200, "children": [ <TreeNode>, ... ] }
// size：字节数（矩形树图按其排布）；叶子节点无 children
```

**RouteNode**
```jsonc
{ "name": "products", "path": "/products", "component": "ProductsPage",
  "category": "page", "size": 1, "children": [ <RouteNode>, ... ] }
```

**Graph（依赖图）**
```jsonc
{
  "nodes": [ { "id": "src/App.jsx", "label": "App", "category": "page",
               "internal": true, "size": 8 } ],
  "links": [ { "source": "src/App.jsx", "target": "npm:react" } ]
}
// internal 缺省视为 true；缺省 fanIn/fanOut 会自动按 links 补齐
```

**FlowGraph（数据流）**
```jsonc
{
  "nodes": [ { "id": "store", "label": "CartStore", "category": "store", "layer": 1 } ],
  "links": [ { "source": "store", "target": "page", "value": 2 } ],
  "layerLabels": ["服务/数据源","状态管理","Hooks/Selectors","页面","组件"]
}
```

**category 取值**（决定配色）：`page · layout · component · common · store · util · hook · service · action · style · asset · route · external · default`

---

## 🧠 解析能力与边界

**能解析**：ES Module / CommonJS 的静态与动态导入；相对路径、`index` 文件、`@/` 与 tsconfig/jsconfig 路径别名；JSX/模板中的组件用法；`<Route path>` 与 `pages|views|app|routes|screens` 文件路由约定；按架构角色分层的数据流。

**启发式（非 100% 精确）**：模块类别由路径/命名推断；组件树以"首次出现展开、重复引用标记为引用"近似处理无法表达的 DAG/递归；数据流每层取度数 Top-12 以保证大图可读（会标记截断）。

**暂不支持**：运行时动态拼接的导入路径、webpack/vite 自定义 resolve 的复杂别名、宏/代码生成产物、跨语言后端调用。这些属于已知局限（详见论文「局限与展望」）。

---

## 🗂 项目结构

```
index.html              入口（按序加载脚本）
css/style.css           设计系统与样式
js/
  vendor/d3.v7.min.js   D3 v7
  analyzer.js           ★ 静态解析引擎（纯函数、可测、浏览器/Node 双模式）
  utils.js              配色 / Tooltip / 详情面板 / 转义 / 格式化
  data.js               内置电商示例数据
  app.js                主控：视图切换、上传解析、导出、图例
  component-tree.js / dependency-graph.js / route-sunburst.js /
  module-treemap.js / data-flow.js / overview.js   六个视图
tests/                  Node 单元测试 + 集成测试
package.json            test / serve 脚本
```

**分层架构**：`analyzer.js`（与 DOM 无关的解析引擎）→ `app.js`（主控 + 数据装配）→ 六个视图类（仅负责渲染，统一 `search()/destroy()` 接口）。引擎与渲染解耦，便于测试与扩展。

---

## ✅ 测试

`tests/` 以 Node 原生 `assert` 编写，无三方依赖：
- `analyzer.test.js` — 路径解析、内外部区分、循环依赖、指标、组件树、路由、数据流、缺度数补齐（9 组）
- `integration.test.js` — `analyzeProject()` 产出即各视图消费的对象形状
- `component-tree-depth.test.js` — 组件树深度折叠逻辑

---

## 🛠 技术栈

原生 HTML / CSS / JavaScript（ES6 Class）+ D3.js v7。无打包工具、无运行时依赖、无后端。

## 📜 许可

MIT
