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
  pulse:{name:'脈衝手槍',price:0,damage:14,delay:.32,cap:12,spread:0,desc:'一發一束，穩定命中。'},
  scatter:{name:'散光槍',price:15,damage:10,delay:.56,cap:6,spread:.14,desc:'三束扇形光彈，適合靠近的屍群。'},
  rapid:{name:'螢火連發槍',price:25,damage:9,delay:.13,cap:28,spread:0,desc:'搭配按住滑鼠積木，連續發射。'}
};
export const core = {x:0,z:12};
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
