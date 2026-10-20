import {performance} from 'node:perf_hooks';
import {FullWorld} from './world-v3.mjs';
const profiles=[{id:'player1',name:'הדר',hero:'luzo',gear:{}},{id:'player2',name:'חבר',hero:'tzippy',gear:{}}];
let samples=[];
for(const mode of ['normal','hard']){
 const w=new FullWorld(profiles,mode,42);
 w.input('player1',{run:true});w.input('player2',{run:true});
 const start=performance.now();
 let biggest=0,count=0;
 for(let tick=0;tick<800;tick++){
  w.step(1/60);
  if(tick%3===0){
   const size=Buffer.byteLength(JSON.stringify(w.snapshot()),'utf8');
   if(size>biggest)biggest=size;
  }
  count++;if(w.outcome)break;
 }
 const elapsed=performance.now()-start;
 const result={mode,steps:count,avgMsPerStep:+(elapsed/count).toFixed(3),snapBytesMax:biggest,outcome:w.outcome?.reason||'still-running'};
 samples.push(result);
}
console.log('KOZIN_SERVER_PERF '+JSON.stringify(samples));

const benchWorld=new FullWorld(profiles,'normal',1049);
benchWorld.input('player1',{run:true});benchWorld.input('player2',{run:true});
for(let i=0;i<110;i++)benchWorld.step(1/60);
const count=160;
const bench=fn=>{const t=performance.now();for(let i=0;i<count;i++)JSON.stringify(fn());return +(performance.now()-t).toFixed(2);};
for(let i=0;i<12;i++){JSON.stringify(benchWorld.snapshot());JSON.stringify(benchWorld.snapshot(false));}
const copyAndEncode=bench(()=>benchWorld.snapshot());
const singleEncode=bench(()=>benchWorld.snapshot(false));
console.log('KOZIN_SNAPSHOT_ENCODING '+JSON.stringify({count,previousMs:copyAndEncode,singlePassMs:singleEncode,speedup: +(copyAndEncode/Math.max(.001,singleEncode)).toFixed(2)}));
