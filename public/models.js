import {identity,multiply,transform,color,bakeMesh} from './mesh.js';
export function part(out,root,kind,x,y,z,sx,sy,sz,tint,rx=0,ry=0,rz=0,alpha=1,emission=0){
  out.push({kind,matrix:multiply(root,transform(x,y,z,rx,ry,rz,sx,sy,sz)),color:color(tint,alpha),emission});
}
export function joint(root,x,y,z,rx=0,ry=0,rz=0,scale=1){return multiply(root,transform(x,y,z,rx,ry,rz,scale));}
const white=color('#ffffff'),origin=identity(),cache=new Map();
const mesh=(out,kind,matrix)=>out.push({kind,matrix,color:white,emission:0});
function build(name,fn){
  if(cache.has(name))return cache.get(name);
  const parts=[],p=(kind,x,y,z,sx,sy,sz,tint,rx=0,ry=0,rz=0)=>part(parts,origin,kind,x,y,z,sx,sy,sz,tint,rx,ry,rz);
  fn(p);const id=bakeMesh(name,parts);cache.set(name,id);return id;
}
const palettes={
  player:{skin:'#bfa78e',coat:'#526978',dark:'#263c49',accent:'#c59d6c',pants:'#36434d'},
  walker:{skin:'#9caa96',coat:'#6a7166',dark:'#3b4542',accent:'#ad8d64',pants:'#494e4d'},
  runner:{skin:'#a4aca0',coat:'#8b6655',dark:'#4d3c39',accent:'#b59c78',pants:'#414950'},
  brute:{skin:'#8a9989',coat:'#56636b',dark:'#303d46',accent:'#b79065',pants:'#3c4549'},
  swarm:{skin:'#99a79c',coat:'#5c7774',dark:'#334b4b',accent:'#a69b72',pants:'#3e4b4c'},
  boss:{skin:'#858f7f',coat:'#514c4a',dark:'#333738',accent:'#b48b68',pants:'#3f4141'}
};
function rig(type){
  const c=palettes[type],zombie=type!=='player',heavy=type==='brute'||type==='boss';
  const label='rig-'+type,rig={};
  rig.body=build(label+'-body',p=>{
    p('taper',0,.23,0,heavy?.67:.48,.57,.3,c.coat);
    p('wedge',0,.4,.02,heavy?.72:.53,.22,.36,c.coat,0,0,zombie?-.08:0);
    p('box',0,-.045,0,.36,.14,.26,c.pants);
    p('box',0,-.025,.15,.38,.055,.04,c.dark);
    p('box',.05,-.025,.18,.075,.055,.015,c.accent);
    if(zombie){
      p('wedge',-.115,.22,.165,.19,.33,.027,c.dark,.02,0,-.16);
      p('box',.15,.32,.16,.07,.27,.03,c.accent,0,0,.18);
      p('taper',-.19,.04,.025,.12,.13,.23,c.coat,0,0,.22);
      p('taper',.19,.02,.025,.1,.17,.23,c.coat,0,0,-.2);
      for(let i=0;i<3;i++)p('box',-.06+i*.06,.18+i*.055,.182,.018,.12,.012,'#333f39',0,0,-.25);
      if(heavy)for(const side of [-1,1]){
        p('wedge',side*.32,.42,.01,.3,.27,.37,c.dark,0,0,-side*.3);
        p('taper',side*.38,.58,-.03,.12,.26,.15,c.accent,0,0,-side*.4);
      }
      p('sphere',.08,.45,-.16,.28,.28,.16,c.dark);
    }else{
      p('taper',0,.26,.17,.4,.4,.07,c.dark);
      for(const side of [-1,1]){
        p('box',side*.17,.31,.205,.045,.49,.03,'#879293',0,0,-side*.08);
        p('box',side*.09,.12,.23,.13,.13,.065,'#758386');
        p('box',side*.09,.2,.234,.13,.025,.07,'#b3aa8a');
      }
      p('box',-.12,.38,.224,.075,.09,.05,'#253c48');
      p('cylinder',-.12,.5,.224,.012,.14,.012,'#2a3941');
      p('box',.1,.36,.225,.11,.035,.012,c.accent);
      p('taper',0,.3,-.21,.35,.43,.19,'#3e515c');
      p('box',0,.35,-.32,.21,.07,.025,'#819092');
      p('box',.25,-.02,0,.1,.15,.18,'#53646b');
    }
  });
  rig.head=build(label+'-head',p=>{
    p('cylinder',0,-.12,0,.115,.19,.12,c.skin);
    p('sphere',0,.075,0,.29,.37,.28,c.skin);
    p('wedge',0,-.045,.09,.2,.13,.16,c.skin);
    p('wedge',0,.065,.15,.045,.08,.065,c.skin);
    for(const side of [-1,1]){
      p('sphere',side*.15,.045,0,.045,.09,.055,c.skin);
      p('box',side*.065,.103,.128,.062,.028,.018,zombie?'#d2bb7b':'#243743');
      p('box',side*.068,.135,.133,.085,.023,.025,zombie?'#48574c':'#354552',0,0,side*.14);
    }
    if(zombie){
      p('box',.015,-.043,.175,.14,.025,.017,'#36423b',0,0,-.12);
      p('box',-.036,-.037,.185,.024,.02,.008,'#c2baa3');
      p('sphere',-.015,.21,-.045,.29,.13,.25,'#3a4942');
      p('wedge',.1,.17,-.02,.08,.12,.14,'#3a4942',0,0,-.3);
      p('box',.12,.03,.12,.017,.1,.01,'#64735e',0,0,-.35);
      if(type==='boss')for(const side of [-1,1])p('taper',side*.18,.14,0,.11,.29,.14,c.accent,.2,0,-side*.45);
    }else{
      p('sphere',0,.21,-.025,.34,.2,.33,c.dark);
      p('box',0,.17,.13,.31,.045,.17,'#71818b');
      p('box',0,.1,.151,.255,.07,.03,'#283e48');
      p('box',0,.11,.17,.22,.028,.009,'#76999b');
      p('box',0,-.005,.14,.2,.09,.06,'#546773');
      for(const side of [-1,1])p('box',side*.143,.045,.03,.025,.15,.045,'#334651');
      p('box',0,.25,.135,.04,.04,.04,c.accent);
    }
  });
  for(const side of [-1,1]){
    rig['arm'+side]=build(label+'-arm'+side,p=>{
      p('taper',0,-.16,0,heavy?.25:.16,.35,.19,c.coat,0,0,Math.PI);
      p('wedge',0,.008,-.005,heavy?.28:.2,.15,.24,c.dark,0,0,-side*.12);
      if(!zombie)p('box',side*.095,-.07,0,.02,.08,.09,c.accent);
      if(zombie&&side===1)p('box',0,-.27,.09,.15,.045,.025,c.dark,0,0,.1);
    });
    rig['fore'+side]=build(label+'-fore'+side,p=>{
      p('taper',0,-.13,0,.13,.29,.145,zombie?c.skin:c.coat,0,0,Math.PI);
      p('sphere',0,0,-.015,.15,.13,.15,c.dark);
      p('box',0,-.24,.01,.14,.06,.14,zombie?'#7e8b7b':c.dark);
      p('wedge',0,-.315,.02,.12,.12,.16,zombie?c.skin:'#354956');
      if(zombie)for(const s of [-1,1])p('box',s*.04,-.39,.045,.027,.08,.035,c.skin,.25,0,s*.08);
    });
    rig['thigh'+side]=build(label+'-thigh'+side,p=>{
      p('taper',0,-.22,0,.2,.44,.22,c.pants);
      p('box',side*.095,-.13,0,.055,.14,.14,c.dark);
    });
    rig['calf'+side]=build(label+'-calf'+side,p=>{
      p('taper',0,-.195,0,.16,.39,.17,c.pants);
      p('wedge',0,-.015,.09,.15,.16,.055,zombie?c.dark:'#66777d');
      p('wedge',0,-.38,.055,.19,.18,.33,'#303b40');
      p('box',0,-.45,.065,.2,.045,.34,'#242e33');
      p('box',0,-.32,.14,.12,.04,.018,'#65716f');
    });
  }
  return rig;
}
const rigs=new Map();
export function character(out,actor,pose){
  const type=actor.type||'player',zombie=Boolean(actor.type);
  if(!rigs.has(type))rigs.set(type,rig(type));const r=rigs.get(type);
  const scale=type==='boss'?1.8:type==='swarm'?.8:1,speed=Math.min(pose.speed/2,1);
  const phase=pose.phase,step=Math.sin(phase),stride=step*(type==='runner'?.7:.43)*speed;
  const heavy=type==='brute'||type==='boss',sway=zombie?.08:.025;
  const root=transform(actor.x,.015+Math.abs(Math.sin(phase))*.024*speed,actor.z,0,pose.yaw,0,scale);
  part(out,root,'cylinder',0,-.005,0,.7,.008,.46,'#182c2e',0,0,0,.2);
  const body=joint(root,0,.94,0,(zombie?.2:0)-(pose.pain||0)*.25,Math.sin(phase)*.025*speed,Math.sin(phase*.5)*sway*speed);
  mesh(out,r.body,body);
  mesh(out,r.head,joint(body,0,.65,zombie?.045:0,zombie?-.12+Math.sin(pose.time*1.4)*.035:0,Math.sin(pose.time*.7)*.04,zombie?-.1:0));
  for(const side of [-1,1]){
    const swing=stride*side;
    const leg=joint(root,side*.12,.91,0,swing,0,zombie?side*.035:0);
    mesh(out,r['thigh'+side],leg);
    mesh(out,r['calf'+side],joint(leg,0,-.43,0,Math.max(0,-swing)*1.1));
    const arm=joint(body,side*(heavy?.36:.275),.43,0,zombie?-.16-side*.15-swing*.55-(pose.attack||0)*1.05:-.65-swing*.15,0,-side*(zombie?.12:.04));
    mesh(out,r['arm'+side],arm);
    const elbow=joint(arm,0,-.34,0,zombie?-.12-side*.1:-1.1,0,zombie?side*.06:0);
    mesh(out,r['fore'+side],elbow);
    if(!zombie&&side===1)weapon(out,joint(elbow,0,-.34,.08,-Math.PI/2),actor.weapon,pose.shot||0,0,false);
  }
}
function gunParts(key){
  const scatter=key==='scatter',rapid=key==='rapid',long=scatter||rapid,base='gun-'+key;
  const shell=build(base+'-shell',p=>{
    const metal='#344953',top='#72818a',accent=scatter?'#a17a56':rapid?'#748d87':'#ac926d';
    p('wedge',0,.015,.03,.1,.105,long?.43:.23,metal);
    p('box',0,-.095,-.04,.067,.18,.086,'#263943',-.23);
    for(let i=0;i<4;i++)p('box',0,-.055-i*.032,-.09+i*.007,.073,.009,.009,'#51646d',-.23);
    p('box',0,-.06,.06,.07,.012,.105,top);
    p('box',0,-.03,.108,.065,.07,.014,metal);
    p('box',0,-.025,.025,.018,.06,.014,'#182b34',-.2);
    p('cylinder',0,.035,long?.34:.195,.035,long?.28:.12,.035,'#263c45',Math.PI/2);
    p('cylinder',0,.035,long?.495:.265,.058,.045,.058,metal,Math.PI/2);
    p('cylinder',0,.035,long?.519:.289,.033,.008,.033,'#102731',Math.PI/2);
    p('box',0,.092,long?.27:.098,.018,.038,.025,accent);
    p('box',0,.087,-.075,.058,.023,.021,'#20333c');
    for(const side of [-1,1])p('box',side*.052,.01,.02,.012,.025,.065,accent);
    if(long){
      p('wedge',0,-.01,-.29,.08,.08,.17,metal);
      p('wedge',0,-.04,-.41,.105,.16,.105,'#526970');
      p('box',0,-.04,-.47,.11,.17,.027,'#243a43');
      p('box',0,.07,.075,.055,.014,.25,'#1d333e');
      for(let i=0;i<7;i++)p('box',0,.084,-.035+i*.034,.065,.008,.012,top);
      if(scatter){
        p('cylinder',0,-.018,.35,.041,.27,.041,top,Math.PI/2);
        p('box',0,-.01,.2,.14,.09,.19,'#8c725b');
        for(let i=0;i<5;i++)p('box',0,-.01,.12+i*.037,.145,.095,.009,'#4c4e47');
        for(let i=0;i<3;i++)p('cylinder',-.064,.025,-.06+i*.043,.025,.07,.025,'#ac8f6a',0,0,Math.PI/2);
      }else{
        p('box',0,.112,.02,.1,.065,.12,'#263d47');
        p('box',0,.115,-.045,.067,.035,.008,'#7fa6a4');
        p('box',0,.025,.28,.103,.086,.19,'#4f686d');
        for(let i=0;i<4;i++)for(const side of [-1,1])p('box',side*.054,.03,.21+i*.038,.008,.028,.017,'#20353e');
      }
    }
  });
  const slide=build(base+'-slide',p=>{
    p('wedge',0,.066,0,.095,.052,long?.32:.245,'#657882');
    for(let i=0;i<5;i++)for(const side of [-1,1])p('box',side*.049,.064,-.09+i*.016,.007,.035,.006,'#2d444e');
    p('box',.048,.064,.03,.009,.026,.053,'#253942');
  });
  const mag=build(base+'-mag',p=>p('wedge',0,-.12,rapid?.08:-.044,rapid?.068:.058,rapid?.23:.16,rapid?.095:.067,'#344b56',rapid?.18:-.23));
  const hand=build('gloved-hand',p=>{
    p('wedge',0,0,0,.105,.12,.145,'#526775');
    for(let i=0;i<3;i++)p('box',-.04+i*.031,-.032,.07,.025,.05,.018,'#344b58');
    p('box',.052,.015,.035,.035,.065,.055,'#526775',.15,0,-.15);
    p('box',0,.06,-.01,.09,.025,.07,'#8a9390');
  });
  const sleeve=build('rescue-sleeve',p=>{
    p('taper',0,-.13,0,.145,.3,.15,'#526e80');
    p('box',0,.01,0,.147,.045,.15,'#2e4655');
    p('box',0,-.08,.079,.075,.06,.012,'#a78e69');
  });
  return {shell,slide,mag,hand,sleeve};
}
const guns=new Map();
export function weapon(out,root,key='pulse',kick=0,reload=0,first=true){
  if(!guns.has(key))guns.set(key,gunParts(key));const g=guns.get(key),long=key!=='pulse';
  const gun=joint(root,0,-reload*.12,-kick*.075,kick*.16+reload*.65,0,-reload*.35);
  mesh(out,g.shell,gun);mesh(out,g.slide,joint(gun,0,0,-kick*.065));mesh(out,g.mag,joint(gun,0,-reload*.2,0,0,0,reload*.15));
  if(first){
    mesh(out,g.hand,joint(gun,.035,-.11,-.045,-.2,0,-.1));
    mesh(out,g.sleeve,joint(gun,.105,-.22,-.19,-.95,0,-.35));
    mesh(out,g.hand,joint(gun,-.045,-.065,long?.2:.04,-.15,.5,.25));
    mesh(out,g.sleeve,joint(gun,-.14,-.17,long?.09:-.02,-.85,0,.55));
  }
}
export function muzzle(out,root,size=.12,age=0){
  const amount=Math.max(0,1-age/.07);if(!amount)return;
  part(out,root,'sphere',0,0,0,size*amount,size*.7*amount,size*1.4*amount,'#e1c99e',0,0,0,.8,.9);
  part(out,root,'cone',0,0,.06,size*.5*amount,size*2.4*amount,size*.5*amount,'#b7946e',Math.PI/2,0,0,.65,1);
}
const rand=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
export function landscape(){
  const name=build('outpost-environment',p=>{
    p('box',0,-.1,0,130,.18,130,'#777c70');
    p('box',0,.004,12,4.1,.018,24,'#595e59');
    // Large slabs and road seams make forward movement easy to read.
    for(let x=-20;x<=20;x+=4)for(let z=-20;z<=20;z+=4){
      if(Math.abs(x)<3&&z>=0)continue;
      p('box',x,.007,z,3.96,.018,3.96,(x+z)%8?'#797e72':'#73796d');
    }
    p('cylinder',0,.024,0,10,.022,10,'#c1b59b');p('cylinder',0,.04,0,9.7,.02,9.7,'#607e80');
    for(let i=0;i<12;i++)p('box',0,.023,1+i*1.7,.12,.015,.65,'#b4b3a1');
    for(const x of [-2.05,2.05])p('box',x,.035,12,.07,.04,24,'#acaa94');
    // Safe workshop behind spawn.
    p('box',-3,1,-3.2,2,2,.9,'#3c5360');
    p('wedge',-3,2.15,-3.2,2.25,.35,1.1,'#687c7e');
    p('box',-3,1.3,-2.73,1.45,.52,.025,'#203e4c');
    for(const x of [-3.65,-2.35])p('box',x,.8,-2.7,.08,1.45,.04,'#a9a08c');
    p('box',1.6,.5,-2.8,2,.95,1,'#53635e');
    p('box',1.6,1,-2.8,2.1,.13,1.1,'#9a9b87');
    for(const x of [.9,2.3])p('box',x,.5,-2.28,.07,.93,.025,'#b79f78');
    for(const x of [-4.3,4.3]){
      p('cylinder',x,1.8,-1.5,.1,3.6,.1,'#405863');
      p('box',x,3.45,-1.5,.55,.12,.32,'#a6a28c');
      p('box',x,3.35,-1.5,.4,.035,.23,'#d3c4a2');
    }
    // Derelict modular buildings at the boundary, with no obstacles in the lesson lane.
    for(let i=0;i<8;i++){
      const a=(i+.5)*Math.PI/4,x=Math.sin(a)*29,z=Math.cos(a)*29;
      const h=2.4+rand(i)*3.5,w=4+rand(i+8)*3;
      p('box',x,h/2,z,w,h,4.5,i%2?'#646e6d':'#687478',0,a);
      p('wedge',x,h+.3,z,w+.4,.6,4.9,'#40565b',0,a);
      for(let j=-1;j<=1;j++){
        const dx=Math.cos(a)*j*1.1,dz=-Math.sin(a)*j*1.1;
        p('box',x+dx-Math.sin(a)*2.27,h*.65,z+dz-Math.cos(a)*2.27,.65,.75,.04,'#263e46',0,a);
      }
    }
    for(let i=0;i<22;i++){
      const a=i/22*Math.PI*2,r=34+rand(i+12)*13,x=Math.sin(a)*r,z=Math.cos(a)*r,s=.8+rand(i+31)*1.4;
      p('cylinder',x,1.5,z,.32,3,.32,'#596158');
      p('sphere',x,3.7*s,z,2.2*s,3.7*s,2.3*s,i%2?'#536b62':'#61776c');
      p('sphere',x+.7,4.7*s,z,1.8*s,2.6*s,1.7*s,'#718376');
    }
    for(let i=0;i<20;i++){
      const a=i/20*Math.PI*2,r=24;
      p('box',Math.sin(a)*r,.5,Math.cos(a)*r,2.1,1,1,'#657472',0,a);
      p('box',Math.sin(a)*r,1.05,Math.cos(a)*r,2.2,.1,1.1,'#aaa38b',0,a);
      if(i%3===0)p('wedge',Math.sin(a)*21.5,.18,Math.cos(a)*21.5,1.1,.36,.7,'#8b8978',0,a,.1);
    }
  });
  return [{kind:name,matrix:origin,color:white,emission:0}];
}
