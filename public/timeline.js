import {clamp} from './rules.js';
// Render a short time behind the server so packet arrival never becomes animation timing.
export class SnapshotTimeline{
  constructor(){this.frames=[];this.latestAt=0;this.serverNow=0;}
  push(state,serverTime,arrival){
    if(this.frames.length&&serverTime<=this.serverNow)return;
    this.frames.push({state,time:serverTime});this.frames=this.frames.slice(-20);
    this.serverNow=serverTime;this.latestAt=arrival;
  }
  sample(now,delay=100){
    const frames=this.frames;if(!frames.length)return null;
    const target=this.serverNow+now-this.latestAt-delay;
    let ai=frames.findIndex(f=>f.time>=target);
    if(ai===0)return frames[0].state;
    if(ai<0)ai=frames.length-1;
    const a=frames[Math.max(0,ai-1)],b=frames[ai],span=b.time-a.time||50;
    const t=clamp((target-a.time)/span,0,1+Math.min(100,span*2)/span);
    const blend=(p,old)=>{
      if(!old||p.epoch!==old.epoch||Math.hypot(p.x-old.x,p.z-old.z)>3)return p;
      const result={...p,x:old.x+(p.x-old.x)*t,z:old.z+(p.z-old.z)*t};
      if(Number.isFinite(p.yaw)&&Number.isFinite(old.yaw)){const d=p.yaw-old.yaw;result.yaw=old.yaw+Math.atan2(Math.sin(d),Math.cos(d))*Math.min(t,1);}
      if(Number.isFinite(p.pitch)&&Number.isFinite(old.pitch))result.pitch=old.pitch+(p.pitch-old.pitch)*Math.min(t,1);
      return result;
    };
    // Events/UI always use the newest state; only positions are delayed.
    const latest=frames[frames.length-1].state;
    return {...latest,enemies:b.state.enemies.filter(p=>latest.enemies.some(e=>e.id===p.id)).map(p=>blend(p,a.state.enemies.find(e=>e.id===p.id))),players:b.state.players.map(p=>blend(p,a.state.players.find(e=>e.id===p.id)))};
  }
}
