/* Hide only a wrapped row's leading separator; keyword content/order never changes. */
(() => {
  'use strict';
  const keywords=document.querySelector('.profile-home .chips');if(!keywords)return;
  const items=Array.from(keywords.children);let queued=false;
  function measure(){
    queued=false;const tops=items.map(item=>item.offsetTop);
    items.forEach((item,i)=>item.toggleAttribute('data-row-start',i===0||Math.abs(tops[i]-tops[i-1])>1));
  }
  const queue=()=>{if(!queued){queued=true;requestAnimationFrame(measure);}};
  measure();document.fonts?.ready.then(queue);
  if(window.ResizeObserver)new ResizeObserver(queue).observe(keywords);
  else window.addEventListener('resize',queue,{passive:true});
})();
