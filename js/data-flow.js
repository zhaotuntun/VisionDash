/* ================================================================
   data-flow.js — 数据流向图（带动画粒子）
   ================================================================ */
class DataFlow {
  constructor(container, data) {
    this.container = container;
    this.particles = [];
    this.init(data);
  }

  init(data) {
    const rect = this.container.getBoundingClientRect();
    this.w = rect.width; this.h = rect.height;

    this.svg = d3.select(this.container).append('svg').attr('width','100%').attr('height','100%');
    this.g = this.svg.append('g');
    this.svg.call(d3.zoom().scaleExtent([.3,3]).on('zoom', e => this.g.attr('transform', e.transform)));

    const layers = {};
    data.nodes.forEach(n => { if(!layers[n.layer]) layers[n.layer]=[]; layers[n.layer].push(n); });
    const layerKeys = Object.keys(layers).sort((a,b)=>a-b);
    const layerCount = layerKeys.length;
    const colW = this.w / (layerCount + 1);
    const nodeH = 36, nodeW = 120;

    /* position nodes */
    const nodeMap = {};
    layerKeys.forEach((key, li) => {
      const arr = layers[key];
      const totalH = arr.length * (nodeH + 16);
      const startY = (this.h - totalH) / 2;
      arr.forEach((n, ni) => {
        n.x = colW * (li + 1) - nodeW/2;
        n.y = startY + ni * (nodeH + 16);
        n.cx = n.x + nodeW/2;
        n.cy = n.y + nodeH/2;
        nodeMap[n.id] = n;
      });
    });

    /* links */
    const linkG = this.g.append('g');
    const linkPaths = linkG.selectAll('path').data(data.links).join('path')
      .attr('class','flow-link')
      .attr('d', d => {
        const s = nodeMap[d.source], t = nodeMap[d.target];
        if(!s||!t) return '';
        const mx = (s.cx+t.cx)/2;
        return `M${s.x+nodeW},${s.cy} C${mx},${s.cy} ${mx},${t.cy} ${t.x},${t.cy}`;
      })
      .attr('stroke', d => getCategoryColor(nodeMap[d.source]?.category||'default'))
      .attr('stroke-width', d => Math.max(1.5, d.value * 0.6));

    /* layer labels */
    const layerLabels = data.layerLabels || ['用户交互','分发','Actions','Reducers','Store','Selectors','Components'];
    layerKeys.forEach((key, li) => {
      this.g.append('text')
        .attr('x', colW * (li+1)).attr('y', 28)
        .attr('text-anchor','middle')
        .style('fill','#475569').style('font-size','11px').style('font-weight','600')
        .text(layerLabels[li] || `Layer ${key}`);
    });

    /* nodes */
    const nodeGs = this.g.append('g').selectAll('g').data(data.nodes).join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    nodeGs.append('rect').attr('class','flow-node-rect')
      .attr('width', nodeW).attr('height', nodeH)
      .attr('fill', d => hexToRgba(getCategoryColor(d.category), .25))
      .attr('stroke', d => getCategoryColor(d.category))
      .attr('stroke-width', 1.5);

    nodeGs.append('text')
      .attr('x', nodeW/2).attr('y', nodeH/2).attr('dy','.35em').attr('text-anchor','middle')
      .style('fill','#e2e8f0').style('font-size','11px').style('font-weight','500')
      .text(d => truncateText(d.label||d.id, 14));

    nodeGs.on('mouseenter', (e, d) => {
      Tooltip.show(e, `<strong>${d.label||d.id}</strong><div class="tt-row"><span class="tt-label">类别</span>${d.category}</div><div class="tt-row"><span class="tt-label">层级</span>${layerLabels[d.layer]||d.layer}</div>`);
      const connSources = new Set(), connTargets = new Set();
      data.links.forEach(l => { if(l.source===d.id||l.source.id===d.id) connTargets.add(typeof l.target==='string'?l.target:l.target.id); if(l.target===d.id||l.target.id===d.id) connSources.add(typeof l.source==='string'?l.source:l.source.id); });
      const all = new Set([d.id, ...connSources, ...connTargets]);
      nodeGs.select('rect').style('opacity', n => all.has(n.id)?1:.15);
      nodeGs.select('text').style('opacity', n => all.has(n.id)?1:.15);
      linkPaths.style('opacity', l => { const si=typeof l.source==='string'?l.source:l.source.id; const ti=typeof l.target==='string'?l.target:l.target.id; return (si===d.id||ti===d.id)?.8:.05; });
      showDetail({name:d.label||d.id, category:d.category, type:'DataNode', extra:`层级: ${layerLabels[d.layer]||d.layer}`});
    })
    .on('mousemove', e => Tooltip.move(e))
    .on('mouseleave', () => {
      Tooltip.hide();
      nodeGs.select('rect').style('opacity',1);
      nodeGs.select('text').style('opacity',1);
      linkPaths.style('opacity',.3);
    });

    /* animated particles */
    this._animateParticles(data.links, nodeMap, nodeW, linkG);
    this.linkPaths = linkPaths;
    this.nodeGs = nodeGs;
  }

  _animateParticles(links, nodeMap, nodeW, g) {
    const particleG = this.g.append('g');
    this._particleTimer = d3.interval(() => {
      links.forEach(l => {
        if(Math.random() > 0.3) return;
        const s = nodeMap[l.source] || nodeMap[l.source?.id];
        const t = nodeMap[l.target] || nodeMap[l.target?.id];
        if(!s||!t) return;
        const p = particleG.append('circle').attr('class','flow-particle')
          .attr('r', 3).attr('fill', getCategoryColor(s.category)).attr('opacity',.8)
          .attr('cx', s.x+nodeW).attr('cy', s.cy);
        p.transition().duration(1200 + Math.random()*600).ease(d3.easeLinear)
          .attr('cx', t.x).attr('cy', t.cy).attr('opacity',0).remove();
      });
    }, 800);
  }

  search(term) {
    if(!term){this.nodeGs.select('rect').style('opacity',1);this.nodeGs.select('text').style('opacity',1);return;}
    const lower=term.toLowerCase();
    this.nodeGs.each(function(d){
      const m=(d.label||d.id).toLowerCase().includes(lower);
      d3.select(this).select('rect').style('opacity',m?1:.15);
      d3.select(this).select('text').style('opacity',m?1:.15);
    });
  }

  destroy() {
    if(this._particleTimer) this._particleTimer.stop();
    d3.select(this.container).select('svg').remove();
  }
}
