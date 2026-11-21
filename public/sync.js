// WebSocket preserves order. Each connection starts with a full state, then patches.
// Decode without mutating earlier frames: the interpolation timeline retains them.
const collections=['players','enemies','shots','fallen'];
const same=(a,b)=>a===b||JSON.stringify(a)===JSON.stringify(b);
export function statePatch(before,after){
  const patch={};
  for(const [key,value] of Object.entries(after)){
    if(collections.includes(key))continue;
    if(!same(before[key],value))patch[key]=value;
  }
  const entities={};
  for(const key of collections){
    const old=new Map((before[key]||[]).map(item=>[item.id,item]));
    const update=[];
    for(const item of after[key]||[]){
      const previous=old.get(item.id);old.delete(item.id);
      if(!previous){update.push(item);continue;}
      const changed={id:item.id};
      for(const [field,value] of Object.entries(item))if(!same(previous[field],value))changed[field]=value;
      if(Object.keys(changed).length>1)update.push(changed);
    }
    if(update.length||old.size)entities[key]={update,remove:[...old.keys()]};
  }
  if(Object.keys(entities).length)patch.entities=entities;
  return patch;
}
export function applyStatePatch(before,patch){
  const {entities,...fields}=patch,next={...before,...fields};
  for(const [key,changes] of Object.entries(entities||{})){
    if(!collections.includes(key))continue;
    const items=new Map((before[key]||[]).map(item=>[item.id,item]));
    for(const id of changes.remove)items.delete(id);
    for(const item of changes.update)items.set(item.id,{...items.get(item.id),...item});
    next[key]=[...items.values()];
  }
  return next;
}
