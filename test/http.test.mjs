import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('teacher and two independent students join a room and sync their programs',async t=>{
  const suffix='outpost-'+randomUUID();
  const socketPath=process.platform==='win32'?'\\\\.\\pipe\\'+suffix:join(tmpdir(),suffix);
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,OUTPOST_TEST_SOCKET:socketPath,TEACHER_KEY:'temporary-test-key'},stdio:['ignore','pipe','pipe']});
  t.after(()=>child.kill());await once(child.stdout,'data');
  function post(op,body={},token=''){return new Promise((ok,fail)=>{
    const req=http.request({socketPath,path:'/api/'+op,method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'}},res=>{
      let out='';res.setEncoding('utf8');res.on('data',chunk=>out+=chunk);res.on('end',()=>ok({status:res.statusCode,data:JSON.parse(out)}));});
    req.on('error',fail);req.end(JSON.stringify(body));
  });}
  assert.equal((await post('create',{key:'incorrect'})).status,403);
  const {data:teacher}=await post('create',{key:'temporary-test-key'});
  const students=await Promise.all(['甲','乙'].map(name=>post('join',{name,code:teacher.code}).then(x=>x.data)));
  const blocks={loop:true,rules:[{when:'w',do:'forward'}]};
  await post('run',blocks,students[0].token);await post('sync',{keys:['w']},students[0].token);
  await new Promise(ok=>setTimeout(ok,220));const {data:s}=await post('sync',{},teacher.token);
  assert.equal(s.players.length,2);const first=s.players.find(p=>p.id===students[0].id),second=s.players.find(p=>p.id===students[1].id);
  assert.deepEqual(first.code,blocks);assert.ok(first.z>0);assert.equal(second.z,0);
  assert.equal((await post('teacher',{cmd:'next'},students[0].token)).status,403);
  await post('teacher',{cmd:'next'},teacher.token);assert.equal((await post('sync',{},students[1].token)).data.wave,1);
  assert.deepEqual((await post('restore',{},students[0].token)).data.code,blocks);
});
