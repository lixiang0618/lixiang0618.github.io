/* Geometry and charts only. Depth is illustrative, never a numerical input. */
(function(root){'use strict';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function scene(c,q,d,stage,lang){const L=(en,zh)=>lang==='zh'?zh:en;
 // Compress extreme aspect ratios for readable grouped structure, never for computation.
 const len=Math.max(180,Math.min(420,260*c.length/c.height)),height=Math.max(100,Math.min(260,420*c.height/c.length)),sx=len/c.length,sz=height/c.height;
 const P=(x,y,z)=>[110+.86*x+.66*y,330-.36*x+.34*y-.9*z];const pts=arr=>arr.map(a=>P(...a).join(',')).join(' ');
 const poly=(arr,cls)=>`<polygon points="${pts(arr)}" class="${cls}"/>`;
 const line=(arr,cls,extra='')=>`<polyline points="${pts(arr)}" class="${cls}" ${extra}/>`;
 const text=(x,y,z,s,cls='')=>{const p=P(x,y,z);return `<text x="${p[0]}" y="${p[1]}" class="${cls}">${esc(s)}</text>`;};
 const rack=(a,b)=>{
  let s=poly([[0,a,0],[len,a,0],[len,b,0],[0,b,0]],'wh-rack-bottom')+poly([[0,b,0],[len,b,0],[len,b,height],[0,b,height]],'wh-rack-face');
  const rr=Math.min(c.tiers,12),bb=Math.min(c.bays,20);
  for(let i=0;i<=rr;i++){const z=height*i/rr;s+=line([[0,a,z],[0,b,z],[len,b,z]],'wh-beam');if(i<rr)s+=line([[0,b+4,z+3],[len,b+4,z+3]],'wh-hp-rail');}
  for(let i=0;i<=bb;i++)s+=line([[len*i/bb,b,0],[len*i/bb,b,height]],'wh-upright');
  s+=poly([[0,a,0],[0,b,0],[0,b,height],[0,a,height]],'wh-front-frame');
  return s+poly([[0,a,height],[len,a,height],[len,b,height],[0,b,height]],'wh-rack-top');
 };
 let s=rack(0,52)+rack(140,192);
 s+=line([[0,115,0],[0,115,height]],'wh-vp-rail');
 s+=poly([[-20,75,0],[12,75,0],[12,125,0],[-20,125,0]],'wh-io');
 const xs=d.s.x*sx,ys=d.s.y*sz,xr=d.r.x*sx,yr=d.r.y*sz;
 const path=(arr,kind)=>line(arr,'wh-path wh-path-'+kind,`marker-end="url(#wh-arrow-${kind})"`);
 s+=text(-30,85,-20,'I/O')+text(-20,100,height+18,'VP')+text(len*.5,195,height+12,'HP / '+L('tier rails','各层轨道'));
 // Selected reference cells remain at exact physical coordinates, including grouped drawing.
 const marker=(x,z,name,kind)=>{const p=P(x,198,z),overlap=kind==='retrieve'&&xs===xr&&ys===yr;return `<circle cx="${p[0]}" cy="${p[1]}" r="${overlap?10:7}" class="wh-cell-${kind}"/><text x="${p[0]+10}" y="${p[1]+(overlap?20:-9)}" class="wh-mark-label">${name}</text>`;};
 s+=marker(xs,ys,'S','store');if(stage>=2)s+=marker(xr,yr,'R','retrieve');
 if(stage>=1)s+=path([[0,115,0],[0,115,ys],[xs,198,ys]],'store');
 if(stage>=3){if(d.same)s+=path([[xs,198,ys],[xr,198,yr],[0,115,yr]],'retrieve');else s+=path([[0,115,ys],[0,115,yr]],'retrieve')+path([[0,198,yr],[xr,198,yr],[0,198,yr]],'retrieve');}
 if(stage>=4)s+=path([[0,115,yr],[0,115,0]],'retrieve');
 // Resource carriages move on their own paths; no extra modeled depth travel.
 s+='<g id="wh-vp-marker"><rect x="-10" y="-6" width="20" height="12" rx="2" class="wh-vp-carriage"/><text x="12" y="4">VP</text></g><g id="wh-hp-marker"><rect x="-8" y="-5" width="16" height="10" rx="2" class="wh-hp-carriage"/><text x="10" y="4">HP</text></g>';
 const bounds=[P(0,0,height),P(len,0,height),P(len,220,0),P(0,0,0),P(0,220,height)];const minx=Math.min(...bounds.map(p=>p[0]))-60,miny=Math.min(...bounds.map(p=>p[1]))-40,maxx=Math.max(...bounds.map(p=>p[0]))+70,maxy=Math.max(...bounds.map(p=>p[1]))+55;
 return {html:`<svg class="wh-warehouse" viewBox="${minx} ${miny} ${maxx-minx} ${maxy-miny}" role="img" aria-label="${L('Isometric SP-AS/RS: two racks, tier HP rails, front VP and I/O; storage S and retrieval R','SP-AS/RS 轴测图：双排货架、每层 HP 轨道、前端 VP 与 I/O，S 存储、R 取货')}"><defs>${['store','retrieve'].map(kind=>`<marker id="wh-arrow-${kind}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="wh-fill-${kind}"/></marker>`).join('')}</defs>${s}</svg>`,position(fraction){let vpZ=0,hpX=0,hpZ=ys;const f=Math.max(0,Math.min(1,fraction));
 if(stage===1){const t=f*d.storage;vpZ=Math.min(d.y1,t)*c.vertical_speed*sz;hpX=Math.max(0,t-d.y1)*c.horizontal_speed*sx;}
 if(stage>=2){vpZ=ys;hpX=xs;}
 if(stage===3){const t=f*d.retrieval;hpZ=yr;if(d.same){const first=Math.abs(d.x1-d.x2);hpX=(t<=first?d.x1+Math.sign(d.x2-d.x1)*t:Math.max(0,d.x2-(t-first)))*c.horizontal_speed*sx;}else{vpZ=(d.y1+Math.sign(d.y2-d.y1)*Math.min(t,d.vp))*c.vertical_speed*sz;hpX=(t<=d.x2?t:Math.max(0,2*d.x2-t))*c.horizontal_speed*sx;}}
 if(stage>=4){vpZ=yr*(1-f);hpX=0;hpZ=yr;}
 return {vp:P(0,115,vpZ),hp:P(hpX,198,hpZ)};
 }};
}
function chart(points,lang){const L=(en,zh)=>lang==='zh'?zh:en,W=720,H=340,pad={l:80,r:60,t:24,b:55};
 const first=points[0],last=points.at(-1),values=points.flatMap(p=>[p.ci95_low_s,p.ci95_high_s,p.theory_s]);let lo=Math.min(...values),hi=Math.max(...values);const spread=Math.max(hi-lo,Math.abs(hi)*.03,1);lo-=spread*.08;hi+=spread*.08;
 const X=n=>pad.l+(Math.log(n)-Math.log(first.n_samples))/(Math.log(last.n_samples)-Math.log(first.n_samples))*(W-pad.l-pad.r),Y=v=>H-pad.b-(v-lo)/(hi-lo)*(H-pad.t-pad.b);
 const path=(a,key)=>a.map((p,i)=>(i?'L':'M')+X(p.n_samples).toFixed(2)+','+Y(p[key]).toFixed(2)).join('');
 const band=path(points,'ci95_high_s')+points.slice().reverse().map(p=>'L'+X(p.n_samples).toFixed(2)+','+Y(p.ci95_low_s).toFixed(2)).join('')+'Z';let grid='';
 for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4,y=Y(v);grid+=`<path d="M${pad.l} ${y}H${W-pad.r}" class="wh-chart-grid"/><text x="${pad.l-8}" y="${y+4}" text-anchor="end">${v.toFixed(1)}</text>`;}
 const ticks=[2,10,100,1000,10000,100000,1000000].filter(n=>n<=last.n_samples);for(const n of ticks)grid+=`<text x="${X(n)}" y="${H-32}" text-anchor="middle">${n.toLocaleString('en')}</text>`;
 return {html:`<svg viewBox="0 0 ${W} ${H}" class="wh-chart-svg" role="img" aria-label="${L('Running mean and pointwise 95% confidence intervals against analytical expectation','运行均值、逐点 95% 置信区间与解析期望对比')}">${grid}<path d="${band}" class="wh-ci-band"/><path d="M${pad.l} ${Y(first.theory_s)}H${W-pad.r}" class="wh-theory-line"/><path d="${path(points,'simulation_mean_s')}" class="wh-mean-line"/><text x="${W/2}" y="${H-6}" text-anchor="middle">${L('Simulated DC cycles (log scale)','模拟 DC 周期数（对数轴）')}</text><text x="16" y="${H/2}" transform="rotate(-90 16 ${H/2})" text-anchor="middle">${L('Mean DC time (s)','平均 DC 时间（秒）')}</text><line id="wh-chart-cursor" y1="${pad.t}" y2="${H-pad.b}" class="wh-chart-cursor" visibility="hidden"/></svg><label class="wh-chart-inspector">${L('Inspect checkpoint (keyboard or touch)','查看检查点（键盘或触摸）')}<input id="wh-checkpoint" type="range" min="0" max="${points.length-1}" value="${points.length-1}" step="1"></label>`,X,W,nearest(ratio){const n=Math.exp(Math.log(first.n_samples)+(ratio*W-pad.l)/(W-pad.l-pad.r)*(Math.log(last.n_samples)-Math.log(first.n_samples)));return points.reduce((best,p,i)=>Math.abs(Math.log(p.n_samples/n))<Math.abs(Math.log(points[best].n_samples/n))?i:best,0);}};
}
const api={scene,chart,esc};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WarehouseVisual=api;
})(typeof window!=='undefined'?window:globalThis);
