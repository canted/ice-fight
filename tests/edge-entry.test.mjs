import test from 'node:test';import assert from 'node:assert/strict';import {EdgeEntry,syncEntries} from '../public/puck-motion.js';import {Game} from '../game.mjs';
const puck={id:'0-0',owner:1,epoch:1,x:640,y:95,vx:0,vy:400,entry:{epoch:1,tick:20,x:650}};
test('incoming puck first paints exactly at seam even after pre-paint queries, and reaches normal position within 250ms',()=>{
 const e=new EdgeEntry(puck);assert.equal(e.render(puck,100).y,0);const first=e.render(puck,170);assert.equal(first.x,650);assert.equal(first.y,0);assert.equal(e.presented,false);assert.equal(new EdgeEntry({...puck,entry:{...puck.entry,x:-20}}).render(puck,0).x,37);e.presented=true;assert.ok(e.render(puck,295).y>0);assert.deepEqual(e.render(puck,420),puck);assert.equal(e.done,true);
});
test('entry tracks only new authoritative ownership epochs; repeat snapshots do not restart it; reconnect does not reintroduce existing pucks',()=>{
 const entries=new Map(),state={round:1,controlEpoch:1,waiting:false,pucks:[puck]},old={...state,pucks:[{...puck,owner:0,epoch:0}]};syncEntries(entries,null,state,1);assert.equal(entries.size,0);syncEntries(entries,old,state,1);const e=entries.get(puck.id);assert.ok(e);syncEntries(entries,state,state,1);assert.equal(entries.get(puck.id),e);
 syncEntries(entries,state,{...state,pucks:[{...puck,owner:0,epoch:2}]},1);assert.equal(entries.size,0);
 syncEntries(entries,state,{...state,pucks:[{...puck,epoch:3}]},1);assert.equal(entries.get(puck.id).epoch,3);assert.equal(entries.size,1);
});
test('transfer stamps mirrored edge location without changing authority, conservation or old-owner rejection',()=>{
 const g=new Game();g.connected=[true,true];g.step();const p=g.pucks[0];p.x=240;p.y=-8;p.vx=100;p.vy=-300;g.transfer(p);assert.deepEqual(p.entry,{epoch:1,tick:g.tick,x:660});assert.equal(p.y,8);assert.equal(p.owner,1);assert.equal(p.vx,-100);assert.equal(p.vy,300);assert.equal(g.pucks.length,20);g.step();const message={type:'touch',id:p.id,epoch:1,tick:g.tick,round:g.round,pointer:1,x:p.x,y:p.y};assert.equal(g.input(0,message),false);assert.equal(g.input(1,message),true);assert.equal(g.holds[0].size,0);assert.equal(g.holds[1].size,1);
});
test('a visible incoming grab may rebase within its entry corridor once; stale, repeated and unrelated position claims cannot teleport it',()=>{
 const g=new Game();g.connected=[true,true];g.step();const p=g.pucks[0];p.x=240;p.y=-8;g.transfer(p);p.y=80;g.step();const message={type:'touch',id:p.id,epoch:p.epoch,tick:g.tick,round:g.round,pointer:1,x:p.x,y:p.y,view:{x:p.x,y:2}};assert.equal(g.input(1,message),true);assert.equal(p.y,2);assert.equal(p.entry.caught,true);g.release(1);p.y=100;g.step();assert.ok(g.input(1,{...message,tick:g.tick,x:p.x,y:p.y,view:{x:p.x,y:0}}));assert.notEqual(p.y,0);g.release(1);
 p.entry={...p.entry,caught:false,tick:g.tick-31};g.step();assert.ok(g.input(1,{...message,tick:g.tick,x:p.x,y:p.y,view:{x:p.x,y:0}}));assert.notEqual(p.y,0);g.release(1);p.entry={...p.entry,tick:g.tick};g.step();assert.ok(g.input(1,{...message,tick:g.tick,x:p.x,y:p.y,view:{x:40,y:0}}));assert.notEqual(p.x,40);
});
