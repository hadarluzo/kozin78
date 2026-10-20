import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../../online.html',import.meta.url),'utf8');
const a=html.indexOf('function syncAccountProfile(){');
const b=html.indexOf('\nconst announce=',a);
assert(a>0&&b>a,'profile sync available');
assert(html.includes('id="heroGrid"'),'face gallery is included');
assert(html.includes('id="hero" hidden'),'native mobile selector is replaced');
const script=html.slice(a,b);
const options=[],hero={value:'',replaceChildren(){options.length=0},append(o){options.push(o)}};
const elems={hero,nickname:{value:'',readOnly:true,setAttribute(){},removeAttribute(){}},accountNote:{textContent:''}};
const doc={createElement(tag){assert.equal(tag,'option');return {value:'',textContent:''}}};
const labels={luzo:'הדר',tzippy:'ציפי',michael:'מיכאל'};
const owned=vm.runInNewContext("new Set(['luzo','tzippy'])");
const frame={game:{wallet:{owned,selected:'tzippy',cloudUserName:'username123',name:'שחקן חדש',user:'userid'}}};
const compile=new Function('frame','$','document','HERO_LABELS','updateHeroPicker','sessionStorage',script+';return syncAccountProfile;');
const sync=compile(frame,id=>elems[id],doc,labels,()=>{},{getItem(){return ''}});
sync();
assert.deepEqual(options.map(o=>o.value),['luzo','tzippy']);
assert.equal(hero.value,'tzippy');
assert.equal(elems.nickname.value,'username123');
assert.equal(elems.nickname.readOnly,true);
frame.game.wallet={owned:vm.runInNewContext("new Set(['luzo'])"),selected:'luzo',name:'שחקן חדש',user:null};
sync();
assert.deepEqual(options.map(o=>o.value),['luzo']);
assert.equal(elems.nickname.readOnly,false,'guest can enter an explicit temporary display name');
assert.notEqual(elems.nickname.value,'אורח','do not invent a guest username');
assert(html.includes("ctx.globalAlpha=oldAlpha*.56"),'only the remote avatar is translucent');
assert(html.includes("outcome.perPlayer?.[session.id]"),'win/loss checks current player id');

const beginStart=html.indexOf('function beginRoom(kind){');
const beginEnd=html.indexOf('\nfunction onMessage(m){',beginStart);
assert(beginStart>=0&&beginEnd>beginStart,'room creation source exists');
const beginScript=html.slice(beginStart,beginEnd);
const outgoing=[],statusText=[];
const createElems={
 nickname:{value:''},joinCode:{value:''},
 hero:{value:'luzo'},difficulty:{value:'normal'},
 createBtn:{disabled:false},joinBtn:{disabled:false}
};
const storage=new Map();
const scenario={
 appReady:false,frame:null,find:id=>createElems[id],
 announce:m=>statusText.push(m),send:m=>outgoing.push(m),
 clearSession:()=>{},syncAccountProfile:()=>{throw Error('unexpected blocking profile sync')},
 sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 startSocket:onOpen=>onOpen()
};
const buildBegin=new Function('ctx',`
 let appReady=ctx.appReady,frame=ctx.frame,profile=null,reconnectStart=0;
 const $=ctx.find,announce=ctx.announce,send=ctx.send;
 const clearSession=ctx.clearSession,syncAccountProfile=ctx.syncAccountProfile;
 const sessionStorage=ctx.sessionStorage,startSocket=ctx.startSocket,PROTOCOL='kozin-full-3',setTimeout=()=>{};
 ${beginScript}
 return kind=>{beginRoom(kind);return profile;};
`);
const runBegin=buildBegin(scenario);
const guest=runBegin('create');
assert.equal(guest.hero,'luzo','fallback can create without original 16MB iframe');
assert.equal(guest.gear&&Object.keys(guest.gear).length,0);
assert(guest.name.startsWith('שחקן '),'blank guest name receives temporary player label');
assert.equal(outgoing[0].type,'create');
assert.equal(outgoing[0].protocol,'kozin-full-3');
assert.equal(outgoing[0].name,guest.name);
assert(statusText.some(x=>x.includes('יוצר חדר')),'shows visible room creation feedback');
const sent=outgoing.length;
runBegin('join');
assert.equal(outgoing.length,sent,'invalid invite cannot contact server');
assert(statusText.at(-1).includes('6 ספרות'));
assert(html.includes('await Promise.race([Promise.resolve(bridge.game.wallet.ready)'),'wallet loading is bounded');
assert(html.includes('if(autoReadyWhenLoaded&&room?.status==='),'autostart waits for game renderer');
assert(html.includes('else if(!session&&profile&&!room'),'initial connection retries when Render wakes');
console.log('PASS create-room fallback with unloaded game, guest naming, websocket send, join validation and delayed readiness');
assert(html.includes("const INTRO_LINES=['3','2','1','רוצו על נפשותיכם מהמפלצת!!']"),'race warning has the requested countdown order');
assert(html.includes('count count-red')&&html.includes('count count-yellow')&&html.includes('count count-green'),'countdown stages are visually color-coded');
assert(html.includes('.intro-overlay.go #introText::after'),'blood drip decoration is displayed only on the GO warning');
assert(html.includes("if(v&&inCountdown())return"),'run button is locked while countdown is displayed');
assert(html.includes("if(!running||inCountdown())return"),'actions are locked while countdown is displayed');
console.log('PASS synchronized colored countdown, blood-effect warning and locally locked controls');

// Exercise the real frame wrapper, not just a text snippet. The old
// implementation defined drawInterpolated but the animation loop never used it.
{
 const a=html.indexOf('function patchRenderer(){');
 const b=html.indexOf('\nfunction revealGameCanvas()',a);
 assert(a>0&&b>a,'renderer override is available');
 const rendererCode=html.slice(a,b);
 let draws=0,renderedX=0;
 const game={__onlineStarted:true,state:'playing',player:{x:320,y:0,phase:0,vy:0,jumps:0,blocked:false,slow:0},chaser:{x:110,y:0,phase:0},profile:{speed:420,growth:0},power:{worldScale:1},time:0};
 const renderer={
  draw(g){draws++;renderedX=g.player.x},
  updateCamera(){},
  ctx:{globalAlpha:1,save(){},restore(){}},character(){},text(){},
  width:1000,maxPixelBudget:540000,resize(){}
 };
 const frame={renderer,wardrobe:{equipped:{}}};
 const context={
  frame,running:true,latest:{},remote:null,renderInstalled:false,roomRoster:new Map(),
  getOwn:()=>({run:true,currentSpeed:420,player:{jumps:0}}),held:true,
  smoothSelf:null,smoothChaser:null,smoothRemote:null,visualJump:null,
  lastPaintTime:0,lastSnapshotAt:100,frameCount:0,frameSum:0,frameSampleAt:0,
  performance:{now:()=>125},q:new URLSearchParams(''),pingMs:4,
  heroName:s=>s,$:()=>({style:{},textContent:''}),
  consecutiveFastSamples:0
 };
 vm.createContext(context);
 vm.runInContext(rendererCode+';patchRenderer();',context);
 renderer.draw(game);
 assert.equal(draws,1,'one actual scene draw per animation frame');
 assert(renderedX>320,'live draw entry point predicts locally before next server snapshot');
 assert.equal(game.player.x,320,'display interpolation must not mutate authoritative game player');
 game.__onlineStarted=false;renderer.draw(game);
 assert.equal(draws,2,'normal original draw still works outside online mode');
}

{
 const a=html.indexOf('const act=t=>');
 const b=html.indexOf("\n[['jumpBtn','jump']",a);
 assert(a>0&&b>a,'tap handler exists');
 let now=100;
 const sent=[];
 const frame={game:{player:{y:0,jumps:0}}};
 const prepare=new Function('frame','clock','sent',`
 let visualJump=null,smoothSelf={y:0,vy:0,jumps:0};
 const running=true,inCountdown=()=>false,send=msg=>sent.push(msg);
 const performance={now:()=>clock.value};
 ${html.slice(a,b)}
 return {act,read:()=>({visualJump,smoothSelf})};`);
 const clock={value:now},game=prepare(frame,clock,sent);
 game.act('jump');
 assert.equal(game.read().visualJump.predictedJumps,1);
 assert(game.read().smoothSelf.y>0,'jump paints positive height before any remote message');
 clock.value+=60;game.act('jump');
 assert.equal(game.read().visualJump.predictedJumps,2,'rapid second tap predicts double jump');
 clock.value+=60;game.act('jump');
 assert.equal(game.read().visualJump.predictedJumps,2,'third tap must not create a triple jump');
 assert.equal(frame.game.player.jumps,0,'local prediction cannot mutate authoritative physics');
 assert.equal(sent.length,3,'actions still reach the server for authoritative validation');
}
assert(html.includes('remoteAvatarSource!==other'),'remote cosmetics cache is reused between snapshots');
assert(html.includes('requestIdleCallback(pump'),'outfit frames warm up away from active gameplay');
assert(html.includes('if(el.textContent!==value)el.textContent=value'),
 'unchanged HUD values avoid mobile Safari layout work');
console.log('PASS immediate double-jump prediction, snapshot-time sprite caching and off-frame clothing preparation');
console.log('PASS actual render-loop interpolation, per-frame local motion and original-render fallback');
console.log('PASS named account, owned-hero gallery, guest fallback, remote transparency and per-player results');

