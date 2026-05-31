/* ================================================================
   route-sunburst.js — 路由层级旭日图（D3 Partition）
   ================================================================ */
class RouteSunburst {
  constructor(container, data) {
    this.container = container;
    this.init(data);
  }

  init(data) {
    const rect = this.container.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.radius = size / 2 - 20;

    this.svg = d3.select(this.container).append('svg')
      .attr('width','100%').attr('height','100%')
      .append('g').attr('transform',`translate(${rect.width/2},${rect.height/2})`);

    const root = d3.hierarchy(data).sum(d => d.size || 1).sort((a,b) => b.value - a.value);
    this.root = root;

    d3.partition().size([2 * Math.PI, this.radius])(root);

    const arc = d3.arc()
      .startAngle(d => d.x0).endAngle(d => d.x1)
      .innerRadius(d => d.y0).outerRadius(d => d.y1 - 1);

    this.arc = arc;

    const paths = this.svg.selectAll('path').data(root.descendants().filter(d => d.depth))
      .join('path')
      .attr('class','arc-path')
      .attr('d', arc)
      .attr('fill', d => getCategoryColor(d.data.category))
      .attr('fill-opacity', d => 1 - d.depth * 0.12)
      .attr('stroke', '#070a14')
      .attr('stroke-width', 1);

    paths.on('mouseenter', (e, d) => {
      const ancestors = d.ancestors().reverse().map(a => a.data.name).join(' / ');
      Tooltip.show(e, `<strong>${d.data.name}</strong><div class="tt-row"><span class="tt-label">路径</span>${d.data.path||'-'}</div><div class="tt-row"><span class="tt-label">组件</span>${d.data.component||'-'}</div><div class="tt-row"><span class="tt-label">层级</span>${ancestors}</div>`);
      paths.attr('fill-opacity', n => d.ancestors().includes(n) ? 1 : .2);
      showDetail({name:d.data.name, path:d.data.path, type:'Route', category:d.data.category, extra:`组件: ${d.data.component||'-'}<br>子路由数: ${(d.children||[]).length}`});
    })
    .on('mousemove', e => Tooltip.move(e))
    .on('mouseleave', () => { Tooltip.hide(); paths.attr('fill-opacity', d => 1 - d.depth * 0.12); });

    /* center label */
    this.svg.append('text').attr('text-anchor','middle').attr('dy','-.2em')
      .style('fill','#818cf8').style('font-size','14px').style('font-weight','600').text(data.name);
    this.svg.append('text').attr('text-anchor','middle').attr('dy','1.2em')
      .style('fill','#64748b').style('font-size','11px').text(`${root.descendants().length} 路由`);

    this.paths = paths;
  }

  search(term) {
    if(!term){this.paths.attr('fill-opacity', d => 1-d.depth*.12);return;}
    const lower=term.toLowerCase();
    this.paths.attr('fill-opacity', d => (d.data.name.toLowerCase().includes(lower)||d.data.path?.toLowerCase().includes(lower))?1:.1);
  }

  destroy() { d3.select(this.container).select('svg').remove(); }
}
