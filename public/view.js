import {Renderer,identity,transform,multiply,cameraMatrix} from './mesh.js';
import {part,joint,character,weapon,muzzle,landscape} from './models.js';
import {core,targets,weapons} from './rules.js';
import {traceShot} from './aim.js';
export {cover} from './cover.js';

const views=new WeakMap(),scenery=landscape();
function getView(canvas){
  if(!views.has(canvas))views.set(canvas,{renderer:new Renderer(canvas),poses:new Map(),seen:new Map(),traces:[],sparks:[],last:performance.now()/1000,time:0,walk:0,lastEye:null,speed:0});
  return views.get(canvas);
}
export function localShot(canvas,state,player){
  const v=getView(canvas),now=performance.now()/1000,spread=weapons[player.weapon].spread;
  for(const delta of spread?[-spread,0,spread]:[0]){
    const {nearest,...ray}=traceShot(player,[...state.enemies,...targets],delta);
    v.traces.push({...ray,born:now,local:true,yaw:player.yaw});
  }
}
function poseFor(v,actor,dt){
  let pose=v.poses.get(actor.id);
  if(!pose){pose={x:actor.x,z:actor.z,yaw:actor.yaw||0,phase:0,speed:0,hit:actor.hit||0,attackCount:actor.attack||0,pain:0,attack:0,shotCount:actor.shot||0,shot:0};v.poses.set(actor.id,pose);}
  const distance=Math.hypot(actor.x-pose.x,actor.z-pose.z);
  const speed=dt>0?Math.min(distance/dt,8):0;
  pose.speed+=(speed-pose.speed)*(1-Math.exp(-12*dt));
  if(distance<2)pose.phase+=distance*5;
  pose.x=actor.x;pose.z=actor.z;
  const targetYaw=actor.yaw??pose.yaw,diff=targetYaw-pose.yaw;
  pose.yaw+=Math.atan2(Math.sin(diff),Math.cos(diff))*(1-Math.exp(-12*dt));
  if((actor.hit||0)>pose.hit){pose.pain=1;pose.hit=actor.hit;}
  if((actor.attack||0)>pose.attackCount){pose.attack=1;pose.attackCount=actor.attack;}
  if((actor.shot||0)>pose.shotCount){pose.shot=1;pose.shotCount=actor.shot;}
  pose.pain=Math.max(0,pose.pain-dt*4);pose.attack=Math.max(0,pose.attack-dt*3);pose.shot=Math.max(0,pose.shot-dt*8);
  pose.time=v.time;return pose;
}
function beam(out,from,to,width,tint,alpha=1){
  const dx=to[0]-from[0],dy=to[1]-from[1],dz=to[2]-from[2],length=Math.hypot(dx,dy,dz);
  if(length<.001)return;
  const root=transform((from[0]+to[0])/2,(from[1]+to[1])/2,(from[2]+to[2])/2,0,Math.atan2(dx,dz),0);
  part(out,root,'cylinder',0,0,0,width,length,width,tint,Math.acos(dy/length),0,0,alpha,1);
}
function updateEffects(v,state,me,now){
  for(const shot of state.shots){
    if(v.seen.has(shot.id))continue;v.seen.set(shot.id,now);
    if(shot.owner!==me.id)v.traces.push({...shot,born:now,local:false,yaw:Math.atan2(shot.tx-shot.x,shot.tz-shot.z)});
    if(shot.impact!=='none'){
      for(let i=0;i<7;i++){
        const a=i*2.4;
        v.sparks.push({x:shot.tx,y:shot.y,z:shot.tz,vx:Math.sin(a)*(.5+i*.12),vy:.4+(i%3)*.4,vz:Math.cos(a)*(.6+i*.1),born:now,tint:shot.impact==='target'?'#c4ad80':'#8aa3a0'});
      }
    }
  }
  v.traces=v.traces.filter(t=>now-t.born<.14);
  v.sparks=v.sparks.filter(s=>now-s.born<.32);
  for(const [id,at] of v.seen)if(now-at>3)v.seen.delete(id);
}
function labels(v,canvas,state,me,matrix){
  if(!v.labels){
    v.labels=document.createElement('canvas');v.labels.className='model-labels';v.labels.setAttribute('aria-hidden','true');
    canvas.parentElement.style.position='relative';canvas.parentElement.append(v.labels);
    Object.assign(v.labels.style,{position:'absolute',pointerEvents:'none',background:'transparent'});
  }
  const label=v.labels,w=canvas.clientWidth,h=canvas.clientHeight;
  if(label.width!==w||label.height!==h){label.width=w;label.height=h;}
  Object.assign(label.style,{left:canvas.offsetLeft+'px',top:canvas.offsetTop+'px',width:w+'px',height:h+'px'});
  const g=label.getContext('2d');g.clearRect(0,0,w,h);g.textAlign='center';g.font='600 12px "Microsoft JhengHei",sans-serif';
  for(const p of [...state.enemies,...state.players.filter(p=>p.online&&p.id!==me.id)]){
    const height=p.type==='boss'?3.85:p.type==='swarm'?1.65:2.15;
    const q=[p.x,height,p.z,1],projected=[0,1,2,3].map(row=>q.reduce((sum,n,col)=>sum+n*matrix[col*4+row],0));
    if(projected[3]<.1)continue;
    const x=w*(.5+projected[0]/projected[3]/2),y=h*(.5-projected[1]/projected[3]/2);
    const name=p.name||(p.type==='boss'?'巨型感染者':'');
    if(name){g.lineWidth=3;g.strokeStyle='#263746';g.strokeText(name,x,y-6);g.fillStyle='#d8e1e4';g.fillText(name,x,y-6);}
    if(p.max){g.fillStyle='#283a44';g.fillRect(x-16,y,32,4);g.fillStyle='#b49776';g.fillRect(x-16,y,32*Math.max(0,p.hp/p.max),4);}
  }
}
export function scene(canvas,state,me,view=me,first=true){
  if(!canvas.clientWidth||!me)return;
  let v;
  try{v=getView(canvas);}catch(err){canvas.dataset.error=err.message;canvas.setAttribute('aria-label',err.message);return;}
  const now=performance.now()/1000,dt=state.phase==='paused'?0:Math.min(now-v.last,.08);v.last=now;v.time+=dt;
  const out=scenery.slice(),root=identity();
  for(const t of targets){
    part(out,root,'cylinder',t.x,.55,t.z,.09,1.1,.09,'#7c817d');
    part(out,root,'cylinder',t.x,1.35,t.z,.95,.06,.95,'#a38470',Math.PI/2);
    part(out,root,'cylinder',t.x,1.35,t.z-.037,.6,.012,.6,'#d0c4ac',Math.PI/2);
    part(out,root,'cylinder',t.x,1.35,t.z-.046,.3,.012,.3,'#76544c',Math.PI/2);
    part(out,root,'cylinder',t.x,1.35,t.z-.055,.09,.012,.09,'#d0c4ac',Math.PI/2);
  }
  if(state.mode==='defense'){
    part(out,root,'box',core.x,.64,core.z,1.8,1.28,1.55,'#466478');
    part(out,root,'box',core.x,1.34,core.z,1.9,.16,1.65,'#8b9da4');
    for(let i=0;i<6;i++)part(out,root,'box',-.65+i*.26,.72,core.z-.8,.12,.55,.04,'#263e50');
    part(out,root,'cylinder',.5,1.6,core.z,.12,.4,.12,state.coreHp>30?'#87a794':'#b68269');
  }
  if(state.cache&&!state.cache.claimed&&state.phase==='active'){
    const c=state.cache;
    part(out,root,'box',c.x,.4,c.z,1.25,.8,.9,'#967959');
    part(out,root,'box',c.x,.85,c.z,1.35,.13,1,'#c0b18e');
    for(const s of [-1,1])part(out,root,'box',c.x+s*.4,.45,c.z-.46,.065,.9,.02,'#515f62');
  }
  const livingIds=new Set();
  for(const e of state.enemies){livingIds.add(e.id);character(out,e,poseFor(v,e,dt));}
  for(const p of state.players)if(p.id!==me.id&&p.online){
    livingIds.add(p.id);const pose=poseFor(v,p,dt);
    // Classmates share the spawn point; never put the camera inside their torso.
    if(Math.hypot(p.x-me.x,p.z-me.z)>.75)character(out,p,pose);
  }
  for(const e of state.fallen||[]){
    const pose=v.poses.get(e.id);
    if(!pose)continue;livingIds.add(e.id);
    const fall=1-e.t/.7,start=out.length;
    character(out,e,{...pose,speed:0,pain:0,attack:0});
    // Fall about the feet, then shrink into a brief dust puff.
    const pivot=transform(e.x,0,e.z,0,pose.yaw,0);
    const unpivot=transform(0,0,0,0,-pose.yaw);
    unpivot[12]=-Math.cos(pose.yaw)*e.x+Math.sin(pose.yaw)*e.z;
    unpivot[14]=-Math.sin(pose.yaw)*e.x-Math.cos(pose.yaw)*e.z;
    const collapse=multiply(pivot,multiply(transform(0,-fall*.1,0,Math.min(1,fall*2)*1.3,0,0,Math.max(.02,1-fall*.8)),unpivot));
    for(let i=start;i<out.length;i++)out[i].matrix=multiply(collapse,out[i].matrix);
  }
  for(const id of v.poses.keys())if(!livingIds.has(id))v.poses.delete(id);
  updateEffects(v,state,me,now);
  for(const t of v.traces){
    const age=(now-t.born)/.14,progress=Math.min(1,age*3),tail=Math.max(0,progress-.28);
    const sx=t.x+Math.cos(t.yaw)*.16,sz=t.z-Math.sin(t.yaw)*.16,sy=1.21;
    const point=a=>[sx+(t.tx-sx)*a,sy+(t.y-sy)*a,sz+(t.tz-sz)*a];
    beam(out,point(tail),point(progress),.014,'#cbb58f',Math.max(0,1-age));
  }
  for(const s of v.sparks){
    const age=now-s.born;part(out,root,'sphere',s.x+s.vx*age,s.y+s.vy*age-3*age*age,s.z+s.vz*age,.035,.035,.035,s.tint,0,0,0,1-age/.32,1);
  }
  const distance=v.lastEye?Math.hypot(me.x-v.lastEye.x,me.z-v.lastEye.z):0;
  if(distance<1)v.walk+=distance*4.5;
  v.speed+=(Math.min(dt?distance/dt:0,7)-v.speed)*(1-Math.exp(-8*dt));v.lastEye={x:me.x,z:me.z};
  const eye=[me.x,1.35,me.z],aspect=canvas.clientWidth/canvas.clientHeight;
  const matrix=cameraMatrix(...eye,view.yaw,view.pitch,aspect);
  v.renderer.render(out,matrix,eye);labels(v,canvas,state,me,matrix);
  if(first){
    const weaponObjects=[],kick=view.kick??0,move=Math.min(v.speed/4.5,1);
    const reload=me.reload>0?Math.sin((1-me.reload)*Math.PI):0;
    const sway=Math.sin(v.walk)*.008*move,breath=Math.sin(v.time*1.8)*.0025;
    const weaponRoot=transform(.21+sway,-.22+breath+Math.cos(v.walk*2)*.005*move,.56,-.015,-.045,-sway*1.3);
    weapon(weaponObjects,weaponRoot,me.weapon,kick,reload);
    const flashAge=now-(view.lastFire??-10);
    if(flashAge<.085)muzzle(weaponObjects,joint(weaponRoot,0,.025,weapons[me.weapon].spread||me.weapon==='rapid'?.49:.32),me.weapon==='scatter'?.11:.075,flashAge);
    v.renderer.render(weaponObjects,cameraMatrix(0,0,0,0,0,aspect),[0,0,0],false);
  }
}
