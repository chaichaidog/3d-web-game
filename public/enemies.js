export const enemies = {
  walker: {name:'遊蕩者', hint:'走得慢，適合練習瞄準', hp:28, speed:1.5, scale:1, width:.52, tint:'#b2beb0'},
  runner: {name:'衝刺者', hint:'低頭蓄力時，往旁邊閃', hp:22, speed:2.2, scale:.93, width:.47, tint:'#ffaf82'},
  brute: {name:'護甲怪', hint:'先打掉金色護殼，再打生命值', hp:42, armor:24, speed:1.15, scale:1.22, width:.65, tint:'#ebc478'},
  mire: {name:'孢子怪', hint:'地上亮起圓圈就跑出去', hp:34, speed:1.3, scale:1.1, width:.6, tint:'#c4b9ff'},
  boss: {name:'巨型感染者', hint:'遠離大圓圈，趁它停下來反攻', hp:120, speed:1.3, scale:1.8, width:.94, tint:'#ff9f91'},
  drummer: {name:'鳴鐘怪', hint:'會加速附近的怪，看到藍圈可以先打它', hp:32, speed:1.2, scale:1.15, width:.6, tint:'#88d8e6'},
  swarm: {name:'伏行怪', hint:'身形矮小，記得把準星往下移', hp:14, speed:2.5, scale:.69, width:.4, tint:'#a8d9a4'}
};

export const waveOrder=['walker','runner','brute','mire','boss','drummer','swarm'];
export function waveTypes(wave,count){
  const featured=wave>0?waveOrder[(wave-1)%waveOrder.length]:'walker';
  const pool=waveOrder.slice(1,Math.min(wave,waveOrder.length)).filter(type=>type!=='boss');
  const types=Array.from({length:count},(_,i)=>{
    if(i===0&&featured!=='boss')return featured;
    if(i===1&&wave>1)return 'walker';
    return i%2===0||!pool.length?'walker':pool[(i>>1)%pool.length];
  });
  if(wave%5===0)types.push('boss');
  return types;
}

export const pulseRange = 7;
export const rallyRange = 7;
