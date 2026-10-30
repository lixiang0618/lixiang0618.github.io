/* Moments-only ambience. The visible-area rule never uses intersection ratios. */
(function () {
  'use strict';
  function visibleArea(rect, viewport) {
    const width=Math.max(0,Math.min(rect.right,viewport.width)-Math.max(rect.left,0));
    const height=Math.max(0,Math.min(rect.bottom,viewport.bottom)-Math.max(rect.top,viewport.top));
    return width*height;
  }
  function dominant(entries,current,threshold=.15) {
    const best=entries.reduce((winner,item)=>item.area>(winner?.area||0)?item:winner,null);
    if(!best)return null;
    const previous=entries.find(item=>item.card===current);
    return previous?.area>0 && best.card!==current && best.area<=previous.area*(1+threshold)+1e-6?current:best.card;
  }
  function firstPhoto(card) { return card?.querySelector('.moment-images img') || null; }
  const raf=window.requestAnimationFrame?.bind(window) || (fn=>setTimeout(fn,16));
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)') || {matches:false};
  let container,ambient,layers,io,ro,mutation,cards=[],active=null,signature='',scheduled=false;
  let front=0,shown=null,desired=null,fading=false,timer,epoch=0,abort,processed=0;
  const possible=new Set(),cache=new Map();
  const canvas=document.createElement('canvas');
  function finish() {
    clearTimeout(timer);fading=false;
    layers[1-front].style.backgroundImage='none';
    if(desired!==shown)crossfade(desired);
  }
  function fadeDuration(){const n=parseFloat(getComputedStyle(document.body).getPropertyValue('--moments-ambient-duration'));return Number.isFinite(n)?Math.max(0,n):700;}
  function crossfade(source) {
    desired=source;
    // While fading keep only the latest desired source, never a transition queue.
    if(fading || shown===source)return;
    const back=1-front;
    layers[back].style.backgroundImage=source?'url("'+source+'")':'none';
    layers[back].style.opacity='1';layers[front].style.opacity='0';
    front=back;shown=source;ambient.dataset.neutral=String(source===null);
    const duration=fadeDuration();
    if(reduced.matches || duration===0){finish();return;}
    fading=true;timer=setTimeout(finish,duration+40);
  }
  function waitForPhoto(image,signal) {
    if(signal.aborted)return Promise.resolve(false);
    if(image.complete)return Promise.resolve(image.naturalWidth>0);
    return new Promise(resolve=>{
      const done=()=>{cleanup();resolve(!signal.aborted && image.naturalWidth>0);};
      const cleanup=()=>{image.removeEventListener('load',done);image.removeEventListener('error',done);signal.removeEventListener('abort',done);};
      image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});signal.addEventListener('abort',done,{once:true});
    });
  }
  async function prepare(card) {
    const current=++epoch;abort?.abort();abort=new AbortController();const signal=abort.signal;
    const image=firstPhoto(card);
    ambient.dataset.activeMoment=card?.dataset.ambientMoment || '';
    if(!image){crossfade(null);return;}
    const source=image.currentSrc || image.src;
    if(image.complete && !image.naturalWidth){crossfade(null);return;}
    if(cache.has(source)){crossfade(cache.get(source));return;}
    // Do not download a full original for ambience: wait for the gallery's own load.
    if(!image.complete)crossfade(null);
    try {
      if(!await waitForPhoto(image,signal)){if(current===epoch)crossfade(null);return;}
      if(typeof image.decode==='function')await image.decode();
      if(signal.aborted || current!==epoch)return;
      const key=image.currentSrc || image.src;
      if(cache.has(key)){crossfade(cache.get(key));return;}
      // Only a 96px derivative reaches the two full-viewport background layers.
      canvas.width=96;canvas.height=96;const context=canvas.getContext('2d');
      if(!context)throw Error('Canvas unavailable');
      const scale=Math.max(96/image.naturalWidth,96/image.naturalHeight);
      context.drawImage(image,(96-image.naturalWidth*scale)/2,(96-image.naturalHeight*scale)/2,image.naturalWidth*scale,image.naturalHeight*scale);
      const data=canvas.toDataURL('image/jpeg',.65);processed++;
      cache.set(key,data);if(cache.size>16)cache.delete(cache.keys().next().value);
      crossfade(data);
    } catch (_) {if(current===epoch)crossfade(null);}
  }
  function update() {
    scheduled=false;if(!ambient)return;
    const nav=document.querySelector('.site-header');const top=nav?Math.max(0,Math.min(innerHeight,nav.getBoundingClientRect().bottom)):0;
    const viewport={width:document.documentElement.clientWidth || innerWidth,top,bottom:innerHeight};
    let entries=Array.from(possible).filter(card=>card.isConnected).map(card=>({card,area:visibleArea(card.getBoundingClientRect(),viewport)}));
    // A fast scroll jump can outrun an IO notification. Resolve that rare gap once.
    if(io && !entries.some(item=>item.area>0))entries=cards.map(card=>({card,area:visibleArea(card.getBoundingClientRect(),viewport)}));
    const next=dominant(entries,active),image=firstPhoto(next);
    const nextSignature=image?[image.src,image.currentSrc,image.complete,image.naturalWidth].join('|'):'';
    if(next!==active || nextSignature!==signature){active=next;signature=nextSignature;prepare(next);}
  }
  function queue(){if(!scheduled){scheduled=true;raf(update);}}
  function discover() {
    const next=Array.from(container.querySelectorAll('.moment-card'));
    cards.filter(card=>!next.includes(card)).forEach(card=>{io?.unobserve(card);ro?.unobserve(card);possible.delete(card);});
    next.filter(card=>!cards.includes(card)).forEach(card=>{if(io)io.observe(card);else possible.add(card);ro?.observe(card);});
    cards=next;queue();
  }
  function init(list) {
    if(container)return;container=list;
    ambient=document.createElement('div');ambient.className='moments-ambient';ambient.setAttribute('aria-hidden','true');ambient.dataset.neutral='true';
    layers=[0,1].map(i=>{const layer=document.createElement('div');layer.className='moments-ambient-layer';layer.style.opacity=i===0?'1':'0';ambient.append(layer);return layer;});
    const veil=document.createElement('div');veil.className='moments-ambient-veil';ambient.append(veil);document.body.prepend(ambient);
    if(window.IntersectionObserver)io=new IntersectionObserver(entries=>{entries.forEach(e=>e.isIntersecting?possible.add(e.target):possible.delete(e.target));queue();},{threshold:0,rootMargin:'200px 0px'});
    if(window.ResizeObserver){ro=new ResizeObserver(queue);const nav=document.querySelector('.site-header');if(nav)ro.observe(nav);}
    mutation=new MutationObserver(records=>{
      const changed=records.some(r=>Array.from(r.addedNodes).concat(Array.from(r.removedNodes)).some(n=>n.nodeType===1&&(n.matches?.('.moment-card')||n.querySelector?.('.moment-card'))));
      if(changed)discover();else queue();
    });
    mutation.observe(container,{childList:true,subtree:true,attributes:true,attributeFilter:['src','srcset']});
    container.addEventListener('load',queue,true);container.addEventListener('error',queue,true);
    window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue,{passive:true});window.addEventListener('pageshow',queue);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')queue();});
    document.addEventListener('moments:appearance-change',event=>{
      if(fading && event.detail?.keys?.includes('--moments-ambient-duration')){layers.forEach(layer=>layer.getAnimations?.().forEach(animation=>animation.finish()));finish();}
      queue();
    });
    reduced.addEventListener?.('change',()=>{if(reduced.matches && fading)finish();queue();});discover();
  }
  function mount(list,moments=[]) {
    init(list);list.querySelectorAll('.moment-card').forEach((card,i)=>{card.dataset.ambientMoment=moments[i]?.id || '';});discover();
  }
  window.MomentsGlass={visibleArea,dominant,firstPhoto,mount,getState:()=>({active:active?.dataset.ambientMoment || null,photo:firstPhoto(active)?.src || null,neutral:shown===null,fading,processed,cached:cache.size})};
})();
