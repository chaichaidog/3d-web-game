import {randomUUID} from 'node:crypto';
import {fresh,program,core,targets,weapons,safe,clamp,sensors} from './public/rules.js';
export function room(code) {
  return {code, mode:'survival', phase:'ready', wave:0, coreHp:100, kills:0, players:new Map(), enemies:[], shots:[], message:'集合完畢後，老師可以開始第一波。', touched:Date.now()};
}
export function player(name){
  return {id:randomUUID(),name,x:0,z:0,yaw:0,pitch:0,hp:100,coins:0,weapon:'pulse',owned:['pulse'],ammo:12,kits:1,
    draft:fresh(),code:fresh(),keys:[],tap:false,editor:false,help:false,seen:Date.now(),delay:0,reload:0,hits:0,walked:false,gear:false,shot:0,hit:0};
}
export function cleanInput(p,data){
  p.keys=Array.isArray(data.keys)?data.keys.filter(k=>Object.hasOwn(sensors,k)&&!['empty','low','click'].includes(k)).slice(0,12):[];
  p.tap ||= data.tap===true;
  if(Number.isFinite(data.yaw)) p.yaw=data.yaw%(Math.PI*2);
  if(Number.isFinite(data.pitch)) p.pitch=clamp(data.pitch,-.32,.32);
  p.editor=safe(p.x,p.z)&&data.editor===true;
}
export function home(p){Object.assign(p,{x:0,z:0,hp:100,keys:[],tap:false,reload:0,ammo:weapons[p.weapon].cap});}
export function edit(p,body,run){
  if(!safe(p.x,p.z)) throw Error('請先回到安全區');
  p.draft=program(body);
  if(run)p.code=structuredClone(p.draft);
}
export function buy(p,key){
  if(!safe(p.x,p.z)) throw Error('請先回到安全區');
  if(key==='kit'){
    if(p.coins<5)throw Error('金幣不足');
    p.coins-=5;p.kits++;return;
  }
  if(!Object.hasOwn(weapons,key))throw Error('查無裝備');
  const item=weapons[key];
  if(!p.owned.includes(key)){
    if(p.coins<item.price)throw Error('金幣不足');
    p.coins-=item.price;p.owned.push(key);p.gear=true;
  }
  p.weapon=key;p.ammo=item.cap;p.reload=0;
}
export function nextWave(r) {
  if(r.phase==='active'||r.phase==='paused')throw Error('請先完成本波');
  const retry=r.phase==='lost';
  if(!retry)r.wave++;
  r.phase='active';r.coreHp=100;r.enemies=[];
  const cacheAngle=(r.wave-1)*1.8+.7;
  r.cache=r.mode==='survival'?{x:Math.sin(cacheAngle)*14,z:Math.cos(cacheAngle)*14,claimed:false}:null;
  const count=Math.max(1,[...r.players.values()].filter(p=>Date.now()-p.seen<15000).length);
  const bossWave=r.wave%5===0;
  const n=Math.min(24,2+count+Math.min(r.wave-1,8));
  for(let i=0;i<n+(bossWave?1:0);i++){
    const boss=bossWave&&i===n;
    const type=boss?'boss':['walker','runner','brute','swarm'][(i%2===0?0:(r.wave-1)%4)];
    const a=(i+Math.random()*.5)/n*Math.PI*2;
    const hp={walker:28,runner:18,brute:65,swarm:14,boss:120+count*35}[type];
    r.enemies.push({id:randomUUID(),type,hp,max:hp,x:Math.sin(a)*20,z:Math.cos(a)*20,cool:1,speed:{walker:1.5,runner:2.6,brute:1,swarm:2.1,boss:1.3}[type]});
  }
  r.message=bossWave?'警報！巨型感染者進場':'第 '+r.wave+' 波開始';
}
export function control(r,cmd,mode){
  if(cmd==='next')return nextWave(r);
  if(cmd==='pause'&&['paused','active'].includes(r.phase)){r.phase=r.phase==='active'?'paused':'active';return;}
  if(cmd==='recall'){for(const p of r.players.values())home(p);return;}
  if(cmd==='mode'&&['survival','defense'].includes(mode)){
    r.mode=mode;r.wave=0;r.enemies=[];r.cache=null;r.coreHp=100;r.phase='ready';r.message='已切換模式，裝備與積木已保留。';return;
  }
  throw Error('現在無法使用此操作');
}
function shoot(r,p) {
  if(p.reload>0||p.delay>0||p.ammo<=0||safe(p.x,p.z))return;
  const w=weapons[p.weapon];p.delay=w.delay;p.ammo--;p.shot++;
  for(const delta of w.spread?[-w.spread,0,w.spread]:[0]){
    const a=p.yaw+delta,dx=Math.sin(a),dz=Math.cos(a);
    let nearest=null,dist=45;
    const colliders=[...r.enemies,...targets];
    for(const obj of colliders){
      const ex=obj.x-p.x,ez=obj.z-p.z,d=ex*dx+ez*dz;
      const size=obj.type==='boss'?1.5:.66;
      if(d<=0||d>=dist||Math.abs(ex*dz-ez*dx)>size)continue;
      const y=1.35+Math.tan(p.pitch)*d;
      if(y<.25||y>(obj.type==='boss'?3.8:2.2))continue;
      nearest=obj;dist=d;
    }
    r.shots.push({x:p.x,z:p.z,tx:p.x+dx*dist,tz:p.z+dz*dist,y:1.35+Math.tan(p.pitch)*dist,t:.22});
    if(!nearest)continue;
    p.hit++;
    if(!nearest.type){p.hits++;continue;}
    nearest.hp-=w.damage;
    if(nearest.hp<=0){
      r.enemies=r.enemies.filter(e=>e!==nearest);r.kills++;
      for(const buddy of r.players.values())buddy.coins+=nearest.type==='boss'?15:5;
    }
  }
}
function runPlayer(r,p,dt){
  const active=Date.now()-p.seen<1800;
  p.delay=Math.max(0,p.delay-dt);
  if(p.reload>0){p.reload-=dt;if(p.reload<=0)p.ammo=weapons[p.weapon].cap;}
  if(p.editor||!p.code.loop||!active){p.tap=false;return;}
  const flags=new Set(p.keys);
  if(p.ammo===0)flags.add('empty');
  if(p.hp<40)flags.add('low');
  if(p.tap)flags.add('click');p.tap=false;
  const commands=new Set(p.code.rules.filter(row=>flags.has(row.when)).map(row=>row.do));
  const f=Number(commands.has('forward'))-Number(commands.has('back'));
  const s=Number(commands.has('right'))-Number(commands.has('left'));
  const scale=(commands.has('sprint')?7:4.5)*dt/Math.max(1,Math.hypot(f,s));
  p.x=clamp(p.x+(f*Math.sin(p.yaw)+s*Math.cos(p.yaw))*scale,-23,23);
  p.z=clamp(p.z+(f*Math.cos(p.yaw)-s*Math.sin(p.yaw))*scale,-23,23);
  if(!safe(p.x,p.z))p.walked=true;
  if(commands.has('fire'))shoot(r,p);
  if(commands.has('reload')&&p.reload<=0&&p.ammo<weapons[p.weapon].cap)p.reload=1;
  if(commands.has('heal')&&p.kits>0&&p.hp<100){p.hp=Math.min(100,p.hp+45);p.kits--;}
}
export function tick(r,dt){
  if(r.phase==='paused'){for(const p of r.players.values())p.tap=false;return;}
  r.shots=r.shots.filter(s=>(s.t-=dt)>0);
  for(const p of r.players.values())runPlayer(r,p,dt);
  if(r.phase!=='active')return;
  if(!r.enemies.length){r.phase='clear';r.message='本波完成！回基地補給，再挑戰下一波。';return;}
  const outside=[...r.players.values()].filter(p=>!safe(p.x,p.z)&&Date.now()-p.seen<5000);
  if(r.cache&&!r.cache.claimed&&outside.some(p=>Math.hypot(p.x-r.cache.x,p.z-r.cache.z)<1.8)){
    r.cache.claimed=true;for(const p of r.players.values())p.kits++;
    r.message='找到補給箱，全隊每人獲得一個醫療包！';
  }
  for(const e of r.enemies){
    let target=r.mode==='defense'?core:null,best=target?Math.hypot(e.x-core.x,e.z-core.z):Infinity;
    for(const p of outside){const d=Math.hypot(e.x-p.x,e.z-p.z);if(d<best){best=d;target=p;}}
    if(!target)continue;
    e.cool-=dt;
    if(best<1.65){
      if(e.cool<=0){e.cool=1.2;const hurt=e.type==='boss'?18:6;
        if(target===core)r.coreHp=Math.max(0,r.coreHp-hurt);
        else {target.hp-=hurt;if(target.hp<=0)home(target);}
      }
    }else{
      const vx=(target.x-e.x)/best,vz=(target.z-e.z)/best;
      let nx=e.x+vx*e.speed*dt,nz=e.z+vz*e.speed*dt;
      if(safe(nx,nz)){const a=Math.atan2(e.z,e.x),dir=e.x*vz-e.z*vx>=0?1:-1; nx=5.05*Math.cos(a+dir*e.speed*dt/5);nz=5.05*Math.sin(a+dir*e.speed*dt/5);}
      e.x=nx;e.z=nz;
    }
  }
  if(!r.coreHp){r.phase='lost';r.enemies=[];r.message='發電機離線。補給後可重試本波。';}
}
export function snapshot(r,id,teacher=false){
  return {code:r.code,mode:r.mode,phase:r.phase,wave:r.wave,coreHp:r.coreHp,kills:r.kills,message:r.message,cache:r.cache,enemies:r.enemies,shots:r.shots,
    players:[...r.players.values()].map(p=>{
      const {id:pid,name,x,z,yaw,pitch,hp,weapon,shot,hit,editor,help}=p;
      const basic={id:pid,name,x,z,yaw,pitch,hp,weapon,shot,hit,editor,help,online:Date.now()-p.seen<5000};
      if(pid===id||teacher)Object.assign(basic,{coins:p.coins,kits:p.kits,owned:p.owned,ammo:p.ammo,reload:p.reload,walked:p.walked,hits:p.hits,gear:p.gear});
      if(teacher)Object.assign(basic,{draft:p.draft,code:p.code});
      return basic;
    })};
}
