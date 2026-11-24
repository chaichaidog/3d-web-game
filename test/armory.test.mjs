import test from 'node:test';
import assert from 'node:assert/strict';
import {buy,cleanInput,edit,player,room,tick} from '../game.mjs';
import {weapons} from '../public/rules.js';
import {GunFeedback,reloadPose} from '../public/feedback.js';
import {inputMask} from '../public/motion.js';
import {weapon} from '../public/models.js';
import {identity,meshVertices} from '../public/mesh.js';

const program={loop:true,rules:[{when:'mouse',do:'fire'},{when:'r',do:'reload'}]};
test('new weapons use their own energy patterns, range, reload time, and equip mesh',()=>{
  for(const key of ['comet','prism','lumen','nova']){
    const spec=weapons[key],r=room('123456'),p=player('補給驗收');
    r.players.set(p.id,p);p.coins=spec.price;buy(p,key);
    assert.equal(p.coins,0);assert.equal(p.ammo,spec.cap);
    edit(p,program,true);p.z=6;p.x=5;
    cleanInput(p,{keys:['mouse']});tick(r,.05);
    assert.equal(p.ammo,spec.cap-1);assert.equal(r.shots.length,spec.rays.length);
    assert.ok(r.shots.every(ray=>Math.abs(Math.hypot(ray.tx-ray.x,ray.tz-ray.z)-spec.range)<1e-9));
    cleanInput(p,{keys:['r']});tick(r,.05);assert.equal(p.reload,spec.reloadTime);
    cleanInput(p,{keys:[]});
    for(let i=0;i<Math.ceil(spec.reloadTime/.05)+1;i++)tick(r,.05);
    assert.equal(p.ammo,spec.cap);assert.equal(p.reload,0);
    const idle=[],reloading=[];
    weapon(idle,identity(),key,0,reloadPose(0));
    weapon(reloading,identity(),key,0,reloadPose(.5));
    assert.equal(idle.length,reloading.length);
    assert.notDeepEqual(idle[2].matrix,reloading[2].matrix);
    for(const part of reloading)assert.ok(meshVertices(part.kind).every(Number.isFinite));
  }
});

test('weapon recoil decay is independent of frame cadence and staged reload has smooth endpoints',()=>{
  const p=player('動畫驗收');p.z=6;
  const simulate=hz=>{
    const gun=new GunFeedback();gun.sync(p,0);
    gun.update(0,0,p,program,inputMask(['mouse']),true);
    for(let frame=1;frame<=hz/2;frame++)gun.update(1/hz,frame/hz,p,program,0,true);
    return gun.kick;
  };
  assert.ok(Math.abs(simulate(30)-simulate(144))<1e-10);
  assert.deepEqual(reloadPose(0),reloadPose(1));
  assert.ok(reloadPose(.5).cell>.9);
  assert.ok(reloadPose(.995).dip<.002);
  const gun=new GunFeedback();p.weapon='nova';p.reload=1.2;gun.sync(p,5);
  const first=gun.reloadProgress(5.2);p.reload=1.1;gun.sync(p,5.2);
  assert.equal(gun.reloadProgress(5.2),first);
});
