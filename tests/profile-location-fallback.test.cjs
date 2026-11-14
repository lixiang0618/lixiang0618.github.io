const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/profile-location.js'), 'utf8');
async function render({hostname = 'lxiang.cc', offline = false, payload, lang = 'en'} = {}) {
  const node = () => ({textContent: '', attributes: {}, setAttribute(k, v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; }});
  const label = node(), time = node(), prefix = node(), updated = node(), root = node(), flag = node();
  root.dataset = {};
  root.classList = {toggle() {}};
  updated.querySelector = selector => selector === 'time' ? time : prefix;
  root.querySelector = selector => ({'.profile-location-label': label, '.profile-location-updated': updated, '.profile-location-flag': flag, '[data-location-status]': null})[selector];
  let request;
  const context = {
    document: {documentElement: {lang}, hidden: false, querySelector: () => root, addEventListener() {}},
    window: {location: {hostname}, ProfileCountryFlags: require('../js/profile-country-flags'), addEventListener() {}},
    AbortController, Date, Intl, setTimeout, clearTimeout, setInterval: () => 1, clearInterval() {},
    fetch: async (url, options) => { request = {url, options}; if (offline) throw Error('offline'); return {ok: true, json: async () => payload}; }
  };
  vm.runInNewContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  return {root, label, updated, request, flag};
}
const fresh = () => ({success: true, status: 'active', location: {country: 'Singapore', city: 'Singapore', district: 'Jurong West', updated_at: new Date().toISOString()}});
test('production retains the original live endpoint and renders the returned place', async () => {
  const result = await render({payload: fresh()});
  assert.equal(result.request.url, 'https://api.lxiang.cc/api/location');
  assert.equal(result.label.textContent, 'Singapore · Jurong West');
  assert.equal(result.root.dataset.state, 'active');
  assert.equal(result.request.options.credentials, 'omit');
});
test('loopback previews use only the local public-location proxy', async () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    const result = await render({hostname, payload: fresh()});
    assert.equal(result.request.url, '/__profile-location');
    assert.equal(result.root.dataset.state, 'active');
  }
});
test('request failures keep a visible location area without inventing a place', async () => {
  for (const lang of ['en', 'zh-CN']) {
    const result = await render({offline: true, lang});
    assert.equal(result.root.dataset.state, 'unavailable');
    assert.equal(result.root.attributes['aria-hidden'], 'false');
    assert.equal(result.label.textContent, lang === 'en' ? 'Location temporarily unavailable' : '位置暂不可用');
    assert.equal(result.updated.hidden, true);
  }
});
test('paused sharing never exposes a supplied place', async () => {
  const result = await render({payload: {...fresh(), status: 'paused'}});
  assert.equal(result.root.dataset.state, 'paused');
  assert.equal(result.label.textContent, 'Location sharing paused');
});
test('active sharing shows the local country flag and localizes its alternative text', async () => {
  for (const lang of ['en', 'zh-CN']) {
    const result = await render({lang, payload: fresh()});
    assert.equal(result.flag.src, '/assets/flags/sg.svg');
    assert.equal(result.flag.hidden, false);
    assert.equal(result.flag.alt, lang === 'en' ? 'Flag of Singapore' : '新加坡国旗');
    result.flag.onerror();
    assert.equal(result.flag.hidden, true);
    assert.equal(result.label.textContent, 'Singapore · Jurong West');
  }
});
test('unknown countries and paused/stale sharing never show a flag', async () => {
  for (const payload of [{...fresh(), location: {...fresh().location, country: 'Unknown'}}, {...fresh(), status: 'paused'}, {...fresh(), status: 'stale'}]) {
    const result = await render({payload});
    assert.equal(result.flag.hidden, true);
    assert.equal(result.flag.alt, '');
  }
});
