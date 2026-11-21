import test from 'node:test';
import assert from 'node:assert/strict';
import {room,player,interact,practice,control,tick,edit,cleanInput,snapshot} from '../game.mjs';
import {activities,availableActivities} from '../public/activities.js';
import {FramePacer} from '../public/frame-pacing.js';

function classroom(){
  const r=room('123456'),a=player('小凱'),b=player('小葵');
  r.players.set(a.id,a);r.players.set(b.id,b);
  return {r,a,b};
}
const locate=(player,id)=>{
  const {x,z}=activities.find(activity=>activity.id===id);
  Object.assign(player,{x,z});
};

test('each exploration stop has its own action and shared rewards are awarded once',()=>{
  const {r,a,b}=classroom();
  assert.throws(()=>interact(r,a,'depot'));
  locate(a,'depot');interact(r,a,'depot');
  assert.equal(a.kits,2);assert.equal(b.kits,2);
  assert.match(snapshot(r,b.id).teamNews.message,/小凱 找到貨站醫療箱/);
  locate(b,'depot');assert.throws(()=>interact(r,b,'depot'));assert.equal(b.kits,2);
  locate(a,'woods');assert.throws(()=>interact(r,a,'woods'),/已經是滿的/);
  a.ammo=3;interact(r,a,'woods');assert.equal(a.ammo,12);assert.equal(b.ammoCacheUsed,false);
  a.ammo=3;assert.throws(()=>interact(r,a,'woods'));assert.equal(a.ammo,3);
  locate(a,'town');interact(r,a,'town');assert.equal(r.activities.town,a.name);
  locate(a,'stash');assert.throws(()=>interact(r,a,'stash'));
  locate(b,'signal');interact(r,b,'signal');
  assert.ok(availableActivities(snapshot(r,a.id)).some(activity=>activity.id==='stash'));
  interact(r,a,'stash');assert.equal(a.coins,3);assert.equal(b.coins,3);
  control(r,'mode','defense');assert.throws(()=>interact(r,a,'stash'));
});

test('practice follows target training and is private, non-damaging, retryable, and independent of waves',()=>{
  const {r,a,b}=classroom();
  edit(a,{loop:true,rules:[{when:'mouse',do:'fire'}]},true);
  a.z=6;assert.throws(()=>practice(r,a,'start'));
  cleanInput(a,{keys:['mouse']});tick(r,.05);assert.equal(a.hits,1);
  cleanInput(a,{keys:[]});practice(r,a,'start');
  assert.equal(snapshot(r,a.id).enemies[0].practiceOwner,a.id);
  assert.equal(snapshot(r,b.id).enemies.length,0);
  for(let i=0;i<200;i++)tick(r,.05);
  assert.equal(a.hp,100);assert.ok(a.practice.z-a.z>=2.99);
  cleanInput(a,{keys:['mouse']});for(let i=0;i<20;i++)tick(r,.05);
  assert.equal(a.practice,null);assert.equal(a.practiceWins,1);
  assert.equal(r.wave,0);assert.equal(r.kills,0);assert.equal(a.coins,0);
  practice(r,a,'start');practice(r,a,'cancel');assert.equal(a.practice,null);
  practice(r,a,'start');control(r,'next');assert.equal(a.practice,null);
  assert.equal(r.wave,1);assert.ok(r.enemies.every(enemy=>!enemy.practiceOwner));
});

test('frame pacing keeps regular intervals on 60, 144 and 180 Hz displays',()=>{
  for(const [hz,divisor] of [[60,1],[144,2],[180,3]]){
    const pacer=new FramePacer(),drawn=[];
    for(let i=0;i<120;i++)if(pacer.draw(i*1000/hz))drawn.push(i);
    for(let i=2;i<drawn.length;i++)assert.equal(drawn[i]-drawn[i-1],divisor);
  }
});
