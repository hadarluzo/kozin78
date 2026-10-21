import assert from 'node:assert/strict';
import {readFileSync,createReadStream} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const html=readFileSync(join(root,'online.html'),'utf8');
const a=html.indexOf('let cleanAnimationStarted=false');
const b=html.indexOf('\nfunction revealGameCanvas()',a);
assert(a>0&&b>a,'clean renderer source exists');
const patch64=Buffer.from(html.slice(a,b)).toString('base64');
const fixture='<!doctype html><html><head><meta charset="utf-8"></head><body>'+
 '<iframe id="game" src="/index.html" style="width:1000px;height:550px;border:0"></iframe>'+
 '<pre id="report">loading</pre><script src="/fixture.js"></script></body></html>';
const runner="\nlet done=false;\nfunction result(x){done=true;document.getElementById('report').textContent=JSON.stringify(x)}\nconst iframe=document.getElementById('game');\niframe.addEventListener('load',()=>{\n const f=iframe.contentWindow;let attempts=0;\n function inspect(){\n  if(done)return;\n  try {\n   const bridge=f.eval('({game,renderer,assets,wardrobe,drop2,GEAR})');\n   if(!bridge?.renderer||!bridge.assets?.loaded||!bridge.wardrobe?.ready||!bridge.drop2?.ready||!f.eval('newHeroes.ready')){\n    if(++attempts<125){setTimeout(inspect,100);return}\n    return result({error:'game art did not finish loading',attempts});\n   }\n   if(bridge.GEAR.length!==13||!['dogs','paisley','tekhelet','kozinshoe'].every(id=>bridge.GEAR.some(item=>item.id===id)))throw Error('Missing new clothes');\n   const doc=f.document;\n   f.eval('showMenu()');doc.getElementById('lobbyShop').click();\n   if(doc.querySelectorAll('[data-store]').length!==2)throw Error('Shop selection failed');\n   for(const store of ['zanos','motagos']){\n    doc.querySelector('[data-store=\"'+store+'\"]').click();\n    if(!doc.getElementById('fittingCanvas'))throw Error('Store failed: '+store);\n    for(const button of [...doc.querySelectorAll('[data-gear]')]){doc.querySelector('[data-gear=\"'+button.dataset.gear+'\"]').click();}\n    doc.getElementById('storeBackToShops').click();\n   }\n   for(const id of f.eval('Object.keys(HEROES)'))for(const outfit of [null,'tech','fahima','dogs','paisley']){\n    const frames=[];for(let pose=0;pose<12;pose++){const frame=bridge.wardrobe.getFrame(id,pose,{outfit}).img;if(!frame||!frame.width)throw Error('Missing pose '+id+outfit+pose);frames.push(frame);}\n    if(new Set(frames.slice(0,8)).size!==8)throw Error('Frozen run frames '+id+outfit);\n   }\n   const game=bridge.game,renderer=bridge.renderer;\n   game.start();game.state='playing';game.update=()=>{};game.__onlineStarted=true;\n   f.requestAnimationFrame=()=>0;\n   const hero=bridge.assets.heroFrames?.tzippy?.[8]?'tzippy':'luzo';\n   const friend={id:'friend',name:'חבר בדיקה',hero,\n     player:{x:game.player.x,y:game.player.y,phase:0,jumps:0,vy:0},\n     power:{},combat:{},run:false,gear:{}};\n   let drawImages=0;\n   const originalImage=renderer.ctx.drawImage.bind(renderer.ctx);\n   renderer.ctx.drawImage=function(...args){drawImages++;return originalImage(...args)};\n   const events={names:[],avatars:0,alpha:[]};\n   const originalText=renderer.text.bind(renderer);\n   renderer.text=function(name,...rest){if(String(name).includes('חבר'))events.names.push(name);return originalText(name,...rest)};\n   const originalChar=renderer.character.bind(renderer);\n   renderer.character=function(actor,chaser){if(!chaser&&actor.wallet?.selected===hero){events.avatars++;events.alpha.push(renderer.ctx.globalAlpha)}return originalChar(actor,chaser)};\n   const patch=atob('__PATCH_B64__');\n   const makePatch=new Function('env',[\n     'let frame=env.frame,renderInstalled=false,running=true;',\n     'let latest={players:[{id:\"local\",player:env.frame.game.player},{id:\"friend\",player:env.friend}]};',\n     'const roomRoster=new Map(),session={id:\"local\"};',\n     'let remote=env.friend,held=false,visualJump=null,lastSnapshotAt=performance.now(),',\n     'pingMs=5;',\n     'const getOwn=()=>latest.players[0],heroName=x=>x;',\n     'const q=new URLSearchParams(\"\"),$=()=>({style:{},textContent:\"\"});',\n     patch,\n     'patchRenderer();',\n     'return ()=>frame.renderer.drawInterpolated(frame.game)'\n   ].join('\\n'));\n   const draw=makePatch({frame:bridge,friend});\n   renderer.camera=game.player.x-270;\n   const time=performance.now();\n   for(let i=0;i<9;i++)draw();\n   const average=(performance.now()-time)/9;\n   result({ok:events.avatars>=9&&events.names.length>=9,\n     avatars:events.avatars,labels:events.names.slice(0,2),\n     remoteAlpha:events.alpha.slice(0,5),\n     drawImageCalls:drawImages,averageDrawMs:Math.round(average*100)/100,\n     canvasWidth:renderer.canvas.width,canvasHeight:renderer.canvas.height,\n     localWorldX:game.player.x,remoteWorldX:friend.player.x,\n     hero,assetsLoaded:bridge.assets.loaded});\n  } catch(error){result({error:error?.stack||String(error)})}\n }\n inspect();\n});\nsetTimeout(()=>{if(!done)result({error:'browser test timed out'})},17500);\n".replace('__PATCH_B64__',patch64);
const browser=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .find(cmd=>spawnSync('which',[cmd]).status===0);
assert(browser,'Chromium required for game test');
const server=createServer((req,res)=>{
 if(req.url==='/index.html'){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  createReadStream(join(root,'index.html')).pipe(res);
 }else if(/^\/kozin-online\/drop2\/[a-z_]+\.webp$/.test(req.url)){
  res.setHeader('Content-Type','image/webp');createReadStream(join(root,req.url.slice(1))).pipe(res);
 }else if(/^\/kozin-online\/new-heroes\/[a-z-]+\.webp$/.test(req.url)){
  res.setHeader('Content-Type','image/webp');createReadStream(join(root,req.url.slice(1))).pipe(res);
 }else if(req.url==='/fixture.js'){
  res.setHeader('Content-Type','application/javascript; charset=utf-8');res.end(runner);
 }else if(req.url==='/fixture.html'){
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);
 }else{res.writeHead(404);res.end()}
});
try {
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port+'/fixture.html';
 const proc=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu',
  '--disable-dev-shm-usage','--window-size=1200,700',
  '--virtual-time-budget=22500','--dump-dom',url]);
 let out='',errors='';
 proc.stdout.on('data',v=>{out+=v;if(out.length>500000)out=out.slice(-500000)});
 proc.stderr.on('data',v=>{errors+=v;if(errors.length>100000)errors=errors.slice(-100000)});
 const status=await new Promise((ok,no)=>{
  proc.on('error',no);proc.on('close',ok);
  setTimeout(()=>{if(!proc.killed)proc.kill('SIGKILL')},90000).unref();
 });
 assert.equal(status,0,'Chromium failed: '+errors.slice(-1300));
 const raw=out.match(/<pre id="report">([^<]+)<\/pre>/)?.[1];
 assert(raw,'No browser diagnostics: '+out.slice(-900));
 const result=JSON.parse(raw.replaceAll('&quot;','"').replaceAll('&amp;','&'));
 console.log('KOZIN_REAL_GAME_RENDER',JSON.stringify(result));
 assert(!result.error,result.error||'browser game failed');
 assert(result.ok,'Both sprite and name of teammate must visibly render');
 assert(result.remoteAlpha.length>=9/2&&result.remoteAlpha.every(x=>Math.abs(x-.58)<.01),
  'the actual remote sprite must be drawn at exactly 58 percent opacity');
 assert(result.drawImageCalls>9,'Original sprite atlas and city art must be used');
 assert.equal(result.localWorldX,result.remoteWorldX,'Same server starting position preserved');
}finally{server.close()}
