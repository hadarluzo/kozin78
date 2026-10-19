import http from 'node:http';
import { randomBytes, randomInt } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { MAPS, OBSTACLES, ROUTES, POWERS, safeGear } from './world.mjs';

// Multiplayer rounds are ephemeral. Never read/write account money, XP, cosmetics or progress.
const PORT=Number(process.env.PORT||8080);
const ALLOWED=(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
const rooms=new Map();
const DT=1/30, GRAVITY=1750, SPEED=275, MAX_ROOMS=500, RECONNECT_MS=60000;
const HEROES=new Set(Object.keys(POWERS));
const send=(ws,m)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(m));};
const emit=(r,m)=>r.players.forEach(p=>send(p.ws,m));
const cleanName=v=>String(v||'שחקן').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,24)||'שחקן';
const key=()=>randomBytes(24).toString('hex');
function makeCode(){let code;do{code=String(randomInt(1000000)).padStart(6,'0');}while(rooms.has(code));return code;}
function roomState(r){return {type:'room',code:r.code,status:r.status,players:r.players.map(p=>({id:p.id,name:p.name,hero:p.hero,gear:p.gear,ready:p.ready,connected:!!p.ws})),reason:r.reason||null};}
function newPlayer(ws,m){return {id:randomBytes(6).toString('hex'),resumeToken:key(),ws,name:cleanName(m.name),hero:HEROES.has(m.hero)?m.hero:'luzo',gear:safeGear(m.gear),ready:false,connected:true,x:310,y:0,vy:0,jumps:0,running:false,dead:false,food:0,nextPower:0,nextAction:0,powerUntil:0,actionUntil:0,action:'',stunUntil:0,graceUntil:0,phase:0};}
function welcome(r,p){send(p.ws,{type:'joined',id:p.id,code:r.code,resumeToken:p.resumeToken});emit(r,roomState(r));if(r.status==='running')send(p.ws,{type:'started',code:r.code,resumed:true});}
function start(r){
 r.status='running';r.reason=null;r.tick=0;r.created=Date.now();r.nextX=740;r.spawn=0;r.obstacles=[];r.foods=[];r.routeName='';
 r.chaser={x:40,frozenUntil:0,slowUntil:0,spitUntil:0,morenoUntil:0,michaelUntil:0};
 r.players.forEach((p,i)=>{p.x=310+i*38;p.y=0;p.vy=0;p.jumps=0;p.running=false;p.dead=false;p.ready=false;p.food=0;p.nextPower=0;p.nextAction=0;p.powerUntil=0;p.actionUntil=0;p.action='';p.stunUntil=0;p.phase=0;});
 emit(r,{type:'started',code:r.code});
}
function finish(r,reason,losers=[]){
 if(r.status!=='running')return;
 r.status='finished';r.reason=reason;
 const survivors=r.players.filter(p=>!losers.includes(p.id));
 const winnerId=survivors.length===1?survivors[0].id:null;
 emit(r,{type:'result',winnerId,reason,players:r.players.map(p=>({id:p.id,name:p.name,food:p.food,distance:Math.max(0,Math.round((p.x-310)/10))}))});
 emit(r,roomState(r));
}
function spawn(r,maxX){
 while(r.nextX<maxX+950){
  const n=r.spawn++,x=r.nextX;
  if(n>1&&n%6===5){
   const route=ROUTES[(Math.floor(n/6))%ROUTES.length];
   r.routeName=route.name;
   const steps=route.h.slice(0,6);
   steps.forEach((h,i)=>r.obstacles.push({kind:'platform',style:route.style,x:x+i*104,w:48,h:Math.min(225,Math.round(h*.48))}));
   r.nextX=x+steps.length*104+360;
  }else{
   const [kind,w,h]=OBSTACLES[n%OBSTACLES.length];
   r.obstacles.push({kind,x,w,h:Math.min(h,90)});
   if(n%2===0)r.foods.push({id:n,x:x+120,y:82+20*(n%3),type:['pizza','burger','icecream','shawarma','donut','fries'][n%6],takenBy:[]});
   r.nextX=x+390+(n%4)*50;
  }
 }
}
function power(r,p){
 const now=Date.now(),spec=POWERS[p.hero];
 if(!spec||now<p.nextPower)return;
 p.nextPower=now+spec.cooldown;p.powerUntil=now+spec.duration;p.action='power';p.actionUntil=now+550;
 if(p.hero==='luzo'){r.chaser.frozenUntil=Math.max(r.chaser.frozenUntil,now+850);r.chaser.spitUntil=now+1400;}
 if(p.hero==='michael'){r.chaser.frozenUntil=Math.max(r.chaser.frozenUntil,now+1000);r.chaser.michaelUntil=now+10000;}
 if(p.hero==='moreno'){r.chaser.frozenUntil=Math.max(r.chaser.frozenUntil,now+1000);r.chaser.morenoUntil=now+15000;}
 if(p.hero==='hashi')r.chaser.slowUntil=now+6000;
 if(p.hero==='eyal')r.obstacles=r.obstacles.filter(o=>o.kind==='platform'||o.x<p.x||o.x>p.x+700);
 if(p.hero==='yishai')r.obstacles=r.obstacles.filter(o=>o.kind==='platform'||!['courier','scooter','drone'].includes(o.kind)||o.x<p.x-30||o.x>p.x+420);
 if(p.hero==='yona')p.vy=Math.max(p.vy,450);
 emit(r,{type:'combat',attackerId:p.id,targetId:null,action:'power',hero:p.hero,until:p.powerUntil,tick:r.tick});
}
function action(r,p,type){
 const now=Date.now();
 if(type==='power'){power(r,p);return;}
 if(!['punch','kick'].includes(type)||now<p.nextAction)return;
 p.nextAction=now+(type==='kick'?720:460);p.action=type;p.actionUntil=now+350;
 const reach=type==='kick'?105:75,prev=r.obstacles.length;
 r.obstacles=r.obstacles.filter(o=>o.kind==='platform'||o.x<p.x-22||o.x>p.x+reach||o.h>80);
 emit(r,{type:'combat',attackerId:p.id,targetId:null,action:type,hero:p.hero,hit:prev>r.obstacles.length,tick:r.tick});
}
function advance(r){
 if(r.status!=='running'||r.players.length!==2)return;
 r.tick++;const now=Date.now();
 for(const p of r.players){
  if(!p.ws){if(now>p.graceUntil){finish(r,'disconnect',[p.id]);return;}continue;}
  if(p.dead)continue;
  const oldX=p.x,oldY=p.y;
  if(p.running&&now>=p.stunUntil)p.x+=SPEED*DT*(p.hero==='tzippy'&&now<p.powerUntil?1.2:1);
  if(p.hero==='yona'&&now<p.powerUntil&&p.running)p.vy=Math.max(p.vy,115);
  p.vy-=GRAVITY*DT;p.y=Math.max(0,p.y+p.vy*DT);
  for(const o of r.obstacles){
   if(o.kind!=='platform')continue;
   if(p.vy<=0&&oldY>=o.h-3&&p.y<=o.h&&p.x+14>=o.x&&p.x-14<=o.x+o.w){p.y=o.h;p.vy=0;p.jumps=0;break;}
  }
  if(p.y===0){p.vy=0;p.jumps=0;}
  if(p.hero==='tzippy'&&now<p.powerUntil&&p.y<55){p.vy=680;p.jumps=0;}
  for(const o of r.obstacles){
   if(o.kind==='platform')continue;
   if(oldX<=o.x+o.w&&p.x+14>=o.x&&p.x-14<=o.x+o.w&&p.y<o.h-6){
    if(p.hero==='tzippy'&&now<p.powerUntil){p.x=o.x+o.w+20;continue;}
    if(p.hero==='yona'&&now<p.powerUntil){p.y=o.h+5;continue;}
    p.dead=true;break;
   }
  }
  p.phase+=p.running?0.25:0.04;
 }
 const minX=Math.min(...r.players.map(p=>p.x)),maxX=Math.max(...r.players.map(p=>p.x));
 if(now>=r.chaser.frozenUntil){
  const modifier=now<r.chaser.slowUntil?0.45:1;
  r.chaser.x+=Math.max(0,Math.min(minX-95-r.chaser.x,(r.tick<100?155:230)*DT*modifier));
 }
 spawn(r,maxX);
 for(const p of r.players){
  if(r.chaser.x+38>=p.x-16&&!(p.hero==='tzippy'&&now<p.powerUntil))p.dead=true;
  for(const f of r.foods)if(!f.takenBy.includes(p.id)&&Math.abs(p.x-f.x)<26&&Math.abs(p.y-f.y)<75){f.takenBy.push(p.id);p.food++;}
 }
 const dead=r.players.filter(p=>p.dead).map(p=>p.id);
 if(dead.length){finish(r,dead.length===2?'simultaneous':'caught',dead);return;}
 if(minX>12000){finish(r,'escaped',[]);return;}
 r.obstacles=r.obstacles.filter(o=>o.x>minX-650);
 r.foods=r.foods.filter(f=>f.x>minX-650);
 if(r.tick%2===0)emit(r,{type:'snapshot',tick:r.tick,serverTime:now,
  players:r.players.map(p=>({id:p.id,x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,hero:p.hero,name:p.name,gear:p.gear,action:now<p.actionUntil?p.action:'',powerUntil:p.powerUntil,nextPower:p.nextPower,running:p.running,phase:p.phase,stunned:now<p.stunUntil,food:p.food,connected:!!p.ws})),
  chaser:r.chaser,obstacles:r.obstacles,foods:r.foods,mapIndex:Math.floor(Math.max(0,minX-310)/1600)%MAPS.length,mapName:MAPS[Math.floor(Math.max(0,minX-310)/1600)%MAPS.length],routeName:r.routeName
 });
}
const httpServer=http.createServer((req,res)=>{
 if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,rooms:rooms.size,version:2}));return;}
 res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');
});
const wss=new WebSocketServer({server:httpServer,maxPayload:3072,verifyClient:({origin},cb)=>cb(!ALLOWED.length||ALLOWED.includes(origin),403,'Origin denied')});
wss.on('connection',ws=>{
 let room=null,player=null,windowAt=Date.now(),messageCount=0;
 ws.alive=true;ws.on('pong',()=>ws.alive=true);
 send(ws,{type:'hello',version:2});
 ws.on('message',raw=>{
  const now=Date.now();if(now-windowAt>1000){windowAt=now;messageCount=0;}
  if(++messageCount>90){ws.close(1008,'Rate limit');return;}
  let m;try{m=JSON.parse(String(raw));}catch{return;}
  if(!m||typeof m.type!=='string')return;
  if(m.type==='create'&&!room){
   if(rooms.size>=MAX_ROOMS){send(ws,{type:'error',message:'השרת עמוס כרגע'});return;}
   room={code:makeCode(),status:'waiting',players:[],created:now,tick:0};
   rooms.set(room.code,room);player=newPlayer(ws,m);room.players.push(player);welcome(room,player);
  }else if(m.type==='join'&&!room){
   const dest=rooms.get(String(m.code||''));
   if(!dest||dest.status!=='waiting'||dest.players.length!==1){send(ws,{type:'error',message:'החדר לא זמין'});return;}
   room=dest;player=newPlayer(ws,m);room.players.push(player);welcome(room,player);
  }else if(m.type==='resume'&&!room){
   const dest=rooms.get(String(m.code||''));const found=dest?.players.find(p=>p.id===m.id&&p.resumeToken===m.token);
   if(!found||found.ws){send(ws,{type:'error',message:'לא ניתן לחדש את החדר'});return;}
   room=dest;player=found;player.ws=ws;player.running=false;player.graceUntil=0;
   welcome(room,player);
  }else if(m.type==='ready'&&player&&room.status==='waiting'){
   player.ready=!!m.ready;emit(room,roomState(room));
   if(room.players.length===2&&room.players.every(p=>p.ready))start(room);
  }else if(m.type==='input'&&player&&room.status==='running')player.running=!!m.run;
  else if(m.type==='jump'&&player&&room.status==='running'&&!player.dead&&player.jumps<2){
   player.vy=player.jumps?620:710;player.jumps++;player.action='jump';player.actionUntil=now+280;
  }else if(m.type==='action'&&player&&room.status==='running'&&!player.dead)action(room,player,String(m.action||''));
  else if(m.type==='rematch'&&player&&room.status==='finished'){
   room.status='waiting';room.players.forEach(p=>p.ready=false);emit(room,roomState(room));
  }
 });
 ws.on('close',()=>{
  if(!room||!player)return;
  player.running=false;player.ws=null;player.graceUntil=Date.now()+RECONNECT_MS;
  if(room.status==='running')emit(room,{type:'peer-disconnected',id:player.id,graceMs:RECONNECT_MS});
  if(room.status!=='running')emit(room,roomState(room));
  if(room.players.every(p=>!p.ws))rooms.delete(room.code);
 });
 ws.on('error',()=>{});
});
const timer=setInterval(()=>{for(const r of rooms.values())advance(r);},1000/30);timer.unref?.();
const ping=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive)ws.terminate();else{ws.alive=false;ws.ping();}}},30000);ping.unref?.();
const cleanup=setInterval(()=>{for(const [code,r] of rooms)if(Date.now()-r.created>4*3600000)rooms.delete(code);},60000);cleanup.unref?.();
httpServer.listen(PORT,'0.0.0.0',()=>console.log('Kozin online v2 listening on '+PORT));
