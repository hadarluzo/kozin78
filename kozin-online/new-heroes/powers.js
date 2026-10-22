// Shared by the standalone game and the authoritative multiplayer engine.
// Histories never enter snapshots or saved accounts.
(() => {
 HEROES.fahima.cooldown=60;
 HEROES.fahima.description=HEROES.fahima.description.replace(/50/g,'60');
 const histories=new WeakMap(), clone=x=>JSON.parse(JSON.stringify(x));
 const key=o=>o.netId??`${o.x}:${o.y??o.height}:${o.seed??o.type}`;
 const history=g=>{let h=histories.get(g);if(!h){h={clock:0,frames:[],foods:new Set(),passed:new Set(),enemies:new Set(),serial:0,enemySerial:0};histories.set(g,h);}return h;};
 const capture=g=>({player:{...g.player},chaser:{...g.chaser},time:g.time,
  ...(g.networked?{}:{obstacles:clone(g.obstacles),foods:clone(g.foods),trail:clone(g.trail),enemies:clone(g.combat.enemies),boss:clone(g.boss),nextX:g.nextX,encounter:g.encounter,routeBag:[...g.routeBag],lastRoute:g.lastRoute})});
 const reset=RunnerGame.prototype.reset;
 RunnerGame.prototype.reset=function(){histories.delete(this);return reset.call(this);};
 const activate=HeroPower.prototype.activate;
 HeroPower.prototype.activate=function(g){
  const id=g.wallet.selected;
  if(!['bracha','fahima','michael'].includes(id))return activate.call(this,g);
  if(g.state!=='playing'||this.cooldown>0)return false;
  if(id==='michael'&&history(g).clock<3){g.emit('notice','כוח מיצי זמין אחרי שלוש שניות של משחק');return false;}
  Object.assign(this,{type:id,cooldown:HEROES[id].cooldown,remaining:HEROES[id].duration,elapsed:0,freezeRemaining:0,bobRemaining:0,slowRemaining:0,catUsed:false,boostUsed:false,boostTime:0,carStage:'ready'});
  g.player.flip=0;
  g.say('luzo',id==='michael'?'מיצי שומר עליי!':id==='fahima'?'קפיצה כפולה — טורבו!':'ענן כבידה!');
  g.burst(g.player.x,g.player.y+95,id==='bracha'?'#d7e6d3':id==='fahima'?'#ffe345':'#b8e4ff',24);g.audio.effect('collect');return true;
 };
 const powerUpdate=HeroPower.prototype.update;
 HeroPower.prototype.update=function(g,dt){
  powerUpdate.call(this,g,dt);
  if(this.type==='fahima'&&this.remaining>0&&this.boostTime>0){
   this.boostTime=Math.max(0,this.boostTime-dt);g.player.vy=1550;g.player.jumps=2;g.player.flip=0;
   if(!this.boostTime){this.carStage='coast';g.player.vy=Math.min(g.player.vy,100);}
  }
 };
 const jump=RunnerGame.prototype.jump;
 RunnerGame.prototype.jump=function(){
  const q=this.power,p=this.player;
  if(this.state==='playing'&&q.type==='fahima'&&q.remaining>0&&!q.boostUsed&&p.jumps===1){
   Object.assign(q,{boostUsed:true,boostTime:.9,remaining:3.9,carStage:'boost'});
   p.jumps=2;p.vy=1550;p.flip=0;this.audio.effect('flip');this.burst(p.x,p.y,'#ffad32',24);return;
  }
  const before=p.jumps;jump.call(this);
  if(q.type==='bracha'&&q.remaining>0&&p.jumps>before){p.vy=750;p.flip=0;}
  if(q.type==='fahima'&&q.remaining>0)p.flip=0;
 };
 RunnerGame.prototype.heroGravity=function(){return this.power.type==='bracha'&&this.power.remaining>0?.4:this.power.type==='fahima'&&this.power.boostTime>0?0:1;};
 RunnerGame.prototype.heroCeiling=function(){if(this.power.type==='fahima')return 1100;return Math.max(240,Math.min(620,(this.viewHeight||620)-Math.max(140,(this.viewHeight||620)*.22)-190));};
 RunnerGame.prototype.rescueCat=function(){
  const q=this.power,h=history(this);
  if(q.type!=='michael'||q.remaining<=0||q.catUsed||h.clock<3)return false;
  const target=h.clock-3,frames=h.frames;
  let a=frames[0],b=a;for(const f of frames){if(f.at<=target)a=f;if(f.at>=target){b=f;break;}b=f;}
  if(!a||!b)return false;
  for(const o of this.obstacles)if(o.passed)h.passed.add(key(o));
  for(const e of this.combat.enemies)if(e.dead)h.enemies.add(e.rewindId??e.netId);
  const u=b.at>a.at?Math.max(0,Math.min(1,(target-a.at)/(b.at-a.at))):0;
  const p={...a.state.player};for(const k of ['x','y','vy','phase'])p[k]=a.state.player[k]+(b.state.player[k]-a.state.player[k])*u;
  Object.assign(this.player,p,{rewindSerial:++h.serial,flip:0});
  if(this.networked){
   // Restore a personal chase gap; the common pursuer and teammate keep moving.
   this.player.catEchoGap=Math.max(CONFIG.catchGap+35,a.state.player.catEchoGap??a.state.player.x-a.state.chaser.x);
   this.player.catEchoLastX=this.player.x;
  }else{
   const s=a.state;Object.assign(this.chaser,s.chaser);this.chaser.x=this.player.x-this.chaser.gap;
   this.obstacles=clone(s.obstacles).map(o=>({...o,passed:o.passed||h.passed.has(key(o))}));
   this.foods=clone(s.foods).map(f=>({...f,taken:f.taken||h.foods.has(key(f))}));
   this.trail=clone(s.trail);this.combat.enemies=clone(s.enemies).filter(e=>!h.enemies.has(e.rewindId??e.netId));
   const beanCollected=this.boss.beanCollected,beanMissed=this.boss.beanMissed;Object.assign(this.boss,s.boss,{beanCollected,beanMissed});
   for(const k of ['nextX','encounter','lastRoute'])this[k]=s[k];this.routeBag=[...s.routeBag];
  }
  this.distance=Math.max(0,this.player.x-320);this.mapIndex=Math.min(MAPS.length-1,Math.floor(this.distance/CONFIG.mapLength));
  q.catUsed=true;q.remaining=0;q.rewindFlash=.65;this.player.invincible=Math.max(this.player.invincible,.2);
  this.burst(this.player.x,this.player.y+90,'#b8e4ff',28);this.emit('notice','מיצי! חזרת בדיוק שלוש שניות לאחור');return true;
 };
 const finish=RunnerGame.prototype.finish;
 RunnerGame.prototype.finish=function(win){if(!win&&!this.networked&&this.rescueCat())return;return finish.call(this,win);};
 const update=RunnerGame.prototype.update;
 RunnerGame.prototype.update=function(dt,width){
  const active=this.state==='playing',h=this.wallet.selected==='michael'?history(this):null;
  if(h&&active){
   for(const e of this.combat.enemies){e.rewindId??=++h.enemySerial;if(e.dead)h.enemies.add(e.rewindId);}
   if(!h.frames.length)h.frames.push({at:h.clock,state:capture(this)});
   // Record consumed/passed identities before any catch can restore the world.
   for(const f of this.foods)if(f.taken)h.foods.add(key(f));
   for(const o of this.obstacles)if(o.passed)h.passed.add(key(o));
   h.clock+=dt;
  }
  update.call(this,dt,width);
  if(active&&this.power.rewindFlash>0)this.power.rewindFlash=Math.max(0,this.power.rewindFlash-dt);
  if(h&&active){for(const e of this.combat.enemies){e.rewindId??=++h.enemySerial;if(e.dead)h.enemies.add(e.rewindId);}h.frames.push({at:h.clock,state:capture(this)});while(h.frames.length>2&&h.frames[1].at<h.clock-3.1)h.frames.shift();}
 };
 const collect=RunnerGame.prototype.collect,eat=RunnerGame.prototype.eat;
 RunnerGame.prototype.collect=function(f){if(this.wallet.selected==='michael')history(this).foods.add(key(f));return collect.call(this,f);};
 RunnerGame.prototype.eat=function(f){if(this.wallet.selected==='michael')history(this).foods.add(key(f));return eat.call(this,f);};
})();
