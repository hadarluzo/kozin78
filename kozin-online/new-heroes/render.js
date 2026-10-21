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
// Identity images are reused in every pose; changing outfits never regenerates a face.
const newHeroes={
 canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;},
 crop(image,x,y,w,h){const c=this.canvas(w,h);c.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);return c;},
 async load(){
  const load=name=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src='kozin-online/new-heroes/'+name+'.webp';});
  const [bracha,approved,bMotion,fMotion,props]=await Promise.all(['bracha-identity','approved-identities','bracha-motion','fahima-motion','powers'].map(load));
  this.heads={bracha:this.crop(bracha,403,8,182,260),fahima:this.crop(approved,894,8,140,183)};
  const bounds={bracha:[[0,0,280,490,169,43,75,93],[280,0,240,490,120,43,75,94],[510,0,255,490,128,46,78,96],[765,0,259,490,140,44,76,99],[0,490,270,440,149,25,77,96],[270,490,260,440,148,23,80,96],[510,490,285,440,158,26,77,93],[780,490,244,440,131,32,77,98],[0,930,230,606,89,12,69,96],[200,930,310,606,167,24,78,100],[440,930,310,606,104,58,76,103],[730,930,294,606,25,40,78,100]],
   fahima:[[0,0,362,350,224,4,78,91],[362,0,362,350,214,4,79,92],[724,0,362,350,232,4,81,91],[1086,0,362,350,237,5,81,92],[0,350,362,344,212,4,78,94],[362,350,362,344,228,3,80,96],[724,350,362,344,223,3,80,95],[1086,350,362,344,237,5,81,96],[0,694,362,392,150,0,64,81],[362,694,362,392,192,0,75,86],[724,694,362,392,133,2,73,86],[1086,694,362,392,80,2,77,86]]};
  for(const id of ['bracha','fahima']){
   const atlas=id==='bracha'?bMotion:fMotion;
   const frames=bounds[id].map(([x,y,w,h,hx,hy,hw,hh])=>{
    let c=this.crop(atlas,x,y,w,h);this.isolate(c);this.replaceHead(c,id,{x:hx,y:hy,w:hw,h:hh});return wardrobe.normalize(c);
   });
   // Preserve the approved full standing silhouette in the menu and fitting room.
   const idle=id==='bracha'?this.crop(bracha,0,0,bracha.width,bracha.height):this.crop(approved,780,0,350,910);this.isolate(idle);frames[8]=wardrobe.normalize(idle);
   frames.referenceHeight=300;assets.heroFrames[id]=frames;assets.heroPortraits[id]=wardrobe.trim(frames[8]);
   wardrobe.costumes[id]={};
   for(const outfit of ['tech','fahima','dogs','paisley']){
    wardrobe.costumes[id][outfit]=wardrobe.costumes.michael[outfit].map((src,n)=>{
     const c=this.crop(src,0,0,src.width,src.height),head=this.costumeHead(outfit==='paisley'?wardrobe.costumes.michael.dogs[n]:c,n);
     this.replaceHead(c,id,head);return c;
    });
   }
  }
  this.props=[];for(let n=0;n<12;n++)this.props.push(wardrobe.trim(this.crop(props,n%4*384,Math.floor(n/4)*1024/3,384,1024/3)));
  await runAnimation.load();
  this.ready=true;wardrobe.portraitCache.clear();
 },
 costumeHead(c,pose){
  const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  // Skin is tracked only in the head area, excluding sleeves and raised hands.
  const y0=pose===9?74:25,y1=pose===9?155:110;
  let l=400,r=0,t=300,b=0;
  for(let y=y0;y<y1;y++)for(let x=170;x<325;x++){
   const i=(y*c.width+x)*4,R=d[i],G=d[i+1],B=d[i+2];
   if(d[i+3]>180&&R>100&&R/G>1.19&&R/G<1.85&&G/B>1.15&&G/B<2.5){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  }
  if(l>r)return {x:215,y:pose===9?80:30,w:84,h:83};
  return {x:l-9,y:Math.max(0,t-31),w:Math.min(95,r-l+23),h:b-t+39};
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
 },
 replaceHead(c,id,b){
  const x=c.getContext('2d'),head=this.heads[id];
  x.clearRect(b.x-10,b.y-10,b.w+23,b.h+10);
  const h=b.h*1.08,w=h*head.width/head.height;
  x.drawImage(head,b.x+b.w*.48-w*.5,b.y+b.h-h,w,h);
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
  const boosting=q.boostTime>0,frame=newHeroes.props[Math.floor(g.time*12)%4],w=88,h=w*frame.height/frame.width;
  c.save();c.translate(x,y-26);if(boosting)c.rotate(-.20);
  if(boosting){for(let n=0;n<5;n++){c.fillStyle=n%2?'#ffe690':'#ff6c25';c.beginPath();c.moveTo(-w*.35,-7+n*3);c.lineTo(-w*.6-20-Math.sin(g.time*60+n)*17,4);c.lineTo(-w*.35,14-n*3);c.fill();}}
  // The tucked jump pose sits astride the half-height car, retaining every cosmetic.
  const f=wardrobe.getFrame('fahima',9).img,k=176/300;
  c.drawImage(f,-224*k,-335*k+25,448*k,384*k);
  c.drawImage(frame,-w*.5,-h*.35,w,h);c.restore();return;
 }
 newCharacter.call(this,g,isChaser);
 if(!isChaser&&q.type==='bracha'&&q.remaining>0){
  c.save();for(let n=0;n<10;n++){const a=g.time*1.8+n*2.4;c.fillStyle=n%2?'#dce9db':'#b6cdbb';c.globalAlpha=.11+.04*Math.sin(a);c.beginPath();c.ellipse(x+Math.sin(a)*50,y-20-n*13,28+9*Math.sin(a),12,0,0,Math.PI*2);c.fill();}c.restore();
 }
 if(!isChaser&&q.rewindFlash>0){c.save();c.globalAlpha=q.rewindFlash;c.strokeStyle='#b1e9ff';c.lineWidth=3;for(let n=0;n<3;n++){c.beginPath();c.arc(x-n*23,y-80,50+n*13,-1.4,1.4);c.stroke();}c.restore();}
};
const newCamera=GameRenderer.prototype.updateCamera;
GameRenderer.prototype.updateCamera=function(g,dt){g.viewHeight=this.height;newCamera.call(this,g,dt);if(['bracha','fahima'].includes(g.power.type)&&g.power.remaining>0){this.lift=0;this.ground=this.baseGround;}};
