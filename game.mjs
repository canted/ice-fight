export const W = 900, H = 420, R = 37;
export const GRAB_RADIUS = R * .62, EDGE_IMPULSE = 140, MAX_FLING = 620, BARRIER_DEPTH = 32;
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
export class Game {
 constructor({roundSeconds=300}={}){this.roundSeconds=roundSeconds;this.viewports=[null,null];this.layout={width:900,height:420,epoch:0};this.started=false;this.controlEpoch=0;this.round=0;this.tick=0;this.connected=[false,false];this.reset();}
 reset(){
  this.round++;this.time=this.roundSeconds;this.result=null;this.holds=[new Map(),new Map()];this.pressed=[new Set(),new Set()];
  this.fighters=[0,1].map(i=>({x:i?625:275,y:0,vy:0,hp:100,facing:i?-1:1,attack:null,cool:Object.fromEntries(Object.keys(ATTACKS).map(k=>[k,0])),stun:0}));
  this.pucks=[0,1].flatMap(owner=>actions.map((action,i)=>({id:`${owner}-${i}`,origin:owner,owner,epoch:0,action,x:90+(i%5)*180,y:120+Math.floor(i/5)*190,vx:(i%2?1:-1)*16,vy:8})));this.history=[];
 }
 grabFor(p){return [...this.holds[p.owner].values()].find(h=>h.id===p.id&&h.mode==='grab');}
 snapshot(){return {waiting:!this.started,controlEpoch:this.controlEpoch,layout:{...this.layout},tick:this.tick,round:this.round,time:this.time,result:this.result,paused:!this.connected.every(Boolean),connected:this.connected,pucks:this.pucks.map(p=>({...p,grabbed:!!this.grabFor(p)})),fighters:structuredClone(this.fighters),counts:[0,1].map(i=>this.pucks.filter(p=>p.owner===i).length)};}
 setViewport(owner,width,height){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<100||height<80||width>4000||height>3000)return false;
  this.viewports[owner]={width,height};const views=this.viewports.filter(Boolean),scale=Math.min(...views.map(v=>Math.min(v.width/W,v.height/H)));
  const w=Math.floor(W*scale),h=Math.floor(H*scale);if(w!==this.layout.width||h!==this.layout.height){this.release(0);this.release(1);this.layout={width:w,height:h,epoch:this.layout.epoch+1};}return true;
 }
 release(owner,pointer,fling=false,keepPressed=false,at){
  if(pointer===undefined){for(const key of [...this.holds[owner].keys()])this.release(owner,key);this.pressed[owner].clear();return;}
  const key=String(pointer),h=this.holds[owner].get(key),p=h&&this.pucks.find(p=>p.id===h.id);
  if(h?.mode==='grab'&&p&&p.owner===owner&&p.epoch===h.epoch){p.vx=p.vy=0;if(fling&&h.samples.length>1){const latest=h.samples.at(-1),first=h.samples.find(s=>s.tick>=this.tick-5)||latest;const dt=(this.tick-first.tick)/60;if(dt>0&&this.tick-latest.tick<=5){[p.vx,p.vy]=cap((p.x-first.x)/dt,(p.y-first.y)/dt,MAX_FLING);if(Math.hypot(p.vx,p.vy)<45)p.vx=p.vy=0;}}}
  if(fling&&h?.mode==='grab'&&p&&p.owner===owner&&Number.isFinite(at)&&h.moves.length>1){
   const last=h.moves.at(-1),first=h.moves.find(s=>s.at>=last.at-100)||last;
   if(at>=last.at&&at-last.at<=120&&last.at>first.at){const dt=Math.max(8,last.at-first.at)/1000;[p.vx,p.vy]=cap((last.x-first.x)/dt,(last.y-first.y)/dt,MAX_FLING);if(Math.hypot(last.x-first.x,last.y-first.y)<8)p.vx=p.vy=0;}else p.vx=p.vy=0;
  }
  this.holds[owner].delete(key);if(!keepPressed)this.pressed[owner].delete(key);
 }
 input(owner,m){
  if(m.type==='viewport')return this.setViewport(owner,m.width,m.height);
  const key=String(m.pointer);
  if(m.controlEpoch!==undefined&&m.controlEpoch!==this.controlEpoch)return false;
  if(m.layoutEpoch!==undefined&&m.layoutEpoch!==this.layout.epoch)return false;
  if(m.type==='release'){if(m.round!==this.round)return false;this.release(owner,key,m.fling===true,false,m.at);return true;}
  if(this.result||!this.connected[owner]||(this.started&&!this.connected.every(Boolean))||m.round!==this.round||!Number.isInteger(m.tick)||m.tick>this.tick||this.tick-m.tick>45||!Number.isFinite(m.x)||!Number.isFinite(m.y))return false;
  const p=this.pucks.find(p=>p.id===m.id);if(!p||p.owner!==owner||p.epoch!==m.epoch)return false;
  if(m.type==='move'){
   const h=this.holds[owner].get(key);if(!h||h.mode!=='grab'||h.id!==p.id||h.epoch!==p.epoch)return false;
   h.targetX=clamp(m.x+h.offsetX,R,W-R);h.targetY=clamp(m.y+h.offsetY,this.started?-R:R+BARRIER_DEPTH,H-R);
   if(Number.isFinite(m.at)&&(!h.moves.length||m.at>h.moves.at(-1).at)){const last=h.moves.at(-1);if(last&&m.at-last.at>100)h.moves.push({at:m.at-16,x:last.x,y:last.y});h.moves.push({at:m.at,x:h.targetX,y:h.targetY});h.moves=h.moves.filter(s=>s.at>=m.at-150).slice(-12);}return true;
  }
  if(m.type!=='touch'||this.pressed[owner].has(key)||[...this.holds[owner].values()].some(h=>h.id===p.id))return false;
  const old=this.history.find(s=>s.tick===m.tick)?.pucks.find(q=>q.id===p.id);
  if(!old||old.owner!==owner||old.epoch!==p.epoch)return false;
  const dx=old.x-m.x,dy=old.y-m.y,d=Math.hypot(dx,dy);if(d>R+8)return false;
  const mode=d<=GRAB_RADIUS?'grab':'edge';
  const h={id:p.id,action:p.action,epoch:p.epoch,mode,offsetX:dx,offsetY:dy,targetX:p.x,targetY:p.y,samples:[{tick:this.tick,x:p.x,y:p.y}],moves:Number.isFinite(m.at)?[{at:m.at,x:p.x,y:p.y}]:[]};
  this.pressed[owner].add(key);this.holds[owner].set(key,h);
  if(mode==='grab'){p.vx=p.vy=0;}else{const strength=clamp((d-GRAB_RADIUS)/(R-GRAB_RADIUS),0,1)*EDGE_IMPULSE;[p.vx,p.vy]=cap(p.vx+dx/d*strength,p.vy+dy/d*strength,320);}
  if(!this.started)return true;
  const f=this.fighters[owner],attack=ATTACKS[p.action];
  if(p.action==='up'&&f.y===0&&f.stun<=0&&!f.attack)f.vy=440;
  if(attack&&f.stun<=0&&!f.attack&&f.cool[p.action]<=0){f.attack={kind:p.action,age:0,hit:false,duration:attack.windup+attack.active+attack.recovery};f.cool[p.action]=f.attack.duration;}
  return true;
 }
 transfer(p){
  if(!this.started){if(p.y<R+BARRIER_DEPTH){p.y=R+BARRIER_DEPTH;p.vy=Math.abs(p.vy)*.95;}return;}
  if(p.y>=0)return;
  const prev=p.owner;
  for(const [key,h] of this.holds[prev])if(h.id===p.id)this.release(prev,key,true,true);
  p.owner=1-prev;p.epoch++;p.x=W-p.x;p.y=-p.y;p.vx=-p.vx;p.vy=-p.vy;
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
  const running=this.started&&this.connected.every(Boolean)&&!this.result;
  if((!this.started&&this.connected.some(Boolean))||running){
   for(const p of this.pucks){
    if(!this.started&&!this.connected[p.owner])continue;
    const h=this.grabFor(p);
    if(h){const [dx,dy]=cap(h.targetX-p.x,h.targetY-p.y,1200*dt);p.x+=dx;p.y+=dy;p.vx=p.vy=0;h.samples.push({tick:this.tick,x:p.x,y:p.y});h.samples=h.samples.filter(s=>s.tick>=this.tick-6);}
    else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-.32*dt);p.vy*=Math.exp(-.32*dt);}
    if(p.x<R){p.x=R;p.vx=Math.abs(p.vx)*.95;}if(p.x>W-R){p.x=W-R;p.vx=-Math.abs(p.vx)*.95;}if(p.y>H-R){p.y=H-R;p.vy=-Math.abs(p.vy)*.95;}
    this.transfer(p);
   }
   this.collide();for(const p of this.pucks)this.transfer(p);
  }
  if(running){
   this.time=Math.max(0,this.time-dt);
   this.fighters.forEach((f,i)=>{
    const o=this.fighters[1-i];f.stun=Math.max(0,f.stun-dt);for(const k of Object.keys(ATTACKS))f.cool[k]=Math.max(0,f.cool[k]-dt);
    const held=new Set([...this.holds[i].values()].map(h=>h.action));f.crouch=held.has('down')&&f.y===0;
    if(!f.attack&&f.stun<=0){if(f.y===0)f.facing=o.x>=f.x?1:-1;f.x+=(Number(held.has('right'))-Number(held.has('left')))*230*dt;}
    f.vy-=1050*dt;f.y=Math.max(0,f.y+f.vy*dt);if(f.y===0)f.vy=0;f.x=clamp(f.x,65,835);
    if(f.attack){const a=f.attack,s=ATTACKS[a.kind];a.age+=dt;if(!a.hit&&a.age>=s.windup&&a.age<s.windup+s.active&&(o.x-f.x)*f.facing>0&&Math.abs(o.x-f.x)<s.reach&&Math.abs(o.y-f.y)<85){a.hit=true;o.hp=Math.max(0,o.hp-s.damage*(o.crouch?.65:1));o.stun=s.stun;o.x=clamp(o.x+f.facing*s.push,65,835);}if(a.age>=a.duration)f.attack=null;}
   });
   if(this.fighters.some(f=>f.hp<=0)||this.time<=0){const [a,b]=this.fighters;this.result=a.hp===b.hp?'DRAW':a.hp>b.hp?'CORAL WINS':'MINT WINS';this.release(0);this.release(1);}
  }
  this.history.push({tick:this.tick,pucks:this.pucks.map(p=>({...p}))});if(this.history.length>50)this.history.shift();
 }
}
