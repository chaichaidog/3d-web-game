import {safe,weapons,clamp} from './rules.js';
import {commandsFor} from './motion.js';
const smooth=(start,end,value)=>{const t=clamp((value-start)/(end-start),0,1);return t*t*(3-2*t);};
export function reloadPose(progress){
  if(progress==null)return {dip:0,cell:0,hand:0};
  return {
    dip:smooth(0,.22,progress)*(1-smooth(.72,1,progress)),
    cell:smooth(.18,.48,progress)*(1-smooth(.53,.82,progress)),
    hand:smooth(.12,.43,progress)*(1-smooth(.65,.94,progress))
  };
}
export class GunFeedback {
  constructor(){this.epoch=-1;this.predicted=0;this.next=0;this.kick=0;this.velocity=0;this.lastFire=-10;this.weapon='pulse';this.reloadStart=null;this.reload=0;}
  sync(player,now=performance.now()/1000){
    if(player.epoch!==this.epoch||player.weapon!==this.weapon){
      this.predicted=player.shot;this.next=0;this.kick=0;this.velocity=0;this.reloadStart=null;this.reload=0;this.lastFire=-10;
    }
    if(player.reload>0&&(!this.reload||this.reloadStart===null)){
      this.reloadStart=now-Math.max(0,weapons[player.weapon].reloadTime-player.reload);
      this.predicted=player.shot;
    }
    this.reload=player.reload;
    this.epoch=player.epoch;this.weapon=player.weapon;this.predicted=Math.max(this.predicted,player.shot);
  }
  reloadProgress(now){
    if(this.reloadStart===null)return null;
    return clamp((now-this.reloadStart)/weapons[this.weapon].reloadTime,0,1);
  }
  update(dt,now,player,code,mask,enabled){
    // Analytic spring has the same response across different frame rates.
    const rate=15,decay=Math.exp(-rate*dt),slope=this.velocity+rate*this.kick;
    this.kick=(this.kick+slope*dt)*decay;
    this.velocity=(this.velocity-rate*slope*dt)*decay;
    if(!enabled||safe(player.x,player.z)||player.reload>0||now<this.next)return false;
    const available=player.ammo-Math.max(0,this.predicted-player.shot);
    if(available<=0||!commandsFor(code,mask,player.hp,available).has('fire'))return false;
    this.predicted++;this.next=now+weapons[player.weapon].delay;this.lastFire=now;
    const strength=weapons[player.weapon].kick;
    this.velocity+=strength*13;
    this.kick=Math.min(1.3,this.kick+strength*.19);return true;
  }
}
let context=null,noise=null,enabled=true;
export function unlockAudio(){
  if(!enabled)return;
  const Constructor=window.AudioContext||window.webkitAudioContext;if(!Constructor)return;
  if(!context){
    context=new Constructor();noise=context.createBuffer(1,context.sampleRate*.2,context.sampleRate);
    const samples=noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  }
  if(context.state==='suspended')context.resume().catch(()=>{});
}
export function setSound(value){enabled=value;if(enabled)unlockAudio();}
export function sound(kind,weapon){
  if(!enabled||!context||context.state!=='running')return;
  const now=context.currentTime,hit=kind==='hit',scatter=weapon==='scatter',duration=hit?.055:scatter?.16:.09;
  const gain=context.createGain();gain.gain.setValueAtTime(hit?.024:scatter?.075:.045,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);gain.connect(context.destination);
  const oscillator=context.createOscillator();oscillator.type=hit?'sine':'triangle';oscillator.frequency.setValueAtTime(hit?1050:scatter?110:170,now);oscillator.frequency.exponentialRampToValueAtTime(hit?600:55,now+duration);oscillator.connect(gain);oscillator.start(now);oscillator.stop(now+duration);
  if(!hit){const source=context.createBufferSource(),filter=context.createBiquadFilter();source.buffer=noise;filter.type='lowpass';filter.frequency.value=scatter?1200:2300;source.connect(filter);filter.connect(gain);source.start(now);source.stop(now+duration);}
}
