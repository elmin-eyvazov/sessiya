// Meydan — студенческий футбол. Одна страница, Firebase (Auth + Firestore), всё остальное в браузере.
'use strict';
const FB_CONFIG={apiKey:"AIzaSyC_N1DLI9V8fkmZY6kBS0cNX5uxGQAn2e0",authDomain:"sessiya-23601.firebaseapp.com",projectId:"sessiya-23601",
  storageBucket:"sessiya-23601.firebasestorage.app",messagingSenderId:"175959046502",appId:"1:175959046502:web:10f3dea120ccad80da30a7"};
const FB_SDK='https://www.gstatic.com/firebasejs/10.12.2/';

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let LANG=store.get('mz_lang',/^ru/i.test(navigator.language||'')?'ru':'az'); if(!I18N[LANG]) LANG='az';
function t(k,...a){ let s=(I18N[LANG]&&I18N[LANG][k])??I18N.az[k]??k; a.forEach((v,i)=>s=s.split('{'+i+'}').join(v)); return s }
function toast(m){ document.querySelectorAll('.toast').forEach(x=>x.remove()); const e=document.createElement('div'); e.className='toast'; e.textContent=m; document.body.appendChild(e); requestAnimationFrame(()=>e.classList.add('show')); setTimeout(()=>{e.classList.remove('show');setTimeout(()=>e.remove(),300)},2600) }
const uniName=id=>{ const u=UNIS.find(x=>x[0]===id); return u?u[1]:(id||'') };
const uniShort=id=>uniName(id).split(' — ')[0];
const pad=n=>String(n).padStart(2,'0');
const dayKey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
function atOf(date,time){ const [y,m,d]=date.split('-').map(Number), [h,mi]=time.split(':').map(Number); return new Date(y,m-1,d,h,mi).getTime() }
const MON={az:['yan','fev','mar','apr','may','iyn','iyl','avq','sen','okt','noy','dek'],ru:['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'],en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']};
const WD={az:['B.','B.e.','Ç.a.','Ç.','C.a.','C.','Ş.'],ru:['вс','пн','вт','ср','чт','пт','сб'],en:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']};
function whenLabel(at){ const d=new Date(at), now=new Date(), t0=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(), diff=Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()-t0)/864e5);
  const day=diff===0?t('today'):diff===1?t('tomorrow'):`${d.getDate()} ${MON[LANG][d.getMonth()]}, ${WD[LANG][d.getDay()]}`;
  return day+' · '+pad(d.getHours())+':'+pad(d.getMinutes()) }
const initials=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?';
function avColor(s){ let h=0; for(const c of String(s)) h=(h*31+c.charCodeAt(0))%360; return `hsl(${h},45%,38%)` }
const courseLabel=c=>c==='mag'?t('course_mag'):c==='grad'?t('course_grad'):c?t('course_n',c):'';
const safeUrl=u=>/^https:\/\/[^\s"'<>]+$/i.test(String(u||''));
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error(src)); document.head.appendChild(s) }) }

// ---------- состояние ----------
const S={db:null,user:null,me:null,admin:false,games:[],gamesReady:false,users:[],usersReady:false,pitches:[],filter:store.get('mz_filter','all'),err:null};
const isReal=()=>!!(S.user&&!S.user.isAnonymous);
// админы — документы mz_admins/<uid> (создаются вручную в консоли Firebase)
const isAdmin=()=>!!(isReal()&&S.admin);
const hasProfile=()=>!!(S.me&&S.me.name&&S.me.uni&&S.me.course);
function emit(){ try{ route(true) }catch(e){ console.error(e) } }

async function fbInit(){
  try{
    for(const f of ['firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js']) await loadScript(FB_SDK+f);
    if(!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    S.db=firebase.firestore(); const auth=firebase.auth(); auth.languageCode=LANG;
    try{ await auth.getRedirectResult() }catch(e){}
    auth.onAuthStateChanged(async u=>{ S.user=u; S.me=null; S.admin=false; if(u&&!u.isAnonymous) await loadMe(); emit() });
    subscribe();
  }catch(e){ S.err='net'; S.gamesReady=S.usersReady=true; emit() }
}
function subscribe(){
  S.db.collection('mz_games').where('at','>=',Date.now()-60*864e5).orderBy('at').limit(500).onSnapshot(s=>{
    S.games=s.docs.map(d=>({id:d.id,...d.data()})).filter(validGame); S.gamesReady=true; S.err=null; emit() },e=>{ S.gamesReady=true; S.err=e.code||'net'; emit() });
  S.db.collection('mz_users').orderBy('upd','desc').limit(400).onSnapshot(s=>{
    S.users=s.docs.map(d=>({id:d.id,...d.data()})).filter(u=>typeof u.name==='string'&&u.name.length<=60); S.usersReady=true; emit() },()=>{ S.usersReady=true; emit() });
  S.db.collection('mz_pitches').orderBy('createdAt','desc').limit(300).onSnapshot(s=>{
    S.pitches=s.docs.map(d=>({id:d.id,...d.data()})).filter(p=>!p.hidden&&typeof p.name==='string'&&p.name.length<=80); emit() },()=>{});
}
// чужие документы проверяем, чтобы битые данные не ломали страницу
function validGame(g){ return g&&!g.hidden&&(g.type==='p'||g.type==='o')&&typeof g.at==='number'&&Array.isArray(g.players)&&g.players.length<=30&&typeof g.host==='string'
  &&Number.isInteger(g.need)&&g.need>=1&&g.need<=30&&FORMATS.includes(g.fmt)&&(!g.pn||typeof g.pn==='object')&&(!g.req||typeof g.req==='object') }
async function loadMe(){
  try{ const d=await S.db.doc('mz_users/'+S.user.uid).get(); S.me=d.exists?d.data():null }catch(e){ S.me=null }
  try{ const a=await S.db.doc('mz_admins/'+S.user.uid).get(); S.admin=a.exists }catch(e){ S.admin=false }
}
const allPitches=()=>[...PITCHES0,...S.pitches];
const pitchById=id=>allPitches().find(p=>p.id===id);

// ---------- общие куски интерфейса ----------
function setNav(n){ document.querySelectorAll('nav.tabs a').forEach(a=>a.classList.toggle('on',a.dataset.n===n)) }
function applyI18n(){ document.documentElement.lang=LANG; document.querySelectorAll('[data-i]').forEach(e=>e.textContent=t(e.dataset.i)); document.querySelectorAll('#lang button').forEach(b=>b.classList.toggle('on',b.dataset.l===LANG)); drawInstall() }
const capOf=g=>g.type==='p'?g.need+1:g.fmt;
const isOver=g=>g.at+(g.dur||60)*6e4<Date.now();
function statusTag(g){
  if(g.status==='cancelled') return `<span class="tag x">${t('cancelled')}</span>`;
  if(g.status==='done') return `<span class="tag d">${t('done')}</span>`;
  if(isOver(g)) return `<span class="tag d">${t('past')}</span>`;
  return g.type==='p'?`<span class="tag p">${t('f_players')}</span>`:`<span class="tag o">${g.opp?'🤝 '+t('vs'):t('f_opp')}</span>` }
const placeOf=g=>{ const p=pitchById(g.pitch); return g.pitchName||(p&&p.name)||'' };
function gameCard(g){
  const cap=capOf(g), n=g.players.length, nreq=Object.keys(g.req||{}).length;
  const right=g.status==='done'?`<b style="font-size:18px">${+g.sA||0}:${+g.sB||0}</b>`:(g.price?`<b>${t('azn',esc(g.price))}</b>`:`<span class="note">${t('free')}</span>`);
  const title=g.type==='o'?(g.opp?`${esc(g.team)} ${t('vs')} ${esc(g.opp.t)}`:esc(g.team)+' — '+t('type_opp')):`${esc(g.team||t('type_players'))}`;
  return `<a class="game" href="#g-${esc(g.id)}"><div class="gtop"><div>${statusTag(g)} <span class="tag">${g.fmt}×${g.fmt}</span>${g.uniOnly?` <span class="tag">🎓 ${esc(uniShort(g.uniOnly))}</span>`:''}</div>${right}</div>
    <div class="gt">${title}</div>
    <div class="meta"><span>🕒 ${esc(whenLabel(g.at))}</span><span>📍 ${esc(placeOf(g)||'—')}</span><span>👤 ${esc(g.hostName||'')}${g.hostUni?' · '+esc(uniShort(g.hostUni)):''}</span></div>
    ${g.type==='p'&&g.status!=='cancelled'&&g.status!=='done'?`<div class="bar"><i style="width:${Math.min(100,Math.round(n/cap*100))}%"></i></div><div class="note" style="margin-top:4px">${t('spots',n,cap)}</div>`:''}
    ${g.type==='o'&&!g.opp&&g.status==='open'&&nreq?`<div class="note" style="margin-top:6px">⚔️ ${t('requests',nreq)}</div>`:''}</a>` }
function needLogin(){ openLogin(); return false }
function guard(){ if(!isReal()) return needLogin(); if(!hasProfile()){ toast(t('need_profile')); location.hash='me'; return false } return true }
const errText=e=>e&&e.code==='permission-denied'?t('err_perm'):(e&&e.message&&e.message.startsWith('MZ:')?e.message.slice(3):t('err_net'));

// ---------- главная: лента игр ----------
const FILTERS=[['all','f_all'],['p','f_players'],['o','f_opp'],['today','f_today'],['week','f_week'],['myuni','f_myuni'],['mine','f_mine']];
function renderHome(){
  setNav('home'); const now=Date.now(), uid=S.user&&S.user.uid;
  const f=S.filter; let L=S.games.filter(g=>(g.status!=='cancelled'&&g.at+(g.dur||60)*6e4>=now-3*36e5)||(g.host===uid&&g.at>=now-864e5));
  const today=dayKey(new Date());
  if(f==='p') L=L.filter(g=>g.type==='p'); if(f==='o') L=L.filter(g=>g.type==='o');
  if(f==='today') L=L.filter(g=>dayKey(new Date(g.at))===today); if(f==='week') L=L.filter(g=>g.at<=now+7*864e5);
  if(f==='myuni') L=L.filter(g=>S.me&&(g.hostUni===S.me.uni||g.uniOnly===S.me.uni));
  if(f==='mine') L=L.filter(g=>uid&&(g.host===uid||g.players.includes(uid)||(g.opp&&g.opp.uid===uid)||(g.req&&g.req[uid])));
  L.sort((a,b)=>a.at-b.at);
  const emptyMsg=S.err&&S.err!=='net'&&S.err!=='unavailable'?t('err_perm'):S.err?t('err_net'):t('empty_games');
  $('view').innerHTML=`<div class="card hero"><h1>${t('hero_t')}</h1><div class="note" style="font-size:14px">${t('hero_s')}</div>
      <div class="row" style="margin-top:14px"><a class="btn" href="#new" style="background:#fff;color:#0f3d2a">＋ ${t('new_game')}</a><a class="btn sec" href="#players" style="background:rgba(255,255,255,.18);color:#fff">👥 ${t('nav_players')}</a></div></div>
    <div class="chips" id="flt">${FILTERS.map(([k,l])=>`<button class="chip${f===k?' on':''}" data-f="${k}">${t(l)}</button>`).join('')}</div>
    <div id="glist">${!S.gamesReady?`<div class="empty">${t('loading')}</div>`:L.length?L.map(gameCard).join(''):`<div class="empty">${emptyMsg}</div>`}</div>
    ${renderTable()}`;
  $('flt').onclick=e=>{ const b=e.target.closest('[data-f]'); if(!b) return; S.filter=b.dataset.f; store.set('mz_filter',S.filter); renderHome() };
}
function renderTable(){
  const T={}; S.games.filter(g=>g.type==='o'&&g.status==='done'&&g.opp&&Number.isInteger(g.sA)&&Number.isInteger(g.sB)).forEach(g=>{
    const a=g.hostUni||'other', b=g.opp.u||'other'; [a,b].forEach(u=>T[u]=T[u]||{p:0,w:0,d:0,l:0});
    T[a].p++; T[b].p++; if(g.sA>g.sB){T[a].w++;T[b].l++} else if(g.sA<g.sB){T[b].w++;T[a].l++} else {T[a].d++;T[b].d++} });
  const rows=Object.entries(T).map(([u,v])=>({u,...v,pts:v.w*3+v.d})).sort((x,y)=>y.pts-x.pts||y.w-x.w);
  if(!rows.length) return '';
  return `<div class="card"><h2>🏆 ${t('table_t')}</h2><div class="note" style="margin:-6px 0 8px">${t('table_s')}</div><table class="lb"><tr><th>#</th><th style="text-align:left">🎓</th><th>${t('t_played')}</th><th>${t('t_win')}</th><th>${t('t_draw')}</th><th>${t('t_loss')}</th><th>${t('t_pts')}</th></tr>
    ${rows.slice(0,20).map((r,i)=>`<tr><td>${i+1}</td><td style="text-align:left">${esc(uniShort(r.u))}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td><b>${r.pts}</b></td></tr>`).join('')}</table></div>` }

// ---------- создание игры ----------
let NG=null;
const PITCH_TEXT=['other','uni','azfar'];
function renderNew(){
  setNav('new'); if(!isReal()){ $('view').innerHTML=`<div class="card"><h2>${t('new_game')}</h2><p class="muted">${t('need_login')}</p><button class="btn" id="lg">${t('login')}</button></div>`; $('lg').onclick=openLogin; return }
  if(!hasProfile()){ toast(t('need_profile')); location.hash='me'; return }
  NG=NG||{type:'p',pitch:'',pitchName:'',date:dayKey(new Date(Date.now()+864e5)),time:'19:00',dur:60,fmt:6,need:5,team:'',price:'',level:'any',uniOnly:'',note:''};
  if(S.prePitch){ NG.pitch=S.prePitch; S.prePitch=null }
  const times=[]; for(let h=7;h<24;h++) for(const m of [0,30]) times.push(pad(h)+':'+pad(m));
  $('view').innerHTML=`<div class="card"><h1>⚽ ${t('new_game')}</h1>
    <label class="f">${t('f_type')}</label>
    <div class="seg" id="ngType"><button data-v="p" class="${NG.type==='p'?'on':''}"><b>🙋 ${t('type_players')}</b><span class="note">${t('type_players_d')}</span></button><button data-v="o" class="${NG.type==='o'?'on':''}"><b>⚔️ ${t('type_opp')}</b><span class="note">${t('type_opp_d')}</span></button></div>
    <label class="f">${t('f_pitch')} *</label><select id="ngPitch"><option value="">—</option>${allPitches().map(p=>`<option value="${esc(p.id)}"${NG.pitch===p.id?' selected':''}>${esc(p.name)}${p.district?' · '+esc(p.district):''}</option>`).join('')}<option value="other"${NG.pitch==='other'?' selected':''}>✏️ ${t('f_pitch_other')}</option></select>
    <input id="ngPitchName" class="${PITCH_TEXT.includes(NG.pitch)?'':'hide'}" style="margin-top:6px" maxlength="80" placeholder="${esc(t('pc_name'))} / ${esc(t('pc_addr'))}" value="${esc(NG.pitchName)}">
    <label class="f">${t('f_date')} *</label><input type="date" id="ngDate" min="${dayKey(new Date())}" max="${dayKey(new Date(Date.now()+90*864e5))}" value="${esc(NG.date)}">
    <div class="two"><div><label class="f">${t('f_time')} *</label><select id="ngTime">${times.map(x=>`<option${x===NG.time?' selected':''}>${x}</option>`).join('')}</select></div>
      <div><label class="f">${t('f_dur')}</label><select id="ngDur">${[60,90,120].map(x=>`<option value="${x}"${x===NG.dur?' selected':''}>${t('dur_'+x)}</option>`).join('')}</select></div></div>
    <label class="f">${t('f_fmt')}</label><div class="pills" id="ngFmt">${FORMATS.map(x=>`<button data-v="${x}" class="${NG.fmt===x?'on':''}">${x}×${x}</button>`).join('')}</div>
    <div class="${NG.type==='p'?'':'hide'}"><label class="f">${t('f_need')} <span class="note">(${t('f_need_h')})</span></label><input type="number" id="ngNeed" min="1" max="29" value="${NG.need}"></div>
    <label class="f">${t('f_team')}${NG.type==='o'?' *':''}</label><input id="ngTeam" maxlength="40" placeholder="${esc(t('f_team_ph'))}" value="${esc(NG.team)}">
    <div class="two"><div><label class="f">${t('f_price')}</label><input type="number" id="ngPrice" min="0" max="200" step="0.5" placeholder="0" value="${esc(NG.price)}"><div class="note">${t('f_price_h')}</div></div>
      <div><label class="f">${t('f_level')}</label><select id="ngLevel">${['any',...LEVELS].map(x=>`<option value="${x}"${NG.level===x?' selected':''}>${t('lvl_'+x)}</option>`).join('')}</select></div></div>
    <label class="f">${t('f_uni')}</label><select id="ngUni"><option value="">${t('f_uni_any')}</option><option value="${esc(S.me.uni)}"${NG.uniOnly?' selected':''}>${t('f_uni_mine')} (${esc(uniShort(S.me.uni))})</option></select>
    <label class="f">${t('f_note')}</label><textarea id="ngNote" maxlength="500" placeholder="${esc(t('f_note_ph'))}">${esc(NG.note)}</textarea>
    <div class="err" id="ngErr"></div>
    <button class="btn w" id="ngGo" style="margin-top:12px">✅ ${t('publish')}</button></div>`;
  const sync=()=>{ NG.pitch=$('ngPitch').value; NG.pitchName=$('ngPitchName').value.trim(); NG.date=$('ngDate').value; NG.time=$('ngTime').value; NG.dur=+$('ngDur').value;
    NG.need=Math.max(1,Math.min(29,parseInt($('ngNeed').value)||1)); NG.team=$('ngTeam').value.trim(); NG.price=$('ngPrice').value; NG.level=$('ngLevel').value; NG.uniOnly=$('ngUni').value; NG.note=$('ngNote').value.trim() };
  $('ngType').onclick=e=>{ const b=e.target.closest('[data-v]'); if(!b) return; sync(); NG.type=b.dataset.v; renderNew() };
  $('ngFmt').onclick=e=>{ const b=e.target.closest('[data-v]'); if(!b) return; sync(); NG.fmt=+b.dataset.v; NG.need=Math.max(1,NG.fmt*2-1); renderNew() };
  $('ngPitch').onchange=()=>{ sync(); $('ngPitchName').classList.toggle('hide',!PITCH_TEXT.includes(NG.pitch)) };
  $('ngGo').onclick=async()=>{ sync(); const err=$('ngErr'); err.textContent='';
    if(!NG.pitch||(NG.pitch==='other'&&NG.pitchName.length<2)||!/^\d{4}-\d{2}-\d{2}$/.test(NG.date)||(NG.type==='o'&&!NG.team)){ err.textContent=t('err_fields'); return }
    const at=atOf(NG.date,NG.time); if(!(at>Date.now()-5*6e4)){ err.textContent=t('err_past'); return }
    if(at>Date.now()+90*864e5){ err.textContent=t('err_fields'); return }
    const p=pitchById(NG.pitch), price=NG.price===''?null:Math.max(0,Math.min(200,Math.round((parseFloat(NG.price)||0)*10)/10));
    const pitchName=NG.pitch==='other'?NG.pitchName:((p?p.name:'')+(NG.pitchName&&PITCH_TEXT.includes(NG.pitch)?' — '+NG.pitchName:''));
    const uid=S.user.uid, doc={type:NG.type,pitch:NG.pitch,pitchName:pitchName.slice(0,120),date:NG.date,time:NG.time,at,dur:NG.dur,fmt:NG.fmt,need:NG.type==='p'?NG.need:NG.fmt,
      team:NG.team.slice(0,40),price,level:NG.level,uniOnly:NG.uniOnly,note:NG.note.slice(0,500),host:uid,hostName:S.me.name,hostUni:S.me.uni,
      players:NG.type==='p'?[uid]:[],pn:NG.type==='p'?{[uid]:{n:S.me.name,u:S.me.uni}}:{},req:{},opp:null,status:'open',sA:null,sB:null,hidden:false,createdAt:Date.now()};
    $('ngGo').disabled=true;
    try{ const r=await S.db.collection('mz_games').add(doc); NG=null; location.hash='g-'+r.id; toast('✅') }
    catch(e){ err.textContent=errText(e); $('ngGo').disabled=false }
  };
}

// ---------- страница игры ----------
function personRow(uid,x,extra=''){ const u=S.users.find(y=>y.id===uid)||{}; const n=(x&&x.n)||u.name||'?', un=(x&&x.u)||u.uni;
  return `<div class="who"><a class="av" href="#p-${esc(uid)}" style="background:${avColor(uid)};text-decoration:none">${esc(initials(n))}</a><div style="flex:1;min-width:0"><a class="n" href="#p-${esc(uid)}" style="color:inherit;text-decoration:none">${esc(n)}</a><div class="s">${x&&x.t?'🛡️ '+esc(x.t)+' · ':''}${esc(uniShort(un))}${u.pos?' · '+t('pos_'+u.pos):''}${u.course?' · '+courseLabel(u.course):''}</div></div>${extra}</div>` }
function renderGame(id){
  setNav('home'); const g=S.games.find(x=>x.id===id);
  if(!g){ $('view').innerHTML=`<div class="empty">${S.gamesReady?'🤷':t('loading')}</div>`;
    if(S.gamesReady&&S.db&&!S.tried){ S.tried=id; S.db.doc('mz_games/'+id).get().then(d=>{ if(d.exists&&validGame({id,...d.data()})){ S.games.push({id,...d.data()}); renderGame(id) } }).catch(()=>{}) } return }
  const me=S.user&&S.user.uid, mine=!!me&&g.host===me, p=pitchById(g.pitch), place=placeOf(g);
  const cap=capOf(g), inGame=!!me&&g.players.includes(me), started=g.at<=Date.now(), open=g.status==='open'&&!started;
  const reqs=Object.entries(g.req||{}).filter(([u,r])=>r&&typeof r.t==='string'), myReq=me&&g.req&&g.req[me];
  let action='';
  if(g.status==='cancelled') action=`<span class="tag x">${t('cancelled')}</span>`;
  else if(g.type==='p'){
    if(inGame&&!mine) action=open?`<div class="row"><span class="tag p">${t('joined')}</span><button class="btn sec small" id="gLeave">${t('leave')}</button></div>`:`<span class="tag p">${t('joined')}</span>`;
    else if(!mine&&open) action=g.players.length>=cap?`<span class="tag d">${t('full')}</span>`:`<button class="btn w" id="gJoin">⚽ ${t('join')} · ${t('spots_left',cap-g.players.length)}</button>`;
  } else if(!mine&&open&&!g.opp){
    action=myReq?`<span class="tag o">${t('challenged')}</span>`:`<div class="note">${t('req_note')}</div><div class="row" style="margin-top:8px;flex-wrap:nowrap"><input id="gReqTeam" maxlength="40" placeholder="${esc(t('your_team'))}"><button class="btn" id="gReq">⚔️ ${t('challenge')}</button></div>`;
  }
  const score=`<div class="sc">${+g.sA||0}:${+g.sB||0}</div>`;
  const vs=g.type==='o'?`<div class="vs"><div><div class="t">${esc(g.team)}</div><div class="note">${esc(uniShort(g.hostUni))}</div></div><div>${g.status==='done'?score:`<b class="muted">${t('vs')}</b>`}</div>
      <div>${g.opp?`<div class="t">${esc(g.opp.t)}</div><div class="note">${esc(uniShort(g.opp.u))}</div>`:`<div class="note">❔ ${t('opp_wait')}</div>`}</div></div>`:(g.status==='done'?`<div class="vs"><div class="t">A</div>${score}<div class="t">B</div></div>`:'');
  const reqCard=mine&&g.type==='o'&&!g.opp&&g.status==='open'?`<div class="card"><h2>⚔️ ${t('requests',reqs.length)}</h2>${reqs.length?reqs.map(([u,r])=>personRow(u,{n:r.n,u:r.u,t:r.t},`<div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn small" data-acc="${esc(u)}">${t('accept')}</button><button class="btn sec small" data-rej="${esc(u)}" aria-label="✕">✕</button></div>`)).join(''):`<div class="empty">${t('no_requests')}</div>`}</div>`:'';
  const canScore=mine&&started&&g.status!=='cancelled'&&g.status!=='done'&&(g.type==='p'||g.opp);
  const hostCard=mine||isAdmin()?`<div class="card">${canScore?`<h2>${t('set_score')}</h2><div class="row" style="flex-wrap:nowrap"><input type="number" id="sA" min="0" max="99" placeholder="${esc(g.type==='o'?g.team:t('our'))}"><b>:</b><input type="number" id="sB" min="0" max="99" placeholder="${esc(g.opp?g.opp.t:t('their'))}"><button class="btn" id="gScore">${t('save')}</button></div>`:''}
      <div class="row" style="margin-top:${canScore?10:0}px">${mine&&g.status==='open'&&!started?`<button class="btn danger small" id="gCancel">${t('cancel_game')}</button>`:''}${isAdmin()?`<button class="btn sec small" id="gHide">${t('admin_hide')}</button>`:''}</div></div>`:'';
  $('view').innerHTML=`<div class="card"><div class="gtop"><div>${statusTag(g)} <span class="tag">${g.fmt}×${g.fmt}</span> ${g.level&&g.level!=='any'?`<span class="tag">${t('lvl_'+g.level)}</span>`:''}</div><button class="btn ghost small" id="gShare">📤 ${t('share')}</button></div>
      <h1 style="margin-top:10px">${g.type==='o'?'⚔️ '+t('type_opp'):'🙋 '+esc(g.team||t('type_players'))}</h1>${vs}
      <div class="kv" style="margin-top:8px"><b>${t('when')}</b><span>🕒 ${esc(whenLabel(g.at))} · ${t('dur_'+(g.dur||60))}</span>
        <b>${t('where')}</b><span>📍 ${esc(place)}${p&&safeUrl(p.map)?` · <a href="${esc(p.map)}" target="_blank" rel="noopener">${t('map')}</a>`:''}</span>
        <b>${t('who')}</b><span>${g.uniOnly?'🎓 '+esc(uniName(g.uniOnly)):t('f_uni_any')}</span>
        <b>💰</b><span>${g.price?t('azn',esc(g.price)):t('free')}</span></div>
      ${g.note?`<div style="margin-top:10px;padding:10px 12px;background:var(--soft);border-radius:12px;white-space:pre-wrap;word-break:break-word">${esc(g.note)}</div>`:''}
      ${g.type==='p'&&g.status!=='cancelled'&&g.status!=='done'?`<div class="bar"><i style="width:${Math.min(100,Math.round(g.players.length/cap*100))}%"></i></div><div class="note" style="margin-top:4px">${t('spots',g.players.length,cap)}</div>`:''}
      <div style="margin-top:14px">${action}</div><div class="err" id="gErr"></div></div>
    <div class="card"><h2>${t('host')}</h2>${personRow(g.host,{n:g.hostName,u:g.hostUni},mine?'':`<button class="btn sec small" data-contact="${esc(g.host)}">💬 ${t('contact')}</button>`)}
      ${g.opp?`<h2 style="margin-top:14px">${t('their')}</h2>${personRow(g.opp.uid,{n:g.opp.n,u:g.opp.u,t:g.opp.t},g.opp.uid===me?'':`<button class="btn sec small" data-contact="${esc(g.opp.uid)}">💬 ${t('contact')}</button>`)}`:''}
      ${g.type==='p'?`<h2 style="margin-top:14px">${t('roster')} (${g.players.length})</h2>${g.players.map(u=>personRow(u,(g.pn||{})[u])).join('')}`:''}</div>
    ${reqCard}${hostCard}`;
  const run=async fn=>{ $('gErr').textContent=''; try{ await fn() }catch(e){ console.warn(e); $('gErr').textContent=errText(e) } };
  const ref=S.db.doc('mz_games/'+g.id);
  if($('gJoin')) $('gJoin').onclick=()=>{ if(!guard()) return; if(g.uniOnly&&S.me.uni!==g.uniOnly){ $('gErr').textContent='🎓 '+uniName(g.uniOnly); return }
    run(()=>S.db.runTransaction(async tx=>{ const d=(await tx.get(ref)).data(); if(!d||d.status!=='open'||d.at<=Date.now()) throw new Error('MZ:'+t('full'));
      if(d.players.includes(S.user.uid)) return; if(d.players.length>=d.need+1) throw new Error('MZ:'+t('full'));
      const players=[...d.players,S.user.uid]; tx.update(ref,{players,['pn.'+S.user.uid]:{n:S.me.name,u:S.me.uni},status:players.length>=d.need+1?'full':'open'}) })) };
  if($('gLeave')) $('gLeave').onclick=()=>run(()=>S.db.runTransaction(async tx=>{ const d=(await tx.get(ref)).data(); if(!d) return;
      tx.update(ref,{players:d.players.filter(u=>u!==S.user.uid),['pn.'+S.user.uid]:firebase.firestore.FieldValue.delete(),status:d.status==='full'?'open':d.status}) }));
  if($('gReq')) $('gReq').onclick=()=>{ if(!guard()) return; const tm=$('gReqTeam').value.trim(); if(!tm){ $('gReqTeam').focus(); return }
    run(()=>ref.update({['req.'+S.user.uid]:{t:tm.slice(0,40),u:S.me.uni,n:S.me.name,at:Date.now()}})) };
  document.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{ const u=b.dataset.acc, r=g.req[u]; run(()=>ref.update({opp:{uid:u,t:r.t,u:r.u,n:r.n},status:'full'})) });
  document.querySelectorAll('[data-rej]').forEach(b=>b.onclick=()=>run(()=>ref.update({['req.'+b.dataset.rej]:firebase.firestore.FieldValue.delete()})));
  if($('gCancel')) $('gCancel').onclick=()=>{ if(!confirmTwice($('gCancel'))) return; run(()=>ref.update({status:'cancelled'})) };
  if($('gScore')) $('gScore').onclick=()=>{ const a=parseInt($('sA').value), b=parseInt($('sB').value); if(!(a>=0&&a<100&&b>=0&&b<100)){ $('gErr').textContent=t('err_fields'); return }
    run(async()=>{ await ref.update({sA:a,sB:b,status:'done'}); toast(t('score_saved')) }) };
  if($('gHide')) $('gHide').onclick=()=>run(async()=>{ await ref.update({hidden:true}); toast(t('hidden')); location.hash='home' });
  $('gShare').onclick=()=>shareGame(g,place);
  document.querySelectorAll('[data-contact]').forEach(b=>b.onclick=()=>showContact(b.dataset.contact));
}
function confirmTwice(b){ if(b.dataset.c==='1') return true; b.dataset.c='1'; const old=b.textContent; b.textContent='❓ '+old; setTimeout(()=>{ b.dataset.c=''; b.textContent=old },3000); return false }
async function shareGame(g,place){
  const url=location.origin+location.pathname+'#g-'+g.id, text=t('share_text',g.type==='o'?g.team+' — '+t('type_opp'):`${g.fmt}×${g.fmt} ${t('type_players')}`,whenLabel(g.at),place);
  if(navigator.share){ try{ await navigator.share({text,url}); return }catch(e){ if(e.name==='AbortError') return } }
  try{ await navigator.clipboard.writeText(text+' '+url); toast(t('copied')) }catch(e){ window.open('https://wa.me/?text='+encodeURIComponent(text+' '+url),'_blank') }
}
async function showContact(uid){
  if(!isReal()) return needLogin();
  let c=null; try{ const d=await S.db.doc('mz_contacts/'+uid).get(); c=d.exists?d.data():null }catch(e){}
  const u=S.users.find(x=>x.id===uid)||{}; const phone=c&&String(c.phone||'').replace(/[^\d+]/g,''), tg=c&&String(c.tg||'').replace(/[^A-Za-z0-9_]/g,'');
  modal(`<h2>💬 ${esc(u.name||t('contact'))}</h2>${phone?`<a class="btn w" style="margin:6px 0;background:#25D366" href="https://wa.me/${esc(phone.replace('+',''))}" target="_blank" rel="noopener">WhatsApp · ${esc(c.phone)}</a>`:''}
    ${tg?`<a class="btn w" style="margin:6px 0;background:#229ED9" href="https://t.me/${esc(tg)}" target="_blank" rel="noopener">Telegram · @${esc(tg)}</a>`:''}${!phone&&!tg?`<div class="empty">—</div>`:''}
    <a class="btn sec w" style="margin-top:6px" href="#p-${esc(uid)}" data-close>${t('open_profile')}</a>`) }
function modal(html){ const m=document.createElement('div'); m.className='modal'; m.innerHTML=`<div class="sheet">${html}<button class="btn sec w" style="margin-top:10px" data-close>✕</button></div>`;
  m.onclick=e=>{ if(e.target===m||e.target.closest('[data-close]')) m.remove() }; document.body.appendChild(m); return m }

// ---------- площадки ----------
function renderPitches(){
  setNav('pitches'); const cnt=id=>S.games.filter(g=>g.pitch===id&&g.at>=Date.now()&&g.status!=='cancelled').length;
  $('view').innerHTML=`<div class="card"><h1>📍 ${t('pitches_t')}</h1><div class="note">${t('pitches_s')}</div><button class="btn" id="pAdd" style="margin-top:12px">＋ ${t('add_pitch')}</button></div>
    ${allPitches().map(p=>`<div class="pitch"><div class="gtop"><b>${esc(p.name)}</b>${cnt(p.id)?`<span class="tag p">⚽ ${cnt(p.id)}</span>`:''}</div>
      <div class="meta" style="margin-top:4px">${p.district?`<span>🗺️ ${esc(p.district)}</span>`:''}${p.addr?`<span>📌 ${esc(p.addr)}</span>`:''}${p.price?`<span>💰 ${t('per_hour',esc(p.price))}</span>`:''}${p.phone?`<span>📞 <a href="tel:${esc(String(p.phone).replace(/[^\d+]/g,''))}">${esc(p.phone)}</a></span>`:''}</div>
      ${p.note?`<div class="note" style="margin-top:4px">${esc(p.note)}</div>`:''}
      <div class="row" style="margin-top:8px">${safeUrl(p.map)?`<a class="btn sec small" href="${esc(p.map)}" target="_blank" rel="noopener">🗺️ ${t('map')}</a>`:''}<button class="btn sec small" data-pitch="${esc(p.id)}">＋ ${t('new_game')}</button>${isAdmin()&&!PITCHES0.includes(p)?`<button class="btn sec small" data-hidep="${esc(p.id)}">${t('admin_hide')}</button>`:''}</div></div>`).join('')}`;
  document.querySelectorAll('[data-pitch]').forEach(b=>b.onclick=()=>{ S.prePitch=b.dataset.pitch; if(NG) NG.pitch=b.dataset.pitch; location.hash='new' });
  document.querySelectorAll('[data-hidep]').forEach(b=>b.onclick=async()=>{ try{ await S.db.doc('mz_pitches/'+b.dataset.hidep).update({hidden:true}); toast(t('hidden')) }catch(e){ toast(t('err_perm')) } });
  $('pAdd').onclick=()=>{ if(!guard()) return;
    const m=modal(`<h2>＋ ${t('add_pitch')}</h2><label class="f">${t('pc_name')} *</label><input id="pcN" maxlength="80"><div class="two"><div><label class="f">${t('pc_district')}</label><select id="pcD">${DISTRICTS.map(d=>`<option>${d}</option>`).join('')}</select></div><div><label class="f">${t('pc_price')}</label><input id="pcP" type="number" min="0" max="500"></div></div>
      <label class="f">${t('pc_addr')}</label><input id="pcA" maxlength="120"><label class="f">${t('pc_map')}</label><input id="pcM" maxlength="300" placeholder="https://maps.app.goo.gl/…"><label class="f">${t('pc_phone')}</label><input id="pcT" maxlength="20" inputmode="tel">
      <label class="f">${t('pc_note')}</label><input id="pcNo" maxlength="200"><div class="err" id="pcE"></div><button class="btn w" id="pcGo" style="margin-top:10px">${t('save')}</button>`);
    m.querySelector('#pcGo').onclick=async()=>{ const n=$('pcN').value.trim(), map=$('pcM').value.trim(); if(n.length<3){ $('pcE').textContent=t('err_fields'); return }
      if(map&&!safeUrl(map)){ $('pcE').textContent='Google Maps: https://…'; return }
      const price=$('pcP').value===''?null:Math.max(0,Math.min(500,parseFloat($('pcP').value)||0));
      try{ await S.db.collection('mz_pitches').add({name:n.slice(0,80),district:$('pcD').value,addr:$('pcA').value.trim().slice(0,120),map:map.slice(0,300),price,phone:$('pcT').value.trim().slice(0,20),note:$('pcNo').value.trim().slice(0,200),by:S.user.uid,createdAt:Date.now(),hidden:false}); m.remove(); toast('✅') }
      catch(e){ $('pcE').textContent=errText(e) } } };
}

// ---------- игроки ----------
const PF={uni:'',pos:'',ready:false,q:''};
const isReady=u=>!!(u.ready&&u.readyAt>Date.now()-7*864e5);
function playerRow(u){
  return `<a class="who" href="#p-${esc(u.id)}" style="text-decoration:none;color:inherit"><span class="av" style="background:${avColor(u.id)}">${esc(initials(u.name))}</span><div style="flex:1;min-width:0"><div class="n">${esc(u.name)} ${isReady(u)?'<span class="tag p">🔥</span>':''}</div>
    <div class="s">${esc(uniShort(u.uni))}${u.course?' · '+courseLabel(u.course):''}${u.spec?' · '+esc(u.spec):''}${u.pos?' · '+t('pos_'+u.pos):''}</div></div></a>` }
function renderPlayers(){
  setNav('players'); const q=PF.q.toLowerCase();
  const L=S.users.filter(u=>(!PF.uni||u.uni===PF.uni)&&(!PF.pos||u.pos===PF.pos)&&(!PF.ready||isReady(u))&&(!q||(u.name+' '+(u.spec||'')).toLowerCase().includes(q))).sort((a,b)=>isReady(b)-isReady(a));
  const listHtml=()=>!S.usersReady?`<div class="empty">${t('loading')}</div>`:L.length?L.slice(0,200).map(playerRow).join(''):`<div class="empty">${t('empty_players')}</div>`;
  if($('plist')&&document.activeElement&&document.activeElement.id==='pfQ'){ $('plist').innerHTML=listHtml(); return }
  $('view').innerHTML=`<div class="card"><h1>👥 ${t('players_t')}</h1><div class="note">${t('players_s')}</div>
    <div class="two" style="margin-top:10px"><select id="pfU"><option value="">🎓 ${t('f_all')}</option>${UNIS.map(u=>`<option value="${u[0]}"${PF.uni===u[0]?' selected':''}>${esc(u[1])}</option>`).join('')}</select>
    <select id="pfP"><option value="">⚽ ${t('f_all')}</option>${POSITIONS.map(p=>`<option value="${p}"${PF.pos===p?' selected':''}>${t('pos_'+p)}</option>`).join('')}</select></div>
    <div class="row" style="margin-top:8px;flex-wrap:nowrap"><input id="pfQ" placeholder="🔎" value="${esc(PF.q)}"><button class="chip${PF.ready?' on':''}" id="pfR">🔥 ${t('ready_only')}</button></div></div>
    <div class="card" id="plist">${listHtml()}</div>`;
  $('pfU').onchange=()=>{ PF.uni=$('pfU').value; renderPlayers() }; $('pfP').onchange=()=>{ PF.pos=$('pfP').value; renderPlayers() };
  $('pfR').onclick=()=>{ PF.ready=!PF.ready; renderPlayers() };
  $('pfQ').oninput=()=>{ PF.q=$('pfQ').value; renderPlayers() };
}
function renderPlayer(uid){
  setNav('players'); const u=S.users.find(x=>x.id===uid);
  if(!u){ $('view').innerHTML=`<div class="empty">${S.usersReady?'🤷':t('loading')}</div>`; return }
  const G=S.games.filter(g=>g.host===uid||g.players.includes(uid)||(g.opp&&g.opp.uid===uid));
  const up=G.filter(g=>g.at>=Date.now()&&g.status!=='cancelled').sort((a,b)=>a.at-b.at);
  $('view').innerHTML=`<div class="card" style="text-align:center"><div class="av" style="width:72px;height:72px;font-size:26px;margin:0 auto 8px;background:${avColor(uid)}">${esc(initials(u.name))}</div>
      <h1>${esc(u.name)} ${isReady(u)?'🔥':''}</h1><div class="muted">${esc(uniName(u.uni))}</div><div class="note">${[courseLabel(u.course),u.spec&&esc(u.spec),u.pos&&t('pos_'+u.pos),u.level&&t('lvl_'+u.level)].filter(Boolean).join(' · ')}</div>
      ${u.bio?`<p style="white-space:pre-wrap;word-break:break-word">${esc(u.bio)}</p>`:''}
      <div class="row" style="margin-top:10px"><div class="stat"><b>${G.length}</b><span class="note">${t('stat_games')}</span></div><div class="stat"><b>${G.filter(g=>g.host===uid).length}</b><span class="note">${t('stat_hosted')}</span></div></div>
      ${!S.user||S.user.uid!==uid?`<button class="btn w" style="margin-top:12px" id="pC">💬 ${t('contact')}</button>`:''}</div>
    ${up.length?`<h2 style="margin:16px 4px 0">${t('me_games')}</h2>${up.map(gameCard).join('')}`:''}`;
  if($('pC')) $('pC').onclick=()=>showContact(uid);
}

// ---------- профиль ----------
async function renderMe(){
  setNav('me');
  if(!isReal()){ $('view').innerHTML=`<div class="card"><h1>👤 ${t('nav_me')}</h1><p class="muted">${t('need_login')}</p>${loginBox()}</div>`; bindLogin(); return }
  const m=S.me||{name:S.user.displayName||'',uni:'',course:'',spec:'',pos:'any',level:'2',ready:false,bio:''};
  let c={}; try{ const d=await S.db.doc('mz_contacts/'+S.user.uid).get(); c=d.exists?d.data():{} }catch(e){}
  if(location.hash!=='#me') return;
  const mineG=S.games.filter(g=>g.host===S.user.uid||g.players.includes(S.user.uid)||(g.opp&&g.opp.uid===S.user.uid)).sort((a,b)=>b.at-a.at);
  $('view').innerHTML=`<div class="card"><div class="gtop"><h1>👤 ${t('nav_me')}</h1><button class="btn sec small" id="out">${t('logout')}</button></div>
    ${!hasProfile()?`<div class="note" style="color:var(--warn);font-weight:600">${t('need_profile')}</div>`:''}
    <label class="f">${t('p_name')} *</label><input id="mN" maxlength="60" value="${esc(m.name)}">
    <label class="f">${t('p_uni')} *</label><select id="mU"><option value="">—</option>${UNIS.map(u=>`<option value="${u[0]}"${m.uni===u[0]?' selected':''}>${esc(u[1])}</option>`).join('')}</select>
    <div class="two"><div><label class="f">${t('p_course')} *</label><select id="mC"><option value="">—</option>${COURSES.map(x=>`<option value="${x}"${m.course===x?' selected':''}>${courseLabel(x)}</option>`).join('')}</select></div>
      <div><label class="f">${t('p_spec')}</label><input id="mS" maxlength="60" placeholder="${esc(t('p_spec_ph'))}" value="${esc(m.spec)}"></div></div>
    <div class="two"><div><label class="f">${t('p_pos')}</label><select id="mP">${POSITIONS.map(x=>`<option value="${x}"${m.pos===x?' selected':''}>${t('pos_'+x)}</option>`).join('')}</select></div>
      <div><label class="f">${t('p_level')}</label><select id="mL">${LEVELS.map(x=>`<option value="${x}"${m.level===x?' selected':''}>${t('lvl_'+x)}</option>`).join('')}</select></div></div>
    <label class="f" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="mR" style="width:auto"${isReady(m)?' checked':''}> 🔥 ${t('p_ready')}</label>
    <label class="f">${t('p_bio')}</label><textarea id="mB" maxlength="300">${esc(m.bio||'')}</textarea>
    <div class="two"><div><label class="f">${t('p_phone')}</label><input id="mPh" maxlength="20" inputmode="tel" placeholder="${esc(t('p_phone_ph'))}" value="${esc(c.phone||'')}"></div>
      <div><label class="f">${t('p_tg')}</label><input id="mT" maxlength="32" placeholder="${esc(t('p_tg_ph'))}" value="${esc(c.tg||'')}"></div></div>
    <div class="note">🔒 ${t('p_contact_h')}</div>
    <div class="err" id="mE"></div><button class="btn w" id="mSave" style="margin-top:12px">${t('save')}</button></div>
    ${mineG.length?`<h2 style="margin:16px 4px 0">${t('me_games')}</h2>${mineG.slice(0,30).map(gameCard).join('')}`:''}`;
  $('out').onclick=async()=>{ await firebase.auth().signOut(); location.hash='home' };
  $('mSave').onclick=async()=>{ const name=$('mN').value.trim(), uni=$('mU').value, course=$('mC').value; $('mE').textContent='';
    if(name.length<2||!uni||!course){ $('mE').textContent=t('err_fields'); return }
    const doc={name:name.slice(0,60),uni,course,spec:$('mS').value.trim().slice(0,60),pos:$('mP').value,level:$('mL').value,ready:$('mR').checked,readyAt:$('mR').checked?Date.now():0,bio:$('mB').value.trim().slice(0,300),upd:Date.now()};
    const ct={phone:$('mPh').value.trim().replace(/[^\d+ ()-]/g,'').slice(0,20),tg:$('mT').value.trim().replace(/^@/,'').replace(/[^A-Za-z0-9_]/g,'').slice(0,32)};
    $('mSave').disabled=true;
    try{ await S.db.doc('mz_users/'+S.user.uid).set(doc); await S.db.doc('mz_contacts/'+S.user.uid).set(ct); S.me=doc; toast(t('p_saved')) }
    catch(e){ $('mE').textContent=errText(e) }
    $('mSave').disabled=false };
}
function loginBox(){ return `<button class="btn w" id="lgG" style="margin-top:8px">🟢 ${t('login_google')}</button>
  <details style="margin-top:12px"><summary class="note" style="cursor:pointer">✉️ ${t('login_email')}</summary><input id="lgE" type="email" placeholder="${esc(t('email'))}" style="margin-top:8px" autocomplete="email"><input id="lgP" type="password" placeholder="${esc(t('password'))}" style="margin-top:8px" autocomplete="current-password">
  <div class="row" style="margin-top:8px"><button class="btn" id="lgIn">${t('sign_in')}</button><button class="btn sec" id="lgUp">${t('sign_up')}</button></div></details><div class="err" id="lgErr"></div>` }
function bindLogin(after){
  const err=e=>{ const el=$('lgErr'); if(el) el.textContent=String(e&&e.code||'').replace('auth/','')||t('err_net') };
  const done=()=>{ if(after) after() };
  $('lgG').onclick=async()=>{ if(!window.firebase||!firebase.auth) return err(); const p=new firebase.auth.GoogleAuthProvider();
    try{ await firebase.auth().signInWithPopup(p); done() }catch(e){ if(/popup|operation-not-supported|cancelled/.test(e.code||'')) firebase.auth().signInWithRedirect(p); else err(e) } };
  $('lgIn').onclick=async()=>{ try{ await firebase.auth().signInWithEmailAndPassword($('lgE').value.trim(),$('lgP').value); done() }catch(e){ err(e) } };
  $('lgUp').onclick=async()=>{ try{ await firebase.auth().createUserWithEmailAndPassword($('lgE').value.trim(),$('lgP').value); done() }catch(e){ err(e) } };
}
function openLogin(){ if(!window.firebase||!firebase.auth){ toast(t('err_net')); return } const m=modal(`<h2>⚽ ${t('login')}</h2><div class="note">${t('tagline')}</div>${loginBox()}`); bindLogin(()=>{ m.remove(); if(!hasProfile()) location.hash='me' }) }
function renderAbout(){ setNav(''); $('view').innerHTML=`<div class="card"><h1>⚽ Meydan</h1>${t('about_html')}</div>` }

// ---------- роутер ----------
let lastHash='';
function route(fromData){
  const h=location.hash.replace(/^#/,'')||'home'; let m;
  // обновления данных не перерисовывают формы, в которых человек сейчас печатает
  if(fromData&&(h==='new'||h==='me')&&lastHash===h&&document.querySelector('#view input, #view textarea')) return;
  lastHash=h; applyI18n();
  if(h==='home') return renderHome();
  if(h==='new') return renderNew();
  if(h==='pitches') return renderPitches();
  if(h==='players') return renderPlayers();
  if(h==='me') return renderMe();
  if(h==='about') return renderAbout();
  if(m=h.match(/^g-([A-Za-z0-9_-]{10,40})$/)) return renderGame(m[1]);
  if(m=h.match(/^p-([A-Za-z0-9_-]{10,40})$/)) return renderPlayer(m[1]);
  location.hash='home';
}
window.addEventListener('hashchange',()=>{ route(false); window.scrollTo(0,0) });
$('lang').onclick=e=>{ const b=e.target.closest('[data-l]'); if(!b) return; LANG=b.dataset.l; store.set('mz_lang',LANG); if(window.firebase&&firebase.auth) firebase.auth().languageCode=LANG; route(false) };
function applyTheme(){ const th=store.get('mz_theme','auto'); const dark=th==='dark'||(th==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme=dark?'dark':'light' }
$('themeBtn').onclick=()=>{ const cur=document.documentElement.dataset.theme; store.set('mz_theme',cur==='dark'?'light':'dark'); applyTheme() };
applyTheme();
// установка на телефон
let instEv=null;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); instEv=e; drawInstall() });
function drawInstall(){ const el=$('installLink'); if(!el) return; const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(standalone){ el.textContent=''; return }
  el.innerHTML=`<a href="#" id="instA">📲 ${t('install')}</a>`;
  $('instA').onclick=async e=>{ e.preventDefault(); if(instEv){ instEv.prompt(); instEv=null } else toast(/iphone|ipad/i.test(navigator.userAgent)?t('install_ios'):t('install_ios').replace('Safari','Chrome').replace('Paylaş','⋮').replace('Поделиться','⋮').replace('Share','⋮')) } }
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
route(false); fbInit();
