/* Reuse the existing Blog theme preference; no experiments or API calls. */
(() => {
  'use strict';
  document.getElementById('year').textContent=new Date().getFullYear();
  const button=document.querySelector('[data-lab-theme]');
  const sync=()=>button.setAttribute('aria-pressed',String(document.documentElement.dataset.blogTheme==='dark'));
  button.addEventListener('click',()=>{const value=document.documentElement.dataset.blogTheme==='dark'?'light':'dark';document.documentElement.dataset.blogTheme=value;try{localStorage.setItem('lx_blog_theme',value);}catch(_){}sync();});
  document.addEventListener('visibilitychange',()=>document.body.classList.toggle('is-paused',document.hidden));sync();
})();
