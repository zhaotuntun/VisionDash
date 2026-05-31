/* ================================================================
   overview.js — 项目架构诊断概览（指标卡片 + 循环依赖/孤儿模块清单）
   ================================================================ */
class Overview {
  constructor(container, data) {
    this.container = container;
    this.render(data || {});
  }

  render({ metrics, cycles, graph }) {
    const m = metrics || {};
    const base = id => (window.Analyzer ? Analyzer.baseName(id) : String(id).split('/').pop());

    const wrap = el('div', 'overview');

    /* 指标卡片 */
    const cards = el('div', 'ov-cards');
    [
      { label: '内部模块', value: m.fileCount || 0, cat: 'component' },
      { label: '依赖连线', value: m.linkCount || 0, cat: 'service' },
      { label: '外部依赖', value: m.externalCount || 0, cat: 'external' },
      { label: '循环依赖', value: m.cycleCount || 0, cat: 'store', warn: (m.cycleCount || 0) > 0 },
      { label: '孤儿模块', value: m.orphanCount || 0, cat: 'util', warn: (m.orphanCount || 0) > 0 }
    ].forEach(c => {
      const card = el('div', 'ov-card' + (c.warn ? ' warn' : ''));
      const v = el('div', 'ov-card-value', String(c.value));
      v.style.color = getCategoryColor(c.cat);
      card.appendChild(v);
      card.appendChild(el('div', 'ov-card-label', c.label));
      cards.appendChild(card);
    });
    wrap.appendChild(cards);

    const grid = el('div', 'ov-grid');

    /* 循环依赖 */
    const cyc = (m.cycles || cycles || []);
    const cycSec = section('🔴 循环依赖', cyc.length ? `${cyc.length} 处` : '0');
    if (!cyc.length) {
      cycSec.appendChild(el('div', 'ov-empty', '✅ 未检测到循环依赖'));
    } else {
      cyc.slice(0, 30).forEach(cycle => {
        const chain = cycle.map(base);
        if (cycle.length > 1) chain.push(base(cycle[0]));
        const row = el('div', 'ov-cycle');
        row.textContent = chain.join('  →  ');
        row.title = cycle.join(' → ');
        cycSec.appendChild(row);
      });
      if (cyc.length > 30) cycSec.appendChild(el('div', 'ov-more', `… 另有 ${cyc.length - 30} 处`));
    }
    grid.appendChild(cycSec);

    /* 孤儿模块 */
    const orphSec = section('🗑 孤儿 / 未被引用模块', String((m.orphans || []).length));
    if (!(m.orphans || []).length) orphSec.appendChild(el('div', 'ov-empty', '✅ 无孤立模块'));
    else {
      m.orphans.slice(0, 40).forEach(id => {
        const row = el('div', 'ov-list-row');
        row.appendChild(el('span', 'ov-name', base(id)));
        row.title = id;
        orphSec.appendChild(row);
      });
      if (m.orphans.length > 40) orphSec.appendChild(el('div', 'ov-more', `… 另有 ${m.orphans.length - 40} 个`));
    }
    grid.appendChild(orphSec);

    /* 最被依赖（扇入） */
    grid.appendChild(rankSection('🏆 最被依赖模块 (fan-in)', m.mostDepended || [], 'fanIn', base));
    /* 最高输出耦合（扇出） */
    grid.appendChild(rankSection('📤 高耦合模块 (fan-out)', m.topFanOut || [], 'fanOut', base));

    wrap.appendChild(grid);
    this.container.appendChild(wrap);

    /* ---- helpers ---- */
    function section(title, badge) {
      const s = el('div', 'ov-section');
      const h = el('div', 'ov-section-head');
      h.appendChild(el('span', 'ov-section-title', title));
      if (badge != null) h.appendChild(el('span', 'ov-badge', badge));
      s.appendChild(h);
      return s;
    }
    function rankSection(title, list, key, baseFn) {
      const s = section(title, String(list.length));
      if (!list.length) { s.appendChild(el('div', 'ov-empty', '—')); return s; }
      const max = Math.max.apply(null, list.map(d => d[key] || 0)) || 1;
      list.forEach(d => {
        const row = el('div', 'ov-bar-row');
        row.appendChild(el('span', 'ov-name', baseFn(d.id)));
        row.title = d.id;
        const barWrap = el('span', 'ov-bar-wrap');
        const bar = el('span', 'ov-bar');
        bar.style.width = Math.round(((d[key] || 0) / max) * 100) + '%';
        barWrap.appendChild(bar);
        row.appendChild(barWrap);
        row.appendChild(el('span', 'ov-num', String(d[key] || 0)));
        s.appendChild(row);
      });
      return s;
    }
  }

  search() { /* 概览视图不参与搜索 */ }
  destroy() { const o = this.container.querySelector('.overview'); if (o) o.remove(); }
}

/* 轻量 DOM 构造器（避免 innerHTML 注入） */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
