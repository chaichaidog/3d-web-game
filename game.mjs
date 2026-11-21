import {randomUUID} from 'node:crypto';
import {fresh,program,core,targets,weapons,safe,clamp,sensors} from './public/rules.js';
import {inputMask,commandsFor,move} from './public/motion.js';
import {traceShot} from './public/aim.js';
import {WORLD_LIMIT,landmarks,blocked,moveWorld,wallDistance,pathTo} from './public/world.js';
import {availableActivities,claimedBy,nearActivity,inPracticeLane} from './public/activities.js';
const routes=new WeakMap();
export function room(code) {
  return {code, mode:'survival', phase:'ready', wave:0, coreHp:100, kills:0, players:new Map(), enemies:[], shots:[], fallen:[], activities:{}, teamNews:null, message:'集合完畢後，老師可以開始第一波。', touched:Date.now()};
}
export function player(name){
  return {id:randomUUID(),name,x:0,z:0,yaw:0,pitch:0,hp:100,coins:0,weapon:'pulse',owned:['pulse'],ammo:12,kits:1,
    draft:fresh(),code:fresh(),keys:[],tap:false,editor:false,help:false,seen:Date.now(),delay:0,reload:0,hits:0,walked:false,gear:false,shot:0,hit:0,
    discovered:[],ammoCacheUsed:false,practice:null,practiceWins:0,ack:0,epoch:0,sampled:false,credit:.25,lastBudget:performance.now()};
}
export function cleanInput(p,data,paused=false){
  p.keys=Array.isArray(data.keys)?data.keys.filter(k=>Object.hasOwn(sensors,k)&&!['empty','low','click'].includes(k)).slice(0,12):[];
  p.tap ||= data.tap===true;
  if(Number.isFinite(data.yaw)) p.yaw=data.yaw%(Math.PI*2);
  if(Number.isFinite(data.pitch)) p.pitch=clamp(data.pitch,-.32,.32);
  p.editor=safe(p.x,p.z)&&data.editor===true;
  if(!Array.isArray(data.steps))return;
  p.sampled=true;
  const now=performance.now();
  p.credit=Math.min(1,p.credit+(now-p.lastBudget)/1000);p.lastBudget=now;
  if(data.epoch!==p.epoch)return;
  for(const step of data.steps.slice(0,180)){
    if(!step||!Number.isSafeInteger(step.seq)||step.seq<=p.ack||!Number.isFinite(step.dt)||!Number.isFinite(step.yaw)||!Number.isInteger(step.mask))continue;
    p.ack=step.seq;
    if(paused||p.editor)continue;
    const dt=Math.min(clamp(step.dt,0,.06),p.credit);p.credit-=dt;
    move(p,commandsFor(p.code,step.mask,p.hp,p.ammo),step.yaw,dt);
    if(!safe(p.x,p.z))p.walked=true;
  }
}
export function home(p){Object.assign(p,{epoch:p.epoch+1,x:0,z:0,hp:100,keys:[],tap:false,practice:null,reload:0,ammo:weapons[p.weapon].cap});}
export function interact(r,p,id){
  const site=availableActivities(r).find(activity=>activity.id===id);
  if(!site||r.phase==='paused'||!nearActivity(p,site))throw Error('先走近地圖上的互動點');
  if(claimedBy(r,p,site))throw Error('這個互動點已經完成');
  if(site.kind==='ammo'){
    if(p.ammo===weapons[p.weapon].cap)throw Error('你的彈匣已經是滿的');
    p.ammo=weapons[p.weapon].cap;p.reload=0;p.epoch++;p.ammoCacheUsed=true;
    return {message:'彈匣補滿了！'};
  }
  r.activities[site.id]=p.name;
  let message;
  if(site.kind==='lamp')message=p.name+' 點亮了街區集合燈！';
  if(site.kind==='signal')message=p.name+' 啟動了訊號站！小地圖上出現藏箱。';
  if(site.kind==='medical'){
    for(const buddy of r.players.values())buddy.kits++;
    message=p.name+' 找到貨站醫療箱！全隊每人多 1 個醫療包。';
  }
  if(site.kind==='stash'){
    for(const buddy of r.players.values())buddy.coins+=3;
    message=p.name+' 打開訊號站藏箱！全隊每人獲得 3 枚金幣。';
  }
  r.teamNews={id:randomUUID(),message};
  return {message};
}
export function practice(r,p,cmd){
  if(cmd==='cancel'){p.practice=null;return;}
  if(cmd!=='start'||r.phase!=='ready'||r.wave!==0||!p.hits)throw Error('先完成打靶，才能在第一波開始前練習');
  if(!inPracticeLane(p))throw Error('回到基地北側的練習靶區再開始');
  if(p.practice)return;
  p.practice={id:randomUUID(),name:'練習殭屍',type:'walker',practiceOwner:p.id,hp:28,max:28,x:p.x,z:Math.max(15,p.z+6),yaw:Math.PI,hit:0};
}
export function edit(p,body,run){
  if(!safe(p.x,p.z)) throw Error('請先回到安全區');
  p.draft=program(body);
  if(run){p.code=structuredClone(p.draft);p.epoch++;}
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
  for(const p of r.players.values())p.practice=null;
  r.phase='active';r.coreHp=100;r.enemies=[];r.fallen=[];r.shots=[];
  const site=landmarks[(r.wave-1)%landmarks.length];
  r.cache=r.mode==='survival'?{x:site.x+2,z:site.z+2,claimed:false,name:site.name}:null;
  const count=Math.max(1,[...r.players.values()].filter(p=>Date.now()-p.seen<15000).length);
  const roaming=r.mode==='survival'?[...r.players.values()].filter(p=>!safe(p.x,p.z)&&Date.now()-p.seen<5000):[];
  const bossWave=r.wave%5===0;
  const n=Math.min(24,2+count+Math.min(r.wave-1,8));
  for(let i=0;i<n+(bossWave?1:0);i++){
    const boss=bossWave&&i===n;
    const type=boss?'boss':['walker','runner','brute','swarm'][(i%2===0?0:(r.wave-1)%4)];
    const a=(i+Math.random()*.5)/n*Math.PI*2;
    const hp={walker:28,runner:18,brute:65,swarm:14,boss:120+count*35}[type];
    const anchor=roaming[i%roaming.length]||{x:0,z:0};
    let x=0,z=20;
    for(let attempt=0;attempt<32;attempt++){
      const angle=a+attempt*.63;
      x=clamp(anchor.x+Math.sin(angle)*20,-WORLD_LIMIT+2,WORLD_LIMIT-2);
      z=clamp(anchor.z+Math.cos(angle)*20,-WORLD_LIMIT+2,WORLD_LIMIT-2);
      if(!blocked(x,z,.65)&&!safe(x,z)&&Math.hypot(x-anchor.x,z-anchor.z)>10)break;
    }
    r.enemies.push({id:randomUUID(),type,hp,max:hp,x,z,yaw:a+Math.PI,hit:0,attack:0,cool:1,speed:{walker:1.5,runner:2.6,brute:1,swarm:2.1,boss:1.3}[type]});
  }
  r.message=bossWave?'警報！巨型感染者進場':'第 '+r.wave+' 波開始';
}
export function control(r,cmd,mode){
  if(cmd==='next')return nextWave(r);
  if(cmd==='pause'&&['paused','active'].includes(r.phase)){r.phase=r.phase==='active'?'paused':'active';for(const p of r.players.values())p.epoch++;return;}
  if(cmd==='recall'){for(const p of r.players.values())home(p);return;}
  if(cmd==='mode'&&['survival','defense'].includes(mode)){
    for(const p of r.players.values())p.practice=null;
    r.mode=mode;r.wave=0;r.enemies=[];r.fallen=[];r.shots=[];r.cache=null;r.coreHp=100;r.phase='ready';r.message='已切換模式，裝備與積木已保留。';return;
  }
  throw Error('現在無法使用此操作');
}
function shoot(r,p) {
  if(p.reload>0||p.delay>0||p.ammo<=0||safe(p.x,p.z))return;
  const w=weapons[p.weapon];p.delay=w.delay;p.ammo--;p.shot++;
  for(const delta of w.spread?[-w.spread,0,w.spread]:[0]){
    const candidates=p.practice?[p.practice]:[...r.enemies,...targets];
    const {nearest,...ray}=traceShot(p,candidates,delta);
    const shot={...ray,id:p.id+':'+p.shot+':'+delta,owner:p.id,weapon:p.weapon,t:.8,impact:nearest?nearest.type?'enemy':'target':'none'};
    r.shots.push(shot);
    if(!nearest)continue;
    p.hit++;
    if(!nearest.type){p.hits++;continue;}
    nearest.hp-=w.damage;nearest.hit=(nearest.hit||0)+1;
    if(nearest.hp<=0){
      if(nearest.practiceOwner){
        p.practice=null;p.practiceWins++;
        r.fallen.push({...nearest,t:.7});shot.impact='defeat';
        continue;
      }
      r.enemies=r.enemies.filter(e=>e!==nearest);r.kills++;
      r.fallen.push({...nearest,t:.7});shot.impact='defeat';
      for(const buddy of r.players.values())buddy.coins+=nearest.type==='boss'?15:5;
    }
  }
}
function runPlayer(r,p,dt){
  const active=Date.now()-p.seen<1800;
  p.delay=Math.max(0,p.delay-dt);
  if(p.reload>0){p.reload-=dt;if(p.reload<=0)p.ammo=weapons[p.weapon].cap;}
  if(p.editor||!p.code.loop||!active){p.tap=false;return;}
  const commands=commandsFor(p.code,inputMask(p.keys,p.tap),p.hp,p.ammo);p.tap=false;
  if(!p.sampled)move(p,commands,p.yaw,dt);
  if(!safe(p.x,p.z))p.walked=true;
  if(commands.has('fire'))shoot(r,p);
  if(commands.has('reload')&&p.reload<=0&&p.ammo<weapons[p.weapon].cap)p.reload=1;
  if(commands.has('heal')&&p.kits>0&&p.hp<100){p.hp=Math.min(100,p.hp+45);p.kits--;}
}
export function tick(r,dt){
  if(r.phase==='paused'){for(const p of r.players.values())p.tap=false;return;}
  r.shots=r.shots.filter(s=>(s.t-=dt)>0);
  r.fallen=r.fallen.filter(s=>(s.t-=dt)>0);
  for(const p of r.players.values()){
    if(p.practice){
      if(!inPracticeLane(p))p.practice=null;
      else{
        const enemy=p.practice,dx=p.x-enemy.x,dz=p.z-enemy.z,distance=Math.hypot(dx,dz);
        enemy.yaw=Math.atan2(dx,dz);
        if(distance>3){const step=Math.min(.85*dt,distance-3)/distance;moveWorld(enemy,dx*step,dz*step);}
      }
    }
    runPlayer(r,p,dt);
    if(r.mode==='survival'&&Date.now()-p.seen<1800)for(const site of landmarks){
      if(Math.hypot(p.x-site.x,p.z-site.z)<3&&!p.discovered.includes(site.id)){
        p.discovered.push(site.id);p.coins+=2;
      }
    }
  }
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
    e.yaw=Math.atan2(target.x-e.x,target.z-e.z);
    e.cool-=dt;
    const obstructed=best>0&&wallDistance(e.x,e.z,(target.x-e.x)/best,(target.z-e.z)/best,0,best,.36)<best;
    if(best<1.65&&!obstructed){
      if(e.cool<=0){e.cool=1.2;e.attack=(e.attack||0)+1;const hurt=e.type==='boss'?18:6;
        if(target===core)r.coreHp=Math.max(0,r.coreHp-hurt);
        else {target.hp-=hurt;if(target.hp<=0)home(target);}
      }
    }else{
      let waypoint=target;
      if(obstructed){
        let route=routes.get(e);
        if(!route||route.age>1.5||Math.hypot(route.x-target.x,route.z-target.z)>3){route={points:pathTo(e,target),x:target.x,z:target.z,age:0};routes.set(e,route);}
        route.age+=dt;
        while(route.points.length&&Math.hypot(e.x-route.points[0].x,e.z-route.points[0].z)<.8)route.points.shift();
        waypoint=route.points[0]||target;
      }else routes.delete(e);
      const length=Math.hypot(waypoint.x-e.x,waypoint.z-e.z)||1;
      const vx=(waypoint.x-e.x)/length,vz=(waypoint.z-e.z)/length;
      let nx=e.x+vx*e.speed*dt,nz=e.z+vz*e.speed*dt;
      if(safe(nx,nz)){const a=Math.atan2(e.z,e.x),dir=e.x*vz-e.z*vx>=0?1:-1; nx=5.05*Math.cos(a+dir*e.speed*dt/5);nz=5.05*Math.sin(a+dir*e.speed*dt/5);}
      moveWorld(e,nx-e.x,nz-e.z,.35);
    }
  }
  if(!r.coreHp){r.phase='lost';r.enemies=[];r.message='發電機離線。補給後可重試本波。';}
}
export function snapshot(r,id,teacher=false){
  const training=[...r.players.values()].filter(p=>p.practice&&(teacher||p.id===id)).map(p=>p.practice);
  return {code:r.code,mode:r.mode,phase:r.phase,wave:r.wave,coreHp:r.coreHp,kills:r.kills,message:r.message,cache:r.cache,activities:r.activities,teamNews:r.teamNews,enemies:[...r.enemies,...training],shots:r.shots,fallen:r.fallen.filter(e=>!e.practiceOwner||teacher||e.practiceOwner===id),
    players:[...r.players.values()].map(p=>{
      const {id:pid,name,x,z,yaw,pitch,hp,weapon,shot,hit,editor,help}=p;
      const basic={id:pid,name,x,z,yaw,pitch,hp,weapon,shot,hit,editor,help,online:Date.now()-p.seen<5000};
      if(pid===id||teacher)Object.assign(basic,{epoch:p.epoch,ack:p.ack,coins:p.coins,kits:p.kits,owned:p.owned,ammo:p.ammo,reload:p.reload,walked:p.walked,hits:p.hits,gear:p.gear,discovered:p.discovered,ammoCacheUsed:p.ammoCacheUsed,practicing:Boolean(p.practice),practiceWins:p.practiceWins});
      if(teacher)Object.assign(basic,{draft:p.draft,code:p.code});
      return basic;
    })};
}
