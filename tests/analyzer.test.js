/* analyzer.test.js — 解析引擎核心逻辑单元测试（合成项目） */
const assert = require('node:assert/strict');
const A = require('../js/analyzer.js');

/* 合成一个含别名、外部依赖、循环依赖、孤儿模块的项目 */
const files = [
  { path: 'myapp/tsconfig.json', content: '{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["src/*"] } } }' },
  { path: 'myapp/src/App.jsx', content: `import React from 'react';\nimport Header from './components/Header';\nimport HomePage from '@/pages/HomePage';\nexport default function App(){return <div><Header/><HomePage/></div>;}` },
  { path: 'myapp/src/components/Header.jsx', content: `import Logo from './Logo';\nimport { useAuth } from '../hooks/useAuth';\nexport default function Header(){return <header><Logo/></header>;}` },
  { path: 'myapp/src/components/Logo.jsx', content: `export default function Logo(){return <img/>;}` },
  { path: 'myapp/src/components/ProductCard.jsx', content: `import { useCart } from '../hooks/useCart';\nexport default function ProductCard(){return <button/>;}` },
  { path: 'myapp/src/pages/HomePage.jsx', content: `import ProductCard from '../components/ProductCard';\nimport { useProducts } from '@/hooks/useProducts';\nexport default function HomePage(){return <ProductCard/>;}` },
  { path: 'myapp/src/hooks/useAuth.js', content: `import authStore from '../store/authStore';\nexport function useAuth(){return authStore;}` },
  { path: 'myapp/src/hooks/useProducts.js', content: `import productStore from '../store/productStore';\nexport function useProducts(){}` },
  { path: 'myapp/src/hooks/useCart.js', content: `import cartStore from '../store/cartStore';\nexport function useCart(){}` },
  { path: 'myapp/src/store/authStore.js', content: `import api from '../services/api';\nexport default {};` },
  { path: 'myapp/src/store/productStore.js', content: `import api from '../services/api';\nexport default {};` },
  { path: 'myapp/src/store/cartStore.js', content: `import api from '../services/api';\nexport default {};` },
  { path: 'myapp/src/services/api.js', content: `import { format } from '../utils/format';\nexport default {};` },
  { path: 'myapp/src/utils/format.js', content: `export function format(){}` },
  { path: 'myapp/src/cycleA.js', content: `import './cycleB';\nexport const a=1;` },
  { path: 'myapp/src/cycleB.js', content: `import './cycleA';\nexport const b=1;` },
  { path: 'myapp/src/orphan.js', content: `export const x=1;` }
];
const fileSet = new Set(files.map(f => f.path));
const aliases = A.detectAliases(files);

/* 1. 路径解析：相对 / 别名 / 外部 */
assert.deepEqual(A.resolveImport('./components/Header', 'myapp/src/App.jsx', fileSet, aliases),
  { internal: 'myapp/src/components/Header.jsx' }, '相对导入应解析到完整路径');
assert.deepEqual(A.resolveImport('@/pages/HomePage', 'myapp/src/App.jsx', fileSet, aliases),
  { internal: 'myapp/src/pages/HomePage.jsx' }, '别名 @/ 应解析到 src');
assert.deepEqual(A.resolveImport('react', 'myapp/src/App.jsx', fileSet, aliases),
  { external: 'react' }, '裸说明符应判为外部依赖');
assert.deepEqual(A.resolveImport('@scope/pkg/sub', 'myapp/src/App.jsx', fileSet, aliases),
  { external: '@scope/pkg' }, 'scoped 包名应保留 scope');

/* 2. 依赖图：按路径标识 + 内外部区分 + 扇入扇出 */
const graph = A.buildDependencyGraph(files, { aliases });
const ids = new Set(graph.nodes.map(n => n.id));
assert.ok(ids.has('myapp/src/services/api.js'), '节点用完整路径标识');
assert.ok(ids.has('npm:react'), '外部依赖标记为 npm:*');
const api = graph.nodes.find(n => n.id === 'myapp/src/services/api.js');
assert.equal(api.fanIn, 3, 'api.js 应被 3 个 store 依赖');
assert.equal(api.internal, true);
const react = graph.nodes.find(n => n.id === 'npm:react');
assert.equal(react.internal, false, 'react 应为外部');

/* 3. 循环依赖检测 */
const cycles = A.detectCycles(graph);
const hasCycle = cycles.some(c =>
  c.includes('myapp/src/cycleA.js') && c.includes('myapp/src/cycleB.js'));
assert.ok(hasCycle, '应检出 cycleA<->cycleB 循环依赖');

/* 4. 架构指标：孤儿 + 最被依赖 */
const m = A.computeMetrics(graph, cycles);
assert.ok(m.orphans.includes('myapp/src/orphan.js'), 'orphan.js 应判为孤儿模块');
assert.equal(m.mostDepended[0].id, 'myapp/src/services/api.js', '最被依赖应为 api.js');
assert.ok(m.cycleCount >= 1);

/* 5. 组件层次树：根 + 渲染子组件 */
const tree = A.buildComponentTree(files, { aliases });
assert.equal(tree.name, 'App', '组件树根应为 App');
const childNames = (tree.children || []).map(c => c.name);
assert.ok(childNames.includes('Header') && childNames.includes('HomePage'), 'App 应渲染 Header 与 HomePage');
const header = tree.children.find(c => c.name === 'Header');
assert.ok((header.children || []).some(c => c.name === 'Logo'), 'Header 应渲染 Logo');

/* 6. 路由层级：从 pages/ 推导 */
const routes = A.buildRouteTree(A.buildFileTree(files.map(f => ({ path: f.path, size: 0 }))), files);
const routeNames = JSON.stringify(routes);
assert.ok(/HomePage/.test(routeNames), '路由应包含 HomePage');

/* 7. 数据流：分层且不画同层 */
const flow = A.buildDataFlow(graph, {});
assert.ok(flow && flow.nodes.length >= 3, '数据流应有多层节点');
const layerById = new Map(flow.nodes.map(n => [n.id, n.layer]));
flow.links.forEach(l => assert.notEqual(layerById.get(l.source), layerById.get(l.target), '同层不应连线'));
const apiLayer = layerById.get('myapp/src/services/api.js');
assert.equal(apiLayer, 0, 'service 应在第 0 层（数据源）');

/* 8. 文件树 */
const ft = A.buildFileTree([{ path: 'myapp/src/a.js', size: 10 }, { path: 'myapp/src/b/c.js', size: 20 }]);
assert.equal(ft.name, 'myapp');
assert.ok(ft.children.find(c => c.name === 'src'));

/* 9. 指标对"无 internal/fanIn 字段"的外部图（示例/JSON 上传）也成立 */
const plainGraph = {
  nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'Z' }],
  links: [{ source: 'A', target: 'B' }, { source: 'C', target: 'B' }, { source: 'A', target: 'C' }]
};
const pm = A.computeMetrics(plainGraph);
assert.equal(pm.mostDepended[0].id, 'B', '无 fanIn 字段时应自动补齐度数：B 最被依赖');
assert.ok(pm.orphans.includes('Z'), 'Z 应判为孤儿');
assert.equal(pm.fileCount, 4, '缺省 internal 时全部计为内部模块');

console.log('analyzer tests passed (9 groups)');
