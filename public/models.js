import {identity,multiply,transform,color} from './mesh.js';
export function part(out,root,kind,x,y,z,sx,sy,sz,tint,rx=0,ry=0,rz=0,alpha=1,emission=0){
  const matrix=multiply(root,transform(x,y,z,rx,ry,rz,sx,sy,sz));
  out.push({kind,matrix,color:color(tint,alpha),emission});
}
export function joint(root,x,y,z,rx=0,ry=0,rz=0,scale=1){return multiply(root,transform(x,y,z,rx,ry,rz,scale));}
const outfit={
  walker:{skin:'#7e9685',shirt:'#716573',pants:'#454e61'},
  runner:{skin:'#85998c',shirt:'#9a7654',pants:'#3f4d5d'},
  brute:{skin:'#83917d',shirt:'#75635d',pants:'#3b4552'},
  swarm:{skin:'#839d91',shirt:'#526b75',pants:'#41495a'},
  boss:{skin:'#849583',shirt:'#795b51',pants:'#414a56'}
};
export function character(out,actor,pose){
  const zombie=Boolean(actor.type),scale=actor.type==='boss'?1.85:actor.type==='swarm'?.77:1;
  const c=zombie?outfit[actor.type]:{skin:'#b9a092',shirt:'#607f98',pants:'#34475a'};
  const phase=pose.phase,speed=Math.min(pose.speed/2.2,1),stride=Math.sin(phase)*.58*speed;
  const bob=Math.abs(Math.cos(phase))*.035*speed+Math.sin(pose.time*2)*.008;
  const pain=pose.pain||0,attack=pose.attack||0;
  const root=transform(actor.x,bob,actor.z,0,pose.yaw,0,scale);
  const body=joint(root,0,.96,0,zombie?.12-pain*.3:0,0,Math.sin(phase*.5)*.035*speed);
  part(out,root,'cylinder',0,-bob+.018,0,.85,.018,.61,'#1b2631',0,0,0,.22);
  part(out,body,'sphere',0,.23,0,.63,.66,.36,c.shirt);
  part(out,body,'box',0,-.035,0,.46,.13,.29,c.pants);
  if(!zombie){
    part(out,body,'box',0,.26,.17,.43,.37,.08,'#354d63');
    for(const side of [-1,1])part(out,body,'box',side*.12,.14,.23,.16,.15,.08,'#83909a');
    part(out,body,'box',0,.31,-.23,.32,.43,.17,'#42596c');
    part(out,body,'box',-.11,.43,.22,.1,.025,.015,'#c0a485');
  }else{
    part(out,body,'box',.14,.2,.17,.12,.22,.02,'#4a4d55',0,0,-.25);
    part(out,body,'box',-.16,.35,.16,.1,.09,.02,'#a19a82',0,0,.3);
    if(actor.type==='brute'||actor.type==='boss')for(const side of [-1,1]){
      part(out,body,'sphere',side*.29,.44,0,.32,.31,.4,'#556270');
      part(out,body,'box',side*.3,.45,.16,.18,.14,.045,'#9c866c');
    }
  }
  const head=joint(body,0,.64,.035,zombie?-.08+Math.sin(pose.time*1.7)*.045:0,Math.sin(pose.time*.7)*.04,zombie?-.08:0);
  part(out,head,'cylinder',0,-.14,0,.15,.2,.15,c.skin);
  part(out,head,'sphere',0,.055,0,.39,.46,.36,c.skin);
  part(out,head,'box',0,-.09,.11,.23,.1,.19,c.skin,0,0,zombie?.08:0);
  part(out,head,'sphere',0,.045,.2,.07,.09,.09,c.skin);
  for(const side of [-1,1]){
    part(out,head,'sphere',side*.198,.03,0,.07,.13,.08,c.skin);
    part(out,head,'box',side*.089,.1,.169,.09,.051,.027,zombie?'#b7a77b':'#1d3546',0,0,-side*.12,1,.2);
    if(zombie)part(out,head,'box',side*.08,.147,.171,.1,.03,.028,'#536755',0,0,side*.15);
  }
  if(zombie){
    part(out,head,'box',0,-.064,.208,.17,.039,.025,'#45494c');
    part(out,head,'box',-.053,-.063,.225,.033,.033,.01,'#c4b9a3');
    part(out,head,'sphere',-.045,.237,-.025,.32,.12,.3,'#37484a');
  }else{
    part(out,head,'sphere',0,.21,-.025,.44,.23,.4,'#4c6275');
    part(out,head,'box',0,.17,.18,.42,.06,.18,'#344d63');
    part(out,head,'box',0,-.065,.201,.11,.025,.02,'#715d54');
  }
  for(const side of [-1,1]){
    const swing=stride*side;
    const leg=joint(root,side*.145,.91,0,swing);
    part(out,leg,'cylinder',0,-.22,0,.22,.43,.23,c.pants);
    const knee=joint(leg,0,-.43,0,Math.max(0,-swing)*.9);
    part(out,knee,'sphere',0,0,.01,.23,.2,.23,c.pants);
    part(out,knee,'cylinder',0,-.19,0,.19,.38,.2,c.pants);
    part(out,knee,'sphere',0,-.35,.075,.24,.16,.39,'#293440');
    const reach=zombie?-.62-attack*.65:-.35;
    const arm=joint(body,side*.34,.44,0,reach-swing*.65,0,-side*(zombie?.12:.06));
    part(out,arm,'sphere',0,-.035,0,.25,.25,.27,c.shirt);
    part(out,arm,'cylinder',0,-.15,0,.18,.3,.2,c.shirt);
    const elbow=joint(arm,0,-.31,0,zombie?-.18:side===1?-1.1:-.85);
    part(out,elbow,'sphere',0,0,0,.17,.15,.17,c.skin);
    part(out,elbow,'cylinder',0,-.12,0,.145,.25,.16,zombie?c.skin:c.shirt);
    part(out,elbow,'sphere',0,-.265,.025,.16,.16,.2,zombie?c.skin:'#3a4b5b');
    if(!zombie&&side===1)weapon(out,joint(elbow,0,-.28,.08,-Math.PI/2),actor.weapon,pose.shot||0,0,false);
  }
}
export function weapon(out,root,key='pulse',kick=0,reload=0,first=true){
  const scatter=key==='scatter',rapid=key==='rapid',long=scatter||rapid;
  const gun=joint(root,0,-reload*.17,-kick*.08,kick*.12+reload*.6,0,reload*.25);
  const p=(kind,x,y,z,sx,sy,sz,tint,rx=0,ry=0,rz=0)=>part(out,gun,kind,x,y,z,sx,sy,sz,tint,rx,ry,rz);
  p('box',0,0,0,.13,.13,long?.45:.26,'#354b5f');
  p('box',0,.075,0,.145,.055,long?.42:.29,'#7a8994');
  p('box',0,.073,-kick*.05,.12,.04,long?.39:.27,'#8e9ba4');
  p('cylinder',0,.025,long?.32:.2,.058,long?.26:.17,.058,'#263642',Math.PI/2);
  p('cylinder',0,.025,long?.46:.29,.08,.04,.08,'#536675',Math.PI/2);
  p('cylinder',0,.025,long?.483:.314,.043,.007,.043,'#131f2a',Math.PI/2);
  p('box',0,-.13,-.055,.085,.23,.11,'#263746',-.16);
  p('box',0,-.065,.055,.09,.018,.095,'#839097');
  p('box',0,-.026,.095,.09,.09,.016,'#536775');
  p('box',0,.13,-.095,.09,.045,.027,'#263746');
  p('box',0,.13,long?.23:.17,.026,.05,.026,'#b6a38b');
  for(const side of [-1,1])p('box',side*.071,.015,0,.012,.035,.1,scatter?'#aa8463':'#67899d');
  if(long){
    p('box',0,-.03,-.29,.1,.1,.18,'#3b5061');
    p('box',0,-.06,-.4,.16,.19,.065,'#536a79');
    if(scatter){
      p('cylinder',0,-.04,.32,.06,.27,.06,'#536575',Math.PI/2);
      p('box',0,-.025,.2,.17,.13,.16,'#9a785e');
      for(let i=0;i<4;i++)p('box',0,-.027,.14+i*.034,.18,.14,.008,'#635d57');
    }else{
      p('box',0,-.17,.08,.08,.25,.13,'#4a6170',.14);
      p('box',0,.145,.01,.15,.09,.16,'#283e50');
      p('box',0,.145,.097,.09,.045,.008,'#729ba3');
    }
  }
  if(first){
    p('sphere',.02,-.16,-.06,.16,.17,.19,'#485867');
    p('cylinder',.11,-.26,-.25,.19,.45,.2,'#617c90',-.9,0,-.25);
    p('cylinder',-.17,-.2,.02,.18,.43,.18,'#617c90',-.85,0,.6);
    p('sphere',-.06,-.08,long?.18:.05,.17,.16,.19,'#475969');
  }
}
export function muzzle(out,root,size=.12,age=0){
  const amount=Math.max(0,1-age/.085);
  if(!amount)return;
  part(out,root,'sphere',0,0,0,size*amount,size*amount,size*amount*1.6,'#dec296',0,0,0,.9,.9);
  for(let i=0;i<4;i++)part(out,root,'cone',0,0,.045,size*.55*amount,size*2*amount,size*.55*amount,'#bb956b',Math.PI/2,0,i*Math.PI/2,.65,1);
}
const random=i=>(Math.sin(i*127.1+311.7)*43758.5453)%1;
export function landscape(){
  const out=[],root=identity(),p=(kind,x,y,z,sx,sy,sz,tint,rx=0,ry=0,rz=0)=>part(out,root,kind,x,y,z,sx,sy,sz,tint,rx,ry,rz);
  p('box',0,-.08,0,140,.15,140,'#60706d');
  p('box',0,.003,12,3.2,.015,24,'#797d78');
  p('cylinder',0,.01,0,10,.02,10,'#91a7a8');p('cylinder',0,.025,0,9.55,.02,9.55,'#536e70');
  for(let i=0;i<8;i++)p('box',0,.045,1+i,.16,.015,.4,'#b1b4aa');
  for(let i=0;i<48;i++){
    const a=i/48*Math.PI*2,r=27+Math.abs(random(i))*12,x=Math.sin(a)*r,z=Math.cos(a)*r,s=1+Math.abs(random(i+11))*1.1;
    p('cylinder',x,1.1,z,.35,2.2,.35,'#5e5d55');
    p('cone',x,2.5*s,z,3*s,4*s,3*s,i%2?'#465e60':'#526d68');
    p('cone',x,4.4*s,z,2.1*s,3*s,2.1*s,'#5a736e');
    if(i%3===0)p('sphere',x*.78,.22,z*.78,1.4,.8,1.1,'#71807e',0,a);
  }
  for(let i=0;i<28;i++){const a=i/28*Math.PI*2;p('cylinder',Math.sin(a)*23.7,.6,Math.cos(a)*23.7,.14,1.2,.14,'#8a8877');}
  // Base tent and supply cases sit behind the spawn and outside the shooting lane.
  p('box',-3,.55,-2.5,1.7,1.1,.8,'#425e70');p('box',-3,1.15,-2.5,1.8,.14,.9,'#738d96');
  for(const x of [-3.5,-2.5])p('box',x,.6,-2.05,.06,.8,.02,'#ac997a');
  for(const x of [-2,2])p('cylinder',x,1.3,-3.5,.1,2.6,.1,'#89978f');
  p('box',0,2.6,-3.5,4.7,.14,1.8,'#536e7c',0,0,.08);
  return out;
}
