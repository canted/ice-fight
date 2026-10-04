export const INPUT_BUFFER_MS=200,STEP_MS=1000/60;
// One delayed, timestamp-ordered timeline owns both controllers and the fight.
// Late arrivals apply at the next step; this is intentionally not historical rollback.
export class InputTimeline {
 constructor(now,{bufferMs=INPUT_BUFFER_MS}={}){this.bufferMs=bufferMs;this.time=now-bufferMs;this.queue=[];this.serial=0;this.lateInputs=0;}
 enqueue(owner,eventTime,now,apply){
  if(!Number.isFinite(eventTime)||eventTime<now-2000||eventTime>now+250)return false;
  const lateMs=Math.max(0,this.time-eventTime);if(lateMs>0)this.lateInputs++;
  this.queue.push({owner,eventTime,at:Math.max(this.time,eventTime),serial:this.serial++,apply,lateMs});
  this.queue.sort((a,b)=>a.at-b.at||a.eventTime-b.eventTime||a.serial-b.serial);return true;
 }
 clearOwner(owner){this.queue=this.queue.filter(e=>e.owner!==owner);}
 advance(now,step){
  let n=0;while(this.time+STEP_MS<=now-this.bufferMs&&n++<120){this.time+=STEP_MS;while(this.queue.length&&this.queue[0].at<=this.time){const e=this.queue.shift();e.apply({eventTime:e.eventTime,effectiveTime:this.time,lateMs:e.lateMs});}step();}
 }
}
