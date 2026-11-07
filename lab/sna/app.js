/* Presentation layer only: calculations remain in the verified model/data. */
(()=>{'use strict';
 const app=document.getElementById('sna-app');if(!app)return;
 const lang=document.documentElement.lang.startsWith('zh')?'zh':'en',L=(en,zh)=>lang==='zh'?zh:en,$=id=>document.getElementById('sna-'+id),M=window.SnaModel,N=window.SnaNetwork,esc=N.esc;
 let d,graphs={},loading=false;
 const f=(v,p=4)=>Number(v).toLocaleString(lang==='zh'?'zh-CN':'en-US',{maximumFractionDigits:p}),pct=v=>v===null?'—':f(v*100,2)+'%',name=i=>d.nodes[i].name[lang],school=i=>d.nodes[i].code+' · '+name(i);
 const metric=(label,value)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
 function inspect(id,key){const n=d.nodes[id],b=n.brokerage;
  $(key+'-detail').textContent=school(id)+' · '+L('out','出边')+' '+n.degree.out+' · '+L('in','入边')+' '+n.degree.in+(key==='broker'?' · Gatekeeper '+(b?b.gatekeeper:'—')+' · Liaison '+(b?b.liaison:'—'):'');
  if(key==='broker'){
   $('hole-stats').innerHTML=`<strong>${esc(school(id))}</strong><p>${L('Effective size','有效规模')} ${f(n.holes.effectiveSize,3)} · ${L('Efficiency','效率')} ${f(n.holes.efficiency,3)} · ${L('Constraint','限制度')} ${f(n.holes.constraint,3)}</p>`;
   for(const row of $('broker-bars').querySelectorAll('[data-school]'))row.classList.toggle('is-active',Number(row.dataset.school)===id);
   // Only highlight a triad after its complete reconstructed count matches the saved row.
   const role=b?.gatekeeper>0?'gatekeeper':b?.liaison>0?'liaison':null,ws=role?M.witnesses(d,id,role):[];
   const verified=role&&ws.length===b[role]?ws[0]:null;
   for(const edge of graphs.broker.svg.querySelectorAll('.sna-edge'))edge.classList.toggle('sna-triad-edge',Boolean(verified&&((+edge.dataset.source===verified.source&&+edge.dataset.target===id)||(+edge.dataset.source===id&&+edge.dataset.target===verified.target))));
   if(verified)$('broker-detail').textContent+=' · '+L('Verified example','已核验实例')+': '+[verified.source,id,verified.target].map(i=>d.nodes[i].code).join(' → ');
  }
 }
 function matrix(){const max=Math.max(...d.weights.flat());
  $('matrix').innerHTML=`<table class="sna-matrix"><caption>${L('Source rows i → destination columns j · F (model units)','来源行 i → 目标列 j · F（模型量）')}</caption><thead><tr><th>i / j</th>${d.nodes.map(n=>`<th scope="col" title="${esc(name(n.id))}">${n.code}</th>`).join('')}</tr></thead><tbody>${d.nodes.map((n,i)=>`<tr><th scope="row" title="${esc(name(i))}">${n.code}</th>${d.nodes.map((_,j)=>`<td><button type="button" data-cell="${i},${j}" tabindex="${i===0&&j===0?0:-1}" style="--heat:${Math.round(d.weights[i][j]/max*40)}%" aria-label="${esc(name(i))} → ${esc(name(j))}: ${d.weights[i][j]}">${f(d.weights[i][j],3)}</button></td>`).join('')}</tr>`).join('')}</tbody></table>`;
  // Exact legacy gradient: orange/surface mix with the original 0–40% normalization.
  for(const container of [$('matrix')]){
   const pick=e=>{const cell=e.target.closest('[data-cell]');if(cell)showCell(...cell.dataset.cell.split(',').map(Number));};
   container.addEventListener('pointerover',pick);container.addEventListener('focusin',pick);container.addEventListener('click',pick);
   container.addEventListener('keydown',e=>{const c=e.target.closest('[data-cell]');if(!c)return;let [i,j]=c.dataset.cell.split(',').map(Number);if(e.key==='ArrowDown')i=Math.min(25,i+1);else if(e.key==='ArrowUp')i=Math.max(0,i-1);else if(e.key==='ArrowLeft')j=Math.max(0,j-1);else if(e.key==='ArrowRight')j=Math.min(25,j+1);else if(e.key==='Home')j=0;else if(e.key==='End')j=25;else return;e.preventDefault();const next=container.querySelector(`[data-cell="${i},${j}"]`);next.focus({preventScroll:true});if(container===$('matrix'))next.scrollIntoView({block:'nearest',inline:'nearest'});});
  }showCell(0,1);
 }
 function showCell(i,j){for(const id of ['matrix'])for(const cell of $(id).querySelectorAll('[data-cell]')){const active=cell.dataset.cell===i+','+j;cell.classList.toggle('is-active',active);cell.tabIndex=active?0:-1;cell.setAttribute('aria-pressed',String(active));}
  $('cell').textContent=school(i)+' → '+school(j)+' · F='+d.weights[i][j]+' · '+L('column mean','列均值')+'='+f(d.columnMeans[j],10)+' · B='+d.binary[i][j]+(i===j?' · '+L('Self-loop removed','自环已删除'):'');

 }
 function core(){const es=M.edges(d),count=(a,b)=>es.filter(e=>d.nodes[e.source].core===a&&d.nodes[e.target].core===b).length;
  $('core-stats').innerHTML=`<div class="sna-core-headlines"><div><span>${L('Core universities','核心高校')}</span><strong>11<small> / 26</small></strong><div class="sna-node-dots" aria-hidden="true">${d.nodes.map(n=>`<i class="${n.core?'is-core':''}"></i>`).join('')}</div></div><div><span>${L('Core density','核心密度')}</span><strong>98.18<small>%</small></strong><p>108 / 110 ${L('directed ties','条有向关系')}</p></div></div><div class="sna-fit"><span>${L('Core–periphery fit','核心—边缘拟合')}</span><strong>0.9723</strong></div><div class="sna-direction-label">${L('Directed relationship density','有向关系密度')}</div>${[[true,false,165,L('Core → periphery','核心 → 边缘')],[false,true,165,L('Periphery → core','边缘 → 核心')],[false,false,210,L('Within periphery','边缘内部')]].map(([a,b,total,label])=>{const n=count(a,b);return `<div class="sna-density-row"><div><strong>${label}</strong><span>${pct(n/total)}</span></div><div class="sna-density-track"><i style="width:${n/total*100}%"></i></div><small>${n} / ${total}</small></div>`;}).join('')}`;
 }
 function blocks(){const descriptions=[L('Dense internal links and substantial outgoing attraction.','内部高度紧密，同时向外发出大量吸引力关系。'),L('A singleton connecting with other blocks; no internal pair exists.','单节点板块，通过跨板块关系连接其他群体，无内部节点对。'),L('Sparse internal ties and limited outward relations.','内部关系稀少，向外发出关系有限。'),L('No outgoing ties; receives modeled attraction from other blocks.','没有发出关系，接收来自其他板块的模型吸引力。')],roles=[L('Primary Member','首属人'),L('Broker','经纪人'),L('Isolate','孤立者'),L('Sycophant','谄媚人')];
  $('blocks-list').innerHTML=[1,2,3,4].map(g=>{const n=d.blocks.sizes[g-1],outside=n*(26-n),out=d.blocks.counts[g-1].reduce((s,v,j)=>s+(j!==g-1?v:0),0),inc=d.blocks.counts.reduce((s,row,i)=>s+(i!==g-1?row[g-1]:0),0),inside=M.block(d,g,g);return `<article class="sna-block-card sna-group-${g}" data-group="${g}" tabindex="0"><div><h3>${roles[g-1]}</h3><span>n = ${n}</span></div><p>${descriptions[g-1]}</p><dl>${metric(L('Internal','内部'),pct(inside.density))}${metric(L('Outgoing','发出'),pct(out/outside))}${metric(L('Incoming','接收'),pct(inc/outside))}</dl><p class="sna-small">${L('Members','成员')}: ${d.nodes.filter(n=>n.group===g).map(n=>n.code).join(' · ')}</p></article>`;}).join('');
  for(const el of $('blocks-list').querySelectorAll('[data-group]')){const focus=()=>graphs.block.update({color:'groups',group:Number(el.dataset.group)}),clear=()=>graphs.block.update({color:'groups'});el.addEventListener('pointerenter',focus);el.addEventListener('focus',focus);el.addEventListener('pointerleave',clear);el.addEventListener('blur',clear);el.addEventListener('click',focus);}

 }
 function bars(){const value=n=>n.brokerage?n.brokerage.gatekeeper+n.brokerage.liaison:0,sorted=d.nodes.filter(n=>value(n)>0).sort((a,b)=>value(b)-value(a)||a.id-b.id),max=Math.max(1,...d.nodes.flatMap(n=>n.brokerage?[n.brokerage.gatekeeper,n.brokerage.liaison]:[]));
  $('broker-bars').innerHTML=`<div class="sna-bar-scale"><span>${max}</span><span>0</span><span>${max}</span></div>`+sorted.map(n=>{const b=n.brokerage;return `<button type="button" class="sna-bar-row" data-school="${n.id}" aria-label="${esc(name(n.id))}: Gatekeeper ${b?b.gatekeeper:L('missing','缺失')}, Liaison ${b?b.liaison:L('missing','缺失')}"><span class="sna-bar-left"><i style="width:${b?b.gatekeeper/max*100:0}%"></i><small>${b?b.gatekeeper:'—'}</small></span><span class="sna-bar-name">${esc(name(n.id))}</span><span class="sna-bar-right"><i style="width:${b?b.liaison/max*100:0}%"></i><small>${b?b.liaison:'—'}</small></span></button>`;}).join('');
  for(const el of $('broker-bars').querySelectorAll('[data-school]')){const show=()=>{const id=Number(el.dataset.school);graphs.broker.update({color:'brokerage',selected:id});inspect(id,'broker');};el.addEventListener('pointerenter',show);el.addEventListener('focus',show);el.addEventListener('click',show);el.addEventListener('pointerleave',()=>graphs.broker.update({color:'brokerage'}));el.addEventListener('blur',()=>graphs.broker.update({color:'brokerage'}));}
 }
 function bindTerms(){
  const all=[...app.querySelectorAll('[data-term]')],symbols=[...app.querySelectorAll('.sna-symbol')];
  const clear=()=>{all.forEach(t=>t.classList.remove('is-linked'));symbols.forEach(s=>{s.classList.remove('is-open');s.querySelector('button').setAttribute('aria-expanded','false');});};
  const show=el=>{clear();all.filter(t=>t.dataset.term===el.dataset.term).forEach(t=>t.classList.add('is-linked'));const symbol=symbols.find(s=>s.querySelector('button').dataset.term===el.dataset.term);if(symbol){symbol.classList.add('is-open');symbol.querySelector('button').setAttribute('aria-expanded','true');}};
  for(const el of all){el.addEventListener('pointerenter',()=>show(el));el.addEventListener('focus',()=>show(el));el.addEventListener('click',()=>show(el));el.addEventListener('pointerleave',clear);el.addEventListener('blur',clear);}
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-term]'))clear();});document.addEventListener('keydown',e=>{if(e.key==='Escape')clear();});
 }
 async function load(){if(loading)return;loading=true;$('retry').hidden=true;const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);
  try{if(!M||!N)throw Error('Missing module');const responses=await Promise.all(['/lab/sna/data.json','/lab/sna/presentation.json'].map(p=>fetch(p,{signal:abort.signal})));if(responses.some(r=>!r.ok))throw Error('Unavailable');const [raw,presentation]=await Promise.all(responses.map(r=>r.json()));d=M.valid(raw);const positions=presentation.layout.positions;if(positions.length!==26||positions.some(p=>p.length!==2||!p.every(Number.isFinite)))throw Error('Invalid source coordinates');d.nodes.forEach((n,i)=>n.position=positions[i]);
   for(const key of ['core','block','broker']){graphs[key]=N.network($(key+'-network'),d,id=>inspect(id,key),lang);graphs[key].update({color:key==='block'?'groups':key==='broker'?'brokerage':'core'});}graphs.core.coreBoundary();matrix();core();blocks();bars();bindTerms();inspect(0,'broker');
   const sync=()=>{const a=document.querySelector('.lab-language');if(a)a.href=(lang==='en'?'/zh':'')+'/lab/projects/sna/'+(['#gravity','#core','#blocks','#microscope'].includes(location.hash)?location.hash:'');};window.addEventListener('hashchange',sync);sync();app.dataset.ready='true';
  }catch(e){$('load-message').hidden=false;$('load-status').textContent=L('Research data could not load or validate. Please retry.','研究数据未能加载或通过校验，请重试。');$('retry').hidden=false;}finally{clearTimeout(timer);loading=false;}}
 $('retry').addEventListener('click',()=>location.reload());load();
})();
