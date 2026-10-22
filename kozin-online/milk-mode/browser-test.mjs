import assert from 'node:assert/strict';
import {readFileSync,createReadStream} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {checkMilk} from './check.mjs';
const root=resolve(import.meta.dirname,'../..');
const script=`const f=document.getElementById('game');f.onload=()=>{let tries=0;const timer=setInterval(async()=>{try{if(!f.contentWindow.eval('typeof newHeroes!=="undefined"&&newHeroes.ready&&typeof MilkMode!=="undefined"')){if(++tries>500)throw Error('art timeout');return;}clearInterval(timer);await f.contentWindow.eval('MilkMode.loadArt()');const result=f.contentWindow.eval('('+${JSON.stringify(checkMilk.toString())}+')()');document.getElementById('report').textContent=JSON.stringify({ok:true,...result});}catch(e){clearInterval(timer);document.getElementById('report').textContent=JSON.stringify({error:e.stack||String(e)})}},100)};`;
const server=createServer((req,res)=>{
 if(req.url==='/fixture'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<iframe id="game" src="/index.html" style="width:1170px;height:540px"></iframe><pre id="report">loading</pre><script>'+script+'</script>');}
 else if(req.url==='/index.html'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(readFileSync(join(root,'index.html'),'utf8').replace('<head>','<head><script>window.requestAnimationFrame=()=>0</script>'));}
 else if(/^\/kozin-online\/(drop2|new-heroes)\/[a-z_-]+\.webp$/.test(req.url)){res.setHeader('Content-Type','image/webp');createReadStream(join(root,req.url.slice(1))).pipe(res);}
 else{res.writeHead(404);res.end();}
});
const browser=['google-chrome','google-chrome-stable','chromium','chromium-browser'].find(c=>spawnSync('which',[c]).status===0);assert(browser,'Chromium required');
try{await new Promise(r=>server.listen(0,'127.0.0.1',r));const proc=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=1200,700','--virtual-time-budget=65000','--dump-dom','http://127.0.0.1:'+server.address().port+'/fixture']);let out='',err='';proc.stdout.on('data',v=>out+=v);proc.stderr.on('data',v=>err+=v);const timer=setTimeout(()=>proc.kill('SIGKILL'),90000).unref();const status=await new Promise((ok,no)=>{proc.once('close',ok);proc.once('error',no)});clearTimeout(timer);assert.equal(status,0,err.slice(-2000));const raw=out.match(/<pre id="report">([^<]+)<\/pre>/)?.[1];assert(raw,out.slice(-1000));const result=JSON.parse(raw.replaceAll('&quot;','"').replaceAll('&amp;','&'));assert(!result.error,result.error);assert(result.ok);console.log('MILK_MODE_QA',JSON.stringify(result));}finally{server.close()}
