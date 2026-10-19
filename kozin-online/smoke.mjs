import WebSocket from 'ws';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
function client(port){
 const ws=new WebSocket('ws://127.0.0.1:'+port,{origin:'https://kozin78.vercel.app'});
 const history=[];
 ws.on('message',data=>{try{history.push(JSON.parse(String(data)));}catch{}});
 return {ws,history};
}
async function waitFor(c,fn,timeout=7000){
 const start=Date.now();
 while(Date.now()-start<timeout){
  const obj=c.history.find(fn);
  if(obj)return obj;
  if(c.ws.readyState===WebSocket.CLOSED)throw Error('WebSocket closed unexpectedly');
  await sleep(35);
 }
 throw Error('Timed out waiting for '+fn.toString().slice(0,90));
}
async function connect(port){
 const c=client(port);await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('WebSocket connect timeout')),8000);
  c.ws.once('open',()=>{clearTimeout(timeout);resolve();});
  c.ws.once('error',e=>{clearTimeout(timeout);reject(e);});
 });return c;
}
export async function run(port){
 let a,b,c;
 const tests=[];
 const check=(name,ok)=>{if(!ok)throw Error(name);tests.push(name);};
 try{
  const url='http://127.0.0.1:'+port;
  const health=await fetch(url+'/health');
  const data=await health.json();
  check('health-v2',health.ok&&data.version===2);
  for(const [group,id] of [['ASSET_URLS','day'],['ASSET_URLS','characters'],['HERO_ART','yona'],['DROP2_ART','luzo'],['EXPANSION_ART','michael']]){
   const response=await fetch(url+'/assets/'+group+'/'+id);
   const content=await response.arrayBuffer();
   if(!response.ok||content.byteLength<=20000||!response.headers.get('content-type')?.startsWith('image/')||response.headers.get('access-control-allow-origin')!=='*'){
    const errorInfo=Buffer.from(content).subarray(0,120).toString('utf8');
    throw Error('asset-'+group+'-'+id+' status='+response.status+' bytes='+content.byteLength+' type='+response.headers.get('content-type')+' cors='+response.headers.get('access-control-allow-origin')+' text='+errorInfo);
   }
   check('asset-'+group+'-'+id,true);
  }
  a=await connect(port);b=await connect(port);
  check('two-independent-connections',!!(await waitFor(a,m=>m.type==='hello'))&&!!(await waitFor(b,m=>m.type==='hello')));
  a.ws.send(JSON.stringify({type:'create',name:'Autotest A',hero:'michael',gear:{outfit:'tech'}}));
  const created=await waitFor(a,m=>m.type==='joined');
  check('private-room',/^\d{6}$/.test(created.code)&&!!created.resumeToken);
  b.ws.send(JSON.stringify({type:'join',code:created.code,name:'Autotest B',hero:'moreno',gear:{feet:'kozinshoe'}}));
  const joined=await waitFor(b,m=>m.type==='joined');
  check('peer-join',created.code===joined.code);
  a.ws.send(JSON.stringify({type:'ready',ready:true}));b.ws.send(JSON.stringify({type:'ready',ready:true}));
  await Promise.all([waitFor(a,m=>m.type==='started'),waitFor(b,m=>m.type==='started')]);
  check('joint-start',true);
  a.ws.send(JSON.stringify({type:'input',run:true}));
  b.ws.send(JSON.stringify({type:'input',run:true}));
  const snapshot=await waitFor(a,m=>m.type==='snapshot'&&m.players.length===2&&m.players.every(p=>p.x>310));
  check('shared-world-snapshot',snapshot.mapIndex===0&&snapshot.players[0].gear.outfit==='tech'&&snapshot.players[1].gear.feet==='kozinshoe');
  a.ws.send(JSON.stringify({type:'action',action:'power'}));
  const power=await waitFor(b,m=>m.type==='combat'&&m.action==='power'&&m.hero==='michael');
  check('power-broadcast',!!power.until);
  b.ws.close();
  await waitFor(a,m=>m.type==='peer-disconnected'&&m.id===joined.id);
  check('peer-disconnected-grace',true);
  c=await connect(port);
  c.ws.send(JSON.stringify({type:'resume',code:created.code,id:joined.id,token:joined.resumeToken}));
  const resumed=await waitFor(c,m=>m.type==='joined');
  check('reconnection-original-id',resumed.id===joined.id);
  await waitFor(c,m=>m.type==='started'&&m.resumed===true);
  check('resume-original-room',true);
  await waitFor(c,m=>m.type==='snapshot'&&m.players.length===2);
  check('resume-snapshot',true);
  console.log('KOZIN_SMOKE_PASS '+tests.length+' tests: '+tests.join(', '));
  return {ok:true,tests};
 }catch(e){
  console.error('KOZIN_SMOKE_FAIL '+tests.length+' tests passed before error: '+(e?.stack||e));
  return {ok:false,tests,error:String(e)};
 }finally{
  for(const obj of [a,b,c])if(obj?.ws.readyState===WebSocket.OPEN)obj.ws.close();
 }
}