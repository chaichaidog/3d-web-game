import test from 'node:test';
import assert from 'node:assert/strict';
import {statePatch,applyStatePatch} from '../public/sync.js';
import {LiveConnection} from '../public/network.js';
import {room,player,snapshot,tick,control} from '../game.mjs';

test('delta stream preserves gameplay, removes dead entities, and leaves interpolation history intact',()=>{
  const r=room('123456'),p=player('學生');p.z=8;r.players.set(p.id,p);control(r,'next');
  let before=structuredClone(snapshot(r,p.id,true)),received=before,oldBytes=0,newBytes=0;
  const initial=received,original=structuredClone(initial);
  for(let i=0;i<120;i++){
    if(i===30){p.draft={loop:true,rules:[{when:'w',do:'forward'}]};p.help=true;}
    if(i===60){r.enemies.pop();r.shots.push({id:'test-shot',x:0,z:0,tx:1,tz:1,t:.3});}
    tick(r,.05);
    const current=structuredClone(snapshot(r,p.id,true)),patch=statePatch(before,current);
    received=applyStatePatch(received,JSON.parse(JSON.stringify(patch)));
    assert.deepEqual(received,current);
    oldBytes+=Buffer.byteLength(JSON.stringify(current));newBytes+=Buffer.byteLength(JSON.stringify(patch));
    before=current;
  }
  assert.deepEqual(initial,original);
  assert.equal(original.players[0].help,false);
  assert.equal(original.enemies.length,3);
  assert.ok(newBytes<oldBytes*.65,'changed state must be significantly smaller than repeated full snapshots');
});

test('background connection stops traffic and resumes with a new full state despite late old socket events',t=>{
  const oldWebSocket=globalThis.WebSocket,oldLocation=globalThis.location;
  const sockets=[];
  class Socket{
    constructor(){sockets.push(this);this.sent=[];this.bufferedAmount=0;}
    send(data){this.sent.push(JSON.parse(data));}
    close(){this.closed=true;}
    receive(data){this.onmessage({data:JSON.stringify(data)});}
  }
  globalThis.WebSocket=Socket;globalThis.location={protocol:'https:',host:'classroom.example'};
  t.after(()=>{globalThis.WebSocket=oldWebSocket;if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;});
  const states=[],live=new LiveConnection({token:'private'},s=>states.push(s),()=>{},()=>assert.fail('unexpected expiry'));
  t.after(()=>live.close());
  const first=sockets[0];first.onopen();first.receive({kind:'ready'});
  first.receive({kind:'state',state:{players:[{id:'p',x:0}],enemies:[],shots:[],fallen:[]}});
  live.setSuspended(true);
  assert.ok(first.closed);assert.equal(live.input({steps:[]}),false);
  first.receive({kind:'state',state:{players:[]}});assert.equal(states.length,1);
  live.setSuspended(false);
  const second=sockets[1];second.onopen();second.receive({kind:'ready'});
  first.onclose({code:1000});assert.equal(live.ready,true,'late old close must not disconnect the resumed socket');
  second.receive({kind:'state',state:{players:[{id:'p',x:5}],enemies:[],shots:[],fallen:[]}});
  second.receive({kind:'patch',patch:{entities:{players:{update:[{id:'p',x:6}],remove:[]}}}});
  assert.equal(states.at(-1).players[0].x,6);assert.equal(states[0].players[0].x,0);
  assert.equal(second.sent[0].delta,1);
  live.close();second.onclose({code:1000});
});
