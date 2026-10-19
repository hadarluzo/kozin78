// Read only original source imagery. Does not execute original game or mutate saves.
(function(){
'use strict';
const art={ready:false,loading:false,failed:false,hero:{},costumes:{},world:{},run:null,chaser:null};
const loadImage=url=>new Promise(resolve=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=url;});
const imageUrl=(group,id)=>'https://kozin-online-server.onrender.com/assets/'+group+'/'+id;
function extractObj(source,tag){const a=source.indexOf(tag);if(a<0)return {};const start=source.indexOf('{',a+tag.length),end=source.indexOf('};',start);if(end<0)return {};return JSON.parse(source.slice(start,end+1));}
async function load(players=[]){
 if(art.ready||art.loading||art.failed)return;
 art.loading=true;
 try{
  // All images come from the original game, but only the requested ones are
  // delivered. The phone never downloads or parses the 47MB game source.
  const targets=players.filter(p=>p&&typeof p.hero==='string').slice(0,2);
  if(!targets.length)targets.push({hero:'luzo',gear:{}});
  const tasks=[
   loadImage(imageUrl('ASSET_URLS','day')).then(im=>art.world.day=im),
   loadImage(imageUrl('ASSET_URLS','evening')).then(im=>art.world.evening=im),
   loadImage(imageUrl('ASSET_URLS','characters')).then(im=>art.chaser=im)
  ];
  const defaultHeroes=new Set(['yona','eyal','hashi','moreno','yishai']);
  for(const p of targets){
   const id=p.hero;
   art.costumes[id]||={};
   if(defaultHeroes.has(id))tasks.push(loadImage(imageUrl('HERO_ART',id)).then(im=>art.hero[id]=im));
   else if(id==='michael'||id==='tzippy')tasks.push(loadImage(imageUrl('EXPANSION_ART',id)).then(im=>art.hero[id]=im));
   if(id==='luzo'&&!p.gear?.outfit)tasks.push(loadImage(imageUrl('ASSET_URLS','runv2')).then(im=>art.run=im));
   const outfit=p.gear?.outfit;
   if(['dogs','paisley'].includes(outfit))
     tasks.push(loadImage(imageUrl('DROP2_ART',id)).then(im=>art.costumes[id].drop2=im));
   if(['tech','fahima'].includes(outfit)){
     if(['michael','tzippy'].includes(id))
       tasks.push(loadImage(imageUrl('DROP2_ART',id+'_'+outfit)).then(im=>art.costumes[id][outfit]=im));
     else tasks.push(loadImage(imageUrl('WARDROBE_ART',id)).then(im=>art.costumes[id].wardrobe=im));
   }
  }
  await Promise.all(tasks);
  if(!art.world.day&&!art.world.evening&&!art.chaser&&!Object.values(art.hero).some(Boolean))throw new Error('Original artwork missing');
  art.ready=true;
 }catch(e){art.failed=true;console.warn('Original artwork unavailable; basic graphics remain',e);}
 finally{art.loading=false;}
}
const runFrames=[[30,26,373,412],[525,34,301,400],[932,26,321,407],[1347,22,406,403],[32,453,416,413],[513,463,346,402],[939,453,351,410],[1359,449,389,411]];
const chaserFrames=[[102,7,219,213],[472,6,156,214],[771,6,229,214],[1101,6,198,214],[95,220,215,226],[460,223,170,226],[771,223,246,226],[1108,220,220,228]];
function player(ctx,p,x,feet,height=92){
 const mode=p.action==='kick'?11:p.action==='punch'?10:p.y>2?9:p.running?Math.floor(p.phase||0)%8:8;
 const gear=art.costumes[p.hero]||{},outfit=p.gear?.outfit;
 if(outfit){
  let atlas=null,frame=mode;
  if((outfit==='dogs'||outfit==='paisley')&&gear[outfit]){atlas=gear[outfit];frame=mode;}else if((outfit==='dogs'||outfit==='paisley')&&gear.drop2){atlas=gear.drop2;if(outfit==='paisley')frame+=12;}
  else if((outfit==='tech'||outfit==='fahima')&&gear.wardrobe){atlas=gear.wardrobe;if(outfit==='fahima')frame+=12;}
  else if(gear[outfit]){atlas=gear[outfit];frame=mode;}
  if(atlas){
   const sx=(frame%4)*448,sy=Math.floor(frame/4)*384,scale=height/300;
   ctx.drawImage(atlas,sx,sy,448,384,x-224*scale,feet-335*scale,448*scale,384*scale);
   drawAccessories(ctx,p,x,feet,height);return true;
  }
 }
 const atlas=art.hero[p.hero];
 if(atlas){
  const sx=(mode%4)*448,sy=Math.floor(mode/4)*384;
  const size=height/300;
  ctx.drawImage(atlas,sx,sy,448,384,x-224*size,feet-335*size,448*size,384*size);
  drawAccessories(ctx,p,x,feet,height);return true;
 }
 if(p.hero==='luzo'&&art.run){
  const box=runFrames[p.y>2?2:Math.floor(p.phase||0)%8];
  const w=height*box[2]/box[3];
  ctx.drawImage(art.run,...box,x-w/2,feet-height,w,height);
  drawAccessories(ctx,p,x,feet,height);return true;
 }
 return false;
}
function drawAccessories(ctx,p,x,feet,height){
 const g=p.gear||{};ctx.save();
 if(g.head==='kippah'){ctx.fillStyle='#242c35';ctx.beginPath();ctx.ellipse(x-1,feet-height*.87,height*.11,height*.045,0,Math.PI,Math.PI*2);ctx.fill();}
 if(g.fringe==='tekhelet'){
   ctx.strokeStyle='#38b9e0';ctx.lineWidth=Math.max(1,height/80);
   for(const dx of [-12,-5,6,14]){ctx.beginPath();ctx.moveTo(x+dx,feet-height*.43);ctx.lineTo(x+dx-2,feet-height*.24);ctx.stroke();}
 }
 if(g.feet){
   ctx.fillStyle=g.feet==='kozinshoe'?'#fff0ab':'#e9ebfa';
   ctx.fillRect(x-height*.19,feet-height*.08,height*.15,height*.09);
   ctx.fillRect(x+height*.04,feet-height*.08,height*.15,height*.09);
 }
 ctx.restore();
}
function chaserDraw(ctx,x,feet,height,phase){
 if(!art.chaser)return false;
 const frame=chaserFrames[(Math.floor(phase||0)%8+8)%8],width=height*frame[2]/frame[3];
 ctx.drawImage(art.chaser,...frame,x-width/2,feet-height,width,height);return true;
}
function backdrop(ctx,index,width,ground){
 const atlas=index<4?art.world.day:art.world.evening;
 if(!atlas)return false;
 const i=index%4;
 // Source atlas: 2-by-2 quadrants corresponding to original 8 zones.
 const sw=atlas.width/2,sh=atlas.height/2;
 const sx=(i%2)*sw,sy=Math.floor(i/2)*sh;
 ctx.drawImage(atlas,sx,sy,sw,sh,0,0,width,ground+40);
 return true;
}
window.KozinOriginalArt={load,player,backdrop,chaser:chaserDraw,state:art};
})();
