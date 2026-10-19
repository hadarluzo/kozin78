import WebSocket from 'ws';
import assert from 'node:assert/strict';
import {PROTOCOL} from './world-v3.mjs';
const url=process.argv[2]||'ws://127.0.0.1:8080/full-v3';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
class Client{
 constructor(){this.messages=[];this.seq=0;}
 async open(){this.ws=new WebSocket(url,url.startsWith('wss://')?{headers:{Origin:'https://kozin78.vercel.app'}}:undefined);this.ws.on('message',v=>{const m=JSON.parse(v);this.messages.push(m);if(m.type==='snapshot')this.latest=m;if(m.type==='joined')this.identity=m;});await new Promise((yes,no)=>{this.ws.once('open',yes);this.ws.once('error',no);});return this;}
 send(m){this.ws.send(JSON.stringify(m));}
 async until(pred,ms=10000){const end=Date.now()+ms;while(Date.now()<end){const m=this.messages.find(pred);if(m)return m;await wait(25);}throw Error('message timeout '+JSON.stringify(this.messages.slice(-2)));}
 input(run){this.send({type:'input',seq:++this.seq,run,lift:false,width:1000});}
 close(){this.ws.terminate();}
}
const a=await new Client().open(),b=await new Client().open();
a.send({type:'create',protocol:PROTOCOL,name:'בדיקה א',hero:'michael',gear:{outfit:'paisley',feet:'kozinshoe',fringe:'tekhelet'},difficulty:'hard'});
const joined=await a.until(m=>m.type==='joined');b.send({type:'join',protocol:PROTOCOL,code:joined.code,name:'בדיקה ב',hero:'moreno',gear:{outfit:'tech',head:'kippah'}});await b.until(m=>m.type==='joined');
a.send({type:'ready',ready:true});b.send({type:'ready',ready:true});await a.until(m=>m.type==='snapshot');await b.until(m=>m.type==='snapshot');
const inputTimer=setInterval(()=>{if(a.ws.readyState===1)a.input(true);if(b.ws.readyState===1)b.input(true);},70);
await wait(250);a.send({type:'action',action:'power'});await a.until(m=>m.type==='snapshot'&&m.players.some(p=>p.power.freezeRemaining>0));await b.until(m=>m.type==='snapshot'&&m.players.some(p=>p.power.freezeRemaining>0));
assert.equal(a.latest.players[0].gear.fringe,'tekhelet');assert.equal(b.latest.players[0].gear.fringe,'tekhelet');
const common=a.messages.filter(m=>m.type==='snapshot').find(m=>b.messages.some(n=>n.type==='snapshot'&&n.tick===m.tick));const same=b.messages.find(n=>n.type==='snapshot'&&n.tick===common.tick);assert.deepEqual(common,same);
const saved=b.identity;b.close();await a.until(m=>m.type==='room'&&m.paused===true);await wait(100);const frozenTick=a.latest.tick;await wait(250);assert.equal(a.latest.tick,frozenTick,'shared pause');
await b.open();b.seq=0;b.send({type:'resume',protocol:PROTOCOL,code:saved.code,id:saved.id,token:saved.token});await wait(250);assert(a.latest.tick>frozenTick,'resume advances');assert.equal(b.latest.players[1].id,saved.id);
const c=await new Client().open();c.send({type:'join',protocol:PROTOCOL,code:joined.code});await c.until(m=>m.type==='error');c.close();
const awayMark=a.messages.length;a.send({type:'away',away:true});await a.until(m=>m.type==='room'&&m.paused===true&&a.messages.indexOf(m)>=awayMark);await wait(250);const pauseTick=a.latest.tick;await wait(300);assert.equal(a.latest.tick,pauseTick,'background pause stable on remote link');const backMark=a.messages.length;a.send({type:'away',away:false});await a.until(m=>m.type==='room'&&m.paused===false&&a.messages.indexOf(m)>=backMark);await wait(250);assert(a.latest.tick>pauseTick);
clearInterval(inputTimer);a.send({type:'leave'});await b.until(m=>m.type==='closed');a.close();b.close();console.log('PASS two live WebSocket clients: identical world, heroes/gear, shared freeze, room limit, disconnect pause, token resume, background pause, leave');
