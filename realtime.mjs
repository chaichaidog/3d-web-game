import {WebSocketServer,WebSocket} from './vendor/ws/wrapper.mjs';
import {cleanInput,snapshot} from './game.mjs';

// Tokens travel in the first encrypted frame, never in a URL or access log.
export function realtime(server,sessions,api){
  const wss=new WebSocketServer({noServer:true,maxPayload:32768,perMessageDeflate:false});
  server.on('upgrade',(req,socket,head)=>{
    socket.on('error',()=>{});
    try{
      if(new URL(req.url,'http://localhost').pathname!=='/live')return socket.destroy();
      if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return socket.destroy();
      wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
    }catch{socket.destroy();}
  });
  wss.on('connection',(ws,req)=>{
    let auth=null,token='',messages=0,bucket=Date.now(),lastInput=Date.now();
    const timeout=setTimeout(()=>{if(!auth)ws.close(4001,'Sign in required');},5000);
    ws.on('error',()=>{});
    ws.on('close',()=>{clearTimeout(timeout);if(auth?.p){auth.p.keys=[];auth.p.tap=false;}});
    ws.on('message',(bytes,binary)=>{
      try{
        if(binary)throw Error('Text required');
        const now=Date.now();if(now-bucket>1000){bucket=now;messages=0;}if(++messages>100){ws.close(4008,'Too many messages');return;}
        const msg=JSON.parse(bytes.toString());if(!msg||typeof msg!=='object')throw Error('Invalid message');
        if(!auth){
          if(msg.kind!=='auth'||!sessions.has(msg.token)){ws.close(4001,'Session ended');return;}
          token=msg.token;auth=sessions.get(token);ws.auth=auth;clearTimeout(timeout);
          ws.send(JSON.stringify({kind:'ready'}));return;
        }
        if(sessions.get(token)!==auth){ws.close(4001,'Session ended');return;}
        auth.r.touched=now;if(auth.p)auth.p.seen=now;lastInput=now;
        if(msg.kind==='input'){
          if(auth.p)cleanInput(auth.p,msg.data||{},auth.r.phase==='paused');
          if(Number.isFinite(msg.clientTime))ws.clientTime=msg.clientTime;
        }else if(msg.kind==='rpc'){
          if(!['teacher','restore','draft','run','shop','home','help'].includes(msg.op))throw Error('Unknown operation');
          const data=api(msg.op,msg.data||{},{headers:{authorization:'Bearer '+token},socket:req.socket});
          ws.send(JSON.stringify({kind:'reply',id:msg.id,data}));
        }
      }catch(err){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({kind:'reply',id:(()=>{try{return JSON.parse(bytes).id;}catch{return null;}})(),error:err.message,status:err.status||400}));}
    });
    ws.isIdle=()=>Date.now()-lastInput>12000;
  });
  let frame=0;
  const timer=setInterval(()=>{
    frame++;
    for(const ws of wss.clients){
      if(!ws.auth||ws.readyState!==WebSocket.OPEN)continue;
      if(ws.isIdle()){ws.close(4000,'Reconnect');continue;}
      if(ws.bufferedAmount>131072)continue; // Slow connections get the newest snapshot, not a growing queue.
      const {r,p}=ws.auth;if(!p&&frame%4!==0)continue;
      ws.send(JSON.stringify({kind:'state',serverTime:Date.now(),clientTime:ws.clientTime,state:snapshot(r,p?.id,!p)}));
    }
  },50);timer.unref();
  server.on('close',()=>{clearInterval(timer);for(const ws of wss.clients)ws.terminate();wss.close();});
  return wss;
}
