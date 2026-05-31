/* ================================================================
   component-tree.js — 可折叠组件层次树（D3 Tidy Tree）
   ================================================================ */
class ComponentTree {
  constructor(container, data, visibleLevels = 4) {
    this.container = container;
    this.duration = 600;
    this.i = 0;
    this.visibleLevels = visibleLevels;
    this.init(data);
  }

  static sliderDepthToMaxDepth(sliderDepth) {
    return Math.max(1, Number(sliderDepth));
  }

  init(data) {
    const rect = this.container.getBoundingClientRect();
    this.w = rect.width; this.h = rect.height;

    this.svg = d3.select(this.container).append('svg')
      .attr('width','100%').attr('height','100%');

    this.g = this.svg.append('g').attr('transform',`translate(180,${this.h/2})`);

    this.svg.call(d3.zoom().scaleExtent([.1,4]).on('zoom', e => this.g.attr('transform', e.transform)))
      .on('dblclick.zoom', null);

    this.treemap = d3.tree().nodeSize([28, 220]);
    this.root = d3.hierarchy(data);
    this.root.x0 = 0; this.root.y0 = 0;

    this._applyDepthLimit(this.visibleLevels);
    this.update(this.root);
  }

  _collapse(d) { if(d.children){d._children=d.children;d._children.forEach(c=>this._collapse(c));d.children=null;} }

  _applyDepthLimit(sliderDepth) {
    const maxDepth = ComponentTree.sliderDepthToMaxDepth(sliderDepth);
    const resetAndCollapse = (d, depth) => {
      if(d._children){d.children=d._children;d._children=null;}
      if(depth >= maxDepth && d.children){d._children=d.children;d.children=null;}
      else if(d.children) d.children.forEach(c => resetAndCollapse(c, depth+1));
    };
    resetAndCollapse(this.root, 0);
  }

  update(source) {
    const tree = this.treemap(this.root);
    const nodes = tree.descendants(), links = tree.links();
    nodes.forEach(d => { d.y = d.depth * 200; });

    /* --- nodes --- */
    const node = this.g.selectAll('g.node').data(nodes, d => d.id||(d.id=++this.i));
    const enter = node.enter().append('g').attr('class','node')
      .attr('transform', `translate(${source.y0},${source.x0})`)
      .on('click', (e,d) => { d.children ? (d._children=d.children, d.children=null) : (d.children=d._children, d._children=null); this.update(d); })
      .on('mouseenter', (e,d) => {
        Tooltip.show(e, `<strong>${d.data.name}</strong><div class="tt-row"><span class="tt-label">类型</span>${d.data.category||'-'}</div><div class="tt-row"><span class="tt-label">子节点</span>${(d.children||d._children||[]).length}</div>`);
        showDetail({name:d.data.name, category:d.data.category, children:(d.children||d._children||[]).length, type:'Component'});
      })
      .on('mousemove', e => Tooltip.move(e))
      .on('mouseleave', () => Tooltip.hide());

    enter.append('circle').attr('r',0).style('stroke-width',2.5);
    enter.append('text').attr('dy','.35em').style('font-size','12px').style('fill','#e2e8f0');

    const merged = enter.merge(node);
    merged.transition().duration(this.duration).attr('transform', d => `translate(${d.y},${d.x})`);
    merged.select('circle').transition().duration(this.duration).attr('r',7)
      .style('fill', d => d._children ? getCategoryColor(d.data.category) : '#0d1225')
      .style('stroke', d => getCategoryColor(d.data.category));
    merged.select('text')
      .attr('x', d => d.children||d._children ? -14 : 14)
      .attr('text-anchor', d => d.children||d._children ? 'end' : 'start')
      .text(d => d.data.name);

    const exit = node.exit().transition().duration(this.duration)
      .attr('transform', `translate(${source.y},${source.x})`).remove();
    exit.select('circle').attr('r',0);
    exit.select('text').style('opacity',0);

    /* --- links --- */
    const diag = d => `M${d.source.y},${d.source.x}C${(d.source.y+d.target.y)/2},${d.source.x} ${(d.source.y+d.target.y)/2},${d.target.x} ${d.target.y},${d.target.x}`;
    const link = this.g.selectAll('path.link').data(links, d => d.target.id);
    const linkEnter = link.enter().insert('path','g').attr('class','link')
      .attr('d', () => { const o={x:source.x0,y:source.y0}; return diag({source:o,target:o}); });
    linkEnter.merge(link).transition().duration(this.duration).attr('d', diag);
    link.exit().transition().duration(this.duration)
      .attr('d', () => { const o={x:source.x,y:source.y}; return diag({source:o,target:o}); }).remove();

    nodes.forEach(d => { d.x0=d.x; d.y0=d.y; });
  }

  search(term) {
    if(!term) { this.g.selectAll('.node').select('circle').style('opacity',1); this.g.selectAll('.node').select('text').style('opacity',1); return; }
    const lower = term.toLowerCase();
    this.g.selectAll('.node').each(function(d) {
      const match = d.data.name.toLowerCase().includes(lower);
      d3.select(this).select('circle').style('opacity', match?1:.15);
      d3.select(this).select('text').style('opacity', match?1:.15);
    });
  }

  filterDepth(maxDepth) {
    this.visibleLevels = maxDepth;
    this._applyDepthLimit(maxDepth);
    this.update(this.root);
  }

  destroy() { d3.select(this.container).select('svg').remove(); }
}
