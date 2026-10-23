export function checkMilk(){
 const ensure=(v,m)=>{if(!v)throw Error(m)},r={routes:[],battles:[],specials:[],heroes:[],cooldown:HEROES.fahima.cooldown};
 ensure(document.getElementById('lobbyMilk'),'mode button');ensure(MilkMode.art.devils.length===6,'devil art');
 game.wallet={selected:'luzo',balance:0,earned:0,level:1,xp:0,owned:new Set(Object.keys(HEROES)),balanceText:'0',earn(){this.balance++},gainXP(){},record(){if(game.mode==='milk')throw Error('milk wrote city record')},flush(){},save(){}};game.audio.muted=true;
 const boot=(d='normal')=>{game.mode='milk';game.difficulty=d;game.start();game.input={running:false,lifting:false,clear(){this.running=false}};};
 const quiet=()=>{const m=game.milk;m.nextAttack=1e9;m.nextMinion=1e9;m.nextSpecial=1e9;m.warning=null;m.volley=[];m.shots=[];m.minions=[];m.special=null;m.beam=null;};
 const step=(n=1)=>{for(let i=0;i<n;i++)game.update(1/120)};
 boot();game.jump();ensure(game.player.jumps===0,'intro input locked');step(560);ensure(game.milk.introDone,'intro completes');
 for(const d of Object.keys(DIFFICULTIES)){
  boot(d);game.milk.introDone=true;step();const m=game.milk;ensure(m.boss,'boss at start '+d);ensure(m.hp===m.maxHp&&m.hearts>=3,'health initialized');m.autoFire=false;quiet();
  let landed=0;for(let i=1;i<=12;i++){const current=m.platforms[i-1],target=m.platforms[i],launch=current.x+current.width/2-18;
   for(let n=0;n<1000&&game.player.x<launch;n++){game.input.running=true;step();}
   game.jump();let ok=false;for(let n=0;n<400;n++){game.input.running=game.player.x<target.x-3;if(game.player.jumps===1&&game.player.vy<40)game.jump();step();ensure(game.state==='playing','parkour death '+d);if(game.player.jumps===0&&Math.abs(game.player.y-target.height)<.1){ok=true;landed++;break;}}ensure(ok,'unreachable column '+d);
  }r.routes.push({difficulty:d,landed});
  const oldEnd=m.end;game.player.x=oldEnd+171;game.player.y=400;game.player.jumps=1;step();ensure(game.state==='playing'&&m.end>oldEnd,'distance cannot win; course extends');
  boot(d);game.milk.introDone=true;step();quiet();let frames=0;while(game.state==='playing'&&frames++<16000)step();ensure(game.state==='winning','energy can defeat boss '+d);ensure(game.milk.hp===0&&game.milk.progress===100,'boss dead');step(500);ensure(game.state==='won','heaven after boss death');r.battles.push({difficulty:d,seconds:frames/120});
 }
 for(const hero of Object.keys(HEROES)){game.wallet.selected=hero;boot();game.milk.introDone=true;step();quiet();const hp=game.milk.hp;step(240);ensure(game.milk.hp<hp,'hero can shoot '+hero);r.heroes.push(hero);}game.wallet.selected='luzo';
 boot();game.milk.introDone=true;step();quiet();const m=game.milk;document.getElementById('punch').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));ensure(!m.autoFire,'touch disables autofire');m.bullets=[];step(60);ensure(!m.bullets.length,'no bullets while disabled');document.getElementById('punch').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));ensure(m.autoFire,'touch enables autofire');
 boot();game.milk.introDone=true;step();quiet();game.milk.nextMinion=.001;game.milk.nextSpecial=.001;step();ensure(game.milk.minions.length===1&&game.milk.special,'natural enemy and special scheduling');
 for(let index=0;index<4;index++){
  boot();game.milk.introDone=true;step();quiet();const m=game.milk,p=game.player;m.autoFire=false;m.special={index,time:.5,x:p.x,y:p.y+75};step(30);ensure(m.special&&!m.shots.length&&!m.beam,'special warning '+index);step(35);ensure(index===3?!!m.beam:m.shots.length>0,'special resolves '+index);
  const target=index===3?m.beam:m.shots[0];target.hp=4;m.bullets.push({x:target.x,y:target.y,vx:0,vy:0,r:7,life:1,target});step();ensure(target.hp<=0,'special destructible '+index);r.specials.push(index);
 }
 for(const type of ['fat','muscle']){boot();game.milk.introDone=true;step();quiet();const m=game.milk,p=game.player,e={type,x:p.x+200,y:p.y+100,baseY:p.y+100,age:0,hp:4,maxHp:4,r:30,spawn:0,life:12};m.autoFire=false;m.minions.push(e);m.bullets.push({x:e.x,y:e.y,vx:0,vy:0,r:7,life:1,target:e});step();ensure(m.kills===1&&m.minions.length===0,'kill '+type);}
 boot();game.milk.introDone=true;step();quiet();game.milk.autoFire=false;const hp=game.milk.hearts,p=game.player;
 for(let i=0;i<2;i++)game.milk.shots.push({x:p.x,y:p.y+75,vx:0,vy:0,r:14,life:1});step();ensure(game.milk.hearts===hp-1&&game.state==='playing','one hit with invulnerability');
 const before=game.milk.clock;game.pause();game.update(3);ensure(game.milk.clock===before,'pause freezes fight');game.resume();
 game.player.x=1000;game.player.y=5;game.player.jumps=1;step();ensure(game.state==='lost','milk remains lethal');
 boot();game.milk.introDone=true;game.wallet.selected='fahima';ensure(game.power.activate(game),'car activation');ensure(game.power.cooldown===60,'minute cooldown');
 refreshHud();ensure(document.getElementById('punch').textContent.includes('ירי'),'shoot HUD');game.mode='regular';game.reset();refreshHud();ensure(document.getElementById('punch').textContent.includes('אגרוף'),'original controls restored');
 return r;
}

