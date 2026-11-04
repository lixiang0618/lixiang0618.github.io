/* Public, coarse location only. No geolocation, tokens or browser storage. */
(function () {
  'use strict';
  const root=document.querySelector('[data-profile-location]');if(!root)return;
  const zh=document.documentElement.lang.startsWith('zh');
  const text=zh?{around:'最近出没于 ',updated:'上次更新：',paused:'暂时隐身中',stale:'暂时失联中'}:
    {around:'Somewhere around ',updated:'Last updated: ',paused:'Location sharing paused',stale:'Location temporarily unavailable'};
  const label=root.querySelector('.profile-location-label'),updated=root.querySelector('.profile-location-updated'),time=updated.querySelector('time');
  const clean=value=>typeof value==='string'&&value.length<=100?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().replace(/\s+/g,' '):'';
  const same=(a,b)=>a.normalize('NFKC').toLowerCase()===b.normalize('NFKC').toLowerCase();
  function region(location){
    const place=clean(location.city)||clean(location.region)||clean(location.country),district=clean(location.district);
    return place?(district&&!same(place,district)?place+' · '+district:place):'';
  }
  function show(status,place='',date=null){
    label.textContent=status==='active'?text.around+place:text[status]||'';
    updated.hidden=status!=='active';time.textContent='';time.removeAttribute('datetime');
    if(date){updated.querySelector('span').textContent=text.updated;time.dateTime=date.toISOString();time.textContent=new Intl.DateTimeFormat(zh?'zh-CN':'en',{dateStyle:'medium',timeStyle:'short'}).format(date);}
    const visible=Boolean(label.textContent);root.dataset.state=visible?status:'hidden';root.setAttribute('aria-hidden',String(!visible));root.setAttribute('aria-busy','false');
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
      const place=region(location),date=typeof location.updated_at==='string'?new Date(location.updated_at):null;
      if(!place||!date||!Number.isFinite(date.getTime())){show('hidden');return;}
      // A cached/misclassified active response must never reveal a >24h-old place.
      if(Date.now()-date.getTime()>24*60*60*1000){show('stale');return;}
      show('active',place,date);
    }catch(_){show('hidden');}finally{clearTimeout(timer);}
  }
  load();
})();
