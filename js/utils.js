/* ========================================================
   utils.js — 工具函数（颜色、提示框、格式化等）
   ======================================================== */

const VizColors = {
  page:      '#6366f1',
  layout:    '#8b5cf6',
  component: '#06b6d4',
  common:    '#f59e0b',
  store:     '#ec4899',
  util:      '#10b981',
  hook:      '#14b8a6',
  service:   '#f97316',
  action:    '#0ea5e9',
  style:     '#a78bfa',
  asset:     '#64748b',
  config:    '#cbd5e1',
  route:     '#e879f9',
  external:  '#475569',
  default:   '#94a3b8'
};

function getCategoryColor(category) {
  return VizColors[category] || VizColors.default;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ---------- Tooltip ---------- */
const Tooltip = {
  el: null,

  init() {
    this.el = document.getElementById('tooltip');
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'tooltip';
      this.el.className = 'tooltip';
      document.body.appendChild(this.el);
    }
  },

  show(event, html) {
    if (!this.el) this.init();
    this.el.innerHTML = html;
    this.el.classList.add('visible');
    this.move(event);
  },

  move(event) {
    if (!this.el) return;
    const pad = 12;
    let x = event.pageX + pad;
    let y = event.pageY + pad;
    const rect = this.el.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = event.pageX - rect.width - pad;
    if (y + rect.height > window.innerHeight) y = event.pageY - rect.height - pad;
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  },

  hide() {
    if (this.el) this.el.classList.remove('visible');
  }
};

/* ---------- Format helpers ---------- */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function truncateText(text, maxLen) {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

/* ---------- Detail panel helper ---------- */
function showDetail(info) {
  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-content');
  if (!panel || !content) return;

  let html = `<h3>${escapeHtml(info.name || 'Unknown')}</h3>`;
  if (info.category) html += `<span class="detail-badge" style="background:${hexToRgba(getCategoryColor(info.category), 0.25)};color:${getCategoryColor(info.category)}">${escapeHtml(info.category)}</span>`;
  if (info.type) html += `<div class="detail-row"><span class="detail-label">类型</span><span class="detail-value">${escapeHtml(info.type)}</span></div>`;
  if (info.path) html += `<div class="detail-row"><span class="detail-label">路径</span><span class="detail-value">${escapeHtml(info.path)}</span></div>`;
  if (info.size) html += `<div class="detail-row"><span class="detail-label">大小</span><span class="detail-value">${formatBytes(info.size)}</span></div>`;
  if (info.children != null) html += `<div class="detail-row"><span class="detail-label">子节点</span><span class="detail-value">${escapeHtml(info.children)}</span></div>`;
  if (info.dependencies) html += `<div class="detail-row"><span class="detail-label">依赖</span><span class="detail-value">${escapeHtml(info.dependencies)}</span></div>`;
  if (info.extra) html += `<div class="detail-extra">${info.extra}</div>`;

  content.innerHTML = html;
  panel.classList.add('open');
}

/* ---------- Resize observer helper ---------- */
function onContainerResize(container, callback) {
  const ro = new ResizeObserver(entries => {
    for (const entry of entries) callback(entry.contentRect);
  });
  ro.observe(container);
  return ro;
}
