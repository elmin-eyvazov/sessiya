// ---------- игровые механики: XP, уровни, недельный рейтинг, дневная цель, «10 вопросов дня», избранное ----------
function weekKey(d){ d=d||new Date(); const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const day=t.getUTCDay()||7;
  t.setUTCDate(t.getUTCDate()+4-day); const y=t.getUTCFullYear(); const w=Math.ceil(((t-Date.UTC(y,0,1))/864e5+1)/7); return y+'-W'+String(w).padStart(2,'0') }
function getXP(){ const x=store.get('sp_xp',null)||{total:0,week:weekKey(),wk:0}; if(x.week!==weekKey()){ x.week=weekKey(); x.wk=0 } return x }
function levelOf(total){ const L=Math.floor(Math.sqrt((total||0)/50))+1; return {L,from:(L-1)*(L-1)*50,to:L*L*50} }
let lbTimer=null, lbRetry=0;
function award(n){ if(!(n>0)) return; const x=getXP(); x.total+=n; x.wk+=n; store.set('sp_xp',x); clearTimeout(lbTimer); lbTimer=setTimeout(()=>{lbPush();checkBadges()},1500) }
function lbName(u){ return String((u&&u.displayName)||t('student')+' '+String(u&&u.uid||'').slice(0,4)).slice(0,40) }
async function lbPush(){
  const u=FB.user; if(!isReal(u)) return; await catDb(); if(!Cat.db) return; const x=getXP(); if(!x.wk) return;
  try{ await Cat.db.collection('lb').doc(x.week).collection('users').doc(u.uid).set({name:lbName(u),wk:x.wk,at:Date.now()}); lbRetry=0 }catch(e){ console.warn('lb',e); if(lbRetry++<3){ clearTimeout(lbTimer); lbTimer=setTimeout(lbPush,12000) } }
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
    ${planHtml(examPlan())}
    ${srsDue().length?`<button class="btn acbtn" id="hmReview" style="margin-top:14px;background:#7c3aed">🧠 ${t('srs_btn',Math.min(30,srsDue().length))}</button>`:''}
    <div class="row" style="margin-top:14px;gap:8px"><button class="btn" id="hmDaily">${d.day===dayKey()?t('daily_done',d.score):t('daily_btn')}</button><a class="btn sec" data-h="arena">⚔️ ${t('arena_title')}</a><a class="btn sec" data-h="rating">${t('rating_btn')}</a></div>`;
  $('hmDaily').onclick=startDaily; if($('hmPlan')) $('hmPlan').onclick=()=>startPlan($('hmPlan')); if($('hmReview')) $('hmReview').onclick=()=>startReview($('hmReview'));
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
    $('rtList').innerHTML=L.length?L.slice(0,50).map((r,i)=>`<div class="lbrow${r.id===me?' me':''}"><span class="lbn">${i<3?['🥇','🥈','🥉'][i]:i+1}</span><span class="lbname">${esc(r.name)}</span><b>${+r.wk||0} XP</b></div>`).join('')
      :`<div class="empty">${t('rating_empty')}</div>`;
  }catch(e){ $('rtList').innerHTML=`<div class="empty">${t('load_fail')}</div>` }
}

// ---------- избранные вопросы ----------
function favs(id){ return (store.get('sp_fav',{})[id])||[] }
function toggleFav(id,qi){ const f=store.get('sp_fav',{}); const s=new Set(f[id]||[]); s.has(qi)?s.delete(qi):s.add(qi); f[id]=[...s]; if(!f[id].length) delete f[id]; store.set('sp_fav',f); return s.has(qi) }
function syncBkFav(){ const b=$('bkFav'); if(!b||!curBank||curBank.daily) return; const n=favs(curBank.id).length; b.classList.toggle('hide',!n); b.textContent=t('fav_btn',n) }
function drawFavBtn(){ const b=$('qzFav'); if(!b||!Q) return; if(curBank.daily||curBank.review){ b.classList.add('hide'); return } b.classList.remove('hide');
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

// ---------- умное повторение (интервалы как в Anki) ----------
const dayNum=()=>Math.floor((Date.now()-new Date().getTimezoneOffset()*60000)/864e5);
function srsKey(qi){ if(!curBank||curBank.daily) return null; return curBank.review?curBank.refs[qi]:curBank.id+'|'+qi }
function srsRecord(qi,ok){
  const k=srsKey(qi); if(!k) return; const S=store.get('sp_srs',{}); const e=S[k]||{iv:0,n:0};
  if(ok&&!(e.n>0)) planBump(k.slice(0,k.lastIndexOf('|')));
  if(ok){ e.iv=e.iv?Math.min(120,Math.round(e.iv*2.5)):3; e.n=(e.n||0)+1 } else { e.iv=1; e.n=0 }
  e.due=dayNum()+e.iv; S[k]=e; store.set('sp_srs',S);
}
function srsDue(){ const S=store.get('sp_srs',{}), d=dayNum(); return Object.keys(S).filter(k=>S[k].due<=d&&S[k].iv<=60) }
async function startReview(btn){
  const keys=shuffle(srsDue()).slice(0,30); if(!keys.length) return;
  if(btn){ btn.disabled=true; btn.textContent=t('loading') }
  const qs=[],refs=[];
  for(const k of keys){ const i=k.lastIndexOf('|'), id=k.slice(0,i), qi=+k.slice(i+1);
    try{ let arr=bankCache[id]; if(!arr){ const loc=getLocal(id); if(loc&&loc.qs) arr=loc.qs; else { const m=Cat.metas.find(x=>x.id===id); if(m) arr=await Cat.loadQs(m) } if(arr) bankCache[id]=arr }
      const q=arr&&arr[qi]; if(q&&q.o){ qs.push(q); refs.push(k) } else if(arr){ const S=store.get('sp_srs',{}); delete S[k]; store.set('sp_srs',S) } }catch(e){} }
  if(!qs.length){ if(btn){ btn.disabled=false; renderToday() } return }
  curBank={id:'review',name:t('srs_title'),type:'mc',qs,refs,review:true}; startQuiz('practice',qs.map((_,i)=>i));
}

// ---------- план подготовки к экзамену: сколько новых вопросов решать в день ----------
function planBanks(){ const seen=new Set(), L=[];
  mem.banks.filter(b=>b.type!=='written'&&b.qs&&b.qs.length).forEach(b=>{ if(!seen.has(b.id)){ seen.add(b.id); L.push({id:b.id,name:b.name,n:b.qs.length}) } });
  Cat.metas.filter(m=>(m.type||'mc')==='mc'&&m.count).forEach(m=>{ if(!seen.has(m.id)){ seen.add(m.id); L.push({id:m.id,name:m.name,n:m.count}) } });
  return L }
function bankLearned(id){ const S=store.get('sp_srs',{}), p=id+'|'; let k=0; for(const x in S) if(x.startsWith(p)&&S[x].n>0) k++; return k }
function planToday(id){ const P=store.get('sp_plan',{}); return P.day===dayKey()?(P[id]||0):0 }
function planBump(id){ const d=dayKey(); let P=store.get('sp_plan',{}); if(P.day!==d) P={day:d}; P[id]=(P[id]||0)+1; store.set('sp_plan',P) }
function examPlan(){
  const e=exams().map(e=>({...e,n:daysTo(e.d)})).filter(e=>e.n>=0&&e.b).sort((a,b)=>a.n-b.n)[0]; if(!e) return null;
  const bk=planBanks().find(x=>x.id===e.b), total=(bk&&bk.n)||e.bc||0; if(!total) return null;
  const learned=Math.min(total,bankLearned(e.b)), done=planToday(e.b), left=total-learned;
  const per=left?Math.max(5,Math.ceil((left+done)/Math.max(1,e.n))):0;
  return {...e,total,learned,left,done,per} }
function planHtml(p){
  if(!p) return exams().some(e=>daysTo(e.d)>=0&&e.b)?'':`<a class="note" data-h="tools-cal" style="display:block;margin-top:12px;color:var(--acc);cursor:pointer">${t('plan_cta')}</a>`;
  const pct=Math.round(p.learned/p.total*100), dp=p.per?Math.min(100,Math.round(p.done/p.per*100)):100, hot=p.n<=3;
  return `<div style="margin-top:14px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--soft)">
    <div class="row" style="justify-content:space-between;align-items:center;gap:8px"><b>📅 ${esc(p.s)}</b><span class="pill" style="${hot?'background:var(--badbg);color:var(--bad)':'background:var(--acc2);color:var(--acc)'}">${esc(leftLabel(p.n))}</span></div>
    <div class="note" style="margin:10px 0 6px">${t('plan_learned',p.learned,p.total)}</div><div class="bar"><i style="width:${pct}%;background:var(--ok)"></i></div>
    <div class="note" style="margin:10px 0 6px">${p.left?t('plan_today',Math.min(p.done,p.per),p.per)+(p.done>=p.per?' ✅':''):t('plan_done_all')}</div>${p.left?`<div class="bar"><i style="width:${dp}%"></i></div>`:''}
    <button class="btn" id="hmPlan" style="margin-top:12px">${p.left?(p.done>=p.per?t('plan_more'):t('plan_go')):t('plan_repeat')}</button></div>` }
async function startPlan(btn){
  const p=examPlan(); if(!p) return; if(btn){ btn.disabled=true; btn.textContent=t('loading') }
  try{
    let b=getLocal(p.b), qs=b&&b.qs, meta=null;
    if(!qs){ meta=Cat.metas.find(x=>x.id===p.b); if(meta) qs=bankCache[p.b]||(bankCache[p.b]=await Cat.loadQs(meta)) }
    if(!qs||!qs.length) throw 0;
    const S=store.get('sp_srs',{}); const fresh=shuffle(qs.map((_,i)=>i).filter(i=>qs[i].o&&!(S[p.b+'|'+i]&&S[p.b+'|'+i].n>0)));
    const n=Math.min(20,Math.max(5,p.per-p.done)); const ids=(fresh.length?fresh:shuffle(qs.map((_,i)=>i))).slice(0,fresh.length?n:20);
    curBank=b?b:{...meta,shared:true,qs}; startQuiz('practice',ids);
  }catch(e){ if(btn){ btn.disabled=false; renderToday() } }
}

// ---------- график активности за 14 дней ----------
function drawActChart(){
  const box=$('prChart'); if(!box) return; const a=getAct().days; const days=[];
  for(let i=13;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push([d,a[dayKey(d)]||0]) }
  const mx=Math.max(getGoal(),...days.map(x=>x[1]),1);
  box.innerHTML=`<div class="note" style="margin:14px 0 6px">${t('chart_title')}</div><div class="actchart">`+days.map(([d,n])=>`<div title="${dayKey(d)}: ${n}"><i style="height:${Math.max(2,Math.round(n/mx*100))}%${n>=getGoal()?';background:var(--ok)':''}"></i><span>${d.getDate()}</span></div>`).join('')+'</div>';
}

// ---------- озвучка вопроса ----------
function speakQ(){
  if(!('speechSynthesis' in window)||!Q) return; const x=curBank.qs[Q.ids[Q.i]]; speechSynthesis.cancel();
  const lang={az:'az-AZ',ru:'ru-RU',en:'en-US'}[curBank.lang||LANG]||'az-AZ';
  const u=new SpeechSynthesisUtterance(x.q+'. '+Q.order.map((j,k)=>(k+1)+'. '+x.o[j]).join('. ')); u.lang=lang;
  const v=speechSynthesis.getVoices().find(v=>v.lang&&v.lang.toLowerCase().startsWith(lang.slice(0,2))); if(v) u.voice=v; u.rate=.95; speechSynthesis.speak(u);
}

// ---------- тема ----------
function applyTheme(){ const th=store.get('sp_theme','auto'); document.documentElement.classList.toggle('dark',th==='dark'||(th==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches));
  document.querySelectorAll('#pfTheme button').forEach(b=>b.classList.toggle('on',b.dataset.v===th)) }


// ---------- анонимная статистика: дневные счётчики в Firestore (stats/<день>), видят только модераторы ----------
const STAT_KEYS=['v','r','q','a','ai','up','pwa'];
async function statInc(k,n){ n=Math.min(50,Math.max(1,Math.round(n||1))); if(!STAT_KEYS.includes(k)) return;
  try{ await catDb(); if(!Cat.db||!FB.user) return; await Cat.db.doc('stats/'+dayKey()).set({[k]:firebase.firestore.FieldValue.increment(n)},{merge:true}) }catch(e){} }
let statBusy=false;
async function statDaily(){ if(statBusy) return; statBusy=true;
  try{ const d=dayKey(); let T=store.get('sp_statd',{}); if(T.day!==d) T={day:d};
    const mark=k=>{ T[k]=1; store.set('sp_statd',T); return statInc(k) };
    if(!T.v) await mark('v');
    if(!T.r&&isReal(FB.user)) await mark('r');
    if(!T.pwa&&(matchMedia('(display-mode: standalone)').matches||navigator.standalone===true)) await mark('pwa');
  }finally{ statBusy=false } }
window.addEventListener('load',()=>{ setTimeout(()=>fbStart().then(()=>statDaily()),2500); FB.ls.push(()=>setTimeout(statDaily,1000)) });
const ST_L={az:['Tarix','Ziyarət','Hesabla','Test','Cavab','AI','Yükləmə','Tətbiq','📊 Statistika (yalnız moderatorlar görür)','Cəmi'],
  ru:['Дата','Визиты','С аккаунтом','Тесты','Ответы','ИИ','Загрузки','Прил.','📊 Статистика (видят только модераторы)','Всего'],
  en:['Date','Visits','Signed in','Quizzes','Answers','AI','Uploads','App','📊 Stats (moderators only)','Total']};
async function drawStats(){
  const box=$('stCard'); if(!box) return; if(!isAdmin()){ box.classList.add('hide'); return }
  box.classList.remove('hide'); const L=ST_L[LANG]||ST_L.az; box.innerHTML=`<h2>${L[8]}</h2><div class="note">${t('loading')}</div>`;
  try{ await catDb(); const s=await Cat.db.collection('stats').orderBy(firebase.firestore.FieldPath.documentId(),'desc').limit(14).get();
    const rows=s.docs.map(d=>[d.id,d.data()]); const K=['v','r','q','a','ai','up','pwa']; const tot={}; rows.forEach(([,x])=>K.forEach(k=>tot[k]=(tot[k]||0)+(x[k]||0)));
    const td=(v,b)=>`<td style="padding:6px 8px;text-align:right;${b?'font-weight:700':''}">${v}</td>`;
    box.innerHTML=`<h2>${L[8]}</h2><div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:14px">
      <tr class="note">${L.slice(0,8).map((h,i)=>`<th style="padding:6px 8px;text-align:${i?'right':'left'};font-weight:600">${h}</th>`).join('')}</tr>
      ${rows.map(([d,x])=>`<tr style="border-top:1px solid var(--line)"><td style="padding:6px 8px">${esc(d.slice(5))}</td>${K.map(k=>td(x[k]||0)).join('')}</tr>`).join('')}
      <tr style="border-top:2px solid var(--line)"><td style="padding:6px 8px;font-weight:700">${L[9]}</td>${K.map(k=>td(tot[k]||0,1)).join('')}</tr></table></div>`;
  }catch(e){ box.innerHTML=`<h2>${L[8]}</h2><div class="note">${esc(e.code||e.message||'error')}</div>` }
}
