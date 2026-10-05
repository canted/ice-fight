import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://localhost:3001',baseline=process.env.BASELINE==='1',delay=Number(process.env.DELAY||100);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const reports=[];
try {for(const jitter of [false,true]){
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true});
 // WebSocket/TCP delivers in order, even under packet jitter. Delay each direction independently, preserving that order.
 await context.routeWebSocket('**',route=>{const server=route.connectToServer();let up=0,down=0,n=0,uq=Promise.resolve(),dq=Promise.resolve();const later=(direction,fn)=>{const t=Date.now()+delay+(jitter?[0,35,-25,70,-10][n++%5]:0);const end=Math.max(t,direction==='up'?up:down);if(direction==='up')up=end;else down=end;const task=async()=>{await sleep(Math.max(0,end-Date.now()));fn();};if(direction==='up')uq=uq.then(task);else dq=dq.then(task);};route.onMessage(raw=>later('up',()=>server.send(raw)));server.onMessage(raw=>later('down',()=>route.send(raw)));});
 await context.route('**/app.js',async route=>{let source=baseline?execFileSync('git',['show','3f5c726:public/app.js'],{encoding:'utf8'}):await readFile('public/app.js','utf8');source=source.replace('drawRink(ctx,renderPucks(),owner,barrierAmount);','const traced=renderPucks();window.releaseTrace?.push({at:performance.now(),tick:state?.tick,renderTick,pucks:traced.map(p=>({...p})),authority:state?.pucks,localTick:typeof rink==="undefined"?null:rink.tick});drawRink(ctx,traced,owner,barrierAmount);');await route.fulfill({body:source,contentType:'text/javascript'});});
 for(const kind of ['slow','fast','wall','collision']){
  const room=await(await fetch(base+'/api/rooms',{method:'POST'})).json();const join=await(await fetch(base+`/api/rooms/${room.id}/claim?slot=0`,{method:'POST'})).json();
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.addInitScript(()=>window.releaseTrace=[]);await page.goto(base+join.player);await page.waitForFunction(()=>window.releaseTrace.some(f=>f.authority?.length));await sleep(350);
  const target=await page.evaluate(()=>window.releaseTrace.at(-1).pucks.find(p=>p.owner===0&&p.action==='left'));const box=await page.locator('canvas').boundingBox();const xy=(x,y)=>({x:box.x+x/900*box.width,y:box.y+y/420*box.height});let point=xy(target.x,target.y);await page.mouse.move(point.x,point.y);await page.mouse.down();await sleep(280);
  const startX=kind==='wall'?650:230,y=kind==='collision'?310:220;point=xy(startX,y);await page.mouse.move(point.x,point.y,{steps:12});await sleep(kind==='hold-flick'?700:300);
  if(kind!=='stationary'){for(let i=1;i<=5;i++){point=xy(startX+i*(kind==='slow'?5:25),y);await page.mouse.move(point.x,point.y);await sleep(12);}}
  const releaseAt=await page.evaluate(()=>performance.now());await page.mouse.up();await sleep(3400);
  const frames=await page.evaluate(({id,t})=>window.releaseTrace.filter(f=>f.at>=t-30).map(f=>({ms:f.at-t,tick:f.tick,renderTick:f.renderTick,localTick:f.localTick,draw:f.pucks.find(p=>p.id===id),authority:f.authority?.find(p=>p.id===id)})),{id:target.id,t:releaseAt});
  const early=frames.filter(f=>f.ms>=0&&f.ms<350);let maxBack=0,freeze=0,maxFreeze=0;for(let i=1;i<early.length;i++){const dx=early[i].draw.x-early[i-1].draw.x;maxBack=Math.max(maxBack,-dx);freeze=Math.abs(dx)<.1?freeze+early[i].ms-early[i-1].ms:0;maxFreeze=Math.max(maxFreeze,freeze);}
  const firstMotion=early.find(f=>f.draw.x>early[0].draw.x+1)?.ms??null;const handoff=frames.filter(f=>f.ms>=0&&f.ms<1400);let maxBackwardThroughHandoffPx=0;for(let i=1;i<handoff.length;i++)maxBackwardThroughHandoffPx=Math.max(maxBackwardThroughHandoffPx,handoff[i-1].draw.x-handoff[i].draw.x);const speedWindows=[[200,700],[800,1300],[1500,2500]].map(([lo,hi])=>{const ratios=[];for(let i=1;i<frames.length;i++){const a=frames[i-1],b=frames[i],p=a.draw,q=b.draw,dt=(b.ms-a.ms)/1000;if(b.ms<lo||b.ms>hi||dt<=0||p.vx<=20||q.vx<=20||Math.abs(p.vy)>=1||Math.abs(q.vy)>=1||Math.abs(q.vx/p.vx-Math.exp(-.32*dt))>=.015)continue;ratios.push((q.x-p.x)/dt/((p.vx+q.vx)/2));}return {fromMs:lo,toMs:hi,samples:ratios.length,renderedToPhysicsSpeed:ratios.length?ratios.reduce((a,b)=>a+b,0)/ratios.length:null};});if(!baseline&&kind==='slow')for(const w of speedWindows)assert.ok(w.samples>5&&Math.abs(w.renderedToPhysicsSpeed-1)<.08,'no timed speed handoff');const result={speedWindows,kind,jitter,simulatedOneWayDelayMs:delay,maxBackwardThroughHandoffPx,maxBackwardPx:maxBack,maxFreezeMs:maxFreeze,firstMotionMs:firstMotion,frames};reports.push(result);
  assert.deepEqual(errors,[]);assert.ok(frames.at(-1).ms>=3300);await page.close();
 }
 await context.close();
}await writeFile(`test-results/owner-trajectories-${baseline?'before':'after'}${delay===100?'':'-'+delay}.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.map(({frames,...r})=>r),null,2));}finally{await browser.close();}
