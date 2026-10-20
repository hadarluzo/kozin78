import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';

const original=readFileSync(new URL('../../online.html',import.meta.url),'utf8');
const fake=String.raw`<script>
window.__joinMessages=[];window.__joinAck=false;
window.WebSocket=class MockSocket{
 static OPEN=1;static CLOSED=3;
 constructor(url){this.url=url;this.readyState=0;this.listeners={};
  setTimeout(()=>{this.readyState=1;this.onopen?.();this.dispatch({type:'hello',protocol:'kozin-full-3'})},25);
 }
 addEventListener(name,fn){(this.listeners[name]??=[]).push(fn)}
 dispatch(data){this.onmessage?.({data:JSON.stringify(data)})}
 send(data){const msg=JSON.parse(data);window.__joinMessages.push(msg);
  if(msg.type==='create'){
   setTimeout(()=>{
    if(new URLSearchParams(location.search).has('reject')){
     this.dispatch({type:'error',message:'שרת בדיקה דחה את יצירת החדר'});
    }else{
     window.__joinAck=true;
     this.dispatch({type:'joined',code:'654321',id:'browser-player',token:'testing-token',protocol:'kozin-full-3'});
     this.dispatch({type:'room',code:'654321',status:'waiting',players:[{
      id:'browser-player',name:msg.name,hero:msg.hero,gear:msg.gear,ready:false,connected:true
     }]});
    }
   },65);
  }
 }
 close(){this.readyState=3;this.onclose?.();for(const cb of this.listeners.close||[])cb()}
}
</script>`;
const verify=String.raw`<script>
setTimeout(()=>{
 const iframe=document.getElementById('original');
 window.__noEagerIframe=(!iframe.getAttribute('src'));
 document.getElementById('nickname').value='בודק חדר';
 document.getElementById('createBtn').click();
 if(new URLSearchParams(location.search).has('cancel'))setTimeout(()=>document.getElementById('cancelConnectBtn').click(),45);
},140);
setTimeout(()=>{
 const code=document.getElementById('roomCode').textContent;
 const controls=document.getElementById('options').style.display;
 const state={
  success:code==='654321',
  roomCode:code,
  options:controls,
  note:document.getElementById('status').textContent,
  createDisabled:document.getElementById('createBtn').disabled,
  createLabel:document.getElementById('createBtn').textContent,
  requestTypes:window.__joinMessages.map(m=>m.type),
  requestName:window.__joinMessages.find(m=>m.type==='create')?.name,
  noEagerIframe:window.__noEagerIframe,
  loadedAfterJoin:!!document.getElementById('original').getAttribute('src'),
  connectAck:window.__joinAck
 };
 document.getElementById('verification').textContent=JSON.stringify(state);
},800);
</script>`;
const html=original.replace('</head>',fake+'</head>').replace('</body>','<pre id="verification" style="display:none"></pre>'+verify+'</body>');
const chromium=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .find(command=>spawnSync('which',[command]).status===0);
assert(chromium,'Chrome needed for browser smoke test');
const server=createServer((req,res)=>{
 if(req.url?.startsWith('/online.html')){
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
 }else if(req.url?.startsWith('/index.html')){
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><title>placeholder game</title>');
 }else{res.statusCode=404;res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 for(const mode of ['acknowledged','rejected','canceled']){
  const reject=mode==='rejected',cancel=mode==='canceled';
  const url='http://127.0.0.1:'+server.address().port+'/online.html?enter=1'+(reject?'&reject=1':cancel?'&cancel=1':'');
  const child=spawn(chromium,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--window-size=1108,512','--virtual-time-budget=1900','--dump-dom',url]);
  let out='',err='';
  child.stdout.on('data',x=>{out+=x;if(out.length>1000000)out=out.slice(-1000000)});
  child.stderr.on('data',x=>{err+=x;if(err.length>180000)err=err.slice(-180000)});
  const exit=await new Promise((resolve,fail)=>{
   child.on('error',fail);child.on('close',resolve);
   setTimeout(()=>{if(!child.killed)child.kill('SIGKILL')},35000).unref();
  });
  assert.equal(exit,0,'Chrome failed: '+err.slice(-1600));
  const raw=out.match(/<pre id="verification"[^>]*>([^<]+)<\/pre>/)?.[1];
  assert(raw,'No browser test output '+out.slice(-600));
  const data=JSON.parse(raw.replaceAll('&quot;','"').replaceAll('&amp;','&'));
  console.log('ROOM_CREATE_BROWSER '+mode+' '+JSON.stringify(data));
  assert(data.noEagerIframe,'16MB game iframe must not load until a room is confirmed');
  assert(data.requestTypes.includes('create'),'Create Room sends actual server message');
  if(cancel){
   assert(!data.createDisabled,'Cancellation unlocks the button immediately');
   assert.equal(data.createLabel,'צור חדר');
   assert(data.note.includes('בוטל'),'Cancellation clearly acknowledged');
   assert.equal(data.loadedAfterJoin,false,'Abandoned room must not download original game');
  }else if(reject){
   assert(!data.createDisabled,'Buttons must be unlocked after server error');
   assert.equal(data.createLabel,'צור חדר','Label resets on error');
   assert(data.note.includes('דחה'),'User sees the actual error');
  }else{
   assert(data.success,'Acknowledgement enters room and displays its code');
   assert.equal(data.options,'none','Room view replaces initial options');
   assert(data.loadedAfterJoin,'Heavy game starts downloading after join is acknowledged');
  }
 }
}finally{server.close()}
