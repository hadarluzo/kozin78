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
assert(html.includes('canvasCtx.globalAlpha=.85'),'only the remote avatar is translucent');
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
 let appReady=ctx.appReady,frame=ctx.frame,profile=null,reconnectStart=0,connectPending=false;
 const beginConnectFeedback=()=>{connectPending=true};
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

// Exercise the rebuilt scene and the remote avatar fallback, including when
// both players start at the same x/y coordinates.
{
 const a=html.indexOf('let cleanAnimationStarted=false');
 const b=html.indexOf('\nfunction revealGameCanvas()',a);
 assert(a>0&&b>a,'new renderer implementation exists');
 let draws=0,faceX=0,avatar=null,labels=[],silhouettes=0;
 const game={__onlineStarted:true,state:'playing',
  player:{x:320,y:0,phase:0,vy:0,jumps:0,blocked:false,slow:0},
  chaser:{x:110,y:0,phase:0},profile:{speed:420,growth:0},power:{worldScale:1},
  combat:{},wallet:{selected:'luzo'},input:{running:false},time:0};
 const canvas={
  globalAlpha:1,save(){},restore(){},beginPath(){},ellipse(){silhouettes++},
  fill(){},fillRect(){},strokeRect(){},
 };
 const renderer={
  draw(g){draws++;faceX=g.player.x},updateCamera(){},ctx:canvas,
  character(proxy,isChaser){avatar={x:proxy.player.x,y:proxy.player.y,hero:proxy.wallet.selected,isChaser}},
  text(name,x){labels.push({name,x})},width:1000,camera:0,ground:520
 };
 const frame={renderer,wardrobe:{equipped:{}}};
 const context={frame,running:true,latest:{},remote:null,renderInstalled:false,
  roomRoster:new Map(),getOwn:()=>({currentSpeed:420,run:true}),held:true,
  visualJump:null,renderedSelf:null,renderedFriend:null,
  lastSnapshotAt:100,lastOnlineFrame:0,
  performance:{now:()=>125},q:new URLSearchParams(''),
  pingMs:4,heroName:x=>x,$:()=>({style:{},textContent:''}),
  requestAnimationFrame(){},matchMedia:()=>({matches:true}),
  session:{id:'local'}
 };
 vm.createContext(context);
 vm.runInContext(html.slice(a,b)+';patchRenderer()',context);
 renderer.drawInterpolated(game);
 assert.equal(draws,1,'exactly one scene draw per frame');
 assert(faceX>320,'local runner moves without waiting for a server snapshot');
 assert.equal(game.player.x,320,'rendering does not alter authoritative player x');
 context.remote={id:'friend',name:'חבר',hero:'tzippy',player:{x:320,y:0,phase:0},
  gear:{},power:{},combat:{},run:false};
 renderer.drawInterpolated(game);
 assert.equal(draws,2,'scene painted once even with teammate');
 assert(avatar&&avatar.x>=424,'remote avatar is drawn beside the overlapping local player');
 assert.equal(avatar.hero,'tzippy','remote hero is not replaced with the local hero');
 assert(labels.some(e=>e.name.includes('חבר')),'teammate label appears on screen');
 assert(silhouettes>=1,'a visible cyan backup silhouette is always painted');
 assert.equal(context.remote.player.x,320,'shared-server x is not mutated by visual offset');
 avatar=null;labels=[];context.remote={...context.remote,player:{x:15000,y:0}};
 renderer.drawInterpolated(game);
 assert.equal(avatar,null,'expensive remote sprite is skipped when offscreen');
 assert(labels.some(x=>x.name.includes('חבר')),'direction and name remain visible when friend is offscreen');
 // The original renderer fallback still works outside multiplayer mode.
 const prior=draws;game.__onlineStarted=false;renderer.draw(game);
 assert.equal(draws,prior+1,'ordinary renderer still works when multiplayer is inactive');
}
assert(html.includes('#touchControls #runBtn{left:max(18px'),'run button physically matches original left corner');
assert(html.includes('#touchControls #jumpBtn{right:max(18px'),'jump button physically matches original right corner');
assert(html.includes('#touchControls #attack{position:absolute;top:44%'),'combat cluster matches original middle-right');
assert(html.includes('renderedFriend.x+(overlap?104:0)'),'same start location draws separate characters');
assert(html.includes('startCleanRenderer()'),'online renderer is started after game bridge is ready');
assert(html.includes('callback===f.frame'),'original redundant animation loop is suspended');
console.log('PASS single renderer, visible teammate silhouette/avatar, offset and offscreen indicator');

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
assert(html.includes('previousRemoteId!==friend.id'),'remote cosmetics cache is reused between snapshots');
assert(html.includes('requestIdleCallback(pump'),'outfit frames warm up away from active gameplay');
assert(html.includes('if(el.textContent!==value)el.textContent=value'),
 'unchanged HUD values avoid mobile Safari layout work');
console.log('PASS immediate double-jump prediction, snapshot-time sprite caching and off-frame clothing preparation');

// Simulate the exact hidden-controls regression: a multiplayer round starts,
// while Render is still sending the countdown time (or stalls entirely).
// Both buttons must stay visible AND the run handler must unlock after 4s.
{
 const partStart=html.indexOf('const introSeconds=()=>{');
 const partEnd=html.indexOf('\nfunction getOwn(){',partStart);
 assert(partStart>0&&partEnd>partStart,'online UI countdown source exists');
 const code=html.slice(partStart,partEnd);
 const classes=()=>{
  const names=new Set();
  return {add:n=>names.add(n),remove:n=>names.delete(n),
   contains:n=>names.has(n),toggle(n,value){
    if(value===undefined? !names.has(n):value)names.add(n);
    else names.delete(n);
   }};
 };
 const elements=new Map();
 const find=id=>{
  if(!elements.has(id))elements.set(id,{style:{display:''},textContent:'',
   classList:classes(),offsetWidth:180});
  return elements.get(id);
 };
 const body={classList:classes()};
 let now=1000;
 const context={
  running:true,room:{status:'running',paused:false},latest:{time:0,startDelay:4},
  introStartedAt:now,lastSnapshotAt:now,appReady:true,frame:{game:{}},
  autoReadyWhenLoaded:false,gameCanvasRevealed:false,
  consecutiveFastSamples:0,pingMs:null,
  document:{body},$:find,hideResult(){},
  performance:{now:()=>now},setInterval(){return 0}
 };
 vm.createContext(context);
 vm.runInContext(code,context);
 vm.runInContext('playView();updateIntro();',context);
 assert.equal(find('touchControls').style.display,'block','arcade controls must appear even at countdown second 3');
 assert(body.classList.contains('online-controls-visible'),'visible control class is applied at round start');
 assert(find('touchControls').classList.contains('controls-waiting'),'control buttons indicate countdown without disappearing');
 assert.equal(find('introText').textContent,'3');
 now=2000;vm.runInContext('updateIntro()',context);
 assert.equal(find('touchControls').style.display,'block','controls persist on countdown second 2');
 assert.equal(find('introText').textContent,'2');
 now=3000;vm.runInContext('updateIntro()',context);
 assert.equal(find('introText').textContent,'1','green countdown stage appears');
 now=4100;vm.runInContext('updateIntro()',context);
 assert.equal(find('introText').textContent,'רוצו על נפשותיכם מהמפלצת!!','blood warning appears');
 // Simulate stale server time at zero: wall clock must never leave controls locked.
 now=5100;vm.runInContext('updateIntro()',context);
 assert.equal(vm.runInContext('inCountdown()',context),false,'elapsed countdown always unlocks after four real seconds');
 assert.equal(find('touchControls').style.display,'block','controls remain visible after countdown');
 assert(!find('touchControls').classList.contains('controls-waiting'),'run button unlocks when countdown finishes');
 context.held=false;context.sent=0;
 context.sendInput=()=>{context.sent++};
 const beginHold=html.indexOf('function hold(v){');
 const endHold=html.indexOf('\nconst run=',beginHold);
 assert(beginHold>0&&endHold>beginHold,'run control action exists');
 vm.runInContext(html.slice(beginHold,endHold)+';hold(true)',context);
 assert.equal(context.held,true,'run can be held after countdown');
 assert.equal(context.sent,1,'run sends input immediately');
 // An out-of-order running-room event with no started/snapshot still
 // shows controls and explicitly explains that server movement is pending.
 context.running=false;
 context.room={status:'running',paused:false};
 vm.runInContext('playView()',context);
 assert.equal(find('touchControls').style.display,'block','controls remain visible before first snapshot');
 assert(find('controlHint').textContent.includes('עדכון הראשון'),'waiting for server is explained');
 assert(html.includes('body.online-controls-visible #touchControls{display:block!important}'),'CSS does not hide game buttons behind the countdown');
 assert(html.includes("button.addEventListener('touchstart'"),'iPhone jump has a direct touchstart handler');
}
console.log('PASS countdown controls always visible, green 1, server stall fallback and running input');
console.log('PASS clean online renderer and original render fallback');
console.log('PASS named account, owned-hero gallery, guest fallback, remote transparency and per-player results');

