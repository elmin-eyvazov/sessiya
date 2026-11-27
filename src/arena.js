// ---------- Арена: дуэль 1 на 1 (Firestore duels/{CODE}) ----------
const DUEL_Q=10;
let DU={code:null,doc:null,unsub:null,i:0,picked:null,answered:0,ok:0,lock:false};
const duelCode=()=>{ const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<6;i++) s+=A[Math.floor(Math.random()*A.length)]; return s };
const me=()=>FB.user&&FB.user.uid;

async function renderArena(){
  show('arena'); document.title=t('arena_title')+' | Sessiya+';
  const mc=Cat.metas.filter(m=>m.type!=='written');
  $('arBank').innerHTML=mc.map(m=>`<option value="${esc(m.id)}">${esc(m.subj||m.name)} — ${esc(m.name)}</option>`).join('');
  $('arMsg').textContent=''; $('arMine').innerHTML=`<div class="note">${t('loading')}</div>`;
  await catDb(); if(!Cat.db||!isReal(FB.user)){ $('arMine').innerHTML=''; return }
  try{
    const s=await Cat.db.collection('duels').where('uids','array-contains',me()).limit(30).get();
    const L=s.docs.map(d=>d.data()).sort((a,b)=>b.createdAt-a.createdAt).slice(0,10);
    $('arMine').innerHTML=L.length?L.map(d=>{ const opp=d.host===me()?d.guestName:d.hostName; const my=(d.s||{})[me()]||0, op=(d.s||{})[d.host===me()?d.guest:d.host]||0;
      const st=d.status==='waiting'?t('du_wait_short'):(d.d&&Object.keys(d.d).length>=2?(my>op?'🏆 '+t('du_won'):my<op?t('du_lost'):t('du_draw')):t('du_playing'));
      return `<a class="lbrow" data-h="duel-${esc(d.code)}" style="text-decoration:none;color:inherit;cursor:pointer"><span class="lbname">⚔️ ${esc(opp||'…')} · <span class="note">${esc(d.bank)}</span></span><b>${my}:${op}</b><span class="note">${st}</span></a>` }).join('')
      :`<div class="note">${t('du_none')}</div>`;
  }catch(e){ $('arMine').innerHTML='' }
}

async function createDuel(meta){
  await catDb(); if(!Cat.db||!isReal(FB.user)) throw {code:'no_db'};
  let qs=(bankCache[meta.id]||(bankCache[meta.id]=await Cat.loadQs(meta))).filter(q=>q&&q.o&&q.o.length>=2);
  if(qs.length<4) throw {code:'few'};
  qs=shuffle(qs).slice(0,DUEL_Q).map(q=>({q:String(q.q).slice(0,600),o:q.o.map(o=>String(o).slice(0,300)),a:q.a}));
  let code=duelCode(); for(let k=0;k<3;k++){ const ex=await Cat.db.doc('duels/'+code).get(); if(!ex.exists) break; code=duelCode() }
  await Cat.db.doc('duels/'+code).set({code,bank:String(meta.subj||meta.name).slice(0,120),qs,host:me(),hostName:lbName(FB.user),guest:null,guestName:'',
    status:'waiting',p:{},s:{},d:{},uids:[me()],createdAt:Date.now()});
  return code;
}

async function renderDuel(code){
  show('duel'); document.title='⚔️ '+code+' | Sessiya+';
  if(DU.unsub){ DU.unsub(); DU.unsub=null }
  DU={code,doc:null,unsub:null,i:0,picked:null,answered:0,ok:0,lock:false};
  $('duBox').innerHTML=`<div class="empty">${t('loading')}</div>`;
  await catDb(); if(!Cat.db||!isReal(FB.user)){ $('duBox').innerHTML=`<div class="empty">${t('acc_err_net')}</div>`; return }
  const ref=Cat.db.doc('duels/'+code);
  try{
    const s=await ref.get(); if(!s.exists){ $('duBox').innerHTML=`<div class="empty">${t('du_notfound')}</div>`; return }
    const d=s.data();
    if(d.host!==me()&&!d.guest){ await ref.update({guest:me(),guestName:lbName(FB.user),status:'playing',uids:[d.host,me()]}) }
  }catch(e){ $('duBox').innerHTML=`<div class="empty">${/permission/.test(e&&e.code||'')?t('du_soon'):t('load_fail')}</div>`; return }
  DU.unsub=ref.onSnapshot(s=>{ if(DU.code!==code) return; DU.doc=s.data(); const d=DU.doc;
    if(d&&(d.p||{})[me()]!=null&&!DU.started){ DU.i=d.p[me()]; DU.answered=d.p[me()]; DU.ok=(d.s||{})[me()]||0 }
    DU.started=true; drawDuel() },()=>{ $('duBox').innerHTML=`<div class="empty">${t('load_fail')}</div>` });
}

function duelLink(code){ return location.origin+location.pathname+'#duel-'+code }
function drawDuel(){
  const d=DU.doc, box=$('duBox'); if(!d||!box) return;
  if(d.rematch&&d.rematch!==DU.code){ if(DU.unsub){DU.unsub();DU.unsub=null} go('duel-'+d.rematch); return }
  const isHost=d.host===me(), isGuest=d.guest===me();
  if(!isHost&&!isGuest){ box.innerHTML=`<div class="empty">${t('du_full')}</div>`; return }
  const oppId=isHost?d.guest:d.host, oppName=isHost?d.guestName:d.hostName;
  const myDone=!!(d.d||{})[me()], oppDone=!!(d.d||{})[oppId];
  const myS=(d.s||{})[me()]||0, opS=(d.s||{})[oppId]||0, opP=(d.p||{})[oppId]||0;
  const head=`<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:10px"><b>⚔️ ${esc(d.bank)}</b><span class="pill">${t('du_code')}: ${d.code}</span></div>`;
  if(d.status==='waiting'){
    const link=duelLink(d.code), msg=encodeURIComponent(t('du_invite_msg',d.bank)+' '+link);
    box.innerHTML=head+`<div style="text-align:center;padding:10px 0"><div class="note">${t('du_share')}</div><div style="font-size:40px;font-weight:800;letter-spacing:.12em;margin:8px 0">${d.code}</div>
      <div class="row" style="justify-content:center;gap:8px"><a class="btn" style="background:#1fa855" href="https://wa.me/?text=${msg}" target="_blank" rel="noopener">WhatsApp</a><a class="btn" style="background:#229ed9" href="https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(t('du_invite_msg',d.bank))}" target="_blank" rel="noopener">Telegram</a><button class="btn sec" id="duCopy">${t('du_copy')}</button></div>
      <p class="note" style="margin-top:14px">⏳ ${t('du_waiting')}</p></div>`;
    $('duCopy').onclick=async()=>{ try{ if(navigator.share) await navigator.share({title:'Sessiya+',text:t('du_invite_msg',d.bank),url:link}); else { await navigator.clipboard.writeText(link); $('duCopy').textContent='✓' } }catch(e){} };
    return }
  const score=`<div class="duscore"><div><span class="note">${t('du_you')}</span><b>${myS}</b><span class="note">${Math.min(DU.answered,d.qs.length)}/${d.qs.length}</span></div><div class="vs">VS</div><div><span class="note">${esc(oppName||t('du_opp'))}</span><b>${opS}</b><span class="note">${opP}/${d.qs.length}${oppDone?' ✓':''}</span></div></div>`;
  if(myDone&&oppDone){
    const res=myS>opS?'win':myS<opS?'lose':'draw';
    const done=store.get('sp_duels',{}), dk=d.code+'_'+me(); if(!done[dk]){ done[dk]=res; store.set('sp_duels',done); award(res==='win'?30:10); if(res==='win') store.set('sp_duelwins',(store.get('sp_duelwins',0)||0)+1); checkBadges() }
    box.innerHTML=head+score+`<div style="text-align:center;margin:14px 0"><div style="font-size:44px">${res==='win'?'🏆':res==='lose'?'😅':'🤝'}</div><h2 style="margin:6px 0">${t('du_'+res)}</h2><p class="note">${res==='win'?t('du_xp_win'):t('du_xp_play')}</p></div>
      <div class="row" style="justify-content:center;gap:8px"><button class="btn" id="duAgain">${t('du_rematch')}</button><a class="btn sec" data-h="arena">${t('arena_title')}</a></div>`;
    $('duAgain').onclick=async()=>{ const m=Cat.metas.find(x=>(x.subj||x.name)===d.bank); if(!m) return go('arena'); $('duAgain').disabled=true;
      try{ const code=await createDuel(m);
        try{ await Cat.db.doc('duels/'+d.code).update({rematch:code}) }
        catch(e){ try{ const old=(await Cat.db.doc('duels/'+d.code).get()).data(); if(old&&old.rematch){ return go('duel-'+old.rematch) } }catch(_){} }
        go('duel-'+code);
      }catch(e){ $('duAgain').disabled=false } };
    return }
  if(myDone||DU.i>=d.qs.length){ box.innerHTML=head+score+`<p class="note" style="text-align:center;margin-top:14px">⏳ ${t('du_wait_opp')}</p>`; return }
  const x=d.qs[DU.i];
  if(!DU.order||DU.orderFor!==DU.i){ DU.order=shuffle(x.o.map((_,j)=>j)); DU.orderFor=DU.i; DU.picked=null }
  box.innerHTML=head+score+`<div class="bar" style="margin-top:12px"><i style="width:${DU.i/d.qs.length*100}%"></i></div><div class="q">${esc(x.q)}</div>
    <div id="duOpts">${DU.order.map((j,k)=>`<button class="opt${DU.picked!=null?(j===x.a?' ok':j===DU.picked?' bad':''):''}" data-j="${j}" ${DU.picked!=null?'disabled':''}><span class="k">${k+1}</span><span>${esc(x.o[j])}</span></button>`).join('')}</div>`;
  $('duOpts').querySelectorAll('.opt').forEach(b=>b.onclick=()=>duelPick(+b.dataset.j));
}
async function duelPick(j){
  const d=DU.doc; if(DU.lock||DU.picked!=null||!d) return; DU.lock=true; DU.picked=j;
  const x=d.qs[DU.i]; const right=j===x.a; if(right){ DU.ok++; award(10) } bump(1); DU.answered=DU.i+1; drawDuel();
  const upd={['p.'+me()]:DU.answered,['s.'+me()]:DU.ok}; if(DU.answered>=d.qs.length) upd['d.'+me()]=Date.now();
  try{ await Cat.db.doc('duels/'+DU.code).update(upd) }catch(e){ console.warn('duel',e) }
  setTimeout(()=>{ DU.i++; DU.picked=null; DU.lock=false; drawDuel() },700);
}
async function duelFromBank(meta,btn){
  if(btn){ btn.disabled=true; btn.textContent=t('loading') }
  try{ const code=await createDuel(meta); go('duel-'+code) }
  catch(e){ console.warn('duel',e); if(btn){ btn.disabled=false; btn.textContent=e&&e.code==='few'?t('du_few'):/permission/.test(e&&e.code||'')?t('du_soon'):t('load_fail') } }
}
function initArena(){
  $('arCreate').onclick=()=>{ const m=Cat.metas.find(x=>x.id===$('arBank').value); if(m) duelFromBank(m,$('arCreate')) };
  $('arJoin').onclick=()=>{ const c=$('arCode').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,''); if(c.length!==6){ $('arMsg').textContent=t('du_badcode'); return } go('duel-'+c) };
  $('arCode').onkeydown=e=>{ if(e.key==='Enter') $('arJoin').click() };
}
