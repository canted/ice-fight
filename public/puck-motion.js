export const MAX_DRAG=12000, MAX_FLING=6200, MAX_PUCK_SPEED=24000;
// Shared pointer sample rules. These are the server's existing fling rules, not a new force model.
export function recordMove(moves, at, x, y) {
 if(!Number.isFinite(at)||(moves.length&&at<=moves.at(-1).at))return moves;
 const last=moves.at(-1);
 if(last&&at-last.at>100)moves.push({at:at-16,x:last.x,y:last.y});
 moves.push({at,x,y});return moves.filter(s=>s.at>=at-150).slice(-12);
}
export function flingVelocity(moves, at) {
 if(!Number.isFinite(at)||moves.length<2)return null;
 const last=moves.at(-1),first=moves.find(s=>s.at>=last.at-100)||last;
 if(at<last.at||at-last.at>120||last.at<=first.at||Math.hypot(last.x-first.x,last.y-first.y)<8)return {vx:0,vy:0};
 const dt=Math.max(8,last.at-first.at)/1000,vx=(last.x-first.x)/dt,vy=(last.y-first.y)/dt,k=Math.min(1,MAX_FLING/(Math.hypot(vx,vy)||1));return {vx:vx*k,vy:vy*k};
}
// Visual only: server snapshots still decide collisions and ownership. Never invent a seam transfer.
export function advance(p, seconds, waiting) {
 const out={...p};let remaining=Math.max(0,Math.min(seconds,.5));
 while(remaining>1e-8){const dt=Math.min(1/60,remaining);remaining-=dt;out.x+=out.vx*dt;out.y+=out.vy*dt;out.vx*=Math.exp(-.32*dt);out.vy*=Math.exp(-.32*dt);
  if(out.x<37){out.x=37;out.vx=Math.abs(out.vx)*.95;}if(out.x>863){out.x=863;out.vx=-Math.abs(out.vx)*.95;}
  if(out.y>383){out.y=383;out.vy=-Math.abs(out.vy)*.95;}if(waiting&&out.y<69){out.y=69;out.vy=Math.abs(out.vy)*.95;}
 }return out;
}
export class ReleaseMotion {
 constructor(p,seq,now){Object.assign(this,p);this.seq=seq;this.releasedAt=now;this.lastAt=now;this.ackTick=null;this.samples=[];}
 acknowledge(p,tick,now){if(p.id!==this.id||p.epoch!==this.epoch||p.owner!==this.owner)return false;this.ackTick=tick;this.timeline=tick+(now-this.releasedAt)*.06;this.samples=[{...p,tick}];return true;}
 observe(p,tick){if(this.ackTick===null||tick<this.ackTick||p.grabbed||tick<=this.samples.at(-1).tick)return;this.samples.push({...p,tick});this.samples=this.samples.slice(-12);}
 render(now,normal,normalTick,waiting,normalIsPostRelease=true){
  const dt=Math.min(.05,Math.max(0,(now-this.lastAt)/1000));this.lastAt=now;
  if(this.ackTick===null){Object.assign(this,advance(this,dt,waiting));return this;}
  // Drain the local release's time lead gradually, rather than replaying the old interpolation buffer.
  this.timeline=Math.max(this.ackTick,this.timeline+dt*60*.8);
  const eligible=normalIsPostRelease&&normalTick>=this.ackTick&&!normal.grabbed;
  if(eligible&&this.timeline<=normalTick){
   this.handoff??={at:now,x:this.x-normal.x,y:this.y-normal.y};const k=Math.exp(-(now-this.handoff.at)/90);
   this.x=normal.x+this.handoff.x*k;this.y=normal.y+this.handoff.y*k;this.done=Math.hypot(this.handoff.x*k,this.handoff.y*k)<.25;return this;
  }
  let target=this.samples.at(-1);const next=this.samples.find(p=>p.tick>=this.timeline);
  if(next){const prev=this.samples.filter(p=>p.tick<=this.timeline).at(-1)||next;const a=next.tick===prev.tick?0:(this.timeline-prev.tick)/(next.tick-prev.tick);target={...next,x:prev.x+(next.x-prev.x)*a,y:prev.y+(next.y-prev.y)*a};}
  else target=advance(target,(this.timeline-target.tick)/60,waiting);
  const stepped=advance({...this,vx:target.vx,vy:target.vy},dt*.8,waiting),blend=1-Math.exp(-dt/.09);let dx=(target.x-stepped.x)*blend,dy=(target.y-stepped.y)*blend;
  // For an unobstructed forward fling, absorb position error by slowing slightly, never rewinding.
  const speed=Math.hypot(target.vx,target.vy),dot=target.vx*this.vx+target.vy*this.vy;
  if(speed>1&&dot>0){const nx=target.vx/speed,ny=target.vy/speed,along=dx*nx+dy*ny,min=-speed*dt*.4;if(along<min){dx+=(min-along)*nx;dy+=(min-along)*ny;}}
  this.x=stepped.x+dx;this.y=stepped.y+dy;this.vx=target.vx;this.vy=target.vy;
  this.x=Math.max(37,Math.min(863,this.x));this.y=Math.min(383,waiting?Math.max(69,this.y):this.y);return this;
 }
}

// A received transfer is visible at the seam on its first painted frame. Ownership is never delayed.
export class EdgeEntry {
 constructor(p){this.epoch=p.epoch;this.x=Math.max(37,Math.min(863,p.entry?.epoch===p.epoch?p.entry.x:p.x));this.startedAt=null;this.presented=false;this.done=false;}
 render(p,now){if(!this.presented)this.startedAt=now;this.startedAt??=now;const t=Math.max(0,Math.min(1,(now-this.startedAt)/250)),a=t*t*(3-2*t);this.done=t===1;return {...p,x:this.x+(p.x-this.x)*a,y:Math.max(0,p.y)*a};}
}
export function syncEntries(entries,previous,state,owner){
 for(const [id,e]of entries)if(!state.pucks.some(p=>p.id===id&&p.owner===owner&&p.epoch===e.epoch))entries.delete(id);
 // Existing pucks on initial load/reconnect are a snapshot, not new transfers.
 if(!previous||previous.round!==state.round||previous.controlEpoch!==state.controlEpoch||state.waiting)return;
 for(const p of state.pucks){const old=previous.pucks.find(q=>q.id===p.id);if(p.owner===owner&&old&&(old.owner!==owner||old.epoch!==p.epoch))entries.set(p.id,new EdgeEntry(p));}
}
