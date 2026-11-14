const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/profile-entry.js'), 'utf8');
function visit(url, language = 'en-US', mobile = false) {
  const calls = [];
  const context = {
    URL, navigator: {language, languages: [language], userAgent: mobile ? 'iPhone' : 'Desktop'},
    location: {href: url, replace: target => calls.push(target), assign: target => calls.push(target)},
    document: {documentElement: {lang: url.includes('/zh/') ? 'zh-CN' : 'en'}}, window: {}
  };
  vm.runInNewContext(source, context);
  return {calls, desktop: context.window.switchToDesktop, intro: context.window.shouldPlayProfileIntro};
}
test('Chinese browsers reach Chinese desktop and mobile entrypoints without a redirect chain', () => {
  assert.deepEqual(visit('https://example.test/', 'zh-CN').calls, ['https://example.test/zh/index.html']);
  assert.deepEqual(visit('https://example.test/index.html?x=1#research', 'zh-TW', true).calls, ['https://example.test/zh/index-mobile.html?x=1#research']);
  assert.deepEqual(visit('https://example.test/zh/index.html', 'zh-CN').calls, []);
  assert.deepEqual(visit('https://example.test/zh/index-mobile.html', 'zh-CN', true).calls, []);
});
test('English browsers retain English, and explicit Chinese URLs remain Chinese', () => {
  assert.deepEqual(visit('https://example.test/', 'en-US').calls, []);
  assert.deepEqual(visit('https://example.test/index.html', 'en-US', true).calls, ['https://example.test/index-mobile.html']);
  assert.deepEqual(visit('https://example.test/zh/index.html', 'en-US').calls, []);
  assert.deepEqual(visit('https://example.test/zh/index-mobile.html', 'en-US').calls, ['https://example.test/zh/index.html']);
  assert.deepEqual(visit('https://example.test/index-mobile.html?view=mobile', 'en-US').calls, []);
});
test('explicit language overrides browser language and preserves URL state', () => {
  assert.deepEqual(visit('https://example.test/index.html?lang=en#projects', 'zh-CN').calls, []);
  assert.deepEqual(visit('https://example.test/zh/index.html?lang=en#projects', 'zh-CN').calls, ['https://example.test/index.html?lang=en#projects']);
  assert.deepEqual(visit('https://example.test/index.html?lang=zh', 'en-US').calls, ['https://example.test/zh/index.html?lang=zh']);
});
test('the existing desktop switch cannot loop back to the mobile page', () => {
  const page = visit('https://example.test/index-mobile.html', 'en-US', true);
  page.desktop();
  assert.equal(page.calls.at(-1), 'https://example.test/index.html?view=desktop&lang=en');
  assert.deepEqual(visit(page.calls.at(-1), 'zh-CN', true).calls, []);
  const chinese = visit('https://example.test/zh/index-mobile.html', 'zh-CN', true);
  chinese.desktop();
  assert.equal(chinese.calls.at(-1), 'https://example.test/zh/index.html?view=desktop');
  assert.deepEqual(visit(chinese.calls.at(-1), 'zh-CN', true).calls, []);
});
test('intro plays only on a fresh direct entry, never on an internal return', () => {
  const decide = visit('https://example.test/').intro;
  const initial = {origin: 'https://example.test'};
  assert.equal(decide(initial), true);
  assert.equal(decide({...initial, referrer: 'https://search.test/'}), true);
  assert.equal(decide({...initial, referrer: 'https://example.test/blog.html'}), false);
  assert.equal(decide({...initial, referrer: 'https://example.test/zh/moments.html'}), false);
  assert.equal(decide({...initial, seen: true}), false);
  assert.equal(decide({...initial, history: true}), false);
  assert.equal(decide({...initial, hash: '#research'}), false);
  assert.equal(decide({...initial, referrer: 'https://example.test/index.html'}), true);
});
