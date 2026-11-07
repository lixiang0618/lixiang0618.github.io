/* Deterministic teaching kinematics, NOT measured human/phone sensor data.
   World-aligned axes: x forward, y lateral, z up. Readout az = dvz/dt + g.
   vx/vy/vz are linear velocities, never gyroscope angular rates. */
(function(root){'use strict';
const G=9.81,IDS=['sitting','walking','pushups','squats','frog','running'];
function random(seed){let n=seed>>>0;return ()=>{n=(n+0x6D2B79F5)>>>0;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const smooth=u=>{u=Math.max(0,Math.min(1,u));return u*u*u*(10+u*(-15+6*u));};
function hermite(t,T,p0,v0,a0,p1,v1,a1){const s=Math.max(0,Math.min(1,t/T)),s2=s*s,s3=s2*s,s4=s3*s,s5=s4*s;return p0*(1-10*s3+15*s4-6*s5)+v0*T*(s-6*s3+8*s4-3*s5)+a0*T*T*.5*(s2-3*s3+3*s4-s5)+p1*(10*s3-15*s4+6*s5)+v1*T*(-4*s3+7*s4-3*s5)+a1*T*T*.5*(s3-2*s4+s5);}
function template(u,points){for(let j=1;j<points.length;j++)if(u<=points[j][0]){const [a,x]=points[j-1],[b,y]=points[j];return x+(y-x)*smooth((u-a)/(b-a));}return points.at(-1)[1];}
function derivative(v,dt){return v.map((_,i)=>i===0?(v[1]-v[0])/dt:i===v.length-1?(v[i]-v[i-1])/dt:(v[i+1]-v[i-1])/(2*dt));}
function generate(id,{seed=20261106,seconds=16,hz=50}={}){if(!IDS.includes(id)||!Number.isInteger(seed)||!Number.isFinite(seconds)||seconds<4||seconds>60||!Number.isInteger(hz)||hz<25||hz>200)throw Error('Invalid synthetic signal configuration');
 const rng=random((seed^((IDS.indexOf(id)+1)*2654435761))>>>0),period={sitting:4,walking:.58,pushups:2.6,squats:3.2,frog:2.05,running:.37}[id],cycles=[];let end=0,forward=0;
 while(end<seconds+1){const T=period*(1+(rng()-.5)*(id==='sitting'?.08:.14)),amp=1+(rng()-.5)*.09,vx=1.4+(rng()-.5)*.14,flight=T*.24,dx=.5*vx*T*(.18+.13)+vx*flight;cycles.push({start:end,T,amp,forward,vx,phaseBias:rng()*.15});end+=T;if(id==='frog')forward+=dx;}
 // Slowly varying bounded posture drift, independent on each axis.
 const knots=Array.from({length:3},()=>Array.from({length:Math.ceil(seconds/2)+3},()=>rng()*2-1));const drift=(axis,t)=>{const k=Math.floor(t/2);return knots[axis][k]+(knots[axis][k+1]-knots[axis][k])*smooth(t/2-k);};
 const positions=[[],[],[]],time=[],phases=[],phaseNames=[],events=[];let ci=0,prev='';
 for(let i=0;i<=Math.round(seconds*hz);i++){const t=i/hz;while(ci<cycles.length-1&&t>=cycles[ci].start+cycles[ci].T)ci++;const c=cycles[ci],u=(t-c.start)/c.T,T=c.T,q=ci+u;let x=0,y=0,z=0,phase='posture';
  if(id==='sitting'){x=.002*drift(0,t);y=.0015*drift(1,t);z=.001*drift(2,t);}
  if(id==='walking'){x=1.25*t+c.amp*template(u,[[0,0],[.18,-.018],[.62,.014],[1,0]]);y=.022*Math.sin(Math.PI*q+.4)+.002*drift(1,t);z=c.amp*template(u,[[0,0],[.12,-.006],[.48,.035],[.78,.014],[1,0]]);phase=u<.12?'heel-strike':u<.5?'stance':u<.78?'push':'swing';}
  if(id==='pushups'){z=c.amp*template(u,[[0,0],[.45,-.18],[.53,-.18],[.85,0],[1,0]]);x=template(u,[[0,0],[.4,.012],[.6,.007],[.86,0],[1,0]]);y=.0025*drift(1,t);phase=u<.45?'lower':u<.53?'hold':u<.85?'push':'recovery';}
  if(id==='squats'){z=c.amp*template(u,[[0,0],[.33,-.45],[.50,-.45],[.90,0],[1,0]]);x=template(u,[[0,0],[.28,-.07],[.52,-.06],[.88,0],[1,0]]);y=.008*Math.sin(2*Math.PI*.23*t+.8)+.002*drift(1,t);phase=u<.33?'lower':u<.5?'hold':u<.9?'rise':'recovery';}
  if(id==='running'){
   const flight=T*.45,support=T-flight,v=G*flight/2,s=t-c.start;phase=s<support*.45?'landing':s<support?'push':'flight';
   if(s<support*.45)z=hermite(s,support*.45,0,-v,-G,-.04*c.amp,0,0);
   else if(s<support)z=hermite(s-support*.45,support*.55,-.04*c.amp,0,0,0,v,-G);
   else {const f=s-support;z=v*f-.5*G*f*f;}
   x=2.8*t+(s<support?template(s/support,[[0,0],[.3,-.012],[.65,.009],[1,0]]):0);y=.025*Math.sin(Math.PI*q+.25)+.002*drift(1,t);
  }
  if(id==='frog'){
   const load=T*.25,push=T*.18,flight=T*.24,land=T*.13,recover=T*.20,s=t-c.start,v=G*flight/2;
   if(s<load){z=-.32*c.amp*smooth(s/load);x=c.forward;phase='crouch';}
   else if(s<load+push){z=hermite(s-load,push,-.32*c.amp,0,0,0,v,-G);x=c.forward+hermite(s-load,push,0,0,0,.5*c.vx*push,c.vx,0);phase='takeoff';}
   else if(s<load+push+flight){const f=s-load-push;z=v*f-.5*G*f*f;x=c.forward+.5*c.vx*push+c.vx*f;phase='flight';}
   else if(s<load+push+flight+land){const f=s-load-push-flight;z=hermite(f,land,0,-v,-G,-.15*c.amp,0,0);x=c.forward+.5*c.vx*push+c.vx*flight+hermite(f,land,0,c.vx,0,.5*c.vx*land,0,0);phase='landing';}
   else {const f=s-load-push-flight-land;z=-.15*c.amp*(1-smooth(f/recover));x=c.forward+.5*c.vx*(push+land)+c.vx*flight;phase='recovery';}
   y=.018*Math.sin(2*Math.PI*q+.7)*Math.sin(Math.PI*u)**2+.002*drift(1,t);
  }
  positions[0].push(x);positions[1].push(y);positions[2].push(z);time.push(t);phases.push(phase);if(phase!==prev){events.push({time:t,phase});prev=phase;}if(!phaseNames.includes(phase))phaseNames.push(phase);
 }
 const velocity=positions.map(a=>derivative(a,1/hz)),linear=velocity.map(a=>derivative(a,1/hz)),noiseRng=random(seed^0xA41C3D27),accel=linear.map((a,k)=>a.map(v=>v+(k===2?G:0)+(noiseRng()+noiseRng()+noiseRng()-1.5)*.035));
 const channels=[...accel,...velocity];return {id,seed,hz,dt:1/hz,seconds,time,channels,positions,phases,events,phaseNames,labels:['ax','ay','az','vx','vy','vz'],units:['m/s²','m/s²','m/s²','m/s','m/s','m/s']};
}
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length,rms=a=>Math.sqrt(mean(a.map(x=>x*x))),range=a=>Math.max(...a)-Math.min(...a);
function features(signal){const {channels:c,dt}=signal;if(!c||c.length!==6||!Number.isFinite(dt)||dt<=0||!c.every(a=>a.length===c[0].length&&a.length>50&&a.every(Number.isFinite)))throw Error('Invalid six-channel input');const n=c[0].length,z=[];let p=0;for(let i=0;i<n;i++){p+=c[5][i]*dt;z.push(p);}const az=c[2].map(x=>x-G);let peaks=0,last=-Infinity;for(let i=2;i<n-2;i++)if(az[i]>2&&az[i]>az[i-1]&&az[i]>=az[i+1]&&i-last>.2/dt){peaks++;last=i;}
 return {meanForward:mean(c[3]),verticalRMS:rms(c[5]),excursion:range(z),impact:Math.max(...c[2]),dynamicRMS:rms(az),flightFraction:c[2].filter(x=>Math.abs(x)<1.2).length/n,peaksPerSecond:peaks/(n*dt)};
}
function softmax(z){if(z.length!==6||!z.every(Number.isFinite))throw Error('Need six finite logits');const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s);}
function classify(signal){const f=features(signal),v=f.meanForward,h=f.excursion,free=f.flightFraction;
 // Explicit hand-designed rules over measured features of the synthetic arrays.
 const logits=[5-18*f.verticalRMS-3*f.dynamicRMS-4*Math.abs(v),5-4*Math.abs(v-1.25)-8*Math.abs(h-.041)-4*free,5-6*Math.abs(h-.18)-7*Math.abs(v)-8*free,5-5*Math.abs(h-.45)-7*Math.abs(v)-8*free,5-4*Math.abs(h-.6)-2*Math.abs(v-.65)+5*free-2*Math.abs(f.verticalRMS-.9),5-3*Math.abs(v-2.8)-5*Math.abs(h-.08)+4*free];
 const scores=softmax(logits),index=scores.indexOf(Math.max(...scores));return {features:f,logits,scores,predicted:IDS[index]};
}
function convolution(signal){const a=signal.channels[2].map(x=>x-G),kernel=[-.5,0,.5],conv=[];for(let i=1;i<a.length-1;i++)conv.push(a[i-1]*kernel[0]+a[i]*kernel[1]+a[i+1]*kernel[2]);const pooled=[];for(let i=0;i<conv.length-3;i+=4)pooled.push(Math.max(...conv.slice(i,i+4)));return {kernel,conv,pooled};}
const api={G,IDS,generate,derivative,features,softmax,classify,convolution,hermite};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WellifeMotion=api;
})(typeof window!=='undefined'?window:globalThis);
