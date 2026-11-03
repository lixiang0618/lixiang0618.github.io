/* Shared static-route and missing-article presentation. No timer or global API. */
(function () {
  'use strict';
  const copy={
    en:{name:'Xiangology',heading:'I thought it existed. Apparently not.',home:'Back to Home',blog:'Explore Blog',label:'Page not found',pause:'Pause animation',play:'Resume animation',lines:["I'm here!",'Hehe…',"Catch me if you can!",'Just kidding!','Where’s 0?!',"Okay, okay. I’ll behave."]},
    zh:{name:'想想而已',heading:'想想而已，没想到真没有。',home:'回首页',blog:'去博客逛逛',label:'页面不存在',pause:'暂停动画',play:'继续动画',lines:['我来啦！','嘿嘿～','抓不到我吧！','略略略～','0 呢？！','好啦好啦，不闹了。']}
  };
  function mount(article=false) {
    if(document.querySelector('.nf-main'))return;
    const zh=location.pathname.startsWith('/zh/'),t=copy[zh?'zh':'en'],prefix=zh?'/zh/':'/';
    document.documentElement.lang=zh?'zh-CN':'en';
    document.documentElement.classList.add('not-found-document');document.body.classList.add('not-found-page');
    document.title='404 · '+t.name;
    let robots=document.querySelector('meta[name="robots"]');
    if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.append(robots);}robots.content='noindex';
    const main=document.createElement('main');main.className='nf-main';main.id='not-found';
    main.innerHTML='<p class="nf-kicker">404 / <span></span></p><div class="nf-stage" aria-hidden="true"><span class="nf-ghost"></span><span class="nf-digit nf-left">4</span><span class="nf-digit nf-zero">0</span><span class="nf-digit nf-right">4</span><div class="nf-dialogue"></div></div><div class="nf-copy"><h1></h1></div><nav class="nf-links"></nav><button type="button" class="nf-pause" aria-pressed="false"></button>';
    main.querySelector('.nf-kicker span').textContent=t.label;main.querySelector('h1').textContent=t.heading;
    for(const line of t.lines){const p=document.createElement('p');p.className='nf-bubble';p.textContent=line;main.querySelector('.nf-dialogue').append(p);}
    const links=main.querySelector('.nf-links');links.setAttribute('aria-label',t.label);
    for(const [href,text] of [[prefix+'index.html',t.home],[prefix+'blog.html',t.blog]]){const a=document.createElement('a');a.href=href;a.textContent=text;links.append(a);}
    const previous=document.querySelector('main');if(previous)previous.replaceWith(main);else document.body.append(main);
    document.querySelectorAll('.reading-progress-mobile,.reading-share').forEach(n=>n.remove());
    // Root-relative links also work when the host serves this file at a deep URL.
    document.querySelectorAll('[data-nf-home]').forEach(n=>{n.href=prefix+'index.html';n.textContent=t.name;});
    document.querySelectorAll('[data-nf-language]').forEach(n=>{n.href=zh?'/404.html':'/zh/404.html';n.textContent=zh?'EN':'中文';});
    const pause=main.querySelector('.nf-pause'),motion=matchMedia('(prefers-reduced-motion: reduce)');let paused=false;
    function sync(){main.classList.toggle('is-paused',document.hidden||paused);pause.hidden=motion.matches;pause.textContent=paused?t.play:t.pause;pause.setAttribute('aria-pressed',String(paused));}
    pause.addEventListener('click',()=>{paused=!paused;sync();});document.addEventListener('visibilitychange',sync);motion.addEventListener('change',sync);sync();
    if(article){main.tabIndex=-1;main.focus({preventScroll:true});}
  }
  document.addEventListener('site:not-found',()=>mount(true));
  if(document.body.hasAttribute('data-not-found'))mount();
})();
