// One map definition is shared by prediction, server collision, bullets and scenery.
export const WORLD_LIMIT=80;
export const landmarks=[
  {id:'town',name:'回聲街區',short:'街區',x:0,z:48,tint:'#b69c78',desc:'沿北路找廣場上的補給旗'},
  {id:'woods',name:'松影林地',short:'林地',x:-48,z:0,tint:'#8aa68b',desc:'往西走，穿過樹林找到營地'},
  {id:'depot',name:'轉運貨站',short:'貨站',x:48,z:0,tint:'#ba8d6e',desc:'往東走，找貨櫃間的集合點'},
  {id:'signal',name:'舊訊號站',short:'訊號站',x:0,z:-48,tint:'#84a3b4',desc:'往南走，沿路抵達高塔前'}
];
export const structures=[
  ...[-1,1].flatMap(s=>[36,58].map((z,i)=>({kind:'building',x:s*13,z,w:10,d:12,h:i?8:5,tint:i?'#66747c':'#8a8171'}))),
  ...[-1,1].flatMap(s=>[37,50,63].map((x,i)=>({kind:'container',x,z:s*11,w:9,d:4,h:2.7,tint:i%2?'#738b87':'#9b795f'}))),
  {kind:'building',x:-12,z:-49,w:12,d:14,h:4,tint:'#687b82'},
  {kind:'building',x:15,z:-60,w:8,d:10,h:3.4,tint:'#7d8479'},
  {kind:'cabin',x:-51,z:12,w:9,d:7,h:3,tint:'#807760'},
  {kind:'cabin',x:-62,z:-13,w:7,d:6,h:2.7,tint:'#686f62'}
];
export function blocked(x,z,radius=.3){
  return structures.some(b=>Math.abs(x-b.x)<b.w/2+radius&&Math.abs(z-b.z)<b.d/2+radius);
}
const bounded=n=>Math.max(-WORLD_LIMIT,Math.min(WORLD_LIMIT,n));
export function moveWorld(point,dx,dz,radius=.3){
  // Axis sliding lets students follow walls instead of snagging on corners.
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.25));
  for(let i=0;i<steps;i++){
    const x=bounded(point.x+dx/steps);if(!blocked(x,point.z,radius))point.x=x;
    const z=bounded(point.z+dz/steps);if(!blocked(point.x,z,radius))point.z=z;
  }
}
export function wallDistance(x,z,dx,dz,pitch,limit=45,padding=0){
  let nearest=limit;
  const dy=Math.tan(pitch);
  for(const b of structures){
    let enter=0,leave=nearest;
    const halfW=b.w/2+padding,halfD=b.d/2+padding;
    const bounds=[[x,dx,b.x-halfW,b.x+halfW],[z,dz,b.z-halfD,b.z+halfD],[1.35,dy,0,b.h]];
    for(const [at,dir,low,high] of bounds){
      if(Math.abs(dir)<1e-8){if(at<low||at>high){leave=-1;break;}continue;}
      let a=(low-at)/dir,c=(high-at)/dir;if(a>c)[a,c]=[c,a];enter=Math.max(enter,a);leave=Math.min(leave,c);
    }
    if(leave>=enter&&enter<nearest)nearest=enter;
  }
  return nearest;
}
// Enemy navigation uses a small static grid; walls have the same shape as rendering.
const CELL=2,COUNT=WORLD_LIMIT*2/CELL+1;
const gridIndex=(x,z)=>Math.round((z+WORLD_LIMIT)/CELL)*COUNT+Math.round((x+WORLD_LIMIT)/CELL);
const pointAt=i=>({x:i%COUNT*CELL-WORLD_LIMIT,z:Math.floor(i/COUNT)*CELL-WORLD_LIMIT});
const open=new Uint8Array(COUNT*COUNT);
for(let i=0;i<open.length;i++){const p=pointAt(i);open[i]=blocked(p.x,p.z,.45)?0:1;}
const directions=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
export function pathTo(from,target){
  const start=gridIndex(bounded(from.x),bounded(from.z)),goal=gridIndex(bounded(target.x),bounded(target.z));
  const queue=[start],previous=new Int32Array(open.length).fill(-1);previous[start]=start;
  let found=start;
  for(let n=0;n<queue.length;n++){
    const at=queue[n];if(at===goal){found=at;break;}
    const ax=at%COUNT,az=Math.floor(at/COUNT);
    for(const [dx,dz] of directions){
      const x=ax+dx,z=az+dz;if(x<0||x>=COUNT||z<0||z>=COUNT)continue;
      const next=z*COUNT+x;if(previous[next]>=0||(!open[next]&&next!==goal))continue;
      if(dx&&dz&&(!open[az*COUNT+x]||!open[z*COUNT+ax]))continue;
      previous[next]=at;queue.push(next);
    }
  }
  if(found!==goal)return [];
  const result=[];for(let at=goal;at!==start;at=previous[at])result.push(pointAt(at));
  return result.reverse();
}
export function areaName(x,z){
  if(Math.hypot(x,z)<=8)return '前哨基地';
  const region=landmarks.find(p=>Math.hypot(x-p.x,z-p.z)<24);
  return region?.name||'郊外連絡道';
}
