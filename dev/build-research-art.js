/* Patch just the two shared gallery illustrations; preserve the Lab page copy. */
const fs = require('node:fs');
const path = require('node:path');
const {parseDocument} = require('htmlparser2');
const {findAll} = require('domutils');
const artwork = require('../lab/shared/research-gallery-art');
const data = require('../lab/sna/data.json');
const root = path.resolve(__dirname, '..');
for (const [lang, file] of [['en', 'lab.html'], ['zh', 'zh/lab.html']]) {
  const target = path.join(root, file);
  let html = fs.readFileSync(target, 'utf8');
  const doc = parseDocument(html, {withStartIndices: true, withEndIndices: true});
  const replacements = findAll(n => ['cchan', 'sna'].includes(n.attribs?.['data-gallery-art']), doc.children).map(node => {
    const key = node.attribs['data-gallery-art'];
    const svg = key === 'cchan' ? artwork.cchan(lang) : artwork.sna(lang, data);
    return {start: node.startIndex, end: node.endIndex + 1, html: `<div class="gallery-art" data-gallery-art="${key}">${svg}</div>`};
  });
  if (replacements.length !== 2) throw Error('Expected CCHAN and SNA gallery art in ' + file);
  for (const item of replacements.sort((a, b) => b.start - a.start)) html = html.slice(0, item.start) + item.html + html.slice(item.end);
  fs.writeFileSync(target, html);
}
require('./build-homepage-art');
