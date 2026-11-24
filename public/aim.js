import {wallDistance} from './world.js';
import {enemies} from './enemies.js';
export function traceShot(player,candidates,delta=0,range=45){
  const angle=player.yaw+delta,dx=Math.sin(angle),dz=Math.cos(angle);
  let nearest=null,distance=wallDistance(player.x,player.z,dx,dz,player.pitch,range);
  for(const obj of candidates){
    const ex=obj.x-player.x,ez=obj.z-player.z,along=ex*dx+ez*dz;
    const spec=enemies[obj.type];
    const radius=spec?.width??.52;
    if(along<=0||along>=distance||Math.abs(ex*dz-ez*dx)>radius)continue;
    const height=1.35+Math.tan(player.pitch)*along;
    if(height<.12||height>2*(spec?.scale??1))continue;
    nearest=obj;distance=along;
  }
  return {nearest,x:player.x,z:player.z,tx:player.x+dx*distance,tz:player.z+dz*distance,y:1.35+Math.tan(player.pitch)*distance};
}
