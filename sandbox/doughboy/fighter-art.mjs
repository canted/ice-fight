// Procedural interpretation of the red/right fighter in art/ice-fight-banner-cherry-v3.png.
// Every garment is attached to live rig points; no raster body parts or physics edits.
const ink='#171b20',red='#ed2929',darkRed='#ae171e',white='#fff9eb',skin='#ad6944';
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
export function drawFighter(c,n){
 const ellipse=(x,y,rx,ry,fill,line=4)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(line){c.strokeStyle=ink;c.lineWidth=line;c.stroke();}};
 const path=(points,fill,line=4)=>{c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();c.fillStyle=fill;c.fill();if(line){c.strokeStyle=ink;c.lineWidth=line;c.stroke();}};
 const tube=(a,b,width,color)=>{c.lineCap='round';for(const [fill,w]of [[ink,width+8],[color,width]]){c.strokeStyle=fill;c.lineWidth=w;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}};
 const band=(a,b,t,width,thickness,color=white)=>{const p=mix(a,b,t),angle=Math.atan2(b.y-a.y,b.x-a.x);c.save();c.translate(p.x,p.y);c.rotate(angle);c.fillStyle=color;c.fillRect(-thickness/2,-width/2,thickness,width);c.restore();};
 const round=(x,y,w,h,r,fill,line=4)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(line){c.strokeStyle=ink;c.lineWidth=line;c.stroke();}};
 // Fixed shins and skates; upper leg fabric overlaps both joints.
 for(const side of ['L','R']){const hip=n[side+'hip'],knee=n[side+'knee'],ankle=n[side+'ankle'],foot=n[side+'foot'];tube(knee,ankle,40,red);band(knee,ankle,.18,41,11);band(knee,ankle,.65,41,11);tube(hip,knee,52,darkRed);band(hip,knee,.58,53,13);band(hip,knee,.9,52,6,ink);
  c.save();c.translate(foot.x,foot.y);const sign=side==='L'?-1:1;c.scale(sign,1);path([[-29,16],[35,16],[42,25],[-33,25]],'#d7e5e5',3);path([[-20,14],[-16,24],[22,24],[27,15]],ink,0);c.strokeStyle=white;c.lineWidth=4;c.beginPath();c.moveTo(-31,28);c.lineTo(41,28);c.stroke();
  c.beginPath();c.moveTo(-28,12);c.quadraticCurveTo(-31,-6,-18,-28);c.lineTo(8,-30);c.lineTo(15,-12);c.quadraticCurveTo(39,-11,41,10);c.quadraticCurveTo(10,19,-28,12);c.fillStyle='#252a30';c.fill();c.strokeStyle=ink;c.lineWidth=5;c.stroke();c.strokeStyle='#777b7b';c.lineWidth=3;c.beginPath();c.moveTo(17,-8);c.quadraticCurveTo(31,-8,32,5);c.stroke();c.strokeStyle=white;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-15,-20+i*8);c.lineTo(8,-16+i*8);c.stroke();}c.restore();
 }
 for(const side of ['L','R']){const a=n[side+'shoulder'],b=n[side+'elbow'],h=n[side+'hand'];tube(a,b,55,red);tube(b,h,48,red);band(a,b,.45,55,16);band(b,h,.25,48,11);band(b,h,.6,48,7);}
 tube(n.chest,n.head,39,skin);
 // Smooth jersey perimeter is rebuilt from the deforming torso each frame.
 const ps=[n.Lshoulder,n.Lwaist,n.Lhip,{x:n.pelvis.x-16,y:n.pelvis.y+24},{x:n.pelvis.x+16,y:n.pelvis.y+24},n.Rhip,n.Rwaist,n.Rshoulder,{x:n.chest.x,y:n.chest.y-30}];
 function jerseyPath(){c.beginPath();c.moveTo((ps.at(-1).x+ps[0].x)/2,(ps.at(-1).y+ps[0].y)/2);for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];c.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);}c.closePath();}
 jerseyPath();c.fillStyle=red;c.fill();c.save();c.clip();
 const l=n.Lwaist,r=n.Rwaist,p=n.pelvis,b=n.belly;
 path([[l.x-25,l.y+6],[b.x,b.y+32],[r.x+25,r.y+6],[r.x+25,r.y+23],[b.x,b.y+49],[l.x-25,l.y+23]],white,0);
 path([[n.Lhip.x-22,n.Lhip.y+3],[p.x,p.y+14],[n.Rhip.x+22,n.Rhip.y+3],[n.Rhip.x+22,n.Rhip.y+30],[p.x,p.y+35],[n.Lhip.x-22,n.Lhip.y+30]],darkRed,0);
 const chest=n.chest,ls=n.Lshoulder,rs=n.Rshoulder;path([[ls.x,ls.y-22],[chest.x,chest.y+15],[rs.x,rs.y-22],[rs.x,rs.y-9],[chest.x,chest.y+29],[ls.x,ls.y-9]],white,0);
 c.strokeStyle=darkRed;c.lineWidth=3;c.beginPath();c.moveTo(l.x+15,l.y-18);c.quadraticCurveTo(l.x+20,l.y,l.x+34,l.y+3);c.moveTo(r.x-18,r.y+28);c.lineTo(r.x-34,r.y+36);c.stroke();c.restore();jerseyPath();c.strokeStyle=ink;c.lineWidth=5;c.stroke();
 // Bare clenched fists: exposed wrists bridge the sleeve to matching skin-toned hands.
 for(const side of ['L','R']){const h=n[side+'hand'],e=n[side+'elbow'];tube(mix(e,h,.65),h,30,skin);c.save();c.translate(h.x,h.y);c.rotate(Math.atan2(h.x-e.x,e.y-h.y));round(-26,-23,52,53,15,skin,4);c.fillStyle='#c9875d';c.beginPath();c.roundRect(-22,-19,42,21,10);c.fill();ellipse(side==='L'?21:-21,7,12,19,skin,3);c.strokeStyle=ink;c.lineWidth=2.3;for(const x of [-13,-2,9]){c.beginPath();c.moveTo(x,-14);c.lineTo(x,-3);c.stroke();}c.beginPath();c.moveTo(-17,13);c.quadraticCurveTo(-3,17,12,12);c.stroke();c.strokeStyle='#e1a67c';c.lineWidth=2;c.beginPath();c.moveTo(-16,-16);c.lineTo(-7,-17);c.stroke();c.restore();}
 const h=n.head,angle=Math.atan2(h.x-n.neck.x,n.neck.y-h.y);c.save();c.translate(h.x,h.y);c.rotate(angle);
 // A battered, asymmetric face, including the banner's closed eye and swollen cheek.
 ellipse(-50,1,12,20,skin);ellipse(49,1,12,20,skin);ellipse(0,5,55,59,skin,5);
 path([[-53,-7],[-59,17],[-48,9],[-53,31],[-39,19],[-42,-17]],'#4b291d',3);path([[49,-19],[61,8],[53,8],[60,28],[43,14]],'#4b291d',3);
 c.beginPath();c.moveTo(-31,25);c.bezierCurveTo(-23,11,0,20,18,29);c.lineTo(15,51);c.quadraticCurveTo(-13,39,-32,39);c.closePath();c.fillStyle=ink;c.fill();
 path([[-25,25],[-14,22],[-6,27],[0,23],[10,29],[9,38],[-2,33],[-7,37],[-18,30],[-24,32]],white,1.5);
 ellipse(-14,45,18,12,skin,3);
 ellipse(23,-6,17,22,white,4);ellipse(16,-7,7,11,ink,0);ellipse(14,-12,2.5,3,white,0);
 c.strokeStyle=ink;c.lineWidth=5;c.beginPath();c.moveTo(-37,-4);c.quadraticCurveTo(-23,-17,-12,-3);c.stroke();c.lineWidth=3;c.beginPath();c.moveTo(-33,0);c.quadraticCurveTo(-22,7,-12,-1);c.stroke();
 path([[-40,-22],[-32,-35],[-18,-34],[-9,-22],[-25,-26]],ink,0);path([[8,-30],[19,-40],[35,-34],[43,-20],[26,-28]],ink,0);
 ellipse(-3,8,13,14,'#d07b54',3);ellipse(-7,3,4,3,'#efb185',0);
 ellipse(38,34,32,33,'#c9654d',4);ellipse(45,28,24,25,'#d76f56',0);c.strokeStyle='#f6b599';c.lineWidth=4;c.beginPath();c.arc(40,28,20,3.5,4.7);c.stroke();c.strokeStyle='#eaa087';c.lineWidth=1.3;for(let i=0;i<7;i++){c.beginPath();c.moveTo(29+i*4,16+(i%3)*4);c.lineTo(31+i*4,21+(i%3)*4);c.stroke();}
 c.strokeStyle='#dd9772';c.lineWidth=2;c.beginPath();c.moveTo(-42,10);c.lineTo(-32,7);c.moveTo(-41,15);c.lineTo(-29,12);c.stroke();
 // Broad red helmet, white crown stripe, vents, ear protection and tousled hair.
 path([[-47,-32],[-28,-42],[-12,-31],[-6,-42],[5,-29],[15,-39],[39,-25],[49,-39],[0,-57],[-49,-46]],'#3d241a',3);
 c.beginPath();c.moveTo(-64,-12);c.quadraticCurveTo(-75,-58,-43,-74);c.quadraticCurveTo(9,-96,52,-66);c.quadraticCurveTo(70,-49,64,-8);c.lineTo(48,14);c.lineTo(40,1);c.lineTo(47,-18);c.quadraticCurveTo(0,-45,-48,-23);c.lineTo(-48,-7);c.closePath();c.fillStyle=red;c.fill();c.strokeStyle=ink;c.lineWidth=5;c.stroke();
 c.save();c.clip();path([[-34,-89],[-20,-91],[31,-22],[18,-24]],white,2);c.restore();
 c.strokeStyle='#ff8177';c.lineWidth=3;c.beginPath();c.moveTo(-59,-34);c.quadraticCurveTo(-63,-61,-37,-68);c.stroke();
 for(const [x,y,rot]of [[-49,-48,-.3],[3,-60,.15],[37,-41,.5]]){c.save();c.translate(x,y);c.rotate(rot);c.fillStyle=ink;c.fillRect(-7,-5,14,10);c.restore();}
 c.strokeStyle=darkRed;c.lineWidth=3;c.beginPath();c.moveTo(18,-75);c.quadraticCurveTo(47,-58,52,-28);c.stroke();c.restore();
}
