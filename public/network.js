// One ordered connection carries controls and RPCs. State arrives independently at 20 Hz.
export class LiveConnection{
  constructor(session,onState,onStatus,onExpired){
    this.session=session;this.onState=onState;this.onStatus=onStatus;this.onExpired=onExpired;
    this.waiting=new Map();this.serial=0;this.ready=false;this.rtt=0;this.retries=0;this.closed=false;
    this.connect();
  }
  connect(){
    if(this.closed)return;
    const ws=this.ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/live');
    this.onStatus(false);this.lastSent=0;
    const timeout=setTimeout(()=>{if(!this.ready)ws.close();},6500);
    ws.onopen=()=>ws.send(JSON.stringify({kind:'auth',token:this.session.token}));
    ws.onmessage=e=>{
      let m;try{m=JSON.parse(e.data);}catch{return;}
      if(m.kind==='ready'){this.ready=true;this.retries=0;clearTimeout(timeout);this.onStatus(true);}
      else if(m.kind==='state'){
        if(Number.isFinite(m.clientTime))this.rtt=this.rtt*.7+(performance.now()-m.clientTime)*.3;
        this.onState(m.state,m.serverTime);
      }else if(m.kind==='reply'){
        const p=this.waiting.get(m.id);if(!p)return;
        this.waiting.delete(m.id);clearTimeout(p.timeout);
        if(m.error)p.reject(Object.assign(Error(m.error),{status:m.status}));else p.resolve(m.data);
      }
    };
    ws.onerror=()=>{};
    ws.onclose=e=>{
      clearTimeout(timeout);this.ready=false;this.onStatus(false);
      for(const p of this.waiting.values()){clearTimeout(p.timeout);p.reject(Error('連線中斷，請稍後再試'));}this.waiting.clear();
      if(e.code===4001){this.closed=true;this.onExpired();return;}
      if(!this.closed)this.retry=setTimeout(()=>this.connect(),Math.min(3000,350*2**this.retries++));
    };
  }
  input(data){
    if(!this.ready||this.ws.bufferedAmount>16384)return false;
    const steps=data.steps.filter(s=>s.seq>this.lastSent);
    this.ws.send(JSON.stringify({kind:'input',clientTime:performance.now(),data:{...data,steps}}));
    if(steps.length)this.lastSent=steps[steps.length-1].seq;
    return true;
  }
  call(op,data){
    if(!this.ready)return Promise.reject(Error('正在重新連線，請稍後再試'));
    return new Promise((resolve,reject)=>{
      const id=++this.serial,timeout=setTimeout(()=>{this.waiting.delete(id);reject(Error('連線較慢，請再試一次'));},6000);
      this.waiting.set(id,{resolve,reject,timeout});
      this.ws.send(JSON.stringify({kind:'rpc',id,op,data}));
    });
  }
  close(){this.closed=true;clearTimeout(this.retry);this.ws.close();}
}
