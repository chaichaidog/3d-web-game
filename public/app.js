import {actions,sensors,weapons,safe,fresh,clamp,program} from './rules.js';
import {cover,scene,localShot,setQuality} from './view.js';
import {LiveConnection} from './network.js';
import {SnapshotTimeline} from './timeline.js';
import {inputMask,PredictedMotion} from './motion.js';
import {GunFeedback,unlockAudio,setSound,sound} from './feedback.js';
import {fieldHint,blockHint} from './lesson.js';
const $=id=>document.getElementById(id);
const make=(tag,txt,cls)=>{const el=document.createElement(tag);if(txt!==undefined)el.textContent=txt;if(cls)el.className=cls;return el;};
let session=null,state=null,prev=null,stamp=0,me=null,yaw=0,pitch=0,tap=false,draft=fresh(),active=fresh(),cmdQueue=Promise.resolve(),toastTimer,clock=0,networkError=false;
const held=new Set(), panels=$('panel'), world=$('world'), cards=new Map();
const previewVisibility=new IntersectionObserver(entries=>{for(const e of entries){const card=cards.get(e.target.dataset.player);if(card)card.visible=e.isIntersecting;}});
const motion=new PredictedMotion();
const gun=new GunFeedback();
const timeline=new SnapshotTimeline();
let connection=null,lastHud=0,lastDraw=0,draws=0,perfAt=0,quality='auto';
const qualityButton=make('button','畫質：自動');
qualityButton.onclick=()=>{quality=quality==='auto'?'low':quality==='low'?'high':'auto';setQuality(quality);qualityButton.textContent='畫質：'+({auto:'自動',low:'流暢',high:'精細'}[quality]);};
const performanceLabel=make('span','測量流暢度中…','performance');performanceLabel.id='performance';
$('game').querySelector('nav').append(qualityButton,performanceLabel);
let shotTap=false,hitUntil=0,confirmedHits=0,audioOn=true;
const soundButton=make('button','音效開');
soundButton.onclick=()=>{audioOn=!audioOn;setSound(audioOn);soundButton.textContent=audioOn?'音效開':'音效關';};
$('game').querySelector('nav').append(soundButton);
function animateGun(dt,now){
  if(!me)return;
  const local={...me,x:motion.x,z:motion.z,yaw,pitch};
  const enabled=!panels.open&&!networkError&&!document.hidden&&now*1000-stamp<1200&&state.phase!=='paused';
  if(gun.update(dt,now,local,active,inputMask(held,shotTap),enabled)){
    localShot(world,state,local);sound('fire',me.weapon);
  }
  shotTap=false;
}
let interval=120,guideHidden=false,walked=false,moveTap=false,motionTime=0,lastPreview=0;
function sampleMovement(now){
  if(now<=motionTime)return;
  const dt=clamp((now-motionTime)/1000,0,.06);motionTime=now;
  if(me&&!panels.open&&!networkError&&!document.hidden&&now-stamp<1200&&state.phase!=='paused'){
    motion.advance(active,inputMask(held,moveTap),yaw,dt,me.hp,me.ammo);
  }
  moveTap=false;
}
function refreshGuide(){
  $('guide').hidden=guideHidden;$('resumeGuide').hidden=!guideHidden;
  if(!me||guideHidden)return;
  const hint=fieldHint(active,me,walked);
  $('guideStep').textContent='新手練習　'+hint.stage;$('guideTitle').textContent=hint.title;$('guideText').textContent=hint.text;
  $('guideAction').hidden=!hint.action;$('guideAction').textContent=hint.action==='home'?'返回基地':'打開積木';
  $('guideAction').onclick=hint.action==='home'?()=>$('backBtn').click():()=>openPanel('blocks');
}
$('skipGuide').onclick=()=>{guideHidden=true;sessionStorage.setItem('outpost.guide.'+session.id,'hide');refreshGuide();};
$('resumeGuide').onclick=()=>{guideHidden=false;sessionStorage.removeItem('outpost.guide.'+session.id);refreshGuide();};
function notify(msg){$('toast').textContent=msg;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').textContent='',3000);}
function message(msg){const el=$('panelMessage');if(panels.open&&el)el.textContent=msg;else notify(msg);}
async function api(name,body={}){
  if(connection&&name!=='create'&&name!=='join')return connection.call(name,body);
  const res=await fetch('/api/'+name,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(6000)});
  const data=await res.json();if(!res.ok){const err=Error(data.error||'連線失敗');err.status=res.status;throw err;}return data;
}
function action(fn){return async ev=>{try{await fn(ev);}catch(err){message(err.message);}};}
function initLobby(){cover($('cover'));}
new ResizeObserver(initLobby).observe($('cover'));
$('role').onclick=()=>{const teacher=$('create').hidden;$('join').hidden=teacher;$('create').hidden=!teacher;$('entryTitle').textContent=teacher?'建立教室':'加入小隊';$('role').textContent=teacher?'← 學生加入':'老師開房 ↗';$('entryError').textContent='';};
for(const form of ['join','create'])$(form).onsubmit=async e=>{
  e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;
  try{const joined=await api(form,form==='join'?{name:$('name').value,code:$('code').value}:{key:$('key').value});$('key').value='';await enter(joined);}
  catch(err){$('entryError').textContent=err.message;}finally{button.disabled=false;}
};
async function enter(s){
  session=s;
  const saved=await api('restore');if(!s.teacher){draft=saved.draft;active=saved.code;guideHidden=sessionStorage.getItem('outpost.guide.'+s.id)==='hide';walked=sessionStorage.getItem('outpost.walked.'+s.id)==='yes';}
  sessionStorage.setItem('outpost.session',JSON.stringify(s));
  $('lobby').hidden=true;$(s.teacher?'teacher':'game').hidden=false;
  if(s.teacher)$('roomTitle').textContent='房號　'+s.code;
  $('status').textContent=(s.teacher?'老師指揮台':'學生連線中')+' ／ '+s.code;
  const leave=make('button','離開教室','link');leave.onclick=()=>{if(confirm('離開此分頁的角色？重新整理可繼續目前角色。')){sessionStorage.removeItem('outpost.session');location.reload();}};document.querySelector('header').append(leave);
  connection=new LiveConnection(s,receiveState,connected=>{
    networkError=!connected;
    $('status').textContent=(connected?(s.teacher?'老師指揮台':'學生連線中'):'正在重新連線…')+' ／ '+s.code;
    if(!connected)resetKeys();
  },()=>{sessionStorage.removeItem('outpost.session');location.reload();});
  connection.setSuspended(document.hidden);
  setInterval(sendInput,33);
  requestAnimationFrame(frame);
}
function sendInput(){
  if(!session||!connection)return;
  sampleMovement(performance.now());
  if(connection.input({keys:[...held],tap,yaw,pitch,editor:panels.open,epoch:motion.epoch,steps:motion.pending}))tap=false;
}
function receiveState(s,serverTime){
    const now=performance.now();if(stamp)interval=clamp(interval*.45+(now-stamp)*.55,45,500);
    timeline.push(s,serverTime,now);
    prev=state;state=s;stamp=now;me=s.players.find(p=>p.id===session.id);
    if(me){
      if(!prev){yaw=me.yaw;pitch=me.pitch;}
      motion.reconcile(me,active,state.phase==='paused');
      gun.sync(me);
      if(prev&&me.hit>confirmedHits){hitUntil=performance.now()+180;sound('hit',me.weapon);}
      confirmedHits=me.hit;
      if(!walked&&(me.walked||Math.hypot(me.x,me.z)>.55)){walked=true;sessionStorage.setItem('outpost.walked.'+session.id,'yes');}
    }
    if(networkError){networkError=false;$('status').textContent='已重新連線 ／ '+s.code;}
    if(now-lastHud>180){lastHud=now;if(session.teacher)monitor();else if(me){hud();refreshGuide();}}
}
const phaseLabel={ready:'準備中',active:'交戰中',paused:'已暫停',clear:'本波完成',lost:'可重試'};
function hud(){
  const isSafe=safe(me.x,me.z);
  $('hud').textContent=(isSafe?'安全區':'野外')+'　♥ '+me.hp+'　◈ '+me.coins+'　'+weapons[me.weapon].name+'　'+(me.reload>0?'換彈中':me.ammo+'/'+weapons[me.weapon].cap);
  const mission=!me.walked?'走出基地光圈':!me.hits?'命中任一練習靶':!state.kills?'和全隊擊敗一隻殭屍':!me.gear?'回商店買一把新武器':'自由挑戰：加入自動換彈或衝刺';
  $('task').textContent=(guideHidden||me.hits?'任務　'+mission+'　｜　':'')+'第 '+state.wave+' 波 · '+phaseLabel[state.phase]+(state.mode==='defense'?'　發電機 '+state.coreHp+'%':state.cache&&state.phase==='active'?(state.cache.claimed?'　已取得補給':'　野外補給 '+Math.round(Math.hypot(me.x-state.cache.x,me.z-state.cache.z))+' m'):'');
  $('shopBtn').disabled=$('editBtn').disabled=!isSafe;$('helpBtn').textContent=me.help?'收回舉手':'舉手求助';
}
function frame(now){
  if(!session)return;const dt=clamp((now-clock)/1000,0,.05);clock=now;
  if(session.teacher&&state&&!document.hidden&&now-lastPreview>=160){
    lastPreview=now;const view=betweenSnapshots(now);
    for(const p of view.players){const card=cards.get(p.id);if(card&&p.online&&card.visible)scene(card.c,view,p);}
  }
  if(!session.teacher&&me&&!document.hidden&&!panels.open){
    if(held.has('arrowleft'))yaw-=dt*1.8;if(held.has('arrowright'))yaw+=dt*1.8;
    sampleMovement(now);
    animateGun(dt,now/1000);
    const camera=motion.renderPosition(dt);
    if(now-lastDraw>=15){
      const gap=now-lastDraw;lastDraw=now;draws++;
      const mark=now<hitUntil?'✳':'＋';if($('reticle').textContent!==mark)$('reticle').textContent=mark;
      $('reticle').style.transform='translate(-50%,-50%) scale('+(1+gun.kick*.35)+')';
      scene(world,betweenSnapshots(now),{...me,...camera},{yaw,pitch,kick:gun.kick,lastFire:gun.lastFire,frameMs:gap});
      if(world.dataset.error)$('task').textContent=world.dataset.error;
    }
    if(now-perfAt>1500){
      const fps=Math.round(draws*1000/(now-perfAt));draws=0;perfAt=now;
      performanceLabel.textContent=fps+' FPS · 連線 '+Math.round(connection?.rtt||0)+' ms';
      world.dataset.fps=String(fps);
    }
  }
  requestAnimationFrame(frame);
}
function betweenSnapshots(now){
  return state?.phase==='paused'?state:timeline.sample(now,session.teacher?220:100)||state;
}
function resetKeys(){motionTime=performance.now();held.clear();tap=false;moveTap=false;shotTap=false;sendInput();}
window.addEventListener('blur',resetKeys);
document.addEventListener('visibilitychange',()=>{
  resetKeys();connection?.setSuspended(document.hidden);
  // Exclude time spent on another tab or in an editor from the FPS sample.
  perfAt=performance.now();draws=0;lastDraw=perfAt;
});
window.addEventListener('keydown',e=>{
  if(!me)return;const k=e.key.toLowerCase();
  if(k==='tab'&&!e.repeat&&!panels.open){e.preventDefault();openPanel('blocks');return;}
  if(panels.open)return;
  if(['arrowleft','arrowright','shift','w','a','s','d','r','q'].includes(k)){e.preventDefault();if(!held.has(k)){sampleMovement(performance.now());held.add(k);sendInput();}}
});window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(held.has(k)){sampleMovement(performance.now());held.delete(k);sendInput();}});
world.addEventListener('mousedown',e=>{
  if(e.button!==0)return;
  unlockAudio();held.add('mouse');tap=true;moveTap=true;shotTap=true;world.focus();
  animateGun(0,performance.now()/1000);
  sendInput();
  if(!document.pointerLockElement)world.requestPointerLock?.()?.catch?.(()=>{});
});
window.addEventListener('mouseup',()=>{held.delete('mouse');sendInput();});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===world){yaw+=e.movementX*.0026;pitch=clamp(pitch-e.movementY*.0018,-.32,.32);}});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)resetKeys();});
function openPanel(kind){
  if(!me||!safe(me.x,me.z)){notify('回到安全區就能使用');return;}
  document.exitPointerLock?.();resetKeys();panels.showModal();
  if(kind==='blocks')bench();else shop();
}
$('closePanel').onclick=()=>panels.close();panels.addEventListener('close',()=>{resetKeys();perfAt=performance.now();draws=0;lastDraw=perfAt;});
$('editBtn').onclick=()=>openPanel('blocks');$('shopBtn').onclick=()=>openPanel('shop');
$('backBtn').onclick=action(async()=>{resetKeys();await api('home');notify('已回基地補給');});
$('helpBtn').onclick=action(()=>api('help',{on:!me.help}));
function sendDraft(data){const copy=structuredClone(data);cmdQueue=cmdQueue.catch(()=>{}).then(()=>api('draft',copy));cmdQueue.catch(e=>message(e.message));}
function changed(){sendDraft(draft);bench();}
function block(label,cls,fn){const b=make('button',label,'block '+cls);b.type='button';b.onclick=fn;return b;}
function bench(){
  $('panelTitle').textContent='角色積木';const host=$('panelBody');host.replaceChildren();
  const intro=make('p','','bench-hint');intro.setAttribute('aria-live','polite');
  const guided=!guideHidden&&(!me.hits);
  const controls=new Map();
  function cue(){
    for(const el of controls.values())el.classList.remove('next-step');
    if(!guided){intro.textContent='點選或拖入積木，選好條件與動作後執行。';return;}
    const hint=blockHint(draft,active,walked);
    intro.textContent='下一步　'+hint.text;controls.get(hint.target+(hint.i??''))?.classList.add('next-step');
  }
  const benchEl=make('div',undefined,'bench'),palette=make('div',undefined,'palette'),stack=make('div',undefined,'stack');
  function insert(kind){
    if(kind==='loop')draft.loop=true;
    else if(!draft.loop){message('先加入「重複無限次」');return;}
    else if(kind==='if'&&draft.rules.length<20)draft.rules.push({when:'',do:''});
    changed();
  }
  for(const [kind,label] of [['loop','重複無限次'],['if','如果…那麼']]){
    const b=block(label,'control',()=>insert(kind));controls.set(kind,b);b.draggable=true;b.ondragstart=e=>e.dataTransfer.setData('text/plain',kind);palette.append(b);
  }
  stack.ondragover=e=>e.preventDefault();stack.ondrop=e=>{e.preventDefault();const kind=e.dataTransfer.getData('text/plain');if(['loop','if'].includes(kind))insert(kind);};
  stack.append(make('div','⚑　當按下開始時','block event'));
  if(!draft.loop)stack.append(make('div','將「重複無限次」放在這裡','slot'));
  else{
    const loop=make('div',undefined,'rules');loop.append(make('strong','↻ 重複無限次','block control'));
    if(!draft.rules.length)loop.append(make('div','把「如果…那麼」拖進來','slot'));
    draft.rules.forEach((rule,i)=>{
      const row=make('div',undefined,'rule'),del=make('button','×','tiny');del.title='移除此條件';del.onclick=()=>{draft.rules.splice(i,1);changed();};row.append(del);
      for(const [prop,options,className,placeholder] of [['when',sensors,'sense','選擇條件'],['do',actions,'act','選擇動作']]){
        const line=make('div');line.append(prop==='when'?'如果 ':'那麼 ');const sel=make('select',undefined,'block '+className);sel.setAttribute('aria-label',placeholder);sel.append(new Option(placeholder,''));
        for(const [v,label] of Object.entries(options))sel.append(new Option(label,v));sel.value=rule[prop];controls.set(prop+i,sel);sel.onchange=()=>{rule[prop]=sel.value;sendDraft(draft);cue();};line.append(sel);row.append(line);
      }
      loop.append(row);
    });stack.append(loop);
  }
  benchEl.append(palette,stack);const bar=make('div',undefined,'tools');
  const run=block('▶　執行我的程式','primary',action(async()=>{await cmdQueue.catch(()=>{});await api('run',draft);active=structuredClone(draft);panels.close();notify('程式已啟動，試試你的按鍵');}));
  const revert=make('button','還原到上次執行');revert.onclick=()=>{draft=structuredClone(active);changed();};
  const save=make('button','下載積木');save.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));const a=make('a');a.href=url;a.download='outpost-blocks.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);};
  const restore=make('button','匯入積木');restore.onclick=()=>{const file=make('input');file.type='file';file.accept='.json';file.onchange=action(async()=>{const f=file.files[0];if(!f)return;if(f.size>16000)throw Error('檔案太大');draft=program(JSON.parse(await f.text()));changed();});file.click();};
  controls.set('run',run);bar.append(run,revert,save,restore);const feedback=make('div','','panelmsg');feedback.id='panelMessage';host.append(intro,benchEl,bar,feedback);cue();
}
function shop(){
  $('panelTitle').textContent='基地補給站';const host=$('panelBody');host.replaceChildren(make('p','錢包　◈ '+me.coins+'　｜　醫療包 '+me.kits));
  for(const [key,data] of [...Object.entries(weapons),['kit',{name:'醫療包',price:5,desc:'搭配「使用補包」廣播恢復 45 生命。'}]]){
    const row=make('div',undefined,'shelf'),info=make('div');info.append(make('b',data.name),make('p',data.desc));const owned=me.owned.includes(key),equipped=me.weapon===key;
    const b=make('button',equipped?'已裝備':owned?'裝備':'◈ '+data.price+'　購買');b.disabled=equipped||(!owned&&me.coins<data.price);
    b.onclick=action(async()=>{b.disabled=true;await api('shop',{item:key});await new Promise(ok=>setTimeout(ok,200));if(panels.open)shop();notify('裝備已更新');});row.append(info,b);host.append(row);
  }
}
function listing(code){return '⚑ 當按下開始時'+(code.loop?'\n  ↻ 重複無限次':'')+code.rules.map(r=>'\n    如果 '+(sensors[r.when]||'…')+' → '+(actions[r.do]||'…')).join('');}
function monitor(){
  $('round').textContent='第 '+state.wave+' 波　'+phaseLabel[state.phase]+'　｜　'+(state.mode==='defense'?'據點防守 · 發電機 '+state.coreHp+'%':'自由生存')+'　｜　'+state.message;
  $('pauseBtn').textContent=state.phase==='paused'?'繼續':'暫停';$('pauseBtn').disabled=!['paused','active'].includes(state.phase);
  $('waveBtn').disabled=!state.players.length||['paused','active'].includes(state.phase);$('waveBtn').textContent=state.phase==='lost'?'重試本波':'開始下一波';
  if(!state.players.length)$('cards').textContent='等學生輸入房號加入…';
  for(const p of state.players){
    if(!cards.has(p.id)){if(!cards.size)$('cards').replaceChildren();const card=make('article',undefined,'card'),name=make('h3'),c=make('canvas'),meta=make('p'),b=make('pre');card.append(name,c,meta,b);$('cards').append(card);cards.set(p.id,{name,c,meta,b,visible:true});c.dataset.player=p.id;previewVisibility.observe(c);}
    const ui=cards.get(p.id);ui.name.textContent=(p.help?'✋ ':'')+p.name+(p.online?'':' · 離線');
    ui.meta.textContent=(p.editor?'正在準備':'遊戲中')+'　♥ '+p.hp+'　◈ '+p.coins+'　'+weapons[p.weapon].name;
    ui.b.textContent='目前積木草稿\n'+listing(p.draft)+(JSON.stringify(p.draft)!==JSON.stringify(p.code)?'\n\n執行中版本\n'+listing(p.code):'');
  }
}
for(const [id,cmd] of [['waveBtn','next'],['pauseBtn','pause'],['recallBtn','recall'],['modeBtn','mode']])$(id).onclick=action(async()=>{
  if(cmd==='mode'&&state.wave>0&&!confirm('切換模式會重新從第 1 波開始，裝備與積木會保留。'))return;
  await api('teacher',{cmd,mode:$('mode').value});
});
try{const old=JSON.parse(sessionStorage.getItem('outpost.session'));if(old)enter(old).catch(()=>{sessionStorage.removeItem('outpost.session');session=null;});}catch{}
