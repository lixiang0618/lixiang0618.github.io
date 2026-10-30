/* Layout and CSS-variable adapter only. No Studio UI or stored overrides in production. */
(function(){
  'use strict';
  const body=document.body;
  if(!body.classList.contains('moments-glass'))return;
  function read(name){
    const value=getComputedStyle(body).getPropertyValue(name).trim(),n=parseFloat(value);
    if(value.endsWith('rem'))return n*parseFloat(getComputedStyle(document.documentElement).fontSize);
    if(value.endsWith('s')&&!value.endsWith('ms'))return n*1000;
    return Number.isFinite(n)?n:0;
  }
  function chooseLayout(available,feed,left,right,gap,padding,legacy=false){
    if(legacy)return available>1199?'legacy-three':available>768?'legacy-two':'legacy-single';
    if(available>=feed+left+right+2*gap+2*padding)return 'three';
    if(available>=feed+left+gap+2*padding)return 'two';
    return 'single';
  }
  function refresh(){
    const style=getComputedStyle(body),available=body.clientWidth-parseFloat(style.paddingLeft||0)-parseFloat(style.paddingRight||0);
    body.dataset.momentsLayout=chooseLayout(available,read('--moments-feed-max'),read('--moments-side-left'),read('--moments-side-right'),read('--moments-column-gap'),read('--moments-layout-padding'),read('--moments-legacy-layout')===1);
    const header=document.querySelector('.site-header');if(header){const h=header.getBoundingClientRect().height;body.style.setProperty('--moments-nav-height',h+'px');body.style.setProperty('--moments-sidebar-top',(read('--moments-legacy-layout')===1?Math.max(100,h+8):h+16)+'px');}
  }
  function apply(values){
    const keys=[];
    Object.keys(values).forEach(key=>{if(/^--moments-[a-z-]+$/.test(key) && body.style.getPropertyValue(key)!==values[key]){body.style.setProperty(key,values[key]);keys.push(key);}});
    refresh();document.dispatchEvent(new CustomEvent('moments:appearance-change',{detail:{keys}}));
  }
  window.addEventListener('resize',refresh,{passive:true});
  if(window.ResizeObserver){const r=new ResizeObserver(refresh);const header=document.querySelector('.site-header');if(header)r.observe(header);}
  refresh();window.MomentsAppearance={read,refresh,apply,chooseLayout};
})();
