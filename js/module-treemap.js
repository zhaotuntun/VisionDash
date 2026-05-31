/* ================================================================
   module-treemap.js — 模块矩形树图
   ================================================================ */
class ModuleTreemap {
  constructor(container, data) {
    this.container = container;
    this.history = [];
    this.init(data);
  }

  init(data) {
    this.data = data;
    this.render(data);
  }

  render(data) {
    d3.select(this.container).select('svg').remove();
    d3.select(this.container).select('.breadcrumb').remove();

    const rect = this.container.getBoundingClientRect();
    this.w = rect.width; this.h = rect.height;

    const svg = d3.select(this.container).append('svg').attr('width','100%').attr('height','100%');

    const root = d3.hierarchy(data).sum(d => d.size || 0).sort((a,b) => b.value - a.value);
    d3.treemap().size([this.w, this.h]).padding(2).round(true)(root);

    const leaves = root.leaves();

    const cell = svg.selectAll('g').data(leaves).join('g')
      .attr('class','treemap-cell')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    cell.append('rect')
      .attr('width', d => Math.max(0,d.x1-d.x0))
      .attr('height', d => Math.max(0,d.y1-d.y0))
      .attr('fill', d => hexToRgba(getCategoryColor(d.data.category), .65))
      .attr('stroke', '#070a14').attr('stroke-width',1)
      .attr('rx',3);

    cell.filter(d => (d.x1-d.x0)>50 && (d.y1-d.y0)>28)
      .append('text').attr('class','treemap-label')
      .attr('x',6).attr('y',18)
      .text(d => truncateText(d.data.name, Math.floor((d.x1-d.x0)/7)));

    cell.filter(d => (d.x1-d.x0)>50 && (d.y1-d.y0)>42)
      .append('text').attr('class','treemap-value')
      .attr('x',6).attr('y',32)
      .text(d => formatBytes(d.data.size||0));

    cell.on('mouseenter', (e,d) => {
      Tooltip.show(e, `<strong>${d.data.name}</strong><div class="tt-row"><span class="tt-label">大小</span>${formatBytes(d.value)}</div><div class="tt-row"><span class="tt-label">类别</span>${d.data.category||'-'}</div><div class="tt-row"><span class="tt-label">路径</span>${d.ancestors().reverse().map(a=>a.data.name).join('/')}</div>`);
      showDetail({name:d.data.name, category:d.data.category, size:d.value, type:'File', path:d.ancestors().reverse().map(a=>a.data.name).join('/')});
    })
    .on('mousemove', e => Tooltip.move(e))
    .on('mouseleave', () => Tooltip.hide());

    /* click to drill into parent group */
    cell.on('click', (e, d) => {
      const parent = d.parent;
      if(parent && parent.data.children && parent.depth > 0) {
        this.history.push(this.currentData || this.data);
        this.currentData = parent.data;
        this.render(parent.data);
      }
    });

    /* breadcrumb */
    if(this.history.length > 0) {
      const bc = document.createElement('div');
      bc.className = 'breadcrumb';
      const backLink = document.createElement('a');
      backLink.textContent = '← 返回上级';
      backLink.onclick = () => { this.currentData = this.history.pop(); this.render(this.currentData || this.data); };
      bc.appendChild(backLink);
      const sep = document.createElement('span');
      sep.textContent = ' / ';
      bc.appendChild(sep);
      const cur = document.createElement('span');
      cur.textContent = data.name;
      cur.style.color = '#e2e8f0';
      bc.appendChild(cur);
      this.container.appendChild(bc);
    }
  }

  search(term) {
    if(!term){d3.select(this.container).selectAll('.treemap-cell rect').style('opacity',1);return;}
    const lower=term.toLowerCase();
    d3.select(this.container).selectAll('.treemap-cell').each(function(d){
      d3.select(this).select('rect').style('opacity', d.data.name.toLowerCase().includes(lower)?1:.15);
    });
  }

  destroy() {
    d3.select(this.container).select('svg').remove();
    d3.select(this.container).select('.breadcrumb').remove();
  }
}
