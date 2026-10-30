const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');const {JSDOM}=require('jsdom');const M=require('../dev/glass-model');
test('original preset records measured ff0ee16 desktop/mobile sizes and material without mutating snapshots',()=>{
 const p=M.preset('original');assert.equal(p.legacyLayout,true);assert.equal(p.desktop.feedMax,600);assert.equal(p.desktop.bodySize,16);assert.equal(p.mobile.bodySize,15);assert.equal(p.desktop.glassBlur,18);assert.equal(p.mobile.glassBlur,10);assert.equal(p.desktop.ambientBlur,64);assert.equal(p.mobile.ambientBlur,40);assert.equal(p.desktop.opacity,.68);assert.equal(p.desktop.highlightAlpha,.88);
 p.desktop.bodySize=23;assert.equal(M.preset('original').desktop.bodySize,16);
});
test('suggested sizes are preview-only improvements while glass material stays measured original',()=>{
 const p=M.preset('suggested'),o=M.preset('original');assert.equal(p.legacyLayout,false);assert(p.desktop.feedMax>o.desktop.feedMax);assert(p.desktop.bodySize>o.desktop.bodySize);assert(p.mobile.bodySize>o.mobile.bodySize);
 for(const key of ['opacity','glassBlur','glassSaturation','ambientBlur','ambientBrightness','overlay','duration'])assert.equal(p.desktop[key],o.desktop[key]);assert(p.desktop.avatarSize>o.desktop.avatarSize);assert(p.desktop.buttonSize>=44);
});
test('complete configurations round-trip through JSON and CSS with separate mobile values',()=>{
 const p=M.preset('suggested');p.desktop.opacity=.43;p.mobile.bodySize=19;const saved=M.validate(JSON.parse(JSON.stringify(p)));assert.deepEqual(saved,p);
 const css=M.css(saved);assert(css.includes('--moments-glass-opacity: 0.43;'));assert(css.includes('@media (max-width: 48rem)'));assert(css.includes('--moments-body-size: 19px;'));assert(css.includes('--moments-ambient-duration: 700ms;'));
 assert.equal(Object.keys(M.variables(saved,'desktop')).length,M.fields.length+1);assert(M.fields.every(f=>f.label&&f.css.startsWith('--moments-')));
});
test('malformed, out-of-range, partial and CSS-injection configurations are rejected',()=>{
 for(const mutate of [p=>p.version=2,p=>p.desktop.opacity=-1,p=>p.mobile.bodySize='18px; color:red',p=>delete p.desktop.avatarSize,p=>p.mobile.extra=1,p=>p.legacyLayout='true']){
  const p=M.preset('suggested');mutate(p);assert.throws(()=>M.validate(p));
 }
});
test('production and localhost-without-explicit-dev-flag cannot start Studio even with query parameters',()=>{
 for(const [url,flag]of [['https://lxiang.cc/moments.html?studio=1','local'],['https://example.vercel.app/zh/moments.html?glassStudio=1','local'],['http://127.0.0.1:8091/moments.html?studio=1','']]){
  const dom=new JSDOM('<body><header class="site-header"></header></body>',{url,runScripts:'outside-only'});const script=dom.window.document.createElement('script');script.dataset.glassStudio=flag;Object.defineProperty(dom.window.document,'currentScript',{value:script});dom.window.eval(fs.readFileSync('dev/glass-studio.js','utf8'));assert(!dom.window.document.querySelector('.glass-studio'));dom.window.close();
 }
 for(const name of ['moments.html','zh/moments.html'])assert(!fs.readFileSync(name,'utf8').includes('/dev/'));
});
test('content-first layout prioritizes full feed width and collapses sides before compressing it',()=>{
 const dom=new JSDOM('<body class="moments-glass"></body>',{runScripts:'outside-only'});dom.window.eval(fs.readFileSync('js/moments-appearance.js','utf8'));const choose=dom.window.MomentsAppearance.chooseLayout;
 assert.equal(choose(1440,760,160,192,24,24),'three');assert.equal(choose(1024,760,160,192,24,24),'two');assert.equal(choose(960,760,160,192,24,24),'single');assert.equal(choose(390,760,160,192,24,0),'single');assert.equal(choose(1440,1000,160,192,24,24),'two');assert.equal(choose(1440,600,220,240,36,24,true),'legacy-three');assert.equal(choose(1024,600,220,240,36,24,true),'legacy-two');dom.window.close();
});
