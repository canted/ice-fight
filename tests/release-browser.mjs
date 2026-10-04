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
 await context.routeWebSocket('**',route=>{const server=route.connectToServer();let up=0,down=0,n=0;const later=(direction,fn)=>{const t=Date.now()+delay+(jitter?[0,35,-25,70,-10][n++%5]:0);const end=Math.max(t,direction==='up'?up:down);if(direction==='up')up=end;else down=end;setTimeout(fn,Math.max(0,end-Date.now()));};route.onMessage(raw=>later('up',()=>server.send(raw)));server.onMessage(raw=>later('down',()=>route.send(raw)));});
 await context.route('**/app.js',async route=>{let source=baseline?execFileSync('git',['show','ba896ad:public/app.js'],{encoding:'utf8'}):await readFile('public/app.js','utf8');source=source.replace('drawRink(ctx,renderPucks(),owner,barrierAmount);','const traced=renderPucks();window.releaseTrace?.push({at:performance.now(),tick:state?.tick,renderTick,pucks:traced.map(p=>({...p})),authority:state?.pucks});drawRink(ctx,traced,owner,barrierAmount);');await route.fulfill({body:source,contentType:'text/javascript'});});
 for(const kind of ['fast','hold-flick','stationary']){
  const room=await(await fetch(base+'/api/rooms',{method:'POST'})).json();const join=await(await fetch(base+`/api/rooms/${room.id}/claim?slot=0`,{method:'POST'})).json();
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.addInitScript(()=>window.releaseTrace=[]);await page.goto(base+join.player);await page.waitForFunction(()=>window.releaseTrace.some(f=>f.authority?.length));await sleep(350);
  const target=await page.evaluate(()=>window.releaseTrace.at(-1).pucks.find(p=>p.owner===0&&p.action==='left'));const box=await page.locator('canvas').boundingBox();const xy=(x,y)=>({x:box.x+x/900*box.width,y:box.y+y/420*box.height});let point=xy(target.x,target.y);await page.mouse.move(point.x,point.y);await page.mouse.down();await sleep(280);
  point=xy(300,220);await page.mouse.move(point.x,point.y,{steps:12});await sleep(kind==='hold-flick'?700:300);
  if(kind!=='stationary'){for(let i=1;i<=5;i++){point=xy(300+i*8,220);await page.mouse.move(point.x,point.y);await sleep(12);}}
  const releaseAt=await page.evaluate(()=>performance.now());await page.mouse.up();await sleep(1800);
  const frames=await page.evaluate(({id,t})=>window.releaseTrace.filter(f=>f.at>=t-30).map(f=>({ms:f.at-t,tick:f.tick,renderTick:f.renderTick,draw:f.pucks.find(p=>p.id===id),authority:f.authority?.find(p=>p.id===id)})),{id:target.id,t:releaseAt});
  const early=frames.filter(f=>f.ms>=0&&f.ms<350);let maxBack=0,freeze=0,maxFreeze=0;for(let i=1;i<early.length;i++){const dx=early[i].draw.x-early[i-1].draw.x;maxBack=Math.max(maxBack,-dx);freeze=Math.abs(dx)<.1?freeze+early[i].ms-early[i-1].ms:0;maxFreeze=Math.max(maxFreeze,freeze);}
  const firstMotion=early.find(f=>f.draw.x>early[0].draw.x+1)?.ms??null;const handoff=frames.filter(f=>f.ms>=0&&f.ms<1400);let maxBackwardThroughHandoffPx=0;for(let i=1;i<handoff.length;i++)maxBackwardThroughHandoffPx=Math.max(maxBackwardThroughHandoffPx,handoff[i-1].draw.x-handoff[i].draw.x);const result={kind,jitter,simulatedOneWayDelayMs:delay,maxBackwardThroughHandoffPx,maxBackwardPx:maxBack,maxFreezeMs:maxFreeze,firstMotionMs:firstMotion,frames};reports.push(result);
  assert.deepEqual(errors,[]);if(!baseline&&kind!=='stationary'){assert.ok(maxBackwardThroughHandoffPx<2,`handoff replay: ${maxBackwardThroughHandoffPx}px`);assert.ok(maxBack<2,`release replay: ${maxBack}px`);assert.ok(maxFreeze<50,`release freeze: ${maxFreeze}ms`);assert.ok(firstMotion<55,`late motion: ${firstMotion}ms`);}if(kind==='stationary')assert.ok(Math.abs(early.at(-1).draw.x-early[0].draw.x)<12,'stationary release stays still');await page.close();
 }
 await context.close();
}await writeFile(`test-results/release-${baseline?'before':'after'}${delay===100?'':'-'+delay}.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.map(({frames,...r})=>r),null,2));}finally{await browser.close();}
