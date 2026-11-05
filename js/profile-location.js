/* Public coarse location. Relative labels are presentation, never online tracking. */
(function () {
  'use strict';
  const root=document.querySelector('[data-profile-location]');if(!root)return;
  const zh=document.documentElement.lang.startsWith('zh');
  const text=zh?{updated:'更新于 ',paused:'暂时隐身中',stale:'暂时失联中',active:'位置共享中',off:'已暂停',old:'暂不可用',now:'刚刚'}:
    {updated:'Updated ',paused:'Location sharing paused',stale:'Location temporarily unavailable',active:'Active',off:'Paused',old:'Unavailable',now:'Just now'};
  const label=root.querySelector('.profile-location-label'),updated=root.querySelector('.profile-location-updated'),time=updated.querySelector('time'),statusLabel=root.querySelector('[data-location-status]');
  const clean=value=>typeof value==='string'&&value.length<=100?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().replace(/\s+/g,' '):'';
  const same=(a,b)=>a.normalize('NFKC').toLowerCase()===b.normalize('NFKC').toLowerCase();
  function region(location){
    const place=clean(location.city)||clean(location.region)||clean(location.country),district=clean(location.district);
    return place?(district&&!same(place,district)?place+' · '+district:place):'';
  }
  let date=null,refreshTimer;
  function relative(value){
    const seconds=Math.max(0,Math.floor((Date.now()-value.getTime())/1000));
    if(seconds<60)return text.now;
    const [unit,amount]=seconds<3600?['minute',Math.floor(seconds/60)]:seconds<86400?['hour',Math.floor(seconds/3600)]:['day',Math.floor(seconds/86400)];
    return new Intl.RelativeTimeFormat(zh?'zh-CN':'en',{numeric:'always'}).format(-amount,unit);
  }
  function tick(){
    if(root.dataset.state!=='active'||!date)return;
    if(Date.now()-date.getTime()>86400000){show('stale');return;}
    time.textContent=relative(date);
  }
  function show(status,place='',value=null){
    date=value;label.textContent=status==='active'?place:text[status]||'';
    updated.hidden=status!=='active';time.textContent='';time.removeAttribute('datetime');time.removeAttribute('title');
    if(date){updated.querySelector('span').textContent=text.updated;time.dateTime=date.toISOString();time.title=new Intl.DateTimeFormat(zh?'zh-CN':'en',{dateStyle:'full',timeStyle:'long'}).format(date);}
    if(statusLabel){statusLabel.textContent=status==='active'?text.active:status==='paused'?text.off:text.old;statusLabel.parentElement.title=zh?'表示位置共享状态，不代表在线或持续追踪':'Location sharing status, not online presence or continuous tracking';}
    root.dataset.state=label.textContent?status:'hidden';root.setAttribute('aria-hidden',String(!label.textContent));root.setAttribute('aria-busy','false');tick();
  }
  async function load(){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
    try{
      const response=await fetch('https://api.lxiang.cc/api/location',{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
      if(!response.ok)throw Error('location unavailable');
      const data=await response.json();if(data?.success!==true){show('hidden');return;}
      if(data.status==='paused'||data.status==='stale'){show(data.status);return;}
      const location=data.location;
      if(data.status!=='active'||!location||typeof location!=='object'||Array.isArray(location)){show('hidden');return;}
      const place=region(location),value=typeof location.updated_at==='string'?new Date(location.updated_at):null;
      if(!place||!value||!Number.isFinite(value.getTime())||value.getTime()>Date.now()+60000){show('hidden');return;}
      if(Date.now()-value.getTime()>86400000){show('stale');return;}
      show('active',place,value);
    }catch(_){show('hidden');}finally{clearTimeout(timer);}
  }
  function startClock(){clearInterval(refreshTimer);if(!document.hidden){tick();refreshTimer=setInterval(tick,30000);}}
  document.addEventListener('visibilitychange',()=>{root.classList.toggle('is-paused',document.hidden);startClock();});
  window.addEventListener('pagehide',()=>clearInterval(refreshTimer));window.addEventListener('pageshow',startClock);
  startClock();load();
})();
