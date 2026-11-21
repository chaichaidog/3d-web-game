import {landmarks} from './world.js';

const site = id => landmarks.find(landmark => landmark.id === id);
export const activities = [
  {...site('town'), name:'街區集合燈', action:'點亮街區集合燈', hint:'讓隊友在遠處也看得到集合點', kind:'lamp'},
  {...site('woods'), name:'林地彈藥箱', action:'補滿我的彈匣', hint:'替自己補滿目前的彈匣', kind:'ammo'},
  {...site('depot'), name:'貨站醫療箱', action:'打開貨站醫療箱', hint:'全隊每人多拿 1 個醫療包', kind:'medical'},
  {...site('signal'), name:'訊號站終端機', action:'啟動訊號站', hint:'把隱藏物資的位置傳給全隊', kind:'signal'},
  {id:'stash', x:27, z:-49, name:'訊號站藏箱', short:'藏箱', action:'打開藏箱', hint:'全隊每人拿到 3 枚金幣', kind:'stash', tint:'#ebc27c'}
];

export function availableActivities(state) {
  if (state.mode !== 'survival') return [];
  return state.activities?.signal ? activities : activities.slice(0, 4);
}

export function claimedBy(state, player, activity) {
  return Boolean(activity.kind === 'ammo' ? player.ammoCacheUsed : state.activities?.[activity.id]);
}

export const nearActivity = (player, activity) => Math.hypot(player.x - activity.x, player.z - activity.z) <= 3;
export const inPracticeLane = player => Math.abs(player.x) <= 4 && player.z > 5 && player.z <= 13;
export const isPracticeVisible = (enemy, player) => !enemy.practiceOwner || enemy.practiceOwner === player.id;
