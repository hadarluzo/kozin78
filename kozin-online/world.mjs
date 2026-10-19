
export const MAPS=['המרכז המסחרי','המגדלים והגינה','גן השעשועים','בית ספר כרמים','רחבת החנויות','המרכז עם החזית הירוקה','הטיילת בלילה','מרכז העיר מודיעין'];
export const OBSTACLES=[
 ['banana',54,19],['barrier',62,61],['stall',82,94],['cone',42,52],['hydrant',48,72],['bin',62,85],['bench',108,65],['tires',64,76],['crate',65,78],
 ['bus',115,94],['courier',45,72],['scooter',78,53],['light',32,120],['sign',42,92],['planter',65,55],['fence',72,80],['ac',49,95],['drone',55,100],['market',88,78],['trash',60,85]];
export const ROUTES=[
{name:'גגות השוק',style:'roof',h:[85,180,285,185]},
{name:'שדרת הפנסים',style:'lamp',h:[75,165,255,345]},
{name:'מדרגות הגן',style:'garden',h:[65,140,215,290,365]},
{name:'ארגזי הפריקה',style:'crate',h:[80,175,270,175,80]},
{name:'עמודי הכיכר',style:'post',h:[90,190,290,290]},
{name:'גגות סולאריים',style:'solar',h:[85,170,255,340,255]},
{name:'פנסי הטיילת',style:'lamp',h:[90,185,280,185,280]},
{name:'מרפסות האבן',style:'roof',h:[70,155,240,325,410]},
{name:'אדניות בכיכר',style:'garden',h:[80,160,240,160,240,320]},
{name:'מחסן גבוה',style:'crate',h:[95,195,295,395]},
{name:'מזגני המרכז',style:'ac',h:[75,165,255,345,345]},
{name:'לוחות על הגבעה',style:'solar',h:[65,145,225,305,385]},
{name:'פנסים כפולים',style:'lamp',h:[85,175,175,265,355]},
{name:'מגדלי האבן',style:'roof',h:[95,195,295,395,295]},
{name:'הגן המדורג',style:'garden',h:[75,150,225,300,225,300]},
{name:'משלוח על הגגות',style:'crate',h:[85,180,275,370,275,180]},
{name:'שלטי הרחוב',style:'sign',h:[80,175,270,270,365,270]},
{name:'קו הרקיע',style:'solar',h:[90,185,280,375,470]},
{name:'רחוב האורות',style:'lamp',h:[70,155,240,325,240,325]},
{name:'מסלול מעורב',style:'mixed',h:[85,175,265,355,265,355]},
{name:'מדרגות הפסגה',style:'mixed',h:[80,170,260,350,440,350]}];
export const POWERS={luzo:{cooldown:40000,duration:850},yona:{cooldown:40000,duration:3000},yishai:{cooldown:40000,duration:7000},eyal:{cooldown:60000,duration:1400},hashi:{cooldown:60000,duration:7000},tzippy:{cooldown:60000,duration:4500},michael:{cooldown:45000,duration:10000},moreno:{cooldown:40000,duration:15000}};
export const SLOTS={dogs:'outfit',paisley:'outfit',tekhelet:'fringe',kozinshoe:'feet',kippah:'head',tech:'outfit',fahima:'outfit',suede:'feet',foam:'feet',stripes:'feet',pink:'feet',nb:'feet',loops:'feet'};
export function safeGear(value){if(!value||typeof value!=='object')return {};const out={};for(const [slot,id] of Object.entries(value))if(typeof id==='string'&&SLOTS[id]===slot)out[slot]=id;return out;}
