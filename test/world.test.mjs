import test from 'node:test';
import assert from 'node:assert/strict';
import {landmarks,blocked,moveWorld,WORLD_LIMIT} from '../public/world.js';
import {traceShot} from '../public/aim.js';
import {room,player,tick,control,home,edit,cleanInput} from '../game.mjs';
import {PredictedMotion,inputMask} from '../public/motion.js';

test('a learner can walk from the base to any district before a wave and keep the reward after returning',()=>{
  const r=room('123456'),p=player('探索者');r.players.set(p.id,p);
  const walk={loop:true,rules:[{when:'w',do:'forward'}]};edit(p,walk,true);
  for(const site of landmarks){
    const yaw=Math.atan2(site.x,site.z),predicted=new PredictedMotion();predicted.reconcile(p,walk,false);
    for(let i=0;i<214;i++){
      p.lastBudget=performance.now()-50;
      predicted.advance(walk,inputMask(['w']),yaw,.05,p.hp,p.ammo);
      cleanInput(p,{keys:['w'],yaw,epoch:p.epoch,steps:predicted.pending});
      predicted.reconcile(p,walk,false);
      tick(r,.05);
    }
    assert.ok(Math.hypot(p.x-site.x,p.z-site.z)<1,site.name);
    assert.ok(p.discovered.includes(site.id));
    tick(r,.05);home(p);
  }
  assert.equal(r.phase,'ready');assert.equal(p.coins,8);
  p.x=landmarks[0].x;p.z=landmarks[0].z;tick(r,.05);assert.equal(p.coins,8);
});

test('district walls block walking and shots, while enemies can detour around them',()=>{
  const p={x:5,z:36,yaw:Math.PI/2,pitch:0};
  const ray=traceShot(p,[{x:20,z:36,type:'walker'}]);
  assert.equal(ray.nearest,null);assert.equal(ray.tx,8);
  moveWorld(p,18,0);assert.ok(p.x<8);assert.ok(!blocked(p.x,p.z));
  const edge={x:0,z:0};moveWorld(edge,-200,0);assert.equal(edge.x,-WORLD_LIMIT);
  const r=room('123456'),student=player('測試');r.players.set(student.id,student);
  student.x=21;student.z=36;control(r,'next');
  const enemy=r.enemies[0];Object.assign(enemy,{x:5,z:36,speed:2});r.enemies=[enemy];
  for(let i=0;i<450;i++){tick(r,.05);assert.ok(!blocked(enemy.x,enemy.z,.34));}
  assert.ok(Math.hypot(enemy.x-student.x,enemy.z-student.z)<2,'enemy should reach the other side');
});
