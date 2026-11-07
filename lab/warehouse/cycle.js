/* Continuous teaching trajectories in physical seconds. DC uses the unchanged core.
   SC reference: VP returns to I/O between commands. Empty storage HP resets in
   parallel; same-tier retrieval waits for that HP to be ready at the handoff. */
(function(root){'use strict';
const C=typeof module!=='undefined'&&module.exports?require('./core'):root.WarehouseCore;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function create(input,task){const c=C.config(input),d=C.breakdown(c,task),release=d.storage+d.y1,hpReady=d.same?d.storage+d.x1:d.storage,hpStart=Math.max(release,hpReady),scJoin=Math.max(release+d.y2,hpStart+2*d.x2),scTotal=scJoin+d.y2,total=Math.max(d.total,scTotal);
const events=[0,d.y1,d.storage,d.storage+(d.same?Math.abs(d.x1-d.x2):d.x2),d.storage+d.retrieval,d.storage+d.vp,d.storage+d.hp,d.storage+d.x1,d.total,release,release+d.y2,hpStart,hpStart+d.x2,scJoin,scTotal].filter(t=>Number.isFinite(t)&&t>=0&&t<=total).sort((a,b)=>a-b).filter((t,i,a)=>i===0||t-a[i-1]>1e-9);
function state(kind,time){const end=kind==='dc'?d.total:scTotal,t=clamp(time,0,end),after=Math.max(0,t-d.storage);let vy=0,sx=0,rx=0,phase='store-rise',pickup=Infinity,join=Infinity;
 if(t<d.y1){vy=t*c.vertical_speed;}
 else if(t<d.storage){vy=d.s.y;sx=(t-d.y1)*c.horizontal_speed;phase='store-travel';}
 else if(kind==='dc'){
  join=d.storage+d.retrieval;
  if(d.same){const first=Math.abs(d.x1-d.x2);sx=after<=first?d.s.x+Math.sign(d.r.x-d.s.x)*after*c.horizontal_speed:Math.max(0,d.r.x-(after-first)*c.horizontal_speed);rx=sx;vy=d.s.y;pickup=d.storage+first;phase=after<first?'retrieve-pick':'retrieve-front';}
  else {sx=Math.max(0,d.s.x-after*c.horizontal_speed);vy=d.s.y+Math.sign(d.r.y-d.s.y)*Math.min(after,d.vp)*c.vertical_speed;rx=after<=d.x2?after*c.horizontal_speed:Math.max(0,2*d.r.x-after*c.horizontal_speed);pickup=d.storage+d.x2;phase=after>=d.vp&&after<d.hp?'vp-wait':after>=d.hp&&after<d.vp?'hp-wait':'dc-parallel';}
  if(t>=join){vy=Math.max(0,d.r.y-(t-join)*c.vertical_speed);phase='dc-return';}
 }else {
  sx=Math.max(0,d.s.x-after*c.horizontal_speed);pickup=hpStart+d.x2;join=scJoin;
  if(t<release){vy=Math.max(0,d.s.y-after*c.vertical_speed);phase='sc-store-return';}
  else {vy=Math.min(d.r.y,(t-release)*c.vertical_speed);const h=Math.max(0,t-hpStart);if(t>=hpStart)rx=h<=d.x2?h*c.horizontal_speed:Math.max(0,2*d.r.x-h*c.horizontal_speed);if(d.same){if(t<hpStart)rx=sx;else sx=rx;}phase=t<hpStart?'sc-hp-reset':t>=release+d.y2&&t<scJoin?'vp-wait':t>=hpStart+2*d.x2&&t<scJoin?'hp-wait':'sc-retrieve';}
  if(t>=join){vy=Math.max(0,d.r.y-(t-join)*c.vertical_speed);phase='sc-retrieve-return';}
 }
 const vp={x:0,y:vy},hpS={x:sx,y:d.s.y},hpR=d.same?hpS:{x:rx,y:d.r.y},incoming=t<d.storage?(t<d.y1?vp:hpS):null,revealed=t>=d.storage,outgoing=revealed?(t<pickup?d.r:t<join?hpR:vp):null;
 if(t>=end)phase='complete';return {time:t,total:end,vp,hpS,hpR,incoming,outgoing,revealed,stored:t>=d.storage&&!(d.s.x===d.r.x&&d.s.y===d.r.y&&t>=pickup),phase,complete:t>=end};}
return {config:c,task:{...task},parts:d,total,dcTotal:d.total,scTotal,events,release,hpStart,scJoin,state};}
const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarehouseCycle=api;
})(typeof window!=='undefined'?window:globalThis);
