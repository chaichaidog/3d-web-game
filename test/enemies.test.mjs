import test from 'node:test';
import assert from 'node:assert/strict';
import {room,player,control,tick,practice,edit,cleanInput} from '../game.mjs';
import {enemies,waveOrder} from '../public/enemies.js';
import {character} from '../public/models.js';
import {meshVertices} from '../public/mesh.js';

function encounter(type){
  const r=room('123456'),p=player('驗收');r.players.set(p.id,p);
  const spec=enemies[type],enemy={id:'enemy',type,x:0,z:12,yaw:Math.PI,hit:0,attack:0,hp:spec.hp,max:spec.hp,armor:spec.armor||0,cool:1,speed:spec.speed,cue:null};
  r.phase='active';r.enemies=[enemy];p.z=6;
  return {r,p,enemy};
}

test('one featured enemy debuts per lesson wave and all models render finite geometry',()=>{
  const r=room('123456');
  const unlocked=new Set();
  for(const [i,type] of waveOrder.entries()){
    unlocked.add(type);r.phase='clear';control(r,'next');
    assert.equal(r.wave,i+1);
    assert.ok(r.enemies.some(enemy=>enemy.type===type));
    assert.ok(r.enemies.every(enemy=>unlocked.has(enemy.type)));
    const out=[];
    character(out,r.enemies.find(enemy=>enemy.type===type),{yaw:0,speed:1,phase:.6,time:0});
    assert.ok(out.length<=12);
    for(const part of out)assert.ok(meshVertices(part.kind).every(Number.isFinite));
  }
});

test('pulse telegraph is fixed and can be dodged even when timed from the same server tick',()=>{
  const {r,p,enemy}=encounter('mire');
  const teammate=player('隊友');teammate.z=6;r.players.set(teammate.id,teammate);
  tick(r,.05);
  assert.deepEqual(enemy.cue,{kind:'pulse',x:0,z:6,radius:2.7});
  p.x=4;
  for(let i=0;i<33;i++)tick(r,.05);
  assert.equal(p.hp,100);assert.equal(teammate.hp,91);assert.equal(enemy.cue,null);
});

test('charging enemy commits to its marked line, and a practice pulse never hurts',()=>{
  const {r,p,enemy}=encounter('runner');
  tick(r,.05);assert.equal(enemy.cue.kind,'charge');
  p.x=4;
  for(let i=0;i<25;i++)tick(r,.05);
  assert.ok(Math.abs(enemy.x)<.001);assert.ok(enemy.z<11);assert.equal(p.hp,100);
  r.phase='ready';r.enemies=[];p.x=0;p.hits=1;
  practice(r,p,'start','mire');
  for(let i=0;i<220;i++)tick(r,.05);
  assert.equal(p.hp,100);assert.ok(p.practice.attack>0);
});

test('armor absorbs damage before health and rally increases nearby movement',()=>{
  const {r,p,enemy}=encounter('brute');
  p.z=0;edit(p,{loop:true,rules:[{when:'mouse',do:'fire'}]},true);p.z=6;
  cleanInput(p,{keys:['mouse']});tick(r,.05);
  assert.equal(enemy.armor,10);assert.equal(enemy.hp,42);
  for(let i=0;i<7;i++)tick(r,.05);
  assert.equal(enemy.armor,0);assert.equal(enemy.hp,38);
  const solo=encounter('walker'),boosted=encounter('walker');
  boosted.r.enemies.push({...boosted.enemy,id:'drummer',type:'drummer',x:4});
  tick(solo.r,.05);tick(boosted.r,.05);
  assert.ok(boosted.enemy.z<solo.enemy.z);
});
