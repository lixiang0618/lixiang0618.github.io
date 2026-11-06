/* UI controller: no backend. Model, worker, visualization and state are separate. */
(() => {'use strict';
 const C=window.WarehouseCore,V=window.WarehouseVisual,app=document.getElementById('warehouse-app');if(!app||!C||!V)return;
 const lang=document.documentElement.lang.startsWith('zh')?'zh':'en',L=(en,zh)=>lang==='zh'?zh:en,$=id=>document.getElementById('wh-'+id),form=$('config');
 const num=(v,p=3)=>Number(v).toLocaleString(lang==='zh'?'zh-CN':'en-US',{maximumFractionDigits:p,minimumFractionDigits:p});
 const sec=v=>num(v)+' s';let current=null,q=null,parts=null,stage=0,view=null,worker=null,runId=0,revision=0,result=null,resultConfig=null,rng=C.random(12345),frame=0,replaying=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const stageTitles=[L('Ready to store','准备存储'),L('Store the item','存入货物'),L('Storage complete · reveal retrieval','存储完成 · 揭示取货'),L('Retrieve the item','取出货物'),L('Return to I/O · DC complete','返回 I/O · DC 完成')];
 const status=message=>{$('status').textContent=message;};
 function read(){
  const o={};let valid=true;
  for(const el of form.elements){if(!el.name)continue;const ok=el.checkValidity();el.setAttribute('aria-invalid',String(!ok));if(!ok)valid=false;o[el.name]=el.type==='number'||el.name==='samples'?Number(el.value):el.value;}
  if(!valid)throw Error(L('Use positive dimensions and speeds within the displayed ranges; tiers, bays and seed must be integers.','请填写范围内的正尺寸和速度；层数、列数与种子必须为整数。'));
  if(!Number.isInteger(o.seed)||o.seed<0||o.seed>4294967295)throw Error(L('Seed must be an integer from 0 to 4,294,967,295.','种子须为 0～4,294,967,295 的整数。'));
  const {samples,seed,...input}=o;return {input:C.config(input),n:samples,seed};
 }
 function stopReplay(){replaying=false;cancelAnimationFrame(frame);$('replay').textContent=L('Replay','重播');}
 function stopWorker(){if(worker){worker.terminate();worker=null;}runId++;$('cancel').hidden=true;$('progress').hidden=true;$('run').disabled=!current;}
 function markOld(){if(!result)return;$('results').classList.add('wh-outdated');$('result-config').textContent=L('Outdated result — configuration changed. Run again. Previous run: ','结果已过期——参数已修改，请重新运行。上次运行：')+describe(resultConfig);$('interpretation').innerHTML=`<h3>${L('Result interpretation','结果解读')}</h3><p>${L('The displayed values and curve belong to the previous configuration. Run again before interpreting them.','当前数值与曲线属于上次配置，请重新运行后再解读。')}</p>`;}
 function describe(c){return `${c.input.tiers} × ${c.input.bays} · ${c.input.cell_width} × ${c.input.cell_height} m · vₕ ${c.input.horizontal_speed}, vᵥ ${c.input.vertical_speed} m/s · ${c.input.coordinate_mode} · N=${c.n} · seed=${c.seed}`;}
 function change(){
  revision++;stopReplay();const wasRunning=!!worker;if(wasRunning)stopWorker();markOld();
  try{current=read();$('validation').textContent='';$('run').disabled=false;for(const b of app.querySelectorAll('[data-task],#wh-prev,#wh-next,#wh-replay'))b.disabled=false;
   const c=current.input;$('length').textContent=num(c.length,2)+' m';$('height').textContent=num(c.height,2)+' m';$('shape').textContent=num(c.b,6);$('capacity').textContent=(c.tiers*c.bays).toLocaleString();
   rng=C.random((current.seed^0x9e3779b9)>>>0);newTask('random');status(result?L('Parameters modified. Run a new simulation.','参数已修改，请重新运行。'):wasRunning?L('Previous run cancelled because parameters changed. Ready for a new run.','参数变更已取消上次运行，可以重新运行。'):L('Ready when you are. Run to see results.','准备就绪，运行后查看结果。'));
  }catch(error){current=null;$('validation').textContent=error.message;$('run').disabled=true;for(const b of app.querySelectorAll('[data-task],#wh-prev,#wh-next,#wh-replay'))b.disabled=true;status(L('Correct the highlighted inputs to continue. The drawing retains the last valid geometry.','请修正标记的输入。图形暂保留上次有效几何。'));}
 }
 function newTask(kind){if(!current)return;stopReplay();const c=current.input;q=C.task(c,rng);
  if(kind==='same')q.retrieval_tier=q.storage_tier;
  if(kind==='different'){if(c.tiers<2)return;q.retrieval_tier=(q.storage_tier+1+C.integer(rng,c.tiers-1))%c.tiers;}
  parts=C.breakdown(c,q);stage=0;renderCycle();
 }
 function moveResources(f){if(!view)return;const p=view.position(f);for(const [name,pos] of Object.entries(p))document.getElementById('wh-'+name+'-marker')?.setAttribute('transform',`translate(${pos[0]},${pos[1]})`);
  let t=0;if(stage===1)t=parts.storage*f;if(stage===2)t=parts.storage;if(stage===3)t=parts.storage+parts.retrieval*f;if(stage===4)t=parts.storage+parts.retrieval+parts.final*f;
  $('clock').textContent=L('Physical DC clock: ','物理 DC 计时：')+sec(t)+(stage===4&&f===1?' · '+L('Complete','完成'):'');
 }
 function renderCycle(){if(!current||!parts)return;const c=current.input,d=parts;
  view=V.scene(c,q,d,stage,lang);$('scene').innerHTML=view.html;moveResources(stage===0?0:1);
  $('stage-index').textContent=`${String(stage+1).padStart(2,'0')} / 05`;$('stage-title').textContent=stageTitles[stage];
  const texts=[L('The storage cell is known. Retrieval remains hidden until storage completes.','存储货位已知，取货位置将在存储完成后揭示。'),L('VP rises to the storage tier, then HP travels to the storage bay. Zero transfer time.','VP 上升至存储层，随后 HP 移至存储列；交接时间为零。'),L('Storage has completed. The retrieval cell is now revealed.','存储已完成，现在揭示取货货位。'),d.same?L('On the same tier, HP moves from storage to retrieval, then returns to the VP.','同层：HP 从存储位移至取货位，再返回 VP。'):L('VP changes tier while the retrieval-tier HP makes its round trip. Both start together; the faster waits.','异层：VP 移层与取货层 HP 往返同时开始；较快的一方等待。'),L('VP returns the retrieved item to I/O. The DC ends here; no additional return-to-idle delay.','VP 将取出的货物送回 I/O。DC 至此结束，不额外计算回到空闲点的延迟。')];
  $('stage-text').textContent=texts[stage];$('task-label').textContent=`S: ${L('tier','层')} ${q.storage_tier+1}, ${L('bay','列')} ${q.storage_bay+1} · R: `+(stage>=2?`${L('tier','层')} ${q.retrieval_tier+1}, ${L('bay','列')} ${q.retrieval_bay+1}`:L('revealed after storage','存储完成后揭示'));
  $('prev').disabled=stage===0;$('next').disabled=stage===4;app.querySelector('[data-task="different"]').disabled=c.tiers<2;
  const entries=[[L('Storage · Y₁ + X₁','存储 · Y₁ + X₁'),sec(d.storage)],[L('Retrieval movement','取货移动'),stage>=2?sec(d.retrieval):'—'],[L('Final VP return','VP 最终返回'),stage>=2?sec(d.final):'—'],[L('Individual DC time','单次 DC 总时间'),stage>=2?sec(d.total):'—']];
  $('breakdown').innerHTML=`<dl class="wh-breakdown">${entries.map(([title,value])=>`<div><dt>${title}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
  $('timeline').innerHTML='';if(stage>=2)timeline(d);
 }
 function timeline(d){if(d.same){$('timeline').innerHTML=`<div class="wh-timeline"><h3>${L('Same tier · sequential motion','同层 · 顺序运动')}</h3><p>HP: |X₁−X₂| = ${sec(Math.abs(d.x1-d.x2))} → X₂ = ${sec(d.x2)} → VP: Y₁ = ${sec(d.final)}</p></div>`;return;}
  const total=d.retrieval+d.final,pct=v=>(total===0?0:100*v/total).toFixed(5)+'%';
  const row=(name,motion,wait)=>`<div class="wh-track"><span>${name}: ${sec(motion)}</span><div class="wh-track-line"><i class="wh-track-bar" style="width:${pct(motion)}"></i><i class="wh-track-wait" style="width:${pct(wait)}"></i><i class="wh-track-final" style="width:${pct(d.final)}"></i></div></div>`;
  $('timeline').innerHTML=`<div class="wh-timeline"><h3>${L('Parallel start → wait for both → final return','同时开始 → 等待双方就绪 → 最终返回')}</h3>${row('VP |Y₁−Y₂|',d.vp,d.waitVP)}${row('HP 2X₂',d.hp,d.waitHP)}<p>${L('Dashed outline = waiting; orange segment = final VP return.','虚线框＝等待；橙色段＝VP 最终返回。')} VP ${L('waits','等待')} ${sec(d.waitVP)} · HP ${L('waits','等待')} ${sec(d.waitHP)}</p><p>max(${sec(d.vp)}, ${sec(d.hp)}) + ${sec(d.final)} = ${sec(d.retrieval+d.final)}</p></div>`;
 }
 function replay(){if(replaying){stopReplay();return;}if(!current)return;replaying=true;stage=0;renderCycle();$('replay').textContent=L('Stop replay','停止重播');let start=performance.now();
  const tick=now=>{if(!replaying)return;const duration=stage===0?400:stage===2?1000:1800,f=Math.min(1,(now-start)/duration);moveResources(reduced.matches?1:f);
   if(f>=1){if(stage===4){stopReplay();return;}stage++;renderCycle();start=now;}frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
 }
 function clearResults(){result=null;resultConfig=null;$('results').classList.remove('wh-outdated');for(const key of ['theory','mean','relative','absolute','ci','count'])$('result-'+key).textContent='—';$('result-config').textContent='';$('chart').innerHTML=`<p class="wh-empty">${L('Computing this run…','正在计算本次运行…')}</p>`;$('tooltip').textContent='';$('interpretation').innerHTML=`<h3>${L('Result interpretation','结果解读')}</h3><p>${L('Waiting for this run to complete.','等待本次运行完成。')}</p>`;}
 function fail(){stopWorker();status(L('Simulation could not complete. Try again, or check whether this browser allows Web Workers.','仿真未能完成。请重试，或确认浏览器允许 Web Worker。'));$('chart').innerHTML=`<p class="wh-empty">${L('No completed results. Retry the simulation.','尚无完整结果，请重新运行。')}</p>`;}
 function run(){if(worker)return;try{current=read();}catch{change();return;}if(typeof Worker==='undefined'){fail();return;}
  clearResults();const snapshot=structuredClone(current),version=revision,id=++runId;status(L('Running in a Web Worker…','正在 Web Worker 中计算…'));$('run').disabled=true;$('cancel').hidden=false;$('progress').hidden=false;$('progress').value=0;
  try{worker=new Worker('/lab/warehouse/worker.js');worker.onerror=event=>{event.preventDefault();if(id===runId)fail();};worker.onmessage=({data})=>{if(data.id!==runId||version!==revision)return;
   if(data.type==='progress'){$('progress').value=data.done/data.n;status(L('Running: ','计算中：')+Math.round(100*data.done/data.n)+'%');}
   if(data.type==='error')fail();
   if(data.type==='complete'){stopWorker();result=data.result;resultConfig=snapshot;showResults();status(L('Completed. All results are from this browser run.','已完成，全部结果来自本次浏览器计算。'));}
  };worker.postMessage({id,input:snapshot.input,n:snapshot.n,seed:snapshot.seed});}catch{fail();}
 }
 function showResults(){const m=result.metrics;$('result-theory').textContent=sec(m.theory_s);$('result-mean').textContent=sec(m.simulation_mean_s);$('result-relative').textContent=m.relative_gap_pct===null?L('Undefined','未定义'):num(m.relative_gap_pct)+'%';$('result-absolute').textContent=sec(m.absolute_gap_s);$('result-ci').textContent=`[${num(m.ci95_low_s)}, ${num(m.ci95_high_s)}] s`;$('result-count').textContent=m.n_samples.toLocaleString();$('result-config').textContent=L('This run: ','本次配置：')+describe(resultConfig);drawChart();interpret();}
 function drawChart(){const plot=V.chart(result.points,lang);$('chart').innerHTML=plot.html;const slider=$('checkpoint'),svg=$('chart').querySelector('svg');
  const inspect=i=>{const p=result.points[i];slider.value=i;const cursor=$('chart-cursor');cursor.setAttribute('x1',plot.X(p.n_samples));cursor.setAttribute('x2',plot.X(p.n_samples));cursor.setAttribute('visibility','visible');$('tooltip').textContent=`N=${p.n_samples.toLocaleString()} · ${L('Mean','均值')} ${sec(p.simulation_mean_s)} · ${L('Theory','解析')} ${sec(p.theory_s)} · ${L('Absolute gap','绝对差值')} ${sec(p.absolute_gap_s)} · ${L('Relative gap','相对差值')} ${p.relative_gap_pct===null?'—':num(p.relative_gap_pct)+'%'} · 95% CI [${num(p.ci95_low_s)}, ${num(p.ci95_high_s)}] s`;};
  slider.addEventListener('input',()=>inspect(Number(slider.value)));svg.addEventListener('pointermove',event=>{const box=svg.getBoundingClientRect();inspect(plot.nearest((event.clientX-box.left)/box.width));});inspect(result.points.length-1);
 }
 function interpret(){const m=result.metrics,half=(m.ci95_high_s-m.ci95_low_s)/2;const at100=result.points.find(p=>p.n_samples>=100),earlier=at100&&at100.n_samples<m.n_samples?at100:null;
  $('interpretation').innerHTML=`<h3>${L('Result interpretation','结果解读')}</h3><p><strong>${L('Precision','估计精度')}</strong> · ${L('The final 95% interval has half-width','最终 95% 区间半宽为')} ${sec(half)} ${L('across','，基于')} ${m.n_samples.toLocaleString()} ${L('independent cycles. This measures sampling precision, not proof of convergence.','个独立周期；这衡量抽样精度，不是收敛证明。')}</p><p><strong>${L('Model agreement','模型差异')}</strong> · ${L('Absolute gap','绝对差值')} ${sec(m.absolute_gap_s)}; ${L('relative gap','相对差值')} ${m.relative_gap_pct===null?'—':num(m.relative_gap_pct)+'%'}。${L('A stable difference can reflect the continuous approximation versus discrete cells.','连续近似与离散货位可能产生稳定差值。')}</p><p><strong>${L('Operational meaning','运行含义')}</strong> · ${L('Lower mean DC time means shorter average cycles under these assumptions. This single run does not establish a globally optimal warehouse; smaller Gap does not mean faster operation.','在模型假设下，均值越低代表平均周期越短。本次单一配置不能证明全局最优；更小 Gap 不代表运行更快。')}</p><details><summary>${L('Precision details','精度详情')}</summary><p>SE = ${sec(m.standard_error_s)}. ${earlier?L('At N=','在 N=')+earlier.n_samples+L(', the interval half-width was ',' 时，区间半宽为 ')+sec((earlier.ci95_high_s-earlier.ci95_low_s)/2)+L('; the final value is ','；最终为 ')+sec(half)+'.':''} ${L('For a fixed population variance, Monte Carlo standard error scales as 1/√N. The observed sample variance also changes. No universal good/bad threshold is used.','固定总体方差下，Monte Carlo 标准误按 1/√N 缩小；样本方差本身也会变化。这里没有通用的好坏阈值。')}</p><p>${L('Normal-approximation intervals are pointwise, not a simultaneous band. They do not quantify uncertainty in the analytical formula.','正态近似区间为逐点区间，并非同时置信带，也不衡量解析公式的不确定性。')}</p></details>`;
 }
 form.addEventListener('submit',event=>event.preventDefault());form.addEventListener('input',change);
 for(const b of app.querySelectorAll('[data-task]'))b.addEventListener('click',()=>newTask(b.dataset.task));$('prev').addEventListener('click',()=>{stopReplay();stage=Math.max(0,stage-1);renderCycle();});$('next').addEventListener('click',()=>{stopReplay();stage=Math.min(4,stage+1);renderCycle();});$('replay').addEventListener('click',replay);$('run').addEventListener('click',run);$('cancel').addEventListener('click',()=>{stopWorker();status(L('Cancelled. No completed results; you can run again.','已取消，未产生完整结果，可以重新运行。'));$('chart').innerHTML=`<p class="wh-empty">${L('Simulation cancelled.','仿真已取消。')}</p>`;});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopReplay();});window.addEventListener('pagehide',()=>{stopReplay();stopWorker();});change();
})();
