import WebSocket from 'ws';
import assert from 'node:assert/strict';
import {setTimeout as pause} from 'node:timers/promises';

const BASE='https://kozin-online-server.onrender.com';
const SOCKET='wss://kozin-online-server.onrender.com';
const ORIGIN='https://kozin78.vercel.app';
const clients=[];
async function connect(){
 const ws=new WebSocket(SOCKET,{headers:{Origin:ORIGIN}});
 const inbox=[],waiting=[];
 ws.on('message',bytes=>{const msg=JSON.parse(bytes.toString());inbox.push(msg);for(const item of [...waiting])if(item.test(msg)){waiting.splice(waiting.indexOf(item),1);clearTimeout(item.timer);item.resolve(msg);}});
 ws.on('error',error=>console.warn('Socket error:',error.message));
 clients.push(ws);
 await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);setTimeout(()=>reject(Error('WebSocket open timeout')),15000)});
 return {ws,send:v=>ws.send(JSON.stringify(v)),wait:(type,pred=()=>true)=>{
  const test=v=>v.type===type&&pred(v),found=inbox.find(test);
  if(found)return Promise.resolve(found);
  return new Promise((resolve,reject)=>{const item={test,resolve,timer:null};item.timer=setTimeout(()=>{waiting.splice(waiting.indexOf(item),1);reject(Error('Timed out: '+type))},12000);waiting.push(item);});
 }};
}
async function wake(){
 for(let n=0;n<90;n++){
  try{const r=await fetch(BASE+'/health',{signal:AbortSignal.timeout(5000)});if(r.ok){const info=await r.json();assert.equal(info.version,2);return info}}catch(e){if(n===89)throw e;}
  await pause(1100);
 }throw Error('Render health endpoint did not become healthy');
}
try{
 const info=await wake();console.log('Render health OK, version',info.version);
 const a=await connect();await a.wait('hello');a.send({type:'create',name:'smoke one',hero:'michael'});
 const room=await a.wait('joined');assert.match(room.code,/^\d{6}$/);
 const b=await connect();await b.wait('hello');b.send({type:'join',name:'smoke two',hero:'moreno',code:room.code});
 await b.wait('joined');await a.wait('room',m=>m.players.length===2);
 a.send({type:'ready',ready:true});b.send({type:'ready',ready:true});
 await a.wait('started');await b.wait('started');
 const snapshot=await a.wait('snapshot');assert.equal(snapshot.players.length,2);
 a.send({type:'action',action:'power'});assert.equal((await b.wait('combat',m=>m.hero==='michael')).hero,'michael');
 a.ws.close();await b.wait('peer-disconnected',m=>m.id===room.id);
 const c=await connect();await c.wait('hello');c.send({type:'resume',code:room.code,id:room.id,token:room.resumeToken});
 assert.equal((await c.wait('started',m=>m.resumed)).resumed,true);
 console.log('PASS Render live: 2 players, room, snapshots, unique power, disconnect + reconnect');
}catch(e){console.error('FAIL LIVE CHECK:',e.stack||e);process.exitCode=1}
finally{for(const ws of clients)try{ws.close()}catch{}}
