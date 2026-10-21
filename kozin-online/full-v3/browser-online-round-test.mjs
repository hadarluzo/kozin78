// Start the actual online page in two independent browser contexts. Renderer
// unit fixtures alone cannot detect failures in the real snapshot/input bridge.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {attachFullOnline} from './network-v3.mjs';
const {chromium}=await import(process.env.KOZIN_PLAYWRIGHT_MODULE||'playwright-core');
const root=resolve(import.meta.dirname,'../..');
const server=createServer((req,res)=>{try{
 const path=new URL(req.url,'http://local').pathname;
 if(path!=='/online.html'&&path!=='/index.html'&&!/^\/kozin-online\/(drop2|new-heroes)\/[a-z_-]+\.webp$/.test(path))throw Error('missing');
 let data=readFileSync(root+path);
 if(path==='/online.html')data=Buffer.from(data.toString().replace('wss://kozin-online-server.onrender.com/full-v3',`ws://127.0.0.1:${server.address().port}/full-v3`));
 res.setHeader('Content-Type',path.endsWith('.html')?'text/html; charset=utf-8':'image/webp');res.end(data);
}catch{res.writeHead(404);res.end();}});
const net=attachFullOnline(server);await new Promise(r=>server.listen(0,'127.0.0.1',r));
const executablePath=process.env.KOZIN_CHROME||['google-chrome','google-chrome-stable','chromium','chromium-browser'].map(c=>spawnSync('which',[c],{encoding:'utf8'})).find(x=>x.status===0)?.stdout.trim();assert(executablePath);
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const pages=[],errors=[];
try{
 for(let i=0;i<2;i++){
  const p=await browser.newPage({viewport:{width:1024,height:473},isMobile:true,hasTouch:true});p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/online.html?enter=1`);pages.push(p);
 }
 await pages[0].locator('#nickname').fill('בודק א');await pages[0].locator('#createBtn').click();
 await pages[0].waitForFunction(()=>/^\d{6}$/.test(document.getElementById('roomCode').textContent));
 const code=await pages[0].locator('#roomCode').textContent();
 await pages[1].locator('#nickname').fill('בודק ב');await pages[1].locator('#joinCode').fill(code);await pages[1].locator('#joinBtn').click();
 for(const p of pages){
  await p.waitForFunction(()=>/אפשר ללחוץ|שני שחקנים צריכים ללחוץ/.test(document.getElementById('status').textContent),null,{timeout:65000});
  await p.locator('#readyBtn').click();
 }
 await new Promise(r=>setTimeout(r,4300));
 for(const p of pages){
  await p.evaluate(()=>document.getElementById('original').contentWindow.eval(`
   window.__paintStats={times:[],remote:0};
   const roundCharacter=renderer.character.bind(renderer);
   renderer.character=function(g,chaser){if(chaser)window.__paintStats.times.push(performance.now());else if(Math.abs(this.ctx.globalAlpha-.22)<.001)window.__paintStats.remote++;return roundCharacter(g,chaser);};
  `));
  await p.locator('#runBtn').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',isPrimary:true});
 }
 for(let n=0;n<10;n++){
  await new Promise(r=>setTimeout(r,300));
  if(n%2===0)for(const p of pages)await p.locator('#jumpBtn').dispatchEvent('pointerdown',{pointerType:'mouse',pointerId:2});
 }
 const reports=[];
 for(const p of pages)reports.push(await p.evaluate(()=>({hud:document.getElementById('hud').textContent,...document.getElementById('original').contentWindow.eval(`(()=>{
  const times=window.__paintStats.times,deltas=times.slice(1).map((x,i)=>x-times[i]).sort((a,b)=>a-b);
  const data=renderer.ctx.getImageData(0,0,renderer.canvas.width,renderer.canvas.height).data,colors=new Set();for(let i=0;i<data.length;i+=400)colors.add(data[i]+','+data[i+1]+','+data[i+2]);
  return {state:game.state,x:game.player.x,gap:game.player.x-game.chaser.x,remote:window.__paintStats.remote,colors:colors.size,fps:(times.length-1)*1000/(times.at(-1)-times[0]),p95:deltas[Math.floor(deltas.length*.95)]};
 })()`)})));
 assert.deepEqual(errors,[],'complete online page must not throw at startup or during rendering');
 for(const r of reports){assert.equal(r.state,'playing');assert(r.x>900,'real run button moves authoritative player');assert(r.colors>30,'actual city and sprites are painted');assert(r.remote>10,'almost-transparent teammate visibly draws');assert(r.gap>82&&r.gap<=285,'Kozin follows at game pace');assert(r.fps>28&&r.p95<100,'paced browser rendering remains responsive');}
 console.log('KOZIN_TWO_BROWSER_ROUND',JSON.stringify(reports));
}finally{await browser.close();net.close();await new Promise(r=>server.close(r));}
