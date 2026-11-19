
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
