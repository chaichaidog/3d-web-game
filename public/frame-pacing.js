// Draw every refresh at 60/75 Hz, or at an even divisor on faster displays.
// Comparing each frame to a fixed time threshold can skip an extra refresh on 120/144 Hz monitors.
export class FramePacer {
  constructor(){this.reset();}
  reset(){this.interval=null;this.previous=null;this.skipped=0;}
  draw(now){
    const gap=this.previous===null?0:now-this.previous;
    this.previous=now;
    if(gap>=3&&gap<=25){
      if(this.interval===null)this.interval=gap;
      else this.interval+=(gap-this.interval)*(gap<this.interval?.25:.04);
    }
    const divisor=this.interval===null?1:Math.max(1,Math.round(1000/this.interval/65));
    if(this.skipped+1<divisor){this.skipped++;return false;}
    this.skipped=0;return true;
  }
}
