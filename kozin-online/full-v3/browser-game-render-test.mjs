import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync,createReadStream} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const online=readFileSync(join(root,'online.html'),'utf8');
const start=online.indexOf('let cleanAnimationStarted=false');
const end=online.indexOf('\nfunction revealGameCanvas()',start);
assert(start>0&&end>start,'clean player renderer is found');
const snippet=online.slice(start,end);
const make=JSON.stringify(snippet).replaceAll('</script','<\\/script');
const fixture=`<!doctype html><html><head><meta charset="utf-8"></head><body>
<iframe id="game" src="/index.html" style="width:1000px;height:550px;border:0"></iframe>
<pre id="report">loading</pre>
<script>
let done=false;
function result(data){done=true;document.getElementById('report').textContent=JSON.stringify(data)}
const iframe=document.getElementById('game');
iframe.addEventListener('load',()=>{
 const f=iframe.contentWindow;
 let attempts=0;
 const tryGame=()=>{
  if(done)return;
  try{
   const bridge=f.eval('({game,renderer,assets,wardrobe})');
   if(!bridge?.renderer||!bridge.assets?.loaded||!bridge.wardrobe?.ready){
    if(++attempts<100){setTimeout(tryGame,100);return}
    return result({error:'game never loaded assets within 10 seconds',attempts});
   }
   const game=bridge.game,renderer=bridge.renderer;
   game.start();game.state='playing';game.update=()=>{};game.__onlineStarted=true;
   const f2=bridge.renderer;
   f.requestAnimationFrame=function(cb){if(cb===f.frame||cb?.name==='frame')return 0;return 0};
   const friend={id:'friend',name:'חבר בדיקה',hero:'tzippy',
    player:{x:game.player.x,y:game.player.y,phase:0,jumps:0,flip:0,vy:0},
    power:{},combat:{},run:false,gear:{}};
   let drawCalls=0;
   const originalDrawImage=renderer.ctx.drawImage.bind(renderer.ctx);
   renderer.ctx.drawImage=function(...args){drawCalls++;return originalDrawImage(...args)};
   const events={texts:[],characters:0};
   const oldText=renderer.text.bind(renderer);
   renderer.text=function(t,...args){if(String(t).includes('חבר'))events.texts.push(String(t));return oldText(t,...args)};
   const oldCharacter=renderer.character.bind(renderer);
   renderer.character=function(proxy,chaser){if(!chaser&&proxy.wallet?.selected==='tzippy')events.characters++;return oldCharacter(proxy,chaser)};
   const makePatch=new Function('environment',`
    let frame=environment.frame,renderInstalled=false,running=true,
     latest={players:[{id:'local',player:environment.frame.game.player},{id:'friend',player:environment.friend}]},
     roomRoster=new Map(),remote=environment.friend,session={id:'local'},
     held=false,visualJump=null,lastSnapshotAt=performance.now(),
     lastOnlineFrame=0,renderedSelf=null,renderedFriend=null,
     lastOnlineDebug=0,pingMs=5;
    const getOwn=()=>latest.players[0];
    const heroName=x=>x;const q=new URLSearchParams('');
    const $=()=>({style:{},textContent:''});
    ${${make}}
    patchRenderer();
    return {draw:()=>frame.renderer.drawInterpolated(frame.game)};
   `);
   const api=makePatch({frame:bridge,friend});
   renderer.camera=game.player.x-270;
   // One cold paint plus 8 warm paints, all with real city and character art.
   const begin=performance.now();
   for(let n=0;n<9;n++)api.draw();
   const elapsed=performance.now()-begin;
   result({success:events.characters>0&&events.texts.length>0,
    characters:events.characters,names:events.texts.slice(0,3),
    drawImageCalls:drawCalls,drawMs:Math.round(elapsed*100/9)/100,
    canvasWidth:renderer.canvas.width,canvasHeight:renderer.canvas.height,
    originalX:game.player.x,friendX:friend.player.x,
    assetsLoaded:bridge.assets.loaded,heroFrameLoaded:!!bridge.assets.heroFrames?.tzippy?.[8]});
  }catch(e){result({error:e?.stack||String(e)})}
 };
 tryGame();
});
setTimeout(()=>{if(!done)result({error:'page timeout'})},14500);
<\/script></body></html>`;
const filename='__kozin_clean_renderer_integration.html';
writeFileSync(join(root,filename),fixture);
const browser=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .find(x=>spawnSync('which',[x]).status===0);
assert(browser,'Chromium not installed in runner');
const server=createServer((req,res)=>{
 const p=req.url==='/'+'/'+filename?filename:req.url==='/index.html'?'index.html':null;
 if(!p){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type','text/html; charset=utf-8');
 createReadStream(join(root,p)).pipe(res);
});
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const args=['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--window-size=1200,700','--virtual-time-budget=16500','--dump-dom',
  'http://127.0.0.1:'+port+'/'+filename];
 const proc=spawn(browser,args);
 let stdout='',stderr='';
 proc.stdout.on('data',x=>{stdout+=x;if(stdout.length>900000)stdout=stdout.slice(-900000)});
 proc.stderr.on('data',x=>{stderr+=x;if(stderr.length>150000)stderr=stderr.slice(-150000)});
 const status=await new Promise((resolve,reject)=>{
  proc.on('error',reject);proc.on('close',resolve);
  setTimeout(()=>{if(!proc.killed)proc.kill('SIGKILL')},70000).unref();
 });
 assert.equal(status,0,'Chrome error: '+stderr.slice(-1200));
 const raw=stdout.match(/<pre id="report">([^<]+)<\/pre>/)?.[1];
 assert(raw,'Chrome failed to generate game renderer report: '+stdout.slice(-1000));
 const parsed=JSON.parse(raw.replaceAll('&quot;','"').replaceAll('&amp;','&'));
 console.log('KOZIN_REAL_BROWSER_RENDER',JSON.stringify(parsed));
 assert(!parsed.error,parsed.error||'unknown browser failure');
 assert(parsed.success,'Remote character and name must be drawn with original game assets');
 assert(parsed.characters>=9,'Remote teammate must be drawn once per frame');
 assert(parsed.drawImageCalls>9,'Original assets must actually be drawn');
 assert.equal(parsed.originalX,parsed.friendX,'Server coordinates still match');
}finally{
 server.close();
 unlinkSync(join(root,filename));
}
