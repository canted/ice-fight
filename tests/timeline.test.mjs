import test from 'node:test';import assert from 'node:assert/strict';import {ControllerClock,clientEventTime} from '../public/clock.js';import {RealtimeSimulation} from '../timeline.mjs';import {Game} from '../game.mjs';
test('clock midpoint maps unrelated client epochs; low RTT wins; discontinuity resets its estimate',()=>{
 const c=new ControllerClock();assert.equal(c.toServer(1),undefined);c.sample(1000,51040,1080);assert.equal(c.offset,50000);assert.equal(c.toServer(1120),51120);c.sample(1200,51290,1340);assert.equal(c.offset,50000);assert.equal(c.sample(2000,53040,2080),true);assert.equal(c.offset,51000);assert.equal(c.sample(NaN,1,2),false);
 assert.equal(clientEventTime(1700000000000,100,1700000000000),100);assert.equal(clientEventTime(85,100,1700000000000),85);
});
test('real-time stepping has no input buffer or input queue',()=>{
 const t=new RealtimeSimulation(0);let ticks=0;t.advance(100,()=>ticks++);assert.ok(ticks>=5);assert.equal(t.queue,undefined);assert.equal(t.bufferMs,undefined);
});
test('cooldowns and one-hit attack instances advance on logical fight time; simultaneous attacks can trade without player-slot push priority',()=>{
 const g=new Game();g.connected=[true,true];g.step();g.fighters[0].x=400;g.fighters[1].x=504;g.fighters.forEach(f=>f.hp=5);g.step();
 for(const owner of [0,1]){const p=g.pucks.find(p=>p.owner===owner&&p.action==='lp');assert.ok(g.input(owner,{type:'touch',id:p.id,epoch:p.epoch,pointer:1,round:g.round,tick:g.tick,x:p.x,y:p.y}));g.release(owner);}
 for(let i=0;i<10;i++)g.step();assert.deepEqual(g.fighters.map(f=>f.hp),[0,0]);assert.equal(g.result,'DRAW');
});
test('delayed attacks credit windup immediately, retain an active hit window, and cannot bypass authored cooldowns',()=>{
 const g=new Game();g.connected=[true,true];g.step();g.fighters[0].x=400;g.fighters[1].x=470;g.step();const p=g.pucks.find(p=>p.owner===0&&p.action==='lp');
 const press=(eventTime,effectiveTime)=>g.input(0,{type:'touch',id:p.id,epoch:p.epoch,tick:g.tick,round:g.round,pointer:1,x:p.x,y:p.y},{eventTime,effectiveTime});
 assert.ok(press(1000,1800));assert.equal(g.fighters[0].attack.age,.08);assert.equal(g.fighters[1].hp,100);g.step();assert.equal(g.fighters[1].hp,95);g.release(0);for(let i=0;i<60;i++)g.step();assert.equal(g.fighters[1].hp,95);
 assert.ok(press(1100,2300));assert.equal(g.lastTouch.actionAccepted,false,'late old event does not bypass cooldown');g.release(0);assert.ok(press(2400,2450));assert.equal(g.fighters[0].attack.age,.05);g.release(0);g.reset();g.step();const q=g.pucks.find(p=>p.owner===0&&p.action==='lp');assert.ok(g.input(0,{type:'touch',id:q.id,epoch:q.epoch,tick:g.tick,round:g.round,pointer:1,x:q.x,y:q.y},{eventTime:3100,effectiveTime:3000}));assert.equal(g.fighters[0].attack.age,0);assert.equal(g.attackReadyAt[0],3360,'future skew does not add a cooldown wait');
});
test('reversed arrivals do not rewrite committed combat or restore old ownership',()=>{
 const g=new Game();g.connected=[true,true];g.step();const p=g.pucks[0],oldTick=g.tick;p.y=-1;g.transfer(p);g.step();assert.equal(g.input(0,{type:'touch',id:p.id,epoch:0,tick:oldTick,round:g.round,pointer:1,x:p.x,y:p.y},{eventTime:10,effectiveTime:200}),false);assert.equal(p.owner,1);
});
