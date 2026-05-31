/* ================================================================
   dependency-graph.js — 力导向依赖关系图
   ================================================================ */
class DependencyGraph {
  constructor(container, data, opts) {
    this.container = container;
    this.opts = opts || {};
    this.init(data);
  }

  init(data) {
    const rect = this.container.getBoundingClientRect();
    this.w = rect.width; this.h = rect.height;

    /* 循环依赖：构建节点→所属环索引，用于高亮 */
    const cycleIndex = new Map();
    (this.opts.cycles || []).forEach((c, i) => c.forEach(id => cycleIndex.set(id, i)));
    const nid = e => (e && e.id != null) ? e.id : e;
    const isCyclicNode = id => cycleIndex.has(id);
    const isCyclicLink = l => {
      const s = nid(l.source), t = nid(l.target);
      return cycleIndex.has(s) && cycleIndex.has(t) && cycleIndex.get(s) === cycleIndex.get(t);
    };

    this.svg = d3.select(this.container).append('svg')
      .attr('width','100%').attr('height','100%')
      .attr('viewBox', `0 0 ${this.w} ${this.h}`);
    this.g = this.svg.append('g');
    this.svg.call(d3.zoom().scaleExtent([.1,5]).on('zoom', e => this.g.attr('transform', e.transform)));

    const nodes = data.nodes.map(d => ({...d}));
    const links = data.links.map(d => ({...d}));
    const big = nodes.length > 120; // 大图：稀释标签，减轻拥挤

    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d=>d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(this.w/2, this.h/2))
      .force('collision', d3.forceCollide().radius(d => d.size + 8));

    /* links */
    this.linkEls = this.g.append('g').selectAll('line').data(links).join('line')
      .attr('class','force-link')
      .classed('cycle-link', isCyclicLink);

    /* nodes */
    const nodeG = this.g.append('g').selectAll('g').data(nodes).join('g').attr('class','force-node');

    nodeG.append('circle')
      .attr('r', d => Math.max(6, d.size * 1.1))
      .attr('fill', d => hexToRgba(getCategoryColor(d.category), .7))
      .attr('stroke', d => getCategoryColor(d.category))
      .attr('stroke-width', 2)
      .classed('cycle-node', d => isCyclicNode(d.id))
      .classed('external-node', d => d.internal === false);

    nodeG.append('text').attr('class','force-label').attr('dy','.35em')
      .attr('x', d => d.size * 1.1 + 6).text(d => (!big || d.size >= 8) ? (d.label || d.id) : '');

    nodeG.call(d3.drag()
      .on('start', (e,d) => { if(!e.active) this.simulation.alphaTarget(.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag', (e,d) => { d.fx=e.x; d.fy=e.y; })
      .on('end', (e,d) => { if(!e.active) this.simulation.alphaTarget(0); d.fx=null; d.fy=null; })
    );

    nodeG.on('mouseenter', (e,d) => {
      const inCycle = isCyclicNode(d.id);
      Tooltip.show(e, `<strong>${d.label||d.id}</strong>`
        + (d.internal===false ? `<div class="tt-row"><span class="tt-label">外部依赖</span>npm</div>` : `<div class="tt-row"><span class="tt-label">路径</span>${d.id}</div>`)
        + `<div class="tt-row"><span class="tt-label">类别</span>${d.category}</div>`
        + `<div class="tt-row"><span class="tt-label">扇入/扇出</span>${d.fanIn==null?'-':d.fanIn} / ${d.fanOut==null?'-':d.fanOut}</div>`
        + (inCycle ? `<div class="tt-row" style="color:#ef4444"><span class="tt-label">⚠</span>处于循环依赖中</div>` : ''));
      const connected = new Set(); links.forEach(l => { if(l.source.id===d.id) connected.add(l.target.id); if(l.target.id===d.id) connected.add(l.source.id); });
      connected.add(d.id);
      nodeG.select('circle').style('opacity', n => connected.has(n.id)?1:.1);
      nodeG.select('text').style('opacity', n => connected.has(n.id)?1:.1);
      this.linkEls.style('opacity', l => (l.source.id===d.id||l.target.id===d.id)?1:.05)
        .classed('highlighted', l => l.source.id===d.id||l.target.id===d.id);
      showDetail({name:d.label||d.id, category:d.category, dependencies:d.size, type: d.internal===false?'外部依赖':'内部模块',
        path: d.internal===false?undefined:d.id,
        extra:`扇入: ${d.fanIn==null?'-':d.fanIn} ｜ 扇出: ${d.fanOut==null?'-':d.fanOut}` + (inCycle?'<br><span style="color:#ef4444">⚠ 该模块处于循环依赖中</span>':'')});
    })
    .on('mousemove', e => Tooltip.move(e))
    .on('mouseleave', () => {
      Tooltip.hide();
      nodeG.select('circle').style('opacity',1);
      nodeG.select('text').style('opacity',1);
      this.linkEls.style('opacity',1).classed('highlighted',false);
    });

    this.nodeG = nodeG;
    this.simulation.on('tick', () => {
      this.linkEls.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
      nodeG.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }

  search(term) {
    if(!term){this.nodeG.select('circle').style('opacity',1);this.nodeG.select('text').style('opacity',1);return;}
    const lower=term.toLowerCase();
    this.nodeG.each(function(d){
      const m=(d.label||d.id).toLowerCase().includes(lower) || String(d.id).toLowerCase().includes(lower);
      d3.select(this).select('circle').style('opacity',m?1:.12);
      d3.select(this).select('text').style('opacity',m?1:.12);
    });
  }

  destroy() { if(this.simulation) this.simulation.stop(); d3.select(this.container).select('svg').remove(); }
}
