export const sensors = {
  w:'W 被按住',s:'S 被按住',a:'A 被按住',d:'D 被按住',
  click:'滑鼠左鍵剛按下',mouse:'滑鼠左鍵按住',r:'R 被按住',shift:'Shift 被按住',
  empty:'彈匣是空的', low:'生命低於 40', q:'Q 被按住'
};
export const actions = {
  forward:'向前移動', back:'向後移動', left:'向左移動', right:'向右移動',
  fire:'廣播「發射子彈」', reload:'廣播「更換彈匣」', sprint:'廣播「衝刺」', heal:'廣播「使用補包」'
};
export const weapons = {
  pulse:{name:'脈衝手槍',price:0,damage:14,delay:.32,cap:12,rays:[0],range:45,reloadTime:1,kick:.52,tint:'#dbbc8d',desc:'初始武器，節奏穩定，適合練習瞄準。'},
  scatter:{name:'散光槍',price:15,damage:10,delay:.56,cap:6,rays:[-.14,0,.14],range:34,reloadTime:1,kick:.86,tint:'#e4b57f',desc:'一次三束扇形光彈，適合靠近的怪群。'},
  rapid:{name:'螢火連發槍',price:25,damage:9,delay:.13,cap:28,rays:[0],range:40,reloadTime:1,kick:.26,tint:'#a9ded1',desc:'搭配「滑鼠左鍵按住」積木可連續發射。'},
  comet:{name:'彗星手炮',price:20,damage:34,delay:.65,cap:5,rays:[0],range:30,reloadTime:1.15,kick:1,tint:'#ffab72',desc:'單發威力高、彈量少，適合先打破護殼。'},
  prism:{name:'稜鏡散射器',price:30,damage:8,delay:.71,cap:7,rays:[-.26,-.13,0,.13,.26],range:24,reloadTime:1.25,kick:.84,tint:'#d5b0ff',desc:'五束光彈覆蓋更寬的範圍，適合近距離。'},
  lumen:{name:'極光卡賓槍',price:35,damage:17,delay:.23,cap:16,rays:[0],range:47,reloadTime:.85,kick:.41,tint:'#91e7d6',desc:'容易控制，換彈較快，適合邊走邊打。'},
  nova:{name:'星核長射器',price:45,damage:49,delay:.95,cap:4,rays:[0],range:68,reloadTime:1.5,kick:1.18,tint:'#9ecbff',desc:'射程最遠、單發威力最高，開火與換彈間隔也較長。'}
};
export const core = {x:0,z:12};
export const waveSettings = {defaultLimit:5,maxLimit:20,breakSeconds:20};
export const feedbackLimit = 400;
export const targets = [{x:-3,z:8},{x:0,z:9},{x:3,z:8}];
export const safe = (x,z) => Math.hypot(x,z) <= 5;
export function program(value) {
  if (!value || typeof value.loop!=='boolean' || !Array.isArray(value.rules) || value.rules.length>20) throw Error('積木格式有誤');
  return {loop:value.loop,rules:value.rules.map(rule=>{
    if (!rule || !(rule.when==='' || Object.hasOwn(sensors,rule.when)) || !(rule.do==='' || Object.hasOwn(actions,rule.do))) throw Error('未知積木');
    return {when:rule.when,do:rule.do};
  })};
}
export const fresh = ()=>({loop:false,rules:[]});
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
