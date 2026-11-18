import test from 'node:test';
import assert from 'node:assert/strict';
import {room,player,edit,cleanInput,tick,buy,control,snapshot} from '../game.mjs';
const firing={loop:true,rules:[{when:'mouse',do:'fire'}]};
const forward={loop:true,rules:[{when:'w',do:'forward'}]};
function classroom(){const r=room('123456'),a=player('學生甲'),b=player('學生乙');r.players.set(a.id,a);r.players.set(b.id,b);return {r,a,b};}
test('personal blocks control only their owner; the safe zone blocks firing and field editing',()=>{
  const {r,a,b}=classroom();edit(a,{loop:true,rules:[...firing.rules,...forward.rules]},true);
  cleanInput(a,{keys:['mouse','w']});cleanInput(b,{keys:['mouse','w']});
  for(let i=0;i<18;i++)tick(r,.05);
  assert.equal(a.ammo,12);assert.ok(a.z>3);assert.equal(b.z,0);
  for(let i=0;i<10;i++)tick(r,.05);
  assert.ok(a.ammo<12);assert.ok(a.hits>0);assert.equal(b.ammo,12);
  assert.throws(()=>edit(a,forward,true));assert.throws(()=>buy(a,'scatter'));
});
test('kills reward both wallets, gear is per student, cooldown limits firing',()=>{
  const {r,a,b}=classroom();edit(a,firing,true);a.x=8;a.z=8;cleanInput(a,{keys:['mouse']});
  r.phase='active';r.enemies=[{x:8,z:11,type:'walker',hp:14,max:14,speed:0,cool:1}];tick(r,.05);
  assert.equal(r.phase,'clear');assert.equal(a.coins,5);assert.equal(b.coins,5);
  tick(r,.05);assert.equal(a.shot,1);a.x=0;a.z=0;assert.throws(()=>buy(a,'scatter'));
  a.coins=15;buy(a,'scatter');assert.equal(a.coins,0);assert.equal(a.weapon,'scatter');assert.equal(b.weapon,'pulse');
});
test('fifth wave adds a boss, defense can fail and retry, switching preserves code',()=>{
  const {r,a}=classroom();edit(a,forward,true);control(r,'mode','defense');r.wave=4;control(r,'next');assert.ok(r.enemies.some(e=>e.type==='boss'));
  control(r,'pause');const before=structuredClone(r.enemies);tick(r,.05);assert.deepEqual(r.enemies,before);control(r,'pause');
  r.coreHp=1;Object.assign(r.enemies[0],{x:0,z:12,cool:0});tick(r,.05);assert.equal(r.phase,'lost');control(r,'next');assert.equal(r.wave,5);
  control(r,'mode','survival');assert.deepEqual(a.code,forward);assert.equal(r.wave,0);
});
test('draft visibility and exploration bonus are scoped to the class',()=>{
  const {r,a,b}=classroom();edit(a,forward,false);
  assert.deepEqual(snapshot(r,null,true).players[0].draft,forward);assert.ok(!('draft' in snapshot(r,b.id).players[0]));
  control(r,'next');a.x=r.cache.x;a.z=r.cache.z;tick(r,.05);tick(r,.05);assert.equal(b.kits,2);assert.equal(a.kits,2);
});
