import test from 'node:test';import assert from 'node:assert/strict';
import {ReleaseMotion,advance,recordMove,flingVelocity} from '../public/puck-motion.js';import {Game} from '../game.mjs';
const puck={id:'0-0',owner:0,epoch:0,x:300,y:220,vx:300,vy:0};
test('shared fling sampling exactly matches authority for fast, held, batched, stale, and stationary releases',()=>{
 for(const samples of [[[0,300],[16,308],[32,316],[48,324]],[[0,300],[700,300],[716,308],[732,316]],[[0,300],[10,320],[11,500]],[[0,300],[16,308],[200,308]],[[0,300],[16,308],[16,500],[32,316]]]){
  const g=new Game();g.connected[0]=true;const p=g.pucks[0];p.x=300;p.y=220;g.step();const input=(type,extra)=>g.input(0,{type,pointer:1,id:p.id,epoch:p.epoch,round:g.round,tick:g.tick,x:p.x,y:p.y,...extra});
  const anchor=p.x;input('touch',{at:0});let moves=[{at:0,x:anchor,y:p.y}];for(const [at,x]of samples.slice(1)){input('move',{at,x,y:220});const h=g.holds[0].get('1');if(h.dragged)moves=recordMove(moves,at,h.targetX,h.targetY);}
  const at=samples.at(-1)[0];const expected=flingVelocity(moves,at);input('release',{fling:true,at});assert.equal(p.vx,expected.vx);assert.equal(p.vy,expected.vy);assert.ok(Math.hypot(p.vx,p.vy)<=620+1e-8);
 }
});
test('release prediction moves immediately and ignores pre-release / out-of-order snapshots',()=>{
 const motion=new ReleaseMotion(puck,1,0);assert.ok(motion.render(16,puck,90,false).x>304);
 assert.ok(motion.acknowledge({...puck,x:295},100,200));motion.observe({...puck,x:150,grabbed:true},99);motion.observe({...puck,x:150,grabbed:true},101);assert.equal(motion.samples.length,1);
 motion.observe({...puck,x:310},103);motion.observe({...puck,x:0},102);assert.equal(motion.samples.at(-1).x,310);
 assert.equal(motion.acknowledge({...puck,owner:1,epoch:1},105,220),false);
});
test('release timeline converges without a rewind, then returns to ordinary interpolation',()=>{
 const motion=new ReleaseMotion(puck,1,0);let previous=300,done=false;
 for(let now=16;now<=2400;now+=16){if(now===208)motion.acknowledge({...puck,x:295},100,now);
  const normalTick=100+(now-250)*.06,normal=advance({...puck,x:295},Math.max(0,(normalTick-100)/60),false);
  // Use a slow puck and exact accumulated authority, beyond the extrapolator's bounded horizon.
  const project=t=>{let p={...puck,x:295};for(let i=0;i<t;i+=1/60)p=advance(p,Math.min(1/60,t-i),false);return p;};
  const stateTick=Math.floor(normalTick+2);if(motion.ackTick!==null&&stateTick>=100)motion.observe(project((stateTick-100)/60),stateTick);
  Object.assign(normal,project(Math.max(0,(normalTick-100)/60)));
  const out=motion.render(now,normal,normalTick,false);assert.ok(out.x>=previous-.5,`rewound at ${now}: ${out.x-previous}`);previous=out.x;done||=motion.done;
 }assert.ok(done,'prediction is retired after convergence');
});
test('visual motion respects wall/barrier restitution and never changes ownership at the open seam',()=>{
 const bounce=advance({...puck,y:70,vy:-620,vx:0},.1,true);assert.ok(bounce.y>=69&&bounce.vy>0);assert.equal(bounce.owner,0);
 const seam=advance({...puck,y:2,vy:-620,vx:0},.1,false);assert.ok(seam.y<0);assert.equal(seam.owner,0);assert.equal(seam.epoch,0);
 const wall=advance({...puck,x:860,vx:620},.1,false);assert.ok(wall.x<=863&&wall.vx<0);
 const still=new ReleaseMotion({...puck,vx:0},1,0);assert.equal(still.render(200,puck,1,true).x,300);
});
