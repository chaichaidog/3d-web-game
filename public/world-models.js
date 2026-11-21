import {identity,transform,color,bakeMesh} from './mesh.js';
import {landmarks,structures,WORLD_LIMIT} from './world.js';
const origin=identity(),white=color('#ffffff');
let cached;
const random=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
export function landscape(){
  if(cached)return cached;
  const chunks=[];
  function chunk(name,x,z,radius,build){
    const parts=[];
    const p=(kind,x,y,z,sx,sy,sz,tint,rx=0,ry=0,rz=0)=>parts.push({kind,matrix:transform(x,y,z,rx,ry,rz,sx,sy,sz),color:color(tint)});
    build(p);chunks.push({kind:bakeMesh('district-'+name,parts),matrix:origin,color:white,emission:0,x,z,radius});
  }
  chunk('ground',0,0,Infinity,p=>{
    p('box',0,-.12,0,230,.2,230,'#737c6c');
    p('box',0,.003,0,6,.02,154,'#596564');p('box',0,.004,0,154,.02,6,'#596564');
    for(const s of [-1,1]){
      p('box',s*48,.006,0,5,.02,101,'#777969');p('box',0,.007,s*48,101,.02,5,'#777969');
      p('box',s*3.05,.018,0,.12,.02,154,'#a7a994');p('box',0,.018,s*3.05,154,.02,.12,'#a7a994');
    }
    for(let i=-72;i<=72;i+=4){
      p('box',0,.024,i,.13,.02,1,'#beb69e');p('box',i,.024,0,1,.02,.13,'#beb69e');
    }
    p('box',0,.013,0,25,.02,25,'#7d8376');
    for(let x=-10;x<=10;x+=4)for(let z=-10;z<=10;z+=4)p('box',x,.025,z,3.96,.01,3.96,'#767e70');
    p('cylinder',0,.04,0,10,.02,10,'#c1b59b');p('cylinder',0,.055,0,9.7,.02,9.7,'#607e80');
  });
  chunk('base',0,0,15,p=>{
    p('box',-3,1,-3.2,2,2,.9,'#3c5360');p('wedge',-3,2.15,-3.2,2.25,.35,1.1,'#687c7e');
    p('box',-3,1.3,-2.73,1.45,.52,.025,'#203e4c');
    p('box',1.6,.5,-2.8,2,.95,1,'#53635e');p('box',1.6,1,-2.8,2.1,.13,1.1,'#9a9b87');
    for(const x of [-4.3,4.3]){
      p('cylinder',x,1.8,-1.5,.1,3.6,.1,'#405863');p('box',x,3.45,-1.5,.55,.12,.32,'#bdb49a');
    }
    // Road signs and four different pennants mark the exits from the workshop.
    for(const site of landmarks){
      const x=site.x?Math.sign(site.x)*8:3.8,z=site.z?Math.sign(site.z)*8:3.8;
      p('cylinder',x,1.1,z,.09,2.2,.09,'#40565d');
      p('box',x,1.95,z,1.2,.35,.09,site.tint,0,site.x?Math.PI/2:0);
    }
  });
  for(const site of landmarks)chunk(site.id,site.x,site.z,29,p=>{
    const x=site.x,z=site.z;
    p('box',x,.028,z,19,.02,19,site.id==='woods'?'#7e8770':'#82897c');
    p('cylinder',x,.045,z,5,.02,5,site.tint);
    p('cylinder',x+.9,1.4,z,.08,2.8,.08,'#40545b');
    p('box',x+1.35,2.55,z,.9,.55,.04,site.tint);
    p('box',x-.9,.35,z+.8,1,.7,.7,'#586b70');p('box',x-.9,.73,z+.8,1.1,.1,.8,site.tint);
    for(const b of structures.filter(b=>Math.hypot(b.x-x,b.z-z)<29)){
      p('box',b.x,b.h/2,b.z,b.w,b.h,b.d,b.tint);
      if(b.kind==='container'){
        p('box',b.x,b.h+.1,b.z,b.w+.15,.2,b.d+.15,'#425c66');
        for(let k=-b.w/2+.4;k<b.w/2;k+=.75)for(const s of [-1,1])p('box',b.x+k,b.h/2,b.z+s*(b.d/2+.025),.07,b.h-.3,.08,'#56696c');
        for(const s of [-1,1])p('box',b.x-b.w/2-.025,b.h/2,b.z+s*.8,.08,b.h-.3,.06,'#c0b59c');
      }else{
        p('wedge',b.x,b.h+.4,b.z,b.w+.4,.8,b.d+.4,'#42585e');
        p('box',b.x,.35,b.z,b.w+.15,.7,b.d+.15,'#596765');
        for(const side of [-1,1])for(let k=-b.d/2+1.7;k<b.d/2;k+=2.8){
          p('box',b.x+side*(b.w/2+.025),2,b.z+k,.05,1,1.15,'#294653');
          p('box',b.x+side*(b.w/2+.06),1.45,b.z+k,.18,.12,1.3,'#aaa58f');
          if(b.h>6)p('box',b.x+side*(b.w/2+.025),5,b.z+k,.05,1,1.15,'#405f6a');
        }
        for(const side of [-1,1])for(let k=-b.w/2+1.5;k<b.w/2;k+=2.7)p('box',b.x+k,2,b.z+side*(b.d/2+.025),1.1,1,.05,'#2c4651');
      }
    }
    if(site.id==='signal'){
      // Open frame tower: students can walk underneath, so it has no solid wall.
      for(const sx of [-1,1])for(const sz of [-1,1])p('box',x+sx*2,6,z-8+sz*2,.2,12,.2,'#546c75');
      for(let y=2;y<=10;y+=2)for(const s of [-1,1]){
        p('box',x,y,z-8+s*2,4.2,.12,.12,'#8e9996');p('box',x+s*2,y,z-8,.12,.12,4.2,'#8e9996');
      }
      p('cylinder',x,12.4,z-8,.15,4,.15,'#bac0ac');p('sphere',x,13,z-8,1,.4,1,site.tint);
    }
    if(site.id==='woods'){
      for(const s of [-1,1])p('box',x+s*4,.4,z-4,3,.8,.6,'#615e50');
      p('cone',x,.5,z-4,1,.8,1,'#b29165');
    }
  });
  // Tree clusters are baked once, then excluded outside the player's view distance.
  for(let cx=-64;cx<=64;cx+=32)for(let cz=-64;cz<=64;cz+=32){
    chunk('trees-'+cx+'-'+cz,cx,cz,18,p=>{
      for(let i=0;i<9;i++){
        const n=(cx+80)*31+(cz+80)*13+i*7,x=cx+(random(n)-.5)*27,z=cz+(random(n+1)-.5)*27;
        if(Math.abs(x)<5||Math.abs(z)<5||Math.abs(Math.abs(x)-48)<4||Math.abs(Math.abs(z)-48)<4)continue;
        if(Math.hypot(x,z)<17||landmarks.some(s=>Math.hypot(s.x-x,s.z-z)<12))continue;
        if(structures.some(b=>Math.abs(b.x-x)<b.w/2+3&&Math.abs(b.z-z)<b.d/2+3))continue;
        const h=3.5+random(n+2)*3;
        p('cylinder',x,1.2,z,.22,2.4,.22,'#605e4f');
        p('cone',x,h*.6,z,2.5,h,2.5,'#4f6d60');p('cone',x,h*.85,z,1.8,h*.65,1.8,'#68816c');
      }
    });
  }
  chunk('boundary',0,0,Infinity,p=>{
    for(let i=-80;i<=80;i+=10)for(const side of [-1,1]){
      p('box',i,.6,side*WORLD_LIMIT,.2,1.2,.2,'#a9a68d');p('box',side*WORLD_LIMIT,.6,i,.2,1.2,.2,'#a9a68d');
      p('box',i,.9,side*WORLD_LIMIT,.23,.15,.23,'#596d73');p('box',side*WORLD_LIMIT,.9,i,.23,.15,.23,'#596d73');
    }
  });
  cached=chunks;return cached;
}
