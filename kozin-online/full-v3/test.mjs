import assert from 'node:assert/strict';
import {FullWorld,CATALOG} from './world-v3.mjs';
const profiles=(a='luzo',b='michael')=>[{id:'a',name:'א',hero:a,gear:{outfit:'dogs',feet:'kozinshoe',fringe:'tekhelet'}},{id:'b',name:'ב',hero:b,gear:{outfit:'tech',head:'kippah'}}];
for(const hero of CATALOG.heroes){const w=new FullWorld(profiles(hero,'michael'),'hard',77);w.action('a','power');for(let i=0;i<10;i++)w.step();assert.equal(w.games[0].power.type,hero);assert(w.snapshot().players[0].gear.outfit==='dogs');}
for(const hero of ['michael','moreno']){const w=new FullWorld(profiles(hero),'hard',1);w.action('a','power');const x=w.chaser.x;for(let i=0;i<60;i++){w.step();assert.equal(w.chaser.x,x);}assert.equal(w.games[0].power.freezeRemaining,0);w.time=2;w.step();assert(w.chaser.x>x);}
{
 const w=new FullWorld(profiles(),'hard',2),f=w.foods[0];w.games.forEach(g=>{g.player.x=f.x;g.player.y=f.y-95;});w.step();assert.equal(w.games.reduce((n,g)=>n+g.count,0),1);assert.equal(w.games.reduce((n,g)=>n+g.wallet.food,0),1);assert(!w.foods.includes(f));
}
{
 const w=new FullWorld(profiles('eyal'),'hard',3);w.action('a','power');const targets=w.games[0].power.taxi.targets;for(let i=0;i<100;i++)w.step();assert(targets.every(o=>o.destroyed));
}
{
 const w=new FullWorld(profiles('tzippy'),'hard',4);w.games[0].player.x=800;w.obstacles=[{x:840,height:180,width:60,parkour:true,netId:999}];w.action('a','power');for(let i=0;i<30;i++)w.step();assert(w.games[0].player.x>840);assert(w.games[0].power.carrying);
}
{
 const w=new FullWorld(profiles(),'hard',5);w.chaser.energy=49;w.step();assert(w.boss.transformed);assert.equal(w.snapshot().boss.transformed,true);w.boss.activate(w.games[0],'perfume');w.step();assert.equal(w.games[1].boss.active,'perfume');
}
{
 const w=new FullWorld(profiles(),'normal',7);w.input('a',{run:true});w.input('b',{run:false});for(let i=0;i<60;i++)w.step();assert(w.games[0].player.x>w.games[1].player.x);assert(w.games[0].player.x-w.chaser.x>200,'no double chaser movement');
}
{
 const w=new FullWorld(profiles('luzo','tzippy'),'normal',2026);
 const initial=w.snapshot();
 assert.equal(initial.players[0].hero,'luzo');
 assert.equal(initial.players[1].hero,'tzippy','remote selected hero must remain in snapshots');
 assert.equal(initial.players[1].gear.outfit,'tech','remote wardrobe must remain in snapshots');
 for(let i=0;i<359;i++){w.step();assert.equal(w.outcome,null,'no immediate Kozin catch during protected online opening');}
 assert(w.games.every(g=>g.player.x-w.chaser.x>82),'both runners have safe gap at start');
 for(let i=0;i<350&&!w.outcome;i++)w.step();
 assert.equal(w.outcome?.reason,'caught','Kozin must resume pursuit after grace period');
}
assert.equal(CATALOG.gear.length,13);console.log('PASS full engine: 8 heroes, 13 cosmetics, freeze, carry, taxi, shared food, Buddha, independent runners');
