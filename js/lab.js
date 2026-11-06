/* Navigation only: no uploads, model execution or experiment API calls. */
(() => {
 'use strict';
 const lang=document.documentElement.lang.startsWith('zh')?'zh':'en';
 const registry=window.LabRegistry,views=window.LabViews;
 const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
 const theme=document.querySelector('[data-lab-theme]');
 const syncTheme=()=>theme?.setAttribute('aria-pressed',String(document.documentElement.dataset.blogTheme==='dark'));
 theme?.addEventListener('click',()=>{const value=document.documentElement.dataset.blogTheme==='dark'?'light':'dark';document.documentElement.dataset.blogTheme=value;try{localStorage.setItem('lx_blog_theme',value);}catch(_){}syncTheme();});
 window.addEventListener('storage',event=>{if(event.key==='lx_blog_theme'){document.documentElement.dataset.blogTheme=event.newValue==='dark'?'dark':'light';syncTheme();}});syncTheme();
 if(!registry||!views)return;
 const project=registry.projects.find(p=>p.id===document.body.dataset.project);if(!project||!project.experiments.length)return;
 if(['or','cchan','sna','wellife'].includes(project.id))return; // Dedicated playground uses its own controller.
 const tabs=Array.from(document.querySelectorAll('[role="tab"]')),panels=Array.from(document.querySelectorAll('.experiment-panel'));
 function activate(id,focus=false,push=false){
  const exp=project.experiments.find(n=>n.id===id)||project.experiments[0];
  tabs.forEach(tab=>{const active=tab.dataset.experiment===exp.id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus({preventScroll:true});});
  panels.forEach(panel=>panel.hidden=panel.id!=='panel-'+exp.id);
  const language=document.querySelector('.lab-language');if(language)language.href=views.route(project,lang==='en'?'zh':'en')+'#'+encodeURIComponent(exp.id);
  if(push&&location.hash!=='#'+exp.id)history.pushState(null,'','#'+encodeURIComponent(exp.id));
 }
 function fromHash(){let id;try{id=decodeURIComponent(location.hash.slice(1));}catch(_){}activate(id);}
 tabs.forEach((tab,i)=>{
  tab.addEventListener('click',()=>activate(tab.dataset.experiment,true,true));
  tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(i+1)%tabs.length;else if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();activate(tabs[next].dataset.experiment,true,true);});
 });
 window.addEventListener('hashchange',fromHash);window.addEventListener('popstate',fromHash);fromHash();
})();
