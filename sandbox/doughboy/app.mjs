import {Dough} from './physics.mjs';
const model=new Dough(),canvas=document.querySelector('canvas'),c=canvas.getContext('2d');let transform={s:1,x:0,y:0},last=performance.now(),acc=0,skeleton=false;
const cream='#fff0c8',edge='#83513c',shade='#e3b88b';
function cancel(){model.holds.clear();document.querySelector('#status').textContent='Feet & shins planted';}
function reset(){cancel();model.reset();acc=0;}
for(const key of ['softness','damping','upright'])document.querySelector('#'+key).oninput=e=>{model.settings[key]=Number(e.target.value);document.querySelector('#'+key+'-value').value=Math.round(model.settings[key]*100)+'%';};
document.querySelector('#reset').onclick=reset;document.querySelector('#skeleton').onchange=e=>skeleton=e.target.checked;document.querySelector('#nudge').onclick=()=>{const head=model.node('head');head.px-=35;model.node('belly').px-=15;};
function position(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left-transform.x)/transform.s,y:(e.clientY-r.top-transform.y)/transform.s};}
canvas.onpointerdown=e=>{const p=position(e);if(model.grab(e.pointerId,p.x,p.y)){e.preventDefault();canvas.setPointerCapture(e.pointerId);document.querySelector('#status').textContent='Go on. Give him a stretch.';}};
canvas.onpointermove=e=>{if(!model.holds.has(e.pointerId))return;e.preventDefault();const p=position(e);model.move(e.pointerId,p.x,p.y);};
for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{model.release(e.pointerId);if(!model.holds.size)document.querySelector('#status').textContent='Feet & shins planted';});
addEventListener('blur',cancel);document.addEventListener('visibilitychange',()=>{cancel();last=performance.now();acc=0;});addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName))reset();});
function resize(){cancel();const r=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);transform={s:Math.min(r.width/(r.width<600?630:760),r.height/610),x:0,y:0};transform.x=r.width/2-450*transform.s;transform.y=r.height-560*transform.s;}
new ResizeObserver(resize).observe(canvas);
function ellipse(x,y,rx,ry,fill,stroke=true){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=edge;c.lineWidth=3;c.stroke();}}
function limb(names,width){const ps=names.map(n=>model.node(n));for(const [color,w]of [[edge,width+6],[cream,width]]){c.strokeStyle=color;c.lineWidth=w;c.lineJoin=c.lineCap='round';c.beginPath();c.moveTo(ps[0].x,ps[0].y);for(const p of ps.slice(1))c.lineTo(p.x,p.y);c.stroke();}}
function blob(names){const ps=names.map(n=>typeof n==='string'?model.node(n):n);c.beginPath();c.moveTo((ps.at(-1).x+ps[0].x)/2,(ps.at(-1).y+ps[0].y)/2);for(let i=0;i<ps.length;i++){const p=ps[i],q=ps[(i+1)%ps.length];c.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}c.closePath();c.fillStyle=cream;c.fill();c.lineWidth=3;c.strokeStyle=edge;c.stroke();}
function draw(){const r=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);c.translate(transform.x,transform.y);c.scale(transform.s,transform.s);
 c.fillStyle='#bdd7d1';c.beginPath();c.ellipse(450,531,174,20,0,0,Math.PI*2);c.fill();c.strokeStyle='#88b0a9';c.lineWidth=2;c.beginPath();c.moveTo(235,535);c.lineTo(665,535);c.stroke();
 for(const side of ['L','R']){limb([side+'hip',side+'knee',side+'ankle'],43);const foot=model.node(side+'foot');ellipse(foot.x,foot.y,37,23,cream);c.strokeStyle='#608e86';c.lineWidth=3;c.beginPath();c.moveTo(foot.x-36,534);c.lineTo(foot.x+36,534);c.stroke();}
 for(const side of ['L','R']){limb([side+'shoulder',side+'elbow',side+'hand'],43);const p=model.node(side+'hand');ellipse(p.x,p.y,28,29,cream);}
 limb(['chest','neck','head'],41);
 const n=Object.fromEntries(model.nodes.map(p=>[p.name,p]));blob(['Lshoulder','Lwaist','Lhip',{x:n.pelvis.x,y:n.pelvis.y+33},'Rhip','Rwaist','Rshoulder',{x:n.chest.x,y:n.chest.y-26}]);
 // Belly crease and button follow the deforming central mass.
 c.strokeStyle=shade;c.lineWidth=3;c.beginPath();c.arc(n.belly.x,n.belly.y+10,27,.35,Math.PI-.35);c.stroke();ellipse(n.belly.x,n.belly.y+2,3,4,edge,false);
 const h=n.head,neck=n.neck,angle=Math.atan2(h.x-neck.x,neck.y-h.y);c.save();c.translate(h.x,h.y);c.rotate(angle);ellipse(0,0,51,53,cream);ellipse(-30,17,10,6,'#f0ae91',false);ellipse(30,17,10,6,'#f0ae91',false);
 c.fillStyle='#453e37';for(const x of [-17,17])ellipse(x,-2,4.5,6,'#453e37',false);c.strokeStyle=edge;c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(-8,22);c.quadraticCurveTo(0,27,8,22);c.stroke();c.beginPath();c.moveTo(-24,-14);c.lineTo(-12,-17);c.moveTo(12,-17);c.lineTo(24,-14);c.stroke();c.restore();
 if(skeleton){c.lineWidth=1.5;c.strokeStyle='#4b918d';for(const l of model.links){c.beginPath();c.moveTo(l.a.x,l.a.y);c.lineTo(l.b.x,l.b.y);c.stroke();}for(const p of model.nodes)ellipse(p.x,p.y,p.fixed?5:3,p.fixed?5:3,p.fixed?'#db6248':'#386b69',false);}
 for(const h of model.holds.values()){c.setLineDash([4,5]);c.strokeStyle='#bd6446';c.lineWidth=2;c.beginPath();c.moveTo(h.node.x,h.node.y);c.lineTo(h.x,h.y);c.stroke();c.setLineDash([]);ellipse(h.x,h.y,7,7,'#f9da77');}
}
function frame(now){const dt=Math.min(.06,(now-last)/1000);last=now;if(!document.hidden){acc+=dt;while(acc>=1/120){model.step();acc-=1/120;}}draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
// Read-only diagnostics make fixed anchors and stability observable without changing the model.
window.doughboy={get snapshot(){return {nodes:model.nodes.map(n=>({...n})),holds:model.holds.size,settings:{...model.settings},transform:{...transform}}}};
