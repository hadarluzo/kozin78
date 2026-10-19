import {WebSocketServer,WebSocket} from 'ws';
import {randomBytes,randomInt} from 'node:crypto';
import {FullWorld,CATALOG,PROTOCOL} from './world-v3.mjs';
export function attachFullOnline(server,{route=true}={}){
 const rooms=new Map(),connections=new Map(),MAX_ROOMS=40,GRACE=60000;
 const allowed=(process.env.ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean);
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false,verifyClient:({origin},done)=>done(!allowed.length||allowed.includes(origin),403,'Origin denied')});
 const send=(ws,m)=>{if(ws?.readyState===WebSocket.OPEN&&ws.bufferedAmount<512000)ws.send(JSON.stringify(m));};
 const emit=(r,m)=>r.players.forEach(p=>send(p.ws,m));
 const state=r=>({type:'room',protocol:PROTOCOL,code:r.code,round:r.round,difficulty:r.difficulty,status:r.status,paused:r.players.some(p=>!p.ws||p.away),players:r.players.map(p=>({id:p.id,name:p.name,hero:p.hero,gear:p.gear,ready:p.ready,connected:!!p.ws,away:p.away}))});
 const safeGear=v=>Object.fromEntries(CATALOG.gear.filter(g=>v?.[g.slot]===g.id).map(g=>[g.slot,g.id]));
 const profile=m=>({name:String(m.name||'שחקן').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,24)||'שחקן',hero:CATALOG.heroes.includes(m.hero)?m.hero:'luzo',gear:safeGear(m.gear)});
 const snap=r=>({type:'snapshot',code:r.code,round:r.round,serverTime:Date.now(),...r.world.snapshot()});
 function closeRoom(r,reason){emit(r,{type:'closed',reason});rooms.delete(r.code);for(const p of r.players){if(p.ws){p.ws.room=null;p.ws.player=null;}}}
 function start(r){r.world=new FullWorld(r.players,r.difficulty,randomInt(0x7fffffff));r.round=randomBytes(12).toString('hex');r.status='running';r.players.forEach(p=>{p.ready=false;p.lastSeq=-1;p.lastInput=Date.now();});emit(r,{type:'started',round:r.round});emit(r,state(r));emit(r,snap(r));}
 const joined=(r,p)=>{send(p.ws,{type:'joined',protocol:PROTOCOL,code:r.code,id:p.id,token:p.token,round:r.round});emit(r,state(r));if(r.world)send(p.ws,snap(r));};
 wss.on('connection',(ws,req)=>{
  const ip=req.socket.remoteAddress||'unknown';connections.set(ip,(connections.get(ip)||0)+1);
  if(connections.get(ip)>20){connections.set(ip,connections.get(ip)-1);ws.close(1013,'Too many connections');return;}
  ws.alive=true;ws.room=null;ws.player=null;let count=0,window=Date.now();
  send(ws,{type:'hello',protocol:PROTOCOL,reconnectMs:GRACE});ws.on('pong',()=>ws.alive=true);
  ws.on('message',raw=>{
   const now=Date.now();if(now-window>1000){window=now;count=0;}if(++count>90){ws.close(1008,'Rate limit');return;}
   let m;try{m=JSON.parse(String(raw));}catch{send(ws,{type:'error',message:'הודעה לא תקינה'});return;}if(!m||typeof m.type!=='string')return;
   let r=ws.room,p=ws.player;
   if(m.type==='ping'){send(ws,{type:'pong',at:m.at});return;}
   if(['create','join','resume'].includes(m.type)&&!r){
    if(m.protocol!==PROTOCOL){send(ws,{type:'error',message:'יש לעדכן את קובץ המשחק',fatal:true});return;}
    if(m.type==='create'){
     if(rooms.size>=MAX_ROOMS){send(ws,{type:'error',message:'השרת מלא כרגע. נסו שוב בעוד רגע.'});return;}
     let code;do{code=String(randomInt(100000,1000000));}while(rooms.has(code));
     r={code,status:'waiting',players:[],difficulty:CATALOG.difficulties.includes(m.difficulty)?m.difficulty:'normal',created:now,round:null,world:null};rooms.set(code,r);
    }else r=rooms.get(String(m.code));
    if(!r){send(ws,{type:'error',message:'החדר לא נמצא או שפג תוקפו',fatal:m.type==='resume'});return;}
    if(m.type==='resume'){
     p=r.players.find(p=>p.id===m.id&&p.token===m.token);
     if(!p||(!p.ws&&now>p.deadline)){send(ws,{type:'error',message:'לא ניתן לחזור לחדר הזה',fatal:true});return;}
     if(p.ws){p.ws.room=null;p.ws.player=null;p.ws.close(4001,'Resumed elsewhere');}
     p.ws=ws;p.away=false;p.deadline=0;p.lastInput=now;p.lastSeq=-1;
    }else{
     if(r.status!=='waiting'||r.players.length>=2){send(ws,{type:'error',message:'החדר מלא או שהסיבוב כבר התחיל'});return;}
     p={...profile(m),id:randomBytes(8).toString('hex'),token:randomBytes(24).toString('hex'),ws,ready:false,away:false,deadline:0,lastSeq:-1,lastInput:now};r.players.push(p);
    }
    ws.room=r;ws.player=p;joined(r,p);return;
   }
   if(!r||!p)return;
   if(m.type==='leave'){closeRoom(r,'אחד השחקנים עזב את החדר');return;}
   if(m.type==='profile'&&r.status==='waiting'){Object.assign(p,profile(m));p.ready=false;emit(r,state(r));return;}
   if(m.type==='ready'&&r.status==='waiting'){p.ready=m.ready===true;emit(r,state(r));if(r.players.length===2&&r.players.every(p=>p.ready&&p.ws&&!p.away))start(r);return;}
   if(m.type==='rematch'&&r.status==='finished'){r.status='waiting';r.world=null;r.players.forEach(p=>p.ready=false);emit(r,state(r));return;}
   if(m.type==='away'){p.away=m.away===true;p.deadline=p.away?now+GRACE:0;r.world?.input(p.id,{run:false,lift:false});emit(r,state(r));return;}
   if(r.status!=='running'||r.players.some(p=>!p.ws||p.away))return;
   if(m.type==='input'){
    if(!Number.isSafeInteger(m.seq)||m.seq<=p.lastSeq||m.seq>p.lastSeq+100000)return;p.lastSeq=m.seq;p.lastInput=now;r.world.input(p.id,m);
   }else if(m.type==='action'&&['jump','punch','kick','power'].includes(m.action)){
    if(now-(p.lastAction||0)<75)return;p.lastAction=now;r.world.action(p.id,m.action);
   }
  });
  ws.on('close',()=>{connections.set(ip,Math.max(0,(connections.get(ip)||1)-1));const r=ws.room,p=ws.player;if(!r||!p||p.ws!==ws)return;p.ws=null;p.ready=false;p.deadline=Date.now()+GRACE;r.world?.input(p.id,{run:false,lift:false});emit(r,state(r));});ws.on('error',()=>{});
 });
 let previous=performance.now(),acc=0;
 const loop=setInterval(()=>{
  const now=performance.now();acc+=Math.min(.1,(now-previous)/1000);previous=now;
  while(acc>=1/60){for(const r of rooms.values()){
   if(Date.now()-r.created>3600000){closeRoom(r,'החדר פג תוקף');continue;}
   if(r.players.some(p=>(!p.ws||p.away)&&Date.now()>p.deadline)){closeRoom(r,'החיבור לא חודש בתוך דקה. ההתקדמות שכבר התקבלה נשמרה.');continue;}
   if(r.status!=='running'||r.players.length!==2||r.players.some(p=>!p.ws||p.away))continue;
   for(const p of r.players)if(Date.now()-p.lastInput>500)r.world.input(p.id,{run:false,lift:false});
   try{r.world.step();if(r.world.tick%3===0||r.world.outcome)emit(r,snap(r));if(r.world.outcome){r.status='finished';emit(r,state(r));}}catch(e){console.error('FULL_WORLD_ERROR',e.stack);closeRoom(r,'שגיאה בשרת. אפשר לפתוח חדר חדש.');}
  }acc-=1/60;}
 },1000/60);loop.unref();
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive)ws.terminate();else{ws.alive=false;ws.ping();}}},10000);heartbeat.unref();
 if(route)server.on('upgrade',(req,socket,head)=>{if(req.url?.split('?')[0]==='/full-v3')wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));else socket.destroy();});
 const health=()=>({ok:true,protocol:PROTOCOL,rooms:rooms.size,tickHz:60,snapshotHz:20});
 return {wss,rooms,health,close(){clearInterval(loop);clearInterval(heartbeat);for(const r of rooms.values())closeRoom(r,'השרת מופעל מחדש');for(const ws of wss.clients)ws.close(1012,'Server restart');wss.close();}};
}
