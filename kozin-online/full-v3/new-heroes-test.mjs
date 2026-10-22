import assert from 'node:assert/strict';
import {FullWorld,CATALOG} from './world-v3.mjs';
const make=(hero='michael')=>new FullWorld([{id:'a',hero,name:'A',gear:{}},{id:'b',hero:'moreno',name:'B',gear:{}}],'normal',101);
const clear=w=>{w.spawn=()=>{};w.obstacles=[];w.foods=[];w.enemies=[];for(const g of w.games){g.spawn=()=>{};g.obstacles=[];g.foods=[];g.combat.enemies=[];g.combat.spawnClock=1e9;}};
assert(CATALOG.heroes.includes('bracha')&&CATALOG.heroes.includes('fahima'));
{
 const w=make('bracha');clear(w);const g=w.games[0];assert.equal(w.api.HEROES.bracha.price,2500);
 assert(w.action('a','power'));assert.equal(g.power.cooldown,50);w.action('a','jump');assert.equal(g.player.vy,750);
 for(let n=0;n<18;n++)w.step();assert(g.player.y>160);assert(g.player.y<=g.heroCeiling());
 for(let n=0;n<253;n++)w.step();assert.equal(g.power.remaining,0);assert(!w.action('a','power'));
}
{
 const w=make('fahima');clear(w);const g=w.games[0];assert.equal(w.api.HEROES.fahima.price,2500);
 assert(w.action('a','power'));assert.equal(g.power.remaining,6);w.action('a','jump');assert.equal(g.player.vy,620);
 w.step();w.action('a','jump');assert(g.power.boostUsed);assert.equal(g.power.remaining,3.9);
 for(let n=0;n<44;n++)w.step();assert(g.player.y>=1000);assert(g.power.boostTime>0);
 for(let n=0;n<11;n++)w.step();assert.equal(g.power.carStage,'coast');assert(g.power.remaining<3.01&&g.power.remaining>2.9);
 const remaining=g.power.remaining;w.action('a','jump');assert.equal(g.power.remaining,remaining,'no second boost');
 for(let n=0;n<181;n++)w.step();assert.equal(g.power.remaining,0);
 const noBoost=make('fahima');clear(noBoost);noBoost.action('a','power');for(let n=0;n<361;n++)noBoost.step();assert.equal(noBoost.games[0].power.remaining,0);
}
{
 const w=make();clear(w);const g=w.games[0];assert(!w.action('a','power'),'history must be available');assert.equal(g.power.cooldown,0);
 const positions=[];
 for(let n=0;n<240;n++){g.player.x=320+n*3;w.step();positions.push({...g.player});}
 assert(w.action('a','power'));assert.equal(g.power.cooldown,70);assert.equal(g.power.freezeRemaining,0);
 for(let n=0;n<60;n++){g.player.x+=3;w.step();positions.push({...g.player});}
 const friend=JSON.stringify(w.games[1].player),chaser=JSON.stringify(w.chaser),wallet=JSON.stringify(g.wallet);
 const expected=positions[119];assert(g.rescueCat());assert(Math.abs(g.player.x-expected.x)<.001,'exact three second rewind');
 assert.equal(JSON.stringify(w.games[1].player),friend);assert.equal(JSON.stringify(w.chaser),chaser);assert.equal(JSON.stringify(g.wallet),wallet);
 assert.equal(g.power.remaining,0);assert(!g.rescueCat());assert(g.player.catEchoGap>82);
 w.step();assert.equal(w.outcome,null,'personal chase prevents immediate recatch');
 const snapshot=w.snapshot();assert(snapshot.players[0].player.rewindSerial===1);assert(!JSON.stringify(snapshot).includes('frames'));
}
{
 const w=make();clear(w);const g=w.games[0];g.networked=false;g.input.running=true;
 for(let n=0;n<240;n++)g.update(1/60);
 g.power.activate(g);const f={x:g.player.x,y:95,type:'pizza',seed:100,taken:false};g.foods=[f];g.update(1/60);
 const food=g.wallet.food,xp=g.wallet.xp,score=g.score;
 for(let n=0;n<59;n++)g.update(1/60);
 assert(g.rescueCat());assert.equal(g.wallet.food,food);assert.equal(g.wallet.xp,xp);assert.equal(g.score,score);
 assert(!g.foods.some(v=>v.seed===100&&!v.taken),'consumed food cannot return');
}
console.log('PASS new heroes: prices, gravity, timed single car boost, cat exact rewind, no shared rewind, no duplicate rewards');
