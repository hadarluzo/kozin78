import assert from 'node:assert/strict';
import {readFileSync,createReadStream} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
function check(){
 const result={poses:0,cosmetics:0,powerDraws:0};
 const ensure=(v,m)=>{if(!v)throw Error(m)};
 ensure(runAnimation.ready,'corrected running atlases loaded before game ready');
 result.correctedRuns={};
 for(const id of ['michael','tzippy'])for(const outfit of runAnimation.outfits){
  const key=id+'/'+outfit,gear=outfit==='base'?{}:{outfit};
  const signatures=[],tops=[],feet=[];
  for(let n=0;n<8;n++){
   const f=wardrobe.getFrame(id,n,gear).img;
   const source=outfit==='base'?assets.heroFrames[id][n]:wardrobe.costumes[id][outfit][n];
   ensure(source===runAnimation.frames[id][outfit][n],'outfit actually selects corrected run '+key+n);
   const d=f.getContext('2d').getImageData(0,0,448,384).data;
   let top=384,bottom=0,left=448,right=0;
   for(let y=0;y<384;y++)for(let x=0;x<448;x++)if(d[(y*448+x)*4+3]>100){top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);}
   ensure(left>4&&right<443&&top>20&&bottom<345,'no clipped head/feet '+key+n);
   tops.push(top);feet.push(bottom);signatures.push(f.toDataURL());
  }
  ensure(new Set(signatures).size===8,'eight genuinely different run images '+key);
  ensure(Math.max(...tops)-Math.min(...tops)<=7,'stable head registration '+key);
  ensure(Math.max(feet[0],feet[4])>=330&&Math.max(feet[0],feet[4])<=338,'contact poses meet floor '+key);
  ensure(Math.min(...feet)<330,'passing/flight poses lift feet '+key);
  for(const n of [8,9,10,11])ensure(assets.heroFrames[id][n]===expansion.frames[id][n],'idle/action pose unchanged '+id+n);
  if(outfit!=='base')for(let n=8;n<12;n++)ensure(wardrobe.costumes[id][outfit][n]===runAnimation.legacyCostumes[id][outfit][n-8],'costume action unchanged '+key+n);
  for(const item of GEAR.filter(g=>g.slot!=='outfit'))for(let n=0;n<8;n++)ensure(wardrobe.getFrame(id,n,{...gear,[item.slot]:item.id}).img?.width,'running accessory '+key+item.id+n);
  result.correctedRuns[key]={frames:8,headDrift:Math.max(...tops)-Math.min(...tops),contact:[feet[0],feet[4]]};
 }
 // Reproduce the report: Savta in the grey tracksuit, through the real game renderer.
 const savedHero=game.wallet.selected,savedGear=wardrobe.equipped,originalGetFrame=wardrobe.getFrame,savedState=game.state,savedInput=game.input;
 const selectedPoses=[];
 wardrobe.getFrame=function(id,pose,gear=this.equipped){if(id==='tzippy'&&gear.outfit==='tech')selectedPoses.push(pose);return originalGetFrame.call(this,id,pose,gear);};
 game.wallet.selected='tzippy';wardrobe.equipped={outfit:'tech'};game.player.jumps=0;game.player.blocked=false;game.combat.attack=null;game.power.remaining=0;game.state='playing';game.input={running:true};
 try{for(let n=0;n<8;n++){game.player.phase=(n+.01)/.8;renderer.character(game,false);}}
 finally{wardrobe.getFrame=originalGetFrame;game.wallet.selected=savedHero;wardrobe.equipped=savedGear;game.state=savedState;game.input=savedInput;}
 ensure(new Set(selectedPoses).size===8,'real Savta grey-suit renderer advances all eight corrected poses');
 result.greySuitRendererPoses=selectedPoses;
 for(const id of ['bracha','fahima']){
  ensure(HEROES[id].price===2500,'hero price');
  for(const outfit of [null,'tech','fahima','dogs','paisley']){
   const runs=[];for(let pose=0;pose<12;pose++){const f=wardrobe.getFrame(id,pose,{outfit}).img;ensure(f?.width>0,'pose '+id+pose);result.poses++;if(pose<8)runs.push(f);}
   ensure(new Set(runs).size===8,'run cycle');
   for(const item of GEAR){const f=wardrobe.getFrame(id,8,{outfit,[item.slot]:item.id}).img;ensure(f?.width>0,'gear '+item.id);result.cosmetics++;}
  }
 }
 game.wallet={selected:'michael',food:0,xp:0,flushes:0,earn(){this.food++},gainXP(n){this.xp+=n},record(){},flush(){this.flushes++},save(){}};
 game.difficulty='normal';game.start();game.input={running:true,lifting:false,clear(){}};game.spawn=()=>{};game.obstacles=[];game.foods=[];game.combat.nextWave=1e9;
 for(let n=0;n<400;n++)game.update(1/120);
 ensure(game.power.activate(game),'cat activation');
 for(let n=0;n<60;n++)game.update(1/120);
 const oldX=game.player.x,oldXP=game.wallet.xp;game.chaser.gap=1;game.update(1/120);
 ensure(game.state==='playing','offline catch must rescue');ensure(game.player.x<oldX-1400,'offline rewind distance');ensure(game.wallet.flushes===0&&game.wallet.xp===oldXP,'no end reward or save on rescue');ensure(game.power.catUsed,'once-only rescue');
 result.offlineCat=true;
 wardrobe.equipped={outfit:'paisley',head:'kippah',feet:'nb',fringe:'tekhelet'};
 for(const hero of ['bracha','fahima','michael']){
  game.wallet.selected=hero;game.power.type=hero;game.power.remaining=2;game.power.elapsed=1;game.power.boostTime=hero==='fahima'?.4:0;
  for(let n=0;n<8;n++){game.time=n/13;renderer.character(game,false);result.powerDraws++;}
 }
 game.state='paused';return result;
}
const script=`const f=document.getElementById('game');f.addEventListener('load',()=>{let attempts=0;const timer=setInterval(()=>{try{if(!f.contentWindow.eval('typeof newHeroes!=="undefined"&&newHeroes.ready')){if(++attempts>450)throw Error('art timeout');return;}clearInterval(timer);const r=f.contentWindow.eval('('+${JSON.stringify(check.toString())}+')()');document.getElementById('report').textContent=JSON.stringify({ok:true,...r});}catch(e){clearInterval(timer);document.getElementById('report').textContent=JSON.stringify({error:e.stack||String(e)});}},100);});`;
const server=createServer((req,res)=>{
 if(req.url==='/fixture'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<iframe id="game" src="/index.html" style="width:1000px;height:620px"></iframe><pre id="report">loading</pre><script>'+script+'</script>');}
 else if(req.url==='/index.html'||/^\/kozin-online\/(drop2|new-heroes)\/[a-z_-]+\.(png|webp)$/.test(req.url)){res.setHeader('Content-Type',req.url.endsWith('.html')?'text/html; charset=utf-8':req.url.endsWith('.png')?'image/png':'image/webp');createReadStream(join(root,req.url.slice(1))).pipe(res);}
 else{res.writeHead(404);res.end();}
});
const browser=['google-chrome','google-chrome-stable','chromium','chromium-browser'].find(c=>spawnSync('which',[c]).status===0);assert(browser,'Chromium required');
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const p=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=1200,800','--virtual-time-budget=55000','--dump-dom','http://127.0.0.1:'+server.address().port+'/fixture']);let out='',err='';p.stdout.on('data',v=>out+=v);p.stderr.on('data',v=>err+=v);const timer=setTimeout(()=>p.kill('SIGKILL'),85000).unref();const status=await new Promise((ok,no)=>{p.once('close',ok);p.once('error',no)});clearTimeout(timer);assert.equal(status,0,err.slice(-2000));const raw=out.match(/<pre id="report">([^<]+)<\/pre>/)?.[1];assert(raw,out.slice(-2000));const r=JSON.parse(raw.replaceAll('&quot;','"').replaceAll('&amp;','&'));assert(!r.error,r.error);assert(r.ok);console.log('KOZIN_NEW_HERO_BROWSER',JSON.stringify(r));
}finally{server.close();}
