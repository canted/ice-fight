import test from 'node:test';import assert from 'node:assert/strict';import {ControllerClock,clientEventTime} from '../public/clock.js';import {InputTimeline} from '../timeline.mjs';import {Game} from '../game.mjs';
test('clock midpoint maps unrelated client epochs; low RTT wins; discontinuity resets its estimate',()=>{
 const c=new ControllerClock();assert.equal(c.toServer(1),undefined);c.sample(1000,51040,1080);assert.equal(c.offset,50000);assert.equal(c.toServer(1120),51120);c.sample(1200,51290,1340);assert.equal(c.offset,50000);assert.equal(c.sample(2000,53040,2080),true);assert.equal(c.offset,51000);assert.equal(c.sample(NaN,1,2),false);
 assert.equal(clientEventTime(1700000000000,100,1700000000000),100);assert.equal(clientEventTime(85,100,1700000000000),85);
});
test('a slower controller event is applied before a later event that arrived first, on the same buffered timeline',()=>{
 const t=new InputTimeline(0),events=[];t.advance(100,()=>{});t.enqueue(1,90,100,e=>events.push({player:1,...e}));t.advance(200,()=>{});t.enqueue(0,50,200,e=>events.push({player:0,...e}));t.advance(320,()=>{});assert.deepEqual(events.map(e=>e.player),[0,1]);assert.ok(events[0].effectiveTime<events[1].effectiveTime);assert.ok(events.every(e=>e.lateMs===0));
});
test('late input is reported and applies next step without replay; malformed/stale clocks and disconnected queues are discarded',()=>{
 const t=new InputTimeline(0),events=[];t.advance(1000,()=>{});assert.equal(t.enqueue(0,0,1000,e=>events.push(e)),true);assert.equal(t.lateInputs,1);t.advance(1020,()=>{});assert.equal(events.length,1);assert.ok(events[0].lateMs>700);assert.ok(events[0].effectiveTime>700);
 for(const at of [NaN,Infinity,-2000,2000])assert.equal(t.enqueue(0,at,1000,()=>{}),false);
 t.enqueue(0,1100,1100,()=>events.push('bad'));t.clearOwner(0);t.advance(1400,()=>{});assert.equal(events.length,1);
});
test('cooldowns and one-hit attack instances advance on logical fight time; simultaneous attacks can trade without player-slot push priority',()=>{
 const g=new Game();g.connected=[true,true];g.step();g.fighters[0].x=400;g.fighters[1].x=504;g.fighters.forEach(f=>f.hp=5);g.step();
 for(const owner of [0,1]){const p=g.pucks.find(p=>p.owner===owner&&p.action==='lp');assert.ok(g.input(owner,{type:'touch',id:p.id,epoch:p.epoch,pointer:1,round:g.round,tick:g.tick,x:p.x,y:p.y}));g.release(owner);}
 for(let i=0;i<10;i++)g.step();assert.deepEqual(g.fighters.map(f=>f.hp),[0,0]);assert.equal(g.result,'DRAW');
});
test('a pre-transfer action arriving later is ordered before the ownership change; the old owner cannot act after transfer',()=>{
 const g=new Game();g.connected=[true,true];g.step();const p=g.pucks.find(p=>p.owner===0&&p.action==='hp'),t=new InputTimeline(0),oldTick=g.tick;let first,stale;
 t.enqueue(1,100,110,()=>{p.y=-1;g.transfer(p);});
 t.enqueue(0,80,180,()=>{first=g.input(0,{type:'touch',id:p.id,epoch:0,tick:oldTick,round:g.round,pointer:1,x:p.x,y:p.y});});
 t.enqueue(0,130,190,()=>{stale=g.input(0,{type:'touch',id:p.id,epoch:0,tick:oldTick,round:g.round,pointer:2,x:p.x,y:p.y});});
 t.advance(350,()=>g.step());assert.equal(first,true);assert.equal(stale,false);assert.equal(p.owner,1);assert.equal(g.fighters[0].attack.kind,'hp');assert.equal(g.holds[0].size,0);
});
