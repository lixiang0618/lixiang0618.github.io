const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const flags = require('../js/profile-country-flags');
test('matches English, simplified/traditional Chinese, and ISO country codes', () => {
  for (const [name, code] of [['Singapore','SG'],['新加坡','SG'],['SGP','SG'],[' sg ','SG'],['China','CN'],['中国','CN'],['中國','CN'],['USA','US'],['U.S.A.','US'],['美国','US'],['美國','US'],['United States of America','US'],['UK','GB'],['GBR','GB'],['英国','GB'],['South Korea','KR'],['Republic of Korea','KR'],['韓國','KR'],['Türkiye','TR'],['Turkey','TR'],['日本','JP'],['馬來西亞','MY']]) assert.equal(flags.resolve(name), code, name);
});
test('unrecognized values and city names do not produce guessed flags', () => {
  for (const name of [undefined, null, {}, '', 'Jurong West', 'Wuhan', 'Atlantis', '../cn.svg', 'X'.repeat(101)]) assert.equal(flags.resolve(name), '');
});
test('all supported countries have local SVGs and no external image references', () => {
  for (const code of flags.codes) {
    const file = path.join(__dirname, '../assets/flags', code.toLowerCase() + '.svg');
    const svg = fs.readFileSync(file, 'utf8');
    assert.match(svg, /<svg/);
    assert.doesNotMatch(svg, /(?:href|src)=["']https?:/);
  }
});
