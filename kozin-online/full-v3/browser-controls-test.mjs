import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const html = readFileSync(new URL('../../online.html',import.meta.url),'utf8');
const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
const b1=html.indexOf('<div id="touchControls">');
const b2=html.indexOf('<div id="veil">',b1);
assert(style&&b1>0&&b2>b1,'actual online CSS and controls DOM are present');
const controlsMarkup=html.slice(b1,b2);
const executable=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .find(cmd=>spawnSync('which',[cmd],{encoding:'utf8'}).status===0);
if(!executable)throw Error('A Chrome/Chromium browser is required for visibility regression tests');
const folder=mkdtempSync(join(tmpdir(),'kozin-controls-'));
try {
 const fixture=`<!doctype html><html lang="he"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${style}</style></head>
 <body class="online-controls-visible">${controlsMarkup}
 <div id="introOverlay" class="intro-overlay" style="display:flex"><div id="introText">3</div></div>
 <div id="veil" class="hidden"></div>
 <pre id="verification" style="display:none"></pre>
 <script>
 document.getElementById('touchControls').style.display='block';
 const ids=['runBtn','jumpBtn','powerBtn','kickBtn','punchBtn'];
 const info=ids.map(id=>{
  const element=document.getElementById(id);
  const rect=element.getBoundingClientRect();
  const style=getComputedStyle(element);
  const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
  return {id,x:rect.x,y:rect.y,width:rect.width,height:rect.height,display:style.display,
   visibility:style.visibility,pointerEvents:style.pointerEvents,hit:hit?.id};
 });
 document.getElementById('verification').textContent=JSON.stringify({
  width:innerWidth,height:innerHeight,
  parentDisplay:getComputedStyle(document.getElementById('touchControls')).display,
  info
 });
 <\/script></body></html>`;
 const file=join(folder,'controls.html');
 writeFileSync(file,fixture,'utf8');
 for(const [width,height] of [[1536,720],[390,844]]){
  const run=spawnSync(executable,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--hide-scrollbars','--window-size='+width+','+height,'--virtual-time-budget=700','--dump-dom','file://'+file],
   {encoding:'utf8',timeout:35000,maxBuffer:8*1024*1024});
  assert.equal(run.status,0,`Chrome failed: ${run.stderr?.slice(-1800)}`);
  const data=run.stdout.match(/<pre id="verification"[^>]*>([^<]+)<\/pre>/)?.[1];
  assert(data,'Chrome did not produce visibility diagnostics');
  const view=JSON.parse(data.replaceAll('&quot;','"').replaceAll('&amp;','&'));
  assert.equal(view.parentDisplay,'block','controls must be displayed above the game');
  const get=id=>view.info.find(x=>x.id===id);
  for(const e of view.info){
   assert(e.width>42&&e.height>40,`${e.id} collapsed: ${JSON.stringify(e)}`);
   assert.equal(e.visibility,'visible',`${e.id} hidden`);
   assert.equal(e.pointerEvents,'auto',`${e.id} cannot receive touches`);
   assert.equal(e.hit,e.id,`${e.id} is covered by overlay or another control: ${JSON.stringify(e)}`);
  }
  assert(get('runBtn').x<view.width*.3,'run must be at physical left');
  assert(get('jumpBtn').x>view.width*.6,'jump must be at physical right');
  assert(get('runBtn').y>view.height*.64,'run must be at bottom');
  assert(get('jumpBtn').y>view.height*.64,'jump must be at bottom');
  console.log('PASS real Chrome controls visible, uncovered and touch-targeted',width,height,
   view.info.map(x=>x.id+':'+Math.round(x.x)+','+Math.round(x.y)).join(' '));
 }
} finally {rmSync(folder,{force:true,recursive:true})}
