import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutoScan } from '../src/autoScan.js';
import { AUTO_SCAN_TARGET_SET } from '../src/anchorTargets.js';
const flush = async () => { for(let i=0;i<10;i++) await Promise.resolve(); };
function harness(extra = {}) {
  let callbacks, stopped=0, index=0; const timers=new Map(), matches=[],conflicts=[];let n=0;
  const session=createAutoScan({ targets:[{id:'a',label:'Cover',eventId:'massacre'}],
    createOcr: c => {callbacks=c;return {start(){},stop(){stopped++;}};},
    createSearch: async()=>({detect:async()=>index,stop(){stopped++;}}),
    onMatch:r=>matches.push(r),onConflict:r=>conflicts.push(r),onNoMatch(){},onError(){},
    setTimer:(fn,ms)=>{timers.set(++n,{fn,ms});return n;},clearTimer:id=>timers.delete(id),...extra });
  return {session,matches,conflicts,get callbacks(){return callbacks;},get stopped(){return stopped;},
    async tick(ms){const t=[...timers].find(([,v])=>v.ms===ms);assert.ok(t,`timer ${ms}`);timers.delete(t[0]);await t[1].fn();await flush();}};
}
test('all six registered covers retain event and character mapping',()=>{
  assert.equal(AUTO_SCAN_TARGET_SET.images.length,6);
  assert.equal(new Set(AUTO_SCAN_TARGET_SET.images.map(t=>t.id)).size,6);
  for(const t of AUTO_SCAN_TARGET_SET.images)assert.equal(t.subjectId,t.eventId==='massacre'?'john-adams':'samuel-adams');
});
test('image match requires three observations; late OCR cannot replace it',async()=>{
 const h=harness();await h.session.start();await flush();assert.equal(h.matches.length,0);
 await h.tick(400);assert.equal(h.matches.length,0);await h.tick(400);
 assert.equal(h.matches[0].eventId,'massacre');assert.equal(h.matches[0].recognitionSource,'image');
 h.callbacks.onMatch({eventId:'stamp-act'});assert.equal(h.matches.length,1);assert.ok(h.stopped>=2);
});
test('pending text and conflicting stable image require explicit choice',async()=>{
 const h=harness();await h.session.start();await flush();h.callbacks.onMatch({eventId:'stamp-act'});
 await h.tick(400);await h.tick(400);assert.equal(h.matches.length,0);assert.equal(h.conflicts[0].length,2);
});
test('text result wins after bounded image check',async()=>{
 const h=harness();await h.session.start();h.callbacks.onMatch({eventId:'stamp-act'});await h.tick(1800);
 assert.equal(h.matches[0].eventId,'stamp-act');
});
test('text only does not allocate image resources',async()=>{
 const h=harness({imageEnabled:false,createSearch:()=>assert.fail('no image search')});await h.session.start();
 h.callbacks.onMatch({eventId:'congress'});assert.equal(h.matches[0].eventId,'congress');
});
test('stop drops outstanding image detections and OCR results',async()=>{
 let resolve;const h=harness({createSearch:async()=>({detect:()=>new Promise(r=>resolve=r),stop(){}})});
 await h.session.start();h.session.stop();resolve(0);await flush();h.callbacks.onMatch({eventId:'massacre'});assert.equal(h.matches.length,0);
});
test('OCR compute gate prevents overlapping image work',async()=>{
 let resolve;const h=harness({createSearch:async()=>({detect:()=>new Promise(r=>resolve=r),stop(){}})});
 await h.session.start();let ran=false;const task=h.callbacks.withCompute(async()=>{ran=true;});assert.equal(ran,false);
 resolve(null);await flush();await h.tick(40);await task;assert.equal(ran,true);h.session.stop();
});
