import {core,targets} from './rules.js';
function surface(canvas){
  const width=Math.max(1,Math.round(canvas.clientWidth)),height=Math.max(1,Math.round(canvas.clientHeight));
  const scale=Math.min(canvas.id==='world'?1:1.25,window.devicePixelRatio||1,1600/width);
  if(canvas.width!==Math.round(width*scale)||canvas.height!==Math.round(height*scale)){canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);}
  const g=canvas.getContext('2d');g.setTransform(scale,0,0,scale,0,0);return {w:width,h:height,g};
}
function polygon(g,points,color){g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
function noise(i){return ((Math.sin(i*127.1+311.7)*43758.5453)%1+1)%1;}
export function cover(canvas){
  if(!canvas.clientWidth)return;
  const {w,h,g}=surface(canvas); const grad=g.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#708091');grad.addColorStop(.48,'#9e9291');grad.addColorStop(1,'#2c3949');g.fillStyle=grad;g.fillRect(0,0,w,h);
  const unit=Math.min(w/730,h/530);g.save();g.translate(w*.71,h*.27);g.fillStyle='#b9aa96';g.beginPath();g.arc(0,0,61*unit,0,7);g.fill();g.strokeStyle='#aa9f9188';for(const radius of [75,81]){g.beginPath();g.arc(0,0,radius*unit,0,7);g.stroke();}g.restore();
  for(let layer=0;layer<3;layer++){const pts=[[0,h]];for(let i=-1;i<=19;i++)pts.push([w*i/18,h*(.37+layer*.085-.16*noise(24*layer+i))]);pts.push([w,h]);polygon(g,pts,['#788396','#65758a','#53667a'][layer]);}
  function pine(x,y,s,c){g.fillStyle=c;g.fillRect(x-s*.033,y-s*.69,s*.066,s*.69);for(let k=0;k<3;k++){const base=y-s*(.08+k*.22),spread=s*(.26-k*.054);polygon(g,[[x,base-s*.51],[x-spread,base],[x+spread,base]],c);}}
  for(let layer=0;layer<2;layer++)for(let i=0;i<75;i++){let x=w*(i+noise(i)*.5)/73,y=h*(.54+layer*.12+noise(i+20)*.045);pine(x,y,unit*(24+noise(i+layer*23)*57),['#485b6e','#3a5060'][layer]);}
  polygon(g,[[0,h*.61],[w*.46,h*.65],[w*.76,h*.53],[w,h*.58],[w,h],[0,h]],'#374959');
  g.save();g.translate(w*.67,h*.60);g.scale(unit,unit);
  function pole(x,y,ex,ey,size){g.strokeStyle='#283645';g.lineWidth=size;g.beginPath();g.moveTo(x,y);g.lineTo(ex,ey);g.stroke();}
  for(let i=0;i<3;i++)pole(-40+i*37,-65,-62+i*53,60,7);
  pole(-49,23,34,-50,4);pole(41,23,-37,-50,4);
  polygon(g,[[-55,-107],[34,-107],[34,-60],[-55,-60]],'#2e4352');polygon(g,[[34,-107],[55,-117],[55,-70],[34,-60]],'#243442');
  for(let i=0;i<4;i++)polygon(g,[[-49+i*21,-99],[-33+i*21,-99],[-33+i*21,-84],[-49+i*21,-84]],i===2?'#b69a73':'#81929a');
  polygon(g,[[-67,-106],[-48,-121],[43,-121],[60,-115],[34,-103]],'#293847');pole(4,-120,4,-159,3);pole(4,-151,24,-157,2);
  g.restore();
  polygon(g,[[w*.57,h*.62],[w*.65,h*.61],[w*.46,h*.80],[w*.58,h],[w*.18,h],[w*.34,h*.81]],'#797a77');
  for(let i=0;i<17;i++){const x=w*noise(i+80);if(x>w*.25&&x<w*.81)continue;pine(x,h*(.8+.23*noise(2*i+41)),unit*(65+noise(3*i)*137),'#253644');}
  for(const [x,y,size] of [[.58,.73,1],[.7,.69,.73],[.47,.75,.85]]){
    g.save();g.translate(w*x,h*y);g.scale(unit*size,unit*size);g.fillStyle='#2f4452';g.fillRect(-8,-22,15,16);g.fillStyle='#738b85';g.fillRect(-6,-34,12,12);g.fillStyle='#b69d78';g.fillRect(-4,-31,3,2);g.fillRect(2,-31,3,2);g.fillStyle='#23333d';g.fillRect(-7,-6,5,10);g.fillRect(2,-6,6,10);g.restore();}
}
const faces=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7],[0,3,2,1]];
function box(x,y,z,sx,sy,sz,palette){
  const left=x-sx/2,right=x+sx/2,near=z-sz/2,far=z+sz/2,top=y+sy;
  const vertices=[[left,y,near],[right,y,near],[right,y,far],[left,y,far],[left,top,near],[right,top,near],[right,top,far],[left,top,far]];
  return {x,y,z,left,right,near,far,top,radius:(sx+sz)/2,palette,vertices};
}
const scenery=[];
for(let i=0;i<52;i++){
  const a=i/52*Math.PI*2,r=27+noise(i)*6,x=Math.sin(a)*r,z=Math.cos(a)*r,s=1+noise(i+8);
  scenery.push(box(x,0,z,.48,1.8,.48,'wood'),box(x,1.3,z,2*s,2*s,2*s,'green'),box(x,1.3+2*s,z,1.2*s,1.2*s,1.2*s,'green'));
}
for(let i=0;i<32;i++){const a=i/32*Math.PI*2;scenery.push(box(Math.sin(a)*23.8,0,Math.cos(a)*23.8,.35,1.1,.35,'wood'));}
for(const t of targets)scenery.push(box(t.x,0,t.z,.21,1.2,.19,'wood'),box(t.x,1.05,t.z,.94,.77,.12,'red'),box(t.x,1.28,t.z-.08,.4,.29,.04,'cream'));
const disc=r=>Array.from({length:48},(_,i)=>[Math.cos(i*Math.PI/24)*r,0,Math.sin(i*Math.PI/24)*r]);
const baseRings=[disc(5),disc(4.82)];
const paint={wood:['#675649','#85715b','#514943'],green:['#4c6463','#788a82','#3e5355'],dark:['#293c48','#4d616b','#21323c'],cream:['#929c9e','#b9b2a4','#79868a'],teal:['#587e83','#8daba7','#48656c'],amber:['#aa875e','#c5ad7f','#886d53'],red:['#9b655c','#c29b82','#744f4d'],blue:['#486379','#7e96a6','#3b5063']};
export function scene(canvas,state,me,view=me,first=true){
  if(!canvas.clientWidth||!me)return;
  const {w,h,g}=surface(canvas),f=w*.68, horizon=h*.5+Math.tan(view.pitch||0)*f;
  const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#64788d');sky.addColorStop(.58,'#9a9eaa');sky.addColorStop(1,'#838e96');
  g.fillStyle=sky;g.fillRect(0,0,w,h);
  const cloud=[[0,horizon+3]];for(let i=-1;i<=40;i++)cloud.push([i*w/39,horizon-7-(8+6*Math.cos(i*.49+view.yaw*2))*Math.abs(Math.sin(i*.38+view.yaw*3))]);cloud.push([w,horizon+3]);polygon(g,cloud,'#748491');
  g.fillStyle='#627070';g.fillRect(0,horizon,w,h-horizon);
  const sin=Math.sin(view.yaw),cos=Math.cos(view.yaw);
  const camera=([x,y,z])=>[(x-me.x)*cos-(z-me.z)*sin,y-1.35,(x-me.x)*sin+(z-me.z)*cos];
  const project=([x,y,z])=>[w/2+x*f/z,horizon-y*f/z];
  function clip(points){let arr=[];for(let i=0;i<points.length;i++){let a=points[i],b=points[(i+1)%points.length];if(a[2]>=.12)arr.push(a);
    if((a[2]>=.12)!==(b[2]>=.12)){const t=(.12-a[2])/(b[2]-a[2]);arr.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),.12]);}}return arr;}
  function ground(pts,color){const p=clip(pts.map(camera));if(p.length>=3)polygon(g,p.map(project),color);}
  ground([[-1.8,0,0],[1.8,0,0],[1.8,0,24],[-1.8,0,24]],'#80817a');
  ground(baseRings[0],'#93abb0');ground(baseRings[1],'#4e6569');
  for(let z=1;z<8;z+=1.5)ground([[-.35,0,z],[0,0,z+.38],[.35,0,z],[0,0,z+.17]],'#93a1a0');
  let queue=[];
  function drawBox(b){
    const a=camera([b.x,b.y,b.z]);if(a[2]<-b.radius||Math.abs(a[0])>Math.max(0,a[2])*.9+2*b.radius)return;
    const colors=paint[b.palette],vertices=b.vertices.map(camera);
    const visible=[me.z<=b.near,me.x>=b.right,me.z>=b.far,me.x<=b.left,1.35>=b.top,1.35<=b.y];
    for(const [i,face] of faces.entries()){
      if(!visible[i])continue;
      const p=clip(face.map(j=>vertices[j]));if(p.length<3)continue;
      queue.push([p.reduce((n,v)=>n+v[2],0)/p.length,p.map(project),colors[i===4?1:i%2===0?0:2]]);
    }
  }
  for(const b of scenery)drawBox(b);
  const cube=(...args)=>drawBox(box(...args));
  if(state.mode==='defense'){cube(core.x,0,core.z,2,1.6,2,'blue');cube(core.x,1.6,core.z,1.45,.4,1.45,'teal');}
  if(state.cache&&!state.cache.claimed&&state.phase==='active'){const c=state.cache;cube(c.x,0,c.z,1.4,.9,1,'amber');cube(c.x,.9,c.z,1.5,.2,1.1,'cream');cube(c.x,1.1,c.z,.12,2.8,.12,'amber');}
  const labels=[];
  function actor(p,zombie){
    const s=p.type==='boss'?1.85:p.type==='swarm'?.77:1,body=zombie?(p.type==='runner'?'amber':p.type==='brute'?'red':'dark'):'blue';
    const part=(dx,y,dz,a,b,c,col)=>cube(p.x+dx*s,y*s,p.z+dz*s,a*s,b*s,c*s,col);
    for(const side of [-1,1]){part(side*.18,0,0,.23,.58,.3,'dark');part(side*.49,.77,.11,.22,.52,.32,zombie?'green':'cream');}
    part(0,.53,0,.76,.76,.44,body);part(0,1.29,0,.54,.52,.5,zombie?'green':'cream');part(0,1.45,0,.55,.11,.51,zombie?'amber':'teal');
    labels.push([p,p.name||(p.type==='boss'?'BOSS':''),s*2]);
  }
  for(const e of state.enemies)actor(e,true);for(const p of state.players)if(p.id!==me.id&&p.online)actor(p,false);
  queue.sort((a,b)=>b[0]-a[0]);for(const [,pts,color] of queue)polygon(g,pts,color);
  for(const shot of state.shots){let aa=camera([shot.x,1.1,shot.z]),b=camera([shot.tx,shot.y,shot.tz]);if(b[2]<.2)continue;if(aa[2]<.2){const ratio=(.2-aa[2])/(b[2]-aa[2]);aa=aa.map((v,i)=>v+(b[i]-v)*ratio);}
    const [x,y]=project(aa),[xx,yy]=project(b);g.strokeStyle='#d2b386';g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();}
  for(const [p,name,up] of labels){const a=camera([p.x,up,p.z]);if(a[2]<.5)continue;const [x,y]=project(a);if(name){g.textAlign='center';g.font='bold 12px sans-serif';g.fillStyle='#202e3c';g.fillText(name,x,y-3);}if(p.max){g.fillStyle='#33424e';g.fillRect(x-12,y,24,3);g.fillStyle='#ba9772';g.fillRect(x-12,y,24*p.hp/p.max,3);}}
  if(first){const shake=me.flash||0;g.save();g.translate(w*.64,h+shake*6);g.scale(Math.min(w,h)/520,Math.min(w,h)/520);polygon(g,[[-25,2],[13,-68],[44,-73],[147,2]],'#30404f');polygon(g,[[11,-69],[12,-102],[49,-112],[109,-66],[101,-48]],'#536572');polygon(g,[[12,-102],[25,-111],[59,-116],[49,-103]],'#9ba5a5');polygon(g,[[15,-94],[29,-96],[32,-89],[16,-87]],'#ad9474');g.restore();}
}
