export const STEP_MS=1000/60;
// Fixed simulation steps follow real time. Inputs are handled directly in the socket callback.
export class RealtimeSimulation {
 constructor(now){this.time=now;}
 advance(now,step){let n=0;while(this.time+STEP_MS<=now&&n++<120){this.time+=STEP_MS;step();}}
}
