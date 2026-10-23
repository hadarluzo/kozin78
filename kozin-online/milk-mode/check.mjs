export function checkMilk(){
  const ensure=(v,m)=>{if(!v)throw Error(m)},r={routes:[],bosses:[],cooldown:HEROES.fahima.cooldown};
  ensure(document.getElementById('lobbyMilk'),'mode button');ensure(MilkMode.art.devils.length===6,'six devil poses');ensure(MilkMode.art.intro.length===4,'four intro poses');
  game.wallet={selected:'luzo',balance:0,earned:0,level:1,xp:0,owned:new Set(Object.keys(HEROES)),balanceText:'0',earn(){this.balance++},gainXP(){},record(){throw Error('milk wrote city record')},flush(){},save(){}};game.audio.muted=true;
  const boot=d=>{game.mode='milk';game.difficulty=d;game.start();game.input={running:false,lifting:false,clear(){this.running=false}};};
  boot('normal');const x=game.player.x;game.jump();ensure(game.player.jumps===0,'input locked during intro');for(let n=0;n<560;n++)game.update(1/120);ensure(game.milk.introDone&&game.player.x===x,'safe intro');refreshHud();
  for(const d of Object.keys(DIFFICULTIES)){
   boot(d);game.milk.introDone=true;const m=game.milk;m.nextAttack=1e9;let landed=0;
   for(let i=1;i<m.platforms.length;i++){
    const current=m.platforms[i-1],target=m.platforms[i],launch=current.x+current.width/2-18;
    for(let n=0;n<1000&&game.player.x<launch;n++){game.input.running=true;game.update(1/120);}
    game.jump();let ok=false;
    for(let n=0;n<400;n++){
     game.input.running=game.player.x<target.x-3;
     if(game.player.jumps===1&&game.player.vy<40)game.jump();
     game.update(1/120);m.nextAttack=1e9;m.shots=[];m.warning=null;m.volley=[];
     ensure(game.state==='playing',d+' fell at platform '+i+' x='+game.player.x+' y='+game.player.y);
     if(game.player.jumps===0&&Math.abs(game.player.y-target.height)<.1){ok=true;landed++;break;}
    }ensure(ok,d+' could not land '+i);
   }
   const last=m.platforms.at(-1);while(game.player.x<last.x+last.width/2-18){game.input.running=true;game.update(1/120);m.nextAttack=1e9;m.shots=[];}
   game.jump();game.input.running=true;for(let n=0;n<300&&game.state==='playing';n++)game.update(1/120);ensure(game.state==='winning','final leap '+d);for(let n=0;n<500;n++)game.update(1/120);ensure(game.state==='won','heaven ending '+d);r.routes.push({difficulty:d,landed,progress:m.progress});
  }
  for(const d of Object.keys(DIFFICULTIES)){
   boot(d);game.milk.introDone=true;const m=game.milk;game.update(1/120);ensure(m.boss===['hard','impossible'].includes(d),'boss present at start '+d);r.bosses.push({d,boss:m.boss});
   if(m.boss){
    ensure(!m.warning&&!m.shots.length&&m.nextAttack>3.9,'opening grace');let previous=null;
    for(const fraction of [0,.25,.5,.75,.98]){
     const o=fraction===0?m.platforms[0]:m.platforms.find(o=>o.x>=320+(m.end-320)*fraction);game.player.x=o.x;game.player.y=o.height;game.player.vy=0;game.player.jumps=0;m.nextAttack=0;m.warning=null;m.shots=[];m.volley=[];game.update(1/120);ensure(m.warning,'warning before attack');const warning=m.warning.time;
     for(let n=0;n<240&&!m.shots.length;n++)game.update(1/120);ensure(m.shots.length,'milk projectile');const shot=m.shots[0],current={warning,speed:Math.hypot(shot.vx,shot.vy),interval:m.nextAttack,count:m.shots.length+m.volley.length};
     if(previous)ensure(current.warning<previous.warning&&current.speed>previous.speed&&current.interval<previous.interval&&current.count>=previous.count,'progressively harder '+d);else ensure(current.count===1,'single opening shot');previous=current;
    }
   }
  }
  boot('normal');game.milk.introDone=true;game.player.x=1000;game.player.y=5;game.player.jumps=1;game.update(1/120);ensure(game.state==='lost','milk fall is lethal');
  boot('hard');game.milk.introDone=true;game.milk.shots.push({x:game.player.x,y:game.player.y+60,vx:0,vy:0,r:14,life:1});game.update(1/120);ensure(game.state==='lost','projectile hit is lethal');
  boot('normal');game.milk.introDone=true;const before=game.milk.clock;game.pause();game.update(3);ensure(game.milk.clock===before,'pause clock');game.resume();game.wallet.selected='fahima';ensure(game.power.activate(game),'car activation');ensure(game.power.cooldown===60,'minute cooldown');game.power.update(game,59.9);ensure(!game.power.activate(game),'cannot reactivate early');game.power.update(game,.11);ensure(game.power.activate(game),'reactivate after minute');
  return r;
}

