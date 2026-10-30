const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');const {JSDOM}=require('jsdom');
const code=fs.readFileSync('js/moments-glass.js','utf8');
const tick=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setTimeout(r,0));};
function setup({motion=true,photos=true}={}){
 const dom=new JSDOM('<!doctype html><body class="moments-glass"><header class="site-header"></header><div id="moments-list"><div class="moment-card"><div class="moment-images">'+(photos?'<video src="v.mp4"></video><img src="/one.jpg">':'')+'</div></div><div class="moment-card"><div class="moment-images"><img src="/two.jpg"></div></div></div></body>',{url:'https://lxiang.cc/moments.html',runScripts:'outside-only'});
 const w=dom.window;w.requestAnimationFrame=fn=>w.setTimeout(fn,0);w.matchMedia=()=>({matches:motion,addEventListener(){}});
 Object.defineProperty(w,'innerWidth',{value:600,writable:true});Object.defineProperty(w,'innerHeight',{value:800,writable:true});
 const positions=[{left:0,right:500,top:80,bottom:700},{left:0,right:500,top:710,bottom:1100}];
 w.document.querySelector('.site-header').getBoundingClientRect=()=>({bottom:70});
 const cards=Array.from(w.document.querySelectorAll('.moment-card'));cards.forEach((n,i)=>n.getBoundingClientRect=()=>positions[i]);
 let drawn;w.HTMLCanvasElement.prototype.getContext=()=>({drawImage:img=>{drawn=img.src;}});w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/jpeg;base64,'+Buffer.from(drawn).toString('base64');
 const images=Array.from(w.document.querySelectorAll('.moment-images img'));
 images.forEach(img=>{Object.defineProperty(img,'complete',{value:true,configurable:true});Object.defineProperty(img,'naturalWidth',{value:1000,configurable:true});Object.defineProperty(img,'naturalHeight',{value:500,configurable:true});img.decode=async()=>{};});
 w.eval(code);return{dom,w,G:w.MomentsGlass,list:w.document.getElementById('moments-list'),cards,images,positions};
}
test('visible area clips navigation, vertical and horizontal bounds; ignores full-card ratios',()=>{
 const p=setup(),v={width:600,top:70,bottom:800};
 assert.equal(p.G.visibleArea({left:-20,right:200,top:20,bottom:170},v),20000);
 assert.equal(p.G.visibleArea({left:0,right:600,top:900,bottom:1000},v),0);
 const giant={},small={};assert.equal(p.G.dominant([{card:giant,area:400*500},{card:small,area:400*200}],null),giant);p.w.close();
});
test('hysteresis retains near-ties, switches above 15%, and releases an invisible current post',()=>{
 const p=setup(),a={},b={};assert.equal(p.G.dominant([{card:a,area:100},{card:b,area:114}],a),a);assert.equal(p.G.dominant([{card:a,area:100},{card:b,area:115}],a),a);assert.equal(p.G.dominant([{card:a,area:100},{card:b,area:116}],a),b);
 assert.equal(p.G.dominant([{card:a,area:0},{card:b,area:1}],a),b);assert.equal(p.G.dominant([{card:a,area:0}],a),null);p.w.close();
});
test('first actual photo is selected after videos; video-only and text-only posts use neutral',async()=>{
 const p=setup();assert.equal(p.G.firstPhoto(p.cards[0]).getAttribute('src'),'/one.jpg');p.G.mount(p.list,[{id:'one'},{id:'two'}]);await tick();assert.equal(p.G.getState().active,'one');assert(!p.G.getState().neutral);
 p.cards[0].querySelector('img').remove();await tick();assert(p.G.getState().neutral);p.cards[0].querySelector('video').remove();await tick();assert(p.G.getState().neutral);p.w.close();
});
test('loaded gallery photos are downsampled once, cached, and reuse the same two background nodes',async()=>{
 const p=setup();p.G.mount(p.list,[{id:'one'},{id:'two'}]);await tick();assert.equal(p.G.getState().processed,1);
 p.positions[0].top=-800;p.positions[0].bottom=0;p.positions[1].top=100;p.positions[1].bottom=790;p.w.dispatchEvent(new p.w.Event('resize'));await tick();assert.equal(p.G.getState().active,'two');assert.equal(p.G.getState().processed,2);
 p.positions[0].top=80;p.positions[0].bottom=700;p.positions[1].top=710;p.positions[1].bottom=1100;p.w.dispatchEvent(new p.w.Event('resize'));await tick();assert.equal(p.G.getState().processed,2);assert.equal(p.w.document.querySelectorAll('.moments-ambient-layer').length,2);assert.equal(p.w.document.querySelectorAll('.moments-ambient').length,1);p.w.close();
});
test('failed and tainted images transition to neutral instead of retaining previous colors',async()=>{
 const p=setup();p.G.mount(p.list,[{id:'one'},{id:'two'}]);await tick();assert(!p.G.getState().neutral);
 Object.defineProperty(p.images[0],'naturalWidth',{value:0,configurable:true});p.images[0].dispatchEvent(new p.w.Event('error'));await tick();assert(p.G.getState().neutral);
 p.w.HTMLCanvasElement.prototype.toDataURL=()=>{throw Error('tainted');};p.positions[0].bottom=0;p.positions[1].top=100;p.positions[1].bottom=790;p.w.dispatchEvent(new p.w.Event('resize'));await tick();assert(p.G.getState().neutral);p.w.close();
});
test('late image decoding cannot replace a newer active source',async()=>{
 const p=setup();let release;p.images[0].decode=()=>new Promise(resolve=>{release=resolve;});p.G.mount(p.list,[{id:'one'},{id:'two'}]);await tick();
 p.positions[0].bottom=0;p.positions[1].top=100;p.positions[1].bottom=790;p.w.dispatchEvent(new p.w.Event('resize'));await tick();assert.equal(p.G.getState().active,'two');release();await tick();assert.equal(p.G.getState().processed,1);assert.equal(p.G.getState().active,'two');p.w.close();
});
test('comment expansion changes the largest area without rebuilding cards or background layers',async()=>{
 const p=setup();p.positions[0]={left:0,right:500,top:-300,bottom:300};p.positions[1]={left:0,right:500,top:310,bottom:790};p.G.mount(p.list,[{id:'one'},{id:'two'}]);await tick();assert.equal(p.G.getState().active,'two');
 p.positions[0].bottom=790;p.positions[1].top=800;p.cards[0].append(p.w.document.createElement('p'));await tick();assert.equal(p.G.getState().active,'one');assert.equal(p.w.document.querySelectorAll('.moment-card').length,2);p.w.close();
});
test('dynamic card replacement retains ID mapping and photo derivatives; reduced motion switches without queues',async()=>{
 const p=setup();p.G.mount(p.list,[{id:'one'},{id:'two'}]);await tick();assert.equal(p.G.getState().fading,false);
 const copy=p.cards[0].cloneNode(true);copy.getBoundingClientRect=()=>p.positions[0];p.cards[0].replaceWith(copy);p.G.mount(p.list,[{id:'replacement'},{id:'two'}]);await tick();assert.equal(p.G.getState().active,'replacement');assert.equal(p.G.getState().processed,1);p.w.close();
});
test('IntersectionObserver supplies candidates but ratio never determines the winner; raw scroll events coalesce',async()=>{
 const p=setup();let options;
 p.w.IntersectionObserver=class{constructor(cb,o){this.cb=cb;options=o;}observe(target){this.cb([{target,isIntersecting:true,intersectionRatio:target===p.cards[0] ? 0.1 : 1}]);}unobserve(){}};
 p.G.mount(p.list,[{id:'large'},{id:'small'}]);await tick();assert.equal(options.threshold,0);assert.equal(p.G.getState().active,'large');
 let reads=0;const rect=p.cards[0].getBoundingClientRect;p.cards[0].getBoundingClientRect=()=>{reads++;return rect();};
 for(let i=0;i<100;i++)p.w.dispatchEvent(new p.w.Event('scroll'));await tick();assert.equal(reads,1);p.w.close();
});
