/* ================================================================
   app.js — 主控逻辑、视图切换、文件上传解析（接入 analyzer 引擎）
   ================================================================ */
(function () {
  'use strict';

  let currentView = null;
  let currentViz = null;
  let showExternal = true;
  let activeData = freshDemoData();

  function freshDemoData() {
    return {
      componentTree: DEMO_COMPONENT_TREE,
      dependency: DEMO_DEPENDENCY,
      routes: DEMO_ROUTES,
      treemap: DEMO_TREEMAP,
      dataflow: DEMO_DATAFLOW,
      cycles: null,
      metrics: null
    };
  }

  /* 按需从 activeData.dependency 推导循环依赖与指标（示例数据/JSON 也适用） */
  function ensureGraphDerived() {
    if (!activeData.dependency) return;
    if (!activeData.cycles) activeData.cycles = Analyzer.detectCycles(activeData.dependency);
    if (!activeData.metrics) activeData.metrics = Analyzer.computeMetrics(activeData.dependency, activeData.cycles);
  }

  /* 依赖图视图数据：可选过滤外部 npm 依赖（大图降噪） */
  function dependencyViewData() {
    const g = activeData.dependency;
    if (!g) return { nodes: [], links: [] };
    if (showExternal) return g;
    const keep = new Set(g.nodes.filter(n => n.internal !== false).map(n => n.id));
    return {
      nodes: g.nodes.filter(n => keep.has(n.id)),
      links: g.links.filter(l => keep.has(l.source.id || l.source) && keep.has(l.target.id || l.target))
    };
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    Tooltip.init();
    bindNav();
    bindSearch();
    bindDepthSlider();
    bindExternalToggle();
    bindExport();
    bindUpload();
    bindDetailClose();
    bindFullscreen();
    switchView('component-tree');
  });

  /* ---------- External-deps toggle (dependency graph) ---------- */
  function bindExternalToggle() {
    const cb = document.getElementById('toggle-external');
    if (!cb) return;
    cb.addEventListener('change', () => {
      showExternal = cb.checked;
      if (currentView === 'dependency-graph') switchView('dependency-graph');
    });
  }

  /* ---------- Export current view as SVG ---------- */
  const VIZ_EXPORT_CSS =
    '.link{fill:none;stroke:rgba(99,102,241,.45);stroke-width:1.5px}' +
    '.force-link{stroke:rgba(99,102,241,.5);stroke-width:1.2px;fill:none}' +
    '.force-link.cycle-link{stroke:#ef4444;stroke-width:2.5px}' +
    '.force-label{font-family:sans-serif;fill:#94a3b8;font-size:11px}' +
    '.node text{font-family:sans-serif;fill:#e2e8f0;font-size:12px}' +
    '.arc-label{font-family:sans-serif;fill:#e2e8f0;font-size:11px}' +
    '.treemap-label{font-family:sans-serif;fill:#fff;font-weight:500}' +
    '.treemap-value{font-family:sans-serif;fill:rgba(255,255,255,.6);font-size:10px}' +
    '.flow-link{fill:none}text{font-family:sans-serif}';

  function bindExport() {
    const btn = document.getElementById('btn-export');
    if (!btn) return;
    btn.addEventListener('click', exportCurrentView);
  }

  function exportCurrentView() {
    const svgEl = document.querySelector('#viz-canvas svg');
    if (!svgEl) { alert('当前视图不支持导出（请切换到图形类视图）'); return; }
    const rect = svgEl.getBoundingClientRect();
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', Math.round(rect.width));
    clone.setAttribute('height', Math.round(rect.height));

    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = VIZ_EXPORT_CSS;
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#070a14');
    clone.insertBefore(bg, clone.firstChild);
    clone.insertBefore(style, clone.firstChild);

    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (currentView || 'view') + '-' + (document.getElementById('data-source')?.textContent || '').replace(/[^\w一-龥-]/g, '_').slice(0, 24) + '.svg';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ---------- Fullscreen ---------- */
  function bindFullscreen() {
    const btn = document.getElementById('btn-fullscreen');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      const isFs = document.fullscreenElement || document.webkitFullscreenElement;
      if (!isFs) {
        sidebar.style.display = 'none';
        const el = document.documentElement;
        const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (rfs) rfs.call(el);
        btn.title = '退出全屏';
        btn.classList.add('active');
        setTimeout(() => switchView(currentView), 100);
      } else {
        exitFs();
      }
    });

    function exitFs() {
      const sidebar = document.querySelector('.sidebar');
      sidebar.style.display = '';
      const efs = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      if (efs && (document.fullscreenElement || document.webkitFullscreenElement)) efs.call(document);
      btn.title = '全屏';
      btn.classList.remove('active');
      setTimeout(() => switchView(currentView), 100);
    }

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        document.querySelector('.sidebar').style.display = '';
        btn.classList.remove('active');
        btn.title = '全屏';
        setTimeout(() => switchView(currentView), 100);
      }
    });
  }

  /* ---------- Navigation ---------- */
  function bindNav() {
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
  }

  const VIEW_TITLES = {
    'component-tree': '组件层次树',
    'dependency-graph': '依赖关系图',
    'route-sunburst': '路由层级图',
    'module-treemap': '模块矩形树图',
    'data-flow': '数据流向图',
    'overview': '项目架构诊断'
  };

  function switchView(viewId) {
    if (currentViz) { currentViz.destroy && currentViz.destroy(); currentViz = null; }
    currentView = viewId;

    document.querySelectorAll('.nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
    document.getElementById('detail-panel').classList.remove('open');
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    const canvas = document.getElementById('viz-canvas');
    canvas.innerHTML = '';

    const viewTitle = document.getElementById('view-title');
    if (viewTitle) viewTitle.textContent = VIEW_TITLES[viewId] || '';

    const depthGroup = document.getElementById('depth-group');
    if (depthGroup) depthGroup.style.display = viewId === 'component-tree' ? 'flex' : 'none';
    const externalGroup = document.getElementById('external-group');
    if (externalGroup) externalGroup.style.display = viewId === 'dependency-graph' ? 'flex' : 'none';
    // 概览视图禁用搜索框
    const searchBox = document.querySelector('.search-box');
    if (searchBox) searchBox.style.display = viewId === 'overview' ? 'none' : '';

    requestAnimationFrame(() => {
      switch (viewId) {
        case 'component-tree': {
          const slider = document.getElementById('depth-slider');
          const visibleLevels = slider ? +slider.value : 4;
          currentViz = new ComponentTree(canvas, activeData.componentTree, visibleLevels);
          break;
        }
        case 'dependency-graph':
          ensureGraphDerived();
          currentViz = new DependencyGraph(canvas, dependencyViewData(), { cycles: activeData.cycles });
          break;
        case 'route-sunburst':
          currentViz = new RouteSunburst(canvas, activeData.routes);
          break;
        case 'module-treemap':
          currentViz = new ModuleTreemap(canvas, activeData.treemap);
          break;
        case 'data-flow':
          if (!activeData.dataflow || !activeData.dataflow.nodes || !activeData.dataflow.nodes.length) {
            renderEmptyState(canvas, '⚡', '无法从当前项目推导出数据流向', '未识别到 store / hooks / service 等典型分层模块。可尝试上传含状态管理的项目，或上传自定义 JSON 的 dataflow 字段。');
          } else {
            currentViz = new DataFlow(canvas, activeData.dataflow);
          }
          break;
        case 'overview':
          ensureGraphDerived();
          currentViz = new Overview(canvas, { metrics: activeData.metrics, cycles: activeData.cycles, graph: activeData.dependency });
          break;
      }
      renderLegend(viewId);
    });
  }

  /* ---------- Empty state ---------- */
  function renderEmptyState(canvas, icon, title, desc) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = '';
    const i = document.createElement('div'); i.className = 'es-icon'; i.textContent = icon;
    const h = document.createElement('h3'); h.textContent = title;
    const p = document.createElement('p'); p.textContent = desc;
    div.appendChild(i); div.appendChild(h); div.appendChild(p);
    canvas.appendChild(div);
  }

  /* ---------- Legend ---------- */
  function collectCategories(viewId) {
    const set = new Set();
    const walkTree = n => { if (!n) return; if (n.category) set.add(n.category); (n.children || []).forEach(walkTree); };
    if (viewId === 'component-tree') walkTree(activeData.componentTree);
    else if (viewId === 'module-treemap') walkTree(activeData.treemap);
    else if (viewId === 'route-sunburst') walkTree(activeData.routes);
    else if (viewId === 'dependency-graph' && activeData.dependency) activeData.dependency.nodes.forEach(n => n.category && set.add(n.category));
    else if (viewId === 'data-flow' && activeData.dataflow) (activeData.dataflow.nodes || []).forEach(n => n.category && set.add(n.category));
    return Array.from(set);
  }

  function renderLegend(viewId) {
    const canvas = document.getElementById('viz-canvas');
    const old = canvas.querySelector('.viz-legend');
    if (old) old.remove();
    if (viewId === 'overview') return;
    const cats = collectCategories(viewId);
    if (!cats.length) return;
    const legend = document.createElement('div');
    legend.className = 'viz-legend';
    cats.forEach(cat => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      const sw = document.createElement('span');
      sw.className = 'legend-swatch';
      sw.style.background = getCategoryColor(cat);
      const label = document.createElement('span');
      label.textContent = cat;
      item.appendChild(sw); item.appendChild(label);
      legend.appendChild(item);
    });
    canvas.appendChild(legend);
  }

  /* ---------- Search ---------- */
  function bindSearch() {
    const input = document.getElementById('search-input');
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (currentViz && currentViz.search) currentViz.search(input.value.trim()); }, 200);
    });
  }

  /* ---------- Depth Slider ---------- */
  function bindDepthSlider() {
    const slider = document.getElementById('depth-slider');
    const val = document.getElementById('depth-val');
    if (!slider) return;
    slider.addEventListener('input', () => {
      val.textContent = slider.value;
      if (currentViz && currentViz.filterDepth) currentViz.filterDepth(+slider.value);
    });
  }

  /* ---------- Detail Panel Close ---------- */
  function bindDetailClose() {
    const btn = document.getElementById('detail-close');
    if (btn) btn.addEventListener('click', () => document.getElementById('detail-panel').classList.remove('open'));
  }

  /* ================================================================
     文件上传与解析
     ================================================================ */
  function bindUpload() {
    const uploadBtn = document.getElementById('btn-upload');
    const modal = document.getElementById('upload-modal');
    const closeBtn = document.getElementById('modal-close');

    if (uploadBtn) uploadBtn.addEventListener('click', () => modal.classList.add('open'));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

    document.querySelectorAll('.upload-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.upload-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.upload-pane').forEach(p => p.style.display = 'none');
        const pane = document.getElementById('pane-' + tab.dataset.tab);
        if (pane) pane.style.display = 'block';
      });
    });

    const dirInput = document.getElementById('dir-input');
    const dirZone = document.getElementById('dir-zone');
    if (dirZone) dirZone.addEventListener('click', () => dirInput && dirInput.click());
    if (dirInput) dirInput.addEventListener('change', e => handleDirectoryUpload(e.target.files));

    const jsonInput = document.getElementById('json-input');
    const jsonZone = document.getElementById('json-zone');
    if (jsonZone) jsonZone.addEventListener('click', () => jsonInput && jsonInput.click());
    if (jsonInput) jsonInput.addEventListener('change', e => handleJsonUpload(e.target.files[0]));

    [dirZone, jsonZone].forEach(zone => {
      if (!zone) return;
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('dragover');
        if (zone === jsonZone && e.dataTransfer.files.length) handleJsonUpload(e.dataTransfer.files[0]);
      });
    });

    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      activeData = freshDemoData();
      document.getElementById('data-source').textContent = '示例数据';
      switchView(currentView);
    });
  }

  /* --- 解析上传目录（无数量上限，分块异步读取） --- */
  function handleDirectoryUpload(files) {
    if (!files || !files.length) return;
    const fileList = Array.from(files);
    const paths = fileList.map(f => ({ path: f.webkitRelativePath || f.name, size: f.size }));
    showProgress('正在读取项目文件…', 6);

    const textExts = /\.(js|jsx|ts|tsx|vue|mjs|cjs|json)$/i;
    const MAX_BYTES = 1.5 * 1024 * 1024;
    const textFiles = fileList.filter(f => textExts.test(f.name) && f.size <= MAX_BYTES);
    const contents = [];
    const CHUNK = 64;

    function readChunk(start) {
      const slice = textFiles.slice(start, start + CHUNK);
      return Promise.all(slice.map(f =>
        f.text().then(content => ({ path: f.webkitRelativePath || f.name, size: f.size, content })).catch(() => null)
      )).then(rs => {
        rs.forEach(r => { if (r) contents.push(r); });
        const done = Math.min(start + CHUNK, textFiles.length);
        showProgress(`正在读取源文件… (${done}/${textFiles.length})`, 6 + Math.round(46 * done / Math.max(1, textFiles.length)));
        if (start + CHUNK < textFiles.length) return readChunk(start + CHUNK);
      });
    }

    readChunk(0).then(() => {
      showProgress('正在分析依赖、循环依赖与架构指标…', 64);
      setTimeout(() => {
        let result;
        try {
          result = Analyzer.analyzeProject(contents, paths);
        } catch (err) {
          hideProgress();
          alert('解析失败: ' + err.message);
          return;
        }
        activeData = {
          componentTree: result.componentTree,
          dependency: result.graph,
          routes: result.routes,
          treemap: result.treemap,
          dataflow: result.dataflow,
          cycles: result.cycles,
          metrics: result.metrics
        };
        const projName = (paths[0] && paths[0].path.split('/')[0]) || '项目';
        const m = result.metrics;
        document.getElementById('data-source').textContent =
          `${projName}（${m.fileCount} 文件 / ${m.cycleCount} 循环依赖）`;
        showProgress('解析完成!', 100);
        setTimeout(() => {
          document.getElementById('upload-modal').classList.remove('open');
          hideProgress();
          switchView('overview'); // 上传后默认进入诊断概览
        }, 500);
      }, 30);
    });
  }

  /* --- 解析 JSON 配置 --- */
  function handleJsonUpload(file) {
    if (!file) return;
    file.text().then(text => {
      let json;
      try { json = JSON.parse(text); }
      catch (err) { alert('JSON 解析失败: ' + err.message); return; }

      activeData = freshDemoData();
      if (json.componentTree) activeData.componentTree = json.componentTree;
      if (json.dependency) activeData.dependency = json.dependency;
      if (json.routes) activeData.routes = json.routes;
      if (json.treemap) activeData.treemap = json.treemap;
      if (json.dataflow) activeData.dataflow = json.dataflow;
      if (!json.componentTree && json.name && json.children) {
        activeData.componentTree = json;
        activeData.treemap = json;
        activeData.routes = json;
      }
      activeData.cycles = null;
      activeData.metrics = null; // 切到依赖图/概览时按需重算
      document.getElementById('data-source').textContent = file.name;
      document.getElementById('upload-modal').classList.remove('open');
      switchView(currentView);
    });
  }

  /* --- 进度条 --- */
  function showProgress(text, pct) {
    const bar = document.querySelector('.progress-fill');
    const msg = document.querySelector('.progress-text');
    const wrap = document.querySelector('.upload-progress');
    if (wrap) wrap.style.display = 'block';
    if (bar) bar.style.width = pct + '%';
    if (msg) msg.textContent = text;
  }
  function hideProgress() {
    const wrap = document.querySelector('.upload-progress');
    if (wrap) wrap.style.display = 'none';
  }
})();
