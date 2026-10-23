// Included inside the milk-mode closure by build.mjs. Original modes never enter these hooks.
const battleRules={easy:{hp:700,hearts:5,rate:1.3},normal:{hp:900,hearts:4,rate:1.1},hard:{hp:1100,hearts:3,rate:1},impossible:{hp:1350,hearts:3,rate:.82}};
const specialNames=['ירח החלב — ירה כדי לפוצץ!','גשם חלב — זוז מהסימונים!','מניפת חלב — פרוץ דרך בירי!','קרן החלב — קפוץ או השמד את הליבה!'];
function initBattle(g){const m=g.milk,r=battleRules[g.difficulty];Object.assign(m,{hp:r.hp,maxHp:r.hp,hearts:r.hearts,maxHearts:r.hearts,autoFire:true,fireCD:0,bullets:[],minions:[],nextMinion:6,nextSpecial:9,specialIndex:0,special:null,beam:null,kills:0,hitFlash:0,bossHit:0,phase:1});}
function bossPoint(g){return {x:g.player.x+430,y:220+Math.sin(g.milk.clock*1.8)*25};}
function hitPlayer(g,reason){const m=g.milk,p=g.player;if(g.state!=='playing'||p.invincible>0)return;
 if(g.shield){g.shield=false;p.invincible=1;return;}
 if(m.hearts<=1&&g.rescueCat()){m.hearts=1;return;}
 m.hearts--;m.hitFlash=.25;p.invincible=1.35;g.burst(p.x,p.y+75,'#ffd2bc',12);
 if(m.hearts<=0){m.death=reason;g.finish(false);}
}
function segmentHit(ax,ay,bx,by,x,y,r){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?clamp(((x-ax)*dx+(y-ay)*dy)/l,0,1):0;return Math.hypot(ax+dx*t-x,ay+dy*t-y)<=r;}
function milkBall(g,x,y,tx,ty,speed,r,hp,kind='orb'){const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy)||1;const s={x,y,px:x,py:y,vx:dx/d*speed,vy:dy/d*speed,r,hp,life:7,kind};g.milk.shots.push(s);return s;}
function beginSpecial(g,index){const m=g.milk;m.special={index,time:index===3?2:1.5,x:g.player.x,y:g.player.y+68};m.attackFlash=1.5;g.emit('notice',specialNames[index]);}
function releaseSpecial(g,s){const m=g.milk,b=bossPoint(g),t=m.progress/100;
 if(s.index===0)milkBall(g,b.x,b.y,s.x,s.y,180+t*100,48,16,'giant');
 if(s.index===1)for(let i=0;i<5;i++){const q=milkBall(g,s.x-150+i*100,700+i*75,s.x-150+i*100,-30,280+t*100,24,4,'rain');q.life=9;}
 if(s.index===2){const a=Math.atan2(s.y-b.y,s.x-b.x);for(let i=-3;i<=3;i++){const angle=a+i*.22;milkBall(g,b.x,b.y,b.x+Math.cos(angle)*600,b.y+Math.sin(angle)*600,240+t*100,21,4,'fan');}}
 if(s.index===3)m.beam={x:b.x,y:s.y,hp:24,charge:1,life:2.1,r:30};
}
function battleTick(g,dt){const m=g.milk,p=g.player,r=battleRules[g.difficulty];m.hitFlash=Math.max(0,m.hitFlash-dt);m.bossHit=Math.max(0,m.bossHit-dt);
 const phase=m.hp/m.maxHp>.66?1:m.hp/m.maxHp>.33?2:3;if(phase!==m.phase){m.phase=phase;g.emit('notice','קוזין זועם — שלב '+phase);g.burst(p.x+430,365,'#ffb04d',22);}
 if(!(g.power.freezeRemaining>0)){
  m.nextMinion-=dt;m.nextSpecial-=dt;
  if(m.nextMinion<=0&&m.minions.length<5){const fat=m.kills%2===0,type=(Math.floor(m.clock/6)%2===0)?'muscle':'fat';m.minions.push({type,x:p.x+600,y:p.y+95+(fat?60:0),baseY:p.y+95,age:0,hp:type==='fat'?28:16,maxHp:type==='fat'?28:16,r:type==='fat'?39:29,spawn:.9,life:12});m.nextMinion=(6-m.progress*.025)*r.rate;}
  if(m.nextSpecial<=0&&!m.special&&!m.beam){beginSpecial(g,m.specialIndex++%4);m.nextSpecial=(11-m.progress*.035)*r.rate;}
  if(m.special){m.special.time-=dt;if(m.special.time<=0){releaseSpecial(g,m.special);m.special=null;}}
 }
 for(const e of m.minions){if(g.power.freezeRemaining>0)continue;e.age+=dt;e.spawn=Math.max(0,e.spawn-dt);e.life-=dt;if(e.spawn===0){e.x-=(e.type==='muscle'?150:95)*dt;e.y=e.baseY+Math.sin(e.age*3)*38;if(Math.abs(e.x-p.x)<e.r+19&&Math.abs(e.y-p.y-75)<e.r+55){hitPlayer(g,'שד קטן תפס אותך');e.life=0;}}}
 m.minions=m.minions.filter(e=>e.life>0&&e.hp>0&&e.x>p.x-350);
 m.fireCD-=dt;if(m.autoFire&&m.fireCD<=0&&m.boss){shootEnergy(g);m.fireCD=.22;}
 for(const q of m.bullets){const target=q.target==='boss'?bossPoint(g):q.target;
  if(target&& (q.target==='boss'||target.hp>0)){const dx=target.x-q.x,dy=target.y-q.y,d=Math.hypot(dx,dy)||1;q.vx=dx/d*1400;q.vy=dy/d*1400;}
  const ax=q.x,ay=q.y;q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;
  const candidates=[...m.shots.filter(s=>s.hp>0&&s.life>0),...m.minions.filter(e=>e.hp>0&&e.spawn<=0),...(m.beam&&m.beam.hp>0?[m.beam]:[])];
  let hit=candidates.find(e=>segmentHit(ax,ay,q.x,q.y,e.x,e.y,e.r+q.r));
  if(hit){hit.hp-=4;q.life=0;g.burst(q.x,q.y,'#8df7ff',4);if(hit.hp<=0){hit.life=0;g.burst(hit.x,hit.y,hit.type?'#ff9a69':'#fff7df',12);if(hit.type)m.kills++;}}
  else{const b=bossPoint(g);if(segmentHit(ax,ay,q.x,q.y,b.x,b.y,65)){m.hp=Math.max(0,m.hp-4);m.bossHit=.09;q.life=0;g.burst(q.x,q.y,'#ffda80',3);}}
 }
 m.bullets=m.bullets.filter(q=>q.life>0);m.shots=m.shots.filter(q=>q.life>0);m.minions=m.minions.filter(q=>q.hp>0&&q.life>0);
 m.progress=100*(1-m.hp/m.maxHp);
 if(m.hp<=0){m.shots=[];m.minions=[];m.special=null;m.beam=null;m.bullets=[];g.finish(true);return;}
 if(m.beam){const beam=m.beam;beam.life-=dt;beam.charge-=dt;if(beam.hp<=0||beam.life<=0)m.beam=null;
  else if(beam.charge<=0&&p.x<beam.x&&Math.abs(p.y+75-beam.y)<65)hitPlayer(g,'נפגעת מקרן החלב');}
 // Keep parkour available until the boss dies: distance alone never wins the fight.
 if(p.x>m.platforms.at(-1).x-1800){const last=m.platforms.at(-1),rule=rules[g.difficulty];for(let i=0;i<12;i++){const prev=m.platforms.at(-1);m.platforms.push({id:prev.id+1,x:prev.x+prev.width/2+rule.gap+rule.width/2,width:rule.width,height:[140,210,160,240][i%4],parkour:true,type:'milkPillar'});}m.end=m.platforms.at(-1).x+200;}
}
function shootEnergy(g){const m=g.milk,p=g.player,b=bossPoint(g);let target='boss';
 const threats=[...(m.beam&&m.beam.hp>0?[m.beam]:[]),...m.shots.filter(s=>s.hp>0&&s.life>0&&Math.abs(s.x-p.x)<540),...m.minions.filter(e=>e.hp>0&&e.spawn<=0&&Math.abs(e.x-p.x)<600)];
 threats.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y-75)-Math.hypot(b.x-p.x,b.y-p.y-75));if(threats.length)target=threats[0];
 const t=target==='boss'?b:target,dx=t.x-p.x-22,dy=t.y-p.y-85,d=Math.hypot(dx,dy)||1;
 m.bullets.push({x:p.x+22,y:p.y+85,vx:dx/d*1400,vy:dy/d*1400,r:7,life:2,target});
 g.combat.attack='punch';g.combat.attackTime=.12;g.burst(p.x+25,p.y+85,'#85edff',2);
}
function drawBattle(r,g){const m=g.milk,c=r.ctx,b=bossPoint(g),x=b.x-r.camera,y=r.ground-b.y;
 if(m.bossHit>0){c.save();c.globalAlpha=.5;r.ellipse(x,y,72,90,'#fff1af');c.restore();}
 for(const e of m.minions){const ex=e.x-r.camera,ey=r.ground-e.y;c.save();c.globalAlpha=e.spawn>0?.35:1;sprite(c,art.devils[e.type==='fat'?0:1],ex,ey+e.r+22,e.r*2.8,e.r*3);c.restore();r.rect(ex-22,ey-e.r-24,44,5,'#321629');r.rect(ex-22,ey-e.r-24,44*e.hp/e.maxHp,5,'#ffb96d');if(e.spawn>0)r.text('!',ex,ey-65,23,'#ffdd96',true);}
 for(const q of m.bullets){const ex=q.x-r.camera,ey=r.ground-q.y;r.line(ex-q.vx*.018,ey+q.vy*.018,ex,ey,'#4ad6ff88',12);r.ellipse(ex,ey,10,8,'#36cafa');r.ellipse(ex,ey,5,4,'#efffff');}
 if(m.special){const s=m.special;c.save();c.globalAlpha=.35+Math.sin(m.clock*25)*.12;
  if(s.index===1)for(let i=0;i<5;i++){const ex=s.x-150+i*100-r.camera;r.rect(ex-22,0,44,r.ground,'#ffad48');}
  else if(s.index===3)r.rect(0,r.ground-s.y-24,r.width,48,'#ffb043');
  else{c.strokeStyle='#ffd992';c.lineWidth=5;c.beginPath();c.arc(x,y,80+(1.5-s.time)*30,0,Math.PI*2);c.stroke();}
  c.restore();r.text(specialNames[s.index],r.width/2,120,21,'#fff3c4',true);
 }
 if(m.beam){const beam=m.beam,by=r.ground-beam.y,bx=beam.x-r.camera;c.save();c.globalAlpha=beam.charge>0?.35:1;r.rect(0,by-23,bx,46,beam.charge>0?'#ffd289':'#d9f6ff');if(beam.charge<=0)r.rect(0,by-10,bx,20,'#fffef6');r.ellipse(bx,by,34,34,'#ffe8b2');r.ellipse(bx,by,24,24,'#fffef4');c.restore();}
 if(m.introDone){const w=Math.min(430,r.width*.48),left=(r.width-w)/2;r.rect(left-8,12,w+16,59,'#1a1327e8');r.rect(left,41,w,17,'#52263c');r.rect(left,41,w*m.hp/m.maxHp,17,m.phase===3?'#ff654e':'#e8a85c');r.text('קוזין השטן · שלב '+m.phase+' · '+Math.ceil(m.hp)+' / '+m.maxHp,r.width/2,31,17,'#fff1d2',true);r.text('♥'.repeat(Math.max(0,m.hearts))+'♡'.repeat(m.maxHearts-m.hearts),90,39,25,'#ff9b99',true);}
 if(m.hitFlash>0){c.save();c.globalAlpha=m.hitFlash;r.rect(0,0,r.width,r.height,'#ff624c');c.restore();}
}
const punchButton=dom('punch'),oldPunchLabel=punchButton.innerHTML;
const battleStyle=document.createElement('style');battleStyle.textContent='body.milk-battle #hud,body.milk-battle #location,body.milk-battle #bossStatus,body.milk-battle #kick{display:none!important}body.milk-battle #subhud{top:60px;left:12px;right:auto}body.milk-battle #notice{top:98px;max-width:70%;font-size:12px}body.milk-battle #punch{border-color:#85ebff;background:linear-gradient(#164c63,#092437)}body.milk-battle #jumpHint{font-size:10px}';document.head.appendChild(battleStyle);
punchButton.addEventListener('pointerdown',e=>{if(game.mode!=='milk')return;e.preventDefault();e.stopImmediatePropagation();if(game.state==='playing'&&game.milk.introDone)game.milk.autoFire=!game.milk.autoFire;},true);
document.addEventListener('keydown',e=>{if(game.mode==='milk'&&e.code==='KeyF'&&!e.repeat&&game.state==='playing'&&game.milk.introDone){e.preventDefault();game.milk.autoFire=!game.milk.autoFire;}});
