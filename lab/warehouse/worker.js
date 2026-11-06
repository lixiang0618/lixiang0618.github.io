'use strict';
importScripts('./core.js');
self.onmessage=({data})=>{try{
 const {id,input,n,seed}=data;if(!Number.isSafeInteger(n)||n<2||n>1000000)throw Error('Sample count outside supported range');
 const C=self.WarehouseCore,c=C.config(input),theory=C.theory(c),rng=C.random(seed),s=C.stats(),cp=C.checkpoints(n),points=[];let next=0;
 for(let i=1;i<=n;i++){
  const q=C.task(c,rng);C.add(s,C.taskTime(c,q),q.storage_tier===q.retrieval_tier);
  if(i===cp[next]){points.push(C.metrics(theory,s));next++;}
  if(i%10000===0)self.postMessage({id,type:'progress',done:i,n});
 }
 self.postMessage({id,type:'complete',result:{metrics:C.metrics(theory,s),points}});
}catch(error){self.postMessage({id:data.id,type:'error',message:error.message});}};
