// Read only original source imagery. Does not execute original game or mutate saves.
(function(){
'use strict';
const art={ready:false,loading:false,failed:false,hero:{},costumes:{},world:{},run:null,chaser:null};
const loadImage=url=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=url;});
function extractObj(source,tag){const a=source.indexOf(tag);if(a<0)return {};const start=source.indexOf('{',a+tag.length),end=source.indexOf('};',start);if(end<0)return {};return JSON.parse(source.slice(start,end+1));}
async function load(){
 if(art.ready||art.loading||art.failed)return;
 art.loading=true;
 try{
  const response=await fetch('/original-game',{cache:'force-cache'});
  if(!response.ok)throw new Error('Original art not found '+response.status);
  const source=await response.text();
  const heroes=extractObj(source,'const HERO_ART =');
  const assets=extractObj(source,'const ASSET_URLS =');
  const wardrobe=extractObj(source,'const WARDROBE_ART=');
  const keys=Object.keys(heroes);
  const loaded=await Promise.all(keys.map(async id=>[id,await loadImage(heroes[id])]));
  for(const [id,img] of loaded)if(img)art.hero[id]=img;
  art.world.day=await loadImage(assets.day);
  art.world.evening=await loadImage(assets.evening);
  art.run=await loadImage(assets.runv2);
  art.chaser=await loadImage(assets.characters);
  art.combat=await loadImage(assets.combat);
  await Promise.all(Object.keys(wardrobe).filter(k=>!['equipment','shoe'].includes(k)).map(async id=>{art.costumes[id]=await loadImage(wardrobe[id]);}));
  art.ready=true;
 }catch(e){art.failed=true;console.warn('Original artwork unavailable; basic graphics remain',e);}
 finally{art.loading=false;}
}
const runFrames=[[30,26,373,412],[525,34,301,400],[932,26,321,407],[1347,22,406,403],[32,453,416,413],[513,463,346,402],[939,453,351,410],[1359,449,389,411]];
const chaserFrames=[[0,0,0,0]]; // character atlas fallback when no frame mapping
function player(ctx,p,x,feet,height=92){
 const mode=p.action==='kick'?11:p.action==='punch'?10:p.y>2?9:p.running?Math.floor(p.phase||0)%8:8;
 const outfit=art.costumes[p.hero];
 if(outfit&&['tech','fahima'].includes(p.gear?.outfit)){
  const offset=p.gear.outfit==='fahima'?12:0,n=offset+mode;
  const sw=outfit.width/4,sh=outfit.height/6;
  ctx.drawImage(outfit,(n%4)*sw,Math.floor(n/4)*sh,sw,sh,x-53,feet-height,106,height);return true;
 }
 const atlas=art.hero[p.hero];
 if(atlas){
  const sx=(mode%4)*448,sy=Math.floor(mode/4)*384;
  const size=height/300;
  ctx.drawImage(atlas,sx,sy,448,384,x-224*size,feet-335*size,448*size,384*size);
  return true;
 }
 if(p.hero==='luzo'&&art.run){
  const box=runFrames[p.y>2?2:Math.floor(p.phase||0)%8];
  const w=height*box[2]/box[3];
  ctx.drawImage(art.run,...box,x-w/2,feet-height,w,height);
  return true;
 }
 return false;
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
window.KozinOriginalArt={load,player,backdrop,state:art};
})();
