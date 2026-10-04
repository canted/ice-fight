// Shapes are visual only. Server contacts/collisions retain radius 37 circles.
export const attackGlyphs = {
 lp:{shape:'hexagon',dots:1},mp:{shape:'hexagon',dots:2},hp:{shape:'hexagon',dots:3},
 lk:{shape:'square',dots:1},mk:{shape:'square',dots:2},hk:{shape:'square',dots:3},
};
export function puckPath(c,action){
 c.beginPath();const g=attackGlyphs[action];
 if(g?.shape==='hexagon'){for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a)*35,y=Math.sin(a)*35;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();}
 else if(g?.shape==='square')c.roundRect(-25,-25,50,50,4);
 else c.arc(0,0,35,0,7);
}
export function attackDots(c,action){const g=attackGlyphs[action];if(!g)return;c.fillStyle='#000000';for(let i=0;i<g.dots;i++){c.beginPath();c.arc((i-(g.dots-1)/2)*13,0,4.5,0,Math.PI*2);c.fill();}}
