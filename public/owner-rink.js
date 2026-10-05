import {recordMove,flingVelocity,MAX_DRAG,MAX_PUCK_SPEED} from './puck-motion.js';
const R=37,W=900,H=420,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const cap=(x,y,max)=>{const k=Math.min(1,max/(Math.hypot(x,y)||1));return {vx:x*k,vy:y*k};};
// One controller owns this entire half's motion. Checkpoints never reconcile live local pucks.
export class OwnerRink {
 constructor(owner,onTransfer=()=>{}){this.owner=owner;this.onTransfer=onTransfer;this.pucks=new Map();this.departing=new Map();this.holds=new Map();this.tick=0;this.accumulator=0;this.round=null;this.lastAt=null;this.enabled=false;}
 sync(s){
  const initial=this.round===null,reset=this.round!==s.round;
  if(reset){this.cancel();this.pucks.clear();this.departing.clear();this.round=s.round;this.lastAt=null;}
  this.waiting=s.waiting;this.enabled=!s.result&&(!s.paused||s.waiting);
  for(const [id,p]of this.pucks){const q=s.pucks.find(q=>q.id===id);if(!q||q.owner!==this.owner||q.epoch!==p.epoch){this.removeHolds(id);this.pucks.delete(id);}}
  for(const [id,p]of this.departing){const q=s.pucks.find(q=>q.id===id);if(!q||q.owner!==this.owner||q.epoch!==p.epoch)this.departing.delete(id);}
  for(const p of s.pucks)if(p.owner===this.owner&&!this.pucks.has(p.id)&&!this.departing.has(p.id)){
   const fresh=!initial&&!reset&&p.entry?.epoch===p.epoch;
   this.pucks.set(p.id,{...p,...(fresh?{x:p.entry.x,y:0}:{}),fresh,grabbed:false});
  }
 }
 painted(){for(const p of this.pucks.values())p.fresh=false;}
 removeHolds(id){for(const [key,h]of this.holds)if(h.id===id)this.holds.delete(key);}
 press(pointer,p,x,y,at){
  if(p.fresh||this.holds.has(pointer)||[...this.holds.values()].some(h=>h.id===p.id))return null;
  const dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy);if(d>R)return null;
  const strength=d<=R*.25?6:6+134*clamp((d-R*.25)/(R-R*.25),0,1);
  const h={id:p.id,epoch:p.epoch,grab:d<=R*.72,touch:{x,y},anchor:{x:p.x,y:p.y},x:p.x,y:p.y,at,dragged:false,moves:[{at,x:p.x,y:p.y}],tap:cap(d?dx/d*strength:0,d?dy/d*strength:-6,320)};
  this.holds.set(pointer,h);if(h.grab){p.vx=p.vy=0;p.grabbed=true;}else Object.assign(p,cap(p.vx+h.tap.vx,p.vy+h.tap.vy,MAX_PUCK_SPEED));return h;
 }
 move(pointer,x,y,at){const h=this.holds.get(pointer);if(!h?.grab)return;const dx=x-h.touch.x,dy=y-h.touch.y;if(!h.dragged&&Math.hypot(dx,dy)<=6)return;h.dragged=true;h.x=clamp(h.anchor.x+dx,R,W-R);h.y=clamp(h.anchor.y+dy,this.waiting?69:-R,H-R);h.moves=recordMove(h.moves,at,h.x,h.y);}
 release(pointer,fling=false,at=0){const h=this.holds.get(pointer);if(!h)return;const p=this.pucks.get(h.id);if(p&&h.grab){p.grabbed=false;Object.assign(p,fling?(h.dragged?flingVelocity(h.moves,at)||{vx:0,vy:0}:at-h.at<=200?h.tap:{vx:0,vy:0}):{vx:0,vy:0});}this.holds.delete(pointer);}
 cancel(){for(const key of [...this.holds.keys()])this.release(key);}
 checkpoint(){return [...this.pucks.values()].map(({id,epoch,x,y,vx,vy})=>({id,epoch,x,y,vx,vy}));}
 rejectTransfer(id,epoch){const p=this.departing.get(id);if(!p||p.epoch!==epoch)return;this.departing.delete(id);this.pucks.set(id,{...p,y:this.waiting?69:0,vx:0,vy:0,fresh:true});}
 update(now){if(this.lastAt===null)this.lastAt=now;const dt=Math.min(.1,Math.max(0,(now-this.lastAt)/1000));this.lastAt=now;if(!this.enabled){this.accumulator=0;return;}this.accumulator+=dt;while(this.accumulator>=1/120){this.step(1/120);this.accumulator-=1/120;}}
 bound(p){if(p.x<R){p.x=R;p.vx=Math.abs(p.vx)*.95;}if(p.x>W-R){p.x=W-R;p.vx=-Math.abs(p.vx)*.95;}if(p.y>H-R){p.y=H-R;p.vy=-Math.abs(p.vy)*.95;}if(this.waiting&&p.y<69){p.y=69;p.vy=Math.abs(p.vy)*.95;}}
 step(dt=1/120){
  this.tick++;let remaining=Math.min(.1,Math.max(0,dt));
  while(remaining>1e-9){
   // At most a quarter-radius of travel per puck: fast opposing contacts cannot swap sides.
   let speed=0;for(const p of this.pucks.values()){if(p.fresh)continue;Object.assign(p,cap(p.vx,p.vy,MAX_PUCK_SPEED));speed=Math.max(speed,Math.hypot(p.vx,p.vy));}
   for(const h of this.holds.values())if(h.grab){const p=this.pucks.get(h.id);if(p&&!p.fresh)speed=Math.max(speed,Math.min(MAX_DRAG,Math.hypot(h.x-p.x,h.y-p.y)/remaining));}
   const slice=Math.min(remaining,(R/4)/Math.max(1,speed));this.advanceSlice(slice);remaining-=slice;
  }
 }
 advanceSlice(dt){
  const ps=[...this.pucks.values()],before=new Map(ps.map(p=>[p.id,{x:p.x,y:p.y}]));
  for(const p of ps){if(p.fresh)continue;const h=[...this.holds.values()].find(h=>h.id===p.id&&h.grab);if(h){const v=cap(h.x-p.x,h.y-p.y,MAX_DRAG*dt);p.x+=v.vx;p.y+=v.vy;p.vx=p.vy=0;}else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-.32*dt);p.vy*=Math.exp(-.32*dt);}this.bound(p);}
  for(let iteration=0;iteration<3;iteration++){
   for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
    const a=ps[i],b=ps[j];if(a.fresh||b.fresh)continue;let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
    if(d>=R*2&&iteration===0){
     // Sweep catches even a near-tangent contact that enters and exits between slice endpoints.
     const pa=before.get(a.id),pb=before.get(b.id),sx=pb.x-pa.x,sy=pb.y-pa.y,rx=dx-sx,ry=dy-sy,A=rx*rx+ry*ry,B=2*(sx*rx+sy*ry),C=sx*sx+sy*sy-4*R*R,D=B*B-4*A*C;
     if(A>1e-12&&B<0&&C>=0&&D>=0){const t=(-B-Math.sqrt(D))/(2*A);if(t>=0&&t<=1){a.x=pa.x+(a.x-pa.x)*t;a.y=pa.y+(a.y-pa.y)*t;b.x=pb.x+(b.x-pb.x)*t;b.y=pb.y+(b.y-pb.y)*t;dx=b.x-a.x;dy=b.y-a.y;d=Math.hypot(dx,dy);}}
    }
    if(d>R*2+1e-7)continue;
    const ma=a.grabbed?0:1,mb=b.grabbed?0:1,sum=ma+mb;if(!sum)continue;const nx=d?dx/d:1,ny=d?dy/d:0,over=Math.max(0,R*2-d)/sum;
    a.x-=nx*over*ma;a.y-=ny*over*ma;b.x+=nx*over*mb;b.y+=ny*over*mb;const v=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(v<0){const impulse=1.9*v/sum;a.vx+=impulse*nx*ma;a.vy+=impulse*ny*ma;b.vx-=impulse*nx*mb;b.vy-=impulse*ny*mb;}
   }
   for(const p of ps)if(!p.fresh){Object.assign(p,cap(p.vx,p.vy,MAX_PUCK_SPEED));this.bound(p);}
  }
  for(const p of ps){if(p.fresh)continue;if(!this.waiting&&p.y<0){
   const h=[...this.holds.values()].find(h=>h.id===p.id&&h.grab);if(h?.dragged)Object.assign(p,flingVelocity(h.moves,h.moves.at(-1).at)||{vx:0,vy:-60});p.vy=Math.min(-6,p.vy);Object.assign(p,cap(p.vx,p.vy,MAX_PUCK_SPEED));
   const previous=before.get(p.id),fraction=previous.y>0?previous.y/(previous.y-p.y):0;p.x=clamp(previous.x+(p.x-previous.x)*fraction,R,W-R);p.y=0;
   this.pucks.delete(p.id);this.removeHolds(p.id);this.departing.set(p.id,{...p,grabbed:false});this.onTransfer({...p});
  }}
 }
}
