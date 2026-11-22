// ---------- Firebase: общая инициализация, вход (Google / e-poçt / telefon) и синхронизация прогресса ----------
// Firebase web config (Firebase console → Project settings → Your apps → Web app → Config).
// null → вход и доска объявлений показывают «tezliklə»; ?demo в URL включает доску с локальными тестовыми данными.
const FB_CONFIG={apiKey:"AIzaSyC_N1DLI9V8fkmZY6kBS0cNX5uxGQAn2e0",authDomain:"sessiya-23601.firebaseapp.com",projectId:"sessiya-23601",
  storageBucket:"sessiya-23601.firebasestorage.app",messagingSenderId:"175959046502",appId:"1:175959046502:web:10f3dea120ccad80da30a7"};
// Вход по SMS работает только на тарифе Blaze (с картой). Включить: true.
const FB_PHONE=false;
const FB_SDK='https://www.gstatic.com/firebasejs/10.12.2/';
// Google One Tap («Продолжить как …»): OAuth web client из Firebase → Authentication → Google → Web SDK configuration
const GOOGLE_CLIENT_ID='175959046502-91srge6iojgtttlcr715t808g6a9pghf.apps.googleusercontent.com';
const FB={ready:null,user:null,ls:[]};
const isReal=u=>!!(u&&!u.isAnonymous);
// Модераторы: могут скрывать любые банки и удалять любые объявления (только подтверждённый Google-email)
const ADMIN_EMAILS=['reskiygor@gmail.com','elmineyvazov6@gmail.com'];
const isAdmin=()=>{ const u=FB.user; return !!(isReal(u)&&u.emailVerified&&ADMIN_EMAILS.includes(String(u.email||'').toLowerCase())) };

function fbStart(){
  if(FB.ready) return FB.ready;
  if(!FB_CONFIG){ FB.loaded=true; return FB.ready=Promise.resolve(null) }
  return FB.ready=(async()=>{
    for(const f of ['firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js']) await loadScript(FB_SDK+f);
    if(!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    const auth=firebase.auth(); auth.languageCode=LANG;
    try{ await auth.getRedirectResult() }catch(e){}
    await new Promise(r=>{const un=auth.onAuthStateChanged(()=>{un();r()})});
    if(!auth.currentUser){ try{ await auth.signInAnonymously() }catch(e){} }
    FB.user=auth.currentUser;
    auth.onAuthStateChanged(u=>{ const was=FB.user&&FB.user.uid; FB.user=u;
      if(u&&!u.isAnonymous&&u.uid!==was) syncPull(); FB.ls.forEach(f=>{try{f(u)}catch(e){}}) });
    if(isReal(FB.user)) syncPull();
    FB.loaded=true; return firebase;
  })().catch(e=>{ console.warn('firebase',e); FB.loaded=true; return null });
}

// ---------- синхронизация (users/{uid}) ----------
const SYNC_KEYS=['sp_stats','sp_act','sp_exams','sp_gpa','sp_calc','sp_banks','sp_xp','sp_fav','sp_goal','sp_daily','sp_dcount','sp_duels','sp_duelwins','sp_badges','sp_srs','sp_plan'];
let syncTimer=null;
const _storeSet=store.set.bind(store);
store.set=function(k,v){ _storeSet(k,v); if(SYNC_KEYS.includes(k)&&isReal(FB.user)){ clearTimeout(syncTimer); syncTimer=setTimeout(syncPush,2500) } };
function syncData(){ const d={}; for(const k of SYNC_KEYS){ const v=localStorage.getItem(k); if(v!=null&&!(k==='sp_banks'&&v.length>700000)) d[k]=v } return d }
async function syncPush(){
  const u=FB.user; if(!isReal(u)) return;
  try{ const at=Date.now(); await firebase.firestore().doc('users/'+u.uid).set({sync:syncData(),at,name:u.displayName||'',email:u.email||'',phone:u.phoneNumber||''});
    localStorage.setItem('sp_sync_at',String(at)) }catch(e){ console.warn('sync push',e) }
}
async function syncPull(){
  const u=FB.user; if(!isReal(u)) return;
  try{ const s=await firebase.firestore().doc('users/'+u.uid).get(); const loc=+(localStorage.getItem('sp_sync_at')||0);
    if(s.exists&&s.data().at>loc&&s.data().sync){ const d=s.data().sync;
      for(const k of SYNC_KEYS){ if(d[k]!=null) localStorage.setItem(k,d[k]) }
      localStorage.setItem('sp_sync_at',String(s.data().at)); location.reload(); return }
    await syncPush();
  }catch(e){ console.warn('sync pull',e) }
}

// ---------- профиль / вход ----------
const AC={mode:null,msg:'',busy:false,conf:null};
const GLOGO='<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
function acErr(e){ const c=(e&&e.code)||''; console.warn(c,e);
  if(/popup-closed|cancelled-popup/.test(c)) return '';
  if(/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return t('acc_err_cred');
  if(/email-already-in-use/.test(c)) return t('acc_err_exists');
  if(/weak-password/.test(c)) return t('acc_err_weak');
  if(/invalid-email|missing-email/.test(c)) return t('acc_err_email');
  if(/invalid-phone|missing-phone/.test(c)) return t('acc_err_phone');
  if(/invalid-verification-code|code-expired/.test(c)) return t('acc_err_code');
  if(/requires-recent-login/.test(c)) return t('acc_err_recent');
  if(/too-many-requests|quota/.test(c)) return t('acc_err_many');
  if(/network/.test(c)) return t('acc_err_net');
  return t('acc_err_gen') }
async function acRun(fn){ if(AC.busy) return; AC.busy=true;
  const mail=$('acMail'), tel=$('acTel'), nm=$('acName'); if(mail) AC.email=mail.value; if(tel) AC.tel=tel.value; if(nm) AC.name=nm.value;
  const m=$('acMsg'); if(m){ m.style.color='var(--mute)'; m.textContent=t('acc_wait') } document.querySelectorAll('#acBox button').forEach(b=>b.disabled=true);
  try{ await fn(); AC.msg='' }catch(e){ AC.msg=acErr(e) } AC.busy=false; drawAccount() }

async function deleteAccount(){
  const u=firebase.auth().currentUser; if(!u) return;
  const last=Date.parse(u.metadata&&u.metadata.lastSignInTime||0)||0;
  if(Date.now()-last>4.5*60e3) throw {code:'auth/requires-recent-login'};
  const db=firebase.firestore();
  for(const m of (Cat.userMetas||[]).filter(m=>m.uid===u.uid)){ try{ await db.doc('banks/'+m.id).update({hidden:true}) }catch(e){} }
  try{ await db.doc('users/'+u.uid).delete() }catch(e){}
  await u.delete();
  for(const k of [...SYNC_KEYS,'sp_sync_at','sp_authed']) try{ localStorage.removeItem(k) }catch(e){}
  location.reload();
}
function renderProfile(){ drawGoalSeg(); applyTheme(); checkBadges(); renderBadges(); show('profile'); document.title=t('nav_profile')+' | Sessiya+'; renderProgress(); drawActChart(); drawAccount();
  fbStart().then(()=>drawAccount()) }
FB.ls.push(()=>{ if(!$('v-profile').classList.contains('hide')) drawAccount() });

function drawAccount(){
  const gate=Gate.open, box=gate?$('gateBox'):$('acBox'), other=gate?$('acBox'):$('gateBox'); if(!box) return; if(other) other.innerHTML=''; const u=FB.user;
  if(!FB_CONFIG){ box.innerHTML=`<h2 style="margin:0 0 6px">👤 ${t('acc_title')}</h2><p class="note" style="margin:0">${t('acc_soon')}</p>`; return }
  if(!FB.loaded){ box.innerHTML=`<div class="empty">${t('loading')}</div>`; return }
  if(!window.firebase||!firebase.apps.length){ box.innerHTML=`<h2 style="margin:0 0 6px">👤 ${t('acc_title')}</h2><p class="note" style="margin:0">${t('acc_err_net')}</p>`; return }
  if(isReal(u)){
    const name=u.displayName||u.email||u.phoneNumber||'';
    const av=u.photoURL?`<img class="avatar" src="${esc(u.photoURL)}" referrerpolicy="no-referrer" alt="">`:`<div class="avatar">${/^[\p{L}]/u.test(name.trim())?esc(name.trim()[0].toUpperCase()):'👤'}</div>`;
    box.innerHTML=`<div class="row" style="gap:14px;align-items:center;flex-wrap:nowrap">${av}<div style="min-width:0"><div style="font-weight:700;font-size:18px">${t('acc_hello',esc(u.displayName||name.split('@')[0]))}</div><div class="note" style="overflow:hidden;text-overflow:ellipsis">${esc(u.email||u.phoneNumber||'')}</div></div></div>
      <p class="note" style="margin:12px 0 0">☁️ ${t('acc_synced')}</p>
      <div class="row" style="margin-top:12px;gap:8px"><button class="btn sec small" id="acName2">✏️ ${t('acc_edit_name')}</button><button class="btn sec small" id="acOut">${t('acc_logout')}</button></div>
      ${AC.editName?`<div class="row" style="margin-top:10px;gap:8px;flex-wrap:nowrap"><input type="text" id="acNameIn" maxlength="40" value="${esc(u.displayName||'')}" placeholder="${t('acc_name_ph2')}"><button class="btn small" id="acNameSave">${t('acc_save')}</button></div>`:''}
      <div class="note" id="acMsg" style="margin-top:8px;color:var(--bad)">${esc(AC.msg)}</div>
      <details style="margin-top:18px"><summary class="note" style="cursor:pointer">${t('acc_danger')}</summary>
        <p class="note">${t('acc_delete_note')}</p><button class="btn small" style="background:var(--bad)" id="acDel">${t('acc_delete')}</button></details>`;
    $('acName2').onclick=()=>{ AC.editName=!AC.editName; AC.msg=''; drawAccount() };
    if(AC.editName){ $('acNameSave').onclick=()=>acRun(async()=>{ const v=$('acNameIn').value.trim().slice(0,40); await firebase.auth().currentUser.updateProfile({displayName:v}); AC.editName=false; FB.user=firebase.auth().currentUser; syncPush() }); }
    $('acDel').onclick=()=>{ const b=$('acDel'); if(b.dataset.c!=='1'){ b.textContent=t('acc_delete_confirm'); b.dataset.c='1'; return } acRun(deleteAccount) };

    $('acOut').onclick=()=>acRun(async()=>{ try{ window.google&&google.accounts&&google.accounts.id.disableAutoSelect() }catch(e){} Gate.tapStarted=false; await firebase.auth().signOut(); try{ await firebase.auth().signInAnonymously() }catch(e){} });
    return }
  const m=AC.mode;
  box.innerHTML=`${gate?'':`<h2 style="margin:0 0 6px">👤 ${t('acc_title')}</h2><p class="note" style="margin:0 0 4px">${t('acc_why')}</p>`}
    <button class="btn acbtn g" id="acG">${GLOGO}<span>${t('acc_google')}</span></button>
    <button class="btn sec acbtn" id="acE">✉️ <span>${t('acc_email')}</span></button>
    ${m==='email'?`<div style="margin-top:10px"><input type="text" id="acMail" inputmode="email" autocomplete="email" placeholder="${t('acc_mail_ph')}" value="${esc(AC.email||'')}"><input type="password" id="acPass" autocomplete="current-password" placeholder="${t('acc_pass')}" style="margin-top:8px"><input type="text" id="acName" autocomplete="name" placeholder="${t('acc_name_ph')}" style="margin-top:8px" value="${esc(AC.name||'')}">
      <div class="row" style="margin-top:10px;gap:8px"><button class="btn" id="acIn">${t('acc_login')}</button><button class="btn sec" id="acUp">${t('acc_signup')}</button><button class="btn ghost small" id="acFg">${t('acc_forgot')}</button></div></div>`:''}
    ${FB_PHONE?`<button class="btn sec acbtn" id="acP">📱 <span>${t('acc_phone')}</span></button>`:''}
    ${FB_PHONE&&m==='phone'?`<div style="margin-top:10px">${AC.conf?`<input type="text" id="acCode" inputmode="numeric" autocomplete="one-time-code" placeholder="${t('acc_code_ph')}"><div class="row" style="margin-top:10px"><button class="btn" id="acCf">${t('acc_confirm')}</button></div>`
      :`<div class="row" style="gap:8px;flex-wrap:nowrap"><span class="pill" style="font-size:15px;padding:11px 10px">+994</span><input type="text" id="acTel" inputmode="tel" autocomplete="tel-national" placeholder="${t('acc_phone_ph')}" value="${esc(AC.tel||'')}"></div><div class="row" style="margin-top:10px"><button class="btn" id="acSend">${t('acc_send_code')}</button></div>`}</div>`:''}
    <div class="note" id="acMsg" style="margin-top:10px;color:${/✓/.test(AC.msg)?'var(--ok)':'var(--bad)'}">${esc(AC.msg)}</div>`;
  $('acG').onclick=()=>acRun(async()=>{ const p=new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({prompt:'select_account'});
    try{ await firebase.auth().signInWithPopup(p) }catch(e){ if(/popup-blocked|operation-not-supported/.test(e.code||'')) await firebase.auth().signInWithRedirect(p); else throw e } });
  $('acE').onclick=()=>{ AC.mode=m==='email'?null:'email'; AC.msg=''; drawAccount() };
  if(m==='email'){
    const vals=()=>[$('acMail').value.trim(),$('acPass').value];
    $('acIn').onclick=()=>acRun(()=>firebase.auth().signInWithEmailAndPassword(...vals()));
    $('acUp').onclick=()=>acRun(async()=>{ const nm=$('acName').value.trim(); const c=await firebase.auth().createUserWithEmailAndPassword(...vals());
      if(nm){ try{ await c.user.updateProfile({displayName:nm.slice(0,40)}); FB.ls.forEach(f=>{try{f(firebase.auth().currentUser)}catch(e){}}) }catch(e){} } });
    $('acFg').onclick=()=>acRun(async()=>{ const [em]=vals(); if(!em) throw {code:'auth/missing-email'}; await firebase.auth().sendPasswordResetEmail(em); setTimeout(()=>{AC.msg='✓ '+t('acc_reset_sent');drawAccount()},0) });
    $('acPass').onkeydown=e=>{ if(e.key==='Enter') $('acIn').click() };
  }
  if(FB_PHONE){
    $('acP').onclick=()=>{ AC.mode=m==='phone'?null:'phone'; AC.msg=''; AC.conf=null; drawAccount() };
    if(m==='phone'&&!AC.conf) $('acSend').onclick=()=>acRun(async()=>{
      let d=$('acTel').value.replace(/\D/g,''); if(d.startsWith('994')) d=d.slice(3); if(d.startsWith('0')) d=d.slice(1);
      if(d.length!==9) throw {code:'auth/invalid-phone-number'};
      if(!window.acCaptcha) window.acCaptcha=new firebase.auth.RecaptchaVerifier('acRecaptcha',{size:'invisible'});
      AC.conf=await firebase.auth().signInWithPhoneNumber('+994'+d,window.acCaptcha) });
    if(m==='phone'&&AC.conf) $('acCf').onclick=()=>acRun(async()=>{ await AC.conf.confirm($('acCode').value.trim()); AC.conf=null; AC.mode=null });
  }
}

// ---------- обязательный вход: экран регистрации поверх сайта ----------
const Gate={open:false,started:false,
  init(){
    if(!FB_CONFIG) return;
    const authed=localStorage.getItem('sp_authed')==='1';
    this.set(!authed);
    $('gateLang').querySelectorAll('button').forEach(b=>b.onclick=()=>document.querySelector('#lang button[data-l="'+b.dataset.l+'"]').click());
    $('gateRules').onclick=()=>{ const r=$('gateAbout'); if(r.classList.toggle('hide')) return; r.innerHTML=t('about_html') };
    FB.ls.push(()=>this.update());
    fbStart().then(fb=>{ if(!fb){ if(this.open) this.offline(); return } this.update() });
  },
  set(open){
    const was=this.open; this.open=open;
    document.getElementById('gate').classList.toggle('hide',!open);
    document.documentElement.classList.toggle('gated',open);
    if(open) this.draw(); else { $('gateBox').innerHTML=''; if(was){ route(); if(!$('v-profile').classList.contains('hide')) drawAccount() } }
  },
  async oneTap(){
    if(this.tapStarted||!GOOGLE_CLIENT_ID||!window.firebase) return; this.tapStarted=true;
    try{ if(!(window.google&&google.accounts&&google.accounts.id)) await loadScript('https://accounts.google.com/gsi/client');
      google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,auto_select:true,cancel_on_tap_outside:false,context:'signin',itp_support:true,use_fedcm_for_prompt:true,
        callback:async r=>{ try{ await firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(r.credential)) }catch(e){ AC.msg=acErr(e); drawAccount() } }});
      google.accounts.id.prompt();
    }catch(e){ console.warn('one tap',e) }
  },
  update(){ if(!FB.loaded) return; const real=isReal(FB.user); if(!real&&window.firebase) this.oneTap();
    try{ real?localStorage.setItem('sp_authed','1'):localStorage.removeItem('sp_authed') }catch(e){}
    this.set(!real) },
  draw(){ document.querySelectorAll('#gateLang button').forEach(b=>b.classList.toggle('on',b.dataset.l===LANG)); drawAccount() },
  offline(){ $('gateBox').innerHTML=`<div class="note" style="color:var(--bad);margin-bottom:10px">${t('gate_offline')}</div><button class="btn acbtn" onclick="location.reload()">${t('gate_retry')}</button>` }
};
