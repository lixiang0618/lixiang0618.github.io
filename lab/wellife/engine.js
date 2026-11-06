/* Pure arithmetic and versioned local-only daily log. No health inference. */
(function(root){'use strict';
const KEYS=['energy','carbs','protein','fat','sugar','water'];
const finite=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
function energy(met,kg,minutes){if(!finite(met,1,30)||!finite(kg,20,350)||!finite(minutes,1,1440))throw new RangeError('Invalid activity inputs');return {gross:met*3.5*kg*minutes/200,active:(met-1)*3.5*kg*minutes/200};}
function fuel(gross,ratios){if(!finite(gross,0,1e7)||!Array.isArray(ratios)||ratios.length!==3||ratios.some(x=>!finite(x,0,100))||ratios.reduce((a,b)=>a+b,0)<=0)throw new RangeError('Invalid fuel mix');const total=ratios.reduce((a,b)=>a+b,0),normalized=ratios.map(x=>x/total);return {ratios:normalized,grams:normalized.map((x,i)=>gross*x/[4,9,4][i])};}
function portion(food,grams){if(!finite(grams,1,5000))throw new RangeError('Invalid portion');return Object.fromEntries(KEYS.map(k=>[k,food.per100g[k]==null?null:food.per100g[k]*grams/100]));}
function localDate(date=new Date()){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
function validEntry(e){return e&&typeof e.id==='string'&&e.id.length<100&&/^\d{4}-\d{2}-\d{2}$/.test(e.day)&&finite(e.created,0,1e15)&&((e.type==='food'&&typeof e.food==='string'&&finite(e.grams,1,5000))||(e.type==='motion'&&typeof e.activity==='string'&&finite(e.met,1,30)&&finite(e.kg,20,350)&&finite(e.minutes,1,1440)));}
function summarize(entries,foods){const sums=Object.fromEntries(KEYS.map(k=>[k,{value:0,unknown:0}]));let active=0,gross=0;for(const e of entries){if(e.type==='food'){const food=foods.find(f=>f.id===e.food);if(!food){for(const k of KEYS)sums[k].unknown++;continue;}const p=portion(food,e.grams);for(const k of KEYS){if(p[k]==null)sums[k].unknown++;else sums[k].value+=p[k];}}else {const n=energy(e.met,e.kg,e.minutes);active+=n.active;gross+=n.gross;}}return {nutrients:sums,active,gross,difference:sums.energy.unknown?null:sums.energy.value-active};}
class Store{constructor(storage){this.storage=storage;this.entries=[];this.error=false;try{const raw=storage.getItem('wellife.daily.v1');if(raw){const d=JSON.parse(raw);if(d.version!==1||!Array.isArray(d.entries)||!d.entries.every(validEntry)||new Set(d.entries.map(e=>e.id)).size!==d.entries.length)throw Error('Invalid saved log');this.entries=d.entries;}}catch(_){this.error=true;}}
 save(){try{this.storage.setItem('wellife.daily.v1',JSON.stringify({version:1,entries:this.entries}));this.error=false;}catch(_){this.error=true;}return !this.error;}
 put(e){if(!validEntry(e))throw new RangeError('Invalid record');const i=this.entries.findIndex(x=>x.id===e.id);if(i<0)this.entries.push({...e});else this.entries[i]={...e};this.save();}
 remove(id){this.entries=this.entries.filter(e=>e.id!==id);this.save();}
 clear(day){this.entries=this.entries.filter(e=>e.day!==day);this.save();}
 day(day){return this.entries.filter(e=>e.day===day).sort((a,b)=>a.created-b.created);}}
const api={KEYS,energy,fuel,portion,localDate,summarize,Store};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WellifeEngine=api;
})(typeof window!=='undefined'?window:globalThis);
