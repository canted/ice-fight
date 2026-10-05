const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Dough {
 constructor(){this.settings={softness:.6,damping:.48,upright:.6};this.reset();}
 reset(){this.nodes=[];this.links=[];this.faces=[];this.joints=[];this.holds=new Map();this.time=0;
  const add=(name,x,y,r,fixed=false)=>{this.nodes.push({name,x,y,px:x,py:y,rx:x,ry:y,r,fixed});};
  add('head',450,191,50);add('neck',450,255,20);add('chest',450,286,35);add('belly',450,346,57);add('pelvis',450,402,34);
  for(const [s,k]of [['L',-1],['R',1]]){add(s+'shoulder',450+k*49,282,30);add(s+'waist',450+k*62,342,31);add(s+'hip',450+k*31,399,30);add(s+'elbow',450+k*82,324,24);add(s+'hand',450+k*89,367,28);add(s+'knee',450+k*35,451,22,true);add(s+'ankle',450+k*35,491,23,true);add(s+'foot',450+k*40,509,29,true);}
  const link=(a,b,kind='body')=>{const p=this.node(a),q=this.node(b);this.links.push({a:p,b:q,length:Math.hypot(p.x-q.x,p.y-q.y),kind});};
  link('head','neck','bone');link('neck','chest');link('chest','belly');link('belly','pelvis');
  for(const s of ['L','R']){link('chest',s+'shoulder');link('neck',s+'shoulder');link(s+'shoulder',s+'waist');link(s+'waist',s+'hip');link(s+'waist','belly');link(s+'shoulder','belly');link(s+'hip','pelvis');link(s+'hip','belly');link(s+'hip',s+'knee','bone');link(s+'shoulder',s+'elbow','bone');link(s+'elbow',s+'hand','bone');}
  const joint=(name,a,b,c,min,max,children,absolute=false)=>{const ns=[a,b,c].map(k=>typeof k==='string'?this.node(k):k),rest=this.angle(...ns);this.joints.push({name,a:ns[0],b:ns[1],c:ns[2],rest,min:absolute?min*Math.PI/180:rest+min*Math.PI/180,max:absolute?max*Math.PI/180:rest+max*Math.PI/180,children:children.map(k=>this.node(k))});};
  const upper=['belly','chest','neck','head','Lshoulder','Rshoulder','Lwaist','Rwaist','Lelbow','Relbow','Lhand','Rhand'];
  // A frontal mirrored stance: knees and elbows flex in opposite signed directions.
  joint('L knee','Lankle','Lknee','Lhip',-179,-35,['Lhip'],true);joint('R knee','Rankle','Rknee','Rhip',35,179,['Rhip'],true);
  this.kneeCenter={x:450,y:451};joint('pelvis / hips',this.kneeCenter,'pelvis','belly',-65,65,upper);
  joint('lower spine','pelvis','belly','chest',-38,38,upper.filter(k=>!['belly','Lwaist','Rwaist'].includes(k)));
  joint('upper spine','belly','chest','neck',-32,32,['neck','head']);
  joint('neck','chest','neck','head',-40,40,['head']);
  for(const side of ['L','R']){joint(side+' shoulder','chest',side+'shoulder',side+'elbow',-80,80,[side+'elbow',side+'hand']);joint(side+' elbow',side+'shoulder',side+'elbow',side+'hand',side==='L'?35:-178,side==='L'?178:-35,[side+'hand'],true);}
  link('Lshoulder','Rshoulder');link('Lwaist','Rwaist');link('Lhip','Rhip');
  for(const names of [['Lshoulder','Rshoulder','neck'],['Lshoulder','Rshoulder','belly'],['Lshoulder','Lwaist','belly'],['Rshoulder','Rwaist','belly'],['Lwaist','Lhip','belly'],['Rwaist','Rhip','belly'],['Lhip','Rhip','belly']]){const [a,b,c]=names.map(n=>this.node(n));this.faces.push({a,b,c,rest:(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)});}

 }
 angle(a,b,c){return Math.atan2((a.x-b.x)*(c.y-b.y)-(a.y-b.y)*(c.x-b.x),(a.x-b.x)*(c.x-b.x)+(a.y-b.y)*(c.y-b.y));}
 jointAngle(j){const t=this.angle(j.a,j.b,j.c);return j.rest+Math.atan2(Math.sin(t-j.rest),Math.cos(t-j.rest));}
 solveJoints(){for(const j of this.joints){const theta=this.jointAngle(j),error=theta-clamp(theta,j.min,j.max);if(Math.abs(error)<1e-8)continue;const co=Math.cos(-error),si=Math.sin(-error);for(const p of j.children){const x=p.x-j.b.x,y=p.y-j.b.y;p.x=j.b.x+x*co-y*si;p.y=j.b.y+x*si+y*co;}}}

 node(name){return this.nodes.find(n=>n.name===name);}
 grab(id,x,y){if(this.holds.has(id))return false;const candidates=this.nodes.filter(n=>!n.fixed&&![...this.holds.values()].some(h=>h.node===n)&&Math.hypot(x-n.x,y-n.y)<n.r+18);candidates.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));const node=candidates[0];if(!node)return false;this.holds.set(id,{node,x,y});return true;}
 move(id,x,y){const h=this.holds.get(id);if(h){h.x=clamp(x,30,870);h.y=clamp(y,40,515);}}
 release(id){this.holds.delete(id);}
 step(dt=1/120){this.time+=dt;const {softness,damping,upright}=this.settings,dragging=this.holds.size>0;const spring=(1+upright*21)*(dragging?.11:1),drag=Math.exp(-(1+damping*7)*dt);
  for(const n of this.nodes){if(n.fixed){n.x=n.px=n.rx;n.y=n.py=n.ry;continue;}const vx=clamp((n.x-n.px)*drag,-11,11),vy=clamp((n.y-n.py)*drag,-11,11);n.px=n.x;n.py=n.y;n.x+=vx+(n.rx-n.x)*spring*dt*dt;n.y+=vy+((n.ry-n.y)*spring+640*(1-upright*.96))*dt*dt;}
  for(let i=0;i<18;i++){
   for(const l of this.links){const a=l.a,b=l.b,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,wa=a.fixed?0:1,wb=b.fixed?0:1;if(!wa&&!wb)continue;const stiffness=l.kind==='bone'?.8:.14+(1-softness)*.42;const correction=(d-l.length)/d*stiffness/(wa+wb);a.x+=dx*correction*wa;a.y+=dy*correction*wa;b.x-=dx*correction*wb;b.y-=dy*correction*wb;}
   // A signed-area floor prevents the belly folding inside out under extreme drags.
   // It rotates freely with the body; it is not a world-upright lock.
   for(const f of this.faces){const {a,b,c,rest}=f,sign=Math.sign(rest),area=((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))*sign,error=area-Math.abs(rest)*.25;if(error>=0)continue;const gs=[[b.y-c.y,c.x-b.x],[c.y-a.y,a.x-c.x],[a.y-b.y,b.x-a.x]],ns=[a,b,c];const norm=gs.reduce((v,g,k)=>v+(ns[k].fixed?0:g[0]*g[0]+g[1]*g[1]),0)||1;for(let j=0;j<3;j++)if(!ns[j].fixed){ns[j].x-=error*gs[j][0]*sign/norm*.65;ns[j].y-=error*gs[j][1]*sign/norm*.65;}}
   for(const h of this.holds.values()){h.node.x+=(h.x-h.node.x)*.16;h.node.y+=(h.y-h.node.y)*.16;}
   this.solveJoints();
   for(const n of this.nodes)if(!n.fixed){n.x=clamp(n.x,n.r,900-n.r);n.y=clamp(n.y,n.r,535-n.r);}
  }
  // Finish at valid joint angles; pointer targets yield at anatomical limits.
  this.solveJoints();
 }
}
