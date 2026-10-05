import test from 'node:test';import assert from 'node:assert/strict';import {Game,R} from '../game.mjs';
const steps=(g,n)=>{for(let i=0;i<n;i++)g.step();};
const waiting=(owner=0)=>{const g=new Game();g.connected[owner]=true;g.step();return g;};
const input=(g,p,type='touch',extra={})=>g.input(p.owner,{type,pointer:1,round:g.round,controlEpoch:g.controlEpoch,layoutEpoch:g.layout.epoch,tick:g.tick,id:p.id,epoch:p.epoch,x:p.x,y:p.y,...extra});
test('initial single-player rink is live for every local action but fighters and clock are frozen',()=>{
 for(const owner of [0,1]){const g=waiting(owner),fighters=structuredClone(g.fighters),absent=g.pucks.filter(p=>p.owner!==owner).map(p=>({...p}));assert.equal(g.snapshot().waiting,true);assert.equal(g.snapshot().paused,true);
 for(const p of g.pucks.filter(p=>p.owner===owner)){const x=p.x,y=p.y;assert.ok(input(g,p));steps(g,3);assert.equal(p.x,x);assert.equal(p.y,y);assert.ok(input(g,p,'move',{x:x+20,y:y+12}));steps(g,3);assert.ok(p.x>x);assert.ok(input(g,p,'release',{fling:false}));assert.equal(p.vx,0);assert.equal(p.vy,0);}
 const p=g.pucks.find(p=>p.owner===owner),vx=p.vx;assert.ok(input(g,p,'touch',{x:p.x-32}));assert.ok(p.vx>vx);g.release(owner);steps(g,60);assert.deepEqual(g.fighters,fighters);assert.equal(g.time,300);assert.deepEqual(g.pucks.filter(p=>p.owner!==owner),absent);assert.equal(input(g,g.pucks.find(p=>p.owner!==owner)),false);}
});
test('waiting barrier contains edge impulses, drags, flings, collision correction and direct transfer path',()=>{
 const g=waiting(),p=g.pucks[0];assert.ok(input(g,p,'touch',{at:0}));assert.ok(input(g,p,'move',{x:p.x,y:-1000,at:30}));steps(g,20);assert.ok(p.y>=R);assert.equal(p.owner,0);assert.ok(g.holds[0].size);assert.ok(input(g,p,'release',{fling:true,at:40}));steps(g,40);assert.ok(p.y>=R);assert.equal(p.owner,0);
 p.y=R;p.vy=-620;g.step();assert.ok(p.y>=R);assert.ok(p.vy>=0);p.y=-100;g.transfer(p);assert.ok(p.y>=R);assert.equal(p.epoch,0);
 const b=g.pucks[1];p.x=b.x=450;p.y=R;b.y=R+20;b.vy=-600;steps(g,10);assert.ok(g.pucks.every(p=>p.y>=R));assert.equal(g.pucks.length,20);assert.ok(g.pucks.every(p=>p.owner===p.origin&&p.epoch===0));
});
test('first start preserves arranged positions, cancels held fingers and rejects pre-start input',()=>{
 const g=waiting(),p=g.pucks[0];input(g,p);input(g,p,'move',{x:145,y:230});steps(g,20);const x=p.x,y=p.y,epoch=g.controlEpoch,tick=g.tick,round=g.round;g.connected[1]=true;g.step();assert.equal(g.snapshot().waiting,false);assert.equal(g.snapshot().paused,false);assert.equal(g.round,round);assert.equal(p.x,x);assert.equal(p.y,y);assert.equal(g.holds[0].size,0);assert.equal(g.pressed[0].has('1'),true);assert.equal(g.controlEpoch,epoch+1);assert.ok(g.time<300);
 assert.equal(input(g,p,'move',{controlEpoch:epoch,x:200}),false);assert.equal(input(g,p,'touch',{controlEpoch:epoch}),false);assert.equal(input(g,p,'touch',{pointer:2,tick}),false);assert.ok(input(g,p,'release'));assert.ok(input(g,p));input(g,p,'move',{y:-35});for(let i=0;i<20&&p.owner===0;i++)g.step();assert.equal(p.owner,1);assert.equal(p.origin,0);
});
test('waiting cancel, reconnect and shared resize clear grabs without starting; midmatch pause never restores barrier',()=>{
 const g=waiting(),p=g.pucks[0];input(g,p);input(g,p,'release',{fling:false});assert.equal(g.holds[0].size,0);input(g,p);g.connected[0]=false;g.release(0);const pos=[p.x,p.y];steps(g,10);assert.deepEqual([p.x,p.y],pos);assert.equal(g.time,300);g.connected[0]=true;g.step();input(g,p);const old=g.layout.epoch;g.setViewport(0,544,264);assert.equal(g.holds[0].size,0);assert.equal(input(g,p,'move',{layoutEpoch:old}),false);assert.equal(g.snapshot().waiting,true);
 g.connected[1]=true;g.step();g.setViewport(1,820,334);assert.deepEqual([g.layout.width,g.layout.height],[544,253]);g.connected[1]=false;g.release(1);const snap=g.snapshot();steps(g,20);assert.equal(g.snapshot().waiting,false);assert.equal(g.snapshot().paused,true);assert.equal(g.time,snap.time);assert.deepEqual(g.snapshot().pucks,snap.pucks);assert.equal(input(g,p),false);g.connected[1]=true;g.step();assert.equal(g.snapshot().paused,false);assert.equal(g.snapshot().waiting,false);
});
