// The milk course reuses the original characters, controls, powers and jump values.
// Its distance record is local and separate from the city leaderboard.
(() => {
 const ART=__MILK_ART__;
 const rules={easy:{width:170,gap:135,length:24000},normal:{width:130,gap:175,length:30000},hard:{width:94,gap:210,length:36000},impossible:{width:70,gap:255,length:42000}};
 const art={ready:false,images:{},devils:[],intro:[]};
 let loading;
 const shouts=['בוא לפה!!!!!','אמןןןןן','אתה שבור כמו הקול שלי!!!'];
 function shout(g,index){if(g.audio.muted||!globalThis.speechSynthesis)return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(shouts[index]);u.lang='he-IL';u.rate=1.12;u.pitch=.65;u.volume=.8;speechSynthesis.speak(u)}catch{}}
 function loadArt(){return loading??=Promise.all(Object.entries(ART).map(([id,src])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{art.images[id]=im;resolve()};im.onerror=()=>reject(Error('טעינת האיורים נכשלה'));im.src=src}))).then(()=>{
  for(const [id,cols,rows,list] of [['devils',3,2,art.devils],['intro',4,1,art.intro]]){
   const im=art.images[id],w=im.width/cols,h=im.height/rows;
   for(let n=0;n<cols*rows;n++){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,n%cols*w,Math.floor(n/cols)*h,w,h,0,0,w,h);list.push(wardrobe.trim(c));}
  }art.ready=true;
 });}
 const reset=RunnerGame.prototype.reset;
 RunnerGame.prototype.reset=function(){reset.call(this);if(this.mode!=='milk'){this.milk=null;return;}
  const rule=rules[this.difficulty],platforms=[{x:450,width:900,height:95,parkour:true,type:'milkPillar',id:0}];
  const heights=[135,205,145,245,175,110,190,270,195,125,215,150];
  let right=900,n=1;
  while(right<320+rule.length-600){
   const width=rule.width*(n%5===0?1.45:1),height=heights[(n-1)%heights.length];
   const gap=rule.gap+(n%4)*12;
   const x=right+gap+width/2;
   platforms.push({id:n++,x,width,height,parkour:true,type:'milkPillar'});right=x+width/2;
  }
  const end=right+rule.gap+260;
  platforms.push({id:n,x:end-120,width:280,height:160,parkour:true,type:'milkPillar',final:true});
  this.milk={intro:0,introDone:false,clock:0,platforms,end,progress:0,boss:false,transform:0,nextAttack:2.4,warning:null,shots:[],volley:[],speech:0,speechTime:0,attackFlash:0,history:[],collected:new Set(),death:'',transition:0};
  this.player.y=95;this.obstacles=platforms;this.foods=platforms.slice(1,-1).filter((_,i)=>i%2===0).map((o,i)=>({x:o.x,y:o.height+90,type:FOOD[i%FOOD.length],seed:i,taken:false}));
  this.chaser.gap=500;this.chaser.x=-100;this.chaser.energy=100;this.boss.enabled=false;this.combat.nextWave=1e9;
 };
 const start=RunnerGame.prototype.start;
 RunnerGame.prototype.start=function(){start.call(this);if(this.mode==='milk'){this.bubbles=[];this.say('kuzin','הרצפה היא החלב שלי!');}};
 const jump=RunnerGame.prototype.jump;
 RunnerGame.prototype.jump=function(){if(this.mode==='milk'&&!this.milk?.introDone)return;return jump.call(this)};
 const activate=HeroPower.prototype.activate;
 HeroPower.prototype.activate=function(g){
  if(g.mode==='milk'){
   if(!g.milk?.introDone)return false;
   if(g.wallet.selected==='michael'){
    if(g.state!=='playing'||this.cooldown>0||g.milk.clock<3)return false;
    Object.assign(this,{type:'michael',cooldown:HEROES.michael.cooldown,remaining:HEROES.michael.duration,elapsed:0,catUsed:false});g.say('luzo','מיצי שומר עליי!');return true;
   }
  }
  const ok=activate.call(this,g);
  if(ok&&g.mode==='milk'&&this.taxi)this.taxi.targets=[];
  return ok;
 };
 const rescue=RunnerGame.prototype.rescueCat;
 RunnerGame.prototype.rescueCat=function(){
  if(this.mode!=='milk')return rescue.call(this);
  const m=this.milk,q=this.power;if(q.type!=='michael'||q.remaining<=0||q.catUsed||m.clock<3)return false;
  const f=m.history.find(f=>f.at>=m.clock-3);if(!f)return false;
  Object.assign(this.player,f.player,{invincible:.6});m.progress=f.progress;m.shots=[];m.warning=null;m.volley=[];m.nextAttack=2;
  q.remaining=0;q.catUsed=true;q.rewindFlash=.65;this.emit('notice','מיצי החזיר אותך שלוש שניות אחורה!');return true;
 };
 const finish=RunnerGame.prototype.finish;
 RunnerGame.prototype.finish=function(win){
  if(this.mode!=='milk')return finish.call(this,win);
  if(!win&&this.rescueCat())return;
  this.state=win?'winning':'lost';this.celebration=0;this.input.clear();this.bubbles=[];this.milk.transition=0;
  this.audio.effect(win?'win':'lose');this.emit(win?'win':'lose');
  const key='kozin-milk-best-'+this.difficulty;
  try{localStorage.setItem(key,String(Math.max(Number(localStorage.getItem(key))||0,win?100:this.milk.progress)))}catch{}
  this.wallet.gainXP(win?180:Math.min(60,Math.round(this.count*.8)));this.wallet.flush();
 };
 function tickParticles(g,dt){
  for(const p of g.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=300*dt}g.particles=g.particles.filter(p=>p.life>0);
  for(const p of g.popups){p.life-=dt;p.y+=30*dt}g.popups=g.popups.filter(p=>p.life>0);
  for(const b of g.bubbles)b.life-=dt;g.bubbles=g.bubbles.filter(b=>b.life>0);
 }
 function pressure(g){const t=clamp(g.milk.progress/100,0,1),hardest=g.difficulty==='impossible';return {speed:(hardest?360:300)+t*(hardest?260:200),warning:(hardest?1.4:1.7)-t*(hardest?.75:.75),interval:(hardest?5:6)-t*(hardest?3.3:3.1),count:1+Math.floor(t*(hardest?3:2)+.001)};}
 function fire(g,target){const m=g.milk,sx=g.player.x+430,sy=420+Math.sin(m.clock*1.8)*65,dx=target.x-sx,dy=target.y-sy,dist=Math.hypot(dx,dy),speed=pressure(g).speed;
  m.shots.push({x:sx,y:sy,px:sx,py:sy,vx:dx/dist*speed,vy:dy/dist*speed,r:14,life:4});m.attackFlash=.32;g.audio.effect('milk');
 }
 function bossTick(g,dt){const m=g.milk;
  if(!m.boss&&['hard','impossible'].includes(g.difficulty)){m.boss=true;m.transform=1.6;m.nextAttack=4;m.speechTime=3;m.speech=0;g.emit('notice','קוזין הפך לשטן! ההתקפות יתגברו לאורך המסלול');g.audio.effect('map');shout(g,0);}
  if(!m.boss)return;
  m.transform=Math.max(0,m.transform-dt);m.attackFlash=Math.max(0,m.attackFlash-dt);m.speechTime=Math.max(0,m.speechTime-dt);
  if(g.power.freezeRemaining>0)return;
  m.nextAttack-=dt;
  if(m.nextAttack<=0&&!m.warning){
   m.warning={time:pressure(g).warning,x:g.player.x+(g.input.running?g.profile.speed*.45:0),y:g.player.y+65};
   m.speech=(m.speech+1)%3;m.speechTime=2.5;shout(g,m.speech);
  }
  if(m.warning){m.warning.time-=dt;if(m.warning.time<=0){const target=m.warning;fire(g,target);const attack=pressure(g);for(let n=1;n<attack.count;n++)m.volley.push({time:n*.3,target:{x:target.x+n*45,y:target.y+(n%2?60:-30)}});m.warning=null;m.nextAttack=attack.interval;}}
  for(const shot of m.volley)shot.time-=dt;const due=m.volley.filter(s=>s.time<=0);m.volley=m.volley.filter(s=>s.time>0);for(const s of due)fire(g,s.target);
 }
 const update=RunnerGame.prototype.update;
 RunnerGame.prototype.update=function(realDt,width){
  if(this.mode!=='milk')return update.call(this,realDt,width);
  const m=this.milk,p=this.player;if(!m||['paused','loading','menu','over','won'].includes(this.state))return;
  if(this.state==='lost'){this.celebration+=realDt;tickParticles(this,realDt);if(this.celebration>1){this.state='over';this.emit('results')}return;}
  if(this.state==='winning'){m.transition+=realDt;p.phase+=realDt*8;p.flip=0;if(m.transition>4){this.state='won';this.emit('results')}return;}
  if(!m.introDone){m.intro+=realDt;if(m.intro>=4.6){m.introDone=true;this.bubbles=[];this.input.clear();this.emit('notice','הרצפה קטלנית — קפוץ בין העמודים!')}return;}
  this.power.update(this,realDt);const dt=realDt*this.power.worldScale;
  this.time+=dt;m.clock+=dt;this.audio.music(dt);
  const oldX=p.x,oldY=p.y,speed=(this.input.running||this.power.carrying)?this.profile.speed*(p.slow>0?.55:1):0;
  p.x+=speed*dt;this.currentSpeed=speed;p.slow=Math.max(0,p.slow-dt);p.invincible=Math.max(0,p.invincible-dt);p.landing=Math.max(0,p.landing-dt);p.ninja=Math.max(0,p.ninja-dt);p.flip=Math.max(0,p.flip-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
  if(this.power.carrying){p.y=Math.max(270,p.y);p.jumps=1;p.vy=0;}
  else if(this.power.flying){p.vy=clamp(p.vy+(this.input.lifting?700:-280)*dt,-150,320);p.y+=p.vy*dt;p.jumps=1;p.y=Math.min(p.y,620);}
  else{
   const support=m.platforms.find(o=>Math.abs(oldX-o.x)<=o.width/2+5&&Math.abs(oldY-o.height)<.1);
   if(p.jumps===0&&!support){p.jumps=1;p.vy=0;}
   if(p.jumps>0){p.vy-=CONFIG.gravity*(this.heroGravity?.()??1)*dt;p.y+=p.vy*dt;p.airTime+=dt;}
   let landed=false;
   if(p.vy<=0){for(const o of m.platforms){if(oldY>=o.height-.1&&p.y<=o.height&&Math.abs(p.x-o.x)<=o.width/2+5){if(p.jumps>0)p.landing=.16;p.y=o.height;p.vy=0;p.jumps=0;p.flip=0;landed=true;break;}}}
   if(p.jumps===0&&!landed&&!m.platforms.some(o=>Math.abs(p.x-o.x)<=o.width/2+5&&Math.abs(p.y-o.height)<.1)){p.jumps=1;p.vy=0;}
   if(landed&&this.jumpBuffer>0){this.jumpBuffer=0;this.jump();}
   if(['bracha','fahima'].includes(this.power.type)&&this.power.remaining>0&&p.y>this.heroCeiling()){p.y=this.heroCeiling();p.vy=Math.min(0,p.vy);}
  }
  if(p.jumps===0)p.phase+=(p.x-oldX)/30;
  this.distance=Math.max(0,p.x-320);m.progress=clamp(100*this.distance/(m.end-320),0,100);this.chaser.energy=100-m.progress;this.chaser.x=p.x-500;this.chaser.y=0;
  for(const f of this.foods)if(!f.taken&&Math.abs(f.x-p.x)<45&&Math.abs(f.y-p.y-95)<68){this.collect(f);m.collected.add(f.seed)}
  for(const key of ['kickCD','punchCD','spitCD','spitPose','wipe','look','attackTime'])this.combat[key]=Math.max(0,(this.combat[key]||0)-dt);if(this.combat.attackTime===0)this.combat.attack=null;
  bossTick(this,dt);
  for(const s of m.shots){s.px=s.x;s.py=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
   if(Math.abs(s.x-p.x)<s.r+19&&s.y>p.y+8&&s.y<p.y+155&&p.invincible<=0){s.life=0;if(this.shield){this.shield=false;p.invincible=.5;}else{m.death='נפגעת ממתקפת החלב';this.finish(false);break;}}
  }m.shots=m.shots.filter(s=>s.life>0&&s.y>0);
  if(p.y<=12){m.death='נפלת לחלב';this.burst(p.x,15,'#fffaf0',35);this.finish(false);}
  else if(p.x>m.end+170&&p.jumps>0){m.progress=100;this.finish(true);}
  if(this.power.rewindFlash>0)this.power.rewindFlash=Math.max(0,this.power.rewindFlash-dt);
  m.history.push({at:m.clock,player:{...p},progress:m.progress});while(m.history.length>2&&m.history[1].at<m.clock-3.2)m.history.shift();
  tickParticles(this,dt);
 };
 function sprite(c,im,x,y,w,h){if(!im)return;const k=Math.min(w/im.width,h/im.height);c.drawImage(im,x-im.width*k/2,y-im.height*k,im.width*k,im.height*k)}
 function pillar(r,o){const c=r.ctx,x=o.x-r.camera-o.width/2,y=r.ground-o.height,w=o.width;
  const grad=c.createLinearGradient(x,0,x+w,0);grad.addColorStop(0,'#241d32');grad.addColorStop(.45,'#615069');grad.addColorStop(1,'#30213b');
  c.fillStyle=grad;c.fillRect(x,y,w,r.height-y+30);c.strokeStyle='#181725';c.lineWidth=3;c.strokeRect(x,y,w,r.height-y+30);
  r.polygon([[x-5,y],[x+6,y-11],[x+w+5,y-11],[x+w+5,y],[x+w-5,y+9],[x-5,y+9]],o.final?'#e8bc68':'#cfada6','#312135');
  r.line(x+4,y+13,x+w-5,y+13,o.final?'#fff0ab':'#f7d9bd',3);
  for(let j=0;j<5;j++){const yy=y+35+j*49;r.line(x+5,yy,x+w-4,yy+3,'#2e2438');r.line(x+w*(j%2?.3:.66),yy,x+w*(j%2?.3:.66),yy+48,'#2e2438');}
  if(o.id>0){c.save();c.globalAlpha=.6;r.line(x+w*.42,y+36,x+w*.63,y+75,'#ed8059',2);c.restore();}
 }
 function milkSurface(r,g){const c=r.ctx,m=g.milk,fill=m.introDone?1:clamp((m.intro-.8)/2.8,0,1),y=r.ground+80*(1-fill),t=m.clock+m.intro;
  c.save();const grad=c.createLinearGradient(0,y,0,r.height);grad.addColorStop(0,'#fffaf1');grad.addColorStop(1,'#b7d1dc');c.fillStyle=grad;
  c.beginPath();c.moveTo(0,r.height);c.lineTo(0,y);for(let x=0;x<=r.width+30;x+=25)c.lineTo(x,y+Math.sin(x*.017+t*2)*5+Math.sin(x*.04-t)*2);c.lineTo(r.width,r.height);c.closePath();c.fill();
  for(let n=0;n<26;n++){const x=((n*139-r.camera*.16+t*18)%(r.width+80)+r.width+80)%(r.width+80),yy=y+12+n%4*22;r.ellipse(x,yy,14+n%3*7,2,'#ffffffa0');}c.restore();
 }
 function heaven(r,g){const c=r.ctx,t=g.milk.transition,fade=clamp((t-.5)/1.3,0,1);c.fillStyle='#0c0a17';c.fillRect(0,0,r.width,r.height);
  c.save();c.globalAlpha=fade;const grad=c.createLinearGradient(0,0,0,r.height);grad.addColorStop(0,'#5ba9d5');grad.addColorStop(.65,'#d7eff5');grad.addColorStop(1,'#fff7d5');c.fillStyle=grad;c.fillRect(0,0,r.width,r.height);
  const cx=r.width*.63,cy=r.height*.46;c.save();c.globalAlpha=.3;c.fillStyle='#fff6c0';for(let n=0;n<11;n++){const a=n/11*Math.PI*2+t*.04;c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,r.width,a,a+.13);c.closePath();c.fill()}c.restore();
  for(let n=0;n<20;n++){const x=(n*173+t*9)%(r.width+180)-90,y=r.height*.75+n%4*27;r.ellipse(x,y,90,25,'#fffdf1');r.ellipse(x-35,y-15,45,30,'#fffdf1');}
  c.strokeStyle='#cba050';c.lineWidth=12;c.beginPath();c.moveTo(cx-100,r.height*.8);c.lineTo(cx-100,cy);c.arc(cx,cy,100,Math.PI,0);c.lineTo(cx+100,r.height*.8);c.stroke();
  for(let n=-3;n<=3;n++)r.line(cx+n*24,cy-65+Math.abs(n)*8,cx+n*24,r.height*.8,'#e1bd6b',4);
  const saved={x:g.player.x,y:g.player.y,jumps:g.player.jumps};g.player.x=r.camera+r.width*.36;g.player.y=20;g.player.jumps=0;r.character(g,false);Object.assign(g.player,saved);
  r.text('הגעת לגן עדן',r.width/2,90,40,'#fff9d9',true);r.text('100% · ברחת מהחלב של קוזין',r.width/2,137,21,'#fff9d9',true);c.restore();
 }
 const draw=GameRenderer.prototype.draw;
 GameRenderer.prototype.draw=function(g){if(g.mode!=='milk'||g.state==='menu')return draw.call(this,g);
  const c=this.ctx,m=g.milk;c.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,0,0);c.clearRect(0,0,this.width,this.height);c.imageSmoothingEnabled=true;g.visibleRight=this.camera+this.width;
  if(['winning','won'].includes(g.state)){heaven(this,g);return;}
  const bg=art.images.hell;if(bg){const w=Math.max(this.width*1.25,(this.height+60)*bg.width/bg.height),h=w*bg.height/bg.width,left=-(w-this.width)*(.5+.5*Math.sin(this.camera/7000));c.drawImage(bg,left,this.height-h,w,h);}else this.rect(0,0,this.width,this.height,'#391e35');
  c.fillStyle='#1b102735';c.fillRect(0,0,this.width,this.height);
  // Five independently animated silhouettes live in a slower parallax layer.
  for(let n=0;n<7;n++){const world=n*440+Math.floor(this.camera/2800)*2800,pos=((world-this.camera*.38)%(this.width+600)+this.width+600)%(this.width+600)-200,id=n%5,w=[90,145,280,130,180][id],y=this.baseGround-65+Math.sin(m.clock*(id+1)*.65+n)*12;c.save();c.globalAlpha=id===2?.27:.52;sprite(c,art.devils[id],pos,y,w,w*1.35);c.restore();}
  for(let n=0;n<22;n++){const x=(n*97+m.clock*12-this.camera*.1)%this.width,y=(n*53-m.clock*16)%this.height;this.ellipse((x+this.width)%this.width,(y+this.height)%this.height,1.5,3,'#ffac6a88');}
  for(const o of m.platforms)if(o.x+o.width/2>this.camera-20&&o.x-o.width/2<this.camera+this.width+20)pillar(this,o);
  for(const f of g.foods)if(!f.taken&&Math.abs(f.x-this.camera-this.width/2)<this.width/2+40)this.food(f);
  if(m.boss){const bx=g.player.x+430-this.camera,by=this.ground-(420+Math.sin(m.clock*1.8)*65),sz=250+Math.sin(m.clock*3)*6;c.save();if(m.transform>0){c.globalAlpha=m.transform*.24;this.ellipse(bx,by+60,120+m.transform*40,150,'#ed433c');c.globalAlpha=1;}c.translate(bx,0);c.scale(-1,1);sprite(c,art.devils[m.attackFlash>0?5:4],0,by+150,sz,sz);c.restore();if(m.speechTime>0)this.text(shouts[m.speech],Math.min(this.width-200,bx),Math.max(55,by-105),24,'#fff1c6',true);}
  if(m.warning){const x=m.warning.x-this.camera,y=this.ground-m.warning.y;c.save();c.globalAlpha=.65+Math.sin(m.clock*30)*.25;c.strokeStyle='#ffdb91';c.lineWidth=3;c.setLineDash([8,6]);c.beginPath();c.arc(x,y,32,0,Math.PI*2);c.stroke();c.setLineDash([]);this.text('!',x,y,26,'#fff2bb',true);c.restore();}
  for(const s of m.shots){const x=s.x-this.camera,y=this.ground-s.y;this.line(x-s.vx*.05,y+s.vy*.05,x,y,'#e0f0f5aa',s.r*1.6);this.ellipse(x,y,s.r*1.35,s.r,'#fffdf4');this.ellipse(x-3,y-4,5,3,'#ffffff');}
  this.heroEffects(g,true);this.character(g,false);this.heroEffects(g,false);this.combatEffects(g);
  if(!m.introDone){const t=m.intro,frame=t<.8?0:t<1.7?1:t<3.7?2:3,x=Math.min(this.width*.69,860-this.camera),y=this.ground-95;sprite(c,art.intro[frame],x,y,280,300);
   if(t>.9&&t<3.9){for(let n=0;n<2;n++){c.strokeStyle='#fffdf2';c.lineWidth=11+Math.sin(t*22)*3;c.beginPath();c.moveTo(x-22+n*38,y-202);c.quadraticCurveTo(x+80+n*45,y-110,x+100+n*90,this.ground+7);c.stroke();}for(let n=0;n<20;n++){const a=(t*2+n/20)%1;this.ellipse(x+145+Math.sin(n*4)*110*a,this.ground-a*60,3+a*6,5+a*5,'#fffaf2');}}
   this.text('הרצפה היא החלב של קוזין',this.width/2,90,31,'#fff1c4',true);this.text(t<3.6?'עוד רגע מתחילים…':'התכונן לקפוץ!',this.width/2,130,22,'#fff5e2',true);
  }
  milkSurface(this,g);
  for(const p of g.particles){c.globalAlpha=Math.min(1,p.life*2);this.ellipse(p.x-this.camera,this.ground-p.y,p.size,p.size,p.color)}c.globalAlpha=1;
  if(m.introDone&&g.state==='playing'&&m.progress>97)this.text('קפוץ אל הלא נודע!',this.width/2,100,30,'#ffe0a3',true);
  if(g.state==='lost')this.text(m.death,this.width/2,this.height*.36,38,'#fff3d9',true);
 };
 const menu=showMenu;
 showMenu=function(){menu();const area=dom('lobbyStart')?.parentElement;if(!area)return;
  const button=document.createElement('button');button.id='lobbyMilk';button.className='secondary';button.style.cssText='width:100%;min-height:30px;border-radius:9px;margin:4px 0;background:linear-gradient(100deg,#621f35,#a23f36);color:#fff4d9;border:1px solid #e8b46d;font-weight:900';button.textContent='הרצפה היא החלב של קוזין';area.insertBefore(button,dom('lobbyStart'));button.onclick=showMilk;
  dom('lobbyStart').onclick=()=>{game.mode='regular';startGame()};
 };
 function showMilk(){game.state='menu';controls.clear();
  setDialog(`<div class="kicker">KOZIN · MILK PARKOUR</div><h1>הרצפה היא החלב של קוזין</h1><p>קפוץ בין עמודי הגהנום. נפילה לחלב מסיימת את הריצה.<br>בקשה ובבלתי אפשרי, קוזין־שטן מגיע בתחילת המסלול וההתקפות מתחזקות בהדרגה.</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${Object.entries(DIFFICULTIES).map(([id,d])=>`<button class="difficulty-choice ${game.difficulty===id?'selected':''}" data-milk-difficulty="${id}">${d.name}</button>`).join('')}</div><p>ריצה וקפיצה כמו במשחק הרגיל · לחיצה שנייה באוויר לקפיצה כפולה</p><p id="milkLoad" role="status">טוען איורים…</p><button class="primary" id="milkStart" disabled>לגהנום ובחזרה</button><button class="secondary" id="milkBack">חזרה ללובי</button>`,'milkBack',showMenu);
  for(const b of document.querySelectorAll('[data-milk-difficulty]'))b.onclick=()=>{game.difficulty=b.dataset.milkDifficulty;showMilk()};
  loadArt().then(()=>{if(dom('milkStart')){dom('milkStart').disabled=false;dom('milkLoad').textContent='מוכן · '+DIFFICULTIES[game.difficulty].name;dom('milkStart').onclick=()=>{game.mode='milk';startGame();noticeUntil=0;dom('notice').classList.remove('visible')}}}).catch(e=>{if(dom('milkLoad'))dom('milkLoad').textContent=e.message;loading=null});
 }
 const hud=refreshHud;let milkHud=false;
 refreshHud=function(){const active=game.mode==='milk'&&!!game.milk;if(active!==milkHud){milkHud=active;document.querySelector('.meter-heading strong').textContent=active?'הדרך לגן עדן':'שריפת קלוריות';dom('burnBar').parentElement.setAttribute('aria-label',active?'התקדמות במסלול החלב':'התקדמות שריפת הקלוריות');renderer.lastPreview=-1;
   if(active){const c=dom('mapPreview').getContext('2d'),w=c.canvas.width,h=c.canvas.height;c.fillStyle='#a3d8eb';c.fillRect(0,0,w,h);c.fillStyle='#fff8dc';for(let n=0;n<8;n++){c.beginPath();c.ellipse(n*40,h-10,35,20,0,0,Math.PI*2);c.fill()}c.strokeStyle='#c79b44';c.lineWidth=5;c.beginPath();c.moveTo(w/2-28,h-20);c.lineTo(w/2-28,45);c.arc(w/2,45,28,Math.PI,0);c.lineTo(w/2+28,h-20);c.stroke();}
  }if(!active)return hud();const m=game.milk,q=game.power,h=HEROES[game.wallet.selected];
  dom('powerLabel').textContent=h.power;dom('spitTimer').textContent=q.remaining>0?Math.ceil(q.remaining)+' שנ׳':q.cooldown>0?Math.ceil(q.cooldown)+' שנ׳':'מוכן';dom('spit').classList.toggle('active-power',q.remaining>0);dom('spit').classList.toggle('cooling',q.cooldown>0&&q.remaining===0);dom('spit').setAttribute('aria-disabled',String(q.cooldown>0||!m.introDone));
  dom('burn').textContent=Math.floor(m.progress)+'%';dom('burnBar').style.width=m.progress+'%';dom('burnBar').parentElement.setAttribute('aria-valuenow',String(Math.floor(m.progress)));dom('energy').textContent=m.boss?'שטן':'חלב';
  dom('distance').textContent=Math.round(game.distance)+' מ׳';dom('foodCount').textContent='אוכל '+game.wallet.balanceText;dom('clock').textContent=formatTime(game.time);dom('jumpHint').textContent=game.profile.name+' · נפילה לחלב = פסילה';dom('location').textContent='הרצפה היא החלב של קוזין';dom('nextLabel').textContent='היעד';dom('nextName').textContent='גן עדן';dom('bossStatus').textContent=m.boss?'קוזין־שטן · התחמק מהמתקפות':'';dom('bossStatus').classList.toggle('hidden',!m.boss||game.state!=='playing');
 };
 const oldResults=results;
 results=function(){if(game.mode!=='milk')return oldResults();const win=game.state==='won';setDialog(`<div class="kicker">MILK PARKOUR · ${game.profile.name}</div><h1>${win?'ניצחת — הגעת לגן עדן!':game.milk.death}</h1><p>${win?'כל העמודים מאחוריך. קוזין נשאר בגהנום.':'קפוץ מהקצה ושמור את הקפיצה השנייה לתיקון באוויר.'}</p><div class="result-grid"><div class="result-stat"><b>${Math.floor(game.milk.progress)}%</b>מהמסלול</div><div class="result-stat"><b>${formatTime(game.time)}</b>זמן</div><div class="result-stat"><b>${game.count}</b>מאכלים</div></div><button class="primary" id="milkAgain">עוד ניסיון</button><button class="secondary" id="milkMenu">ללובי</button>`,'milkAgain',startGame);dom('milkMenu').onclick=returnToLobby;};
 const lobby=returnToLobby;
 returnToLobby=function(){if(game.mode!=='milk')return lobby();game.wallet.flush();game.mode='regular';game.reset();game.state='menu';controls.clear();renderer.reset(game);showMenu();refreshHud()};
 globalThis.MilkMode={rules,art,loadArt,show:showMilk};
 if(game.state==='menu')showMenu();
})();
