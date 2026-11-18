import test from 'node:test';
import assert from 'node:assert/strict';
import {player,edit,cleanInput,home} from '../game.mjs';
import {PredictedMotion,inputMask} from '../public/motion.js';
import {blockHint,fieldHint} from '../public/lesson.js';
const walk={loop:true,rules:[{when:'w',do:'forward'}]};
const aim={loop:true,rules:[...walk.rules,{when:'mouse',do:'fire'}]};
test('camera moves on each render frame during a delayed round trip and does not jump when ACK arrives',()=>{
  const p=player('小葵'),local=new PredictedMotion();edit(p,walk,true);local.reconcile(p,walk,false);
  const mask=inputMask(['w']);let batch;
  for(let i=0;i<18;i++){
    const before=local.z;local.advance(walk,mask,0,1/60,100,12);
    assert.ok(Math.abs(local.z-before-.075)<1e-8);
    if(i===7)batch=local.pending.slice();
  }
  const before=local.z;cleanInput(p,{epoch:p.epoch,steps:batch});local.reconcile(p,walk,false);
  assert.ok(Math.abs(local.z-before)<1e-8);assert.equal(local.pending.length,10);
  const serverBefore=p.z;cleanInput(p,{epoch:p.epoch,steps:batch});assert.equal(p.z,serverBefore);
  local.advance(walk,0,0,1/60,100,12);assert.equal(local.z,before);
  home(p);cleanInput(p,{epoch:local.epoch,steps:local.pending});local.reconcile(p,walk,false);
  assert.equal(local.z,0);assert.equal(p.z,0);assert.equal(local.pending.length,0);
});
test('motion obeys empty programs, custom controls, pause, and the server time budget',()=>{
  const p=player('阿明'),local=new PredictedMotion();local.reconcile(p,p.code,false);
  local.advance(p.code,inputMask(['w']),0,.05,100,12);assert.equal(local.z,0);
  const custom={loop:true,rules:[{when:'q',do:'right'}]};edit(p,custom,true);local.reconcile(p,custom,false);
  for(let i=0;i<100;i++)local.advance(custom,inputMask(['q']),0,.05,100,12);
  cleanInput(p,{epoch:p.epoch,steps:local.pending});assert.ok(p.x>0&&p.x<4.6);assert.equal(p.z,0);
  const before=p.x;local.reconcile(p,custom,false);local.advance(custom,inputMask(['q']),0,.05,100,12);
  cleanInput(p,{epoch:p.epoch,steps:local.pending},true);local.reconcile(p,custom,true);assert.equal(local.x,before);
});
test('novice cues follow the actual blocks, field boundary and registered hit',()=>{
  const p=player('新生'),empty=p.code;
  assert.equal(fieldHint(empty,p,false).action,'edit');
  assert.equal(blockHint(empty,empty,false).target,'loop');
  assert.equal(blockHint({loop:true,rules:[]},empty,false).target,'if');
  assert.equal(blockHint({loop:true,rules:[{when:'',do:''}]},empty,false).target,'when');
  assert.equal(blockHint({loop:true,rules:[{when:'w',do:''}]},empty,false).target,'do');
  assert.equal(blockHint(walk,empty,false).target,'run');
  assert.equal(fieldHint(walk,p,false).title,'試走第一步');
  assert.equal(blockHint(walk,walk,true).target,'if');
  p.z=6;assert.equal(fieldHint(walk,p,true).action,'home');
  assert.equal(fieldHint(aim,p,true).title,'命中第一個練習靶');
  p.hits=1;assert.equal(fieldHint(aim,p,true).title,'打靶成功！');
});
