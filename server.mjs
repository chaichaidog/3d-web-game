import http from 'node:http';
import {randomInt,randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import {room,player,edit,buy,cleanInput,control,home,snapshot,tick} from './game.mjs';

const publicDir=fileURLToPath(new URL('./public/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
const rooms=new Map(), sessions=new Map(), attempts=new Map();
const teacherKey=process.env.TEACHER_KEY || randomBytes(9).toString('hex');
if(!process.env.TEACHER_KEY && !process.env.RENDER)console.log('Local teacher key:',teacherKey);
function fail(message,status=400){throw Object.assign(Error(message),{status});}
function session(r,p){
  const token=randomBytes(32).toString('hex');sessions.set(token,{r,p});
  return {token,code:r.code,id:p?.id??null,teacher:!p};
}
function rate(req){
  const ip=req.socket.remoteAddress, now=Date.now();let record=attempts.get(ip);
  if(!record||now-record.start>60000){record={start:now,n:0};attempts.set(ip,record);}
  if(++record.n>180)fail('請稍等一下再試',429);
}
async function json(req){
  let bytes=0, chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>32768)fail('資料過大',413);chunks.push(chunk);}
  try { const data=JSON.parse(Buffer.concat(chunks).toString()||'{}');if(data && typeof data==='object'&&!Array.isArray(data))return data;}catch{}
  fail('無法讀取資料');
}
function api(name,body,req){
  if(name==='create'){
    rate(req);
    const k=Buffer.from(String(body.key??'')),actual=Buffer.from(teacherKey);
    if(k.length!==actual.length||!timingSafeEqual(k,actual))fail('老師開房密碼不正確',403);
    if(rooms.size>=60)fail('房間已滿',429);
    let code;do{code=String(randomInt(100000,1000000));}while(rooms.has(code));
    const r=room(code);rooms.set(code,r);return session(r,null);
  }
  if(name==='join'){
    rate(req);const r=rooms.get(String(body.code));if(!r)fail('找不到這個房間',404);
    const nickname=String(body.name??'').trim().slice(0,16);
    if(!nickname)fail('請填遊戲暱稱');if(r.players.size>=12)fail('房間已滿');
    const p=player(nickname);r.players.set(p.id,p);return session(r,p);
  }
  const auth=sessions.get(req.headers.authorization?.replace(/^Bearer /,''));
  if(!auth)fail('房間已結束，請重新加入',401);
  const {r,p}=auth;r.touched=Date.now();
  if(p)p.seen=Date.now();
  if(name==='sync'){
    if(p)cleanInput(p,body);
    return snapshot(r,p?.id,!p);
  }
  if(name==='teacher'){if(p)fail('限老師使用',403);control(r,body.cmd,body.mode);return {};}
  if(name==='restore'){return p?{draft:p.draft,code:p.code}:{};}
  if(!p)fail('限學生角色使用');
  switch(name){
    case 'draft':case 'run':edit(p,body,name==='run');break;
    case 'shop':buy(p,body.item);break;
    case 'home':home(p);break;
    case 'help':p.help=Boolean(body.on);break;
    default:fail('查無操作',404);
  }
  return {};
}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  try{
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/healthz'){res.writeHead(200);return res.end('ok');}
    if(path.startsWith('/api/')){
      if(req.method!=='POST')fail('限 POST',405);
      if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host)fail('來源不符',403);
      const data=api(path.slice(5),await json(req),req);
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify(data));
    }
    if(req.method!=='GET'||!/^\/(?:[a-z-]+\.(?:js|css|svg)|index\.html)?$/.test(path))fail('找不到頁面',404);
    const filename=resolve(publicDir,path==='/'?'index.html':path.slice(1));
    const file=await readFile(filename).catch(()=>fail('找不到檔案',404));
    res.writeHead(200,{'Content-Type':types[extname(filename)]+'; charset=utf-8'});res.end(file);
  }catch(err){if(!res.headersSent)res.writeHead(err.status||400,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({error:err.message}));}
});
setInterval(()=>{for(const r of rooms.values())tick(r,.05);},50).unref();
setInterval(()=>{
  const now=Date.now();for(const [key,a] of attempts)if(now-a.start>60000)attempts.delete(key);
  for(const [code,r] of rooms)if(now-r.touched>2*60*60*1000){rooms.delete(code);for(const [k,s] of sessions)if(s.r===r)sessions.delete(k);}
},60000).unref();
if(process.env.OUTPOST_TEST_SOCKET)server.listen(process.env.OUTPOST_TEST_SOCKET,()=>console.log('HTTP test listener ready'));
else server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Listening on port',server.address().port));
