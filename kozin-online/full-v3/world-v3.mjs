import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./engine.cjs',import.meta.url),'utf8');
export const PROTOCOL='kozin-full-3';
function engine(seed){
 let value=seed>>>0;const math=Object.create(Math);math.random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
 const sandbox={module:{exports:{}},Math:math,console,URLSearchParams,location:{search:''},localStorage:{getItem(){return null;},setItem(){}},document:{addEventListener(){},getElementById(){return null;}},addEventListener(){}};
 vm.createContext(sandbox);vm.runInContext(source,sandbox,{timeout:2000});return sandbox.module.exports;
}
const copy=x=>JSON.parse(JSON.stringify(x));
export class FullWorld {
 constructor(profiles,difficulty='normal',seed=Date.now(),options={}){
  this.api=engine(seed);const {RunnerGame,DIFFICULTIES,CONFIG}=this.api;
  this.difficulty=DIFFICULTIES[difficulty]?difficulty:'normal';this.tick=0;this.time=0;this.outcome=null;this.sequence=0;this.startDelay=options.countdown===true?4:0;
  this.games=profiles.map((p,i)=>{const g=new RunnerGame({effect(){},music(){}});g.difficulty=this.difficulty;g.wallet.selected=this.api.HEROES[p.hero]?p.hero:'luzo';g.wallet.name=p.name;g.input={running:false,lifting:false,clear(){this.running=false;this.lifting=false;}};g.start();g.id=p.id;g.networked=true;g.gear=p.gear;g.secondary=!!i;g.hitIds=new Set();g.passedIds=new Set();g.contactIds=new Set();g.viewWidth=1000;g.events=[];return g;});
  // All players enter the same shared-world starting line, not staggered
  // by their roster order. Keep separate player objects for independent play.
  const startingX=this.games[0].player.x,startingY=this.games[0].player.y;
  for(const g of this.games){g.player.x=startingX;g.player.y=startingY;}
  this.chaser=this.games[0].chaser;this.chaser.x=this.games[0].player.x-CONFIG.startGap;this.boss=this.games[0].boss;
  this.obstacles=this.games[0].obstacles;this.foods=this.games[0].foods;this.enemies=[];
  this.generator=this.games[0];this.spawn=this.generator.spawn.bind(this.generator);
  for(const g of this.games)g.spawn=()=>{};
  this.assignIds();
 }
 assignIds(){for(const list of [this.obstacles,this.foods,this.enemies])for(const x of list)x.netId??=++this.sequence;}
 action(id,action){const g=this.games.find(g=>g.id===id);if(!g||this.outcome||this.time<this.startDelay)return false;
  if(action==='jump'){g.jump();return true;}if(action==='power'){g.visibleRight=g.player.x+Math.min(1500,Math.max(700,g.viewWidth))*.57;return g.power.activate(g);}if(['kick','punch'].includes(action))return g.combat.strike(g,action);return false;
 }
 input(id,m){const g=this.games.find(g=>g.id===id);if(g){g.input.running=m.run===true;g.input.lifting=m.lift===true;g.viewWidth=Math.min(1500,Math.max(700,Number(m.width)||1000));g.viewHeight=Math.min(1600,Math.max(620,Number(m.height)||620));}}
 step(dt=1/60){
  if(this.outcome)return;
  const {CONFIG}=this.api;this.tick++;this.time+=dt;
  // Countdown is authoritative: no movement, obstacles or boss attacks until GO.
  // Clients cannot bypass it with early input or power messages.
  if(this.time<this.startDelay)return;
  // Protect the first second and a half after the countdown while players
  // discover the controls. Non-countdown test worlds keep the original grace.
  const graceEnd=this.startDelay?this.startDelay+1.5:6;
  const openingGrace=this.time<graceEnd;
  const lag=(this.games.filter(g=>g.player.catEchoGap==null).length?this.games.filter(g=>g.player.catEchoGap==null):this.games).reduce((a,b)=>a.player.x<b.player.x?a:b);
  // One shared generator, boss, chaser and enemy set for both players.
  const owner=this.generator,savedX=owner.player.x;owner.player.x=Math.max(...this.games.map(g=>g.player.x));owner.obstacles=this.obstacles;owner.foods=this.foods;owner.boss=this.boss;this.spawn(2300);owner.player.x=savedX;this.assignIds();
  lag.chaser=this.chaser;this.chaser.gap=lag.player.x-this.chaser.x;this.boss.update(lag,dt);
  const scale=Math.min(...this.games.map(g=>g.power.worldScale));
  let moved=false;const oldChaserX=this.chaser.x;
  const frozen=this.games.some(g=>g.power.freezeRemaining>0);
  for(const g of this.games){
   g.chaser=this.chaser;this.chaser.gap=g.player.x-this.chaser.x;g.boss=this.boss;g.obstacles=this.obstacles;g.foods=this.foods;g.combat.enemies=this.enemies;
   for(const o of this.obstacles){o.hit=g.hitIds.has(o.netId);o.passed=g.passedIds.has(o.netId);}for(const e of this.enemies)e.contact=g.contactIds.has(e.netId);
   const before=g.player.x,oldGap=this.chaser.gap;g.serverWorldScale=scale;
   // All runners experience Hashi's world slowdown; each power timer uses real time.
   g.update(dt,g.viewWidth);
   moved ||= g.player.x>before;
   for(const o of this.obstacles){if(o.hit)g.hitIds.add(o.netId);if(o.passed)g.passedIds.add(o.netId);}for(const e of this.enemies)if(e.contact)g.contactIds.add(e.netId);
   this.enemies=g.combat.enemies;
   // A hit/pull penalty moves the common pursuer forward, with bounded corrections.
   const penalty=oldGap-this.chaser.gap;
   if(penalty>0&&!frozen&&!openingGrace){
    const ramp=Math.min(1,Math.max(0,(this.time-graceEnd)/3));
    this.chaser.x+=Math.min(30,penalty)*Math.max(.35,ramp);
   }
  }
  this.assignIds();
  const trailing=(this.games.filter(g=>g.player.catEchoGap==null).length?this.games.filter(g=>g.player.catEchoGap==null):this.games).reduce((a,b)=>a.player.x<b.player.x?a:b),k=this.chaser;
  if(!frozen){
   const trailingMoving=trailing.input.running||trailing.power.carrying;
   const base=trailing.profile.speed*(1+trailing.profile.growth*Math.min(1,this.time/120));
   // Use the slowest runner, not any runner, to decide the chase pace.
   // Otherwise a stationary teammate can be caught almost instantly when the other runs.
   const wipe=this.games.some(g=>g.combat.wipe>0),speed=trailingMoving?base-this.boss.pursuitRate()-(wipe?36:0):65;
   if(openingGrace){
    // Keep Kozin visible near the slower player, but never allow a startup catch.
    k.x=Math.min(trailing.player.x-(CONFIG.catchGap+165),Math.max(k.x,trailing.player.x-(CONFIG.startGap+35)));
    }else{
    // Fade in the chase over three seconds instead of jumping to full speed
    // at the exact end of the protected opening. This leaves actual time to react.
    const ramp=Math.min(1,Math.max(0,(this.time-graceEnd)/3));
    k.x+=Math.max(0,speed)*dt*scale*ramp;
   }
   const trail=trailing.trail;while(trail.length>2&&trail[1].x<k.x)trail.shift();
   if(trail.length>1&&k.x>=trail[0].x){const [a,b]=trail;k.y=a.y+(b.y-a.y)*Math.max(0,Math.min(1,(k.x-a.x)/(b.x-a.x||1)));}else k.y=0;
   if(k.y<4)k.phase+=Math.abs(k.x-oldChaserX)/(300*.73/4);
  }else k.x=oldChaserX;
  if(moved)k.energy=Math.max(0,k.energy-CONFIG.burnPerSecond*dt*scale);
  k.shape+=(k.energy/100-k.shape)*Math.min(1,dt*2.8);
  for(const food of this.foods)if(!food.taken&&food.x<k.x+20)trailing.eat(food);
  for(const o of this.obstacles)if(!o.destroyed&&!o.parkour&&k.x>=o.x-o.width/2){o.destroyed=true;trailing.burst(o.x,o.height/2,'#c88e58',18);}
  this.foods=this.foods.filter(f=>!f.taken&&f.x>k.x-150);this.obstacles=this.obstacles.filter(o=>!o.destroyed&&o.x>k.x-400);
  const map=Math.min(this.api.MAPS.length-1,Math.floor(Math.max(0,trailing.player.x-320)/CONFIG.mapLength));
  for(const g of this.games){g.chaser=k;g.boss=this.boss;g.mapIndex=map;g.obstacles=this.obstacles;g.foods=this.foods;g.combat.enemies=this.enemies;}
  k.gap=trailing.player.x-k.x;
  for(const g of this.games)if(g.player.catEchoGap!=null){const p=g.player;p.catEchoGap+=p.x-(p.catEchoLastX??p.x)-(k.x-oldChaserX);p.catEchoLastX=p.x;if(p.x-k.x>=p.catEchoGap){delete p.catEchoGap;delete p.catEchoLastX;}}
  const caught=openingGrace?[]:this.games.filter(g=>(g.player.catEchoGap??g.player.x-k.x)<CONFIG.catchGap&&!g.rescueCat());
  if(caught.length||k.energy<=0){
   const escaped=k.energy<=0;
   const losers=escaped?[]:caught.map(g=>g.id);
   const winners=escaped?this.games.map(g=>g.id):this.games.filter(g=>!losers.includes(g.id)).map(g=>g.id);
   const perPlayer=Object.fromEntries(this.games.map(g=>[g.id,losers.includes(g.id)?'lost':'won']));
   this.outcome={win:escaped,reason:escaped?'escaped':'caught',caught:losers,winners,losers,perPlayer};
   for(const g of this.games)g.finish(perPlayer[g.id]==='won');
  }
  for(const g of this.games)g.events=[];
 }
 snapshot(detached=true){
  const keys=['player','power','score','count','combo','maxCombo','hits','missed','distance','cleared','shield','grace','currentSpeed','celebration','popups','bubbles'];
  const data={protocol:PROTOCOL,tick:this.tick,time:this.time,startDelay:this.startDelay,difficulty:this.difficulty,mapIndex:this.games[0].mapIndex,outcome:this.outcome,chaser:this.chaser,boss:this.boss,obstacles:this.obstacles,foods:this.foods,enemies:this.enemies,players:this.games.map(g=>({id:g.id,name:g.wallet.name,hero:g.wallet.selected,gear:g.gear,run:g.input.running,lift:g.input.lifting,...Object.fromEntries(keys.map(k=>[k,g[k]])),combat:{...g.combat,enemies:undefined},reward:{food:g.wallet.food,xp:g.wallet.xp,best:g.wallet.best}}))};
  // The live WebSocket path serializes this object synchronously in the same
  // event-loop turn. Avoid JSON.stringify -> JSON.parse -> JSON.stringify.
  // External callers retain the old detached snapshot behavior by default.
  return detached?copy(data):data;
 }
}
export const CATALOG=(()=>{const e=engine(1);return {heroes:Object.keys(e.HEROES),gear:e.GEAR,difficulties:Object.keys(e.DIFFICULTIES)};})();
