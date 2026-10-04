import {InputTimeline} from './timeline.mjs';
import http from 'node:http';import {readFile} from 'node:fs/promises';import {randomBytes} from 'node:crypto';import {WebSocketServer,WebSocket} from 'ws';import QRCode from 'qrcode';import {Game} from './game.mjs';
const budgets=new Map();function allowed(key,max,ms=60000){const now=Date.now();let b=budgets.get(key);if(!b||now>b.until){b={count:0,until:now+ms};budgets.set(key,b);}return ++b.count<=max;}setInterval(()=>{for(const [k,v] of budgets)if(Date.now()>v.until)budgets.delete(k);},60000);
const rooms=new Map(),port=Number(process.env.PORT||3000),base=process.env.PUBLIC_URL||`http://localhost:${port}`;
const token=()=>randomBytes(18).toString('hex');const clean=base.replace(/\/$/,'');
const server=http.createServer(async(req,res)=>{try{const ip=req.headers['fly-client-ip']||req.socket.remoteAddress;const url=new URL(req.url,clean);if(url.pathname!=='/health'&&!allowed('http:'+ip,600)){res.writeHead(429);return res.end('Please slow down');}if(req.method==='POST'&&url.pathname==='/api/rooms'){if(bytesThisHour>=50*1024*1024||!allowed('create:'+ip,10)||rooms.size>=100){res.writeHead(503);return res.end('Room limit');}const id=randomBytes(3).toString('hex').toUpperCase(),keys=[null,null];rooms.set(id,{game:new Game(),timeline:new InputTimeline(performance.now()),keys,clients:new Set(),slots:[null,null],last:Date.now()});res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({id,lobby:`/room/${id}`,display:`/display/${id}`}));}
const api=url.pathname.match(/^\/api\/rooms\/([A-F0-9]{6})(\/claim)?$/);if(api){const r=rooms.get(api[1]);if(!r){res.writeHead(404);return res.end('Room expired');}res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');if(req.method==='POST'&&api[2]){const slot=Number(url.searchParams.get('slot'));if(![0,1].includes(slot)||r.keys[slot]){res.writeHead(409);return res.end(JSON.stringify({error:'Slot already claimed'}));}r.keys[slot]=token();return res.end(JSON.stringify({player:`/play/${api[1]}/${slot}#${r.keys[slot]}`}));}if(req.method==='GET'&&!api[2])return res.end(JSON.stringify({claimed:r.keys.map(Boolean),connected:r.game.connected}));res.writeHead(405);return res.end();}
if(url.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
if(url.pathname==='/health'){res.setHeader('Content-Type','application/json');return res.end('{"ok":true}');}
if(url.pathname==='/qr'){const data=url.searchParams.get('data');if(!data||data.length>500){res.writeHead(400);return res.end();}res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','no-store');return res.end(await QRCode.toBuffer(data,{width:220,margin:1}));}
const assets={'/clock.js':['public/clock.js','text/javascript'],'/puck-motion.js':['public/puck-motion.js','text/javascript'],'/puck-art.js':['public/puck-art.js','text/javascript'],'/fonts/CherryBombOne-Latin-v11.ttf':['public/fonts/CherryBombOne-Latin-v11.ttf','font/ttf'],'/fonts/CherryBombOne-OFL.txt':['public/fonts/CherryBombOne-OFL.txt','text/plain; charset=utf-8'],'/manifest.webmanifest':['public/manifest.webmanifest','application/manifest+json'],'/app.js':['public/app.js','text/javascript'],'/style.css':['public/style.css','text/css'],'/share.png':['public/share-v3.png','image/png'],'/share-v3.png':['public/share-v3.png','image/png'],'/share-v2.png':['public/share-v2.png','image/png']};if(assets[url.pathname]){const [file,type]=assets[url.pathname];res.setHeader('Content-Type',type);return res.end(await readFile(new URL(file,import.meta.url)));}
if(!/^\/$|^\/(?:display|room)\/[A-F0-9]{6}$|^\/play\/[A-F0-9]{6}\/[01]$/.test(url.pathname)){res.writeHead(404);return res.end('Not found');}if(url.pathname!=='/'&&!rooms.has(url.pathname.split('/')[2])){res.writeHead(404);return res.end('Room expired. Create a new room at /');}
const html=(await readFile(new URL('public/index.html',import.meta.url),'utf8')).replaceAll('__BASE__',clean.replace(/["<>]/g,''));res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.end(html);
}catch(e){res.writeHead(500);res.end('Server error');}});
const wss=new WebSocketServer({server,maxPayload:2048});
setInterval(()=>{for(const ws of wss.clients){if(ws.isAlive===false){ws.terminate();continue;}ws.isAlive=false;ws.ping();}},2000);
function applyInput(room,owner,ws,m,timing={}){
 if(room.slots[owner]!==ws||ws.readyState!==WebSocket.OPEN)return;
 const releasedId=m.type==='release'&&room.game.holds[owner].get(String(m.pointer))?.id;
 const accepted=room.game.input(owner,m);
 if(m.type==='touch'||m.type==='release')ws.send(JSON.stringify({type:'ack',inputType:m.type,seq:m.seq,pointer:m.pointer,id:m.id,epoch:m.epoch,round:room.game.round,controlEpoch:room.game.controlEpoch,layoutEpoch:room.game.layout.epoch,accepted,grab:m.type==='touch'&&accepted&&room.game.holds[owner].get(String(m.pointer))?.mode==='grab',actionAccepted:m.type==='touch'&&accepted&&room.game.lastTouch?.actionAccepted===true,practice:m.type==='touch'&&accepted&&room.game.lastTouch?.practice===true,tick:room.game.tick,inputTick:m.tick,puck:releasedId&&accepted?room.game.pucks.find(p=>p.id===releasedId):undefined,...timing}));
}
wss.on('connection',(ws,req)=>{
 if(wss.clients.size>200||!allowed('ws:'+(req.headers['fly-client-ip']||req.socket.remoteAddress),30)){ws.close(1013,'Demo connection limit');return;}
 ws.isAlive=true;ws.on('pong',()=>ws.isAlive=true);
 let room,owner=-1,seq=-1,joined=false,count=0,lastEventTime=-Infinity;
 const joinDeadline=setTimeout(()=>{if(!joined)ws.close(1008,'Join timeout');},5000);
 ws.on('message',data=>{try{
  if(++count>150)return ws.close(1008,'Rate limit');const m=JSON.parse(data),now=performance.now();
  if(!joined){
   if(m.type!=='join')return ws.close();room=rooms.get(m.room);if(!room)return ws.close(1008,'Room expired');
   if(room.clients.size>=34)return ws.close(1013,'Rink spectator limit');
   if(m.role==='display'&&bytesThisHour>=50*1024*1024)return ws.close(1013,'Demo spectator admission budget reached; existing matches continue');
   if(m.role==='player'){
    owner=typeof m.token==='string'&&m.token.length===36?room.keys.indexOf(m.token):-1;
    if(owner<0||room.slots[owner])return ws.close(1008,'Invalid or occupied player slot');
    room.slots[owner]=ws;room.timeline.clearOwner(owner);room.game.release(owner);room.game.connected[owner]=true;
   }else if(m.role!=='display')return ws.close();
   joined=true;room.clients.add(ws);room.last=Date.now();ws.send(JSON.stringify({type:'welcome',owner,clientAt:m.clientAt,serverAt:now}));return;
  }
  if(m.type==='clock'){if(Number.isFinite(m.clientAt))ws.send(JSON.stringify({type:'clock',clientAt:m.clientAt,serverAt:now}));return;}
  if(owner<0)return;if(!Number.isSafeInteger(m.seq)||m.seq<=seq)return;seq=m.seq;
  // Viewport/connection/round boundaries cancel pending inputs, independently of gameplay time.
  if(m.type==='viewport'){applyInput(room,owner,ws,m);return;}
  if(m.type==='rematch'){if(m.round===room.game.round&&room.game.result){room.timeline.queue=[];room.game.reset();}return;}
  if(!['touch','move','release'].includes(m.type))return;
  const authored=m.eventTime??now;
  if(!Number.isFinite(authored)||authored<now-2000||authored>now+250){room.timeline.clearOwner(owner);room.game.release(owner);lastEventTime=-Infinity;ws.send(JSON.stringify({type:'clock-reset'}));return;}
  // Preserve each controller's sequence when tiny clock-estimate updates overlap adjacent events.
  const eventTime=Math.max(lastEventTime,authored);lastEventTime=eventTime;
  room.timeline.enqueue(owner,eventTime,now,timing=>applyInput(room,owner,ws,m,timing));
 }catch{ws.close(1008,'Invalid input');}});
 const limit=setInterval(()=>count=0,1000);
 ws.on('close',()=>{clearInterval(limit);clearTimeout(joinDeadline);if(!joined)return;room.clients.delete(ws);if(owner>=0&&room.slots[owner]===ws){room.slots[owner]=null;room.timeline.clearOwner(owner);room.game.connected[owner]=false;room.game.release(owner);}});
});
let bytesThisHour=0,hourStart=Date.now();
setInterval(()=>{for(const [id,r]of rooms){
 if(!r.clients.size&&Date.now()-r.last>3600000){rooms.delete(id);continue;}
 if(Date.now()-hourStart>3600000){bytesThisHour=0;hourStart=Date.now();}
 r.timeline.advance(performance.now(),()=>{r.game.step();if(r.game.tick%3!==0)return;
  const msg=JSON.stringify({type:'state',...r.game.snapshot(),timing:{bufferMs:r.timeline.bufferMs,lateInputs:r.timeline.lateInputs}});
  for(const ws of r.clients)if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>100000)ws.close(1013,'Slow connection');else{bytesThisHour+=Buffer.byteLength(msg);ws.send(msg);}}
 });
}},1000/60);
server.listen(port,'0.0.0.0',()=>console.log(`Ice Fight: ${clean}`));
