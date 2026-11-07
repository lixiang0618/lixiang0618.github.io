/* Homepage enhancement only: fixed choreography, no requests or model inference. */
(()=>{'use strict';
 if(!document.body.classList.contains('lab-gallery'))return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),hero=document.querySelector('.gallery-hero'),arts=[...document.querySelectorAll('[data-gallery-art]')],visible=new Set();let timer=0,lens=0,heroTimer=0;
 const sna=arts.find(el=>el.dataset.galleryArt==='sna'),lenses=['all','1','2','3','4','core','bridge','all'];
 function paintLens(){const value=lenses[lens],nodes=[...sna.querySelectorAll('.sna-gallery-node')],matches=n=>value==='core'?n.dataset.core==='true':value==='bridge'?n.dataset.bridge==='true':n.dataset.community===value;sna.dataset.lens=value;sna.querySelector('.sna-lens').textContent=descriptions[lens];for(const edge of sna.querySelectorAll('[data-gallery-edge]')){const [a,b]=edge.dataset.galleryEdge.split('-').map(Number);edge.classList.toggle('is-lens-edge',value!=='all'&&(value==='bridge'?(matches(nodes[a])||matches(nodes[b])):(matches(nodes[a])&&matches(nodes[b]))));}}
 const descriptions=document.documentElement.lang.startsWith('zh')?['完整网络','板块 1','板块 2','板块 3','板块 4','核心—边缘','桥接节点','完整网络']:['Full network','Block 1','Block 2','Block 3','Block 4','Core–periphery','Brokerage','Full network'];
 function update(){const run=!document.hidden&&!motion.matches;for(const art of arts){art.classList.add('is-enhanced');art.classList.toggle('is-running',run&&visible.has(art));}clearInterval(timer);timer=0;if(run&&sna&&visible.has(sna))timer=setInterval(()=>{lens=(lens+1)%lenses.length;paintLens();},1800);if(!run){hero?.classList.remove('weave-enter');if(motion.matches&&sna){lens=0;paintLens();}}}
 const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>{for(const entry of entries)entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target);update();},{threshold:.1}):null;
 for(const art of arts)observer?observer.observe(art):visible.add(art);
 // The base HTML is visible without this class; even interrupted animation cannot trap content.
 function enter(){if(hero&&!motion.matches&&!document.hidden){hero.classList.add('weave-enter');heroTimer=setTimeout(()=>hero.classList.remove('weave-enter'),2200);}}
 if(window.labEntryReady)window.labEntryReady.then(enter);else enter();
 document.addEventListener('visibilitychange',update);motion.addEventListener('change',update);
 window.addEventListener('pagehide',e=>{clearInterval(timer);clearTimeout(heroTimer);arts.forEach(a=>a.classList.remove('is-running'));hero?.classList.remove('weave-enter');if(!e.persisted)observer?.disconnect();});window.addEventListener('pageshow',update);
 // Match editorial navigation's mobile home entrypoint, retaining native links/history.
 if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))document.querySelectorAll('.site-nav a,a.brand').forEach(a=>{const url=new URL(a.href);if(url.origin===location.origin&&/\/index\.html$/.test(url.pathname)){url.pathname=url.pathname.replace(/index\.html$/,'index-mobile.html');a.href=url.href;}});
 update();
})();
