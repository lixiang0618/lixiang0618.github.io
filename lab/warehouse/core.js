/* Numerical port of supplied warehouse_core.py. No DOM, rendering or I/O. */
(function(root){'use strict';
const MODES=['tier1_origin','cell_centers','far_edges'],Z=1.959963984540054;
function config(c={}){
 c={tiers:12,bays:24,cell_width:4.5,cell_height:4.5,horizontal_speed:2,vertical_speed:1,coordinate_mode:'tier1_origin',...c};
 for(const k of ['tiers','bays'])if(!Number.isSafeInteger(c[k])||c[k]<1)throw Error(k+' must be a positive safe integer');
 for(const k of ['cell_width','cell_height','horizontal_speed','vertical_speed'])if(typeof c[k]!=='number'||!Number.isFinite(c[k])||c[k]<=0)throw Error(k+' must be finite and positive');
 if(!MODES.includes(c.coordinate_mode))throw Error('Unknown coordinate_mode');
 const length=c.bays*c.cell_width,height=c.tiers*c.cell_height,th=length/c.horizontal_speed,b=(height/c.vertical_speed)/th;
 if(![length,height,th,b].every(x=>Number.isFinite(x)&&x>0))throw Error('Derived dimensions must be finite and positive');
 return {...c,length,height,th,b};
}
function normalized(b,n){if(!Number.isFinite(b)||b<=0||!Number.isSafeInteger(n)||n<1)throw Error('Invalid b or tiers');return b<=2?1.5-1/(6*n)+b+(n-1)*b*b/(24*n):.5+5/(6*n)+(4*n-1)*b/(3*n)+(4*n-4)/(3*n*b)-(2*n-2)/(3*n*b*b);}
function theory(input){const c=config(input),v=c.th*normalized(c.b,c.tiers);if(!Number.isFinite(v))throw Error('Expected time exceeds numeric range');return v;}
function cell(c,tier,bay){if(!Number.isInteger(tier)||tier<0||tier>=c.tiers||!Number.isInteger(bay)||bay<0||bay>=c.bays)throw Error('Invalid cell index');const mode=c.coordinate_mode;return {x:(bay+(mode==='cell_centers'?.5:1))*c.cell_width,y:(tier+(mode==='cell_centers'?.5:mode==='far_edges'?1:0))*c.cell_height};}
function breakdown(input,q){const c=config(input),s=cell(c,q.storage_tier,q.storage_bay),r=cell(c,q.retrieval_tier,q.retrieval_bay),x1=s.x/c.horizontal_speed,y1=s.y/c.vertical_speed,x2=r.x/c.horizontal_speed,y2=r.y/c.vertical_speed,same=q.storage_tier===q.retrieval_tier;
 const storage=x1+y1,vp=same?0:Math.abs(y1-y2),hp=same?Math.abs(x1-x2)+x2:2*x2,retrieval=same?hp:Math.max(vp,hp),final=y2,total=storage+retrieval+final;
 if(!Number.isFinite(total))throw Error('Task time exceeds numeric range');return {s,r,x1,y1,x2,y2,same,storage,vp,hp,retrieval,final,total,waitVP:same?0:Math.max(0,hp-vp),waitHP:same?0:Math.max(0,vp-hp)};}
function taskTime(c,q){return breakdown(c,q).total;}
// Mulberry32 is a browser reproduction choice, not NumPy PCG64. Four independent draws/task.
function random(seed){if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('Seed must be uint32');let a=seed;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return (t^(t>>>14))>>>0;};}
function integer(rng,high){if(!Number.isSafeInteger(high)||high<1||high>4294967296)throw Error('Invalid sampling range');const limit=4294967296-4294967296%high;let v;do{v=rng();}while(v>=limit);return v%high;}
function task(c,rng){return {storage_tier:integer(rng,c.tiers),storage_bay:integer(rng,c.bays),retrieval_tier:integer(rng,c.tiers),retrieval_bay:integer(rng,c.bays)};}
function stats(){return {n:0,mean:0,m2:0,same:0};}
function add(s,value,same=false){if(!Number.isFinite(value))throw Error('Nonfinite sample');s.n++;const d=value-s.mean;s.mean+=d/s.n;s.m2+=d*(value-s.mean);if(same)s.same++;return s;}
function metrics(t,s){if(!Number.isFinite(t)||s.n<2)throw Error('Need finite theory and at least two samples');const sd=Math.sqrt(Math.max(0,s.m2/(s.n-1))),se=sd/Math.sqrt(s.n),absolute=Math.abs(s.mean-t);return {n_samples:s.n,theory_s:t,simulation_mean_s:s.mean,signed_gap_s:s.mean-t,absolute_gap_s:absolute,relative_gap_pct:t===0?null:100*absolute/Math.abs(t),sample_sd_s:sd,standard_error_s:se,ci95_low_s:s.mean-Z*se,ci95_high_s:s.mean+Z*se,same_tier_fraction:s.same/s.n};}
function sampleMetrics(t,values){const s=stats();for(const v of values)add(s,v);return metrics(t,s);}
function checkpoints(n){if(!Number.isSafeInteger(n)||n<2)throw Error('Samples must be integer >= 2');const a=new Set([2,n]);for(let i=0;i<180;i++)a.add(Math.max(2,Math.round(Math.exp(Math.log(2)+(Math.log(n)-Math.log(2))*i/179))));return [...a].sort((a,b)=>a-b);}
function simulate(input,n,seed){const c=config(input),t=theory(c),rng=random(seed),s=stats(),points=[],cp=checkpoints(n);let j=0;for(let i=1;i<=n;i++){const q=task(c,rng);add(s,taskTime(c,q),q.storage_tier===q.retrieval_tier);if(i===cp[j]){points.push(metrics(t,s));j++;}}return {metrics:metrics(t,s),points};}
function enumerate(input){const c=config(input);if((c.tiers*c.bays)**2>1e6)throw Error('Enumeration limited to one million pairs');const s=stats();for(let i=0;i<c.tiers;i++)for(let j=0;j<c.bays;j++)for(let k=0;k<c.tiers;k++)for(let l=0;l<c.bays;l++)add(s,taskTime(c,{storage_tier:i,storage_bay:j,retrieval_tier:k,retrieval_bay:l}));return s.mean;}
const api={MODES,Z,config,normalized,theory,cell,breakdown,taskTime,random,integer,task,stats,add,metrics,sampleMetrics,checkpoints,simulate,enumerate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarehouseCore=api;
})(typeof self!=='undefined'?self:globalThis);
