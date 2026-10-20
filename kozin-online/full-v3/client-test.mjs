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
console.log('PASS named account, owned-hero gallery, guest fallback, remote transparency and per-player results');

