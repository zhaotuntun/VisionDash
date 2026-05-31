/* bench.js — 解析引擎规模/性能基准（可复现：node tests/bench.js）
   生成不同规模的合成前端项目，测量 analyzeProject() 全流程耗时。 */
const A = require('../js/analyzer.js');

const DIRS = ['components', 'pages', 'hooks', 'store', 'services', 'utils'];

function genProject(n) {
  const files = [];
  for (let i = 0; i < n; i++) {
    const dir = DIRS[i % DIRS.length];
    const path = `app/src/${dir}/M${i}.jsx`;
    const imports = [];
    for (let k = 1; k <= 3; k++) {           // 依赖若干更早的模块
      const j = i - k * 7;
      if (j >= 0) imports.push(`import M${j} from '../${DIRS[j % DIRS.length]}/M${j}';`);
    }
    if (i % 50 === 0 && i + 3 < n) {          // 周期性前向引用…
      imports.push(`import F from '../${DIRS[(i + 3) % DIRS.length]}/M${i + 3}';`);
    }
    if (i % 50 === 3 && i - 3 >= 0) {          // …由 i 处反向引用闭合，形成循环依赖
      imports.push(`import B from '../${DIRS[(i - 3) % DIRS.length]}/M${i - 3}';`);
    }
    imports.push(`import React from 'react';`);                 // 外部依赖
    if (i % 3 === 0) imports.push(`import _ from 'lodash';`);
    const content = imports.join('\n') + `\nexport default function M${i}(){return <div><M${Math.max(0,i-7)}/></div>;}`;
    files.push({ path, content, size: content.length });
  }
  return files;
}

function ms(t) { return Number(t) / 1e6; }

console.log('规模(文件)\t解析总耗时(ms)\t依赖节点\t依赖连线\t循环依赖\t孤儿');
[200, 500, 1000, 2000, 4000].forEach(n => {
  const files = genProject(n);
  const paths = files.map(f => ({ path: f.path, size: f.size }));
  const t0 = process.hrtime.bigint();
  const r = A.analyzeProject(files, paths);
  const t1 = process.hrtime.bigint();
  console.log([
    n,
    ms(t1 - t0).toFixed(1),
    r.graph.nodes.length,
    r.graph.links.length,
    r.cycles.length,
    r.metrics.orphanCount
  ].join('\t'));
});
