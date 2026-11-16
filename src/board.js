// ---------- board: elanlar lövhəsi (otaq yoldaşı, kirayə, satış, xidmətlər) ----------
const AD_CATS=[['room','🏠'],['sell','📚'],['service','🧑‍🏫'],['job','💼'],['lost','🔎'],['other','📌']];
const AD_KINDS={room:['need_mate','offer_room','need_room'],sell:['sell','buy'],service:['offer','need'],job:['offer','need']};
const AD_DAYS=45, AD_PER_DAY=5;
const PLACES=['Yataqxana','28 May','Gənclik','Nəriman Nərimanov','Koroğlu','Qara Qarayev','Neftçilər','Xalqlar Dostluğu','Əhmədli','Həzi Aslanov','Sahil','İçərişəhər','Nizami','Elmlər Akademiyası','İnşaatçılar','20 Yanvar','Memar Əcəmi','Nəsimi (metro)','Azadlıq prospekti','Dərnəgül','Avtovağzal','8 Noyabr','Xocəsən','Cəfər Cabbarlı','Şah İsmayıl Xətai','Ulduz','Bakmil',
  'Yasamal r.','Nəsimi r.','Nərimanov r.','Səbail r.','Binəqədi r.','Xətai r.','Nizami r.','Sabunçu r.','Suraxanı r.','Xəzər r.','Qaradağ r.','Sumqayıt','Gəncə'];
const catIcon=c=>(AD_CATS.find(x=>x[0]===c)||[0,'📌'])[1];

function fbApi(db,B){ const FV=firebase.firestore.FieldValue; return {
  subscribe(cb,ecb){ const since=firebase.firestore.Timestamp.fromMillis(Date.now()-AD_DAYS*864e5);
    return db.collection('ads').where('createdAt','>',since).orderBy('createdAt','desc').limit(500).onSnapshot(
      s=>cb(s.docs.map(d=>{const x=d.data(); return {...x,id:d.id,createdAt:x.createdAt&&x.createdAt.toMillis?x.createdAt.toMillis():Date.now()}})),ecb) },
  create(ad){ return db.collection('ads').add({...ad,uid:B.uid,createdAt:FV.serverTimestamp()}) },
  remove(id){ return db.collection('ads').doc(id).delete() },
  report(id){ return db.collection('reports').add({ad:id,uid:B.uid,at:FV.serverTimestamp()}) }
}}
function demoApi(B){ B.uid='demo'; const ls=[]; const get=()=>store.get('sp_demo_ads',[]); const put=v=>{store.set('sp_demo_ads',v); ls.forEach(f=>f(get()))};
  return { subscribe(cb){ ls.push(cb); setTimeout(()=>cb(get()),150) },
    async create(ad){ put([{...ad,uid:B.uid,id:'d'+Date.now().toString(36),createdAt:Date.now()},...get()]) },
    async remove(id){ put(get().filter(a=>a.id!==id)) }, async report(){} } }

const Board={api:null,ads:[],ready:false,err:null,uid:null,started:false,
  async init(){
    if(FB_CONFIG){
      const fb=await fbStart();
      if(fb){ this.uid=FB.user&&FB.user.uid; this.api=fbApi(fb.firestore(),this) } else this.err='init';
    } else if(/[?&]demo\b/.test(location.search)) this.api=demoApi(this);
    return this.api },
  async start(){ if(this.started) return; this.started=true;
    const api=await this.init(); if(!api){ this.ready=true; return boardRefresh() }
    api.subscribe(list=>{ this.ads=list.filter(a=>a.createdAt>Date.now()-AD_DAYS*864e5); this.ready=true; this.err=null; boardRefresh() },
      e=>{ this.err=(e&&e.code)||'err'; this.ready=true; boardRefresh() }) }
};
function boardRefresh(){ if(!$('v-board').classList.contains('hide')) renderAds(); if(!$('v-profile').classList.contains('hide')&&$('acAds')&&FB.user) $('acAds').innerHTML=myAdsHtml(FB.user); if(!$('v-home').classList.contains('hide')) renderHomeBoard() }

// ---------- board view ----------
const BS={cat:'all',kind:'all',sex:'any',max:'',q:''};
function renderBoard(cat){
  cat=AD_CATS.some(x=>x[0]===cat)?cat:'all';
  if(cat!==BS.cat){ BS.cat=cat; BS.kind='all' }
  show('board'); document.title=(cat==='all'?t('board_title'):t('cat_'+cat))+' | Sessiya+';
  const cnt={}; Board.ads.forEach(a=>cnt[a.cat]=(cnt[a.cat]||0)+1);
  $('bdCats').innerHTML=[['all','🗂']].concat(AD_CATS).map(([c,ic])=>`<a class="chip ${c===BS.cat?'on':''}" data-h="${c==='all'?'board':'board-'+c}">${ic} ${t('cat_'+c)}${Board.ready&&(c==='all'?Board.ads.length:cnt[c])?` <span class="cn">${c==='all'?Board.ads.length:cnt[c]}</span>`:''}</a>`).join('');
  const kinds=AD_KINDS[BS.cat];
  $('bdKind').classList.toggle('hide',!kinds);
  if(kinds) $('bdKind').innerHTML=['all',...kinds].map(k=>`<button data-v="${k}" class="${k===BS.kind?'on':''}">${k==='all'?t('kinds_all'):t('kind_'+k)}</button>`).join('');
  $('bdKind').querySelectorAll('button').forEach(b=>b.onclick=()=>{BS.kind=b.dataset.v;renderBoard(BS.cat)});
  $('bdRoomF').classList.toggle('hide',BS.cat!=='room');
  $('bdSex').innerHTML=['any','f','m'].map(s=>`<button data-v="${s}" class="${s===BS.sex?'on':''}">${t('sex_'+s)}</button>`).join('');
  $('bdSex').querySelectorAll('button').forEach(b=>b.onclick=()=>{BS.sex=b.dataset.v;renderBoard(BS.cat)});
  $('bdPost').onclick=()=>go(BS.cat==='all'?'post':'post-'+BS.cat);
  renderAds(); Board.start();
}
function filteredAds(){
  const q=lowq(BS.q.trim()), max=parseFloat(BS.max);
  return Board.ads.filter(a=>(BS.cat==='all'||a.cat===BS.cat)&&(BS.kind==='all'||a.kind===BS.kind)
    &&(BS.cat!=='room'||BS.sex==='any'||!a.gender||a.gender==='any'||a.gender===BS.sex)
    &&(BS.cat!=='room'||!max||a.price==null||a.price<=max)
    &&(!q||lowq([a.title,a.text,a.place,a.uni].join(' ')).includes(q)));
}
function renderAds(){
  const box=$('bdList');
  if(!FB_CONFIG&&!Board.api&&Board.ready){ box.innerHTML=`<div class="empty">🚧 ${t('board_soon')}</div>`; return }
  if(!Board.ready){ box.innerHTML=`<div class="empty">${t('loading')}</div>`; return }
  if(Board.err&&!Board.ads.length){ box.innerHTML=`<div class="empty">${t('board_err')}</div>`; return }
  const L=filteredAds();
  box.innerHTML=L.length?L.map(adCard).join(''):`<div class="empty">${t('board_empty')}<div style="margin-top:10px"><button class="btn small" onclick="$('bdPost').click()">${t('post_btn')}</button></div></div>`;
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
    if(b.dataset.c!=='1'){ b.textContent=t('confirm_delete'); b.dataset.c='1'; setTimeout(()=>{b.textContent=t('delete');b.dataset.c=''},3000); return }
    b.disabled=true; try{ await Board.api.remove(b.dataset.del) }catch(e){ b.disabled=false } });
  box.querySelectorAll('[data-rep]').forEach(b=>b.onclick=async()=>{ b.disabled=true; b.textContent=t('ad_reported'); try{ await Board.api.report(b.dataset.rep) }catch(e){} });
}
function ago(ms){ const m=Math.max(0,Math.floor((Date.now()-ms)/60000)); if(m<2) return t('ago_now'); if(m<60) return t('ago_min',m); const h=Math.floor(m/60); if(h<24) return t('ago_h',h); return t('ago_d',Math.floor(h/24)) }
function contactBtns(c){
  c=String(c||'').trim(); let d=c.replace(/\D/g,'');
  if(/^[+\d\s().-]+$/.test(c)&&d.length>=9){ if(d.length===10&&d[0]==='0') d='994'+d.slice(1); else if(d.length===9) d='994'+d;
    return `<a class="btn small" style="background:#1fa855" href="https://wa.me/${d}" target="_blank" rel="noopener">WhatsApp</a><a class="btn sec small" href="tel:+${d}">📞 ${esc(c)}</a>` }
  const tg=c.match(/^@([a-zA-Z][a-zA-Z0-9_]{3,31})$/);
  if(tg) return `<a class="btn small" style="background:#229ed9" href="https://t.me/${tg[1]}" target="_blank" rel="noopener">Telegram ${esc(c)}</a>`;
  return `<span class="pill" style="font-size:14px;padding:7px 12px">${esc(c)}</span>` }
function adCard(a){
  const own=(Board.uid&&a.uid===Board.uid)||isAdmin(), room=a.cat==='room';
  const meta=[a.place?`📍 ${esc(a.place)}`:'',a.uni?`🎓 ${esc(a.uni)}`:'',room&&a.gender&&a.gender!=='any'?(a.gender==='f'?'👩 ':'👨 ')+t('sex_'+a.gender):'',`🕒 ${ago(a.createdAt)}`].filter(Boolean).map(s=>`<span>${s}</span>`).join('');
  return `<div class="ad"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:nowrap"><span class="pill acc">${catIcon(a.cat)} ${a.kind?t('kind_'+a.kind):t('cat_'+a.cat)}</span>${a.price!=null&&a.price!==''?`<b class="price">${a.price} ₼${room?t('per_month'):''}</b>`:''}</div>
  <div class="adt">${esc(a.title)}</div><div class="row note adm">${meta}</div>${a.text?`<div class="adx">${esc(a.text)}</div>`:''}
  <div class="row" style="margin-top:12px;gap:8px">${contactBtns(a.contact)}<span style="flex:1"></span>${own?`<button class="btn ghost small" data-del="${esc(a.id)}">${t('delete')}</button>`:`<button class="btn ghost small" style="color:var(--mute)" data-rep="${esc(a.id)}">${t('report')}</button>`}</div></div>` }

// ---------- home teaser ----------
function renderHomeBoard(){ if(!$('hbTiles')) return;
  const cnt={}; Board.ads.forEach(a=>cnt[a.cat]=(cnt[a.cat]||0)+1);
  $('hbTiles').innerHTML=['room','sell','service','job'].map(c=>`<a class="tile" data-h="board-${c}"><span><span class="tico">${catIcon(c)}</span><b>${t('cat_'+c)}</b></span>${cnt[c]?`<span class="pill">${cnt[c]}</span>`:''}</a>`).join('');
}

// ---------- post form ----------
const PO={cat:'room',kind:'need_mate'};
function renderPost(cat){
  if(cat&&AD_CATS.some(x=>x[0]===cat)&&cat!==PO.cat){ PO.cat=cat; PO.kind=(AD_KINDS[cat]||[''])[0] }
  show('post'); document.title=t('post_title')+' | Sessiya+';
  $('poCat').innerHTML=AD_CATS.map(([c,ic])=>`<button data-v="${c}" class="${c===PO.cat?'on':''}">${ic} ${t('cat_'+c)}</button>`).join('');
  $('poCat').querySelectorAll('button').forEach(b=>b.onclick=()=>{PO.cat=b.dataset.v;PO.kind=(AD_KINDS[PO.cat]||[''])[0];renderPost()});
  const kinds=AD_KINDS[PO.cat]; $('poKindBox').classList.toggle('hide',!kinds);
  if(kinds){ $('poKind').innerHTML=kinds.map(k=>`<button data-v="${k}" class="${k===PO.kind?'on':''}">${t('kind_'+k)}</button>`).join('');
    $('poKind').querySelectorAll('button').forEach(b=>b.onclick=()=>{PO.kind=b.dataset.v;renderPost()}) }
  const room=PO.cat==='room';
  const sv=$('poSex').value||'any'; $('poSex').innerHTML=['any','f','m'].map(s=>`<option value="${s}">${t('sex_'+s)}</option>`).join(''); $('poSex').value=sv;
  $('poSexBox').classList.toggle('hide',!room); $('poPriceL').textContent=room?t('f_price_room'):t('f_price');
  $('poTitle').placeholder=t('ph_title_'+(room?PO.kind:PO.cat==='sell'?'sell':'gen')); $('poText').placeholder=room?t('ph_text_room'):t('ph_text_gen');
  if(!$('poContact').value) $('poContact').value=store.get('sp_contact','');
  $('poMsg').textContent=''; $('poSave').disabled=!Board.api&&Board.ready;
  if($('poSave').disabled) $('poMsg').textContent=t('board_soon');
  Board.start().then(()=>{ $('poSave').disabled=!Board.api; if(!Board.api) $('poMsg').textContent=t('board_soon') });
}
function initBoard(){
  $('placeList').innerHTML=PLACES.map(p=>`<option value="${esc(p)}">`).join('');
  $('poUni').innerHTML=`<option value="">—</option>`+UNIS.map(u=>{const s=(u[1].match(/\(([^)]+)\)/)||[0,u[1]])[1];return `<option value="${esc(s)}">${esc(u[1])}</option>`}).join('');
  $('bdSearch').oninput=()=>{BS.q=$('bdSearch').value;renderAds()}; $('bdMax').oninput=()=>{BS.max=$('bdMax').value;renderAds()};
  $('poCancel').onclick=()=>go(PO.cat?'board-'+PO.cat:'board');
  $('poSave').onclick=async()=>{
    const msg=$('poMsg'), title=$('poTitle').value.trim(), contact=$('poContact').value.trim(), pr=$('poPrice').value.trim();
    if(title.length<3) return msg.textContent=t('post_need_title');
    if(contact.length<5) return msg.textContent=t('post_need_contact');
    if(!$('poAgree').checked) return msg.textContent=t('post_need_agree');
    if(FB_CONFIG&&!isReal(FB.user)) return msg.innerHTML=t('post_need_login')+` <a data-h="profile" style="color:var(--acc);cursor:pointer;font-weight:600">${t('acc_login')} →</a>`;
    const lim=store.get('sp_postlim',{}); const n=lim.day===dayKey()?lim.n:0; if(n>=AD_PER_DAY) return msg.textContent=t('post_limit');
    const price=pr===''?null:Math.min(100000,Math.max(0,Math.round(parseFloat(pr.replace(',','.'))||0)));
    const ad={cat:PO.cat,kind:AD_KINDS[PO.cat]?PO.kind:'',title:title.slice(0,80),text:$('poText').value.trim().slice(0,1000),price,
      place:$('poPlace').value.trim().slice(0,60),uni:$('poUni').value,gender:PO.cat==='room'?$('poSex').value:'any',contact:contact.slice(0,60),lang:LANG};
    $('poSave').disabled=true; msg.textContent=t('post_wait');
    try{ await Board.api.create(ad) }catch(e){ $('poSave').disabled=false; msg.textContent=t('post_fail'); return }
    store.set('sp_postlim',{day:dayKey(),n:n+1}); store.set('sp_contact',contact);
    ['poTitle','poText','poPrice','poPlace'].forEach(id=>$(id).value=''); $('poAgree').checked=false; $('poSave').disabled=false;
    BS.kind='all'; BS.q=''; $('bdSearch').value=''; go('board-'+PO.cat);
  };
}
