// Shapes are visual only. Server contacts/collisions retain radius 37 circles.
export const attackGlyphs = {
 lp:{shape:'hexagon',dots:1},mp:{shape:'hexagon',dots:2},hp:{shape:'hexagon',dots:3},
 lk:{shape:'square',dots:1},mk:{shape:'square',dots:2},hk:{shape:'square',dots:3},
};
export function puckPath(c,action){
 c.beginPath();const g=attackGlyphs[action];
 if(g?.shape==='hexagon'){for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*38.5,y=Math.sin(a)*38.5;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();}
 else if(g?.shape==='square')c.roundRect(-30,-30,60,60,4.8);
 else c.arc(0,0,35,0,7);
}
export const DOT_RADIUS=4.5*1.8;
export function dotPositions(action){const n=attackGlyphs[action]?.dots;if(n===1)return [[0,0]];if(n===2)return [[0,-11.5],[0,11.5]];if(n===3){const h=12*Math.sqrt(3);return [[0,-h/2],[-12,h/2],[12,h/2]];}return [];}
export function attackDots(c,action){c.fillStyle=c.strokeStyle;for(const [x,y]of dotPositions(action)){c.beginPath();c.arc(x,y,DOT_RADIUS,0,Math.PI*2);c.fill();}}
export function directionalArrow(c,action){const angle={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[action];if(angle===undefined)return;c.save();c.rotate(angle);c.beginPath();c.moveTo(-16,-4);c.lineTo(1,-4);c.lineTo(1,-15);c.lineTo(16,0);c.lineTo(1,15);c.lineTo(1,4);c.lineTo(-16,4);c.closePath();c.fill();c.restore();}
export function puckBorder(p){return p.acceptedFlash?(p.origin===0?'#ff887a':'#78d9bb'):(p.localHeld||p.grabbed)?'#ffffff':p.epoch?'#fff6a4':'#234753';}
