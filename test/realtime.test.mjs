import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import http from 'node:http';
import net from 'node:net';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import WebSocket from '../vendor/ws/wrapper.mjs';
import {SnapshotTimeline} from '../public/timeline.js';
import {PredictedMotion} from '../public/motion.js';
import {applyStatePatch} from '../public/sync.js';

test('persistent connection pushes states without round trips, isolates sessions and reconnects',{timeout:8000},async t=>{
  const suffix='outpost-live-'+randomUUID();
  const socketPath=process.platform==='win32'?'\\\\.\\pipe\\'+suffix:join(tmpdir(),suffix);
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,OUTPOST_TEST_SOCKET:socketPath,TEACHER_KEY:'temporary-test-key'},stdio:['ignore','pipe','pipe']});
  t.after(()=>child.kill());await once(child.stdout,'data');
  function post(op,body={}){return new Promise((ok,fail)=>{
    const req=http.request({socketPath,path:'/api/'+op,method:'POST',headers:{'Content-Type':'application/json'}},res=>{
      let text='';res.on('data',b=>text+=b);res.on('end',()=>ok(JSON.parse(text)));
    });req.on('error',fail);req.end(JSON.stringify(body));
  });}
  const a=await post('create',{key:'temporary-test-key'}),b=await post('create',{key:'temporary-test-key'});
  const first=await post('join',{name:'甲',code:a.code}),second=await post('join',{name:'乙',code:b.code});
  async function open(){
    const ws=new WebSocket('ws://localhost/live',{createConnection:()=>net.connect(socketPath),origin:'http://localhost'});
    t.after(()=>ws.terminate());await once(ws,'open');return ws;
  }
  async function connect(token,delta=0){
    const ws=await open(),messages=[],wire=[];let state=null;
    ws.on('message',bytes=>{
      const m=JSON.parse(bytes);wire.push(m);
      if(m.kind==='state')state=m.state;
      if(m.kind==='patch'){state=applyStatePatch(state,m.patch);messages.push({...m,kind:'state',state});}
      else messages.push(m);
    });
    const ready=once(ws,'message');ws.send(JSON.stringify({kind:'auth',token,delta}));await ready;return {ws,messages,wire};
  }
  const bad=await open(),closed=once(bad,'close');bad.send(JSON.stringify({kind:'auth',token:'wrong'}));
  assert.equal((await closed)[0],4001);
  const one=await connect(first.token),two=await connect(second.token);
  await new Promise(ok=>setTimeout(ok,310));
  const frames=one.messages.filter(m=>m.kind==='state');
  assert.ok(frames.length>=4,'state must stream even with no new HTTP request');
  assert.ok(frames.every(m=>m.state.code===a.code&&m.state.players.length===1&&m.state.players[0].id===first.id));
  assert.ok(two.messages.filter(m=>m.kind==='state').every(m=>m.state.code===b.code));
  one.ws.send(JSON.stringify({kind:'rpc',id:1,op:'teacher',data:{cmd:'next'}}));
  one.ws.send(JSON.stringify({kind:'rpc',id:2,op:'run',data:{loop:true,rules:[{when:'w',do:'forward'}]}}));
  await new Promise(ok=>setTimeout(ok,90));
  assert.equal(one.messages.find(m=>m.id===1)?.status,403);
  assert.ok(one.messages.find(m=>m.id===2&&!m.error));
  const latest=one.messages.filter(m=>m.kind==='state').at(-1).state.players[0];
  one.ws.send(JSON.stringify({kind:'input',data:{keys:['w'],epoch:latest.epoch,steps:[{seq:1,mask:1,yaw:0,dt:.05}]}}));
  await new Promise(ok=>setTimeout(ok,90));
  assert.ok(one.messages.filter(m=>m.kind==='state').at(-1).state.players[0].z>0);
  one.ws.close();await once(one.ws,'close');
  const back=await connect(first.token);await new Promise(ok=>setTimeout(ok,70));
  assert.equal(back.messages.find(m=>m.kind==='state').state.players[0].id,first.id);
  back.ws.close();await once(back.ws,'close');
  const compact=await connect(first.token,1),teacher=await connect(a.token,1);
  await new Promise(ok=>setTimeout(ok,1100));
  assert.equal(compact.wire.filter(m=>m.kind==='state').length,1,'new connection starts with a complete state');
  assert.ok(compact.wire.filter(m=>m.kind==='patch').length<=2,'idle connection sends only heartbeats');
  const current=compact.messages.filter(m=>m.kind==='state').at(-1).state.players[0];
  compact.ws.send(JSON.stringify({kind:'input',data:{keys:['w'],epoch:current.epoch,steps:[{seq:current.ack+1,mask:1,yaw:0,dt:.05}]}}));
  await new Promise(ok=>setTimeout(ok,120));
  assert.ok(compact.messages.filter(m=>m.kind==='state').at(-1).state.players[0].z>current.z,'delta frames still move the player');
  assert.equal(compact.messages.filter(m=>m.kind==='state').at(-1).state.players[0].draft,undefined);
  assert.deepEqual(teacher.messages.filter(m=>m.kind==='state').at(-1).state.players[0].draft,{loop:true,rules:[{when:'w',do:'forward'}]});
});

test('snapshot timeline smooths jitter, bounds extrapolation, and snaps teleports',()=>{
  const state=(x,epoch=0)=>({players:[{id:'p',x,z:0,yaw:0,pitch:0,epoch}],enemies:[],phase:'active'});
  const timeline=new SnapshotTimeline();
  timeline.push(state(0),1000,20);timeline.push(state(.25),1050,95);timeline.push(state(.5),1100,105);
  const samples=[105,115,125,135].map(now=>timeline.sample(now,50).players[0].x);
  for(let i=1;i<samples.length;i++)assert.ok(Math.abs(samples[i]-samples[i-1]-.05)<1e-6);
  assert.ok(timeline.sample(500).players[0].x<=1);
  timeline.push(state(0,1),1150,170);assert.equal(timeline.sample(170,0).players[0].x,0);
});
test('small server corrections ease the camera while returning home remains immediate',()=>{
  const m=new PredictedMotion(),code={loop:false,rules:[]};
  m.reconcile({x:2,z:0,epoch:1,ack:0,hp:100,ammo:12},code,false);
  m.reconcile({x:1.9,z:0,epoch:1,ack:0,hp:100,ammo:12},code,false);
  assert.equal(m.renderPosition(0).x,2);
  assert.ok(m.renderPosition(.05).x>1.9&&m.renderPosition(0).x<2);
  m.reconcile({x:0,z:0,epoch:2,ack:0,hp:100,ammo:12},code,false);
  assert.equal(m.renderPosition(0).x,0);
});
