import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const data=async(p,type='image/png')=>`data:${type};base64,${(await readFile(p)).toString('base64')}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();
 const result=await page.evaluate(async({original,plate,font})=>{
  const load=async(src)=>{const im=new Image();im.src=src;await im.decode();return im;};
  const face=new FontFace('Cherry Bomb One',`url(${font})`);await face.load();document.fonts.add(face);
  const [im,bg]=await Promise.all([load(original),load(plate)]);
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
  // Localized clean plate; all fighter bodies/faces and rink pixels stay original.
  x.drawImage(bg,0,0,bg.width,360,0,0,c.width,360);
  // Restore the original portions of fighters that extend above y=360.
  const crowns=[[[349,359],[374,331],[400,317],[436,308],[468,314],[506,304],[537,303],[557,319],[580,350],[600,360]],[[724,360],[755,331],[790,313],[820,309],[851,315],[885,334],[916,357]],[[1110,360],[1143,330],[1180,312],[1220,310],[1270,304],[1310,320],[1338,350],[1350,360]]];
  for(const poly of crowns){x.save();x.beginPath();poly.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.clip();x.drawImage(im,0,0);x.restore();}
  const text='ICE FIGHT';let size=300;x.font=`${size}px "Cherry Bomb One"`;let m=x.measureText(text);size*=Math.min(1360/m.width,218/(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent));x.font=`${size}px "Cherry Bomb One"`;m=x.measureText(text);
  const tx=(c.width-m.width)/2,ty=38+m.actualBoundingBoxAscent;
  x.lineJoin='round';x.strokeStyle='#080e22';x.lineWidth=15;
  for(let d=23;d>=0;d--){x.fillStyle=d>15?'#ffdf50':d>7?'#ff3026':'#086ff0';if(d===23)x.strokeText(text,tx+d*.30,ty+d);x.fillText(text,tx+d*.30,ty+d);}
  const gradient=x.createLinearGradient(0,38,0,260);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.46,'#f3fdff');gradient.addColorStop(.49,'#afe4ff');gradient.addColorStop(1,'#5ec4fa');x.fillStyle=gradient;x.lineWidth=8;x.strokeText(text,tx,ty);x.fillText(text,tx,ty);
  const web=document.createElement('canvas');web.width=1200;web.height=630;web.getContext('2d').drawImage(c,0,0,1200,630);
  return {full:c.toDataURL(),web:web.toDataURL(),fontStatus:face.status,size,width:m.width,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent};
 },{original:await data(root+'/art/ice-fight-banner-medium-brown-v2.png'),plate:await data(root+'/art/ice-fight-clean-title-plate-v3.png'),font:await data(root+'/public/fonts/CherryBombOne-Latin-v11.ttf','font/ttf')});
 for(const [key,path] of [['full','art/ice-fight-banner-cherry-v3.png'],['web','public/share-v3.png']])await writeFile(root+'/'+path,Buffer.from(result[key].split(',')[1],'base64'));
 console.log({fontStatus:result.fontStatus,size:result.size,width:result.width,height:result.height});
}finally{await browser.close();}
