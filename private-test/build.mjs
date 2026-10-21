import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const root=process.cwd();
let html=readFileSync(join(root,'index.html'),'utf8');
function replaceOnce(from,to){if(!html.includes(from))throw Error('Missing source anchor: '+from);html=html.replace(from,to);}
replaceOnce('const TEST_MODE=false;','const TEST_MODE=true;');
replaceOnce('<title>המרדף של קוזין: דיאטת המודעין</title>','<title>קוזין — בדיקה פרטית עם אוכל ללא הגבלה</title>');
replaceOnce('<head>',`<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'">`);
for(const key of ['kuzin-best','kuzin-silent','kuzin-lab-v2','kozin-wardrobe-lab-v3','kozin78-supabase-session-v1'])html=html.replaceAll(key,'private-test-20261021-'+key);
replaceOnce("SessionWallet.prototype.boot=async function(){",`SessionWallet.prototype.boot=async function(){
 if(TEST_MODE){this.localOnly=true;this.user=null;this.online=false;this.loaded=true;this.pending=0;this.queue=[];this.message='בדיקה פרטית · אוכל ללא הגבלה · ללא דירוג';return;}`);
replaceOnce('async function ensureCloudSession(){',"async function ensureCloudSession(){if(TEST_MODE)return null;");
replaceOnce('function saveCloudSession(session){',"function saveCloudSession(session){if(TEST_MODE)return;");
replaceOnce("async function cloudRequest(path,method='GET',data=null,token=null,extraHeaders={}){","async function cloudRequest(path,method='GET',data=null,token=null,extraHeaders={}){if(TEST_MODE)throw Error('גרסת בדיקה אינה מתחברת לחשבון או לטבלה');");
replaceOnce('async function cloudAccountAction(action,username,password){',"async function cloudAccountAction(action,username,password){if(TEST_MODE)throw Error('התחברות כבויה בגרסת הבדיקה');");
replaceOnce('async post(body){',"async post(body){if(TEST_MODE)throw Error('שמירה לשרת כבויה בגרסת הבדיקה');");
const info=`function showPrivateTestInfo(){
 controls.clear();game.state='menu';
 setDialog('<h1>גרסת בדיקה פרטית</h1><p>∞ אוכל · כל הדמויות פתוחות · אפשר לקנות ולנסות את כל הבגדים.</p><p>התוצאות אינן נשלחות לטבלה. ההתקדמות נשמרת בנפרד ואינה משנה את החשבון הרגיל.</p><button class="primary" id="privateTestBack">חזרה למשחק</button>','privateTestBack',showMenu);
}
`;
replaceOnce('function accountLabel(){',info+'function accountLabel(){');
replaceOnce('function showAccount(){',"function showAccount(){if(TEST_MODE){showPrivateTestInfo();return;");
replaceOnce('async function showLeaderboard(){',"async function showLeaderboard(){if(TEST_MODE){showPrivateTestInfo();return;");
replaceOnce("dom('lobbyOnline').onclick=()=>{location.href=new URL('online.html?enter=1',location.href).href;};","dom('lobbyOnline').onclick=showPrivateTestInfo;");
replaceOnce('<body>',`<body>
<div aria-label="גרסת בדיקה" style="position:fixed;z-index:100000;top:5px;left:50%;transform:translateX(-50%);padding:4px 10px;border-radius:12px;background:#183d4ee8;color:#ffe6a6;border:1px solid #d8b86a;font:700 11px Arial,sans-serif;pointer-events:none;white-space:nowrap">בדיקה פרטית · ∞ אוכל · ללא דירוג</div>`);
const embedded={};
for(const file of readdirSync(join(root,'kozin-online/new-heroes')).filter(n=>n.endsWith('.webp')))embedded[file.slice(0,-5)]='data:image/webp;base64,'+readFileSync(join(root,'kozin-online/new-heroes',file)).toString('base64');
replaceOnce('const runAnimation={','const PRIVATE_TEST_ART='+JSON.stringify(embedded)+';\nconst runAnimation={');
replaceOnce("i.src='kozin-online/new-heroes/'+name+'.webp';","i.src=PRIVATE_TEST_ART[name];");
replaceOnce("im.src='kozin-online/new-heroes/'+name+'.webp';","im.src=PRIVATE_TEST_ART[name];");
for(const file of readdirSync(join(root,'kozin-online/drop2')).filter(n=>n.endsWith('.webp'))){const path='kozin-online/drop2/'+file;if(html.includes(path))html=html.replaceAll(path,'data:image/webp;base64,'+readFileSync(join(root,path)).toString('base64'));}
if(/\.src='kozin-online\//.test(html))throw Error('Unembedded sprite loader');
const destination=join(root,'private-test');mkdirSync(destination,{recursive:true});
const file=join(destination,'index.html');writeFileSync(file,html);
console.log(JSON.stringify({file,bytes:Buffer.byteLength(html),embeddedNewHeroAtlases:Object.keys(embedded).length}));
