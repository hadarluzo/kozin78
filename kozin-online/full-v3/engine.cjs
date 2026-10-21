
'use strict';
// Disable mobile browser zoom without changing jump inputs.
document.addEventListener('dblclick', event => event.preventDefault(), {passive:false});
document.addEventListener('gesturestart', event => event.preventDefault(), {passive:false});
document.addEventListener('gesturechange', event => event.preventDefault(), {passive:false});
/** Asset paths are replaced with data URIs in the standalone HTML build. */
const ASSET_URLS = {"combat":"DATA","runv2":"DATA","couriers":"DATA","buddha":"DATA","reactions":"DATA","stunts":"DATA","lobby":"DATA","day": "DATA", "evening": "DATA", "characters": "DATA", "hug": "DATA"};
const SPRITE_CELLS = [[102, 7, 219, 213], [472, 6, 156, 214], [771, 6, 229, 214], [1101, 6, 198, 214], [95, 220, 215, 226], [460, 223, 170, 226], [771, 223, 246, 226], [1108, 220, 220, 228], [90, 449, 225, 241], [471, 450, 157, 240], [774, 449, 240, 241], [1105, 449, 223, 240], [102, 695, 230, 238], [476, 696, 168, 237], [773, 692, 248, 241], [1104, 693, 223, 238], [112, 933, 213, 188], [476, 933, 161, 187], [790, 933, 222, 188], [1128, 933, 203, 187]];
/** Map atlas boundaries are explicit because generated artwork need not divide evenly. */
const MAP_RECTS = {
  day:[[0,0,768,512],[768,0,768,512],[0,512,768,512],[768,512,768,512]],
  evening:[[0,0,768,478],[768,0,768,478],[0,478,768,546],[768,478,768,546]]
};
/* Character art generated with the built-in image tool. Prompt: match each supplied photo in the existing shaded comic style; 8 run poses, idle, jump, punch and kick on transparency. Refinements: distinctive facial proportions; fluffy forward fringe for Yishai and Moreno; deeper warm brown/olive skin for Eyal; isolated silhouettes with transparent padding. */
const HERO_ART = {"yona":"DATA","eyal":"DATA","hashi":"DATA","moreno":"DATA","yishai":"DATA"};
const PIGEON_ART="DATA";
class AssetStore {
  constructor() { this.images={};this.frames=[];this.combatFrames=[];this.runFrames=[];this.enemyFrames=[];this.buddhaFrames=[];this.reactionFrames=[];this.stuntFrames=[];this.stuntScale=481;this.loaded=false;this.failures=[]; }
  async load() {
    await Promise.all(Object.entries({...ASSET_URLS,pigeon:PIGEON_ART,...Object.fromEntries(Object.entries(HERO_ART).map(([id,url])=>["hero_"+id,url]))}).map(async ([key,url])=>{
      try {
        this.images[key]=await new Promise((resolve,reject)=>{
          const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url;
        });
      } catch (_) {this.failures.push(key);}
    }));
    if (this.images.characters) {
      // Preserve every source pixel. No destructive low-resolution sprite cache.
      for (const box of SPRITE_CELLS) {
        const frame=document.createElement('canvas');
        frame.height=box[3];frame.width=box[2];
        frame.getContext('2d').drawImage(this.images.characters,...box,0,0,frame.width,frame.height);
        this.frames.push(frame);
      }
    }
    if(this.images.stunts){
      const cells=[[80,139,483,481],[665,186,344,328],[1155,213,397,322],[1717,237,377,381]];
      for(const box of cells){const frame=document.createElement('canvas');frame.width=box[2];frame.height=box[3];frame.getContext('2d').drawImage(this.images.stunts,...box,0,0,box[2],box[3]);this.stuntFrames.push(frame);}
    }
    for(const [key,boxes,target] of [
      ['combat',[[6,111,621,534],[566,113,592,531],[1175,112,500,534],[1682,119,484,526]],this.combatFrames],
      ['runv2',[[30,26,373,412],[525,34,301,400],[932,26,321,407],[1347,22,406,403],[32,453,416,413],[513,463,346,402],[939,453,351,410],[1359,449,389,411]],this.runFrames],
      ['couriers',[[32,162,475,459],[571,163,425,465],[1093,167,455,461],[1624,209,532,407]],this.enemyFrames],
      ['buddha',[[44,84,370,370],[494,88,313,358],[881,82,408,368],[1364,84,370,364],[34,494,371,372],[457,499,436,362],[891,497,426,369],[1329,476,422,390]],this.buddhaFrames],
      ['reactions',[[95,21,786,740],[953,21,984,750]],this.reactionFrames]
    ]) if(this.images[key])for(const box of boxes){const f=document.createElement('canvas');f.width=box[2];f.height=box[3];f.getContext('2d').drawImage(this.images[key],...box,0,0,f.width,f.height);target.push(f);}
    if(this.combatFrames.length){this.combatFrames[0].getContext('2d').clearRect(550,390,75,144);this.combatFrames[1].getContext('2d').clearRect(0,0,65,280);}
    // Register each gait by the head, never by the changing hand/foot bounds.
    // One scale for the entire cycle preserves anatomy and the authored foot lift.
    const register = frames => {
      const h=Math.max(...frames.map(f=>f.height));
      const anchors=frames.map(f=>{
        const pixels=f.getContext('2d').getImageData(0,0,f.width,Math.ceil(f.height*.18)).data;
        let sum=0,mass=0;
        for(let i=3;i<pixels.length;i+=4){const a=pixels[i];if(a>128){sum+=((i-3)/4%f.width)*a;mass+=a;}}
        return mass?sum/mass:f.width/2;
      });
      const headLead=h*.12;
      const half=Math.ceil(Math.max(...frames.map((f,i)=>Math.max(anchors[i]-headLead,f.width-anchors[i]+headLead))))+2;
      return frames.map((f,i)=>{
        const out=document.createElement('canvas');out.width=half*2;out.height=h;
        out.getContext('2d').drawImage(f,half+headLead-anchors[i],0);
        return out;
      });
    };
    if(this.runFrames.length)this.runFrames=register(this.runFrames);
    for(let row=0;row<5;row++)if(this.frames.length>=row*4+4)
      this.frames.splice(row*4,4,...register(this.frames.slice(row*4,row*4+4)));
    // Cache the comic costume effect once, instead of reading pixels every frame.
    this.boxerFrames=this.frames.map((f,index)=>{
      if(index<4)return f;
      const out=document.createElement('canvas');out.width=f.width;out.height=f.height;
      const ctx=out.getContext('2d');ctx.drawImage(f,0,0);const image=ctx.getImageData(0,0,f.width,f.height),d=image.data;
      for(let y=Math.floor(f.height*.43);y<f.height*.83;y++)for(let x=0;x<f.width;x++){
        const i=(y*f.width+x)*4,r=d[i],g=d[i+1],b=d[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
        if(d[i+3]>100&&hi-lo<36&&hi<96&&hi>20){
          const dot=Math.hypot((x%18)-9,(y%18)-9)<3.2,shade=.65+hi/260;
          const color=dot?[211,102,143]:[255,239,205];d[i]=color[0]*shade;d[i+1]=color[1]*shade;d[i+2]=color[2]*shade;
        }
      }
      ctx.putImageData(image,0,0);return out;
    });
    this.heroFrames={};this.heroPortraits={};
    for(const id of Object.keys(HERO_ART)){
      const atlas=this.images['hero_'+id];if(!atlas)continue;
      const frames=[];
      for(let i=0;i<12;i++){const f=document.createElement('canvas');f.width=448;f.height=384;f.getContext('2d').drawImage(atlas,i%4*448,Math.floor(i/4)*384,448,384,0,0,448,384);frames.push(f);}
      frames.referenceHeight=300;
      const handPixels=frames[10].getContext('2d').getImageData(0,0,448,235).data;let handX=0,handY=150;
      for(let y=35;y<235;y++)for(let x=0;x<448;x++)if(handPixels[(y*448+x)*4+3]>100&&x>handX){handX=x;handY=y;}
      frames.hand={x:handX-224,y:handY-335};this.heroFrames[id]=frames;
      const f=frames[8],pixels=f.getContext('2d').getImageData(0,0,448,384).data;
      let x0=448,y0=384,x1=0,y1=0;
      for(let y=0;y<384;y++)for(let x=0;x<448;x++)if(pixels[(y*448+x)*4+3]>32){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
      const portrait=document.createElement('canvas');portrait.width=x1-x0+1;portrait.height=y1-y0+1;portrait.getContext('2d').drawImage(f,x0,y0,portrait.width,portrait.height,0,0,portrait.width,portrait.height);this.heroPortraits[id]=portrait;delete this.images['hero_'+id];
    }
    this.loaded=true;
  }
}



'use strict';
/** Balance values use logical world pixels and seconds. Energy is fictional. */
const CONFIG = Object.freeze({
  speed: 425, gravity: 1550, jump: 620, doubleJump: 610,
  burnPerSecond: 100 / 165, mealEnergy: 1.6,
  startGap: 255, maxGap: 280, catchGap: 82,
  mapLength: 8800, mapBlendStart: 0.82,
  encounterMin: 590, encounterMax: 740,
  step: 1 / 120
});

const MAPS = [
  { name:'המרכז המסחרי', atlas:'day', cell:0 },
  { name:'המגדלים והגינה', atlas:'day', cell:1 },
  { name:'גן השעשועים', atlas:'day', cell:2 },
  { name:'בית ספר כרמים', atlas:'day', cell:3 },
  { name:'רחבת החנויות', atlas:'evening', cell:0 },
  { name:'המרכז עם החזית הירוקה', atlas:'evening', cell:1 },
  { name:'הטיילת בלילה', atlas:'evening', cell:2, night:true },
  { name:'מרכז העיר מודיעין', atlas:'evening', cell:3 }
];
const QUOTES = {
  kuzin:['אני נישקתי את איטה!','בוא לפה אני רעב!!','אחי אתה פשוט מוזר'],
  luzo:['אמאלה ציקוווו',"ישך בייצים הא קוזין??"]
};
const FOOD = ['pizza','burger','icecream','shawarma','donut','fries'];
const OBSTACLES = {
  banana:{ width:54, height:19, name:'קליפת בננה' },
  barrier:{ width:62, height:61, name:'מחסום רחוב' },
  stall:{ width:82, height:94, name:'דוכן פירות' },
  cone:{width:42,height:52,name:'חרוט עבודות'},
  hydrant:{width:48,height:72,name:'ברז כיבוי'},
  bin:{width:62,height:85,name:'פח רחוב'},
  bench:{width:108,height:65,name:'ספסל'},
  tires:{width:64,height:76,name:'ערימת צמיגים'},
  crate:{width:65,height:78,name:'ארגזי שוק'}
};
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
const random = (min,max) => min + Math.random()*(max-min);
const formatTime = n => Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
const dom = id => document.getElementById(id);

/** Timing-based encounter spacing preserves landing windows as speed increases. */
const DIFFICULTIES = Object.freeze({
  easy:{name:'קל',speed:415,interval:1.20,obstacles:.60,penalty:.88,growth:.08},
  normal:{name:'בינוני',speed:505,interval:1.04,obstacles:.82,penalty:1.08,growth:.14},
  hard:{name:'קשה',speed:585,interval:.88,obstacles:.95,penalty:1.27,growth:.19},
  impossible:{name:'בלתי אפשרי',speed:650,interval:.77,obstacles:1,penalty:1.40,growth:.23}
});
const SURFACES = [
 {kind:'stone',base:'#c9b598',line:'#aa957c',edge:'#edddba'},
 {kind:'path',base:'#bda67c',line:'#a48c66',edge:'#6d963d'},
 {kind:'rubber',base:'#be7053',line:'#e8b765',edge:'#4c967f'},
 {kind:'road',base:'#717778',line:'#ede4ca',edge:'#b7b0a0'},
 {kind:'plaza',base:'#d2b88e',line:'#a78b6e',edge:'#e9d4aa'},
 {kind:'concrete',base:'#b5b7a5',line:'#8c9e91',edge:'#449991'},
 {kind:'deck',base:'#4c555d',line:'#7b8486',edge:'#85c7ca'},
 {kind:'boulevard',base:'#a9a699',line:'#e5dcc2',edge:'#d1c1a3'}
];

/** Twenty authored routes, drawn without replacement before reshuffling. */
const PARKOUR_ROUTES = [
 {name:'גגות השוק',style:'roof',h:[85,180,285,185],w:.42,g:.65},
 {name:'שדרת הפנסים',style:'lamp',h:[75,165,255,345],w:.43,g:.64},
 {name:'מדרגות הגן',style:'garden',h:[65,140,215,290,365],w:.46,g:.63},
 {name:'ארגזי הפריקה',style:'crate',h:[80,175,270,175,80],w:.44,g:.65},
 {name:'עמודי הכיכר',style:'post',h:[90,190,290,290],w:.49,g:.66},
 {name:'גגות סולאריים',style:'solar',h:[85,170,255,340,255],w:.45,g:.64},
 {name:'פנסי הטיילת',style:'lamp',h:[90,185,280,185,280],w:.44,g:.65},
 {name:'מרפסות האבן',style:'roof',h:[70,155,240,325,410],w:.44,g:.64},
 {name:'אדניות בכיכר',style:'garden',h:[80,160,240,160,240,320],w:.47,g:.63},
 {name:'מחסן גבוה',style:'crate',h:[95,195,295,395],w:.45,g:.65},
 {name:'מזגני המרכז',style:'ac',h:[75,165,255,345,345],w:.48,g:.66},
 {name:'לוחות על הגבעה',style:'solar',h:[65,145,225,305,385],w:.45,g:.63},
 {name:'פנסים כפולים',style:'lamp',h:[85,175,175,265,355],w:.47,g:.64},
 {name:'מגדלי האבן',style:'roof',h:[95,195,295,395,295],w:.46,g:.65},
 {name:'הגן המדורג',style:'garden',h:[75,150,225,300,225,300],w:.48,g:.63},
 {name:'משלוח על הגגות',style:'crate',h:[85,180,275,370,275,180],w:.45,g:.65},
 {name:'שלטי הרחוב',style:'sign',h:[80,175,270,270,365,270],w:.50,g:.66},
 {name:'קו הרקיע',style:'solar',h:[90,185,280,375,470],w:.45,g:.65},
 {name:'רחוב האורות',style:'lamp',h:[70,155,240,325,240,325],w:.46,g:.64},
 {name:'מסלול מעורב',style:'mixed',h:[85,175,265,355,265,355],w:.47,g:.65},
 {name:'מדרגות הפסגה',style:'mixed',h:[80,170,260,350,440,350],w:.48,g:.64}
];

const PARKOUR_STYLES=['lamp','ac','sign','post','barrel','scaffold','utility','chimney','balcony','water','crate','garden','roof','solar'];



'use strict';
/** All audio is synthesized locally. Audio starts only after a user gesture. */
class SoundEngine {
  constructor() {
    this.context = null;
    this.muted = false;
    this.beatClock = 0;
    this.beatIndex = 0;
    try { this.muted = localStorage.getItem('kuzin-silent') === '1'; } catch (_) {}
  }
  unlock() {
    try {
      if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === 'suspended') this.context.resume().catch(()=>{});
    } catch (_) { /* Sound is optional if the browser does not support it. */ }
  }
  toggle() {
    this.unlock();
    this.muted = !this.muted;
    try { localStorage.setItem('kuzin-silent', this.muted ? '1' : '0'); } catch (_) {}
    return this.muted;
  }
  tone(frequency, duration=0.13, wave='triangle', volume=0.045, end=frequency) {
    if (this.muted || !this.context || this.context.state !== 'running') return;
    const a=this.context, time=a.currentTime, oscillator=a.createOscillator(), gain=a.createGain();
    oscillator.type=wave;
    oscillator.frequency.setValueAtTime(frequency,time);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,end),time+duration);
    gain.gain.setValueAtTime(volume,time);
    gain.gain.exponentialRampToValueAtTime(0.001,time+duration);
    oscillator.connect(gain); gain.connect(a.destination);
    oscillator.start(time); oscillator.stop(time+duration);
  }
  effect(name) {
    const effects={
      jump:[280,.17,'triangle',.07,590], flip:[440,.24,'triangle',.065,1150],
      collect:[940,.15,'sine',.07,1400], eat:[160,.22,'sawtooth',.025,72],
      hit:[95,.2,'sawtooth',.05,35], lose:[330,.6,'triangle',.07,60],
      swing:[430,.1,'triangle',.03,170],punch:[95,.15,'sawtooth',.04,45],spit:[800,.12,'triangle',.025,180],splat:[180,.18,'sine',.03,65],break:[100,.15,'sawtooth',.025,30],
      warning:[650,.2,'triangle',.045,900],transform:[130,.75,'sawtooth',.025,650],
      voice:[200,.5,'sawtooth',.025,390],perfume:[1300,.45,'triangle',.02,250],beans:[770,.25,'sine',.04,1050],milk:[350,.4,'sine',.035,90],
      map:[520,.32,'sine',.035,1040]
    };
    if (effects[name]) this.tone(...effects[name]);
    if (name==='win') [523,659,784,1046].forEach(f=>this.tone(f,.65,'triangle',.025));
  }
  music(dt) {
    // 124 BPM, eight-step bass groove, kick and bright off-beat arpeggios.
    this.beatClock-=dt;
    if (this.beatClock>0) return;
    this.beatClock+=60/124/2;
    const step=this.beatIndex++%16;
    const bass=[110,110,146.83,130.81,110,164.81,146.83,130.81];
    if (step%2===0) {
      this.tone(115,.12,'sine',.045,35);
      this.tone(bass[(step/2)%8],.19,'triangle',.018);
    } else {
      this.tone(1400,.035,'square',.005,550);
      this.tone([440,523.25,659.25,587.33][Math.floor(step/2)%4],.10,'triangle',.012);
    }
  }
}
/** Pointer IDs allow holding run and jumping with another finger simultaneously. */
class Controls {
  constructor(onJump,onPause,onGesture) {
    this.pointers=new Set(); this.keys=new Set();this.liftPointers=new Set();this.liftKeys=new Set();
    const button=dom('run');
    button.addEventListener('pointerdown',event=>{
      event.preventDefault(); onGesture();
      this.pointers.add(event.pointerId);
      button.setPointerCapture(event.pointerId);
      button.classList.add('pressed');
    });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) {
      button.addEventListener(type,event=>{
        this.pointers.delete(event.pointerId); this.refresh();
      });
    }
    // Direct, non-passive touch handlers stop iOS double-tap zoom on jump.
    const jumpButton = dom('jump');
    jumpButton.style.touchAction = 'none';
    jumpButton.addEventListener('touchstart', event => {
      if (event.cancelable) event.preventDefault();
      onGesture(); onJump();
    }, {passive:false});
    for (const type of ['touchend','touchcancel','touchmove']) {
      jumpButton.addEventListener(type, event => {
        if (event.cancelable) event.preventDefault();
      }, {passive:false});
    }
    jumpButton.addEventListener('pointerdown',event=>{
      if (event.pointerType === 'touch') {event.preventDefault();return;}
      event.preventDefault();this.liftPointers.add(event.pointerId);
      jumpButton.setPointerCapture(event.pointerId);onGesture();onJump();
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])jumpButton.addEventListener(type,event=>this.liftPointers.delete(event.pointerId));
    addEventListener('keydown',event=>{
      const run=['ArrowRight','KeyD'], jump=['Space','ArrowUp','KeyW','KeyA'];
      if(inputActive()) return;
      if ([...run,...jump,'Escape','KeyP'].includes(event.code)) event.preventDefault();
      if (event.repeat) return;
      onGesture();
      if (run.includes(event.code)) { this.keys.add(event.code);this.refresh(); }
      if (jump.includes(event.code)){this.liftKeys.add(event.code);onJump();}
      if (['Escape','KeyP'].includes(event.code)) onPause();
    });
    addEventListener('keyup',event=>{if(inputActive()) return;this.keys.delete(event.code);this.liftKeys.delete(event.code);this.refresh();});
  }
  get running() { return this.keys.size>0 || this.pointers.size>0; }
  get lifting(){return this.liftKeys.size>0||this.liftPointers.size>0;}
  refresh() { dom('run').classList.toggle('pressed',this.running); }
  clear() { this.pointers.clear();this.keys.clear();this.liftPointers.clear();this.liftKeys.clear();this.refresh(); }
}



'use strict';
/** Optional boss mode. Timers advance only in active simulation, never in menus/pause. */
const BUDDHA_POWERS = Object.freeze({
  voice:{name:'שבירת קול',duration:1.8,warning:1.6,hint:'הכן קפיצה! הצעקה מאטה לרגע.'},
  perfume:{name:'בושם מסיביר',duration:2.5,warning:1.6,hint:'אדים ירוקים בדרך. קפיצה מפחיתה משיכה.'},
  beans:{name:'גשם שעועית',duration:10,warning:1.6,hint:'אסוף כל שעועית! פספוס משמין פי שלושה.'},
  milk:{name:'רצפה חלקלקה',duration:5.2,warning:1.8,hint:'קפוץ מוקדם! באוויר ההחלקה נפסקת.'}
});
class BuddhaBoss {
  constructor(enabled=false){
    this.enabled=enabled;this.runningTime=0;this.transformed=false;this.age=0;this.transform=0;this.eyes=false;
    this.cooldown=9;this.warning=0;this.pending=null;this.active=null;this.remaining=0;this.elapsed=0;
    this.cycle=0;this.bag=[];this.rescue=0;this.slipVelocity=0;this.used=[];this.puddle=null;this.beanCollected=0;this.beanMissed=0;
  }
  get busy(){return !!(this.active||this.pending||this.transform>0);}
  deck(){
    // Every cycle contains all four powers; first round teaches them in order.
    const powers=['voice','perfume','beans','milk'];
    for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[powers[i],powers[j]]=[powers[j],powers[i]];}
    this.cycle++;return powers;
  }
  say(game,who,text,life=4){game.say(who,text);game.bubbles.find(b=>b.who===who).life=life;}
  beginWarning(game,type){
    this.pending=type;this.warning=BUDDHA_POWERS[type].warning;
    
    if(type==='beans'){this.say(game,'luzo','זאת לא?????');this.say(game,'kuzin','כן כן זאת היא...');}
  }
  activate(game,type){
    this.pending=null;this.warning=0;this.active=type;this.remaining=BUDDHA_POWERS[type].duration;this.elapsed=0;this.used.push(type);
    game.audio.effect(type);
    if(type==='voice')this.say(game,'kuzin','אחי איי&%^ן לי שבירות קול!!');
    if(type==='perfume'){
      this.say(game,'kuzin',Math.random()<.5?'חה חה חה חה ריח שמזכיר לי את הילדות בסיביר':'בוא לפה מתוק...',4.5);
      this.say(game,'luzo',Math.random()<.5?'שיאו איזה סירחון':'אבאלה איזה ריח לאסרי');
    }
    if(type==='beans'){
      this.beanCollected=0;this.beanMissed=0;
      for(const food of game.foods)this.beanify(food);
    }
    if(type==='milk'){
      this.say(game,'kuzin','אין כמו עלב אם טוב');
      this.puddle={start:game.player.x-50,end:game.player.x+game.profile.speed*5.7};
    }
  }
  beanify(food){if(!food.taken){food.originalType??=food.type;food.type='beans';food.energyMultiplier=3;}}
  stopPower(game){
    if(this.active==='beans'){
      // The ten-second window ends cleanly for every uncollected item.
      for(const food of game.foods)if(food.originalType){food.type=food.originalType;delete food.originalType;delete food.energyMultiplier;}
      game.emit('notice',this.beanMissed===0?'כל השעועית נאספה!':'נגמר גשם השעועית. ממשיכים!');
    }
    this.active=null;this.remaining=0;this.puddle=null;this.slipVelocity=0;this.cooldown=random(5.5,7.5);this.rescue=2;
  }
  update(game,dt){
    if(!this.enabled)return;
    this.rescue=Math.max(0,this.rescue-dt);
    if(game.input.running&&!game.player.blocked)this.runningTime+=dt;
    if(!this.transformed){
      if(game.chaser.energy>50)return;
      this.transformed=true;this.transform=2.4;this.age=0;this.rescue=3;
      game.chaser.gap=Math.max(game.chaser.gap,220);
      game.audio.effect('transform');
      // Only loose comic cloth scraps fly; the robe is already underneath.
      for(let i=0;i<18;i++)game.particles.push({x:game.chaser.x,y:70+random(0,90),vx:random(-150,100),vy:random(80,210),life:1.6,color:i%2?'#172735':'#f7a348',size:random(6,13)});
      return;
    }
    this.age+=dt;this.transform=Math.max(0,this.transform-dt);
    if(!this.eyes&&this.age>=8){this.eyes=true;}
    if(this.active){this.elapsed+=dt;this.remaining=Math.max(0,this.remaining-dt);if(this.remaining===0)this.stopPower(game);return;}
    if(this.pending){this.warning=Math.max(0,this.warning-dt);if(this.warning===0){
      if(game.player.blocked||game.chaser.gap<145){this.warning=.3;return;}
      this.activate(game,this.pending);
    }return;}
    if(!this.eyes||this.transform>0)return;
    this.cooldown-=dt;
    if(this.cooldown<=0&&!game.parkourNear()&&!game.player.blocked&&game.player.jumps===0&&game.chaser.gap>165){if(!this.bag.length)this.bag=this.deck();this.beginWarning(game,this.bag.shift());}
  }
  speed(game,base,held,dt){
    if(!this.enabled)return held?base:0;
    let multiplier=this.active==='voice'?.62:this.active==='perfume'?(game.player.y>90?.99:.95):1;
    if(this.active==='perfume'&&this.elapsed>.25&&this.elapsed<.55)return game.player.y>90?-90:-210;
    const onMilk=this.active==='milk'&&game.player.y===0&&this.puddle&&game.player.x>=this.puddle.start&&game.player.x<=this.puddle.end;
    if(onMilk){
      const target=held?base*1.20:0;
      this.slipVelocity+=(target-this.slipVelocity)*(1-Math.exp(-(held?15:10)*dt));
      if(this.slipVelocity<8)this.slipVelocity=0;
      return this.slipVelocity;
    }
    this.slipVelocity=held?base:0;
    return held?base*multiplier:0;
  }
  pursuitRate(){
    if(!this.transformed||this.transform>0)return 5;
    if(this.rescue>0)return 20;
    if(this.active)return 0; // No simultaneous burst and spell pressure.
    const surge=this.age%12>9.8;
    return surge?-19:-4;
  }
  applyPull(game,dt){
    // Direct spell pressure has a safety floor; obstacles and missed food still hurt.
    const amount=this.active==='voice'?24:this.active==='perfume'?(game.player.y>90?11:22):0;
    const floor=CONFIG.catchGap+65;
    if(amount&&game.chaser.gap>floor)game.chaser.gap=Math.max(floor,game.chaser.gap-amount*dt);
  }
  label(){return '';}
}



'use strict';
/** Timed melee, an aimed spit projectile, and incoming delivery waves. */
class CombatSystem {
  constructor(){this.age=0;this.nextWave=3;this.enemies=[];this.projectiles=[];this.attack=null;this.attackTime=0;this.kickCD=0;this.punchCD=0;this.spitCD=0;this.spitPose=0;this.wipe=0;this.look=0;this.lookClock=7;this.kills=0;this.wave=0;}
  strike(game,type){
    if(game.state!=='playing'||!['kick','punch'].includes(type))return false;
    const key=type+'CD';if(this[key]>0)return false;
    this[key]=type==='kick'?.46:.40;this.attack=type;this.attackTime=.33;game.audio.effect('swing');return true;
  }
  spit(game){
    if(game.state!=='playing'||this.spitCD>0)return false;
    this.spitCD=40;this.spitPose=.55;
    this.projectiles.push({x:game.player.x-30,y:game.player.y+150,life:1.4});game.audio.effect('spit');return true;
  }
  spawnWave(game,viewWidth){
    const level={easy:0,normal:1,hard:2,impossible:3}[game.difficulty];
    const count=1+Math.floor(Math.random()*(level+1));this.wave++;
    for(let n=0;n<count;n++){
      const type=['courier','plane','bike'][(this.wave+n)%3];
      this.enemies.push({type,x:game.player.x+Math.max(680,viewWidth*.8)+n*235,y:type==='plane'?360+random(0,70):38,vx:type==='bike'?240:type==='plane'?220:155,phase:0,dead:false,life:1,locked:false});
    }
    this.nextWave=random(4.8-level*.7,6.5-level*.8);
  }
  update(game,dt,viewWidth){
    const p=game.player,k=game.chaser;
    for(const key of ['kickCD','punchCD','spitCD','spitPose','wipe','look','attackTime'])this[key]=Math.max(0,this[key]-dt);
    if(this.attackTime===0)this.attack=null;
    if(game.input.running&&!p.blocked)this.age+=dt;
    this.lookClock-=dt;
    if(this.lookClock<=0){this.lookClock=random(10,18);if(!this.attack&&!this.spitPose&&!game.boss.busy){this.look=.65;game.say('luzo','יבן זונהההה');}}
    if(!game.secondary&&this.age>=37&&!game.parkourNear()){this.nextWave-=dt;if(this.nextWave<=0)this.spawnWave(game,viewWidth);}
    for(const spit of this.projectiles){
      const target=k.x,dx=target-spit.x,dy=(k.y||0)+145-spit.y,dist=Math.hypot(dx,dy)||1;
      spit.x+=dx/dist*1100*dt;spit.y+=dy/dist*1100*dt;spit.life-=dt;
      if(dist<30){spit.life=0;this.wipe=2.3;game.burst(k.x,(k.y||0)+145,'#e0f5cf',14);game.audio.effect('splat');}
    }
    this.projectiles=this.projectiles.filter(s=>s.life>0);
    for(const e of this.enemies){
      if(!game.secondary)e.phase+=dt*15;
      if(e.dead){if(game.secondary)continue;e.vy??=260;e.x+=420*dt;e.y+=e.vy*dt;e.vy-=850*dt;if(e.y<38){e.y=38;e.vy=Math.abs(e.vy)*.25;}e.life-=dt;continue;}
      if(!game.secondary)e.x-=e.vx*dt;
      const dx=e.x-p.x;
      if(e.type==='plane'&&!game.secondary){if(!e.locked){e.targetY=Math.min(350,p.y+120);if(dx<220)e.locked=true;}e.y+=((e.targetY??130)-e.y)*Math.min(1,dt*5.5);}
      if(game.power.barber&&e.type!=='plane'&&dx>-65&&dx<155&&Math.abs(e.y-(p.y+60))<105){game.power.trim(game,e);continue;}
      const correct=e.type==='plane'?['punch','kick'].includes(this.attack):this.attack==='kick';
      const reachY=p.y+(this.attack==='kick'?65:130);
      const ninja=e.type==='plane'&&p.jumps===2&&p.ninja>0&&dx>-45&&dx<145&&Math.abs(e.y-(p.y+80))<100;
      if(ninja||(correct&&this.attackTime>0&&dx>-50&&dx<185&&Math.abs(e.y-reachY)<85)){
        if(ninja){this.attack="kick";this.attackTime=.33;p.flip=0;p.vy=Math.max(p.vy,220);game.popups.push({x:p.x,y:p.y+190,text:"בעיטת נינג׳ה!",color:"#b6f6ff",life:.8});}
        e.dead=true;p.slow=0;this.kills++;game.score+=250;game.wallet.gainXP(16);game.burst(e.x,e.y,e.type==='plane'?'#ff9b36':'#71e5ef',24);game.audio.effect('punch');continue;
      }
      const collision=Math.abs(dx)<42&&(e.type==='plane'?Math.abs(e.y-(p.y+110))<70:p.y<85);
      if(collision&&!e.contact){
        e.contact=true;
        if(p.invincible===0){
          if(game.shield){game.shield=false;game.emit('notice','המגן ספג את ההתנגשות!');}
          else {p.slow=1.15;k.gap-=18*game.profile.penalty;game.hits++;game.combo=0;game.emit('notice',e.type==='plane'?'התנגשות! בעיטה, אגרוף או סלטה על המטוס.':'שליח! בעיטה או קפיצה מעליו.');}
          p.invincible=.9;game.audio.effect('hit');game.burst(p.x,p.y+70,'#ffc77b',10);
        }
      }
    }
    this.enemies=this.enemies.filter(e=>e.life>0&&e.x>k.x-300);
  }
}



'use strict';
/** Simulation only: world state, encounters, hit detection and progression. */
// Session economy. Kept outside round resets; persistence can be added separately.
const HEROES = Object.freeze({
  luzo:{name:'הדר',power:'סמוחטה',icon:'◉',cooldown:40,duration:0,color:'#56cde0',description:'סמוחטה לאחור. קוזין מנגב את הפנים ומאט.'},
  yona:{name:'יונה',power:'כנפיים',icon:'✦',cooldown:40,duration:3,color:'#aacfff',description:'הופכים ליונה ל־3 שניות. מחזיקים רווח או קפיצה כדי לעלות; משחררים כדי לגלוש.'},
  yishai:{name:'ישי',power:'תספורת',icon:'✶',cooldown:40,duration:7,color:'#f4a7c1',description:'מכונת תספורת ל־7 שניות. שליחים ואופנועים בטווח קרוב מקבלים קיצוץ ועפים מהמסלול.'},
  eyal:{name:'אייל',power:'מונית',icon:'◫',cooldown:60,duration:1.4,color:'#ffba76',description:'פעם הבאה אני מזמין טקסי! מונית מפנה רק את המכשולים הגלויים במסך לפניך.'},
  hashi:{name:'חאשי',power:'עולם מחייך',icon:'◎',cooldown:60,duration:7,color:'#b5e58b',description:'פייסל ענק, ענן וחיוכים: העולם מאט ל־6 שניות והחיוכים נשארים ל־7 שניות.'},
  tzippy:{name:'סבתא',price:2500,power:'תופסים טרמפ',icon:'✦',cooldown:60,duration:4.5,color:'#dba7ce',description:'דמות רעולת פנים מרימה את ציפי ורצה איתה בידיים. פארקור אוטומטי וקפיצות למשך 4.5 שניות.'},
  michael:{name:'מיכאל',price:1000,power:'כוח מיצי',icon:'🐾',cooldown:70,duration:3,color:'#96c3ab',description:'הופכים למיצי ל־3 שניות. אם קוזין תופס אותך בזמן הזה, חוזרים פעם אחת בדיוק 3 שניות לאחור. טעינה: 70 שניות.'},
  bracha:{name:'ברכה',price:2500,power:'ענן כבידה',icon:'☁',cooldown:50,duration:4.5,color:'#b8d7bc',description:'ענן קסום מפחית את הכבידה ומגביה קפיצות למשך 4.5 שניות. טעינה: 50 שניות.'},
  fahima:{name:'פחימה',price:2500,power:'המכונית הצהובה של פחימה',icon:'➤',cooldown:50,duration:6,color:'#ffe14f',description:'רוכבים על המכונית. בתוך 6 שניות קפיצה כפולה מפעילה טורבו חד־פעמי, ואז עוד 3 שניות רכיבה. טעינה: 50 שניות.'},
  moreno:{name:'מורנו',power:'זה לא מורנו!',icon:'◆',cooldown:40,duration:15,color:'#d8b6ff',description:'״זה לא מורנו זה פורנו!״ קוזין נשאר בבוקסר ל־15 שניות, קופא במקום לשנייה.'}
});
const MODIIN_SCENERY='DATA';
const TEST_MODE=false;
// Equipment is shared by all heroes. Each hero's fitted animation is cached independently.
const GEAR = [
{id:'dogs',name:'פוטר דוברמן שחור',price:600,slot:'outfit',store:'zanos',tile:9},
{id:'paisley',name:'מעיל פייזלי קיופיד',price:600,slot:'outfit',store:'motagos',tile:10},
{id:'tekhelet',name:'ציצית פתיל תכלת',price:600,slot:'fringe',store:'motagos',tile:11},
{id:'kozinshoe',name:'הנעל של קוזין',price:450,slot:'feet',store:'zanos',tile:12},

{id:'kippah',name:'כיפה סרוגה',price:300,slot:'head',store:'zanos',tile:0},
{id:'tech',name:'חליפת נייק אפורה',price:900,slot:'outfit',store:'motagos',tile:1},
{id:'fahima',name:'מעיל הרוח של פחימה',price:600,slot:'outfit',store:'zanos',tile:2},
{id:'suede',name:'דוסה זמש עם אבזם',price:600,slot:'feet',store:'motagos',tile:3},
{id:'foam',name:'אדידס אדילט 22',price:600,slot:'feet',store:'zanos',tile:4},
{id:'stripes',name:'אדידס אדילט אקווה',price:600,slot:'feet',store:'zanos',tile:5},
{id:'pink',name:'אמירי סטארס קורט דנים',price:600,slot:'feet',store:'motagos',tile:6},
{id:'nb',name:'ניו באלאנס 9060',price:600,slot:'feet',store:'motagos',tile:7},
{id:'loops',name:'סניקרס מונוגרם שחור־לבן',price:600,slot:'feet',store:'motagos',tile:8}
];
const wardrobe = {
 owned:new Set(),equipped:{}, cache:new WeakMap(), icons:[], urls:[], ready:false,
 get key(){return TEST_MODE?'kozin-wardrobe-lab-v3':'kozin-wardrobe-v3'},
 restore(){try{const d=JSON.parse(localStorage.getItem(this.key)||'{}');this.owned=new Set((d.owned||[]).filter(id=>GEAR.some(g=>g.id===id)));this.equipped={};for(const [s,id]of Object.entries(d.equipped||{}))if(this.owned.has(id)&&GEAR.some(g=>g.id===id&&g.slot===s))this.equipped[s]=id;}catch{}},
 save(){try{localStorage.setItem(this.key,JSON.stringify({owned:[...this.owned],equipped:this.equipped}));}catch{notify('השמירה במכשיר חסומה בדפדפן');}},
 transact(id){const item=GEAR.find(i=>i.id===id);if(!item)return false;const w=game.wallet;
  if(!this.owned.has(id)){if(!TEST_MODE&&w.balance<item.price){notify('חסר לך '+(item.price-w.balance)+' אוכל');return false;}if(!TEST_MODE)w.balance-=item.price;this.owned.add(id);w.save();}
  if(this.equipped[item.slot]===id)delete this.equipped[item.slot];else this.equipped[item.slot]=id;
  this.save();refreshHud();return true;
 },
 async load(url){const atlas=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});
  const boxes=[[0,180,425,310],[480,0,310,620],[810,50,470,550],[0,630,427,250],[428,630,400,250],[830,630,450,250],[0,915,425,300],[427,915,401,300],[830,915,450,300]];for(let n=0;n<9;n++){const [sx,sy,cw,ch]=boxes[n];const c=document.createElement('canvas');c.width=Math.floor(cw);c.height=Math.floor(ch);const x=c.getContext('2d');x.drawImage(atlas,sx*atlas.width/1280,sy*atlas.height/1280,cw*atlas.width/1280,ch*atlas.height/1280,0,0,cw,ch);const a=x.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++)if(a[(y*c.width+xx)*4+3]>35){x0=Math.min(x0,xx);x1=Math.max(x1,xx);y0=Math.min(y0,y);y1=Math.max(y1,y);}const out=document.createElement('canvas');out.width=x1-x0+3;out.height=y1-y0+3;out.getContext('2d').drawImage(c,x0,y0,x1-x0+1,y1-y0+1,1,1,x1-x0+1,y1-y0+1);this.icons.push(out);this.urls.push(out.toDataURL());}
  this.ready=true;
 },
 fit(source,kind='run',pose=0,gear=this.equipped){
  if(!source||!this.ready||!Object.keys(gear).length)return source;
  let map=this.cache.get(source);if(!map){map=new Map();this.cache.set(source,map);}const key=JSON.stringify(gear)+kind+pose;if(map.has(key))return map.get(key);
  const out=document.createElement('canvas');out.width=source.width;out.height=source.height;const c=out.getContext('2d',{willReadFrequently:true});c.drawImage(source,0,0);const im=c.getImageData(0,0,out.width,out.height),d=im.data,W=out.width,H=out.height;
  let l=W,r=0,t=H,b=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(d[(y*W+x)*4+3]>100){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  const bw=r-l,bh=b-t; if(bh<10)return source;
  const idle=kind==='idle',kick=kind==='kick';
  // Silhouette bounds give the correct local coordinates for every authored frame.
  let hx=0,hm=0,hl=W,hr=0;for(let y=t;y<t+bh*.11;y++)for(let x=l;x<=(kick?l+bw*.62:r);x++)if(d[(y*W+x)*4+3]>160){hx+=x;hm++;hl=Math.min(hl,x);hr=Math.max(hr,x);}hx=hm?hx/hm:(l+r)/2;
  const headW=hr-hl,neck=t+bh*(idle?.185:.205),hip=t+bh*(idle?.49:kick?.51:.53);
  const waistX=idle?(l+r)/2:hx-bh*.16;
  const clothMask=new Uint8Array(W*H),shoeMask=new Uint8Array(W*H);
  const cream=(R,G,B,y,x)=>gear.hero==='tzippy'&&R>190&&G>155&&B>85&&R-G<65&&G-B<100&&((y>t+bh*(idle?.89:.77))||(kick&&x>l+bw*.79));
  const skin=(R,G,B)=>R>80&&R>G*1.12&&G>B*1.10&&R-B>36;
  // White/grey footwear components, including socks, are replaced rather than overlaid.
  if(gear.feet){
   const visited=new Uint8Array(W*H),seeds=[];
   for(let y=t;y<=b;y++)for(let x=l;x<=r;x++){const i=y*W+x,k=i*4,R=d[k],G=d[k+1],B=d[k+2];if(d[k+3]>100&&(cream(R,G,B,y,x)||(!skin(R,G,B)&&Math.max(R,G,B)-Math.min(R,G,B)<55&&R>218))&&((y>t+bh*(idle?.80:.67))||(kick&&x>l+bw*.73)))seeds.push(i);}
   for(const seed of seeds){if(visited[seed])continue;const q=[seed];visited[seed]=1;let minX=W,maxX=0,minY=H,maxY=0;
    for(let j=0;j<q.length;j++){const p=q[j],x=p%W,y=Math.floor(p/W);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const n of [p-1,p+1,p-W,p+W]){if(n<0||n>=W*H||visited[n])continue;const nx=n%W,ny=Math.floor(n/W),k=n*4,R=d[k],G=d[k+1],B=d[k+2];if(Math.abs(nx-x)+Math.abs(ny-y)!==1)continue;if(d[k+3]>75&&(cream(R,G,B,ny,nx)||(!skin(R,G,B)&&Math.max(R,G,B)-Math.min(R,G,B)<70&&R>195))&&((ny>t+bh*(idle?.79:.64))||(kick&&nx>l+bw*.73))){visited[n]=1;q.push(n);}}}
    if(q.length>bh*bh*.0015 && maxX-minX<bh*.5){for(const p of q)shoeMask[p]=1;}
   }
  }
  c.putImageData(im,0,0);
  if(gear.feet){const groups=[],seen=new Uint8Array(W*H);for(let i=0;i<shoeMask.length;i++){if(!shoeMask[i]||seen[i])continue;const q=[i];seen[i]=1;let x0=W,x1=0,y0=H,y1=0;for(let z=0;z<q.length;z++){let p=q[z],x=p%W,y=Math.floor(p/W);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(let n of [p-1,p+1,p-W,p+W])if(n>=0&&n<W*H&&!seen[n]&&shoeMask[n]){seen[n]=1;q.push(n);}}if(q.length>bh*bh*.0015)groups.push({q,x0,x1,y0,y1});}
   // Socks and laces can split one foot into multiple white islands. Merge them into the two actual feet.
   while(groups.length>2){let ai=0,bi=1,best=Infinity;for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++){const A=groups[a],B=groups[b],dist=Math.hypot((A.x0+A.x1-B.x0-B.x1)/2,(A.y0+A.y1-B.y0-B.y1)/2);if(dist<best){best=dist;ai=a;bi=b;}}const A=groups[ai],B=groups[bi];A.q.push(...B.q);A.x0=Math.min(A.x0,B.x0);A.x1=Math.max(A.x1,B.x1);A.y0=Math.min(A.y0,B.y0);A.y1=Math.max(A.y1,B.y1);groups.splice(bi,1);}
   const item=GEAR.find(g=>g.id===gear.feet),art=this.icons[item.tile];
   groups.sort((a,b)=>a.x0-b.x0);
   for(const [footIndex,g] of groups.entries()){
    const sw=g.x1-g.x0+1,sh=g.y1-g.y0+1;
    const vertical=sh>sw*1.18&&!idle,raised=vertical&&kick&&g.y0<t+bh*.5;
    const pad=Math.max(4,bh*.035),slide=['suede','foam','stripes'].includes(gear.feet);
    let skinColor=[207,153,117];outer:for(let yy=Math.max(t,g.y0-bh*.2)|0;yy<g.y0;yy++)for(let xx=g.x0;xx<=g.x1;xx++){const k=(yy*W+xx)*4;if(d[k+3]>180&&skin(d[k],d[k+1],d[k+2])){skinColor=[d[k],d[k+1],d[k+2]];break outer;}}
    // Locate the actual leg cross-section, before removing the entire original footwear.
    const cut=vertical?(raised?g.x0:g.x1):g.y0;
    const samples=[];
    if(!vertical){for(let xx=Math.max(0,g.x0-pad)|0;xx<Math.min(W,g.x1+pad);xx++){const k=((cut-1)*W+xx)*4;if(d[k+3]>140)samples.push(xx);}}
    else {for(let yy=Math.max(0,g.y0-pad)|0;yy<Math.min(H,g.y1+pad);yy++){const k=(yy*W+cut+(raised?-1:1))*4;if(d[k+3]>140)samples.push(yy);}}
    const spans=[];for(const v of samples){let z=spans[spans.length-1];if(!z||v>z[1]+1)spans.push([v,v]);else z[1]=v;}
    const expected=vertical?g.y0+sh*(raised?.72:.25):g.x0+sw*.35;
    spans.sort((a,b)=>Math.abs((a[0]+a[1])/2-expected)-Math.abs((b[0]+b[1])/2-expected));
    const span=spans[0]||[expected-bh*.025,expected+bh*.025],ac=(span[0]+span[1])/2;
    const aw=Math.max(bh*.035,Math.min(bh*.065,span[1]-span[0]+1));
    const ax=vertical?cut:ac,ay=vertical?ac:cut;
    let upstream=[];
    const back=Math.max(3,Math.round(bh*.035));
    if(!vertical){const yy=Math.max(0,cut-back);for(let xx=Math.max(0,ax-aw*1.7)|0;xx<Math.min(W,ax+aw*1.7);xx++)if(d[(yy*W+xx)*4+3]>160)upstream.push(xx);}
    else{const xx=Math.max(0,Math.min(W-1,cut+(raised?-back:back)));for(let yy=Math.max(0,ay-aw*1.7)|0;yy<Math.min(H,ay+aw*1.7);yy++)if(d[(yy*W+xx)*4+3]>160)upstream.push(yy);}
    const lean=upstream.length?Math.max(-bh*.035,Math.min(bh*.035,ac-upstream.reduce((a,b)=>a+b,0)/upstream.length)):0;
    if(!vertical)c.clearRect(g.x0-pad,cut,sw+2*pad,sh+2*pad);
    else if(raised)c.clearRect(cut,g.y0-pad,sw+2*pad,sh+2*pad);
    else c.clearRect(g.x0-pad,g.y0-pad,sw+pad,sh+2*pad);
    const flip=idle&&footIndex===0?-1:1;
    const angle=vertical?(raised?-Math.PI/2:Math.PI/2):0;
    const fw=bh*(idle?(footIndex===0?.175:.185):.205),fh=fw*art.height/art.width;
    // Collar anchors are measured on the shoe art; the ankle ends inside the collar.
    const heel=-fw*.22,collarY=-fh*.16;
    const fx=vertical?(raised?cut+fh*.52:cut-fh*.52):ax+flip*fw*.22+lean;
    const fy=vertical?ay-Math.sin(angle)*heel+lean:g.y1+pad*.15-fh*.5;
    const cx=fx+Math.cos(angle)*flip*heel-Math.sin(angle)*collarY;
    const cy=fy+Math.sin(angle)*flip*heel+Math.cos(angle)*collarY;
    const endWidth=Math.min(aw*.70,bh*.043);
    c.save();const shade=c.createLinearGradient(ax-aw/2,ay,ax+aw/2,ay);shade.addColorStop(0,slide?`rgb(${skinColor.map(v=>Math.max(0,v-24))})`:'#c9cbd0');shade.addColorStop(.45,slide?`rgb(${skinColor})`:'#f5f4ef');shade.addColorStop(1,slide?`rgb(${skinColor.map(v=>Math.max(0,v-13))})`:'#dedee0');c.fillStyle=shade;
    c.beginPath();
    if(vertical){c.moveTo(ax+(raised?-2:2),ay-aw/2);c.lineTo(ax+(raised?-2:2),ay+aw/2);c.lineTo(cx,cy+endWidth/2);c.lineTo(cx,cy-endWidth/2);}
    else{c.moveTo(ax-aw/2,ay-2);c.lineTo(ax+aw/2,ay-2);c.lineTo(cx+endWidth/2,cy+2);c.lineTo(cx-endWidth/2,cy+2);}
    c.closePath();c.fill();c.restore();
    c.save();c.translate(fx,fy);c.rotate(angle);c.scale(flip,1);
    if(slide){c.fillStyle=`rgb(${skinColor})`;c.beginPath();c.ellipse(fw*.10,-fh*.08,fw*.32,fh*.26,0,0,Math.PI*2);c.fill();}
    c.drawImage(art,-fw/2,-fh/2,fw,fh);c.restore();
   }
  }
  if(gear.head==='kippah'){const hat=this.icons[0],hw=Math.min(bh*.19,Math.max(headW*.96,bh*.13)),hh=hw*hat.height/hat.width;c.drawImage(hat,hx-hw*.52,t-hh*.12,hw,hh*.62);}
  if(map.size>2)map.clear();map.set(key,out);return out;
 }
};
wardrobe.restore();
const WARDROBE_ART={"luzo": "DATA", "eyal": "DATA", "yishai": "DATA", "moreno": "DATA", "hashi": "DATA", "yona": "DATA", "equipment": "DATA", "shoe": "DATA"};
Object.assign(wardrobe,{
 costumes:{}, portraitCache:new Map(), preview:null,
 async loadAll(){
  await this.load(WARDROBE_ART.equipment);
  if(WARDROBE_ART.shoe){const i=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=WARDROBE_ART.shoe;});const c=this.trim(i);this.icons[8]=c;this.urls[8]=c.toDataURL();}
  await Promise.all(['luzo','yona','eyal','hashi','moreno','yishai'].map(async id=>{
   if(!WARDROBE_ART[id])return;
   const atlas=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=WARDROBE_ART[id];});
   const cw=atlas.width/4,ch=atlas.height/6;this.costumes[id]={tech:[],fahima:[]};
   for(let n=0;n<24;n++){const crop=document.createElement('canvas');crop.width=Math.floor(cw);crop.height=Math.floor(ch);crop.getContext('2d').drawImage(atlas,n%4*cw,Math.floor(n/4)*ch,cw,ch,0,0,cw,ch);this.costumes[id][n<12?'tech':'fahima'].push(crop);}
  }));
 },
 trim(img){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);const a=x.getImageData(0,0,c.width,c.height).data;let l=c.width,r=0,t=c.height,b=0;for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++)if(a[(y*c.width+xx)*4+3]>60){l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,y);b=Math.max(b,y);}const out=document.createElement('canvas');out.width=r-l+5;out.height=b-t+5;out.getContext('2d').drawImage(c,l,t,r-l+1,b-t+1,2,2,r-l+1,b-t+1);return out;},
 normalize(crop){
  const c=this.trim(crop),out=document.createElement('canvas');out.width=448;out.height=384;
  const x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;let hx=0,m=0;
  for(let y=0;y<c.height*.14;y++)for(let xx=0;xx<c.width;xx++)if(d[(y*c.width+xx)*4+3]>100){hx+=xx;m++;}
  hx=m?hx/m:c.width/2;const scale=Math.min(300/c.height,410/c.width);
  out.getContext('2d').drawImage(c,248-hx*scale,335-c.height*scale,c.width*scale,c.height*scale);return out;
 },
 getFrame(id,index,gear=this.equipped){
  let img,kind=index===8?'idle':index===11?'kick':'run';
  if(gear.outfit&&this.costumes[id]?.[gear.outfit])img=this.costumes[id][gear.outfit][index];
  else if(id==='luzo'){
   if(index===8)img=assets.images.lobby;
   else if(index===10)img=assets.combatFrames[1];
   else if(index===11)img=assets.combatFrames[0];
   else img=assets.runFrames[index===9?2:index%8];
  }else img=assets.heroFrames?.[id]?.[index];
  return {img:this.fit(img,kind,index,{head:gear.head,feet:gear.feet,hero:id}),kind,original:!gear.outfit&&id==='luzo'};
 },
 drawHero(c,id,x,y,height,moving,g,gear=this.equipped){
  const mode=g?g.combat.attack==='kick'?'kick':g.combat.attack==='punch'?'punch':g.player.jumps>0?'jump':moving?'run':'idle':'idle';
  const phase=g?g.player.phase:0,index=mode==='kick'?11:mode==='punch'?10:mode==='jump'?9:mode==='run'?Math.floor(phase*.8)%8:8;
  const f=this.getFrame(id,index,gear);if(!f.img)return;
  if(f.original){const w=f.img.width*height/f.img.height;c.drawImage(f.img,x-w/2,y-height,w,height);}
  else {const scale=height/300;c.drawImage(f.img,x-f.img.width*scale/2,y-335*scale,f.img.width*scale,f.img.height*scale);}
 },
 portrait(id){const k=id+JSON.stringify(this.equipped);if(this.portraitCache.has(k))return this.portraitCache.get(k);const f=this.getFrame(id,8);if(!f.img)return '';const img=this.trim(f.img),c=document.createElement('canvas');c.width=400;c.height=600;const scale=Math.min(380/img.width,570/img.height);c.getContext('2d').drawImage(img,(400-img.width*scale)/2,600-img.height*scale,img.width*scale,img.height*scale);const url=c.toDataURL();if(this.portraitCache.size>12)this.portraitCache.clear();this.portraitCache.set(k,url);return url;},
 animatePreview(time){const canvas=document.getElementById('fittingCanvas');if(!canvas||!this.preview||!this.ready||!assets.loaded)return;const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height;c.clearRect(0,0,W,H);c.fillStyle='#d9bc7820';c.beginPath();c.ellipse(W/2,H*.89,W*.27,H*.028,0,0,Math.PI*2);c.fill();
  const p=this.preview,item=GEAR.find(g=>g.id===p.item),gear={...this.equipped,[item.slot]:item.id};
  const mock={combat:{attack:['punch','kick'].includes(p.mode)?p.mode:null},player:{phase:time/95,jumps:p.mode==='jump'?1:0}};
  const jump=p.mode==='jump'?Math.abs(Math.sin(time/340))*42:0;
  this.drawHero(c,p.id,W/2,H*.89-jump,H*.71,p.mode==='run',mock,gear);
 }
});

const levelXPNeeded = level => Math.floor(750 + 280*Math.pow(level,1.55));
const levelFoodReward = level => level<=3?50:level<=6?100:level<=10?150:level<=15?250:level<=22?350:500+Math.floor((level-23)/6)*100;

const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const ICONS=Object.freeze({
 store:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18l-1.2 10H4.2L3 10Z"/><path d="M7 10V8a5 5 0 0 1 10 0v2"/><path d="M7.4 14.3h.1M16.5 14.3h.1"/></svg>`,
 account:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M4.7 20c1.7-3.6 4.5-5.3 7.3-5.3S17.6 16.4 19.3 20"/></svg>`,
 settings:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1 0 2.8 2 2 0 0 1-2.8 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1 .2l-.2.1a2 2 0 0 1-2.8 0 2 2 0 0 1 0-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1L4.8 8a2 2 0 0 1 0-2.8 2 2 0 0 1 2.8 0l.2.1a1 1 0 0 0 1 .2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 0 2 2 0 0 1 0 2.8l-.1.2a1 1 0 0 0-.2 1 1 1 0 0 0 .9.7h.2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.2a1 1 0 0 0-.9.6Z"/></svg>`,
 food:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5"/><path d="M3.5 11h17"/><path d="M5.5 11l1.2 5.1A2.3 2.3 0 0 0 9 18h6a2.3 2.3 0 0 0 2.3-1.9l1.2-5.1"/><path d="M7.8 7.4c.7-.8 1.8-1.4 3.2-1.7"/><path d="M13.3 5.7c1.2.2 2.4.8 3.1 1.7"/></svg>`,
 trophy:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z"/><path d="M6 6H4a2 2 0 0 0 2 4h1"/><path d="M18 6h2a2 2 0 0 1-2 4h-1"/><path d="M12 11v4"/><path d="M8.5 21h7"/><path d="M9.5 15h5l1 6h-7l1-6Z"/></svg>`,
 lock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
 players:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="2.6"/><circle cx="16.5" cy="9" r="2.1"/><path d="M4.5 18c1.2-2.8 3.2-4.1 5.2-4.1s4 1.3 5.2 4.1"/><path d="M14.4 17.2c.8-1.9 2.2-2.9 3.9-2.9.7 0 1.5.2 2.2.6"/></svg>`,
 sound:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 14h3l4 4V6L8 10H5z"/><path d="M16 9c1.4 1.1 2 2.3 2 3s-.6 1.9-2 3"/><path d="M18.5 6.7C20.8 8.4 22 10.4 22 12s-1.2 3.6-3.5 5.3"/></svg>`,
 control:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9" width="16" height="9" rx="4.5"/><path d="M8 12v4"/><path d="M6 14h4"/><circle cx="16.5" cy="12.5" r=".9" fill="currentColor" stroke="none"/><circle cx="18.6" cy="14.7" r=".9" fill="currentColor" stroke="none"/></svg>`,
 easy:`<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true"><path d="M7 34h10l7-8 4 5 8-4 5 7-2 5H7Z" fill="#79ecff" fill-opacity=".28" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M15 19h14M9 25h8M7 30h7" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><path d="M28 31l7 5" stroke="currentColor" stroke-width="2"/></svg>`,
 normal:`<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true"><path d="M7 35 22 17l7 7-7 7 5 5H7Z" fill="#ffd982" fill-opacity=".24" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="m22 17 6-6 15 15-6 6" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/><path d="M16 22H7M12 29H4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
 hard:`<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true"><path d="M25 5c0 12-10 13-10 24 0 8 5 13 11 13 9 0 16-6 16-15 0-10-8-14-8-20-1 7-4 9-6 9-2-4-2-8-3-11Z" fill="#ff7045" fill-opacity=".30" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M28 23c-3 6-8 8-8 12 0 3 3 6 7 6 6 0 9-4 8-9-1-3-5-6-7-9Z" fill="currentColor" opacity=".75"/></svg>`,
 impossible:`<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true"><path d="M9 25c0-11 7-18 15-18s15 7 15 18c0 6-3 10-8 12v5H17v-5c-5-2-8-6-8-12Z" fill="#ff3f4d" fill-opacity=".24" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="m16 25 7 2-5 5-5-2Zm16 0-7 2 5 5 5-2Z" fill="currentColor"/><path d="M23 30h2l1 5h-4l1-5ZM18 41v-5m6 6v-6m6 5v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
});
const iconSvg=name=>ICONS[name]||'';
const iconSpan=(name,cls='ui-icon')=>`<span class="${cls}" aria-hidden="true">${iconSvg(name)}</span>`;
const inputActive=()=>{const el=document.activeElement;return !!el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT'||el.isContentEditable);};
class SessionWallet {
 constructor(){this.selected='luzo';this.food=0;this.xp=0;this.best=0;this.name='';this.owned=new Set(Object.keys(HEROES));}
 earn(){this.food++;}gainXP(n){this.xp+=n;}record(n){this.best=Math.max(this.best,n);}flush(){}save(){}
}
class HeroPower {
  constructor(){this.cooldown=0;this.remaining=0;this.elapsed=0;this.type=null;this.tray=null;this.shock=0;this.clips=[];}
  activate(game){
    if(game.state!=='playing'||this.cooldown>0)return false;
    const id=game.wallet.selected,h=HEROES[id],p=game.player;
    if(id==='luzo'&&!game.combat.spit(game))return false;
    this.type=id;this.cooldown=h.cooldown;this.remaining=h.duration;this.elapsed=0;
    if(id==='yona'){p.jumps=1;p.flip=0;p.vy=Math.max(400,p.vy);game.say('luzo','גדלתי בבת ים אחי');game.burst(p.x,p.y+90,'#e5f4ff',24);}
    if(id==='yishai'){game.say('luzo','רק קצת בצדדים!');game.audio.effect('swing');}
    if(id==='eyal'){this.tray={x:p.x-15,y:p.y,vy:0,age:0,picked:false};game.say('luzo','פיצה רומי, על חשבוני!');}
    if(id==='hashi'){game.say('luzo','אחי... כל העולם מחייך');game.burst(p.x,p.y+130,'#d9e8ca',18);}
    if(id==='moreno'){game.say('luzo','זה לא מורנו זה פורנו!');this.shock=2.2;game.burst(game.chaser.x,game.chaser.y+110,'#d9b2ff',24);}
    game.audio.effect('collect');return true;
  }
  get flying(){return this.type==='yona'&&this.remaining>0;}
  get barber(){return this.type==='yishai'&&this.remaining>0;}
  get worldScale(){return this.type==='hashi'&&this.remaining>1?.38:1;}
  update(game,realDt){
    this.cooldown=Math.max(0,this.cooldown-realDt);
    const wasFlying=this.flying;
    this.remaining=Math.max(0,this.remaining-realDt);this.elapsed+=realDt;
    if(wasFlying&&!this.flying){game.player.jumps=Math.max(1,game.player.jumps);game.player.vy=Math.min(game.player.vy,120);game.burst(game.player.x,game.player.y+90,'#fff4d7',18);}
    if(this.shock>0){this.shock=Math.max(0,this.shock-realDt);game.chaser.gap=Math.min(CONFIG.maxGap,game.chaser.gap+38*realDt);}
    const t=this.tray;
    if(t){
      t.age+=realDt;
      if(!t.picked){
        t.vy-=1000*realDt;t.y=Math.max(0,t.y+t.vy*realDt);
        if(t.y===0&&game.chaser.y<85&&game.chaser.x>=t.x-42&&game.chaser.x<t.x+200){t.picked=true;t.age=0;this.shock=2.8;game.say('kuzin','רגע... איפה הפיצה?!');game.audio.effect('hit');}
        else if(game.chaser.x>t.x+250||t.age>12)this.tray=null;
      }else if(t.age>2.8)this.tray=null;
    }
    for(const cut of this.clips)cut.life-=realDt;
    this.clips=this.clips.filter(c=>c.life>0);
  }
  trim(game,enemy){
    enemy.dead=true;enemy.vy=300;enemy.trimmed=true;game.player.slow=0;
    game.combat.kills++;game.score+=250;
    this.clips.push({x:enemy.x,y:enemy.y,life:.7});
    game.burst(enemy.x,enemy.y+50,'#302724',18);
    game.popups.push({x:enemy.x,y:enemy.y+130,text:'קיצוץ על הבית!',color:'#ffcee3',life:1});game.audio.effect('punch');
  }
}

class RunnerGame {
  constructor(audio) {
    this.audio=audio;this.difficulty="normal";this.wallet=new SessionWallet();
    this.input=null;
    this.state='loading';
    this.best=0;
    this.events=[];
    try { this.best=Number(localStorage.getItem('kuzin-best'))||0; } catch (_) {}
    this.reset();
  }
  reset() {
    this.power=new HeroPower();this.profile=DIFFICULTIES[this.difficulty];this.combat=new CombatSystem();this.boss=new BuddhaBoss(['hard','impossible'].includes(this.difficulty));this.score=0;this.shield=false;this.cleared=0;this.jumpBuffer=0;this.missionDone=false;this.walletNoticeShown=false;
    this.player={x:320,y:0,vy:0,jumps:0,flip:0,flipDuration:.64,stunt:0,landing:0,phase:0,blocked:false,invincible:0,slow:0,airTime:0,ninja:0};
    this.routeBag=[];this.lastRoute=-1;this.trail=[];this.chaser={y:0,x:110,energy:100,shape:1,gap:CONFIG.startGap,phase:0};
    this.foods=[];this.obstacles=[];this.particles=[];this.bubbles=[];this.popups=[];
    this.time=0;this.distance=0;this.count=0;this.missed=0;this.hits=0;this.combo=0;this.maxCombo=0;
    this.stuntCount=0;this.mapIndex=0;this.nextX=870;this.encounter=0;this.quoteClock=5;
    this.celebration=0;this.grace=1.6;this.events=[];
    this.audio.beatClock=0;this.audio.beatIndex=0;
    if (this.input) this.input.clear();
    this.spawn(1800);
  }
  start() { this.reset();this.state='playing';this.say('kuzin',QUOTES.kuzin[0]); }
  pause() { if (this.state==='playing') {this.state='paused';this.input.clear();} }
  resume() { if (this.state==='paused') {this.input.clear();this.state='playing';} }
  emit(type,text='') { this.events.push({type,text}); }
  say(who,text) {
    this.bubbles=this.bubbles.filter(b=>b.who!==who);
    this.bubbles.push({who,text,life:3.0});
  }
  jump() {
    if (this.state!=='playing') return;
    if(this.power.flying){this.player.vy=Math.max(this.player.vy,220);return;}
    if(this.player.jumps>=2){this.jumpBuffer=.12;return;}
    const p=this.player;
    p.vy=p.jumps===0?CONFIG.jump:CONFIG.doubleJump;
    p.jumps++;p.airTime=0;
    if (p.jumps===2) {p.ninja=.85;p.stunt=this.stuntCount++%5;p.flipDuration=[.62,.68,.72,.66,.76][p.stunt];p.flip=p.flipDuration;this.audio.effect('flip');this.burst(p.x,p.y+95,'#ffe35b',15);}
    else {this.audio.effect('jump');this.burst(p.x,p.y,'#f6d6ac',7);}
  }
  parkourNear() {return this.obstacles.some(o=>o.parkour&&o.x+o.width/2>this.player.x-100&&o.x-this.player.x<750);}
  nextParkourRoute() {
    if(!this.routeBag.length){
      this.routeBag=PARKOUR_ROUTES.map((_,i)=>i);
      for(let i=this.routeBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[this.routeBag[i],this.routeBag[j]]=[this.routeBag[j],this.routeBag[i]];}
      if(this.routeBag[this.routeBag.length-1]===this.lastRoute)[this.routeBag[0],this.routeBag[this.routeBag.length-1]]=[this.routeBag[this.routeBag.length-1],this.routeBag[0]];
    }
    this.lastRoute=this.routeBag.pop();return this.lastRoute;
  }
  spawnParkour(x,speed,routeIndex=this.nextParkourRoute()) {
    const route=PARKOUR_ROUTES[routeIndex],precision={easy:.31,normal:.23,hard:.155,impossible:.115}[this.difficulty];let stepX=x;
    route.h.forEach((height,i)=>{
      const width=Math.max(48,speed*precision*(i%3===1?.82:1));
      if(i>0){const delta=height-route.h[i-1];const flight=delta>=0?(CONFIG.jump+Math.sqrt(CONFIG.jump**2-2*CONFIG.gravity*delta))/CONFIG.gravity:Math.sqrt(-2*delta/CONFIG.gravity)+precision/2;stepX+=speed*(flight+.025);}
      const style=PARKOUR_STYLES[(routeIndex*3+i)%PARKOUR_STYLES.length];
      this.obstacles.push({x:stepX,width,height,type:style,name:route.name,routeIndex,parkour:true,hit:false});
      const food={x:stepX,y:height+95,type:FOOD[i%FOOD.length],seed:i,taken:false};
      if(this.boss.active==='beans')this.boss.beanify(food);this.foods.push(food);
    });
    return stepX+speed*1.25;
  }
  spawn(ahead) {
    // Deliberately spaced encounters. Food and obstacle share one jump window,
    // rather than independently creating impossible combinations.
    while (this.nextX<this.player.x+ahead) {
      const n=this.encounter++,type=FOOD[n%FOOD.length];
      const cadence={easy:11,normal:7,hard:4,impossible:3}[this.difficulty];
      if(n>=cadence&&n%cadence===0){const entrySpeed=this.profile.speed*(1+this.profile.growth*Math.min(1,this.time/120));this.nextX=this.spawnParkour(this.nextX+entrySpeed*.6,entrySpeed);continue;}
      let height=[65,180,305,180,65,305,180][n%7];
      const obstacleType=n>0?Object.keys(OBSTACLES)[(n-1)%Object.keys(OBSTACLES).length]:null;
      if (obstacleType) {
        const def=OBSTACLES[obstacleType];
        this.obstacles.push({x:this.nextX,type:obstacleType,...def,hit:false});
        height=def.height+100;
      }
      const hard=['hard','impossible'].includes(this.difficulty),cluster=n>2&&(hard?n%2===0:this.difficulty==='normal'&&n%5===0);
      let extension=0;
      if(cluster){
        const count=hard?2:1;
        for(let j=1;j<=count;j++){
          const t=j===1?'stall':'barrier',def=OBSTACLES[t];extension=j*155;
          this.obstacles.push({x:this.nextX+extension,type:t,...def,hit:false});
        }
        height=215;
      }
      const food={x:this.nextX,y:height,type,seed:n*.73,taken:false};
      if(this.boss.active==='beans')this.boss.beanify(food);
      this.foods.push(food);
      const projectedSpeed=this.profile.speed*(1+this.profile.growth*Math.min(1,this.time/120));
      this.nextX+=extension+projectedSpeed*(this.profile.interval+random(0,.08)+(height>=300?.35:0));
    }
  }
  collect(food) {
    if(food.taken)return;
    const bankable=['hard','impossible'].includes(this.difficulty);
    if(bankable)this.wallet.earn();
    else if(!this.walletNoticeShown){this.walletNoticeShown=true;this.emit('notice','ברמות קל ובינוני האוכל לא נכנס לארנק. הוא נחשב רק בסיבוב הנוכחי.');}
    this.wallet.gainXP(7);
    if(food.type==='beans')this.boss.beanCollected++;
    food.taken=true;this.count++;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);
    this.chaser.gap=Math.min(Math.max(CONFIG.maxGap,this.chaser.gap),this.chaser.gap+10);
    this.score+=100*Math.min(5,1+Math.floor(this.combo/8));
    if(this.combo>0&&this.combo%20===0){this.shield=true;this.emit("notice","עשרים ברצף! הרווחת מגן לפגיעה אחת.");}
    this.burst(food.x,food.y,'#ffdf61',10);
    this.popups.push({x:food.x,y:food.y+25,text:this.combo>1?'רצף '+this.combo:'+1',color:'#fff19e',life:1});
    this.audio.effect('collect');
    if (this.combo===10) this.emit('notice','עשרה ברצף! קוזין נשאר רעב.');
  }
  eat(food) {
    if(food.type==='beans')this.boss.beanMissed++;
    food.taken=true;this.missed++;this.combo=0;
    this.chaser.energy=Math.min(100,this.chaser.energy+CONFIG.mealEnergy*(food.energyMultiplier||1));
    this.chaser.gap-=18*this.profile.penalty;
    this.burst(this.chaser.x,125,'#f2aa5d',9);
    this.popups.push({x:this.chaser.x,y:220,text:'עוד ביס!',color:'#ffba84',life:1.1});
    this.audio.effect('eat');
    if (this.missed%5===1) this.say('kuzin','בוא לפה אני רעב!!');
  }
  hit(obstacle) {
    obstacle.hit=true;
    if(this.shield){this.shield=false;this.player.invincible=.55;this.emit("notice","המגן ספג את הפגיעה!");this.audio.effect("collect");return;}
    this.hits++;this.combo=0;
    this.player.invincible=.4;
    this.chaser.gap-=28*this.profile.penalty;
    this.burst(this.player.x,45,'#ff8f68',12);
    this.audio.effect('hit');this.emit('notice','נתקלת ב'+obstacle.name+'! קפוץ מעליו כדי להמשיך.');
  }
  finish(win) {
    this.wallet.record(win?100:100-this.chaser.energy);this.wallet.gainXP(win?180:Math.min(60,Math.round(this.count*.8)));this.wallet.flush();
    this.state=win?'winning':'lost';this.celebration=0;this.input.clear();this.bubbles=[];
    this.audio.effect(win?'win':'lose');
    if (this.count>this.best) {
      this.best=this.count;
      try {localStorage.setItem('kuzin-best',String(this.best));} catch (_) {}
    }
    if (!win) this.say('kuzin','תפסתי אותך!');
    this.emit(win?'win':'lose');
  }
  burst(x,y,color,count) {
    for (let n=0;n<count;n++) this.particles.push({x,y,vx:random(-140,140),vy:random(30,190),life:random(.3,.8),color,size:random(2,6)});
  }
  update(dt,viewWidth=1000) {
    if (['paused','loading'].includes(this.state)) return;
    const p=this.player,k=this.chaser;
    if (this.state==='playing') {
      const freezeStep=Math.min(dt,this.power.freezeRemaining||0),frozenY=k.y,frozenPhase=k.phase;this.power.update(this,dt);dt*=this.serverWorldScale??this.power.worldScale;
      this.time+=dt;this.grace=Math.max(0,this.grace-dt);this.audio.music(dt);
      p.slow=Math.max(0,p.slow-dt);p.ninja=Math.max(0,p.ninja-dt);if(p.jumps>0)p.airTime+=dt;p.invincible=Math.max(0,p.invincible-dt);p.landing=Math.max(0,p.landing-dt);
      this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
      const held=this.input.running||this.power.carrying,baseSpeed=this.profile.speed*(1+this.profile.growth*Math.min(1,this.time/120));
      const speed=this.power.carrying?baseSpeed:this.boss.speed(this,baseSpeed,held,dt)*(p.slow>0?.52:1);
      this.currentSpeed=speed;
      const previousX=p.x,previousY=p.y;
      p.x+=speed*dt;p.blocked=false;
      if(speed<0){
        // Backward pull cannot teleport through a solid obstacle behind the player.
        for(const o of this.obstacles){const edge=o.x+o.width/2+19;if(!o.destroyed&&previousX>=edge&&p.x<edge&&p.y<o.height)p.x=edge;}
        const pull=previousX-p.x;k.gap=Math.max(CONFIG.catchGap+35,k.gap-pull);
      }

      if (!this.power.carrying&&(p.jumps>0||this.power.flying)) {
        if(this.power.flying)p.jumps=Math.max(1,p.jumps);
        if(this.power.flying){
          p.vy=clamp(p.vy+(this.input.lifting?700:-280)*dt,-150,320);
          p.y=Math.max(0,p.y+p.vy*dt);if(p.y>620){p.y=620;p.vy=Math.min(0,p.vy);}
        }else{p.vy-=CONFIG.gravity*(this.heroGravity?.()??1)*dt;p.y+=p.vy*dt;if(['bracha','fahima'].includes(this.power.type)&&this.power.remaining>0&&p.y>this.heroCeiling()){p.y=this.heroCeiling();p.vy=Math.min(0,p.vy);}}
        if (p.y<=0) {p.y=0;p.vy=0;p.jumps=0;p.flip=0;p.landing=.16;this.burst(p.x,0,'#e1be8d',5);if(this.jumpBuffer>0){this.jumpBuffer=0;this.jump();}}
      }
      // Swept horizontal collision: previously hit obstacles remain solid.
      for(const o of this.obstacles){
        if(o.destroyed||this.power.carrying)continue;
        const margin=o.parkour?5:19,left=o.x-o.width/2-margin,right=o.x+o.width/2+margin;
        if(speed>=0&&p.x>left&&previousX<right&&p.y<o.height){
          if(previousY>=o.height&&p.vy<=0){p.y=o.height;p.vy=0;p.jumps=0;p.flip=0;p.landing=.16;if(this.jumpBuffer>0){this.jumpBuffer=0;this.jump();}}
          else {p.x=Math.min(p.x,left);p.blocked=held;if(!o.hit)this.hit(o);}
        }
      }
      if(p.jumps===0&&p.y>0&&!this.obstacles.some(o=>Math.abs(p.x-o.x)<o.width/2+(o.parkour?5:19)&&Math.abs(p.y-o.height)<.01)){p.jumps=1;p.vy=0;}
      this.currentSpeed=(p.x-previousX)/dt;this.distance=Math.max(0,p.x-320);
      // A full eight-pose stride covers 300 world pixels, including slowdowns.
      if(p.jumps===0)p.phase+=Math.abs(p.x-previousX)/30;
      p.flip=Math.max(0,p.flip-dt);
      this.combat.update(this,dt,viewWidth);
      this.boss.applyPull(this,dt);
      if(!this.trail.length||p.x>this.trail[this.trail.length-1].x+1)this.trail.push({x:p.x,y:p.y});
      while(this.trail.length>2&&this.trail[1].x<k.x)this.trail.shift();
      for (const food of this.foods) {
        if (food.taken) continue;
        if (Math.abs(food.x-p.x)<45&&Math.abs(food.y-(p.y+95))<68) this.collect(food);

      }
      for (const obstacle of this.obstacles) {
        if(!obstacle.passed&&obstacle.x+obstacle.width/2<p.x-20){obstacle.passed=true;if(!obstacle.hit){this.cleared++;this.score+=50;}}

      }
      if(!this.missionDone&&this.cleared>=25){this.missionDone=true;this.score+=2000;this.emit("notice","אתגר הושלם: 25 מכשולים נקיים! בונוס 2,000 נקודות.");}
      const newMap=Math.min(MAPS.length-1,Math.floor(this.distance/CONFIG.mapLength));
      if (newMap!==this.mapIndex) {this.mapIndex=newMap;this.emit('map',MAPS[newMap].name);this.audio.effect('map');}
      this.quoteClock-=dt;
      if (this.quoteClock<=0&&!this.boss.busy) {
        const who=Math.random()<.5?'luzo':'kuzin',quotes=who==='luzo'&&this.wallet.selected==='yona'?[...QUOTES.luzo,'גדלתי בבת ים אחי']:QUOTES[who];this.say(who,quotes[Math.floor(Math.random()*quotes.length)]);
        this.quoteClock=random(6,10);
      }

      if (held&&Math.random()<dt*20) this.particles.push({x:p.x-20,y:4,vx:-100,vy:35,life:.25,color:'#f3d9ad',size:4});
    } else if (this.state==='winning') {
      this.celebration+=dt;
      p.y=Math.max(0,p.y-500*dt);k.y=Math.max(0,k.y-500*dt);p.flip=0;
      k.x+=(p.x-49-k.x)*Math.min(1,dt*2.4);k.shape=Math.max(0,k.shape-dt);
      if (this.celebration>1.7&&Math.random()<dt*40) this.particles.push({x:p.x+random(-260,260),y:350,vx:random(-35,35),vy:random(-60,10),life:2.5,color:['#ffdf56','#7ce993','#68bde9','#f38ab4'][Math.floor(random(0,4))],size:random(3,8)});
      if (this.celebration>5.8) {this.state='won';this.emit('results');}
    } else if (this.state==='lost') {
      this.celebration+=dt;
      if (this.celebration>.65) {this.state='over';this.emit('results');}
    }
    for (const particle of this.particles) {particle.life-=dt;particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vy-=300*dt;}
    this.particles=this.particles.filter(q=>q.life>0);
    for (const popup of this.popups) {popup.life-=dt;popup.y+=dt*30;}
    this.popups=this.popups.filter(q=>q.life>0);
    for (const bubble of this.bubbles) bubble.life-=dt;
    this.bubbles=this.bubbles.filter(b=>b.life>0);
  }
}



'use strict';
/** Canvas renderer: camera, non-repeating panoramas, sprites and pixel-art props. */
class GameRenderer {
  constructor(canvas,assets) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.assets=assets;
    this.camera=0;this.tick=0;this.lastPreview=-1;this.resize();
  }
  resize() {
    const bounds=this.canvas.getBoundingClientRect?.();
    const width=Math.max(1,bounds?.width||innerWidth),height=Math.max(1,bounds?.height||innerHeight);
    this.dpr=Math.min(devicePixelRatio||1,3840/Math.max(width,height),Math.sqrt(8300000/(width*height)));
    this.canvas.width=Math.round(width*this.dpr);this.canvas.height=Math.round(height*this.dpr);
    this.scale=Math.min(height/620,width/700);
    this.width=width/this.scale;this.height=height/this.scale;
    this.baseGround=this.height-Math.max(140,this.height*.22);this.ground=this.baseGround;this.lift=0;
  }
  anchor() { return Math.max(320,this.width*.43); }
  reset(game) {this.camera=game.player.x-this.anchor();this.lastPreview=-1;this.captureMotion(game);}
  captureMotion(game){
    this.motion={player:{x:game.player.x,y:game.player.y,phase:game.player.phase},
      chaser:{x:game.chaser.x,y:game.chaser.y,phase:game.chaser.phase},
      camera:this.camera,ground:this.ground};
  }
  drawInterpolated(game,alpha){
    if(game.state!=='playing'||!this.motion){this.draw(game);return;}
    const saved={player:game.player,chaser:game.chaser,camera:this.camera,ground:this.ground};
    const mix=(a,b)=>a+(b-a)*alpha;
    try{
      for(const key of ['player','chaser']){
        const current=saved[key],old=this.motion[key];
        game[key]={...current,x:mix(old.x,current.x),y:mix(old.y,current.y),phase:mix(old.phase,current.phase)};
      }
      this.camera=mix(this.motion.camera,saved.camera);this.ground=mix(this.motion.ground,saved.ground);
      this.draw(game);
    }finally{game.player=saved.player;game.chaser=saved.chaser;this.camera=saved.camera;this.ground=saved.ground;}
  }
  updateCamera(game,dt) {
    const target=game.player.x-this.anchor();
    this.camera+=(target-this.camera)*(1-Math.exp(-18*dt));
    this.camera=clamp(this.camera,game.player.x-this.width*.62,game.player.x-this.width*.28);
    if (game.state!=='paused') {this.tick+=dt;const targetLift=Math.max(0,game.player.y-(this.baseGround-260));this.lift+=(targetLift-this.lift)*(1-Math.exp(-12*dt));this.ground=this.baseGround+this.lift;}
  }
  rect(x,y,w,h,color,outline=null) {
    const c=this.ctx;c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);
    if (outline) {c.lineWidth=2;c.strokeStyle=outline;c.strokeRect(x,y,w,h);}
  }
  text(value,x,y,size,color='#fff2c9',stroke=false) {
    const c=this.ctx;c.font=`900 ${size}px Arial`;c.textAlign='center';c.textBaseline='middle';
    if (stroke) {c.lineWidth=4;c.strokeStyle='#102638';c.strokeText(value,x,y);}
    c.fillStyle=color;c.fillText(value,x,y);
  }
  polygon(points,color,outline=null) {
    const c=this.ctx;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();
    if (outline) {c.lineWidth=2;c.strokeStyle=outline;c.stroke();}
  }
  ellipse(x,y,rx,ry,color) {const c=this.ctx;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
  line(x1,y1,x2,y2,color,width=2) {const c=this.ctx;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.lineWidth=width;c.strokeStyle=color;c.stroke();}
  mapLayer(index,pan,opacity=1) {
    const c=this.ctx,entry=MAPS[index],image=this.assets.images[entry.atlas];
    c.save();c.globalAlpha=opacity;
    if (image) {
      const source=MAP_RECTS[entry.atlas][entry.cell];
      const fraction=entry.atlas==='day'?(entry.cell<2?.93:.91):.91;
      const ratio=source[2]/source[3];
      const height=Math.max(this.ground/fraction,(this.width+130)/ratio),width=height*ratio;
      const top=this.ground-height*fraction;
      const left=-(width-this.width)*clamp(.15+pan*.7,0,1);
      c.save();c.beginPath();c.rect(0,0,this.width,this.ground+1);c.clip();
      c.drawImage(image,...source,left,top,width,height);c.restore();
    } else {
      this.rect(0,0,this.width,this.ground,entry.night?'#182b4d':'#7ebae6');
      for (let i=0;i<9;i++) this.rect(i*130-pan*100,this.ground-200-(i%3)*40,100,240,'#d7c7a8','#8b978f');
    }
    const surface=SURFACES[index], y=this.ground, h=this.height-y;
    this.rect(0,y,this.width,h,surface.base);
    const offset=this.camera%180;
    if(surface.kind==='rubber') {
      for(let x=-180;x<this.width+180;x+=180){this.ellipse(x-offset,y+68,80,50,surface.line);this.ellipse(x-offset,y+68,57,30,surface.base);}
    } else if(surface.kind==='path') {
      for(let i=0;i<90;i++){const x=((i*137-this.camera*.9)%(this.width+80)+this.width+80)%(this.width+80);this.rect(x,y+14+(i*43)%Math.max(20,h-25),3+i%4,2,surface.line);}
    } else if(surface.kind==='road'||surface.kind==='boulevard') {
      for(let x=-180;x<this.width+180;x+=180)this.rect(x-offset,y+65,90,5,surface.line);
      this.rect(0,y+12,this.width,2,surface.line);
    } else {
      const tile=surface.kind==='deck'?32:surface.kind==='plaza'?145:210;
      for(let x=-tile;x<this.width+tile;x+=tile)this.line(x-this.camera%tile,y,x-this.camera%tile-70,y+h,surface.line,2);
      if(surface.kind!=='deck')for(let r=35;r<h;r+=65)this.line(0,y+r,this.width,y+r,surface.line,2);
      if(surface.kind==='deck')this.rect(0,y+42,this.width,2,'#343c49');
    }
    this.rect(0,y,this.width,7,surface.edge);
    this.rect(0,y+7,this.width,4,'#152b362e');
    c.restore();
  }
  background(game) {
    if(game.state==='menu'){const cycle=this.tick/30,index=Math.floor(cycle)%MAPS.length,blend=clamp((cycle%1-.94)/.06,0,1);this.mapLayer(index,cycle%1);if(blend>0)this.mapLayer((index+1)%MAPS.length,0,blend);return;}
    const index=game.mapIndex,last=index===MAPS.length-1;
    const part=clamp((game.distance-index*CONFIG.mapLength)/CONFIG.mapLength,0,1);
    this.mapLayer(index,part);
    if (!last&&part>CONFIG.mapBlendStart) {
      let fade=(part-CONFIG.mapBlendStart)/(1-CONFIG.mapBlendStart);
      fade=fade*fade*(3-2*fade);this.mapLayer(index+1,0,fade);
    }
    const c=this.ctx,shade=c.createLinearGradient(0,this.height-150,0,this.height);
    shade.addColorStop(0,'#071b2b00');shade.addColorStop(1,'#071b2bcc');c.fillStyle=shade;c.fillRect(0,this.height-150,this.width,150);
  }
  preview(index) {
    if (index===this.lastPreview) return;this.lastPreview=index;
    const canvas=dom('mapPreview'),c=canvas.getContext('2d'),map=MAPS[index],image=this.assets.images[map.atlas];
    c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
    if (image) c.drawImage(image,...MAP_RECTS[map.atlas][map.cell],0,0,canvas.width,canvas.height);
  }
  sprite(row,frame,x,feet,height,alpha=1,flip=false,boxers=false) {
    const c=this.ctx,img=(boxers?this.assets.boxerFrames:this.assets.frames)[row*4+frame];
    if (!img) {
      this.rect(x-18,feet-height+45,36,height-65,row===0?'#171d25':'#dba37a');
      this.ellipse(x,feet-height+25,19,24,'#dba37a');return;
    }
    const width=img.width*height/img.height;
    c.save();c.globalAlpha*=alpha;c.translate(x,feet);if (flip)c.scale(-1,1);
    c.imageSmoothingEnabled=true;c.drawImage(img,-width/2,-height,width,height);c.restore();
  }
  drawHero(game,x,y,height,moving){
    const frames=this.assets.heroFrames?.[game.wallet.selected];if(!frames)return;
    const p=game.player,a=game.power;
    const index=game.combat.attack==='kick'?11:game.combat.attack==='punch'?10:
      a.type==='hashi'&&a.remaining>0&&a.elapsed<1.2?10:
      p.jumps>0?9:moving?Math.floor(p.phase*.8)%8:8;
    const img=frames[index],scale=height/frames.referenceHeight;
    const draw=frame=>this.ctx.drawImage(frame,x-frame.width*scale/2,y-335*scale,frame.width*scale,frame.height*scale);
    if(a.barber&&!game.combat.attack){
      const c=this.ctx,split=y-height*.43;
      c.save();c.beginPath();c.rect(x-height,split,height*2,height);c.clip();draw(frames[index]);c.restore();
      c.save();c.beginPath();c.rect(x-height,y-height*1.4,height*2,height*1.4-height*.43);c.clip();draw(frames[10]);c.restore();
    }else draw(img);
  }
  pigeon(game,x,y){
    if(this.assets.images.pigeon){
      const index=Math.floor(game.power.elapsed*18)%4,boxes=[[0,0,768,560,680,344],[768,0,768,560,636,344],[0,560,768,464,680,104],[768,560,768,464,636,104]],b=boxes[index],scale=.18,c=this.ctx;
      c.save();c.translate(x+35,y-100);c.rotate(clamp(-game.player.vy/3000,-.12,.1));
      c.drawImage(this.assets.images.pigeon,b[0],b[1],b[2],b[3],-b[4]*scale,-b[5]*scale,b[2]*scale,b[3]*scale);c.restore();return;
    }
    const c=this.ctx,t=game.power.elapsed,flap=Math.sin(t*22),yy=y-75;
    c.save();c.translate(x,yy);c.rotate(clamp(-game.player.vy/2400,-.18,.15));
    this.polygon([[-25,2],[-64,-8],[-57,12],[-29,17]],'#687b91','#23384b');
    this.ellipse(0,6,35,23,'#b8c9d7');this.ellipse(20,-9,16,26,'#6a91a3');
    this.ellipse(22,-25,18,18,'#c0d2df');this.ellipse(29,-30,4,4,'#f9c761');this.ellipse(30,-30,2,2,'#142835');
    this.polygon([[37,-26],[51,-21],[37,-17]],'#dfad69','#273c4e');
    c.save();c.translate(-4,0);c.rotate(-.2+flap*.85);
    this.polygon([[0,0],[-44,-42],[-72,-37],[-55,-18],[-36,6]],'#91a6b9','#263f54');
    for(let i=0;i<4;i++)this.line(-22-i*8,-5-i*4,-42-i*6,-29,'#526b83',2);c.restore();
    this.line(-5,25,-13,34,'#d8786b',3);this.line(9,26,3,35,'#d8786b',3);
    for(let i=0;i<4;i++){const d=(t*1.5+i*.25)%1;c.globalAlpha=(1-d)*.65;this.ellipse(-40-d*75,10+Math.sin(d*6+i)*18,7,2,'#eaf8ff');}
    c.restore();
  }
  smile(x,y,r,color='#ffe276'){
    const c=this.ctx;this.ellipse(x,y,r,r,color);this.ellipse(x-r*.32,y-r*.15,r*.09,r*.13,'#385343');this.ellipse(x+r*.32,y-r*.15,r*.09,r*.13,'#385343');
    c.beginPath();c.arc(x,y+r*.04,r*.48,.12,Math.PI-.12);c.lineWidth=Math.max(2,r*.08);c.strokeStyle='#385343';c.stroke();
  }
  heroEffects(game,behind=false){
    const a=game.power,c=this.ctx,p=game.player,k=game.chaser,px=p.x-this.camera,py=this.ground-p.y,kx=k.x-this.camera,ky=this.ground-k.y;
    if(behind){
      if(a.type==='hashi'&&a.remaining>0){
        c.save();const fade=Math.min(1,a.elapsed*2,a.remaining*2);
        c.globalAlpha=.11*fade;c.fillStyle='#f6d9a5';c.fillRect(0,0,this.width,this.height);
        c.globalAlpha=.85*fade;
        for(let i=0;i<7;i++){const x=((i+.5)/7*this.width+a.elapsed*13)%this.width,y=110+Math.sin(i*1.7+a.elapsed*.7)*28;this.smile(x,y,20+i%3*7,['#ffe276','#ffc4b9','#daf7af'][i%3]);}
        const sx=this.width*.56,sy=85;
        for(let i=0;i<12;i++){const an=i*Math.PI/6+a.elapsed*.12;this.line(sx+Math.cos(an)*45,sy+Math.sin(an)*45,sx+Math.cos(an)*56,sy+Math.sin(an)*56,'#ffe395',4);}
        this.smile(sx,sy,37);c.restore();
      }
      const t=a.tray;if(t&&!t.picked)this.pizzaBox(t.x-this.camera,this.ground-t.y-6,0);
      return;
    }
    if(a.barber){
      const sweep=Math.sin(a.elapsed*18)*.08,hand=this.assets.heroFrames.yishai.hand;
      c.save();c.translate(px+hand.x*176/300,py+hand.y*176/300);c.rotate(-.25+sweep);c.scale(.72,.72);
      this.rect(-7,-28,17,40,'#e388ac','#263749');this.rect(-8,-34,19,10,'#dce8ed','#243345');
      for(let i=0;i<6;i++)this.line(-7+i*3,-36,-7+i*3,-27,'#667688',1);
      this.ellipse(1,-11,3,5,'#75f2c0');this.line(-13,-23,-19,-27,'#ffbadb',2);this.line(16,-22,22,-26,'#ffbadb',2);c.restore();
    }
    for(const cut of a.clips){
      const x=cut.x-this.camera,y=this.ground-cut.y-30,u=1-cut.life/.7;
      c.save();c.globalAlpha=1-u;c.strokeStyle='#ffc3df';c.lineWidth=5;c.beginPath();c.arc(x,y,22+u*55,-1.3,1.2);c.stroke();
      for(let i=0;i<8;i++)this.line(x+Math.cos(i)*u*75,y+Math.sin(i)*u*55,x+Math.cos(i)*u*75+4,y+Math.sin(i)*u*55+7,'#302726',3);c.restore();
    }
    if(a.type==='hashi'&&a.remaining>0){
      const raise=clamp(a.elapsed/.7,0,1),x=px+38,y=py-80-raise*68;
      c.save();c.translate(x,y);c.rotate(-.18);this.polygon([[0,-5],[66,-9],[69,7],[0,5]],'#f3edd9','#594f44');
      this.rect(63,-9,6,16,'#dc8650');this.ellipse(70,-1,4,8,'#f9be74');this.text('OCB',39,0,10,'#253546');c.restore();
      c.save();c.lineCap='round';this.line(px+18,py-109,x+13,y+2,'#46382d',12);this.line(px+18,py-109,x+13,y+2,'#d4a178',9);this.ellipse(x+12,y+2,7,7,'#dda980');c.restore();
      c.save();for(let i=0;i<9;i++){const u=(a.elapsed*.48+i/9)%1;c.globalAlpha=(1-u)*.23;this.ellipse(x+65-u*95+Math.sin(i+u*6)*14,y-20-u*130,10+u*32,8+u*22,'#e9f2db');}c.restore();
    }
    if(a.tray?.picked){
      const age=a.tray.age;this.pizzaBox(kx+24,ky-100,clamp((age-.45)*3,0,1));
      this.line(kx-14,ky-108,kx+4,ky-99,'#d7a079',10);
      if(age>.8){this.text('?!',kx+24,ky-198,30,'#ffe17b',true);
        c.save();for(let i=0;i<8;i++){const u=(age*.8+i/8)%1;c.globalAlpha=(1-u)*.6;this.ellipse(kx+(i%2?40:-12)+(i%2?1:-1)*u*35,ky-150-u*70,7+u*11,6+u*10,'#f3f2e6');}c.restore();}
    }
    if(a.type==='moreno'&&a.remaining>0){
      // Boxer pattern follows the actual animated shorts silhouette.
      if(a.elapsed<2.2){this.text('!!!',kx+20,ky-204,26,'#fff0a5',true);this.ellipse(kx+24,ky-159,7,9,'#fff');this.ellipse(kx+26,ky-159,2,4,'#203345');
        this.line(kx+15,ky-172,kx+30,ky-174,'#453428',3);
        c.save();c.globalAlpha=1-a.elapsed/2.2;c.translate(kx-65-a.elapsed*60,ky-110-a.elapsed*35);c.rotate(-a.elapsed*3);this.polygon([[-17,-20],[15,-20],[25,19],[3,20],[0,4],[-7,21],[-24,17]],'#22364b','#91bfd6');c.restore();}
    }
    if(a.flying)this.text('מחזיקים קפיצה כדי לעוף',px,py-130,13,'#e7f6ff',true);
  }
  pizzaBox(x,y,open){
    const c=this.ctx;c.save();c.translate(x,y);
    this.polygon([[-37,-7],[32,-7],[43,7],[-31,10]],'#f8db99','#6d4030');this.rect(-31,9,74,7,'#bb6041','#6d4030');
    c.save();c.translate(0,-7);c.scale(1,1+open*2.8);this.polygon([[-37,0],[32,0],[26,-12],[-31,-12]],'#f1c57f','#6d4030');c.restore();
    if(open<.2)this.text('פיצה רומי',2,-8,12,'#8d3728');else{this.ellipse(4,1,20,3,'#a77a4a');this.text('ריק!',0,-25,12,'#813b2d');}c.restore();
  }

  character(game,isChaser) {
    const p=game.player,k=game.chaser,entity=isChaser?k:p;
    const x=entity.x-this.camera,y=this.ground-(entity.y||0);
    const moving=game.state==='playing'&&!(isChaser&&game.power.freezeRemaining>0)&&(isChaser?game.grace===0||game.input.running:game.input.running&&!p.blocked);
    const cycle=entity.phase*(isChaser?.73:.8);const frame=isChaser&&game.power.freezeRemaining>0?game.power.freezeFrame:!isChaser&&p.jumps?1:moving?Math.floor(cycle)%4:1;
    const height=isChaser?184:176,c=this.ctx;
    this.ellipse(x,this.ground+4,isChaser?40+k.shape*15:38,7,'#152c3f44');
    c.save();
    // Continuous, small body motion: no frame-boundary squash or side jolts.
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    const airborne=isChaser?k.y>4:p.jumps>0;
    c.translate(x,y);
    if(moving&&!airborne){
      const strideAngle=cycle*Math.PI*(isChaser?1:.5);
      c.translate(0,-(1-Math.cos(strideAngle))*(isChaser?1.0:1.2));
    }
    if(!isChaser&&p.landing>0&&p.jumps===0){const squash=Math.sin(p.landing/.16*Math.PI)*.045;c.scale(1+squash*.25,1-squash);}
    if(airborne&&!isChaser&&p.flip===0)c.scale(1-Math.min(.035,Math.abs(p.vy)/18000),1+Math.min(.04,Math.abs(p.vy)/16000));
    c.translate(-x,-y);
    if (!isChaser&&p.invincible>0&&!game.power.carrying) c.globalAlpha=Math.floor(p.invincible*15)%2?.45:1;
    if (!isChaser&&p.flip>0) {
      const u=clamp(1-p.flip/p.flipDuration,0,1),smooth=u*u*(3-2*u);
      const turns=[1,1,2,1,2][p.stunt],angle=(p.stunt===3?1:-1)*smooth*Math.PI*2*turns;
      c.translate(x,y-height/2);c.rotate(angle);
      if(p.stunt===2||p.stunt===4)c.scale(1-.18*Math.sin(u*Math.PI)**2,1);
      c.translate(-x,-y+height/2);
      c.beginPath();c.arc(x,y-height/2,height*.46,this.tick*15,this.tick*15+4.8);c.strokeStyle=['#ffdf6c','#7ce8f1','#dba7ff','#a7f0bf','#ffb18c'][p.stunt];c.lineWidth=3;c.stroke();
    }
    const action=game.combat.spitPose>0?2:game.combat.attack==='kick'?0:game.combat.attack==='punch'?1:game.combat.look>0?3:-1;
    if(!isChaser&&game.power.carrying){expansion.drawCarry(this,game,x,y,height);
    }else if(!isChaser&&game.wallet.selected==='michael'&&game.power.type==='michael'&&game.power.remaining>0&&game.power.elapsed<2.4){expansion.drawTyping(this,game,x,y,height,moving);
    }else if(!isChaser&&Object.keys(wardrobe.equipped).length&&!game.power.flying){
      wardrobe.drawHero(this.ctx,game.wallet.selected,x,y,height,moving,game);
    } else if(!isChaser&&game.power.flying){
      const blend=clamp(Math.min(game.power.elapsed,game.power.remaining)/.22,0,1);
      c.save();c.globalAlpha*=1-blend;this.drawHero(game,x,y,height,moving);c.restore();
      c.save();c.globalAlpha*=blend;this.pigeon(game,x,y);c.restore();
    } else if(!isChaser&&game.wallet.selected!=='luzo'&&this.assets.heroFrames?.[game.wallet.selected]){this.drawHero(game,x,y,height,moving);
    } else if(!isChaser&&action>=0&&this.assets.combatFrames[action]){
      const img=this.assets.combatFrames[action],w=img.width*height/img.height;
      const u=action===2?1-game.combat.spitPose/.55:1-game.combat.attackTime/.33;
      const thrust=Math.sin(clamp(u,0,1)*Math.PI);c.save();c.translate(x+(action===2?-9:12)*thrust,y);c.rotate((action===2?-.09:.06)*thrust);c.drawImage(img,-w/2,-height,w,height);c.restore();
    } else if (isChaser&&game.boss.transformed&&this.assets.buddhaFrames.length&&!(game.power.type==='moreno'&&game.power.remaining>0)) {
      this.buddhaCharacter(game,x,y,height,frame);
    } else if (isChaser) {
      const progress=3*(1-clamp(k.shape,0,1)),stage=Math.min(3,Math.floor(progress)),mix=progress-stage;
      const fade=clamp((mix-.7)/.3,0,1);
      c.translate(x,y);c.scale(1.10-mix*.1,1);c.translate(-x,-y);
      this.sprite(stage+1,frame,x,y,height,1-fade,false,game.power.type==='moreno'&&game.power.remaining>0);
      if (stage<3&&fade>0) this.sprite(stage+2,frame,x,y,height,fade,false,game.power.type==='moreno'&&game.power.remaining>0);
      if (moving&&k.shape>.05) for (let i=0;i<3;i++) {
        let drop=(this.tick*1.8+i*.33)%1;this.rect(x-35-drop*20,y-160+drop*40,3,6,'#70d7f6');
      }
    } else if(game.boss.active==='voice'&&this.assets.reactionFrames[0]){
      const img=this.assets.reactionFrames[0],w=img.width*height/img.height;c.drawImage(img,x-w/2,y-height,w,height);
    } else if(game.boss.active==='milk'&&p.y===0&&this.assets.reactionFrames[1]){
      const img=this.assets.reactionFrames[1],w=img.width*height/img.height;c.drawImage(img,x-w/2,y-height,w,height);
    } else if(p.jumps>0&&p.flip===0&&this.assets.runFrames.length){
      // Slower alternating leg poses while rising; extend feet before touchdown.
      const frame=Math.floor(p.airTime*(p.vy>0?9:7))%8;
      const img=this.assets.runFrames[frame],w=img.width*height/img.height;
      c.save();c.translate(x,y-height*.52);c.rotate(clamp(p.vy/8500,-.08,.08));c.drawImage(img,-w/2,-height*.48,w,height);c.restore();
    } else if(this.assets.stuntFrames?.length&&(p.jumps>0||p.landing>0)) {
      const u=p.flip>0?1-p.flip/p.flipDuration:0;
      const pose=p.landing>0&&p.jumps===0?3:p.flip>0&&u>.12&&u<.86?(p.stunt===1?2:1):0;
      const img=this.assets.stuntFrames[pose];
      const size=height/this.assets.stuntScale;
      const w=img.width*size,h=img.height*size;
      // Shared artwork scale keeps tucked limbs compact instead of stretching them.
      c.drawImage(img,x-w/2,pose===3?y-h:y-height/2-h/2,w,h);
    } else if(this.assets.runFrames.length){
      const img=this.assets.runFrames[moving?Math.floor(p.phase*.8)%8:1],w=img.width*height/img.height;c.drawImage(img,x-w/2,y-height,w,height);
    } else this.sprite(0,frame,x,y,height);
    if(isChaser&&game.power.bobRemaining>0)expansion.drawBob(this,game,x,y,height,frame);
    if(isChaser&&game.combat.wipe>0){
      const faceX=x+22,faceY=y-height+30,t=2.3-game.combat.wipe,clean=clamp(game.combat.wipe/2.3,0,1);
      c.save();c.globalAlpha*=Math.min(1,clean*2);
      for(let n=0;n<5;n++)this.ellipse(faceX+(n-2)*4,faceY+Math.sin(n*2)*5,3+clean*3,3+clean*2,'#d9eec7');
      for(let n=0;n<3;n++)this.ellipse(faceX-7+n*7,faceY+8+(t*23+n*5)%24,2,4,'#d9eec7');c.restore();
      const wipe=Math.sin(t*12),handX=faceX+wipe*16,handY=faceY+Math.cos(t*12)*7;
      const elbowX=x-14+wipe*5,elbowY=y-106;
      this.line(x-12,y-113,elbowX,elbowY,'#724e3b',16);this.line(elbowX,elbowY,handX,handY,'#d7a079',13);
      this.ellipse(handX,handY,9,7,'#e4b18b');for(let n=0;n<3;n++)this.line(handX-3+n*3,handY-4,handX-2+n*3,handY+3,'#b98160',1);
      this.line(faceX-8,faceY-7,faceX-3,faceY-3,'#342536',2);this.line(faceX+3,faceY-3,faceX+8,faceY-7,'#342536',2);
    }
    c.restore();
  }
  food(food) {
    const c=this.ctx,x=food.x-this.camera,y=this.ground-food.y+Math.sin(this.tick*3+food.seed)*4;
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(2.25,2.25);
    this.ellipse(0,0,17,17,'#fff3b42b');
    const r=(x,y,w,h,color)=>this.rect(x,y,w,h,color);
    switch (food.type) {
      case 'beans':
        c.save();c.rotate(-.4);this.ellipse(0,0,12,18,'#b9a98b');this.ellipse(-1,-2,10,16,'#fff7da');this.ellipse(7,0,5,7,'#b5a487');this.line(4,-5,3,5,'#d2c3a1',2);c.restore();break;
      case 'pizza':
        this.polygon([[-12,-10],[12,-10],[1,15]],'#e99629','#5b371e');
        this.polygon([[-9,-6],[9,-6],[1,11]],'#ffda62');r(-12,-11,24,4,'#d99b56');r(-4,-3,4,4,'#c94837');r(4,-4,4,4,'#c94837');r(0,4,3,3,'#c94837');break;
      case 'burger':
        r(-12,6,24,5,'#dda049');r(-13,2,26,5,'#68402e');r(-13,-1,26,3,'#8ac34f');r(-12,-4,24,3,'#dc5540');r(-11,-11,22,7,'#ecb34d');r(-7,-14,14,3,'#ffd67d');r(-7,-10,2,2,'#fff0b1');r(2,-11,2,2,'#fff0b1');r(7,-8,2,2,'#fff0b1');break;
      case 'icecream':
        this.polygon([[-8,1],[8,1],[0,16]],'#d59b59','#744c30');r(-10,-8,20,10,'#ffd3ce');r(-7,-13,14,5,'#f7a8c1');r(-5,-17,10,5,'#c28adc');r(-8,-5,5,3,'#fff0d7');break;
      case 'shawarma':
        this.polygon([[-10,-7],[11,-7],[7,17],[-5,17]],'#efd9ad','#78452d');r(-10,-11,20,7,'#9c613f');r(-7,-12,5,5,'#92b34f');r(3,-10,5,4,'#d86f47');this.polygon([[-8,1],[9,-2],[6,17],[-5,17]],'#fff3d2');r(-5,5,12,2,'#d5ceba');break;
      case 'donut':
        this.polygon([[-9,-12],[8,-12],[13,-6],[13,7],[7,12],[-8,12],[-13,6],[-13,-6]],'#b98042','#714c32');r(-10,-8,20,15,'#eb9bbb');r(-7,-11,14,20,'#eb9bbb');r(-4,-4,8,8,'#805534');r(-3,-3,6,6,'#f6daa8');r(-8,-6,2,3,'#ffe280');r(5,4,3,2,'#8c6cba');r(4,-7,2,2,'#fff5ca');break;
      case 'fries':
        for (let i=0;i<5;i++) {r(-11+i*5,-17+(i%2)*4,4,23,'#d99734');r(-10+i*5,-17+(i%2)*4,2,20,'#ffe07c');}
        this.polygon([[-14,-4],[14,-4],[10,16],[-10,16]],'#cf4c3d','#743e2b');r(-4,1,8,8,'#ffcf5a');break;
    }
    c.restore();if(food.y>250) this.text('קפיצה כפולה',x,y-44,11,'#fff4c5',true);
  }
  obstacle(obstacle) {
    const c=this.ctx,x=obstacle.x-this.camera,y=this.ground;
    c.save();c.translate(x,y);
    if(obstacle.parkour){
      const w=obstacle.width,h=obstacle.height;
      if(['ac','sign','post','barrel','scaffold','utility','chimney','balcony','water'].includes(obstacle.type)){this.streetProp(obstacle.type,w,h);
      }else if(obstacle.type==='lamp'){
        this.rect(-10,-h,20,h,'#35566a','#112e40');this.rect(-5,-h+12,4,h-12,'#7e9ea7');
        this.rect(-w/2,-h,w,15,'#23465a','#122d3c');this.rect(-w/2+5,-h+15,w-10,9,'#ffe5a1');
        this.ellipse(-w*.28,-h+30,14,9,'#ffe7a45c');this.ellipse(w*.28,-h+30,14,9,'#ffe7a45c');
      }else if(obstacle.type==='crate'){
        this.rect(-w/2,-h,w,h,'#ae713c','#4a3527');
        for(let row=0;row<h;row+=55){const hh=Math.min(55,h-row);this.rect(-w/2,-h+row,w,hh,'#b98046','#67462c');this.line(-w/2+5,-h+row+4,w/2-5,-h+row+hh-4,'#e2b66f',5);this.line(w/2-5,-h+row+4,-w/2+5,-h+row+hh-4,'#e2b66f',5);}
      }else if(obstacle.type==='bus'){
        this.rect(-w/2+10,-h,8,h,'#244a5c');this.rect(w/2-18,-h,8,h,'#244a5c');
        this.rect(-w/2+18,-h+22,w-36,h-22,'#436d7a','#173343');
        this.rect(-w/2+25,-h+30,w-50,Math.max(12,h-50),'#aacacf');
        this.rect(-w/2,-h,w,18,'#e2d4af','#183848');this.text('תחנה',0,-h+48,15,'#254758');
      }else if(obstacle.type==='solar'){
        this.rect(-w/2+18,-h,9,h,'#646c76');this.rect(w/2-27,-h,9,h,'#646c76');
        this.rect(-w/2,-h,w,26,'#193f76','#bed9e7');
        for(let xx=-w/2+18;xx<w/2;xx+=23)this.line(xx,-h,xx,-h+26,'#6b9cd3',2);
        this.line(-w/2,-h+13,w/2,-h+13,'#6b9cd3',2);
      }else if(obstacle.type==='garden'){
        this.rect(-w/2,-h,w,h,'#987859','#493f34');this.rect(-w/2-3,-h,w+6,15,'#d7b98d','#493f34');
        for(let xx=-w/2+12;xx<w/2;xx+=23){this.ellipse(xx,-h+26,14,8,'#40835b');this.ellipse(xx+4,-h+20,7,4,'#85b65e');}
        for(let yy=55;yy<h;yy+=35)this.line(-w/2,-yy,w/2,-yy,'#c0a083',2);
      }else{
        this.rect(-w/2,-h,w,h,'#b49576','#594c45');
        for(let row=20;row<h;row+=26)this.line(-w/2,-row,w/2,-row,'#dbc3a0',2);
        this.rect(-w/2-4,-h,w+8,12,'#e5d1a7','#685647');
      }
      this.rect(-w/2,-h-4,w,4,'#70e1d2');
    } else if(['cone','hydrant','bin','bench','tires','crate'].includes(obstacle.type)){this.streetProp(obstacle.type,obstacle.width,obstacle.height);
    } else if (obstacle.type==='banana') {
      this.polygon([[-29,-7],[-11,-12],[0,-26],[7,-12],[29,-8],[16,0],[3,-5],[-12,1]],'#f7d946','#664c24');
      this.line(0,-23,3,-5,'#fff3a1',3);this.rect(-1,-28,6,6,'#79572d');
    } else if (obstacle.type==='barrier') {
      this.rect(-29,-64,7,64,'#38505e','#132837');this.rect(23,-64,7,64,'#38505e','#132837');
      this.rect(-37,-57,75,24,'#f6e5b2','#263a45');for(let i=-32;i<30;i+=24)this.polygon([[i,-55],[i+13,-55],[i+24,-35],[i+10,-35]],'#dc6e49');
      this.rect(-34,-5,18,5,'#1d3443');this.rect(18,-5,18,5,'#1d3443');
    } else {
      this.rect(-42,-80,84,65,'#ab783f','#553d2b');for(let i=-37;i<40;i+=17)this.rect(i,-77,3,58,'#d9a369');
      this.rect(-47,-86,94,9,'#e8bd79','#624b32');
      for(let i=0;i<7;i++) this.ellipse(-34+i*11,-92+(i%2)*3,7,7,i%2?'#df7251':'#e9b846');
      this.ellipse(-27,-9,9,9,'#243b46');this.ellipse(28,-9,9,9,'#243b46');
    }
    c.restore();
  }
  streetProp(type,w=60,h=80){
    const ink='#233b43', steel='#567783',light='#a8c1c2',r=(x,y,ww,hh,color)=>this.rect(x,y,ww,hh,color,ink);
    const support=()=>{r(-7,-h,14,h,steel);this.rect(-3,-h+8,3,h-8,light);r(-w*.32,-8,w*.64,8,'#42515a');};
    if(type==='ac'){support();r(-w/2,-h,w,44,'#c6c7b5');for(let i=0;i<5;i++)this.line(-w/2+5,-h+10+i*6,w/2-6,-h+10+i*6,'#6d8183',2);r(w/2-12,-h+8,6,22,'#698084');}
    else if(type==='sign'){support();r(-w/2,-h,w,24,'#217a8d');this.line(-w/2+6,-h+12,w/2-6,-h+12,'#e7efdf',3);}
    else if(type==='post'){r(-w*.28,-h,w*.56,h,'#788890');r(-w/2,-h,w,12,'#c1ccca');r(-w*.38,-h+22,w*.76,8,'#e6c263');this.rect(-w*.15,-h+33,w*.1,h-36,'#b1bfb9');}
    else if(type==='barrel'||type==='water'){support();r(-w/2,-h,w,Math.min(h,65),type==='water'?'#adc5cf':'#9e6242');for(let y=12;y<60&&y<h;y+=32)r(-w/2,-h+y,w,6,'#57727b');this.ellipse(0,-h+3,w/2,5,type==='water'?'#d3e2df':'#c28f60');}
    else if(type==='scaffold'){r(-w/2+3,-h,6,h,steel);r(w/2-9,-h,6,h,steel);for(let y=0;y<h-45;y+=55){this.line(-w/2+6,-h+y,w/2-6,-h+y+50,light,3);this.line(w/2-6,-h+y,-w/2+6,-h+y+50,steel,3);}r(-w/2,-h,w,10,'#d3ad71');}
    else if(type==='utility'){r(-w/2,-h,w,h,'#526e62');r(-w/2+5,-h+10,w-10,Math.min(58,h-12),'#779481');for(let y=20;y<55&&y<h;y+=7)this.line(-w/2+12,-h+y,w/2-12,-h+y,'#364c47',2);r(w/2-13,-h+60,4,12,'#e0c682');}
    else if(type==='chimney'){r(-w/2+4,-h,w-8,h,'#ac795e');for(let y=15;y<h;y+=22)this.line(-w/2+4,-y,w/2-4,-y,'#e3ba94',2);r(-w/2,-h,w,10,'#d8c9ab');}
    else if(type==='balcony'){r(-w*.23,-h,w*.46,h,'#aa9d8b');r(-w/2,-h,w,12,'#d8c9ad');this.line(-w*.2,-h+65,-w*.48,-h+12,steel,5);this.line(w*.2,-h+65,w*.48,-h+12,steel,5);}
    else if(type==='cone'){this.polygon([[-w/2,0],[0,-h],[w/2,0]],'#ef8551',ink);this.line(-w*.18,-h*.55,w*.18,-h*.55,'#fff1cb',7);r(-w/2,-5,w,5,'#394957');}
    else if(type==='hydrant'){r(-w*.23,-h+10,w*.46,h-10,'#d65c4c');this.ellipse(0,-h+11,w*.25,11,'#ef9b6c');r(-w/2,-h+30,w,14,'#cb6651');this.ellipse(0,-h+38,9,9,'#e0ad77');}
    else if(type==='bin'){r(-w/2+3,-h+8,w-6,h-8,'#397568');r(-w/2,-h,w,9,'#254a46');for(let x=-w/2+13;x<w/2;x+=13)this.line(x,-h+18,x,-10,'#83aa86',2);}
    else if(type==='bench'){r(-w/2+9,-h,7,h,steel);r(w/2-16,-h,7,h,steel);r(-w/2,-h,w,13,'#bd8b54');r(-w/2,-h+20,w,12,'#bd8b54');r(-w/2,-h+39,w,10,'#d5aa6b');}
    else if(type==='tires'){for(let y=0;y<h;y+=24){this.ellipse(0,-y-12,w/2,13,'#263740');this.ellipse(0,-y-15,w/2-8,7,'#60747b');this.ellipse(0,-y-15,w/4,4,'#1e2c34');}}
    else {r(-w/2,-h,w,h,'#b88149');this.line(-w/2+6,-h+6,w/2-6,-6,'#e2bb7c',6);this.line(w/2-6,-h+6,-w/2+6,-6,'#e2bb7c',6);}
  }
  bubble(game,bubble) {
    const c=this.ctx,p=bubble.who==='luzo'?game.player:game.chaser;
    let x=p.x-this.camera,y=this.ground-(p.y||0)-(bubble.who==='luzo'?240:315);
    c.font='900 18px Arial';let lines=[],line='';
    for (const word of bubble.text.split(' ')) {
      if (c.measureText(line+' '+word).width>185&&line) {lines.push(line);line=word;}
      else line+=(line?' ':'')+word;
    }
    if (line) lines.push(line);
    const width=Math.max(...lines.map(l=>c.measureText(l).width))+33,height=lines.length*23+22;
    x=clamp(x,width/2+12,this.width-width/2-12);y=Math.max(210,y);
    c.save();c.globalAlpha=Math.min(1,bubble.life*3);
    this.polygon([[x-9,y+height/2-2],[p.x-this.camera+5,y+height/2+26],[x+12,y+height/2-2]],'#fff8dd','#142b38');
    let points=[];for(let n=0;n<24;n++){let angle=n*Math.PI/12,r=n%2?1:.91;points.push([x+Math.cos(angle)*(width/2+7)*r,y+Math.sin(angle)*(height/2+6)*r]);}
    this.polygon(points,'#fff8dd','#152a37');
    c.direction='rtl';lines.forEach((value,n)=>this.text(value,x,y+(n-(lines.length-1)/2)*23,18,'#102633'));
    c.restore();
  }
  victory(game) {
    const c=this.ctx,x=(game.player.x+game.chaser.x)/2-this.camera;
    const image=this.assets.images.hug;
    if (image&&game.wallet.selected==='luzo'&&!Object.keys(wardrobe.equipped).length) {
      const height=245,width=image.width/image.height*height;
      c.imageSmoothingEnabled=false;c.drawImage(image,x-width/2,this.ground-height,width,height);
    } else {
      this.sprite(4,1,x-45,this.ground,200);if(Object.keys(wardrobe.equipped).length)wardrobe.drawHero(this.ctx,game.wallet.selected,x+45,this.ground,176,false,game);else if(game.wallet.selected==='luzo')this.sprite(0,1,x+35,this.ground,198,1,true);else this.drawHero(game,x+45,this.ground,176,false);
      this.line(x-24,this.ground-122,x+40,this.ground-124,'#dba37a',14);
    }
    this.text('קוזין הדוגמן!',this.width/2,this.ground-305,Math.min(51,this.width/10),'#ffe16c',true);
    this.text('עשיתם את זה. עכשיו חיבוק!',this.width/2,this.ground-258,18,'#fff7de',true);
  }
  lobbyHero() {
    const canvas=dom('lobbyHero');if(!canvas)return;
    const w=canvas.clientWidth||300,h=canvas.clientHeight||400,dpr=Math.min(devicePixelRatio||1,3);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    const x=w/2,feet=h*.86,r=Math.min(w*.40,150);
    const glow=c.createRadialGradient(x,feet,4,x,feet,r*1.5);glow.addColorStop(0,'#72effa65');glow.addColorStop(1,'#53cbff00');c.fillStyle=glow;c.fillRect(0,0,w,h);
    c.beginPath();c.ellipse(x,feet+8,r,r*.24,0,0,Math.PI*2);c.fillStyle='#071f40';c.fill();c.lineWidth=3;c.strokeStyle='#83e6ef';c.stroke();
    c.beginPath();c.ellipse(x,feet,r*.8,r*.16,0,0,Math.PI*2);c.fillStyle='#48c9ed33';c.fill();
    const img=game.wallet.selected==='luzo'?this.assets.images.lobby:this.assets.heroPortraits?.[game.wallet.selected];if(!img)return;
    const height=Math.min(h*.75,w*1.25),width=img.width*height/img.height;
    const breath=Math.sin(this.tick*2)*.006;
    c.save();c.translate(x,feet-4);c.scale(1-breath,1+breath);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(img,-width/2,-height,width,height);c.restore();
  }
  buddhaCharacter(game,x,y,height,runFrame){
    const b=game.boss,c=this.ctx;
    const frame=b.transform>0?7:b.active==='voice'?4:b.active==='perfume'?5:b.active==='milk'&&b.elapsed<1?6:runFrame;
    const img=this.assets.buddhaFrames[frame];
    const width=img.width*height/img.height*(.90+game.chaser.shape*.22),left=x-width/2,top=y-height;
    c.drawImage(img,left,top,width,height);
    if(b.eyes){
      const eyes=[[.78,.125],[.84,.12],[.78,.13],[.80,.13],[.67,.13],[.63,.13],[.56,.14],[.53,.12]][frame];
      c.save();c.shadowBlur=12;c.shadowColor='#c247ff';this.ellipse(left+width*eyes[0],top+height*eyes[1],3.8,2.1,'#db8fff');c.restore();
    }
    if(b.transform>0){c.save();c.globalAlpha=.2+.13*Math.sin(this.tick*12);this.ellipse(x,y-height*.48,width*.75,height*.62,'#f0bdff');c.restore();}
  }
  buddhaEffects(game,groundLayer){
    const b=game.boss,c=this.ctx;if(!b.enabled||!b.transformed||game.state!=='playing')return;
    const kx=game.chaser.x-this.camera,px=game.player.x-this.camera;
    if(groundLayer){
      if(b.puddle){
        const start=Math.max(-120,b.puddle.start-this.camera),end=Math.min(this.width+120,b.puddle.end-this.camera);
        c.save();c.globalAlpha=Math.min(.85,b.remaining);
        for(let x=start;x<end;x+=82){this.ellipse(x,this.ground+6,65,10,'#ecf5ed');this.ellipse(x+10,this.ground+4,35,3,'#ffffff');}c.restore();
      }
      return;
    }
    c.save();
    if(b.active==='voice')for(let i=0;i<4;i++){
      const t=(b.elapsed*1.8+i*.25)%1;c.globalAlpha=(1-t)*.55;c.strokeStyle='#ffcf88';c.lineWidth=4;c.beginPath();c.arc(kx+40,this.ground-150,30+t*210,-.7,.7);c.stroke();
    }
    if(b.active==='perfume'){
      // Visible translucent plumes travel from the bottle nozzle toward Luzo.
      for(let i=0;i<14;i++){
        const t=(b.elapsed*.7+i/14)%1,xx=kx+80+(px-kx-40)*t,yy=this.ground-150+Math.sin(i*2+t*5)*22;
        c.globalAlpha=.1+.14*(1-t);this.ellipse(xx,yy,16+t*24,10+t*22,i%2?'#72c94d':'#b4ef84');
      }
    }
    if(b.active==='milk'&&b.elapsed<1){
      c.globalAlpha=.9;c.strokeStyle='#fbfff6';c.lineWidth=5;c.beginPath();c.moveTo(kx+10,this.ground-123);c.quadraticCurveTo(kx+145,this.ground-105,px+70,this.ground+3);c.stroke();
      for(let i=0;i<8;i++)this.ellipse(px+35+i*10,this.ground+Math.sin(i+b.elapsed*14)*6,3,3,'#ffffff');
    }
    c.restore();
  }
  combatEffects(game){
    const c=this.ctx;
    for(const e of game.combat.enemies){
      const x=e.x-this.camera;if(x<-160||x>this.width+160)continue;
      const idx=e.type==='courier'?Math.floor(e.phase*.5)%2:e.type==='bike'?2:3,img=this.assets.enemyFrames[idx];
      const h=e.type==='courier'?105:e.type==='bike'?90:70,y=e.type==='plane'?this.ground-e.y+h/2:this.ground-(e.dead?e.y-38:0);
      if(e.dead&&e.type==='plane'){c.save();c.globalAlpha=Math.max(0,e.life);const r=18+(1-e.life)*65;this.ellipse(x,y,r,r*.65,'#ff8b26');this.ellipse(x,y,r*.55,r*.4,'#fff2a4');c.restore();}
      c.save();c.translate(x,y);if(e.dead){c.globalAlpha=Math.max(0,e.life);c.rotate((1-e.life)*5);}if(e.type!=='plane')c.scale(-1,1);
      if(img){const w=img.width*h/img.height;c.drawImage(img,-w/2,-h,w,h);}else this.rect(-25,-h,50,h,'#30c8d6');c.restore();
    }
    for(const spit of game.combat.projectiles){const x=spit.x-this.camera,y=this.ground-spit.y;this.ellipse(x,y,8,4,'#e1efcf');this.line(x+6,y,x+22,y-2,'#d8ecc9',3);}
    if(game.combat.attack){const p=game.player,x=p.x-this.camera+65,y=this.ground-p.y-(game.combat.attack==='kick'?50:130);c.save();c.globalAlpha=game.combat.attackTime*1.8;c.strokeStyle='#eafcff';c.lineWidth=4;c.beginPath();c.arc(x,y,45,-.8,.8);c.stroke();c.restore();}
  }
  draw(game) {
    const c=this.ctx;c.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,0,0);
    c.imageSmoothingEnabled=false;c.clearRect(0,0,this.width,this.height);
    game.visibleRight=this.camera+this.width;this.background(game);
    if(game.state==='menu'){this.lobbyHero();return;}
    this.heroEffects(game,true);
    this.buddhaEffects(game,true);
    for(const obstacle of game.obstacles) if(Math.abs(obstacle.x-this.camera-this.width/2)<this.width/2+100)this.obstacle(obstacle);
    for(const food of game.foods) if(!food.taken&&food.x>this.camera-50&&food.x<this.camera+this.width+50)this.food(food);
    const hugging=['winning','won'].includes(game.state)&&game.celebration>1.9;
    if(hugging)this.victory(game);else {this.character(game,true);this.character(game,false);}
    this.combatEffects(game);
    this.heroEffects(game,false);
    this.buddhaEffects(game,false);
    if(game.state==='playing'&&game.chaser.gap<115)this.text('קוזין קרוב!',this.width/2,this.ground-240,16,'#ffb29a',true);
    for(const p of game.particles){c.globalAlpha=clamp(p.life*2,0,1);this.rect(p.x-this.camera,this.ground-p.y,p.size,p.size,p.color);}c.globalAlpha=1;
    for(const p of game.popups){c.globalAlpha=Math.min(1,p.life*2);this.text(p.text,p.x-this.camera,this.ground-p.y,19,p.color,true);}c.globalAlpha=1;
    for(const b of game.bubbles)this.bubble(game,b);
  }
}



'use strict';
const EXPANSION_ART={"michael": "DATA", "carry": "DATA", "props": "DATA", "tzippy": "DATA"};
// New character sprites, taxi and hairstyle overlays share the game's existing renderer.
const expansion = {frames:{},props:{},
 async load(){
  await Promise.all(Object.entries(EXPANSION_ART).map(async([id,url])=>{
   const atlas=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url;});
   const rows=id==='michael'?4:id==='props'?2:3,frames=[];
   for(let n=0;n<rows*4;n++){const c=document.createElement('canvas');c.width=448;c.height=384;c.getContext('2d').drawImage(atlas,(n%4)*448,Math.floor(n/4)*384,448,384,0,0,448,384);frames.push(c);}
   frames.referenceHeight=300;this.frames[id]=frames;
   if(['tzippy','michael'].includes(id)){assets.heroFrames[id]=frames;assets.heroPortraits[id]=wardrobe.trim(frames[8]);}
  }));
 },
 draw(c,frame,x,y,height){if(frame){const k=height/300;c.drawImage(frame,x-224*k,y-335*k,448*k,384*k);}},
 drawCarry(renderer,g,x,y,height){
  const n=g.player.y>8?8+Math.min(3,Math.floor((g.power.carryProgress||0)*4)):Math.floor(g.power.elapsed*11)%8;
  this.draw(renderer.ctx,this.frames.carry?.[n],x,y,height*1.06);
 },
 drawTyping(renderer,g,x,y,height,moving){
  const c=renderer.ctx,frames=this.frames.michael,k=height/300;
  const base=wardrobe.getFrame('michael',g.player.jumps?9:moving?Math.floor(g.player.phase*.8)%8:8).img;
  c.save();c.beginPath();c.rect(x-height,y-height*.46,height*2,height);c.clip();c.drawImage(base,x-224*k,y-335*k,448*k,384*k);c.restore();
  c.save();c.beginPath();c.rect(x-height,y-height*1.3,height*2,height*.84);c.clip();this.draw(c,frames[12+Math.floor(g.power.elapsed*10)%4],x,y,height);c.restore();
 },
 drawBob(renderer,g,x,y,height,frame){
  const wig=this.frames.props?.[4+Math.floor(g.time*9)%4];if(!wig)return;
  // The overlay follows the current slimming stage without replacing the chaser's body.
  const stage=Math.min(3,Math.floor(3*(1-clamp(g.chaser.shape,0,1))));
  let src=renderer.assets.frames[(stage+1)*4+frame];
  if(g.boss.transformed&&renderer.assets.buddhaFrames.length){const b=g.boss;src=renderer.assets.buddhaFrames[b.transform>0?7:b.active==='voice'?4:b.active==='perfume'?5:b.active==='milk'&&b.elapsed<1?6:frame];}
  let hx=.72,hy=0;this.headBounds??=new WeakMap();
  if(src){if(!this.headBounds.has(src)){
    const d=src.getContext('2d').getImageData(0,0,src.width,src.height).data;let sx=0,n=0,top=src.height;
    for(let yy=0;yy<src.height*.09;yy++)for(let xx=0;xx<src.width;xx++){const i=(yy*src.width+xx)*4,R=d[i],G=d[i+1],B=d[i+2];if(d[i+3]>180&&R>15&&R<105&&R>G*1.05&&G>B*1.03){sx+=xx;n++;top=Math.min(top,yy);}}
    this.headBounds.set(src,{x:n?sx/n/src.width:.72,y:n?Math.max(0,top/src.height-.025):0});
   }const h=this.headBounds.get(src);hx=h.x;hy=h.y;}
  const sw=src?src.width/src.height*height*(g.boss.transformed?.90+g.chaser.shape*.22:1):height;
  const px=x+(hx-.5)*sw,py=y-height+hy*height;
  this.trimmedWigs??=new WeakMap();if(!this.trimmedWigs.has(wig))this.trimmedWigs.set(wig,wardrobe.trim(wig));
  const art=this.trimmedWigs.get(wig),w=height*.23,h=w*art.height/art.width;
  renderer.ctx.drawImage(art,px-w*.57,py-h*.08,w,h);
 }
};
const oldPowerActivate=HeroPower.prototype.activate;
HeroPower.prototype.activate=function(g){
 const id=g.wallet.selected;
 if(!['eyal','tzippy','michael'].includes(id))return oldPowerActivate.call(this,g);
 if(g.state!=='playing'||this.cooldown>0)return false;
 const h=HEROES[id],p=g.player;this.type=id;this.cooldown=h.cooldown;this.remaining=h.duration;this.elapsed=0;
 if(id==='eyal'){
  const right=g.visibleRight??p.x+650;
  this.taxi={x:p.x+35,end:right,targets:g.obstacles.filter(o=>!o.destroyed&&o.x>=p.x&&o.x-o.width/2<=right),age:0};
  g.say('luzo','פעם הבאה אני מזמין טקסי');
 }
 if(id==='tzippy'){p.slow=0;p.flip=0;g.say('luzo','תחזיק חזק!');}
 if(id==='michael'){this.slowRemaining=2;this.bobRemaining=10;g.say('kuzin',"ביקשתי צ'וצ'ות, למה הפכת אותי לצ'וצ'ה?");}
 g.audio.effect('collect');return true;
};
Object.defineProperty(HeroPower.prototype,'carrying',{get(){return this.type==='tzippy'&&this.remaining>0;}});
const oldPowerUpdate=HeroPower.prototype.update;
HeroPower.prototype.update=function(g,dt){
 oldPowerUpdate.call(this,g,dt);
 if(this.slowRemaining>0){const use=Math.min(dt,this.slowRemaining);g.chaser.gap=Math.min(CONFIG.maxGap,g.chaser.gap+95*use);this.slowRemaining=Math.max(0,this.slowRemaining-dt);}
 this.bobRemaining=Math.max(0,(this.bobRemaining||0)-dt);
 if(this.taxi){const t=this.taxi;t.age+=dt;t.x+=880*dt;
  for(const o of t.targets)if(!o.destroyed&&o.x-o.width/2<t.x+65){o.destroyed=true;g.burst(o.x,o.height*.45,'#dfb871',22);g.audio.effect('break');}
  if(t.x>t.end+180)this.taxi=null;
 }
 if(this.carrying){
  const p=g.player;p.slow=0;p.invincible=Math.max(p.invincible,.08);p.flip=0;
  let target=0;this.carryProgress=0;
  for(const o of g.obstacles){if(o.destroyed)continue;const left=o.x-o.width/2-100,right=o.x+o.width/2+60;if(p.x>=left&&p.x<=right){const u=(p.x-left)/(right-left);const rise=(o.height+75)*Math.sin(Math.PI*Math.min(.94,Math.max(.06,u)))**.28;if(rise>target){target=rise;this.carryProgress=u;}}}
  for(const e of g.combat.enemies||[])if(!e.dead&&Math.abs(e.x-p.x)<130)target=Math.max(target,170);
  p.y+=(target-p.y)*Math.min(1,dt*12);p.vy=0;p.jumps=p.y>2?1:0;
 }
};
const oldHeroEffects=GameRenderer.prototype.heroEffects;
GameRenderer.prototype.heroEffects=function(g,behind){oldHeroEffects.call(this,g,behind);if(!behind&&g.power.taxi){const t=g.power.taxi,frame=expansion.frames.props?.[Math.floor(t.age*14)%4];if(frame)expansion.draw(this.ctx,frame,t.x-this.camera,this.ground,95);}};

const DROP2_ART={"luzo": "DATA", "michael": "DATA", "michael_tech": "DATA", "eyal": "DATA", "carry_dogs": "DATA", "yishai": "DATA", "carry_paisley": "DATA", "carry_fahima": "DATA", "yona_dogs": "DATA", "moreno": "DATA", "icons": "DATA", "yona_paisley": "DATA", "tzippy_fahima": "DATA", "tzippy": "DATA", "hashi": "DATA", "carry_tech": "DATA", "yona": "DATA", "tzippy_tech": "DATA", "michael_fahima": "DATA"};
const drop2={
 async load(){
  const load=url=>new Promise((yes,no)=>{const im=new Image();im.onload=()=>yes(im);im.onerror=no;im.src=url;});
  this.carryFrames={};await Promise.all(['tech','fahima','dogs','paisley'].map(async outfit=>{const atlas=await load(DROP2_ART['carry_'+outfit]);this.carryFrames[outfit]=[];for(let n=0;n<12;n++){const c=document.createElement('canvas');c.width=448;c.height=384;c.getContext('2d').drawImage(atlas,n%4*448,Math.floor(n/4)*384,448,384,0,0,448,384);this.carryFrames[outfit].push(c);}}));
  const icons=await load(DROP2_ART.icons);
  for(let n=0;n<4;n++){const c=document.createElement('canvas');c.width=512;c.height=512;c.getContext('2d').drawImage(icons,n%2*512,Math.floor(n/2)*512,512,512,0,0,512,512);const icon=wardrobe.trim(c);wardrobe.icons[9+n]=icon;wardrobe.urls[9+n]=icon.toDataURL();}
  await Promise.all(['tzippy','michael'].flatMap(id=>['tech','fahima'].map(async outfit=>{const atlas=await load(DROP2_ART[id+'_'+outfit]);wardrobe.costumes[id]??={};const frames=[];for(let n=0;n<12;n++){const c=document.createElement('canvas');c.width=448;c.height=384;c.getContext('2d').drawImage(atlas,n%4*448,Math.floor(n/4)*384,448,384,0,0,448,384);frames.push(c);}wardrobe.costumes[id][outfit]=frames;})));
  await Promise.all(Object.keys(HEROES).filter(id=>DROP2_ART[id]).map(async id=>{const atlas=await load(DROP2_ART[id]);wardrobe.costumes[id]??={};for(const [j,outfit]of ['dogs','paisley'].entries()){const frames=[];for(let n=0;n<12;n++){const c=document.createElement('canvas');c.width=448;c.height=384;c.getContext('2d').drawImage(atlas,n%4*448,(j*3+Math.floor(n/4))*384,448,384,0,0,448,384);frames.push(c);}wardrobe.costumes[id][outfit]=frames;}}));
 },
 fringes(source,pose,id){
  this.cache??=new WeakMap();let slots=this.cache.get(source);if(!slots){slots=new Map();this.cache.set(source,slots);}const key=id+':'+pose;if(slots.has(key))return slots.get(key);
  const c=document.createElement('canvas');c.width=source.width;c.height=source.height;const x=c.getContext('2d');x.drawImage(source,0,0);
  const d=x.getImageData(0,0,c.width,c.height).data;let l=c.width,r=0,t=c.height,b=0;for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++)if(d[(y*c.width+xx)*4+3]>160){l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,y);b=Math.max(b,y);}
  const h=b-t,idle=pose===8,yy=t+h*(idle?.48:pose===11?.49:.51);let a=c.width,z=0;
  for(let y=Math.floor(yy-3);y<yy+4;y++)for(let xx=l;xx<=r;xx++)if(d[(y*c.width+xx)*4+3]>160){a=Math.min(a,xx);z=Math.max(z,xx);}
  if(a>z){a=l+(r-l)*.3;z=l+(r-l)*.65;}
  const span=Math.min(z-a,h*.30),center=(a+z)/2;
  for(const side of [-1,1]){const ax=center+side*span*.45,ay=yy-2,len=h*.20,sway=idle?side*3:Math.sin(pose*1.2+side)*h*.045-h*.025;
   x.lineCap='round';for(let strand=0;strand<5;strand++){const offset=(strand-2)*1.5;x.strokeStyle=strand===2?'#2174b6':'#f3ead6';x.lineWidth=strand===2?1.8:1.2;x.beginPath();x.moveTo(ax+offset*.3,ay);x.bezierCurveTo(ax+offset,ay+len*.35,ax+sway+offset,ay+len*.65,ax+sway+offset*1.5,ay+len);x.stroke();}
   for(let knot=0;knot<4;knot++){x.strokeStyle=knot%2?'#287bbd':'#fff8e9';x.lineWidth=2;x.beginPath();x.moveTo(ax-2+sway*knot*.06,ay+4+knot*4);x.lineTo(ax+2+sway*knot*.06,ay+4+knot*4);x.stroke();}
  }
  slots.set(key,c);return c;
 }
};
const dropFrame=wardrobe.getFrame.bind(wardrobe);
wardrobe.getFrame=function(id,index,gear=this.equipped){const f=dropFrame(id,index,gear);if(gear.fringe==='tekhelet'&&f.img)f.img=drop2.fringes(f.img,index,id);return f;};
const freezeActivate=HeroPower.prototype.activate;
HeroPower.prototype.activate=function(g){const result=freezeActivate.call(this,g);if(result&&['michael','moreno'].includes(g.wallet.selected)){this.slowRemaining=0;this.shock=0;this.freezeRemaining=1;this.freezeAge=0;this.freezeFrame=Math.floor(g.chaser.phase*.73)%4;g.burst(g.chaser.x,g.chaser.y+90,'#a8efff',22);}return result;};
const freezeUpdate=HeroPower.prototype.update;
HeroPower.prototype.update=function(g,dt){freezeUpdate.call(this,g,dt);if(this.freezeRemaining>0){this.freezeAge+=Math.min(dt,this.freezeRemaining);this.freezeRemaining=Math.max(0,this.freezeRemaining-dt);if(this.freezeRemaining<1e-8)this.freezeRemaining=0;if(!this.freezeRemaining)g.burst(g.chaser.x,g.chaser.y+95,'#b8eeff',25);}};
const freezeRender=GameRenderer.prototype.character;
GameRenderer.prototype.character=function(g,isChaser){freezeRender.call(this,g,isChaser);if(!isChaser||!(g.power.freezeRemaining>0))return;const c=this.ctx,x=g.chaser.x-this.camera,y=this.ground-g.chaser.y,t=g.power.freezeAge,alpha=Math.min(1,t/.12,g.power.freezeRemaining/.12);c.save();c.globalAlpha=alpha;c.strokeStyle='#c3f5ff';c.lineWidth=2.2;const gradient=c.createLinearGradient(x-55,y-200,x+60,y);gradient.addColorStop(0,'#a6eaff55');gradient.addColorStop(.5,'#49b5e21c');gradient.addColorStop(1,'#9ce8ff66');c.fillStyle=gradient;c.beginPath();c.moveTo(x-55,y-174);c.lineTo(x-38,y-201);c.lineTo(x+40,y-198);c.lineTo(x+64,y-170);c.lineTo(x+63,y-4);c.lineTo(x-55,y);c.closePath();c.fill();c.stroke();for(let n=0;n<7;n++){const sx=x-44+(n*29)%95,sy=y-25-(n*37)%155;const r=3+Math.sin(t*9+n)*1.5;c.beginPath();c.moveTo(sx-r,sy);c.lineTo(sx+r,sy);c.moveTo(sx,sy-r);c.lineTo(sx,sy+r);c.stroke();}c.restore();};

const carryWithClothes=expansion.drawCarry;
expansion.drawCarry=function(renderer,g,x,y,height){const current=this.frames.carry,chosen=drop2.carryFrames[wardrobe.equipped.outfit];if(chosen)this.frames.carry=chosen;carryWithClothes.call(this,renderer,g,x,y,height);this.frames.carry=current;};
const typingWithClothes=expansion.drawTyping;
expansion.drawTyping=function(renderer,g,x,y,height,moving){
 if(!wardrobe.equipped.outfit)return typingWithClothes.call(this,renderer,g,x,y,height,moving);
 const c=renderer.ctx,frame=wardrobe.getFrame('michael',8).img;
 this.draw(c,frame,x,y,height);
 const k=height/300,bx=x+height*.03,by=y-height*.49,w=height*.36,h=height*.065;
 c.save();c.lineCap='round';c.lineJoin='round';
 const sleeve=wardrobe.equipped.outfit==='tech'?'#a9aeb1':wardrobe.equipped.outfit==='paisley'?'#c2a394':'#202226';
 for(const side of [-1,1]){c.strokeStyle='#191d21';c.lineWidth=17*k;c.beginPath();c.moveTo(x+side*24*k,y-height*.69);c.lineTo(x+side*30*k,y-height*.53);c.lineTo(bx+w*(side<0?.22:.75),by-5*k);c.stroke();c.strokeStyle=sleeve;c.lineWidth=13*k;c.stroke();}
 c.translate(bx,by);c.rotate(-.04);c.fillStyle='#111e2a';c.strokeStyle='#8ab4d4';c.lineWidth=1.3;c.fillRect(0,0,w,h);c.strokeRect(0,0,w,h);
 for(let row=0;row<3;row++)for(let col=0;col<10;col++){c.fillStyle=(col+row)%4===Math.floor(g.power.elapsed*8)%4?'#8ddaff':'#b6b8bc';c.fillRect(3+col*(w-6)/10,2+row*(h-4)/3,Math.max(1,w/13),Math.max(1,h/5));}
 for(const side of [0,1]){c.fillStyle='#dca17a';c.beginPath();c.ellipse(w*(side?.75:.22),2+Math.sin(g.power.elapsed*24+side*2)*2,8*k,4*k,0,0,Math.PI*2);c.fill();}c.restore();
};


// BEGIN NEW HEROES
// Shared by the standalone game and the authoritative multiplayer engine.
// Histories never enter snapshots or saved accounts.
(() => {
 const histories=new WeakMap(), clone=x=>JSON.parse(JSON.stringify(x));
 const key=o=>o.netId??`${o.x}:${o.y??o.height}:${o.seed??o.type}`;
 const history=g=>{let h=histories.get(g);if(!h){h={clock:0,frames:[],foods:new Set(),passed:new Set(),enemies:new Set(),serial:0,enemySerial:0};histories.set(g,h);}return h;};
 const capture=g=>({player:{...g.player},chaser:{...g.chaser},time:g.time,
  ...(g.networked?{}:{obstacles:clone(g.obstacles),foods:clone(g.foods),trail:clone(g.trail),enemies:clone(g.combat.enemies),boss:clone(g.boss),nextX:g.nextX,encounter:g.encounter,routeBag:[...g.routeBag],lastRoute:g.lastRoute})});
 const reset=RunnerGame.prototype.reset;
 RunnerGame.prototype.reset=function(){histories.delete(this);return reset.call(this);};
 const activate=HeroPower.prototype.activate;
 HeroPower.prototype.activate=function(g){
  const id=g.wallet.selected;
  if(!['bracha','fahima','michael'].includes(id))return activate.call(this,g);
  if(g.state!=='playing'||this.cooldown>0)return false;
  if(id==='michael'&&history(g).clock<3){g.emit('notice','כוח מיצי זמין אחרי שלוש שניות של משחק');return false;}
  Object.assign(this,{type:id,cooldown:HEROES[id].cooldown,remaining:HEROES[id].duration,elapsed:0,freezeRemaining:0,bobRemaining:0,slowRemaining:0,catUsed:false,boostUsed:false,boostTime:0,carStage:'ready'});
  g.player.flip=0;
  g.say('luzo',id==='michael'?'מיצי שומר עליי!':id==='fahima'?'קפיצה כפולה — טורבו!':'ענן כבידה!');
  g.burst(g.player.x,g.player.y+95,id==='bracha'?'#d7e6d3':id==='fahima'?'#ffe345':'#b8e4ff',24);g.audio.effect('collect');return true;
 };
 const powerUpdate=HeroPower.prototype.update;
 HeroPower.prototype.update=function(g,dt){
  powerUpdate.call(this,g,dt);
  if(this.type==='fahima'&&this.remaining>0&&this.boostTime>0){
   this.boostTime=Math.max(0,this.boostTime-dt);g.player.vy=1100;g.player.jumps=2;g.player.flip=0;
   if(!this.boostTime){this.carStage='coast';g.player.vy=Math.min(g.player.vy,100);}
  }
 };
 const jump=RunnerGame.prototype.jump;
 RunnerGame.prototype.jump=function(){
  const q=this.power,p=this.player;
  if(this.state==='playing'&&q.type==='fahima'&&q.remaining>0&&!q.boostUsed&&p.jumps===1){
   Object.assign(q,{boostUsed:true,boostTime:.75,remaining:3.75,carStage:'boost'});
   p.jumps=2;p.vy=1100;p.flip=0;this.audio.effect('flip');this.burst(p.x,p.y,'#ffad32',24);return;
  }
  const before=p.jumps;jump.call(this);
  if(q.type==='bracha'&&q.remaining>0&&p.jumps>before){p.vy=750;p.flip=0;}
  if(q.type==='fahima'&&q.remaining>0)p.flip=0;
 };
 RunnerGame.prototype.heroGravity=function(){return this.power.type==='bracha'&&this.power.remaining>0?.4:this.power.type==='fahima'&&this.power.boostTime>0?0:1;};
 RunnerGame.prototype.heroCeiling=function(){return Math.max(240,Math.min(620,(this.viewHeight||620)-Math.max(140,(this.viewHeight||620)*.22)-190));};
 RunnerGame.prototype.rescueCat=function(){
  const q=this.power,h=history(this);
  if(q.type!=='michael'||q.remaining<=0||q.catUsed||h.clock<3)return false;
  const target=h.clock-3,frames=h.frames;
  let a=frames[0],b=a;for(const f of frames){if(f.at<=target)a=f;if(f.at>=target){b=f;break;}b=f;}
  if(!a||!b)return false;
  for(const o of this.obstacles)if(o.passed)h.passed.add(key(o));
  for(const e of this.combat.enemies)if(e.dead)h.enemies.add(e.rewindId??e.netId);
  const u=b.at>a.at?Math.max(0,Math.min(1,(target-a.at)/(b.at-a.at))):0;
  const p={...a.state.player};for(const k of ['x','y','vy','phase'])p[k]=a.state.player[k]+(b.state.player[k]-a.state.player[k])*u;
  Object.assign(this.player,p,{rewindSerial:++h.serial,flip:0});
  if(this.networked){
   // Restore a personal chase gap; the common pursuer and teammate keep moving.
   this.player.catEchoGap=Math.max(CONFIG.catchGap+35,a.state.player.catEchoGap??a.state.player.x-a.state.chaser.x);
   this.player.catEchoLastX=this.player.x;
  }else{
   const s=a.state;Object.assign(this.chaser,s.chaser);this.chaser.x=this.player.x-this.chaser.gap;
   this.obstacles=clone(s.obstacles).map(o=>({...o,passed:o.passed||h.passed.has(key(o))}));
   this.foods=clone(s.foods).map(f=>({...f,taken:f.taken||h.foods.has(key(f))}));
   this.trail=clone(s.trail);this.combat.enemies=clone(s.enemies).filter(e=>!h.enemies.has(e.rewindId??e.netId));
   const beanCollected=this.boss.beanCollected,beanMissed=this.boss.beanMissed;Object.assign(this.boss,s.boss,{beanCollected,beanMissed});
   for(const k of ['nextX','encounter','lastRoute'])this[k]=s[k];this.routeBag=[...s.routeBag];
  }
  this.distance=Math.max(0,this.player.x-320);this.mapIndex=Math.min(MAPS.length-1,Math.floor(this.distance/CONFIG.mapLength));
  q.catUsed=true;q.remaining=0;q.rewindFlash=.65;this.player.invincible=Math.max(this.player.invincible,.2);
  this.burst(this.player.x,this.player.y+90,'#b8e4ff',28);this.emit('notice','מיצי! חזרת בדיוק שלוש שניות לאחור');return true;
 };
 const finish=RunnerGame.prototype.finish;
 RunnerGame.prototype.finish=function(win){if(!win&&!this.networked&&this.rescueCat())return;return finish.call(this,win);};
 const update=RunnerGame.prototype.update;
 RunnerGame.prototype.update=function(dt,width){
  const active=this.state==='playing',h=this.wallet.selected==='michael'?history(this):null;
  if(h&&active){
   for(const e of this.combat.enemies){e.rewindId??=++h.enemySerial;if(e.dead)h.enemies.add(e.rewindId);}
   if(!h.frames.length)h.frames.push({at:h.clock,state:capture(this)});
   // Record consumed/passed identities before any catch can restore the world.
   for(const f of this.foods)if(f.taken)h.foods.add(key(f));
   for(const o of this.obstacles)if(o.passed)h.passed.add(key(o));
   h.clock+=dt;
  }
  update.call(this,dt,width);
  if(active&&this.power.rewindFlash>0)this.power.rewindFlash=Math.max(0,this.power.rewindFlash-dt);
  if(h&&active){for(const e of this.combat.enemies){e.rewindId??=++h.enemySerial;if(e.dead)h.enemies.add(e.rewindId);}h.frames.push({at:h.clock,state:capture(this)});while(h.frames.length>2&&h.frames[1].at<h.clock-3.1)h.frames.shift();}
 };
 const collect=RunnerGame.prototype.collect,eat=RunnerGame.prototype.eat;
 RunnerGame.prototype.collect=function(f){if(this.wallet.selected==='michael')history(this).foods.add(key(f));return collect.call(this,f);};
 RunnerGame.prototype.eat=function(f){if(this.wallet.selected==='michael')history(this).foods.add(key(f));return eat.call(this,f);};
})();

// END NEW HEROES
module.exports={RunnerGame,HeroPower,CombatSystem,BuddhaBoss,CONFIG,MAPS,HEROES,GEAR,DIFFICULTIES,PARKOUR_ROUTES,OBSTACLES};
