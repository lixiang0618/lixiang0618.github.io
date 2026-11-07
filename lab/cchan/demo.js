/* Entirely fictional. Scores are authored examples, NOT CCHAN/HAN inference. */
(function(root){'use strict';
const rows=[
[1,4600,.92,.72],[0,800,.86,.88],[1,950,.83,.94],[0,1400,.68,.77],[1,7200,.96,.61],[0,400,.33,.28],
[0,2100,.72,.82],[1,1800,.81,.86],[0,630,.27,.31],[0,1200,.59,.63],[1,380,.44,.75],[0,900,.23,.39],
[1,3200,.88,.70],[0,740,.55,.57],[0,2200,.39,.44],[1,650,.65,.80],[0,500,.20,.25],[0,1650,.76,.60],
[0,310,.12,.19],[1,5100,.90,.65],[0,1250,.48,.51],[0,470,.10,.15],[1,240,.36,.66],[0,3200,.61,.54]];
const data={kind:'fictional',version:1,models:[{id:'cost_demo',en:'CCHAN-inspired · fictional scores',zh:'CCHAN 风格 · 虚构评分'},{id:'han_demo',en:'HAN-inspired · fictional scores',zh:'HAN 风格 · 虚构评分'}],cases:rows.map(([y,cost,a,b],i)=>({id:'DEMO_'+String(i+1).padStart(3,'0'),y,cost,scores:{cost_demo:a,han_demo:b}}))};
if(typeof module!=='undefined'&&module.exports)module.exports=data;else root.CchanDemo=data;
})(typeof window!=='undefined'?window:globalThis);
