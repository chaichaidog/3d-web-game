import test from 'node:test';
import assert from 'node:assert/strict';
import {room,player,control,tick,snapshot,submitFeedback} from '../game.mjs';
import {waveSettings} from '../public/rules.js';

function classroom(){
  const r=room('123456'),a=player('甲'),b=player('乙');
  r.players.set(a.id,a);r.players.set(b.id,b);
  return {r,a,b};
}
const set=(r,autoWaves,waveLimit)=>control(r,'settings',undefined,{autoWaves,waveLimit});
const clear=r=>{r.enemies=[];tick(r,.05);};

test('auto mode waits a full intermission, pauses it, and finishes at the configured limit',()=>{
  const {r}=classroom();set(r,true,2);control(r,'next');clear(r);
  assert.equal(r.phase,'clear');assert.equal(snapshot(r).breakSeconds,waveSettings.breakSeconds);
  control(r,'pause');tick(r,30);assert.equal(r.phase,'paused');assert.equal(r.breakLeft,20);
  control(r,'pause');tick(r,19);assert.equal(r.wave,1);
  tick(r,1);assert.equal(r.wave,2);assert.equal(r.phase,'active');
  clear(r);assert.equal(r.phase,'finished');assert.equal(r.completed,true);
  tick(r,60);assert.equal(r.wave,2);assert.throws(()=>control(r,'next'),/已結束/);
});

test('manual mode respects the same cap and the teacher can close a lost round',()=>{
  const {r}=classroom();assert.throws(()=>set(r,false,21));assert.throws(()=>set(r,false,1.5));
  set(r,false,2);control(r,'next');clear(r);tick(r,30);assert.equal(r.wave,1);
  control(r,'next');r.phase='lost';control(r,'next');assert.equal(r.wave,2);
  r.phase='lost';control(r,'finish');assert.equal(r.phase,'finished');assert.equal(r.completed,false);
  assert.throws(()=>set(r,true,4));
});

test('feedback opens on finish, can be revised, and is visible only to its author and teacher',()=>{
  const {r,a,b}=classroom();
  assert.throws(()=>submitFeedback(r,a,{learning:'未結束'}));
  control(r,'finish');
  assert.throws(()=>submitFeedback(r,a,{learning:' '}));
  assert.throws(()=>submitFeedback(r,a,{learning:'字'.repeat(401)}));
  const submitted=submitFeedback(r,a,{learning:' 接上了 W ',suggestion:' 想多練習 '});
  assert.deepEqual(snapshot(r,a.id).players.find(p=>p.id===a.id).feedback,submitted);
  assert.equal(snapshot(r,b.id).players.find(p=>p.id===a.id).feedback,undefined);
  assert.deepEqual(snapshot(r,null,true).players.find(p=>p.id===a.id).feedback,{learning:'接上了 W',suggestion:'想多練習'});
  submitFeedback(r,a,{learning:'改成了 A',suggestion:''});
  assert.equal(snapshot(r,null,true).players.find(p=>p.id===a.id).feedback.learning,'改成了 A');
});
