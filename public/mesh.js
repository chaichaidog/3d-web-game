// Column-major transforms, shared by the models and the WebGL renderer.
export const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export function multiply(a,b){
  const out=new Float32Array(16);
  for(let col=0;col<4;col++)for(let row=0;row<4;row++)
    out[col*4+row]=a[row]*b[col*4]+a[4+row]*b[col*4+1]+a[8+row]*b[col*4+2]+a[12+row]*b[col*4+3];
  return out;
}
export function transform(x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx){
  const cx=Math.cos(rx),sxr=Math.sin(rx),cy=Math.cos(ry),syr=Math.sin(ry),cz=Math.cos(rz),szr=Math.sin(rz);
  return new Float32Array([
    (cy*cz+syr*sxr*szr)*sx,cx*szr*sx,(-syr*cz+cy*sxr*szr)*sx,0,
    (-cy*szr+syr*sxr*cz)*sy,cx*cz*sy,(syr*szr+cy*sxr*cz)*sy,0,
    syr*cx*sz,-sxr*sz,cy*cx*sz,0,
    x,y,z,1
  ]);
}
export function cameraMatrix(x,y,z,yaw,pitch,aspect){
  const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
  const right=[cy,0,-sy],up=[-sy*sp,cp,-cy*sp],forward=[sy*cp,sp,cy*cp];
  const v=new Float32Array([right[0],up[0],forward[0],0,right[1],up[1],forward[1],0,right[2],up[2],forward[2],0,
    -(right[0]*x+right[2]*z),-(up[0]*x+up[1]*y+up[2]*z),-(forward[0]*x+forward[1]*y+forward[2]*z),1]);
  const f=1/Math.tan(Math.PI*64/360),near=.04,far=125;
  const p=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(far-near),1,0,0,-2*far*near/(far-near),0]);
  return multiply(p,v);
}
function triangle(out,a,b,c){
  const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;
  for(const p of [a,b,c])out.push(...p,...n.map(x=>x/len));
}
export function geometry(kind){
  const out=[];
  if(kind==='box'||kind==='taper'||kind==='wedge'){
    const v=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5],[-.5,.5,-.5],[.5,.5,-.5],[.5,.5,.5],[-.5,.5,.5]];
    if(kind==='taper')for(let i=0;i<4;i++){v[i][0]*=.65;v[i][2]*=.75;}
    if(kind==='wedge'){v[6][1]=.15;v[7][1]=.15;v[4][0]*=.7;v[5][0]*=.7;}
    for(const [a,b,c,d] of [[1,0,4,5],[2,1,5,6],[3,2,6,7],[0,3,7,4],[4,7,6,5],[0,1,2,3]]){triangle(out,v[a],v[b],v[c]);triangle(out,v[a],v[c],v[d]);}
  } else if(kind==='sphere'){
    const point=(lat,lng)=>[Math.cos(lat)*Math.cos(lng)*.5,Math.sin(lat)*.5,Math.cos(lat)*Math.sin(lng)*.5];
    for(let j=0;j<6;j++)for(let i=0;i<10;i++){
      const a=-Math.PI/2+j*Math.PI/6,b=a+Math.PI/6,c=i*Math.PI/5,d=c+Math.PI/5;
      triangle(out,point(a,c),point(b,c),point(b,d));triangle(out,point(a,c),point(b,d),point(a,d));
    }
  } else {
    const top=kind==='cone'?0:.5;
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
      const v0=[Math.cos(a)*.5,-.5,Math.sin(a)*.5],v1=[Math.cos(b)*.5,-.5,Math.sin(b)*.5],v2=[Math.cos(b)*top,.5,Math.sin(b)*top],v3=[Math.cos(a)*top,.5,Math.sin(a)*top];
      triangle(out,v0,v2,v1);triangle(out,v0,v3,v2);
      triangle(out,[0,-.5,0],v0,v1);if(top)triangle(out,[0,.5,0],v2,v3);
    }
  }
  return new Float32Array(out);
}
const colors=new Map();
export function color(hex,alpha=1){
  if(!colors.has(hex))colors.set(hex,[0,2,4].map(i=>parseInt(hex.replace('#','').slice(i,i+2),16)/255));
  return [...colors.get(hex),alpha];
}
const baked=new Map(),primitives=new Map();
const source=kind=>{if(!primitives.has(kind))primitives.set(kind,geometry(kind));return primitives.get(kind);};
// Bake detail once. Runtime animation only moves whole rigid limbs.
export function bakeMesh(name,parts){
  if(baked.has(name))return name;
  const vertices=[];
  for(const part of parts){
    const points=source(part.kind),m=part.matrix;
    const sx=m[0]*m[0]+m[1]*m[1]+m[2]*m[2],sy=m[4]*m[4]+m[5]*m[5]+m[6]*m[6],sz=m[8]*m[8]+m[9]*m[9]+m[10]*m[10];
    for(let i=0;i<points.length;i+=6){
      const x=points[i],y=points[i+1],z=points[i+2],nx=points[i+3]/sx,ny=points[i+4]/sy,nz=points[i+5]/sz;
      const a=m[0]*nx+m[4]*ny+m[8]*nz,b=m[1]*nx+m[5]*ny+m[9]*nz,c=m[2]*nx+m[6]*ny+m[10]*nz,length=Math.hypot(a,b,c)||1;
      vertices.push(m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],a/length,b/length,c/length,...part.color.slice(0,3));
    }
  }
  baked.set(name,new Float32Array(vertices));return name;
}
export function meshVertices(kind){
  if(baked.has(kind))return baked.get(kind);
  const points=source(kind),out=new Float32Array(points.length/6*9);
  for(let i=0,j=0;i<points.length;i+=6,j+=9){out.set(points.subarray(i,i+6),j);out.set([1,1,1],j+6);}
  baked.set(kind,out);return out;
}
let quality='auto';
export function rendererQuality(value){quality=value;}
export class Renderer{
  get detailDistance(){return quality==='low'?49:70;}
  constructor(canvas){
    this.canvas=canvas;this.scale=.9;this.frames=0;this.slow=0;
    this.gl=canvas.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'high-performance'});
    if(!this.gl)throw Error('請在瀏覽器開啟硬體加速，重新整理以載入 3D 場景。');
    const gl=this.gl;
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const vertex=shader(gl.VERTEX_SHADER,`#version 300 es
      precision highp float;
      layout(location=0) in vec3 position;
      layout(location=1) in vec3 normal;
      layout(location=2) in mat4 model;
      layout(location=6) in vec4 tint;
      layout(location=7) in float emission;
      layout(location=8) in vec3 vertexColor;
      uniform mat4 camera;
      uniform vec3 eye;
      out vec4 vColor;
      out vec3 worldPosition;
      void main(){
        vec4 world=model*vec4(position,1.);
        vec3 scale=vec3(dot(model[0].xyz,model[0].xyz),dot(model[1].xyz,model[1].xyz),dot(model[2].xyz,model[2].xyz));
        vec3 n=normalize(mat3(model)*(normal/max(scale,vec3(.00001))));
        float light=.58+.42*max(0.,dot(n,normalize(vec3(-.5,.8,-.4))));
        vColor=vec4(tint.rgb*vertexColor*mix(light,1.,emission),tint.a);
        worldPosition=world.xyz;
        gl_Position=camera*world;
      }`);
    const fragment=shader(gl.FRAGMENT_SHADER,`#version 300 es
      precision highp float;
      in vec4 vColor;
      in vec3 worldPosition;
      uniform vec3 eye;
      out vec4 result;
      void main(){float fog=smoothstep(45.,105.,length(worldPosition-eye));result=vec4(mix(vColor.rgb,vec3(.36,.43,.49),fog),vColor.a);}
    `);
    this.program=gl.createProgram();gl.attachShader(this.program,vertex);gl.attachShader(this.program,fragment);gl.linkProgram(this.program);
    if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));
    this.camera=gl.getUniformLocation(this.program,'camera');this.eye=gl.getUniformLocation(this.program,'eye');
    this.meshes=new Map();
    canvas.addEventListener('webglcontextlost',e=>e.preventDefault());
    canvas.addEventListener('webglcontextrestored',()=>location.reload());
  }
  meshFor(kind){
    if(!this.meshes.has(kind)){
      const gl=this.gl;
      const vao=gl.createVertexArray();gl.bindVertexArray(vao);
      const vertexBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);const points=meshVertices(kind);gl.bufferData(gl.ARRAY_BUFFER,points,gl.STATIC_DRAW);
      for(let i=0;i<2;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,36,i*12);}
      gl.enableVertexAttribArray(8);gl.vertexAttribPointer(8,3,gl.FLOAT,false,36,24);
      const instances=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,instances);
      for(let i=0;i<4;i++){gl.enableVertexAttribArray(2+i);gl.vertexAttribPointer(2+i,4,gl.FLOAT,false,84,i*16);gl.vertexAttribDivisor(2+i,1);}
      gl.enableVertexAttribArray(6);gl.vertexAttribPointer(6,4,gl.FLOAT,false,84,64);gl.vertexAttribDivisor(6,1);
      gl.enableVertexAttribArray(7);gl.vertexAttribPointer(7,1,gl.FLOAT,false,84,80);gl.vertexAttribDivisor(7,1);
      this.meshes.set(kind,{vao,instances,count:points.length/9,data:new Float32Array(21*32),used:0,capacity:0});
    }
    return this.meshes.get(kind);
  }
  adapt(ms){
    if(quality!=='auto'||ms>200||ms<1)return;
    this.slow+=ms>24?1:0;
    if(++this.frames>=90){
      if(this.slow>30)this.scale=Math.max(.55,this.scale-.1);
      else if(this.slow<3)this.scale=Math.min(1,this.scale+.05);
      this.frames=this.slow=0;
    }
  }
  resize(){
    const c=this.canvas;
    const r=c.id==='world'?Math.min(quality==='high'?1.2:quality==='low'?.55:this.scale,(quality==='low'?960:1440)/c.clientWidth):Math.min(.7,420/c.clientWidth);
    const w=Math.max(1,Math.round(c.clientWidth*r)),h=Math.max(1,Math.round(c.clientHeight*r));
    if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  }
  render(objects,view,eye,clear=true){
    const gl=this.gl;this.resize();gl.viewport(0,0,this.canvas.width,this.canvas.height);
    if(clear){gl.clearColor(.36,.43,.49,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);}
    else gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.camera,false,view);gl.uniform3fv(this.eye,eye);
    // Instance all parts of the same geometry in one draw call per pass.
    for(const translucent of [false,true]){
      if(translucent){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}else{gl.disable(gl.BLEND);gl.depthMask(true);}
      for(const mesh of this.meshes.values())mesh.used=0;
      for(const obj of objects)if((obj.color[3]<1)===translucent){
        const mesh=this.meshFor(obj.kind),offset=mesh.used*21;
        if(offset+21>mesh.data.length){const data=new Float32Array(mesh.data.length*2);data.set(mesh.data);mesh.data=data;}
        mesh.data.set(obj.matrix,offset);mesh.data.set(obj.color,offset+16);mesh.data[offset+20]=obj.emission||0;mesh.used++;
      }
      for(const mesh of this.meshes.values()){
        if(!mesh.used)continue;
        gl.bindVertexArray(mesh.vao);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.instances);
        if(mesh.capacity<mesh.data.byteLength){gl.bufferData(gl.ARRAY_BUFFER,mesh.data.byteLength,gl.DYNAMIC_DRAW);mesh.capacity=mesh.data.byteLength;}
        gl.bufferSubData(gl.ARRAY_BUFFER,0,mesh.data.subarray(0,mesh.used*21));
        gl.drawArraysInstanced(gl.TRIANGLES,0,mesh.count,mesh.used);
      }
    }
    gl.depthMask(true);
  }
}
