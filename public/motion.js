import {clamp} from './rules.js';

// Both simulations use the student's running program, including custom key bindings.
export const buttons = ['w','s','a','d','shift','mouse','r','q','click'];
const bits = Object.fromEntries(buttons.map((name,i)=>[name,1<<i]));
export function inputMask(keys,tap=false){
  let mask=tap?bits.click:0;
  for(const key of keys)mask|=bits[key]||0;
  return mask;
}
export function commandsFor(code,mask,hp,ammo){
  const commands=new Set();
  if(code.loop)for(const rule of code.rules){
    const on=rule.when==='empty'?ammo===0:rule.when==='low'?hp<40:Boolean(mask&bits[rule.when]);
    if(on && rule.do)commands.add(rule.do);
  }
  return commands;
}
export function move(point,commands,yaw,dt){
  const front=Number(commands.has('forward'))-Number(commands.has('back'));
  const side=Number(commands.has('right'))-Number(commands.has('left'));
  if(!front&&!side)return false;
  const distance=(commands.has('sprint')?7:4.5)*dt/Math.hypot(front,side);
  const sin=Math.sin(yaw),cos=Math.cos(yaw);
  point.x=clamp(point.x+(front*sin+side*cos)*distance,-23,23);
  point.z=clamp(point.z+(front*cos-side*sin)*distance,-23,23);
  return true;
}

// Each sample describes elapsed input, never a position supplied by the client.
export class PredictedMotion {
  constructor(){this.epoch=-1;this.seq=0;this.pending=[];this.x=0;this.z=0;this.errorX=0;this.errorZ=0;}
  advance(code,mask,yaw,dt,hp,ammo){
    if(this.pending.length>=180 || dt<=0 || this.epoch<0)return;
    dt=Math.min(dt,.06);
    if(move(this,commandsFor(code,mask,hp,ammo),yaw,dt)){
      this.pending.push({seq:++this.seq,mask,yaw,dt});
    }
  }
  reconcile(player,code,paused){
    const beforeX=this.x,beforeZ=this.z,sameEpoch=this.epoch===player.epoch;
    const {epoch,ack}=player;
    if(this.epoch!==epoch || paused)this.pending=[];
    this.epoch=epoch;this.seq=Math.max(this.seq,ack);
    this.pending=this.pending.filter(s=>s.seq>ack);
    this.x=player.x;this.z=player.z;
    for(const s of this.pending)move(this,commandsFor(code,s.mask,player.hp,player.ammo),s.yaw,s.dt);
    if(sameEpoch&&!paused&&Math.hypot(beforeX-this.x,beforeZ-this.z)<2){
      this.errorX+=beforeX-this.x;this.errorZ+=beforeZ-this.z;
    }else this.errorX=this.errorZ=0;
  }
  renderPosition(dt){
    const decay=Math.exp(-14*dt);this.errorX*=decay;this.errorZ*=decay;
    return {x:this.x+this.errorX,z:this.z+this.errorZ};
  }
}
