// Run: NODE_PATH=<external jsdom installation>/node_modules node --test tests/moments-likes.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const { execFileSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const moments = JSON.parse(fs.readFileSync('data/moments.json'));
const source = fs.readFileSync('js/moments-likes.js', 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const uuid = '12345678-1234-4234-8234-123456789abc';
function api() {
  const rows = new Map(); const calls = [];
  return { rows, calls, fetch: async (url, options) => {
    const id = new URL(url).searchParams.get('id');
    const visitor = options.headers['X-Visitor-ID'];
    assert.equal(options.mode, 'cors'); assert.equal(options.credentials, 'omit');
    assert.equal(new URL(url).searchParams.get('type'), 'moment');
    assert(!url.includes(visitor));
    calls.push({ id, visitor, method: options.method });
    const likedBy = rows.get(id) || new Set(); rows.set(id, likedBy);
    if (options.method === 'PUT') likedBy.add(visitor);
    if (options.method === 'DELETE') likedBy.delete(visitor);
    return { ok: true, json: async () => ({ success: true, content_type: 'moment', content_id: id, likes: likedBy.size, liked: likedBy.has(visitor) }) };
  }};
}
async function page(name, backend, options = {}) {
  const html = fs.readFileSync(name, 'utf8');
  const dom = new JSDOM(html, { url: 'https://lxiang.cc/' + name, runScripts: 'outside-only' });
  const w = dom.window;
  if (options.storageBlocked) Object.defineProperty(w, 'localStorage', { get() { throw Error('blocked'); } });
  else if (!options.noVisitor) w.localStorage.setItem('lx_visitor_id', uuid);
  if (options.fallback) Object.defineProperty(w.crypto, 'randomUUID', { value: undefined });
  w.fetch = backend.fetch; w.console.log = () => {};
  w.XMLHttpRequest = class {
    open(method, url) { this.url = url; }
    send() {
      this.status = 200; this.readyState = 4;
      this.responseText = JSON.stringify(this.url.includes('moments.json') ? (options.moments || moments) : []);
      if (this.onreadystatechange) this.onreadystatechange();
      if (this.onload) this.onload();
    }
  };
  w.eval(source);
  for (const script of w.document.querySelectorAll('script:not([src])')) w.eval(script.textContent);
  await tick(); await tick();
  return dom;
}
test('stable IDs preserve every original field and graduation mapping', () => {
  const original = JSON.parse(execFileSync('git', ['show', 'HEAD:data/moments.json'], { encoding: 'utf8' }));
  assert.equal(new Set(moments.map(m => m.id)).size, moments.length);
  assert(moments.every(m => /^moment-\d+$/.test(m.id)));
  assert.deepEqual(moments.map(({ id, ...rest }) => rest), original.map(({ id, ...rest }) => rest));
  assert.equal(moments.find(m => m.date === '2026-05-08 17:27').id, 'moment-001');
});
test('both complete pages render likes, preserve media/lightbox and share API identity', async () => {
  const backend = api();
  const en = await page('moments.html', backend);
  const button = en.window.document.querySelector('.moment-like');
  const firstId = backend.calls[0].id;
  assert.equal(en.window.document.querySelectorAll('.moment-like').length, moments.length);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  button.click(); button.click(); await tick();
  assert.equal(backend.calls.filter(c => c.method === 'PUT').length, 1);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(button.textContent, '1');
  // Even duplicate PUT requests remain idempotent in the simulated backend.
  await backend.fetch('https://api.lxiang.cc/api/likes?type=moment&id='+firstId,
    { method: 'PUT', headers: { 'X-Visitor-ID': uuid }, mode: 'cors', credentials: 'omit' });
  assert.equal(backend.rows.get(firstId).size, 1);
  const zh = await page('zh/moments.html', backend);
  const chinese = zh.window.document.querySelector('.moment-like');
  assert.equal(chinese.getAttribute('aria-pressed'), 'true');
  assert(chinese.getAttribute('aria-label').includes('取消点赞'));
  assert(zh.window.document.querySelector('.moment-images img').getAttribute('src').startsWith('../Resources/'));
  chinese.click(); await tick();
  assert.equal(chinese.textContent, '0');
  en.window.document.dispatchEvent(new en.window.Event('visibilitychange')); await tick();
  const reload = await page('moments.html', backend);
  assert.equal(reload.window.document.querySelector('.moment-like').getAttribute('aria-pressed'), 'false');
  const added = await page('zh/moments.html', backend, { moments: [...moments, { id: 'moment-010', date: '2026-10-29', content: 'New', images: [] }] });
  assert.equal(added.window.document.querySelectorAll('.moment-like').length, moments.length + 1);
  added.window.close();
  const cards = reload.window.document.querySelectorAll('.moment-card');
  const sorted = [...moments].sort((a,b) => new Date(b.date)-new Date(a.date));
  reload.window.MomentsLikes.mount(reload.window.document.getElementById('moments-list'), sorted);
  assert.equal(reload.window.document.querySelectorAll('.moment-like').length, cards.length);
  const img = reload.window.document.querySelector('.moment-images img'); img.click();
  assert(reload.window.document.querySelector('.image-lightbox').classList.contains('active'));
  assert(reload.window.document.querySelector('.moment-images video'));
  [en, zh, reload].forEach(d => d.window.close());
});
test('load failure retries GET; ambiguous failed write reconciles before another mutation', async () => {
  const backend = api(); let fail = true;
  const dom = await page('moments.html', { fetch: (...args) => fail ? Promise.reject(Error('offline')) : backend.fetch(...args) });
  const b = dom.window.document.querySelector('.moment-like');
  assert.equal(b.textContent, '—'); assert(!b.disabled);
  assert.equal(dom.window.document.querySelectorAll('.moment-card').length, moments.length);
  fail = false; b.click(); await tick(); assert.equal(backend.calls.at(-1).method, 'GET');
  // Simulate server commit followed by lost response.
  dom.window.fetch = async (...args) => { await backend.fetch(...args); throw Error('lost response'); };
  b.click(); assert(b.disabled); b.click(); await tick();
  assert.equal(b.getAttribute('aria-pressed'), 'false'); assert.equal(b.textContent, '—');
  dom.window.fetch = backend.fetch; b.click(); await tick();
  assert.equal(backend.calls.at(-1).method, 'GET'); assert.equal(b.getAttribute('aria-pressed'), 'true');
  b.click(); await tick(); assert.equal(b.textContent, '0');
  dom.window.close();
});
test('unavailable storage disables likes without breaking content; UUID fallback persists', async () => {
  const backend = api(); const blocked = await page('zh/moments.html', backend, { storageBlocked: true });
  assert.equal(blocked.window.document.querySelectorAll('.moment-card').length, moments.length);
  assert(blocked.window.document.querySelector('.moment-like').disabled); assert.equal(backend.calls.length, 0);
  blocked.window.close();
  const dom = await page('moments.html', backend, { noVisitor: true, fallback: true });
  const id = dom.window.localStorage.getItem('lx_visitor_id');
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert(backend.calls.every(c => c.visitor === id)); dom.window.close();
});
test('invalid server states never display negative counts or confirmed likes', async () => {
  for (const data of [{success:true, content_type:'moment', content_id:'wrong',likes:2,liked:true},
    {success:true,content_type:'moment',content_id:'moment-009',likes:-1,liked:true}]) {
    const dom = await page('moments.html', { fetch: async () => ({ok:true,json:async()=>data}) });
    const b=dom.window.document.querySelector('.moment-like'); assert.equal(b.textContent,'—');
    assert.equal(b.getAttribute('aria-pressed'),'false'); dom.window.close();
  }
});
test('sync leaves both Moments pages and IDs untouched, including new content', () => {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'likes-sync-'));
  try {
    for(const name of ['sync.js','sync-blog.js','moments.html','blog.html']) fs.copyFileSync(name,path.join(tmp,name));
    fs.mkdirSync(path.join(tmp,'zh')); fs.copyFileSync('zh/moments.html',path.join(tmp,'zh/moments.html'));
    fs.cpSync('data',path.join(tmp,'data'),{recursive:true}); fs.cpSync('_posts',path.join(tmp,'_posts'),{recursive:true}); fs.cpSync('blogs',path.join(tmp,'blogs'),{recursive:true});
    const added=[...moments,{id:'moment-010',date:'2026-10-29',content:'New',images:[]}];
    fs.writeFileSync(path.join(tmp,'data/moments.json'),JSON.stringify(added));
    for(let i=0;i<2;i++) execFileSync(process.execPath,['sync.js'],{cwd:tmp});
    for(const name of ['moments.html','zh/moments.html']) assert.equal(fs.readFileSync(path.join(tmp,name),'utf8'),fs.readFileSync(name,'utf8'));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(tmp,'data/moments.json'))),added);
    for(const name of ['moments.html','zh/moments.html']) {
      const html=fs.readFileSync(name,'utf8'); for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
    }
  } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
});
