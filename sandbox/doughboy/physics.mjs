const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Dough {
 constructor(){this.settings={softness:.6,damping:.85,feetEffort:.6,headEffort:.6,iceFriction:.1};Object.defineProperty(this.settings,'upright',{get(){return (this.feetEffort+this.headEffort)/2;},set(v){this.feetEffort=this.headEffort=v;}});this.reset();}
 effort(name){const p=this.node(name),base=/shoulder|elbow|hand/.test(name)?282:p.ry,t=clamp((509-base)/(509-191),0,1);return this.settings.feetEffort*(1-t)+this.settings.headEffort*t;}
 traction(side){const head=this.node('head'),pelvis=this.node('pelvis'),demand=clamp(Math.abs(head.x-pelvis.x)/150+Math.max(0,head.y-pelvis.y+140)/200,0,1);return this.settings.iceFriction*4+this.settings.feetEffort*demand*.35*(1+.05*Math.sin(this.time*2+(side==='L'?0:1)));}
 maxStance(){const leg=Math.hypot(4,52);return 72+2*leg*Math.sin(Math.asin((150-72)/(2*leg))+7.5*Math.PI/180);}
 reset(){this.nodes=[];this.links=[];this.faces=[];this.joints=[];this.holds=new Map();this.time=0;this.punchWindow=0;
  const add=(name,x,y,r,fixed=false)=>{this.nodes.push({name,x,y,px:x,py:y,rx:x,ry:y,r,fixed});};
  add('head',450,191,50);add('neck',450,255,20);add('chest',450,286,35);add('belly',450,346,57);add('pelvis',450,402,34);
  for(const [s,k]of [['L',-1],['R',1]]){add(s+'shoulder',450+k*49,282,30);add(s+'waist',450+k*62,342,31);add(s+'hip',450+k*31,399,30);add(s+'elbow',450+k*82,324,24);add(s+'hand',450+k*89,367,28);add(s+'knee',450+k*35,451,22);add(s+'ankle',450+k*35,491,23);add(s+'foot',450+k*40,509,29);}
  const link=(a,b,kind='body')=>{const p=this.node(a),q=this.node(b);this.links.push({a:p,b:q,length:Math.hypot(p.x-q.x,p.y-q.y),kind});};
  link('head','neck','bone');link('neck','chest','spine');link('chest','belly','spine');link('belly','pelvis','spine');
  for(const s of ['L','R']){link('chest',s+'shoulder','bone');link('neck',s+'shoulder');link(s+'shoulder',s+'waist');link(s+'waist',s+'hip');link(s+'waist','belly');link(s+'shoulder','belly');link(s+'hip','pelvis','bone');link(s+'hip','belly');link(s+'hip',s+'knee','bone');link(s+'knee',s+'ankle','bone');link(s+'ankle',s+'foot','bone');link(s+'shoulder',s+'elbow','bone');link(s+'elbow',s+'hand','bone');}
  const joint=(name,a,b,c,min,max,children,absolute=false)=>{const ns=[a,b,c].map(k=>typeof k==='string'?this.node(k):k),rest=this.angle(...ns);this.joints.push({name,a:ns[0],b:ns[1],c:ns[2],rest,min:absolute?min*Math.PI/180:rest+min*Math.PI/180,max:absolute?max*Math.PI/180:rest+max*Math.PI/180,children:children.map(k=>this.node(k))});};
  const upper=['belly','chest','neck','head','Lshoulder','Rshoulder','Lwaist','Rwaist','Lelbow','Relbow','Lhand','Rhand'];
  // Elbows retain mirrored one-way flexion; knees intentionally bend both ways.
  joint('L knee','Lankle','Lknee','Lhip',-75,75,['Lhip']);joint('R knee','Rankle','Rknee','Rhip',-75,75,['Rhip']);
  this.kneeCenter={x:450,y:451};joint('pelvis / hips',this.kneeCenter,'pelvis','belly',-90,90,upper);
  joint('lower spine','pelvis','belly','chest',-110,110,upper.filter(k=>!['belly','Lwaist','Rwaist'].includes(k)));
  joint('upper spine','belly','chest','neck',-100,100,['neck','head']);
  joint('neck','chest','neck','head',-90,90,['head']);
  for(const side of ['L','R']){joint(side+' shoulder','chest',side+'shoulder',side+'elbow',-155,155,[side+'elbow',side+'hand']);joint(side+' elbow',side+'shoulder',side+'elbow',side+'hand',side==='L'?35:-178,side==='L'?178:-35,[side+'hand'],true);}
  link('Lshoulder','Rshoulder');link('Lwaist','Rwaist');link('Lhip','Rhip','bone');
  for(const names of [['Lshoulder','Rshoulder','neck'],['Lshoulder','Rshoulder','belly'],['Lshoulder','Lwaist','belly'],['Rshoulder','Rwaist','belly'],['Lwaist','Lhip','belly'],['Rwaist','Rhip','belly'],['Lhip','Rhip','belly']]){const [a,b,c]=names.map(n=>this.node(n));this.faces.push({a,b,c,rest:(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)});}

 }
 angle(a,b,c){return Math.atan2((a.x-b.x)*(c.y-b.y)-(a.y-b.y)*(c.x-b.x),(a.x-b.x)*(c.x-b.x)+(a.y-b.y)*(c.y-b.y));}
 jointAngle(j){const t=this.angle(j.a,j.b,j.c);const reference=j.lastAngle??j.rest;return reference+Math.atan2(Math.sin(t-reference),Math.cos(t-reference));}
 jointStiffness(j){return j.name.endsWith('shoulder')?2:j.name==='neck'?.4:j.name==='pelvis / hips'?1.4:1;}
 relaxPose(amount){if(amount===0)return;for(const j of this.joints){const gain=this.effort(j.b.name||'pelvis')**3*this.jointStiffness(j),error=this.jointAngle(j)-j.rest,co=Math.cos(-error*amount*gain),si=Math.sin(-error*amount*gain);for(const p of j.children){const x=p.x-j.b.x,y=p.y-j.b.y;p.x=j.b.x+x*co-y*si;p.y=j.b.y+x*si+y*co;}}}
 solveJoints(){for(const j of this.joints){const theta=this.jointAngle(j),error=theta-clamp(theta,j.min,j.max);j.lastAngle=clamp(theta,j.min,j.max);if(Math.abs(error)<1e-8)continue;const co=Math.cos(-error),si=Math.sin(-error);for(const p of j.children){const x=p.x-j.b.x,y=p.y-j.b.y;const ox=p.x,oy=p.y;p.x=j.b.x+x*co-y*si;p.y=j.b.y+x*si+y*co;p.px+=p.x-ox;p.py+=p.y-oy;}}}

 node(name){return this.nodes.find(n=>n.name===name);}
 grab(id,x,y){if(this.holds.has(id))return false;const candidates=this.nodes.filter(n=>!n.fixed&&![...this.holds.values()].some(h=>h.node===n)&&Math.hypot(x-n.x,y-n.y)<n.r+18);candidates.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));const node=candidates[0];if(!node)return false;this.holds.set(id,{node,x,y});return true;}
 move(id,x,y){const h=this.holds.get(id);if(h){h.x=clamp(x,30,870);h.y=clamp(y,40,515);}}
 shapeTorso(strength=1,skipHips=false){const stations=[['chest','belly','shoulder',49],['belly','pelvis','waist',62],['pelvis','belly','hip',31]];for(const [centerName,otherName,suffix,width]of stations){if(skipHips&&suffix==='hip')continue;const center=this.node(centerName),other=this.node(otherName),flip=centerName==='pelvis'?-1:1,dx=(other.x-center.x)*flip,dy=(other.y-center.y)*flip,len=Math.hypot(dx,dy)||1,nx=dy/len,ny=-dx/len;for(const [side,sign]of [['L',-1],['R',1]]){const p=this.node(side+suffix),tx=center.x+nx*width*sign,ty=center.y+ny*width*sign,ex=p.x-tx,ey=p.y-ty,max=suffix==='waist'?3+9*this.settings.softness:5,d=Math.hypot(ex,ey),k=d>max?1-max/d:0;const amount=Math.max(k,strength);const sx=(tx-p.x)*amount,sy=(ty-p.y)*amount;p.x+=sx;p.y+=sy;p.px+=sx;p.py+=sy;}}}
 constrainLengths(){for(const l of this.links){if(!['bone','spine'].includes(l.kind))continue;const a=l.a,b=l.b,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,target=clamp(d,l.length*.94,l.length*1.06),k=(d-target)/d*.5;a.x+=dx*k;a.y+=dy*k;b.x-=dx*k;b.y-=dy*k;}}
 groundLegs(){const lf=this.node('Lfoot'),rf=this.node('Rfoot'),oldL=lf.x,oldR=rf.x;lf.x=clamp(lf.x,65,765);rf.x=clamp(rf.x,135,835);const center=(lf.x+rf.x)/2,span=clamp(rf.x-lf.x,70,this.maxStance());lf.x=clamp(center-span/2,65,835-span);rf.x=lf.x+span;lf.px+=lf.x-oldL;rf.px+=rf.x-oldR;const lv=lf.x-lf.px,rv=rf.x-rf.px;if((span<=70&&rv<lv)||(span>=this.maxStance()&&rv>lv)){const v=(lv+rv)/2;lf.px=lf.x-v;rf.px=rf.x-v;}for(const side of ['L','R']){const foot=this.node(side+'foot'),ankle=this.node(side+'ankle'),knee=this.node(side+'knee');foot.x=clamp(foot.x,65,835);foot.y=foot.py=509;ankle.x=foot.x+(side==='L'?5:-5);ankle.y=491;ankle.px=foot.px+(side==='L'?5:-5);ankle.py=491;const oldKx=knee.x,oldKy=knee.y,tilt=clamp(Math.atan2(knee.x-ankle.x,ankle.y-knee.y),-Math.PI/9,Math.PI/9);knee.x=ankle.x+Math.sin(tilt)*40;knee.y=ankle.y-Math.cos(tilt)*40;knee.px+=knee.x-oldKx;knee.py+=knee.y-oldKy;}this.kneeCenter.x=(this.node('Lknee').x+this.node('Rknee').x)/2;this.kneeCenter.y=(this.node('Lknee').y+this.node('Rknee').y)/2;}
 solveHeldHands(){for(const h of this.holds.values()){if(!['Lhand','Rhand'].includes(h.node.name))continue;const side=h.node.name[0],a=this.node(side+'shoulder'),b=this.node(side+'elbow'),p=h.node,l1=this.links.find(l=>l.a===a&&l.b===b).length,l2=this.links.find(l=>l.a===b&&l.b===p).length,dx=h.x-a.x,dy=h.y-a.y,raw=Math.hypot(dx,dy)||1,d=clamp(raw,Math.sqrt(l1*l1+l2*l2-2*l1*l2*Math.cos(35*Math.PI/180)),l1+l2-.1),ux=dx/raw,uy=dy/raw,along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),goal={x:a.x+ux*d,y:a.y+uy*d};let candidate={x:a.x+ux*along-uy*height,y:a.y+uy*along+ux*height};if((this.angle(a,candidate,goal)>0)!==(side==='L'))candidate={x:a.x+ux*along+uy*height,y:a.y+uy*along-ux*height};b.x+=(candidate.x-b.x)*.45;b.y+=(candidate.y-b.y)*.45;p.x+=(goal.x-p.x)*.45;p.y+=(goal.y-p.y)*.45;}}
 punch(strength='light'){this.punchWindow=.25;const impulse={light:28,medium:80,strong:180}[strength]??28,head=this.node('head');head.px=head.x-clamp(head.x-head.px+impulse,-180,180);head.py=head.y-clamp(head.y-head.py+impulse*.6,-108,108);}
 release(id){this.holds.delete(id);}
 projectSkeleton(){
  const lf=this.node('Lfoot'),rf=this.node('Rfoot'),pelvis=this.node('pelvis');
  // Transfer horizontal body reaction into both independent ground contacts.
  const center=(lf.x+rf.x)/2,drive=clamp((pelvis.x-center)*.12,-3,3);lf.x+=drive;rf.x+=drive;this.groundLegs();
  const lk=this.node('Lknee'),rk=this.node('Rknee'),cx=(lk.x+rk.x)/2,span=Math.min(100,Math.abs(rk.x-lk.x-62)),leg=Math.hypot(4,52),height=Math.sqrt(Math.max(4,leg*leg-span*span/4));
  const move=(p,x,y)=>{const dx=x-p.x,dy=y-p.y;p.x=x;p.y=y;p.px+=dx;p.py+=dy;};
  move(pelvis,cx,(lk.y+rk.y)/2-height+3);move(this.node('Lhip'),pelvis.x-31,pelvis.y-3);move(this.node('Rhip'),pelvis.x+31,pelvis.y-3);
  const descendants={belly:['belly','chest','neck','head','Lshoulder','Rshoulder','Lwaist','Rwaist','Lelbow','Relbow','Lhand','Rhand'],chest:['chest','neck','head','Lshoulder','Rshoulder','Lelbow','Relbow','Lhand','Rhand'],neck:['neck','head'],head:['head']};
  for(const [parent,child,len]of [['pelvis','belly',56],['belly','chest',60],['chest','neck',31],['neck','head',64]]){const a=this.node(parent),b=this.node(child),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,x=a.x+dx/d*len,y=a.y+dy/d*len,sx=x-b.x,sy=y-b.y;for(const name of descendants[child]){const p=this.node(name);move(p,p.x+sx,p.y+sy);}}
  // Hip width belongs to the pelvis; chest and belly tissue may wobble within a bounded envelope.
  this.shapeTorso(.6-.57*this.settings.softness,true);
  for(const side of ['L','R'])for(const [aName,bName]of [[side+'shoulder',side+'elbow'],[side+'elbow',side+'hand']]){const a=this.node(aName),b=this.node(bName),l=this.links.find(l=>l.a===a&&l.b===b),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;move(b,a.x+dx/d*l.length,a.y+dy/d*l.length);}
 }
 step(dt=1/120){this.time+=dt;this.punchWindow=Math.max(0,this.punchWindow-dt);const {damping}=this.settings,dragging=this.holds.size>0,drag=Math.exp(-(1+damping*7)*dt),center=(this.node('Lfoot').x+this.node('Rfoot').x)/2;
  for(const n of this.nodes){const effort=this.effort(n.name),foot=n.name.endsWith('foot'),friction=foot?Math.exp(-this.traction(n.name[0])*dt):1,vx=clamp((n.x-n.px)*drag*friction,n.name==='head'&&this.punchWindow>0?-180:-8,n.name==='head'&&this.punchWindow>0?180:8),vy=clamp((n.y-n.py)*drag,n.name==='head'&&this.punchWindow>0?-108:-8,n.name==='head'&&this.punchWindow>0?108:8);n.px=n.x;n.py=n.y;const spring=effort**3*60*(dragging?.11:1),targetX=center+n.rx-450,targetY=n.ry;n.x+=vx+(targetX-n.x)*spring*dt*dt;n.y+=vy+((targetY-n.y)*spring+640*(1-effort*.99))*dt*dt;}
  this.relaxPose((1-Math.exp(-6*dt))*(dragging?.025:1));
  for(let i=0;i<12;i++){
   for(const l of this.links){if(!['bone','spine'].includes(l.kind))continue;const a=l.a,b=l.b,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,k=(d-l.length)/d*.35;a.x+=dx*k;a.y+=dy*k;b.x-=dx*k;b.y-=dy*k;}
   for(const h of this.holds.values()){h.node.x+=(h.x-h.node.x)*.12;h.node.y+=(h.y-h.node.y)*.12;}
   this.solveHeldHands();this.groundLegs();this.projectSkeleton();this.solveJoints();
   for(const n of this.nodes)if(!/(foot|ankle|knee)$/.test(n.name)){n.x=clamp(n.x,n.r,900-n.r);n.y=clamp(n.y,n.r,535-n.r);}
  }
  this.groundLegs();this.projectSkeleton();this.solveJoints();
 }
}
