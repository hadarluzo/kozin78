import WebSocket from 'ws';
import assert from 'node:assert/strict';
import {PROTOCOL} from './world-v3.mjs';
const url=process.argv[2]||'ws://127.0.0.1:9087/full-v3',wait=ms=>new Promise(r=>setTimeout(r,ms));
class Client{
 async open(){this.messages=[];this.seq=0;this.ws=new WebSocket(url,url.startsWith('wss:')?{headers:{Origin:'https://kozin78.vercel.app'}}:undefined);this.ws.on('message',v=>{const m=JSON.parse(v);this.messages.push(m);if(m.type==='snapshot')this.latest=m;if(m.type==='joined')this.id=m;});await new Promise((ok,no)=>{this.ws.once('open',ok);this.ws.once('error',no)});return this;}
 send(m){this.ws.send(JSON.stringify(m))}
 async until(fn,timeout=16000){const end=Date.now()+timeout;while(Date.now()<end){const m=this.messages.find(fn);if(m)return m;await wait(20);}throw Error('New hero socket timeout '+JSON.stringify(this.messages.slice(-1)));}
 input(run){if(this.ws.readyState===1)this.send({type:'input',seq:++this.seq,run,width:1000,height:620});}
 close(){this.ws.terminate();}
}
async function pair(hero,other){
 const a=await new Client().open(),b=await new Client().open();a.send({type:'create',protocol:PROTOCOL,hero,name:'בדיקת כוח א',difficulty:'normal',gear:{outfit:'dogs',fringe:'tekhelet'}});const joined=await a.until(m=>m.type==='joined');b.send({type:'join',protocol:PROTOCOL,code:joined.code,hero:other,name:'בדיקת כוח ב',gear:{outfit:'tech',head:'kippah'}});await b.until(m=>m.type==='joined');a.send({type:'ready',ready:true});b.send({type:'ready',ready:true});await a.until(m=>m.type==='snapshot'&&m.time>4.1);return [a,b];
}
{
 const [a,b]=await pair('bracha','fahima');try{
  for(const c of [a,b])c.send({type:'action',action:'power'});
  b.send({type:'action',action:'jump'});await wait(90);b.send({type:'action',action:'jump'});
  const active=await a.until(m=>m.type==='snapshot'&&m.players.some(p=>p.hero==='fahima'&&p.power.boostUsed));
  assert(active.players.some(p=>p.hero==='bracha'&&p.power.remaining>0));assert(active.players.every(p=>p.power.cooldown>49));
  await b.until(m=>m.type==='snapshot'&&m.tick===active.tick);const saved=b.id;b.close();await a.until(m=>m.type==='room'&&m.paused);await wait(120);const tick=a.latest.tick;await wait(200);assert.equal(a.latest.tick,tick);
  await b.open();b.send({type:'resume',protocol:PROTOCOL,code:saved.code,id:saved.id,token:saved.token});await b.until(m=>m.type==='joined');const resumed=await b.until(m=>m.type==='snapshot'&&m.tick>tick);const car=resumed.players.find(p=>p.hero==='fahima');assert(car.power.boostUsed);assert(car.power.cooldown>48);assert.equal(car.gear.outfit,'tech');
 }finally{a.send({type:'leave'});a.close();b.close();}
}
{
 const [a,b]=await pair('michael','moreno');let jumpTick=0;const timer=setInterval(()=>{a.input(false);b.input(true);if(++jumpTick%6===0)b.send({type:'action',action:'jump'});},70);
 try{
  await a.until(m=>m.type==='snapshot'&&m.time>7.2&&!m.outcome);a.send({type:'action',action:'power'});
  const cat=await a.until(m=>m.type==='snapshot'&&m.players[0].power.type==='michael');assert.equal(cat.players[0].power.freezeRemaining,0);
  const rewind=await a.until(m=>m.type==='snapshot'&&m.players[0].player.rewindSerial===1,7000);
  assert.equal(rewind.players[0].power.remaining,0);assert(rewind.players[0].power.cooldown>65);assert(!rewind.players[1].player.rewindSerial);assert(!rewind.outcome);assert(rewind.players[0].player.catEchoGap>82);
  const same=await b.until(m=>m.type==='snapshot'&&m.tick===rewind.tick);assert.deepEqual(rewind,same);
 }finally{clearInterval(timer);a.send({type:'leave'});a.close();b.close();}
}
console.log('PASS two real clients: Bracha gravity, Fahima boost, active-power reconnect, Michael catch/rewind, identical authoritative snapshots');
