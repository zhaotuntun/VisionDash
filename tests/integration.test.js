/* integration.test.js — 验证 analyzeProject() 产出的对象形状即各视图所消费的结构 */
const assert = require('node:assert/strict');
const A = require('../js/analyzer.js');

/* 一个更接近真实的合成项目：含别名、外部依赖、循环、孤儿、vue、pages 路由 */
const files = [
  { path: 'shop/tsconfig.json', size: 80, content: '{"compilerOptions":{"baseUrl":".","paths":{"@/*":["src/*"]}}}' },
  { path: 'shop/src/main.jsx', size: 200, content: `import App from './App';\nimport React from 'react';` },
  { path: 'shop/src/App.jsx', size: 400, content: `import Header from '@/components/Header';\nimport Home from './pages/Home';\nexport default function App(){return <div><Header/><Home/></div>;}` },
  { path: 'shop/src/components/Header.jsx', size: 300, content: `import Logo from './Logo';\nimport { useCart } from '@/hooks/useCart';\nexport default function Header(){return <header><Logo/></header>;}` },
  { path: 'shop/src/components/Logo.jsx', size: 100, content: `export default function Logo(){return <img/>;}` },
  { path: 'shop/src/pages/Home.jsx', size: 350, content: `import Card from '../components/Card';\nimport { useProducts } from '@/hooks/useProducts';\nexport default function Home(){return <Card/>;}` },
  { path: 'shop/src/components/Card.jsx', size: 220, content: `import { useCart } from '@/hooks/useCart';\nexport default function Card(){return <button/>;}` },
  { path: 'shop/src/hooks/useCart.js', size: 180, content: `import store from '@/store/cartStore';\nimport axios from 'axios';\nexport function useCart(){return store;}` },
  { path: 'shop/src/hooks/useProducts.js', size: 160, content: `import store from '@/store/productStore';\nexport function useProducts(){}` },
  { path: 'shop/src/store/cartStore.js', size: 240, content: `import api from '@/services/api';\nexport default {};` },
  { path: 'shop/src/store/productStore.js', size: 240, content: `import api from '@/services/api';\nexport default {};` },
  { path: 'shop/src/services/api.js', size: 300, content: `import axios from 'axios';\nexport default {};` },
  { path: 'shop/src/pages/About.jsx', size: 120, content: `export default function About(){return <div/>;}` },
  // 循环：x <-> y
  { path: 'shop/src/x.js', size: 50, content: `import './y';\nexport const x=1;` },
  { path: 'shop/src/y.js', size: 50, content: `import './x';\nexport const y=1;` },
  // 孤儿
  { path: 'shop/src/legacy.js', size: 90, content: `export const dead=1;` },
  // 资源（仅进文件树/矩形树图）
  { path: 'shop/src/assets/logo.svg', size: 1200, content: undefined },
  { path: 'shop/README.md', size: 500, content: undefined }
];
const paths = files.map(f => ({ path: f.path, size: f.size }));
const srcFiles = files.filter(f => f.content != null);

const r = A.analyzeProject(srcFiles, paths);

/* 顶层产出齐全 */
['fileTree', 'graph', 'cycles', 'metrics', 'componentTree', 'routes', 'dataflow', 'treemap'].forEach(k =>
  assert.ok(r[k] !== undefined, `analyzeProject 应包含 ${k}`));

/* 组件树（ComponentTree 视图消费 {name, children}） */
assert.equal(r.componentTree.name, 'App');
assert.ok(Array.isArray(r.componentTree.children) && r.componentTree.children.length, '组件树应有子节点');

/* 矩形树图（ModuleTreemap 消费 {name, children, size}），资源文件应计入 */
assert.equal(r.treemap.name, 'shop');
const flat = JSON.stringify(r.treemap);
assert.ok(/logo\.svg/.test(flat), '文件树应包含资源文件 logo.svg');

/* 依赖图（DependencyGraph 消费 {nodes,links}），axios 为外部 */
assert.ok(r.graph.nodes.some(n => n.id === 'npm:axios' && n.internal === false), 'axios 应为外部依赖');
assert.ok(r.graph.nodes.some(n => n.id === 'shop/src/services/api.js'), '节点用完整路径');

/* 循环依赖 */
assert.ok(r.cycles.some(c => c.includes('shop/src/x.js') && c.includes('shop/src/y.js')), '应检出 x<->y 循环');

/* 指标 */
assert.ok(r.metrics.orphans.includes('shop/src/legacy.js'), 'legacy.js 应为孤儿');
assert.ok(r.metrics.mostDepended.length >= 1);
assert.ok(r.metrics.externalCount >= 1);

/* 路由（RouteSunburst 消费 {name,path,children}） */
assert.equal(r.routes.path, '/');
const routeStr = JSON.stringify(r.routes);
assert.ok(/Home/i.test(routeStr) && /About/i.test(routeStr), '路由应包含 Home 与 About 两个页面');

/* 数据流（DataFlow 消费 {nodes:[{layer}],links}），跨层连线、service 在第 0 层 */
assert.ok(r.dataflow && r.dataflow.nodes.length >= 3, '数据流应有多层节点');
const layerById = new Map(r.dataflow.nodes.map(n => [n.id, n.layer]));
r.dataflow.links.forEach(l => assert.notEqual(layerById.get(l.source), layerById.get(l.target), '数据流同层不应连线'));
assert.equal(layerById.get('shop/src/services/api.js'), 0, 'service 应在数据源层');

console.log('integration tests passed (analyzeProject → view-ready shapes)');
