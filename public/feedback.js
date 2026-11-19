import {safe,weapons} from './rules.js';
import {commandsFor} from './motion.js';
export class GunFeedback {
  constructor(){this.epoch=-1;this.predicted=0;this.next=0;this.kick=0;this.velocity=0;this.lastFire=-10;this.weapon='pulse';}
  sync(player){
    if(player.epoch!==this.epoch||player.weapon!==this.weapon){
      this.predicted=player.shot;this.next=0;this.kick=0;this.velocity=0;
    }
    if(player.reload>0&&!(this.reload>0))this.predicted=player.shot;
    this.reload=player.reload;
    this.epoch=player.epoch;this.weapon=player.weapon;this.predicted=Math.max(this.predicted,player.shot);
  }
  update(dt,now,player,code,mask,enabled){
    // Critically damped spring keeps recoil continuous across frames.
    this.velocity+=(-150*this.kick-22*this.velocity)*dt;
    this.kick=Math.max(0,this.kick+this.velocity*dt);
    if(!enabled||safe(player.x,player.z)||player.reload>0||now<this.next)return false;
    const available=player.ammo-Math.max(0,this.predicted-player.shot);
    if(available<=0||!commandsFor(code,mask,player.hp,available).has('fire'))return false;
    this.predicted++;this.next=now+weapons[player.weapon].delay;this.lastFire=now;
    this.velocity+=player.weapon==='scatter'?8:player.weapon==='rapid'?3.4:5.3;
    this.kick+=.16;return true;
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
