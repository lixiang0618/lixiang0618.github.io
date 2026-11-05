/* Homepage geometry, wrapping separators and the progressive scroll invitation. */
(() => {
  'use strict';
  const keywords=document.querySelector('.profile-home .chips');if(!keywords)return;
  const header=document.querySelector('.site-header');
  const items=Array.from(keywords.children);let queued=false;
  function measure(){
    queued=false;if(header)document.documentElement.style.setProperty('--profile-header-height',header.getBoundingClientRect().height+'px');
    const tops=items.map(item=>item.offsetTop);
    items.forEach((item,i)=>item.toggleAttribute('data-row-start',i===0||Math.abs(tops[i]-tops[i-1])>1));
  }
  const queue=()=>{if(!queued){queued=true;requestAnimationFrame(measure);}};
  measure();document.fonts?.ready.then(queue);
  if(window.ResizeObserver){const observer=new ResizeObserver(queue);observer.observe(keywords);if(header)observer.observe(header);}
  else window.addEventListener('resize',queue,{passive:true});
  document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('is-page-hidden',document.hidden));
  const cue=document.querySelector('.hero-scroll-cue');
  cue?.addEventListener('click',event=>{
    if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const target=document.getElementById('education');if(!target)return;
    event.preventDefault();
    if(location.hash!=='#education')history.pushState(null,'','#education');
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){
      const previous=document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior='auto';
      target.scrollIntoView({behavior:'auto'});
      document.documentElement.style.scrollBehavior=previous;
    }else target.scrollIntoView({behavior:'smooth'});
  });
})();
