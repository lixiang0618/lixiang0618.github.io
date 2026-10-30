const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');const {extractExcerpt}=require('../sync-blog');
function page(lang='en',stored={}) {
 const dom=new JSDOM('<!doctype html><html lang="'+lang+'"><body><div id="content"></div></body></html>',{url:'https://preview.example/blog-post.html?p=Python',runScripts:'outside-only'});
 for(const [k,v]of Object.entries(stored))dom.window.localStorage.setItem(k,v);
 dom.window.eval(fs.readFileSync('js/blog-theme.js','utf8'));dom.window.eval(fs.readFileSync('js/blog-reading.js','utf8'));
 return {dom,w:dom.window,R:dom.window.BlogReading,content:dom.window.document.getElementById('content')};
}
test('TOC uses rendered headings, skips duplicate article title, and assigns stable collision-free anchors',()=>{
 const p=page();p.content.innerHTML='<h1>Article</h1><h2>Topic</h2><h3>Topic</h3><h2>Topic-2</h2><pre>## not a heading</pre><h2>中文标题</h2>';
 const h=p.R.headings(p.content,'Article');assert.equal(h.length,4);assert.equal(new Set(h.map(n=>n.id)).size,4);const first=h.map(n=>n.id);assert.deepEqual(Array.from(p.R.headings(p.content,'Article'),n=>n.id),Array.from(first));assert(!h.some(n=>n.textContent==='not a heading'));p.w.close();
});
test('reading progress clamps article bounds, handles short articles, and active heading follows offsets',()=>{
 const p=page(),R=p.R;assert.equal(R.progress(0,200,2000,800,80),0);assert.equal(R.progress(120,200,2000,800,80),0);assert.equal(R.progress(760,200,2000,800,80),50);assert.equal(R.progress(10000,200,2000,800,80),100);
 assert.equal(R.progress(0,200,100,800,80),0);assert.equal(R.progress(120,200,100,800,80),100);
 assert.equal(R.activeIndex([200,600,1000],520,80),1);assert.equal(R.activeIndex([200,600,1000],920,80),2);p.w.close();
});
test('theme and bounded size/spacing settings persist without affecting visitor or token keys',()=>{
 const p=page('en',{'lx_blog_theme':'dark','lx_blog_reading':JSON.stringify({scale:20,spacing:'relaxed'}),'lx_visitor_id':'old'});
 assert.equal(p.w.document.documentElement.dataset.blogTheme,'dark');assert.equal(p.R.getSettings().scale,1.375);assert.equal(p.R.getSettings().spacing,'relaxed');assert.equal(p.w.localStorage.getItem('lx_visitor_id'),'old');
 p.w.localStorage.setItem('lx_blog_reading',JSON.stringify({scale:-2,spacing:'unknown'}));assert.equal(p.R.getSettings().scale,.875);assert.equal(p.R.getSettings().spacing,'standard');p.w.close();
});
test('canonical and encoded share links always use the current production article identity',()=>{
 for(const lang of ['en','zh']){const p=page(lang),post={file:'C语言习题集 & test',title:'Title & 中文 ?'};const links=p.R.shareURLs(post),u=new URL(links.url),x=new URL(links.x);
 assert.equal(u.origin,'https://lxiang.cc');assert.equal(u.pathname,lang==='zh'?'/zh/blog-post.html':'/blog-post.html');assert.equal(u.searchParams.get('p'),post.file);assert.equal(x.searchParams.get('text'),post.title);assert.equal(x.searchParams.get('url'),links.url);assert(links.message.includes(post.title));assert(!links.url.includes('preview.example'));p.w.close();}
});
test('excerpts retain bilingual prose but omit fenced/inline code, images, HTML, imports and footer dates',()=>{
 const input='# Heading\n![screen](x.png)\n中文 **说明** and [English](https://example.com).\n```python\nfrom typing import List\nprint("secret")\n```\n<pre>raw code</pre>\n<p>More prose.</p>\n2026-05-02';
 const text=extractExcerpt(input);assert.equal(text,'中文 说明 and English. More prose.');assert.equal(extractExcerpt('```js\nconst x=1;\n```\nfrom x import y\nx=2'),'');
 assert.equal(extractExcerpt('~~~js\nconst x=1;\n~~~\nReadable prose.'),'Readable prose.');assert.equal(extractExcerpt('Start.\n```python\nprint(1)'),'Start.');
 const posts=JSON.parse(fs.readFileSync('data/blog.json'));const hot=posts.find(p=>p.file==='Hot100');assert(hot.excerpt.includes('LeetCode'));assert(!hot.excerpt.includes('import'));assert(!hot.excerpt.includes('!['));
});
test('no Blog tag markup/rendering remains, while legacy metadata and categories are retained',()=>{
 for(const file of ['blog-post.html','zh/blog-post.html'])assert(!fs.readFileSync(file,'utf8').includes('post-tags'));
 assert(!fs.readFileSync('js/blog.js','utf8').includes('renderTags'));assert(JSON.parse(fs.readFileSync('data/blog.json')).every(p=>Array.isArray(p.tags)&&Array.isArray(p.categories)));
});
