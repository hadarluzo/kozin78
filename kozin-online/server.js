import http from 'node:http';
import { randomInt } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

// Separate beta multiplayer service: NEVER reads or writes player progress.
const PORT = Number(process.env.PORT || 8080);
const origins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const rooms = new Map();
const HEROES = new Set(["luzo","yona","yishai","eyal","hashi","tzippy","michael","moreno"]);
const DT = 1 / 30, SPEED = 265, GRAVITY = 1750;
const send = (ws, payload) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload)); };
const broadcast = (room, payload) => { for (const p of room.players) send(p.ws, payload); };
const safeName = value => String(value || 'שחקן').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 20) || 'שחקן';
const safeHero = value => HEROES.has(value) ? value : 'luzo';
const makeCode = () => { let c; do { c = String(randomInt(1000000)).padStart(6, '0'); } while (rooms.has(c)); return c; };
const roomInfo = r => ({ type: 'room', code: r.code, status: r.status, players: r.players.map(p => ({ id: p.id, name: p.name, hero: p.hero, ready: p.ready })) });
function start(r) {
  r.status = 'running'; r.tick = 0; r.chaser = { x: 50 }; r.obstacles = []; r.nextObstacle = 740;
  r.players.forEach((p, i) => { p.x = 310 + i * 36; p.y = 0; p.vy = 0; p.jumps = 0; p.dead = false; p.ready = false; p.running = false; p.stunnedUntil = 0; p.nextAction = 0; p.action = ''; p.actionUntil = 0; });
  broadcast(r, { type: 'started', code: r.code });
}
function finish(r, reason, deadIds) {
  if (r.status !== 'running') return;
  r.status = 'finished';
  const survivors = r.players.filter(p => !deadIds.includes(p.id));
  const winnerId = survivors.length === 1 ? survivors[0].id : null;
  broadcast(r, { type: 'result', winnerId, reason, distance: Math.round(Math.max(...r.players.map(p => p.x))) });
  broadcast(r, roomInfo(r));
}
function simulate(r) {
  if (r.status !== 'running' || r.players.length !== 2) return;
  r.tick++;
  for (const p of r.players) {
    if (p.dead) continue;
    const oldX = p.x;
    if (p.running && Date.now() >= (p.stunnedUntil || 0)) p.x += SPEED * DT;
    p.vy -= GRAVITY * DT;
    p.y = Math.max(0, p.y + p.vy * DT);
    if (p.y === 0) { p.vy = 0; p.jumps = 0; }
    for (const o of r.obstacles) {
      if (oldX < o.x + o.w && p.x + 16 > o.x && p.x - 16 < o.x + o.w && p.y < o.h - 8) { p.dead = true; break; }
    }
  }
  const minX = Math.min(...r.players.map(p => p.x)), maxX = Math.max(...r.players.map(p => p.x));
  r.chaser.x += Math.max(0, Math.min(minX - 75 - r.chaser.x, (r.tick < 120 ? 150 : 225) * DT));
  while (r.nextObstacle < maxX + 950) {
    const n = Math.floor(r.nextObstacle / 300);
    r.obstacles.push({ x: r.nextObstacle, w: 34 + (n % 3) * 8, h: n % 4 === 0 ? 52 : n % 3 === 0 ? 74 : 40 });
    r.nextObstacle += 340 + (n % 4) * 36;
  }
  r.obstacles = r.obstacles.filter(o => o.x > minX - 800);
  for (const p of r.players) if (r.chaser.x + 38 >= p.x - 15) p.dead = true;
  const dead = r.players.filter(p => p.dead).map(p => p.id);
  if (dead.length) { finish(r, dead.length === 2 ? 'simultaneous' : 'caught', dead); return; }
  if (r.tick % 2 === 0) broadcast(r, {
    type: 'snapshot', tick: r.tick,
    players: r.players.map(p => ({ id: p.id, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, name: p.name, hero: p.hero, action: Date.now() < (p.actionUntil || 0) ? p.action : '', stunned: Date.now() < (p.stunnedUntil || 0) })),
    chaser: r.chaser, obstacles: r.obstacles
  });
}
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, version: 1 })); return;
  }
  res.writeHead(404); res.end('Not found');
});
const wss = new WebSocketServer({
  server, maxPayload: 2048,
  verifyClient: ({ origin }, done) => done(!origins.length || origins.includes(origin), 403, 'Origin denied')
});
wss.on('connection', ws => {
  const id = randomInt(1, 2 ** 31).toString(36);
  let room = null, msgCount = 0, rateTime = Date.now();
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  send(ws, { type: 'hello', id });
  ws.on('message', bytes => {
    if (Date.now() - rateTime > 1000) { rateTime = Date.now(); msgCount = 0; }
    if (++msgCount > 90) { ws.close(1008, 'Rate limit'); return; }
    let m; try { m = JSON.parse(String(bytes)); } catch { return; }
    if (!m || typeof m.type !== 'string') return;
    const p = room?.players.find(p => p.ws === ws);
    if (m.type === 'create' && !room) {
      if (rooms.size >= 500) { send(ws, { type: 'error', message: 'השרת עמוס כרגע, נסה שוב' }); return; }
      room = { code: makeCode(), status: 'waiting', players: [], created: Date.now() };
      rooms.set(room.code, room);
      room.players.push({ id, ws, name: safeName(m.name), hero: safeHero(m.hero), ready: false });
      send(ws, { type: 'joined', id, code: room.code }); broadcast(room, roomInfo(room));
    } else if (m.type === 'join' && !room) {
      const target = rooms.get(String(m.code || ''));
      if (!target || target.players.length !== 1 || target.status !== 'waiting') { send(ws, { type: 'error', message: 'לא נמצא חדר פנוי בקוד הזה' }); return; }
      room = target;
      room.players.push({ id, ws, name: safeName(m.name), hero: safeHero(m.hero), ready: false });
      send(ws, { type: 'joined', id, code: room.code }); broadcast(room, roomInfo(room));
    } else if (m.type === 'ready' && p && room.status === 'waiting') {
      p.ready = !!m.ready; broadcast(room, roomInfo(room));
      if (room.players.length === 2 && room.players.every(p => p.ready)) start(room);
    } else if (m.type === 'input' && p && room.status === 'running' && !p.dead) {
      p.running = !!m.run;
    } else if (m.type === 'jump' && p && room.status === 'running' && !p.dead && p.jumps < 2) {
      p.vy = p.jumps ? 620 : 710; p.jumps++; p.action = 'jump'; p.actionUntil = Date.now() + 320;
    } else if (m.type === 'action' && p && room.status === 'running' && !p.dead) {
      const action = String(m.action || '');
      if (!['punch','kick','power'].includes(action)) return;
      const now = Date.now();
      if (now < (p.nextAction || 0)) return;
      p.nextAction = now + (action === 'power' ? 4500 : action === 'kick' ? 720 : 460);
      p.action = action; p.actionUntil = now + 340;
      const target = room.players.find(other => other !== p && !other.dead && Math.abs(other.x - p.x) <= (action === 'power' ? 140 : 58) && Math.abs(other.y - p.y) < 90);
      if (target) { target.stunnedUntil = Math.max(target.stunnedUntil || 0, now + (action === 'power' ? 1000 : action === 'kick' ? 500 : 320)); }
      broadcast(room, { type:'combat', attackerId:p.id, targetId:target?.id || null, action, hero:p.hero, tick:room.tick });
    } else if (m.type === 'rematch' && p && room.status === 'finished') {
      room.status = 'waiting'; room.players.forEach(p => p.ready = false); broadcast(room, roomInfo(room));
    }
  });
  ws.on('close', () => {
    if (!room) return;
    if (room.status === 'running') finish(room, 'disconnect', [id]);
    room.players = room.players.filter(p => p.ws !== ws);
    if (room.players.length === 0) { rooms.delete(room.code); room = null; return; }
    room.status = 'waiting'; room.players.forEach(p => p.ready = false);
    broadcast(room, { type: 'error', message: 'השחקן השני התנתק, אפשר להזמין שחקן חדש.' });
    broadcast(room, roomInfo(room)); room = null;
  });
  ws.on('error', () => {});
});
const timer = setInterval(() => { for (const r of rooms.values()) simulate(r); }, 1000 / 30); timer.unref?.();
const heartbeat = setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) ws.terminate(); else { ws.alive = false; ws.ping(); } } }, 30000); heartbeat.unref?.();
const cleanup = setInterval(() => { for (const [key, r] of rooms) if (Date.now() - r.created > 4 * 3600000) { broadcast(r, { type: 'error', message: 'החדר פג תוקף' }); for (const p of r.players) p.ws.close(); rooms.delete(key); } }, 60000); cleanup.unref?.();
server.listen(PORT, '0.0.0.0', () => console.log('Kozin online listening on ' + PORT));
