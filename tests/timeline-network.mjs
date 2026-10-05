import {WebSocket} from 'ws';import assert from 'node:assert/strict';import {ControllerClock} from '../public/clock.js';import {writeFile} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://localhost:3001',sleep=ms=>new Promise(r=>setTimeout(r,ms));const sockets=[];
const until=async(fn,label)=>{const end=performance.now()+7000;while(!fn()){if(performance.now()>end)throw Error('Timeout '+label);await sleep(8);}};
try{
 const room=await(await fetch(base+'/api/rooms',{method:'POST'})).json(),players=[];
 for(let i=0;i<2;i++){
  const link=(await(await fetch(base+`/api/rooms/${room.id}/claim?slot=${i}`,{method:'POST'})).json()).player,delay=i?20:160,origin=i?-900000:50000,c=new ControllerClock(),messages=[];
  const ws=new WebSocket(base.replace('http','ws'));sockets.push(ws);const p={ws,delay,origin,c,messages,seq:0,state:null};players.push(p);
  const send=m=>setTimeout(()=>{if(ws.readyState===1)ws.send(JSON.stringify(m));},delay);p.send=send;
  ws.on('open',()=>send({type:'join',role:'player',room:room.id,token:link.split('#')[1],clientAt:performance.now()+origin}));
  ws.on('message',raw=>setTimeout(()=>{const m=JSON.parse(raw);messages.push(m);if(m.type==='welcome'||m.type==='clock')c.sample(m.clientAt,m.serverAt,performance.now()+origin);if(m.type==='state')p.state=m;},delay));
 }
 await until(()=>players.every(p=>p.c.ready&&p.state?.connected.every(Boolean)),'synchronized players');
 const mirrors=[];for(let i=0;i<2;i++){const ws=new WebSocket(base.replace('http','ws')),states=new Map();sockets.push(ws);mirrors.push(states);ws.on('open',()=>ws.send(JSON.stringify({type:'join',role:'display',room:room.id})));ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='state'||m.type==='fight')states.set(m.type+':'+m.tick,m);});}
 const start=performance.now()+80;const input=(p,type,puck,at,extra={})=>({type,seq:++p.seq,round:p.state.round,controlEpoch:p.state.controlEpoch,layoutEpoch:p.state.layout.epoch,tick:p.state.tick,pointer:1,id:puck.id,epoch:puck.epoch,x:puck.x,y:puck.y,pose:{x:puck.x,y:puck.y,vx:puck.vx,vy:puck.vy},at:at+p.origin,eventTime:p.c.toServer(at+p.origin),...extra});
 const sent=[];for(const [i,p]of players.entries()){
  const puck=p.state.pucks.find(q=>q.owner===i&&q.action==='hp'),at=start+i*50,m=input(p,'touch',puck,at);sent.push(m);setTimeout(()=>p.send(m),Math.max(0,at-performance.now()));
 }
 await until(()=>players.every(p=>p.messages.some(m=>m.type==='ack'&&m.inputType==='touch')),'ordered touch acknowledgements');
 const ack=players.map(p=>p.messages.find(m=>m.type==='ack'&&m.inputType==='touch'));assert.ok(ack.every(m=>m.accepted&&m.actionAccepted));assert.ok(ack[0].eventTime<ack[1].eventTime);assert.ok(ack[0].effectiveTime>ack[1].effectiveTime,'later packet processes later without making the fast packet wait');assert.ok(ack.every(m=>m.processingMs<20),'no artificial input wait');assert.ok(ack[0].attackAge>ack[1].attackAge+.08,'earlier slow packet receives elapsed windup credit');assert.equal(players[0].state.timing.bufferMs,0);
 // Release then touch during the same authoritative cooldown; duplicate sequence cannot activate twice.
 const p=players[0],puck=p.state.pucks.find(q=>q.id===sent[0].id),at=performance.now();p.send(input(p,'release',puck,at,{fling:false}));const repeated=input(p,'touch',puck,at+1,{pointer:2});p.send(repeated);p.send(repeated);await until(()=>p.messages.some(m=>m.type==='ack'&&m.seq===repeated.seq),'cooldown ack');const repeatedAcks=p.messages.filter(m=>m.type==='ack'&&m.seq===repeated.seq);assert.equal(repeatedAcks.length,1);assert.equal(repeatedAcks[0].accepted,true);assert.equal(repeatedAcks[0].actionAccepted,false);
 p.send(input(p,'release',puck,performance.now(),{pointer:2,fling:false}));await sleep(650);
 // A within-session late event is applied now and explicitly reported, immediately without claiming retroactive combat.
 const left=p.state.pucks.find(q=>q.owner===0&&q.action==='left'),late=input(p,'touch',left,performance.now()-650,{pointer:3});p.send(late);await until(()=>p.messages.some(m=>m.type==='ack'&&m.seq===late.seq),'late ack');const lateAck=p.messages.find(m=>m.type==='ack'&&m.seq===late.seq);assert.ok(lateAck.accepted&&lateAck.lateMs>0);
 p.send({...input(p,'move',left,performance.now(),{pointer:3}),eventTime:1e15});await until(()=>p.messages.some(m=>m.type==='clock-reset'),'clock discontinuity');await until(()=>p.state.pucks.every(q=>q.owner!==0||!q.grabbed),'clock reset clears holds');assert.equal(p.ws.readyState,1);
 await until(()=>[...mirrors[0].keys()].some(t=>mirrors[1].has(t)),'readonly mirrors');assert.ok([...mirrors[0].keys()].some(t=>t.startsWith('fight:')),'attack start broadcasts immediately to fight displays');const common=[...mirrors[0].keys()].filter(t=>mirrors[1].has(t));for(const tick of common)assert.deepEqual(mirrors[0].get(tick),mirrors[1].get(tick));
 const report={bufferMs:p.state.timing.bufferMs,controllers:players.map((p,i)=>({player:i,oneWayDelayMs:p.delay,clockOrigin:p.origin,clockRttMs:p.c.rtt,eventTime:ack[i].eventTime,effectiveTime:ack[i].effectiveTime,lateMs:ack[i].lateMs,receiptToProcessingMs:ack[i].processingMs,initialAttackAge:ack[i].attackAge})),authoredGapMs:ack[1].eventTime-ack[0].eventTime,appliedGapMs:ack[1].effectiveTime-ack[0].effectiveTime,lateEvent:{lateMs:lateAck.lateMs,effectiveTime:lateAck.effectiveTime},identicalMirrorSnapshots:common.length};await writeFile('test-results/timestamp-network.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));console.log('PASS synchronized different clocks, prompt reversed arrivals, credited attack windup, cooldown, duplicate rejection, explicit late handling, discontinuity cleanup, identical readonly fight snapshots.');
}finally{for(const ws of sockets)ws.close();}
