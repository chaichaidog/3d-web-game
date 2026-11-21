import {landmarks,structures,WORLD_LIMIT,areaName} from './world.js';
import {availableActivities,claimedBy} from './activities.js';
export function routeHint(player,goal){
  const distance=Math.hypot(goal.x-player.x,goal.z-player.z);
  if(distance<3)return '已抵達';
  const a=Math.atan2(goal.x-player.x,goal.z-player.z)-player.yaw,angle=Math.atan2(Math.sin(a),Math.cos(a));
  const turn=Math.abs(angle)<.3?'直走':Math.abs(angle)>2.5?'回頭':angle>0?'右轉':'左轉';
  return turn+' · '+Math.round(distance)+' m';
}
export class Navigation{
  constructor(container){
    this.box=document.createElement('aside');this.box.id='navigation';this.box.setAttribute('aria-label','探索地圖');
    this.title=document.createElement('strong');this.canvas=document.createElement('canvas');this.canvas.width=this.canvas.height=180;
    this.canvas.setAttribute('aria-label','北方朝上的小地圖，顯示基地、四個探索點與隊友');
    this.progress=document.createElement('span');this.hint=document.createElement('span');this.hint.id='routeHint';
    this.box.append(this.title,this.canvas,this.progress,this.hint);container.append(this.box);
    this.goal=landmarks[0];this.last=0;
    this.select=document.createElement('select');this.select.id='destination';this.select.setAttribute('aria-label','選擇探索目的地');
    this.select.append(new Option('自由探索','free'));
    for(const site of landmarks)this.select.append(new Option('前往 '+site.name,site.id));
    this.select.append(new Option('導航回基地','home'));this.select.value='town';
    this.select.onchange=()=>{const id=this.select.value;this.goal=id==='home'?{x:0,z:0,name:'基地'}:this.stash?.id===id?this.stash:landmarks.find(s=>s.id===id);};
  }
  update(state,player){
    const now=performance.now();if(now-this.last<100)return;this.last=now;
    const sites=availableActivities(state),stash=sites.find(site=>site.kind==='stash'&&!claimedBy(state,player,site));
    if(stash!==this.stash){
      this.stash=stash;
      if(stash){this.stashOption=new Option('前往 '+stash.name,stash.id);this.select.add(this.stashOption);}
      else{this.stashOption?.remove();if(this.goal?.id==='stash'){this.select.value='free';this.goal=null;}}
    }
    const discovered=player.discovered||[],g=this.canvas.getContext('2d'),size=180,scale=160/(WORLD_LIMIT*2),xy=(x,z)=>[90+x*scale,90-z*scale];
    this.title.textContent=areaName(player.x,player.z);
    this.progress.textContent=state.mode==='survival'?'探索 '+discovered.length+'/4 · 每處首次 +2 金幣':'據點防守 · 守住基地北側發電機';
    const hint=Math.max(Math.abs(player.x),Math.abs(player.z))>77?'已到區域邊界，沿路折返':this.goal?this.goal.name+'：'+routeHint(player,this.goal):'自由探索 · 迷路可按「返回基地」';
    if(this.hint.textContent!==hint)this.hint.textContent=hint;
    g.clearRect(0,0,size,size);g.fillStyle='#253842';g.fillRect(8,8,164,164);
    g.strokeStyle='#6c7a76';g.lineWidth=4;g.beginPath();g.moveTo(90,13);g.lineTo(90,167);g.moveTo(13,90);g.lineTo(167,90);g.stroke();
    g.lineWidth=2;g.strokeRect(42,42,96,96);
    g.fillStyle='#89968d';for(const b of structures){const [x,z]=xy(b.x-b.w/2,b.z+b.d/2);g.fillRect(x,z,b.w*scale,b.d*scale);}
    g.font='10px "Microsoft JhengHei",sans-serif';g.textAlign='center';g.fillStyle='#e1dbc5';g.fillText('北 N',90,8);
    g.fillStyle='#79b7bb';g.beginPath();g.arc(90,90,5,0,Math.PI*2);g.fill();g.fillText('基地',90,106);
    for(const site of landmarks){
      const [x,z]=xy(site.x,site.z);g.fillStyle=site.tint;g.beginPath();g.arc(x,z,this.goal?.id===site.id?5:3,0,Math.PI*2);g.fill();
      g.fillText((discovered.includes(site.id)?'✓':'')+site.short,x,z-8);
    }
    if(stash){const [x,z]=xy(stash.x,stash.z);g.fillStyle=stash.tint;g.fillRect(x-3,z-3,6,6);g.fillText('藏箱',x,z-8);}
    if(state.cache&&!state.cache.claimed&&state.phase==='active'){const [x,z]=xy(state.cache.x,state.cache.z);g.fillStyle='#edc681';g.fillRect(x-2,z-2,5,5);}
    if(state.mode==='defense'){g.fillStyle='#e2c796';g.fillRect(87,75,6,6);}
    g.fillStyle='#cd9589';for(const enemy of state.enemies){const [x,z]=xy(enemy.x,enemy.z);g.fillRect(x-1,z-1,2,2);}
    for(const p of state.players)if(p.online&&p.id!==player.id){const [x,z]=xy(p.x,p.z);g.fillStyle='#a1c5e2';g.beginPath();g.arc(x,z,2.5,0,Math.PI*2);g.fill();}
    const [x,z]=xy(player.x,player.z);g.save();g.translate(x,z);g.rotate(player.yaw);g.fillStyle='#fff2ca';
    g.beginPath();g.moveTo(0,-6);g.lineTo(4,4);g.lineTo(0,2);g.lineTo(-4,4);g.closePath();g.fill();g.restore();
  }
}
