import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import assert from 'node:assert/strict';
const PORT=18000+Math.floor(Math.random()*10000);
const child=spawn(process.execPath,['server.js'],{cwd:new URL('.',import.meta.url).pathname,env:{...process.env,PORT:String(PORT),ALLOWED_ORIGINS:''},stdio:['ignore','pipe','pipe']});
let logs='';child.stderr.on('data',d=>logs+=d.toString());
const sockets=[];
async function connect(){
 const ws=new WebSocket('ws://127.0.0.1:'+PORT),messages=[],waiters=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);messages.push(m);for(const w of [...waiters])if(w.filter(m)){waiters.splice(waiters.indexOf(w),1);clearTimeout(w.timer);w.resolve(m);}});
 sockets.push(ws);
 await new Promise((res,rej)=>{ws.addEventListener('open',res,{once:true});ws.addEventListener('error',rej,{once:true})});
 return {ws,send:m=>ws.send(JSON.stringify(m)),wait:(type,pred=()=>true)=>{
  const filter=m=>m.type===type&&pred(m),found=messages.find(filter);if(found)return Promise.resolve(found);
  return new Promise((resolve,reject)=>{const w={filter,resolve,timer:null};w.timer=setTimeout(()=>{waiters.splice(waiters.indexOf(w),1);reject(Error('Timeout waiting for '+type))},6000);waiters.push(w);});
 }};
}
async function health(){for(let i=0;i<80;i++){try{const r=await fetch('http://127.0.0.1:'+PORT+'/health');if(r.ok){assert.equal((await r.json()).version,2);return}}catch{}await pause(100);}throw Error('Server health failed: '+logs);}
let failed=0;
try{
 await health();
 const a=await connect();await a.wait('hello');a.send({type:'create',name:'Michael',hero:'michael',gear:{outfit:'dogs',feet:'kozinshoe'}});
 const joined=await a.wait('joined');assert.match(joined.code,/^\d{6}$/);
 const b=await connect();await b.wait('hello');b.send({type:'join',code:joined.code,name:'Moreno',hero:'moreno'});
 await b.wait('joined');await a.wait('room',m=>m.players.length===2);
 a.send({type:'ready',ready:true});b.send({type:'ready',ready:true});await a.wait('started');await b.wait('started');
 assert.equal((await a.wait('snapshot')).players.length,2);
 a.send({type:'action',action:'power'});assert.equal((await b.wait('combat',m=>m.hero==='michael')).action,'power');
 a.ws.close();await b.wait('peer-disconnected',m=>m.id===joined.id);
 const c=await connect();await c.wait('hello');c.send({type:'resume',code:joined.code,id:joined.id,token:joined.resumeToken});
 assert.equal((await c.wait('started',m=>m.resumed)).resumed,true);
 console.log('PASS: two WebSockets, lobby, state sync, unique powers, disconnect and reconnect');
}catch(e){failed=1;console.error(e.stack||e,logs)}
finally{for(const ws of sockets)try{ws.close()}catch{};child.kill('SIGTERM');await pause(200)}
process.exit(failed);