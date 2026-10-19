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
