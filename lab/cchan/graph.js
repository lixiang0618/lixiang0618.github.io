/* Paper-based educational graph. No clinical data or trained model. */
(function(root){'use strict';
function records(rows){if(!Array.isArray(rows)||rows.length<1||rows.length>8)throw Error('Use 1–8 fictional records');return rows.map(r=>{for(const [k,prefix,max] of [['p','P',3],['h','H',2],['d','D',2]])if(!new RegExp('^'+prefix+'[1-'+max+']$').test(r[k]))throw Error('Unknown fictional entity');return {p:r.p,h:r.h,d:r.d};});}
function build(input){const rows=records(input),nodes=new Map(),edges=new Map(),adj=new Map();
 const node=(id,type,members=[])=>{if(!nodes.has(id))nodes.set(id,{id,type,members});return id;};
 const edge=(a,b,kind)=>{const key=[a,b].sort().join('|');if(!edges.has(key))edges.set(key,{a,b,kind});};
 for(const r of rows){for(const k of ['p','h','d'])node(r[k],k.toUpperCase());for(const [a,b] of [[r.p,r.h],[r.p,r.d],[r.h,r.d]]){edge(a,b,'basic');if(!adj.has(a))adj.set(a,new Set());if(!adj.has(b))adj.set(b,new Set());adj.get(a).add(b);adj.get(b).add(a);}}
 const couple=(a,b,type,targets)=>{const id=type+':'+a+'+'+b;node(id,type,[a,b]);for(const target of targets)edge(id,target,'coupling');};
 for(const r of rows)for(const [a,b,type,targetType] of [[r.p,r.h,'PH','D'],[r.p,r.d,'PD','H'],[r.h,r.d,'HD','P']])couple(a,b,type,[...adj.get(a)].filter(x=>x.startsWith(targetType)&&adj.get(b).has(x)));
 const ps=[...nodes.values()].filter(n=>n.type==='P').map(n=>n.id).sort();
 for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const common=[...adj.get(ps[i])].filter(x=>adj.get(ps[j]).has(x));if(common.length)couple(ps[i],ps[j],'PP',common);}
 return {nodes:[...nodes.values()].sort((a,b)=>a.id.localeCompare(b.id)),edges:[...edges.values()].sort((a,b)=>(a.a+a.b).localeCompare(b.a+b.b))};}
function stage(graph,step){return {nodes:graph.nodes.filter(n=>step>=4||step===3||step===2&&n.type!=='PP'||step===1&&n.type.length===1),edges:graph.edges.filter(e=>{const type=graph.nodes.find(n=>n.id===e.a)?.type;return step>=4||step===3||step===2&&type!=='PP'||step===1&&e.kind==='basic';})};}
const api={records,build,stage};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CchanGraph=api;
})(typeof window!=='undefined'?window:globalThis);
