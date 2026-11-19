import test from 'node:test';
import assert from 'node:assert/strict';
import {geometry,meshVertices,cameraMatrix,transform,multiply,identity} from '../public/mesh.js';
import {character,weapon,landscape} from '../public/models.js';
import {GunFeedback} from '../public/feedback.js';
import {inputMask} from '../public/motion.js';
import {player,room,edit,cleanInput,tick} from '../game.mjs';
const code={loop:true,rules:[{when:'mouse',do:'fire'}]};
test('models have finite triangles and articulated poses change their limb transforms',()=>{
  for(const kind of ['box','sphere','cylinder','cone','taper','wedge']){
    const mesh=geometry(kind);assert.ok(mesh.length>=108);assert.equal(mesh.length%18,0);
    assert.ok([...mesh].every(Number.isFinite));
  }
  const a=[],b=[],p={id:'demo',x:0,z:2,type:'walker'};
  const pose={yaw:0,phase:0,speed:2,time:0,pain:0,attack:0};
  character(a,p,pose);character(b,p,{...pose,phase:Math.PI/2});
  assert.equal(a.length,b.length);assert.ok(a.some((part,i)=>part.matrix.some((n,j)=>Math.abs(n-b[i].matrix[j])>.01)));
  assert.ok(a.length<=14,'detail must be baked into limbs, not rebuilt every frame');
  for(const key of ['pulse','rapid','scatter']){
    const gun=[];weapon(gun,identity(),key,.2,.5);
    assert.ok(gun.reduce((n,p)=>n+meshVertices(p.kind).length,0)>3000);
    assert.ok(gun.every(p=>[...p.matrix,...meshVertices(p.kind)].every(Number.isFinite)));
  }
  const map=landscape();assert.equal(map.length,1);
  assert.equal(meshVertices(map[0].kind),meshVertices(landscape()[0].kind),'scene geometry is reused');
});
test('camera faces the same direction as the server hitscan for yaw and pitch',()=>{
  for(const yaw of [0,Math.PI/2,-Math.PI,1.8])for(const pitch of [-.2,0,.2]){
    const m=cameraMatrix(3,1.35,5,yaw,pitch,1.6);
    const point=[3+Math.sin(yaw)*Math.cos(pitch)*8,1.35+Math.sin(pitch)*8,5+Math.cos(yaw)*Math.cos(pitch)*8,1];
    const q=[0,1,2,3].map(row=>point.reduce((n,a,col)=>n+a*m[col*4+row],0));
    assert.ok(Math.abs(q[0])<.0001);assert.ok(Math.abs(q[1])<.0001);assert.ok(q[3]>0);
  }
});
test('local fire feedback respects student code, safe zone, ammo, and cooldown',()=>{
  const p=player('小葵'),f=new GunFeedback(),mask=inputMask(['mouse']);
  f.sync(p);assert.equal(f.update(0,1,p,code,mask,true),false);
  p.z=6;assert.equal(f.update(0,1,p,p.code,mask,true),false);
  assert.equal(f.update(0,1,p,code,mask,true),true);
  assert.equal(f.update(.016,1.016,p,code,mask,true),false);
  const kick=f.kick;for(let i=0;i<60;i++)f.update(1/60,2+i/60,p,code,0,true);assert.ok(f.kick<kick);
  p.ammo=1;assert.equal(f.update(0,4,p,code,mask,true),false);
  p.shot=1;f.sync(p);assert.equal(f.update(0,4,p,code,mask,true),true);
  p.reload=1;assert.equal(f.update(.05,5,p,code,mask,true),false);
});
test('confirmed shots carry unique owners and impacts, defeated enemies remain briefly for animation',()=>{
  const r=room('123456'),p=player('測試');r.players.set(p.id,p);edit(p,code,true);p.x=8;p.z=8;
  cleanInput(p,{keys:['mouse']});r.phase='active';r.enemies=[{id:'e',x:8,z:10,type:'walker',hp:14,max:14,speed:0,cool:1}];tick(r,.05);
  assert.equal(r.shots[0].owner,p.id);assert.ok(r.shots[0].id);assert.equal(r.shots[0].impact,'defeat');assert.equal(r.fallen[0].id,'e');
  for(let i=0;i<20;i++)tick(r,.05);assert.equal(r.fallen.length,0);
});
