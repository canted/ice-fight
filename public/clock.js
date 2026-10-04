// NTP-style midpoint estimate; lowest-RTT recent samples reduce queueing noise.
export class ControllerClock {
 constructor(){this.reset();}
 reset(){this.samples=[];this.offset=0;this.ready=false;this.rtt=0;}
 sample(clientAt,serverAt,now){
  if(![clientAt,serverAt,now].every(Number.isFinite)||now<clientAt)return false;
  const sample={rtt:now-clientAt,offset:serverAt-(clientAt+now)/2};
  const discontinuity=this.ready&&Math.abs(sample.offset-this.offset)>250;
  if(discontinuity)this.samples=[];
  this.samples.push(sample);this.samples=this.samples.slice(-8);const best=this.samples.reduce((a,b)=>a.rtt<=b.rtt?a:b);
  this.offset=best.offset;this.rtt=best.rtt;this.ready=true;return discontinuity;
 }
 toServer(at){return this.ready?at+this.offset:undefined;}
}
export function clientEventTime(at,now,wallNow){return Number.isFinite(at)&&Math.abs(at-wallNow)<60000?at-(wallNow-now):at??now;}
