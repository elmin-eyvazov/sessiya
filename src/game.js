// ---------- игровые механики: XP, уровни, недельный рейтинг, дневная цель, «10 вопросов дня», избранное ----------
function weekKey(d){ d=d||new Date(); const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const day=t.getUTCDay()||7;
  t.setUTCDate(t.getUTCDate()+4-day); const y=t.getUTCFullYear(); const w=Math.ceil(((t-Date.UTC(y,0,1))/864e5+1)/7); return y+'-W'+String(w).padStart(2,'0') }
function getXP(){ const x=store.get('sp_xp',null)||{total:0,week:weekKey(),wk:0}; if(x.week!==weekKey()){ x.week=weekKey(); x.wk=0 } return x }
function levelOf(total){ const L=Math.floor(Math.sqrt((total||0)/50))+1; return {L,from:(L-1)*(L-1)*50,to:L*L*50} }
let lbTimer=null;
function award(n){ if(!(n>0)) return; const x=getXP(); x.total+=n; x.wk+=n; store.set('sp_xp',x); clearTimeout(lbTimer); lbTimer=setTimeout(()=>{lbPush();checkBadges()},1500) }
function lbName(u){ return String((u&&u.displayName)||t('student')+' '+String(u&&u.uid||'').slice(0,4)).slice(0,40) }
async function lbPush(){
  const u=FB.user; if(!isReal(u)) return; await catDb(); if(!Cat.db) return; const x=getXP(); if(!x.wk) return;
  try{ await Cat.db.collection('lb').doc(x.week).collection('users').doc(u.uid).set({name:lbName(u),wk:x.wk,at:Date.now()}) }catch(e){ console.warn('lb',e) }
}
async function catDb(){ await fbStart(); if(!Cat.db&&window.firebase&&firebase.apps&&firebase.apps.length){ try{ Cat.db=firebase.firestore() }catch(e){} } return Cat.db }
function getGoal(){ return store.get('sp_goal',20) }
function todayCount(){ return getAct().days[dayKey()]||0 }

// ---------- главная: карточка «Сегодня» ----------
function renderToday(){
  const box=$('hmToday'); if(!box) return;
  const x=getXP(), lv=levelOf(x.total), g=getGoal(), n=todayCount(), s=streak(), d=store.get('sp_daily',{});
  const pct=Math.min(100,Math.round(n/g*100)), lpct=Math.round((x.total-lv.from)/(lv.to-lv.from)*100);
  box.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:10px"><h2 style="margin:0">${t('today_title')}</h2><span class="pill acc">🔥 ${s} · ⭐ ${t('lvl',lv.L)}</span></div>
    <div class="note" style="margin-bottom:6px">${t('goal_lbl',n,g)}${n>=g?' ✅':''}</div><div class="bar"><i style="width:${pct}%"></i></div>
    <div class="note" style="margin:10px 0 6px">${t('xp_lbl',x.total,lv.to)}</div><div class="bar"><i style="width:${lpct}%;background:#f59e0b"></i></div>
    <div class="row" style="margin-top:14px;gap:8px"><button class="btn" id="hmDaily">${d.day===dayKey()?t('daily_done',d.score):t('daily_btn')}</button><a class="btn sec" data-h="arena">⚔️ ${t('arena_title')}</a><a class="btn sec" data-h="rating">${t('rating_btn')}</a></div>`;
  $('hmDaily').onclick=startDaily;
}

// ---------- «10 вопросов дня»: одинаковые для всех в этот день ----------
function seeded(seed){ let h=2166136261; for(const c of seed){ h^=c.charCodeAt(0); h=Math.imul(h,16777619) } return ()=>{ h^=h<<13; h^=h>>>17; h^=h<<5; return ((h>>>0)%1e6)/1e6 } }
const bankCache={};
async function startDaily(){
  const btn=$('hmDaily'); if(btn){ btn.disabled=true; btn.textContent=t('loading') }
  try{
    let src=Cat.staticMetas.filter(m=>m.type==='mc'&&m.lang===(LANG==='ru'?'ru':'az')); if(src.length<3) src=Cat.staticMetas.filter(m=>m.type==='mc');
    const rnd=seeded(dayKey()+'|'+LANG); const pool=[];
    for(const m of src){ if(!bankCache[m.id]) bankCache[m.id]=await Cat.loadQs(m); bankCache[m.id].forEach(q=>pool.push(q)) }
    const qs=[]; const used=new Set(); while(qs.length<10&&used.size<pool.length){ const i=Math.floor(rnd()*pool.length); if(!used.has(i)){ used.add(i); qs.push(pool[i]) } }
    curBank={id:'daily',name:t('daily_title'),type:'mc',qs,daily:true}; startQuiz('practice',qs.map((_,i)=>i));
  }catch(e){ if(btn){ btn.disabled=false; btn.textContent=t('load_fail') } }
}
function dailyFinished(ok,total){ const d=store.get('sp_daily',{}); if(d.day!==dayKey()){ award(30); store.set('sp_dcount',(store.get('sp_dcount',0)||0)+1) } store.set('sp_daily',{day:dayKey(),score:ok+'/'+total}) }

// ---------- недельный рейтинг ----------
async function renderRating(){
  show('rating'); document.title=t('rating_title')+' | Sessiya+';
  const x=getXP(), lv=levelOf(x.total);
  $('rtMe').innerHTML=`⭐ ${t('lvl',lv.L)} · ${t('xp_week',x.wk)} · ${t('xp_total',x.total)}`;
  $('rtList').innerHTML=`<div class="empty">${t('loading')}</div>`;
  await catDb(); if(!Cat.db){ $('rtList').innerHTML=`<div class="empty">${t('acc_err_net')}</div>`; return }
  await lbPush();
  try{
    const s=await Cat.db.collection('lb').doc(weekKey()).collection('users').orderBy('wk','desc').limit(100).get();
    const L=s.docs.map(d=>({id:d.id,...d.data()})); const me=FB.user&&FB.user.uid; const pos=L.findIndex(r=>r.id===me);
    $('rtPos').textContent=pos>=0?t('rating_you',pos+1,L[pos].wk):(x.wk?t('rating_you',(L.length>=100?'100+':L.length+1),x.wk):'');
    $('rtList').innerHTML=L.length?L.slice(0,50).map((r,i)=>`<div class="lbrow${r.id===me?' me':''}"><span class="lbn">${i<3?['🥇','🥈','🥉'][i]:i+1}</span><span class="lbname">${esc(r.name)}</span><b>${r.wk} XP</b></div>`).join('')
      :`<div class="empty">${t('rating_empty')}</div>`;
  }catch(e){ $('rtList').innerHTML=`<div class="empty">${t('load_fail')}</div>` }
}

// ---------- избранные вопросы ----------
function favs(id){ return (store.get('sp_fav',{})[id])||[] }
function toggleFav(id,qi){ const f=store.get('sp_fav',{}); const s=new Set(f[id]||[]); s.has(qi)?s.delete(qi):s.add(qi); f[id]=[...s]; if(!f[id].length) delete f[id]; store.set('sp_fav',f); return s.has(qi) }
function syncBkFav(){ const b=$('bkFav'); if(!b||!curBank||curBank.daily) return; const n=favs(curBank.id).length; b.classList.toggle('hide',!n); b.textContent=t('fav_btn',n) }
function drawFavBtn(){ const b=$('qzFav'); if(!b||!Q) return; if(curBank.daily){ b.classList.add('hide'); return } b.classList.remove('hide');
  const on=favs(curBank.id).includes(Q.ids[Q.i]); b.textContent=on?'★':'☆'; b.title=t('fav_add'); b.classList.toggle('on',on) }

// ---------- достижения ----------
function bestStreak(){ const ks=Object.keys(getAct().days).sort(); let best=0,cur=0,prev=null;
  for(const k of ks){ const d=new Date(k+'T12:00:00'); cur=(prev&&Math.round((d-prev)/864e5)===1)?cur+1:1; best=Math.max(best,cur); prev=d } return best }
const BADGES=[
  ['first','🌱',()=>getAct().total>=1],['q100','📘',()=>getAct().total>=100],['q500','📚',()=>getAct().total>=500],['q1000','🧠',()=>getAct().total>=1000],
  ['s3','🔥',()=>bestStreak()>=3],['s7','⚡',()=>bestStreak()>=7],['s30','👑',()=>bestStreak()>=30],
  ['lv5','⭐',()=>levelOf(getXP().total).L>=5],['lv10','🌟',()=>levelOf(getXP().total).L>=10],
  ['daily','🎯',()=>(store.get('sp_dcount',0)||0)>=1],['daily7','📅',()=>(store.get('sp_dcount',0)||0)>=7],
  ['duel','⚔️',()=>Object.keys(store.get('sp_duels',{})).length>=1],['win','🏆',()=>(store.get('sp_duelwins',0)||0)>=1],['win10','🥇',()=>(store.get('sp_duelwins',0)||0)>=10],
  ['upload','📤',()=>mem.banks.length>=1],['share','🌍',()=>mem.banks.some(b=>b.sharedId)],['fav','★',()=>Object.values(store.get('sp_fav',{})).reduce((n,a)=>n+a.length,0)>=10]
];
function checkBadges(){
  const have=new Set(store.get('sp_badges',[])); const fresh=[];
  for(const [id,ic,ok] of BADGES){ try{ if(!have.has(id)&&ok()){ have.add(id); fresh.push([id,ic]) } }catch(e){} }
  if(fresh.length){ store.set('sp_badges',[...have]); fresh.forEach(([id,ic],i)=>setTimeout(()=>toast(`${ic} ${t('badge_new')}: ${t('b_'+id)}`),i*1800)) }
}
function renderBadges(){
  const box=$('pfBadges'); if(!box) return; const have=new Set(store.get('sp_badges',[]));
  box.innerHTML=`<div class="note" style="margin-bottom:10px">${t('badges_count',have.size,BADGES.length)}</div><div class="badges">`+BADGES.map(([id,ic])=>`<div class="badge${have.has(id)?' on':''}" title="${esc(t('bd_'+id))}"><span>${ic}</span><b>${esc(t('b_'+id))}</b><small>${esc(t('bd_'+id))}</small></div>`).join('')+'</div>';
}
function toast(msg){ const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.classList.add('show'),20); setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),400) },3200) }
