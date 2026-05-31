const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/component-tree.js', 'utf8');
const ComponentTree = vm.runInNewContext(`${source}\nComponentTree;`, {});

function makeNode(name, children = []) {
  return {
    data: { name },
    children: children.length ? children : null,
    _children: null
  };
}

function visibleNames(node, names = []) {
  names.push(node.data.name);
  (node.children || []).forEach(child => visibleNames(child, names));
  return names;
}

function hiddenNames(node, names = []) {
  (node._children || []).forEach(child => {
    names.push(child.data.name);
    subtreeNames(child, names);
  });
  (node.children || []).forEach(child => hiddenNames(child, names));
  return names;
}

function subtreeNames(node, names) {
  (node.children || []).forEach(child => {
    names.push(child.data.name);
    subtreeNames(child, names);
  });
  (node._children || []).forEach(child => {
    names.push(child.data.name);
    subtreeNames(child, names);
  });
}

function createTreeHarness() {
  const root = makeNode('App', [
    makeNode('Layout', [
      makeNode('Header', [
        makeNode('Navigation', [
          makeNode('NavItem')
        ])
      ])
    ]),
    makeNode('Common', [
      makeNode('Button')
    ])
  ]);

  return {
    root,
    updateCalls: 0,
    _applyDepthLimit: ComponentTree.prototype._applyDepthLimit,
    update() {
      this.updateCalls += 1;
    }
  };
}

assert.equal(ComponentTree.sliderDepthToMaxDepth(1), 1);
assert.equal(ComponentTree.sliderDepthToMaxDepth(4), 4);

{
  const tree = createTreeHarness();
  ComponentTree.prototype.filterDepth.call(tree, 1);
  assert.deepEqual(visibleNames(tree.root), ['App', 'Layout', 'Common']);
  assert.deepEqual(hiddenNames(tree.root), ['Header', 'Navigation', 'NavItem', 'Button']);
  assert.equal(tree.updateCalls, 1);
}

{
  const tree = createTreeHarness();
  ComponentTree.prototype.filterDepth.call(tree, 2);
  assert.deepEqual(visibleNames(tree.root), ['App', 'Layout', 'Header', 'Common', 'Button']);
  assert.deepEqual(hiddenNames(tree.root), ['Navigation', 'NavItem']);
}

{
  const tree = createTreeHarness();
  ComponentTree.prototype.filterDepth.call(tree, 4);
  assert.deepEqual(visibleNames(tree.root), ['App', 'Layout', 'Header', 'Navigation', 'NavItem', 'Common', 'Button']);
  assert.deepEqual(hiddenNames(tree.root), []);
}

console.log('component tree depth tests passed');
