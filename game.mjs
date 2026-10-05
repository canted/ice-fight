import {recordMove,flingVelocity,MAX_DRAG,MAX_FLING,MAX_PUCK_SPEED} from './public/puck-motion.js';
export {MAX_FLING};
export const W = 900, H = 420, R = 37, HISTORY_TICKS = 120;
export const GRAB_RADIUS = R * .72, TAP_RADIUS = R * .25, CENTER_IMPULSE = 6, CENTER_EDGE_IMPULSE = 6, TAP_TICKS = 12, EDGE_IMPULSE = 140, BARRIER_DEPTH = 32;
export const ATTACKS = {
 lp: {name:'Light punch', damage:5, reach:105, windup:.08, active:.10, recovery:.18, stun:.12, push:10},
 mp: {name:'Medium punch',damage:9,reach:125,windup:.14,active:.12,recovery:.28,stun:.18,push:18},
 hp: {name:'Heavy punch',damage:15,reach:140,windup:.23,active:.12,recovery:.42,stun:.30,push:28},
 lk: {name:'Light kick',damage:7,reach:135,windup:.11,active:.12,recovery:.22,stun:.16,push:14},
 mk: {name:'Medium kick',damage:11,reach:155,windup:.18,active:.14,recovery:.34,stun:.24,push:24},
 hk: {name:'Heavy kick',damage:18,reach:175,windup:.28,active:.13,recovery:.48,stun:.35,push:36},
};
export const actions = ['left','right','up','down',...Object.keys(ATTACKS)];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const cap=(x,y,max)=>{const k=Math.min(1,max/(Math.hypot(x,y)||1));return [x*k,y*k];};
export const tapImpulse=d=>d<=TAP_RADIUS?CENTER_IMPULSE:CENTER_EDGE_IMPULSE+(EDGE_IMPULSE-CENTER_EDGE_IMPULSE)*clamp((d-TAP_RADIUS)/(R-TAP_RADIUS),0,1);
export class Game {
 constructor({roundSeconds=300,clientMotion=false}={}){this.clientMotion=clientMotion;this.active=[true,true];this.roundSeconds=roundSeconds;this.viewports=[null,null];this.layout={width:900,height:420,epoch:0};this.started=false;this.controlEpoch=0;this.round=0;this.tick=0;this.connected=[false,false];this.reset();}
 reset(){
  this.attackReadyAt=[-Infinity,-Infinity];this.round++;this.time=this.roundSeconds;this.result=null;this.holds=[new Map(),new Map()];this.pressed=[new Set(),new Set()];
  this.fighters=[0,1].map(i=>({x:i?625:275,y:0,vy:0,hp:100,facing:i?-1:1,attack:null,cool:Object.fromEntries(Object.keys(ATTACKS).map(k=>[k,0])),stun:0}));
  this.pucks=[0,1].flatMap(owner=>actions.map((action,i)=>({id:`${owner}-${i}`,origin:owner,owner,epoch:0,action,x:90+(i%5)*180,y:120+Math.floor(i/5)*190,vx:(i%2?1:-1)*16,vy:8})));this.history=[];
 }
 validPose(p){return p&&['x','y','vx','vy'].every(k=>Number.isFinite(p[k]))&&p.x>=R&&p.x<=W-R&&p.y>=0&&p.y<=H-R&&Math.hypot(p.vx,p.vy)<=MAX_PUCK_SPEED+1e-8;}
 motion(owner,m){
  if(!this.clientMotion||m.round!==this.round||m.controlEpoch!==this.controlEpoch||m.layoutEpoch!==this.layout.epoch||!this.connected[owner])return false;
  if(m.type==='motion'){
   if(!Array.isArray(m.pucks)||m.pucks.length>20)return false;
   for(const q of m.pucks){const p=this.pucks.find(p=>p.id===q.id);if(p&&p.owner===owner&&p.epoch===q.epoch&&this.validPose(q))Object.assign(p,{x:q.x,y:q.y,vx:q.vx,vy:q.vy});}return true;
  }
  if(m.type==='transfer'){
   const q=m.puck,p=this.pucks.find(p=>p.id===q?.id);
   if(!this.started||this.result||!this.connected.every(Boolean)||!this.active.every(Boolean)||!p||p.owner!==owner||p.epoch!==q.epoch||!this.validPose(q)||q.y!==0||q.vy>0)return false;
   for(const [key,h]of this.holds[owner])if(h.id===p.id)this.release(owner,key,false,true);
   Object.assign(p,{owner:1-owner,epoch:p.epoch+1,x:W-q.x,y:0,vx:-q.vx,vy:-q.vy});p.entry={epoch:p.epoch,tick:this.tick,x:p.x};return true;
  }return false;
 }
 grabFor(p){return [...this.holds[p.owner].values()].find(h=>h.id===p.id&&h.mode==='grab');}
 snapshot(){return {waiting:!this.started,controlEpoch:this.controlEpoch,layout:{...this.layout},tick:this.tick,round:this.round,time:this.time,result:this.result,paused:!this.connected.every(Boolean)||!this.active.every(Boolean),connected:this.connected,pucks:this.pucks.map(p=>({...p,grabbed:!!this.grabFor(p)})),fighters:structuredClone(this.fighters),counts:[0,1].map(i=>this.pucks.filter(p=>p.owner===i).length)};}
 setViewport(owner,width,height){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<100||height<80||width>4000||height>3000)return false;
  this.viewports[owner]={width,height};const views=this.viewports.filter(Boolean),scale=Math.min(...views.map(v=>Math.min(v.width/W,v.height/H)));
  const w=Math.floor(W*scale),h=Math.floor(H*scale);if(w!==this.layout.width||h!==this.layout.height){this.release(0);this.release(1);this.layout={width:w,height:h,epoch:this.layout.epoch+1};}return true;
 }
 release(owner,pointer,fling=false,keepPressed=false,at){
  if(pointer===undefined){for(const key of [...this.holds[owner].keys()])this.release(owner,key);this.pressed[owner].clear();return;}
  const key=String(pointer),h=this.holds[owner].get(key),p=h&&this.pucks.find(p=>p.id===h.id);
  if(!this.clientMotion&&h?.mode==='grab'&&p&&p.owner===owner&&p.epoch===h.epoch){p.vx=p.vy=0;if(fling&&h.dragged&&h.samples.length>1){const latest=h.samples.at(-1),first=h.samples.find(s=>s.tick>=this.tick-5)||latest;const dt=(this.tick-first.tick)/60;if(dt>0&&this.tick-latest.tick<=5){[p.vx,p.vy]=cap((p.x-first.x)/dt,(p.y-first.y)/dt,MAX_FLING);if(Math.hypot(p.vx,p.vy)<45)p.vx=p.vy=0;}}}
  if(!this.clientMotion&&fling&&h?.dragged&&h?.mode==='grab'&&p&&p.owner===owner&&Number.isFinite(at)&&h.moves.length>1){
   Object.assign(p,flingVelocity(h.moves,at));
  }
  if(!this.clientMotion&&fling&&h?.mode==='grab'&&!h.dragged&&this.tick-h.touchTick<=TAP_TICKS&&p&&p.owner===owner&&p.epoch===h.epoch){p.vx=h.tapVX;p.vy=h.tapVY;}
  this.holds[owner].delete(key);if(!keepPressed)this.pressed[owner].delete(key);
 }
 input(owner,m,timing={}){
  if(m.type==='touch')this.lastTouch=null;
  if(m.type==='viewport')return this.setViewport(owner,m.width,m.height);
  const key=String(m.pointer);
  if(m.controlEpoch!==undefined&&m.controlEpoch!==this.controlEpoch)return false;
  if(m.layoutEpoch!==undefined&&m.layoutEpoch!==this.layout.epoch)return false;
  if(m.type==='release'){if(m.round!==this.round)return false;this.release(owner,key,m.fling===true,false,m.at);return true;}
  if(this.result||!this.connected[owner]||(this.started&&(!this.connected.every(Boolean)||!this.active.every(Boolean)))||m.round!==this.round||!Number.isInteger(m.tick)||m.tick>this.tick||this.tick-m.tick>HISTORY_TICKS||!Number.isFinite(m.x)||!Number.isFinite(m.y))return false;
  const p=this.pucks.find(p=>p.id===m.id);if(!p||p.owner!==owner||p.epoch!==m.epoch)return false;
  if(m.type==='move'){
   const h=this.holds[owner].get(key);if(!h||h.mode!=='grab'||h.id!==p.id||h.epoch!==p.epoch)return false;
   const dx=m.x-h.touchX,dy=m.y-h.touchY;
   if(!h.dragged&&Math.hypot(dx,dy)<=6)return true;
   h.dragged=true;h.targetX=clamp(h.anchorX+dx,R,W-R);h.targetY=clamp(h.anchorY+dy,this.started?-R:R+BARRIER_DEPTH,H-R);
   h.moves=recordMove(h.moves,m.at,h.targetX,h.targetY);return true;
  }
  if(m.type!=='touch'||this.pressed[owner].has(key)||[...this.holds[owner].values()].some(h=>h.id===p.id))return false;
  const old=this.clientMotion?(this.validPose(m.pose)?{...p,...m.pose}:null):this.history.find(s=>s.tick===m.tick)?.pucks.find(q=>q.id===p.id);
  if(!old||old.owner!==owner||old.epoch!==p.epoch)return false;
  const dx=old.x-m.x,dy=old.y-m.y,d=Math.hypot(dx,dy);if(d>R+8)return false;
  const mode=d<=GRAB_RADIUS?'grab':'edge';
  // A just-arrived puck can be caught where it was visibly presented, once per crossing.
  // This changes only its controller-rink position; combat still uses authoritative fighter state.
  const v=m.view,e=p.entry;
  if(!this.clientMotion&&mode==='grab'&&v&&e?.epoch===p.epoch&&!e.caught&&this.tick-e.tick<=30&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=R&&v.x<=W-R&&v.y>=0&&v.y<=Math.min(H-R,old.y+R)&&v.x>=Math.min(e.x,old.x)-R&&v.x<=Math.max(e.x,old.x)+R){p.x=v.x;p.y=v.y;p.entry={...e,caught:true};}

  const h={id:p.id,action:p.action,epoch:p.epoch,mode,touchTick:this.tick,tapVX:(d>1e-6?dx/d:0)*tapImpulse(d),tapVY:(d>1e-6?dy/d:-1)*tapImpulse(d),touchX:m.x,touchY:m.y,anchorX:p.x,anchorY:p.y,dragged:false,targetX:p.x,targetY:p.y,samples:[{tick:this.tick,x:p.x,y:p.y}],moves:Number.isFinite(m.at)?[{at:m.at,x:p.x,y:p.y}]:[]};
  this.pressed[owner].add(key);this.holds[owner].set(key,h);
  if(!this.clientMotion){if(mode==='grab'){p.vx=p.vy=0;}else{const strength=tapImpulse(d);[p.vx,p.vy]=cap(p.vx+dx/d*strength,p.vy+dy/d*strength,MAX_PUCK_SPEED);}
  }
  this.lastTouch={actionAccepted:false,practice:!this.started};
  if(!this.started)return true;
  const f=this.fighters[owner],attack=ATTACKS[p.action];
  if(p.action==='up'&&f.y===0&&f.stun<=0&&!f.attack){f.vy=440;this.lastTouch.actionAccepted=true;}
  if(['left','right','down'].includes(p.action)&&f.stun<=0&&!f.attack&&(p.action!=='down'||f.y===0))this.lastTouch.actionAccepted=true;
  const authored=timing.eventTime,dated=Number.isFinite(authored),eventStart=dated&&Number.isFinite(timing.effectiveTime)?Math.min(authored,timing.effectiveTime):authored;
  if(attack&&f.stun<=0&&!f.attack&&f.cool[p.action]<=0&&(!dated||eventStart>=this.attackReadyAt[owner])){
   // Credit elapsed network time against windup, but never skip the only active hit window.
   // Hits use current fighter positions on the next step; no historical damage is invented.
   const age=Math.min(attack.windup,Math.max(0,(timing.effectiveTime-authored)/1000)||0),duration=attack.windup+attack.active+attack.recovery;
   this.lastTouch.actionAccepted=true;f.attack={kind:p.action,age,hit:false,duration};f.cool[p.action]=duration-age;
   if(dated)this.attackReadyAt[owner]=eventStart+duration*1000;
  }
  return true;
 }
 transfer(p){
  if(!this.started){if(p.y<R+BARRIER_DEPTH){p.y=R+BARRIER_DEPTH;p.vy=Math.abs(p.vy)*.95;}return;}
  if(p.y>=0)return;
  const prev=p.owner;
  for(const [key,h] of this.holds[prev])if(h.id===p.id)this.release(prev,key,true,true);
  p.owner=1-prev;p.epoch++;p.x=W-p.x;p.y=-p.y;p.vx=-p.vx;p.vy=-p.vy;p.entry={epoch:p.epoch,tick:this.tick,x:clamp(p.x,R,W-R)};
 }
 collide(){
  for(let i=0;i<this.pucks.length;i++)for(let j=i+1;j<this.pucks.length;j++){
   const a=this.pucks[i],b=this.pucks[j];if(!this.started&&(a.owner!==b.owner||!this.connected[a.owner]))continue;const flip=a.owner!==b.owner,sign=flip?-1:1;
   const dx=(flip?W-b.x:b.x)-a.x,dy=(flip?-b.y:b.y)-a.y,d=Math.hypot(dx,dy);
   if(d<=0||d>=R*2)continue;
   const ma=this.grabFor(a)?0:1,mb=this.grabFor(b)?0:1,sum=ma+mb;if(!sum)continue;
   const nx=dx/d,ny=dy/d,over=(R*2-d)/sum;
   a.x-=nx*over*ma;a.y-=ny*over*ma;b.x+=sign*nx*over*mb;b.y+=sign*ny*over*mb;
   const v=(sign*b.vx-a.vx)*nx+(sign*b.vy-a.vy)*ny;
   if(v<0){const impulse=1.9*v/sum;a.vx+=impulse*nx*ma;a.vy+=impulse*ny*ma;b.vx-=sign*impulse*nx*mb;b.vy-=sign*impulse*ny*mb;}
  }
 }
 step(dt=1/60){
  this.tick++;
  if(!this.started&&this.connected.every(Boolean)){
   this.started=true;this.controlEpoch++;this.history=[];
   for(const owner of [0,1])for(const key of [...this.holds[owner].keys()])this.release(owner,key,false,true);
  }
  const running=this.started&&this.connected.every(Boolean)&&this.active.every(Boolean)&&!this.result;
  if(!this.clientMotion&&((!this.started&&this.connected.some(Boolean))||running)){
   let remaining=Math.min(.1,dt);
   while(remaining>1e-9){let speed=0;for(const p of this.pucks){[p.vx,p.vy]=cap(p.vx,p.vy,MAX_PUCK_SPEED);const h=this.grabFor(p);speed=Math.max(speed,h?Math.min(MAX_DRAG,Math.hypot(h.targetX-p.x,h.targetY-p.y)/remaining):Math.hypot(p.vx,p.vy));}const slice=Math.min(remaining,(R/4)/Math.max(1,speed));
   for(const p of this.pucks){
    if(!this.started&&!this.connected[p.owner])continue;
    const h=this.grabFor(p);
    if(h){const [dx,dy]=cap(h.targetX-p.x,h.targetY-p.y,MAX_DRAG*slice);p.x+=dx;p.y+=dy;p.vx=p.vy=0;h.samples.push({tick:this.tick,x:p.x,y:p.y});h.samples=h.samples.filter(s=>s.tick>=this.tick-6);}
    else{p.x+=p.vx*slice;p.y+=p.vy*slice;p.vx*=Math.exp(-.32*slice);p.vy*=Math.exp(-.32*slice);}
    if(p.x<R){p.x=R;p.vx=Math.abs(p.vx)*.95;}if(p.x>W-R){p.x=W-R;p.vx=-Math.abs(p.vx)*.95;}if(p.y>H-R){p.y=H-R;p.vy=-Math.abs(p.vy)*.95;}
    this.transfer(p);
   }
   this.collide();for(const p of this.pucks)this.transfer(p);
   remaining-=slice;}
  }
  if(running){
   this.time=Math.max(0,this.time-dt);
   this.fighters.forEach((f,i)=>{
    const o=this.fighters[1-i];f.stun=Math.max(0,f.stun-dt);for(const k of Object.keys(ATTACKS))f.cool[k]=Math.max(0,f.cool[k]-dt);
    const held=new Set([...this.holds[i].values()].map(h=>h.action));f.crouch=held.has('down')&&f.y===0;
    if(!f.attack&&f.stun<=0){if(f.y===0)f.facing=o.x>=f.x?1:-1;f.x+=(Number(held.has('right'))-Number(held.has('left')))*230*dt;}
    f.vy-=1050*dt;f.y=Math.max(0,f.y+f.vy*dt);if(f.y===0)f.vy=0;f.x=clamp(f.x,65,835);
    if(f.attack){f.attack.age+=dt;if(f.attack.age>=f.attack.duration)f.attack=null;}
   });
   // Both fighters' active hits are decided before either knockback is applied.
   const hits=[];
   this.fighters.forEach((f,i)=>{const o=this.fighters[1-i],a=f.attack;if(!a)return;const s=ATTACKS[a.kind];if(!a.hit&&a.age>=s.windup&&a.age<s.windup+s.active&&(o.x-f.x)*f.facing>0&&Math.abs(o.x-f.x)<s.reach&&Math.abs(o.y-f.y)<85){a.hit=true;hits.push({o,damage:s.damage*(o.crouch?.65:1),stun:s.stun,push:f.facing*s.push});}});
   for(const h of hits){h.o.hp=Math.max(0,h.o.hp-h.damage);h.o.stun=h.stun;h.o.x=clamp(h.o.x+h.push,65,835);}
   if(this.fighters.some(f=>f.hp<=0)||this.time<=0){const [a,b]=this.fighters;this.result=a.hp===b.hp?'DRAW':a.hp>b.hp?'CORAL WINS':'MINT WINS';this.release(0);this.release(1);}
  }
  this.history.push({tick:this.tick,pucks:this.pucks.map(p=>({...p}))});if(this.history.length>HISTORY_TICKS+5)this.history.shift();
 }
}
