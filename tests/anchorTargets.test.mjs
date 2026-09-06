import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CompilerBase} from 'mind-ar/src/image-target/compiler-base.js';
import {PNG} from 'pngjs';
import {ANCHOR_TARGET_SETS,getAnchorTargetSet,createTargetRouter} from '../src/anchorTargets.js';
import {createMindArTracker} from '../src/imageAnchorTracker.js';
const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,-5,1];

test('event bundles contain the correct ordered images and link to the correct character',async()=>{
  assert.equal(getAnchorTargetSet('congress'),null);assert.equal(getAnchorTargetSet('toString'),null);
  for(const set of Object.values(ANCHOR_TARGET_SETS)){
    assert.equal(set.subjectId,set.eventId === 'massacre' ? 'john-adams' : 'samuel-adams');assert.equal(set.images.length,2);
    const data=new CompilerBase().importData(await readFile(new URL('../src/assets/tracking/'+set.compiledFile,import.meta.url)));
    assert.equal(data.length,2);
    for(const [i,image] of set.images.entries()){
      const png=PNG.sync.read(await readFile(new URL('../src/assets/tracking/'+image.file,import.meta.url)));
      assert.equal(data[i].targetImage.width,png.width);assert.equal(data[i].targetImage.height,png.height);
      assert.ok(data[i].matchingData.length>0);assert.ok(data[i].trackingData.length>0);
    }
  }
});

test('router accepts either target, ignores stale loss, and switches only after active target loss',()=>{
  const seen=[];const dimensions=[[683,1024],[794,1000]];
  const route=createTargetRouter(dimensions,(m,info)=>seen.push({m,...info}));
  route({type:'updateMatrix',targetIndex:1,worldMatrix:matrix});
  route({type:'updateMatrix',targetIndex:0,worldMatrix:null});
  route({type:'updateMatrix',targetIndex:0,worldMatrix:matrix});
  assert.equal(seen.length,1);assert.deepEqual(seen[0].dimensions,dimensions[1]);
  route({type:'updateMatrix',targetIndex:1,worldMatrix:null});
  route({type:'updateMatrix',targetIndex:0,worldMatrix:matrix});
  assert.deepEqual(seen.map(x=>x.targetIndex),[1,1,0]);
  route({type:'updateMatrix',targetIndex:9,worldMatrix:matrix});
  route({type:'updateMatrix',targetIndex:0,worldMatrix:[NaN]});
  assert.equal(seen.length,3);
});

function fakeController(){
  const state={disposed:0,started:0};
  class Controller{
    constructor(options){state.options=options;}
    addImageTargetsFromBuffer(){return {dimensions:[[683,1024],[794,1000]]};}
    dummyRun(){} getProjectionMatrix(){return matrix;}
    processVideo(){state.started++;} dispose(){state.disposed++;}
  }
  return {state,loadController:async()=>Controller};
}
const videoElement={videoWidth:640,videoHeight:480};
const fetchTarget=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});
test('tracker loads only selected event, tracks one target, and ignores results after stop',async()=>{
  const fake=fakeController();let results=0,requested;
  const tracker=await createMindArTracker({videoElement,targetUrl:'/stamp-act-targets.mind',targetCount:2,onMatrix:()=>results++,loadController:fake.loadController,fetchTarget:async url=>{requested=url;return fetchTarget();}});
  assert.equal(requested,'/stamp-act-targets.mind');assert.equal(fake.state.options.maxTrack,1);
  fake.state.options.onUpdate({type:'updateMatrix',targetIndex:1,worldMatrix:matrix});assert.equal(results,1);
  tracker.stop();tracker.stop();assert.equal(fake.state.disposed,1);
  fake.state.options.onUpdate({type:'updateMatrix',targetIndex:1,worldMatrix:matrix});assert.equal(results,1);
});
test('cancellation during download never allocates a tracking worker',async()=>{
  const fake=fakeController(),abort=new AbortController();let release;
  const pending=createMindArTracker({videoElement,targetUrl:'/target',targetCount:2,signal:abort.signal,onMatrix:()=>{},loadController:fake.loadController,fetchTarget:()=>new Promise(r=>{release=r;})});
  abort.abort();release(await fetchTarget());await assert.rejects(pending,{name:'AbortError'});
  assert.equal(fake.state.started,0);assert.equal(fake.state.options,undefined);
});
test('bad downloads and wrong target counts fail safely',async()=>{
  await assert.rejects(createMindArTracker({videoElement,targetUrl:'/missing',targetCount:2,onMatrix:()=>{},fetchTarget:async()=>({ok:false})}),/could not be loaded/);
  const fake=fakeController();await assert.rejects(createMindArTracker({videoElement,targetUrl:'/target',targetCount:3,onMatrix:()=>{},fetchTarget,loadController:fake.loadController}),/out of date/);
  assert.equal(fake.state.disposed,1);assert.equal(fake.state.started,0);
});
