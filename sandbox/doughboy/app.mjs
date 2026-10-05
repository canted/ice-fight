import {Dough} from './physics.mjs';
import {drawFighter} from './fighter-art.mjs';
const model=new Dough(),canvas=document.querySelector('canvas'),c=canvas.getContext('2d');let transform={s:1,x:0,y:0},last=performance.now(),acc=0,skeleton=false;
const edge='#171b20';
function cancel(){model.holds.clear();document.querySelector('#status').textContent='Grab and drag';}
function reset(){cancel();model.reset();acc=0;}
for(const key of ['softness','damping','iceFriction','feetEffort','headEffort'])document.querySelector('#'+key).oninput=e=>{model.settings[key]=Number(e.target.value);document.querySelector('#'+key+'-value').value=Math.round(model.settings[key]*100)+'%';};
document.querySelector('#reset').onclick=reset;document.querySelector('#skeleton').onchange=e=>skeleton=e.target.checked;for(const strength of ['light','medium','strong'])document.querySelector('#punch-'+strength).onclick=()=>model.punch(strength);
function position(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left-transform.x)/transform.s,y:(e.clientY-r.top-transform.y)/transform.s};}
canvas.onpointerdown=e=>{const p=position(e);if(model.grab(e.pointerId,p.x,p.y)){e.preventDefault();canvas.setPointerCapture(e.pointerId);document.querySelector('#status').textContent='Go on. Give him a stretch.';}};
canvas.onpointermove=e=>{if(!model.holds.has(e.pointerId))return;e.preventDefault();const p=position(e);model.move(e.pointerId,p.x,p.y);};
for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{model.release(e.pointerId);if(!model.holds.size)document.querySelector('#status').textContent='Grab and drag';});
addEventListener('blur',cancel);document.addEventListener('visibilitychange',()=>{cancel();last=performance.now();acc=0;});addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName))reset();});
function resize(){cancel();const r=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);transform={s:Math.min(r.width/(r.width<600?630:760),r.height/610),x:0,y:0};transform.x=r.width/2-450*transform.s;transform.y=r.height-560*transform.s;}
new ResizeObserver(resize).observe(canvas);
function ellipse(x,y,rx,ry,fill,stroke=true){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=edge;c.lineWidth=3;c.stroke();}}
function draw(){const r=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);c.translate(transform.x,transform.y);c.scale(transform.s,transform.s);
 c.fillStyle='#bdd7d1';c.beginPath();c.ellipse(450,531,174,20,0,0,Math.PI*2);c.fill();c.strokeStyle='#88b0a9';c.lineWidth=2;c.beginPath();c.moveTo(235,535);c.lineTo(665,535);c.stroke();
 const n=Object.fromEntries(model.nodes.map(p=>[p.name,p]));drawFighter(c,n);
 if(skeleton){c.strokeStyle='#e5aa33';c.lineWidth=2;for(const j of model.joints){const parent=Math.atan2(j.a.y-j.b.y,j.a.x-j.b.x);c.beginPath();c.arc(j.b.x,j.b.y,18,parent+j.min,parent+j.max);c.stroke();}c.lineWidth=1.5;c.strokeStyle='#4b918d';for(const l of model.links){c.beginPath();c.moveTo(l.a.x,l.a.y);c.lineTo(l.b.x,l.b.y);c.stroke();}for(const p of model.nodes)ellipse(p.x,p.y,p.fixed?5:3,p.fixed?5:3,p.fixed?'#db6248':'#386b69',false);}
 for(const h of model.holds.values()){c.setLineDash([4,5]);c.strokeStyle='#bd6446';c.lineWidth=2;c.beginPath();c.moveTo(h.node.x,h.node.y);c.lineTo(h.x,h.y);c.stroke();c.setLineDash([]);ellipse(h.x,h.y,7,7,'#f9da77');}
}
function frame(now){const dt=Math.min(.06,(now-last)/1000);last=now;if(!document.hidden){acc+=dt;while(acc>=1/120){model.step();acc-=1/120;}}draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
// Read-only diagnostics make fixed anchors and stability observable without changing the model.
window.doughboy={get snapshot(){return {nodes:model.nodes.map(n=>({...n})),holds:model.holds.size,joints:model.joints.map(j=>({name:j.name,angle:model.jointAngle(j),min:j.min,max:j.max,rest:j.rest})),settings:{...model.settings},transform:{...transform}}}};
