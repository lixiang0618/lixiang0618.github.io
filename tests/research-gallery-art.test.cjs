const test = require('node:test');
const assert = require('node:assert/strict');
const {parseDocument} = require('htmlparser2');
const D = require('domutils');
const {cchan, sna} = require('../lab/shared/research-gallery-art');
const source = require('../lab/sna/data.json');
const find = (doc, predicate) => D.findAll(predicate, doc.children);
test('CCHAN distinguishes the rejected D-prime path from the coupled correct path', () => {
  const doc = parseDocument(cchan('en'), {xmlMode: true});
  const routes = find(doc, n => !!n.attribs?.['data-route']);
  assert.deepEqual(routes.map(n => n.attribs['data-route']), ['P1-H-Dprime-P3', 'P1-HD-P2']);
  assert.notEqual(routes[0].attribs.d, routes[1].attribs.d);
  assert.equal(find(doc, n => n.attribs?.['data-members'] === 'H D').length, 1);
  for (const label of ['P₁', 'P₂', 'P₃', 'H', 'D', 'D′', 'HD']) assert(find(doc, n => n.name === 'text').some(n => D.textContent(n) === label));
  assert.equal(find(doc, n => n.attribs?.class?.includes('coupling-cross')).length, 1);
  assert.equal(find(doc, n => n.attribs?.class?.includes('coupling-check')).length, 1);
});
test('SNA retains every source university and its actual core membership', () => {
  const doc = parseDocument(sna('en', source), {xmlMode: true});
  const nodes = find(doc, n => n.attribs?.['data-school'] !== undefined);
  assert.equal(nodes.length, source.nodes.length);
  const coreIds = nodes.filter(n => n.attribs['data-core'] === 'true').map(n => Number(n.attribs['data-school']));
  assert.deepEqual(coreIds, source.nodes.filter(n => n.core).map(n => n.id));
  for (const n of source.nodes) assert.equal(nodes.filter(node => Number(node.attribs['data-school']) === n.id).length, 1);
});
test('SNA gallery edges represent exactly the source connectivity, without invented links', () => {
  const doc = parseDocument(sna('zh', source), {xmlMode: true});
  const drawn = find(doc, n => n.attribs?.['data-source'] !== undefined).map(n => n.attribs['data-source'] + '-' + n.attribs['data-target']);
  const expected = [];
  for (let a = 0; a < source.nodes.length; a++) for (let b = a + 1; b < source.nodes.length; b++) if (source.binary[a][b] || source.binary[b][a]) expected.push(source.nodes[a].id + '-' + source.nodes[b].id);
  assert.deepEqual(drawn, expected);
});
test('both language versions expose the same diagrams and valid local SVG references', () => {
  for (const lang of ['en', 'zh']) for (const svg of [cchan(lang), sna(lang, source)]) {
    const doc = parseDocument(svg, {xmlMode: true});
    const ids = new Set(find(doc, n => !!n.attribs?.id).map(n => n.attribs.id));
    for (const node of find(doc, n => !!n.attribs)) for (const value of Object.values(node.attribs)) for (const match of value.matchAll(/url\(#([^)]+)\)/g)) assert(ids.has(match[1]), match[1]);
  }
});
