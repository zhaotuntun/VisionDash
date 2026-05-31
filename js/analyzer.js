/* ================================================================
   analyzer.js — 前端项目静态解析引擎（纯函数，可测试）
   ----------------------------------------------------------------
   双模式：浏览器下挂到全局 window.Analyzer；Node 下导出 module.exports。
   职责：从 [{path, content, size}] 文件集中解析出
     · 依赖关系图（按解析后路径标识、区分内部/外部、扇入扇出）
     · 循环依赖（Tarjan SCC）与架构指标
     · 组件层次树（JSX/模板用法）
     · 路由层级（文件路由约定 + <Route> 配置）
     · 数据流向（按架构角色分层）
   ================================================================ */
(function (root) {
  'use strict';

  /* ---------------- 通用工具 ---------------- */
  const SRC_EXTS = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.mjs', '.cjs'];
  const RESOLVE_EXTS = SRC_EXTS.concat(['.json']);

  function baseName(path) {
    return path.split('/').pop().replace(/\.\w+$/, '');
  }
  function dirOf(path) {
    const i = path.lastIndexOf('/');
    return i < 0 ? '' : path.slice(0, i);
  }
  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** 规整路径中的 . 与 .. 段 */
  function normalizePath(p) {
    const out = [];
    p.split('/').forEach(seg => {
      if (seg === '' || seg === '.') return;
      if (seg === '..') { if (out.length) out.pop(); return; }
      out.push(seg);
    });
    return out.join('/');
  }
  function joinPath() {
    return normalizePath(Array.prototype.join.call(arguments, '/'));
  }

  /** 去掉行/块注释，降低注释中字符串造成的误匹配 */
  function stripComments(s) {
    return s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n\r]*/g, '$1'); // 避免吃掉 http://
  }

  /* ---------------- 分类推断 ---------------- */
  function guessCategory(name, parts) {
    const n = (name || '').toLowerCase();
    const p = (parts || []).join('/').toLowerCase();
    if (/\.(css|scss|less|styl)$/i.test(n)) return 'style';
    if (/\.(png|jpe?g|svg|gif|ico|webp|woff2?|ttf)$/i.test(n)) return 'asset';
    if (/store|redux|vuex|pinia|zustand|mobx|recoil/.test(p)) return 'store';
    if (/(^|\/)(actions?|reducers?|sagas?|effects?|thunks?)(\/|\.|$)/.test(p)) return 'action';
    if (/hook|composable|use[A-Z]/.test(p) || /^use[A-Z]/.test(name || '')) return 'hook';
    if (/service|\bapi\b|request|fetch|axios/.test(p)) return 'service';
    if (/util|helper|lib|common\/.*util/.test(p)) return 'util';
    if (/(^|\/)(pages?|views?|screens?)(\/|$)/.test(p)) return 'page';
    if (/route|router/.test(p)) return 'route';
    if (/(^|\/)(layouts?)(\/|$)/.test(p)) return 'layout';
    if (/component|widget/.test(p)) return 'component';
    if (/common|shared|(^|\/)ui(\/|$)/.test(p)) return 'common';
    return 'default';
  }

  /* ---------------- 导入语句提取 ---------------- */
  /** 仅返回模块说明符列表 */
  function extractImports(content) {
    const src = stripComments(content || '');
    const specs = [];
    const patterns = [
      /\b(?:import|export)\b[\s\S]*?\bfrom\s*['"]([^'"]+)['"]/g, // import/export ... from 'x'
      /\bimport\s*['"]([^'"]+)['"]/g,                            // import 'x' (副作用)
      /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,                  // import('x') 动态
      /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g                  // require('x')
    ];
    patterns.forEach(re => { let m; while ((m = re.exec(src))) specs.push(m[1]); });
    return specs;
  }

  /** 返回 {spec, names[], hasDefault} —— 用于组件用法判定 */
  function extractImportBindings(content) {
    const src = stripComments(content || '');
    const out = [];
    const re = /import\s+([\s\S]*?)\s+from\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src))) {
      const clause = m[1].trim();
      const spec = m[2];
      const names = [];
      let hasDefault = false;
      const ns = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
      if (ns) names.push(ns[1]);
      const braces = clause.match(/\{([^}]*)\}/);
      if (braces) {
        braces[1].split(',').forEach(part => {
          const t = part.trim();
          if (!t) return;
          const asM = t.match(/\bas\s+([A-Za-z_$][\w$]*)/);
          names.push(asM ? asM[1] : t.split(/\s+/)[0]);
        });
      }
      const defM = clause.match(/^([A-Za-z_$][\w$]*)\s*(?:,|$)/);
      if (defM) { names.push(defM[1]); hasDefault = true; }
      out.push({ spec, names, hasDefault });
    }
    const rq = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = rq.exec(src))) out.push({ spec: m[2], names: [m[1]], hasDefault: true });
    return out;
  }

  /* ---------------- 路径别名检测 ---------------- */
  function detectAliases(files) {
    const aliases = [];
    const conf = files.find(f => /(^|\/)(tsconfig|jsconfig)\.json$/i.test(f.path) && f.content);
    if (conf) {
      try {
        const cleaned = conf.content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/,(\s*[}\]])/g, '$1');
        const json = JSON.parse(cleaned);
        const co = json.compilerOptions || {};
        const baseDir = joinPath(dirOf(conf.path), co.baseUrl || '.');
        if (co.paths) {
          Object.keys(co.paths).forEach(key => {
            const tgt = ((co.paths[key] || [])[0] || '').replace(/\*$/, '');
            aliases.push({ prefix: key.replace(/\*$/, ''), target: joinPath(baseDir, tgt) });
          });
        }
      } catch (e) { /* tolerant */ }
    }
    // 启发式 @ → src
    if (!aliases.some(a => a.prefix[0] === '@')) {
      const srcPath = files.map(f => f.path).find(p => /(^|\/)src\//.test(p));
      if (srcPath) {
        const root = srcPath.slice(0, srcPath.indexOf('src/') + 4); // 含 "src/"
        aliases.push({ prefix: '@/', target: root });
        aliases.push({ prefix: '@', target: root.replace(/\/$/, '') });
      }
    }
    return aliases;
  }

  /* ---------------- 导入解析 ---------------- */
  function externalName(spec) {
    const parts = spec.split('/');
    return spec[0] === '@' ? parts.slice(0, 2).join('/') : parts[0];
  }
  function matchFile(base, fileSet) {
    if (fileSet.has(base)) return base;
    for (const e of RESOLVE_EXTS) if (fileSet.has(base + e)) return base + e;
    for (const e of RESOLVE_EXTS) if (fileSet.has(base + '/index' + e)) return base + '/index' + e;
    return null;
  }
  /** → {internal:path} | {external:name} | null(未解析的相对导入) */
  function resolveImport(spec, fromPath, fileSet, aliases) {
    if (!spec) return null;
    let base = null;
    if (spec[0] === '.') {
      base = joinPath(dirOf(fromPath), spec);
    } else {
      for (const a of (aliases || [])) {
        if (spec === a.prefix.replace(/\/$/, '') || spec.indexOf(a.prefix) === 0) {
          base = joinPath(a.target, spec.slice(a.prefix.length));
          break;
        }
      }
      if (base === null) return { external: externalName(spec) };
    }
    const hit = matchFile(base, fileSet);
    return hit ? { internal: hit } : null;
  }

  /* ---------------- 依赖关系图 ---------------- */
  function buildDependencyGraph(files, opts) {
    opts = opts || {};
    const aliases = opts.aliases || detectAliases(files);
    const includeExternal = opts.includeExternal !== false;
    const fileSet = new Set(files.map(f => f.path));
    const nodes = new Map();
    const linkKeys = new Set();
    const links = [];

    function ensure(id, props) {
      let n = nodes.get(id);
      if (!n) { n = Object.assign({ id: id, fanIn: 0, fanOut: 0 }, props); nodes.set(id, n); }
      return n;
    }

    files.filter(f => SRC_EXTS.some(e => f.path.toLowerCase().endsWith(e))).forEach(f => {
      ensure(f.path, {
        label: baseName(f.path),
        category: guessCategory(baseName(f.path), f.path.split('/')),
        internal: true, size: f.size || 0
      });
      extractImports(f.content || '').forEach(spec => {
        const res = resolveImport(spec, f.path, fileSet, aliases);
        if (!res) return;
        let targetId;
        if (res.internal) {
          targetId = res.internal;
          ensure(targetId, { label: baseName(targetId), category: guessCategory(baseName(targetId), targetId.split('/')), internal: true, size: 0 });
        } else {
          if (!includeExternal) return;
          targetId = 'npm:' + res.external;
          ensure(targetId, { label: res.external, category: 'external', internal: false, size: 0 });
        }
        if (targetId === f.path) return;
        const key = f.path + ' ' + targetId;
        if (linkKeys.has(key)) return;
        linkKeys.add(key);
        links.push({ source: f.path, target: targetId });
        nodes.get(f.path).fanOut++;
        nodes.get(targetId).fanIn++;
      });
    });

    // 依赖图节点显示尺寸 = 度数
    nodes.forEach(n => { n.size = Math.max(3, n.fanIn + n.fanOut); });
    return { nodes: Array.from(nodes.values()), links: links };
  }

  /* ---------------- 循环依赖（迭代式 Tarjan SCC） ---------------- */
  function detectCycles(graph) {
    const adj = new Map();
    graph.nodes.forEach(n => adj.set(n.id, []));
    const selfLoops = [];
    graph.links.forEach(l => {
      if (l.source === l.target) { selfLoops.push([l.source]); return; }
      if (adj.has(l.source)) adj.get(l.source).push(l.target);
    });

    let index = 0;
    const idx = new Map(), low = new Map(), onStack = new Set(), S = [];
    const cycles = [];

    graph.nodes.forEach(start => {
      if (idx.has(start.id)) return;
      const callStack = [{ v: start.id, i: 0 }];
      while (callStack.length) {
        const frame = callStack[callStack.length - 1];
        const v = frame.v;
        if (frame.i === 0) { idx.set(v, index); low.set(v, index); index++; S.push(v); onStack.add(v); }
        const nb = adj.get(v) || [];
        if (frame.i < nb.length) {
          const w = nb[frame.i]; frame.i++;
          if (!idx.has(w)) callStack.push({ v: w, i: 0 });
          else if (onStack.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
        } else {
          if (low.get(v) === idx.get(v)) {
            const comp = []; let w;
            do { w = S.pop(); onStack.delete(w); comp.push(w); } while (w !== v);
            if (comp.length > 1) cycles.push(comp);
          }
          callStack.pop();
          if (callStack.length) {
            const p = callStack[callStack.length - 1].v;
            low.set(p, Math.min(low.get(p), low.get(v)));
          }
        }
      }
    });
    return cycles.concat(selfLoops);
  }

  /* ---------------- 架构指标 ---------------- */
  /** 为缺少扇入/扇出的图（示例/JSON 上传）补齐度数；引擎自建图为幂等空操作 */
  function ensureDegrees(graph) {
    const need = graph.nodes.some(n => n.fanIn == null || n.fanOut == null);
    if (!need) return graph;
    const byId = new Map(graph.nodes.map(n => [n.id, n]));
    graph.nodes.forEach(n => { n.fanIn = 0; n.fanOut = 0; });
    graph.links.forEach(l => {
      const s = (l.source && l.source.id != null) ? l.source.id : l.source;
      const t = (l.target && l.target.id != null) ? l.target.id : l.target;
      if (byId.has(s)) byId.get(s).fanOut++;
      if (byId.has(t)) byId.get(t).fanIn++;
    });
    graph.nodes.forEach(n => { if (n.size == null) n.size = Math.max(3, n.fanIn + n.fanOut); });
    return graph;
  }

  function computeMetrics(graph, cycles) {
    ensureDegrees(graph);
    cycles = cycles || detectCycles(graph);
    const internal = graph.nodes.filter(n => n.internal !== false);
    const external = graph.nodes.filter(n => n.internal === false);
    const orphans = internal.filter(n => n.fanIn === 0 && n.fanOut === 0);
    const byFanIn = internal.slice().sort((a, b) => b.fanIn - a.fanIn);
    const byFanOut = internal.slice().sort((a, b) => b.fanOut - a.fanOut);
    const inCycle = new Set();
    cycles.forEach(c => c.forEach(id => inCycle.add(id)));
    return {
      fileCount: internal.length,
      externalCount: external.length,
      linkCount: graph.links.length,
      orphanCount: orphans.length,
      orphans: orphans.map(n => n.id),
      mostDepended: byFanIn.slice(0, 10).map(n => ({ id: n.id, label: n.label, fanIn: n.fanIn })),
      topFanOut: byFanOut.slice(0, 10).map(n => ({ id: n.id, label: n.label, fanOut: n.fanOut })),
      cycleCount: cycles.length,
      nodesInCycles: inCycle.size,
      cycles: cycles
    };
  }

  /* ---------------- 文件树 ---------------- */
  function buildFileTree(paths) {
    const rootName = (paths[0] && paths[0].path.split('/')[0]) || 'project';
    const root = { name: rootName, category: 'layout', children: [] };
    const map = { '': root };
    map[rootName] = root;
    paths.forEach(item => {
      const parts = item.path.split('/');
      let cur = '';
      for (let i = 0; i < parts.length; i++) {
        const parent = cur;
        cur = cur ? cur + '/' + parts[i] : parts[i];
        if (i === 0 && parts[i] === rootName) continue; // 根已存在
        if (!map[cur]) {
          const isFile = i === parts.length - 1;
          const node = { name: parts[i], category: guessCategory(parts[i], parts) };
          if (isFile) node.size = item.size || 0; else node.children = [];
          map[cur] = node;
          const par = map[parent] || root;
          if (par.children) par.children.push(node);
        }
      }
    });
    return root;
  }

  /* ---------------- 组件层次树 ---------------- */
  function buildComponentTree(files, opts) {
    opts = opts || {};
    const aliases = opts.aliases || detectAliases(files);
    const fileSet = new Set(files.map(f => f.path));
    const isComp = f => /\.(jsx|tsx|vue)$/i.test(f.path) ||
      (/\.(js|ts|mjs)$/i.test(f.path) && /<[A-Z][\w]*[\s/>]/.test(f.content || ''));
    const compFiles = files.filter(isComp);
    if (compFiles.length < 2) return null;
    const byPath = new Map(compFiles.map(f => [f.path, f]));

    const uses = new Map();
    const inDeg = new Map(compFiles.map(f => [f.path, 0]));
    compFiles.forEach(f => {
      const content = f.content || '';
      const set = new Set();
      extractImportBindings(content).forEach(b => {
        const res = resolveImport(b.spec, f.path, fileSet, aliases);
        if (!res || !res.internal || !byPath.has(res.internal) || res.internal === f.path) return;
        const used = b.names.some(n => new RegExp('<' + escapeRe(n) + '[\\s/>]').test(content));
        if (used || b.hasDefault) set.add(res.internal);
      });
      uses.set(f.path, set);
      set.forEach(t => inDeg.set(t, (inDeg.get(t) || 0) + 1));
    });

    const findByName = re => compFiles.find(f => re.test(f.path));
    const rootFile =
      findByName(/(^|\/)App\.(jsx|tsx|vue|js|ts)$/i) ||
      findByName(/(^|\/)(main|index|root)\.(jsx|tsx|vue|js|ts)$/i) ||
      compFiles.slice().sort((a, b) =>
        (inDeg.get(a.path) - inDeg.get(b.path)) ||
        (a.path.split('/').length - b.path.split('/').length))[0];

    const expanded = new Set();
    function toNode(path, ancestors) {
      const name = baseName(path);
      const node = { name: name, category: guessCategory(name, path.split('/')), path: path };
      if (expanded.has(path)) { node.ref = true; return node; }
      const kids = [...(uses.get(path) || [])].filter(c => !ancestors.has(c));
      if (kids.length) {
        expanded.add(path);
        const na = new Set(ancestors); na.add(path);
        node.children = kids.map(c => toNode(c, na));
      }
      return node;
    }
    return toNode(rootFile.path, new Set());
  }

  /* ---------------- 路由层级 ---------------- */
  function buildRouteTree(fileTree, files) {
    files = files || [];
    // 1) 显式路由配置：收集 <Route path=... />
    const explicit = [];
    files.forEach(f => {
      const re = /<Route\b[^>]*\bpath\s*=\s*['"{]([^'"}]+)['"}][^>]*?(?:\bcomponent|element)\s*=\s*[{<]?\s*([A-Za-z_$][\w$]*)/g;
      let m; while ((m = re.exec(f.content || ''))) explicit.push({ path: m[1], component: m[2] });
    });
    if (explicit.length >= 2) {
      const root = { name: '/', path: '/', component: 'App', category: 'layout', children: [] };
      explicit.forEach(r => root.children.push({
        name: r.path, path: r.path, component: r.component, category: 'page', size: 1
      }));
      return root;
    }

    // 2) 文件路由约定（pages/ views/ app/ routes/ screens/）
    function findRouteRoot(node) {
      if (!node.children) return null;
      const hit = node.children.find(c => /^(pages|views|routes|screens|app)$/i.test(c.name) && c.children);
      if (hit) return hit;
      for (const c of node.children) { const f = findRouteRoot(c); if (f) return f; }
      return null;
    }
    const rr = findRouteRoot(fileTree) || fileTree;
    function seg(name) {
      const s = name.replace(/\.\w+$/, '');
      if (/^index$/i.test(s)) return '';
      return s.replace(/^\[\.\.\.(.+)\]$/, '*').replace(/^\[(.+)\]$/, ':$1').toLowerCase();
    }
    function toRoute(node, parentPath) {
      const s = seg(node.name);
      const path = (parentPath === '/' ? '' : parentPath) + '/' + s;
      const r = {
        name: node.name.replace(/\.\w+$/, ''), path: path.replace(/\/+/g, '/') || '/',
        component: node.name, category: node.category || 'page', size: 1
      };
      if (node.children && node.children.length) r.children = node.children.map(c => toRoute(c, r.path));
      return r;
    }
    return {
      name: '/', path: '/', component: 'App', category: 'layout',
      children: (rr.children || []).map(c => toRoute(c, '/'))
    };
  }

  /* ---------------- 数据流向（按架构角色分层） ---------------- */
  const FLOW_LAYERS = [
    { cats: ['service', 'action'], label: '服务/数据源' },
    { cats: ['store'], label: '状态管理' },
    { cats: ['hook'], label: 'Hooks/Selectors' },
    { cats: ['page', 'route'], label: '页面' },
    { cats: ['component', 'common', 'layout'], label: '组件' }
  ];
  function layerOf(cat) {
    for (let i = 0; i < FLOW_LAYERS.length; i++) if (FLOW_LAYERS[i].cats.indexOf(cat) >= 0) return i;
    return -1;
  }
  function buildDataFlow(graph, opts) {
    opts = opts || {};
    const perLayer = opts.perLayer || 12;
    const internal = graph.nodes.filter(n => n.internal !== false && layerOf(n.category) >= 0);
    if (internal.length < 3) return null;
    // 每层按度数取前 N，避免大型项目过载
    const buckets = FLOW_LAYERS.map(() => []);
    internal.forEach(n => buckets[layerOf(n.category)].push(n));
    const kept = new Set();
    buckets.forEach(b => b.sort((a, c) => (c.fanIn + c.fanOut) - (a.fanIn + a.fanOut)).slice(0, perLayer).forEach(n => kept.add(n.id)));

    const nodes = internal.filter(n => kept.has(n.id)).map(n => ({
      id: n.id, label: n.label, category: n.category, layer: layerOf(n.category)
    }));
    const layerById = new Map(nodes.map(n => [n.id, n.layer]));
    // import a→b 表示数据从 b 流向 a；仅保留低层→高层，形成左→右流向
    const linkKeys = new Set();
    const links = [];
    graph.links.forEach(l => {
      if (!layerById.has(l.source) || !layerById.has(l.target)) return;
      const la = layerById.get(l.source), lb = layerById.get(l.target);
      let s, t;
      if (lb < la) { s = l.target; t = l.source; }       // 正常：被依赖(低层) → 依赖方(高层)
      else if (lb > la) { s = l.source; t = l.target; }  // 反向依赖
      else return;                                       // 同层不画
      const key = s + ' ' + t;
      if (linkKeys.has(key)) return; linkKeys.add(key);
      links.push({ source: s, target: t, value: 2 });
    });
    return { nodes: nodes, links: links, truncated: internal.length > kept.size, layerLabels: FLOW_LAYERS.map(l => l.label) };
  }

  /* ---------------- 顶层：一次性分析整个项目 ---------------- */
  function analyzeProject(files, paths) {
    paths = paths || files.map(f => ({ path: f.path, size: f.size || 0 }));
    const aliases = detectAliases(files);
    const fileTree = buildFileTree(paths);
    const graph = buildDependencyGraph(files, { aliases: aliases });
    const cycles = detectCycles(graph);
    const metrics = computeMetrics(graph, cycles);
    const componentTree = buildComponentTree(files, { aliases: aliases }) || fileTree;
    const routes = buildRouteTree(fileTree, files);
    const dataflow = buildDataFlow(graph, {});
    return { fileTree, graph, cycles, metrics, componentTree, routes, dataflow, treemap: fileTree, aliases };
  }

  const Analyzer = {
    normalizePath, joinPath, baseName, dirOf, guessCategory,
    extractImports, extractImportBindings, detectAliases, resolveImport,
    buildFileTree, buildDependencyGraph, detectCycles, ensureDegrees, computeMetrics,
    buildComponentTree, buildRouteTree, buildDataFlow, analyzeProject,
    FLOW_LAYERS, layerOf
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Analyzer;
  if (root) root.Analyzer = Analyzer;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
