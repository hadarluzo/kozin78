// Run-only atlases for base AND shop outfits. Action poses and powers stay intact.
const runAnimation={
 ready:false,outfits:['base','tech','fahima','dogs','paisley'],frames:{},legacyCostumes:{},
 async load(){
  await Promise.all(['michael','tzippy'].flatMap(id=>this.outfits.map(async outfit=>{
   const name=id+(outfit==='base'?'':'-'+outfit)+'-run';
   const atlas=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src='kozin-online/new-heroes/'+name+'.webp';});
   const cw=atlas.width/4,ch=atlas.height/2;
   const crops=Array.from({length:8},(_,n)=>{
    const c=newHeroes.crop(atlas,n%4*cw,Math.floor(n/4)*ch,cw,ch);newHeroes.isolate(c);
    const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let l=c.width,r=0,t=c.height,b=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>100){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
    let headX=0,count=0;
    for(let y=t;y<t+(b-t)*.15;y++)for(let x=l;x<=r;x++)if(d[(y*c.width+x)*4+3]>160){headX+=x;count++;}
    return {c,l,r,t,b,headX:count?headX/count:(l+r)/2};
   });
   // One scale for the entire cycle, never stretch each bent pose to full height.
   // Contact frames determine floor height; the passing/flight feet may lift.
   const contactHeight=Math.max(crops[0].b-crops[0].t+1,crops[4].b-crops[4].t+1);
   const scale=Math.min(300/contactHeight,400/Math.max(...crops.map(f=>f.r-f.l+1)));
   const lift=[0,2,5,3,0,2,5,3];
   const frames=crops.map((f,n)=>{
    const c=newHeroes.canvas(448,384),x=c.getContext('2d');
    x.drawImage(f.c,248-f.headX*scale,35-lift[n]-f.t*scale,f.c.width*scale,f.c.height*scale);
    return c;
   });
   (this.frames[id]??={})[outfit]=frames;
   if(outfit==='base'){
    this[id]=frames;
    for(let n=0;n<8;n++)assets.heroFrames[id][n]=frames[n];
   }else{
    (this.legacyCostumes[id]??={})[outfit]=wardrobe.costumes[id][outfit].slice(8);
    for(let n=0;n<8;n++)wardrobe.costumes[id][outfit][n]=frames[n];
   }
  })));
  this.ready=true;
 }
};
// Whole-body authored sprites: each outfit has its own matching face and poses.
// Packed to one 448x384 coordinate system at build time; no per-frame stretching.
const newHeroes={
 ready:false,powerFrames:{},powerCache:new WeakMap(),outfits:['base','tech','fahima','dogs','paisley'],
 canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;},
 crop(image,x,y,w,h){const c=this.canvas(w,h);c.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);return c;},
 async load(){
  const load=name=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src='kozin-online/new-heroes/'+name+'.webp';});
  await Promise.all(['bracha','fahima'].map(async id=>{
   wardrobe.costumes[id]={};this.powerFrames[id]={};
   await Promise.all(this.outfits.map(async outfit=>{
    const [atlas,power]=await Promise.all([load(id+'-'+outfit+'-redrawn'),load(id+'-'+outfit+'-power')]);
    const frames=Array.from({length:12},(_,n)=>this.crop(atlas,n%4*448,Math.floor(n/4)*384,448,384));
    frames.referenceHeight=300;
    if(outfit==='base'){assets.heroFrames[id]=frames;assets.heroPortraits[id]=wardrobe.trim(frames[8]);}
    else wardrobe.costumes[id][outfit]=frames;
    this.powerFrames[id][outfit]=Array.from({length:id==='bracha'?8:4},(_,n)=>this.crop(power,n%4*448,Math.floor(n/4)*384,448,384));
   }));
  }));
  const puff=await load('bracha-puff-intro');this.puffFrames={};
  this.outfits.forEach((outfit,row)=>this.puffFrames[outfit]=Array.from({length:4},(_,n)=>this.crop(puff,n*448,row*384,448,384)));
  const props=await load('powers');this.props=[];
  for(let n=0;n<12;n++)this.props.push(wardrobe.trim(this.crop(props,n%4*384,Math.floor(n/4)*1024/3,384,1024/3)));
  await runAnimation.load();this.ready=true;wardrobe.portraitCache.clear();
 },
 powerFrame(id,n,gear=wardrobe.equipped){
  const source=this.powerFrames[id][gear.outfit||'base'][n];
  let cache=this.powerCache.get(source);if(!cache){cache=new Map();this.powerCache.set(source,cache);}
  const key=JSON.stringify(gear);if(cache.has(key))return cache.get(key);
  let frame;
  if(id==='bracha'){
   const pose=n<4?n:n+4,kind=n===4?'idle':n===5?'jump':n===6?'punch':n===7?'kick':'run';
   frame=wardrobe.fit(source,kind,pose,{head:gear.head,feet:gear.feet});
   if(gear.fringe==='tekhelet')frame=drop2.fringes(frame,pose,id);
  }else{
   // Car paint and headlights must never enter the automatic white-shoe mask.
   frame=this.crop(wardrobe.fit(source,'run',0,{head:gear.head}),0,0,448,384);
   const ctx=frame.getContext('2d'),d=source.getContext('2d').getImageData(0,0,448,384).data;
   if(gear.feet){
    let l=448,r=0,t=384,b=0;
    for(let y=210;y<315;y++)for(let x=100;x<215;x++){const k=(y*448+x)*4;
     if(d[k+3]>160&&d[k]>205&&Math.max(d[k],d[k+1],d[k+2])-Math.min(d[k],d[k+1],d[k+2])<35){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}
    if(r>l){const art=wardrobe.icons[GEAR.find(i=>i.id===gear.feet).tile],w=Math.max(48,r-l+12),h=w*art.height/art.width;ctx.drawImage(art,(l+r-w)/2,b-h+5,w,h);}
   }
   if(gear.fringe==='tekhelet'){
    ctx.save();ctx.lineWidth=2;for(let n=0;n<4;n++){ctx.strokeStyle=n===1?'#3874a7':'#f7f0d7';ctx.beginPath();ctx.moveTo(161+n*3,213);ctx.quadraticCurveTo(155+n*3,230,158+n*3,242);ctx.stroke();}ctx.restore();
   }
  }
  if(cache.size>4)cache.clear();cache.set(key,frame);return frame;
 },
 smokeOrigin(frame){
  if(frame.smokeOrigin)return frame.smokeOrigin;
  const d=frame.getContext('2d').getImageData(0,0,448,384).data;let xsum=0,count=0,top=384;
  for(let y=45;y<260;y++)for(let x=100;x<370;x++){const k=(y*448+x)*4;if(d[k+3]>100&&d[k+1]>d[k]*1.2&&d[k+1]>d[k+2]*1.13&&d[k+1]>45){if(y<top){top=y;xsum=x;count=1;}else if(y<top+5){xsum+=x;count++;}}}
  return frame.smokeOrigin={x:count?xsum/count:285,y:count?top:105};
 },
 isolate(c){
  // Atlas edge fragments belong to adjacent poses, not this sprite.
  const ctx=c.getContext('2d'),im=ctx.getImageData(0,0,c.width,c.height),d=im.data,W=c.width,H=c.height,seen=new Uint8Array(W*H);let largest=[];
  for(let start=0;start<W*H;start++)if(!seen[start]&&d[start*4+3]>60){
   const group=[start];seen[start]=1;
   for(let j=0;j<group.length;j++){const n=group[j],x=n%W;for(const q of [x?n-1:-1,x<W-1?n+1:-1,n-W,n+W])if(q>=0&&q<W*H&&!seen[q]&&d[q*4+3]>60){seen[q]=1;group.push(q);}}
   if(group.length>largest.length)largest=group;
  }
  const keep=new Uint8Array(W*H);for(const n of largest)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=n%W+dx,y=Math.floor(n/W)+dy;if(x>=0&&x<W&&y>=0&&y<H)keep[y*W+x]=1;}
  for(let n=0;n<W*H;n++)if(!keep[n])d[n*4+3]=0;ctx.putImageData(im,0,0);
 }
};
const newCharacter=GameRenderer.prototype.character;
GameRenderer.prototype.character=function(g,isChaser){
 const q=g.power,p=g.player,c=this.ctx,x=p.x-this.camera,y=this.ground-p.y;
 if(!isChaser&&q.type==='michael'&&q.remaining>0&&newHeroes.ready){
  const frame=newHeroes.props[4+(p.jumps?0:Math.floor(g.time*13)%8)],w=125,h=w*frame.height/frame.width;
  this.ellipse(x,this.ground+4,36,6,'#152c3f44');c.drawImage(frame,x-w*.5,y-h,w,h);
  c.save();c.strokeStyle='#a3e1f8';c.globalAlpha=.45+.2*Math.sin(g.time*10);c.lineWidth=2;c.beginPath();c.ellipse(x,y-h*.5,w*.58,h*.62,0,0,Math.PI*2);c.stroke();c.restore();return;
 }
 if(!isChaser&&q.type==='fahima'&&q.remaining>0&&newHeroes.ready){
  const boosting=q.boostTime>0,n=boosting?3:p.jumps?2:Math.floor(g.time*8)%2;
  const frame=newHeroes.powerFrame('fahima',n),k=224/300;
  c.save();c.translate(x,y);if(boosting)c.rotate(-.24);else if(!p.jumps)c.translate(0,Math.sin(g.time*24)*.6);
  if(boosting){
   for(let n=0;n<3;n++){c.fillStyle=['#f46127','#ffb52d','#fff2b1'][n];c.beginPath();c.moveTo(-132,-30-n*3);c.lineTo(-225+17*n-Math.sin(g.time*55)*17,-25);c.lineTo(-132,-16+n*2);c.closePath();c.fill();}
  }
  c.drawImage(frame,-224*k,-335*k,448*k,384*k);c.restore();return;
 }
 if(!isChaser&&q.type==='bracha'&&q.remaining>0&&newHeroes.ready){
  const intro=q.elapsed<1.25,pose=g.combat.attack==='kick'?7:g.combat.attack==='punch'?6:p.jumps?5:intro?4:g.input.running?Math.floor(p.phase*.8)%4:4;
  const outfit=wardrobe.equipped.outfit||'base',puffIndex=q.elapsed<.2?0:q.elapsed<.8?1+Math.floor((q.elapsed-.2)*10)%2:3;
  let frame=intro?wardrobe.fit(newHeroes.puffFrames[outfit][puffIndex],'idle',8,{head:wardrobe.equipped.head,feet:wardrobe.equipped.feet}):newHeroes.powerFrame('bracha',pose);
  if(intro&&wardrobe.equipped.fringe==='tekhelet')frame=drop2.fringes(frame,8,'bracha');
  const k=176/300,origin=intro?{x:282,y:88}:newHeroes.smokeOrigin(newHeroes.powerFrames.bracha[outfit][pose]);
  c.drawImage(frame,x-224*k,y-335*k,448*k,384*k);
  const sx=x+(origin.x-224)*k,sy=y+(origin.y-335)*k;
  c.save();
  // Birth positions are local to the held prop; smoke trails behind the runner.
  for(let n=0;n<42;n++){
   const age=(q.elapsed*1.1+n/42)%1,r=10+age*40;
   c.save();c.globalAlpha*=.6*(1-age)*(intro?Math.max(0,Math.min(1,(q.elapsed-.8)*6)):1);c.fillStyle=n%3?'#e5eee1':'#b8cdb6';c.beginPath();c.ellipse(sx-age*155+Math.sin(n*2.4+g.time)*20,sy-age*125+Math.sin(n)*12,r,r*.8,0,0,Math.PI*2);c.fill();c.restore();
  }
  const burst=Math.max(0,1-Math.abs(q.elapsed-1.05)/.4);
  if(burst>0)for(let n=0;n<18;n++){c.save();c.globalAlpha*=burst*.65;c.fillStyle=n%2?'#e5eee1':'#bfceb9';c.beginPath();c.arc(x-25+Math.sin(n*2.4)*70,y-22-n*12,32+burst*22,0,Math.PI*2);c.fill();c.restore();}
  c.restore();return;
 }
 newCharacter.call(this,g,isChaser);
 if(!isChaser&&q.rewindFlash>0){c.save();c.globalAlpha=q.rewindFlash;c.strokeStyle='#b1e9ff';c.lineWidth=3;for(let n=0;n<3;n++){c.beginPath();c.arc(x-n*23,y-80,50+n*13,-1.4,1.4);c.stroke();}c.restore();}
};
const newCamera=GameRenderer.prototype.updateCamera;
GameRenderer.prototype.updateCamera=function(g,dt){g.viewHeight=this.height;newCamera.call(this,g,dt);if(g.power.type==='bracha'&&g.power.remaining>0){this.lift=0;this.ground=this.baseGround;}else if(g.power.type==='fahima'&&g.power.remaining>0){const target=Math.max(0,g.player.y-(this.baseGround-340));this.lift+=(target-this.lift)*(1-Math.exp(-18*dt));this.ground=this.baseGround+this.lift;}};
// Keep the launch callout above the larger rider when the camera reaches the sky.
const newHeroBubble=GameRenderer.prototype.bubble;
GameRenderer.prototype.bubble=function(g,b){
 const lift=b.who==='luzo'&&g.power.type==='fahima'&&g.power.remaining>0?Math.max(0,Math.min(150,470-(this.ground-g.player.y))):0;
 this.ctx.save();this.ctx.translate(0,-lift);newHeroBubble.call(this,g,b);this.ctx.restore();
};
