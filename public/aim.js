export function traceShot(player,candidates,delta=0){
  const angle=player.yaw+delta,dx=Math.sin(angle),dz=Math.cos(angle);
  let nearest=null,distance=45;
  for(const obj of candidates){
    const ex=obj.x-player.x,ez=obj.z-player.z,along=ex*dx+ez*dz;
    const radius=obj.type==='boss'?.94:obj.type==='swarm'?.39:.52;
    if(along<=0||along>=distance||Math.abs(ex*dz-ez*dx)>radius)continue;
    const height=1.35+Math.tan(player.pitch)*along;
    if(height<.12||height>(obj.type==='boss'?3.65:obj.type==='swarm'?1.55:2))continue;
    nearest=obj;distance=along;
  }
  return {nearest,x:player.x,z:player.z,tx:player.x+dx*distance,tz:player.z+dz*distance,y:1.35+Math.tan(player.pitch)*distance};
}
