import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getScanCharacter} from '../src/scanCharacters.js';
import {matchHistoricalEvent} from '../src/scanMatcher.js';
import {initialScanState,scanReducer} from '../src/scanState.js';
import {JOHN_ADAMS,JOHN_ADAMS_PROMPTS,JOHN_ADAMS_STORY} from '../src/johnAdamsData.js';

test('both supplied Boston Massacre titles select John; existing events retain Samuel',()=>{
  for(const text of ["BOSTON’S MASSACRE ERIC HINDERAKER", 'The Boston Massacre Hiller B. Zobel']){
    const match=matchHistoricalEvent(text);assert.equal(match?.eventId,'massacre');assert.equal(getScanCharacter(match.eventId).id,'john-adams');
  }
  for(const id of ['stamp-act','tea-party','congress',null])assert.equal(getScanCharacter(id).id,'samuel-adams');
});
test('browsing timeline preserves matched character; rescan resets it',()=>{
  let state=scanReducer(initialScanState,{type:'MATCH_EVENT',eventId:'massacre'});
  for(const type of ['OPEN_PROFILE','OPEN_DIALOGUE','OPEN_TIMELINE'])state=scanReducer(state,{type});
  state=scanReducer(state,{type:'SELECT_EVENT',eventId:'tea-party'});
  assert.equal(getScanCharacter(state.matchedEventId).id,'john-adams');
  state=scanReducer(state,{type:'RETRY_SCAN'});assert.equal(state.matchedEventId,null);
});
test('John narration scripts match transcripts and all five MP3 assets are present',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../src/assets/voice/john-adams-manifest.json',import.meta.url)));
  const scripts={introduction:JOHN_ADAMS.introduction,story:JOHN_ADAMS_STORY,...Object.fromEntries(JOHN_ADAMS_PROMPTS.map(p=>[p.id,p.answer]))};
  assert.equal(manifest.clips.length,5);
  for(const clip of manifest.clips){
    assert.equal(clip.script,scripts[clip.id]);assert.ok(clip.duration>5);
    const bytes=await readFile(new URL('../src/assets/voice/'+clip.file,import.meta.url));
    assert.equal(bytes[0],255);assert.equal(bytes[1]&224,224);assert.ok(bytes.length>10000);
  }
});
