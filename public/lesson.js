import {safe} from './rules.js';
const matches=(code,when,action)=>code.loop&&code.rules.some(r=>when.includes(r.when)&&r.do===action);
export const hasWalk=code=>matches(code,['w'],'forward');
export const hasFire=code=>matches(code,['mouse','click'],'fire');
export function fieldHint(code,me,walked){
  if(!hasWalk(code))return {stage:'1 / 3',title:'先讓角色聽懂 W',text:'角色的按鍵還是空的。打開積木，幫它接上「按住 W 就向前」。',action:'edit'};
  if(!walked)return {stage:'1 / 3',title:'試走第一步',text:'關閉積木後，按住鍵盤 W 一下。看看前面的練習靶有沒有靠近。'};
  if(!hasFire(code))return {stage:'2 / 3',title:'幫滑鼠接上射擊',text:safe(me.x,me.z)?'走路成功！保留 W，再加一條「滑鼠左鍵按住」的規則。':'走路成功！先返回基地，才能替滑鼠加上射擊。',action:safe(me.x,me.z)?'edit':'home'};
  if(!me.hits)return {stage:'3 / 3',title:'命中第一個練習靶',text:safe(me.x,me.z)?'朝正前方的練習靶按住 W。畫面左上變成「野外」時放手，安全區內不能開槍。':'點遊戲畫面，把十字準星對準有靶心的牌子，按住左鍵。Esc 可以放開滑鼠。'};
  return {stage:'3 / 3　✓',title:'打靶成功！',text:'想再試一次就挑戰練習殭屍，也可以選探索目的地，看看各地有什麼能幫到隊友。'};
}
export function blockHint(draft,active,walked){
  const shooting=hasWalk(active)&&walked;
  const when=shooting?['mouse','click']:['w'],act=shooting?'fire':'forward';
  if(!draft.loop)return {target:'loop',text:'點「重複無限次」。這樣電腦會一直檢查你有沒有按鍵。'};
  if(matches(draft,when,act))return {target:'run',text:'這條規則接好了。點「執行我的程式」，然後回遊戲試試。'};
  let i=draft.rules.findIndex(r=>when.includes(r.when));
  if(i!==-1)return {target:'do',i,text:'在這條規則的「那麼」選「'+(shooting?'廣播「發射子彈」':'向前移動')+'」。'};
  i=draft.rules.findIndex(r=>!r.when||!r.do);
  if(i!==-1)return {target:'when',i,text:'點「如果」旁的選單，選「'+(shooting?'滑鼠左鍵按住':'W 被按住')+'」。'};
  return {target:'if',text:shooting?'保留走路的規則。再點一次「如果…那麼」，加一條給滑鼠。':'點「如果…那麼」，加一條規則來偵測鍵盤。'};
}
