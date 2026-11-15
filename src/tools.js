// ---------- activity / streak ----------
function dayKey(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function getAct(){const a=store.get('sp_act',null);return a&&a.days?a:{days:{},total:0}}
function bump(n){ if(!(n>0)) return; const a=getAct(), k=dayKey(); a.days[k]=(a.days[k]||0)+n; a.total=(a.total||0)+n;
  const ks=Object.keys(a.days).sort(); if(ks.length>400) ks.slice(0,ks.length-400).forEach(x=>delete a.days[x]); store.set('sp_act',a) }
function streak(){ const a=getAct(); const d=new Date(); let n=0; if(!a.days[dayKey(d)]) d.setDate(d.getDate()-1);
  while(a.days[dayKey(d)]){ n++; d.setDate(d.getDate()-1) } return n }

// ---------- exams calendar helpers ----------
function exams(){ return store.get('sp_exams',[]) }
function daysTo(ds){ const [y,m,d]=ds.split('-').map(Number); const a=new Date(y,m-1,d), b=new Date(); b.setHours(0,0,0,0); return Math.round((a-b)/86400000) }
function leftLabel(n){ return n<0?t('passed'):n===0?t('today_exam'):n===1?t('tomorrow'):t('days_left',n) }
function nextExam(){ return exams().map(e=>({...e,n:daysTo(e.d)})).filter(e=>e.n>=0).sort((a,b)=>a.n-b.n)[0] }
const MON={az:['yanvar','fevral','mart','aprel','may','iyun','iyul','avqust','sentyabr','oktyabr','noyabr','dekabr'],ru:['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],en:['January','February','March','April','May','June','July','August','September','October','November','December']};
const WD={az:['B.','B.e.','Ç.a.','Ç.','C.a.','C.','Ş.'],ru:['вс','пн','вт','ср','чт','пт','сб'],en:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']};
function fmtDate(ds){ const [y,m,d]=ds.split('-').map(Number); const dt=new Date(y,m-1,d); const L=MON[LANG]?LANG:'az';
  return `${d} ${MON[L][m-1]}${y!==new Date().getFullYear()?' '+y:''}, ${WD[L][dt.getDay()]}` }

function renderProgress(){
  const a=getAct(), s=streak(), today=a.days[dayKey()]||0, ne=nextExam();
  $('prStreak').textContent=s+(s?' 🔥':''); $('prToday').textContent=today; $('prTotal').textContent=a.total||0;
  $('prNext').innerHTML=ne?`${esc(ne.s)}<span class="note" style="display:block;font-weight:500;font-size:13px">${esc(leftLabel(ne.n))}</span>`:`<a data-h="tools-cal" style="color:var(--acc);font-size:14px;cursor:pointer">${t('cal_add')} →</a>`;
  $('prTip').textContent=!a.total?t('prog_tip_new'):today?t('prog_tip_done'):t('prog_tip');
}

// ---------- tools view ----------
let TL='calc';
function renderTools(tab){ if(tab) TL=tab; show('tools');
  document.querySelectorAll('#tlTabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===TL));
  ['calc','gpa','cal','pomo'].forEach(k=>$('tl-'+k).classList.toggle('hide',k!==TL));
  ({calc:renderCalc,gpa:renderGpa,cal:renderCal,pomo:renderPomo})[TL]();
  if(!PM.run) document.title=t('tools_title')+' | Sessiya+';
}

// score calculator (50 semester + 50 exam, exam >= 17)
const GRADES=[['A',91],['B',81],['C',71],['D',61],['E',51]];
const GCOL={A:'#16a34a',B:'#65a30d',C:'#ca8a04',D:'#ea580c',E:'#f97316',F:'#dc2626'};
function letter(total){ for(const [g,m] of GRADES) if(total>=m) return g; return 'F' }
function gb(g){ return `<span class="gb" style="background:${GCOL[g]}">${g}</span>` }
function numVal(v,max){ const x=parseFloat(String(v).replace(',','.')); return isNaN(x)?null:Math.min(max,Math.max(0,x)) }
function renderCalc(){
  const s=numVal($('clSem').value,50), e=numVal($('clExam').value,50);
  store.set('sp_calc',{s:$('clSem').value,e:$('clExam').value});
  $('clTable').innerHTML=s==null?`<div class="empty">${t('calc_empty')}</div>`:GRADES.map(([g,m])=>{
    const need=Math.max(17,Math.ceil(m-s)), imp=need>50;
    return `<div class="tile" style="cursor:default;margin-bottom:8px;${imp?'opacity:.55':''}"><span>${gb(g)} <span style="margin-left:6px">${t('g_'+g)}</span> <span class="note">${m}+</span></span><b style="${imp?'color:var(--bad)':''}">${imp?t('calc_imp'):t('calc_need',need)}</b></div>`}).join('');
  if(s==null||e==null){ $('clFinal').innerHTML=''; return }
  const tot=Math.round((s+e)*10)/10, g=e<17?'F':letter(tot);
  $('clFinal').innerHTML=`<div class="stat" style="text-align:center"><span class="note">${t('calc_total')}</span><b style="font-size:34px;margin:4px 0">${tot} ${gb(g)}</b><span class="note">${e<17?t('calc_fail_min'):t('g_'+g)}</span></div>`;
}

// GPA (ÜOMG) calculator
let GP=null;
function blankRow(){ return {n:'',c:'',s:''} }
function renderGpa(){
  if(!GP) GP=store.get('sp_gpa',null)||[blankRow(),blankRow(),blankRow()];
  $('gpRows').innerHTML=`<div class="gprow hd"><span>${t('gpa_subj')}</span><span>${t('gpa_cr')}</span><span>${t('gpa_score')}</span><span></span></div>`+
    GP.map((r,i)=>`<div class="gprow"><input type="text" data-r="${i}" data-k="n" value="${esc(r.n)}" placeholder="${esc(t('gpa_subj'))} ${i+1}"><input type="number" inputmode="decimal" data-r="${i}" data-k="c" value="${esc(r.c)}" placeholder="5"><input type="number" inputmode="decimal" data-r="${i}" data-k="s" value="${esc(r.s)}" placeholder="85"><button class="btn ghost small" data-del="${i}" aria-label="x">✕</button></div>`).join('');
  $('gpRows').querySelectorAll('input').forEach(inp=>inp.oninput=()=>{ GP[+inp.dataset.r][inp.dataset.k]=inp.value; store.set('sp_gpa',GP); gpaOut() });
  $('gpRows').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ GP.splice(+b.dataset.del,1); if(!GP.length) GP.push(blankRow()); store.set('sp_gpa',GP); renderGpa() });
  gpaOut();
}
function gpaOut(){
  let sum=0,cr=0,n=0; GP.forEach(r=>{ const c=numVal(r.c,100), s=numVal(r.s,100); if(c>0&&s!=null&&String(r.s).trim()!==''){ sum+=s*c; cr+=c; n++ } });
  if(!cr){ $('gpOut').innerHTML=''; return }
  const g=sum/cr;
  $('gpOut').innerHTML=`<div class="stat" style="text-align:center"><span class="note">${t('gpa_out')}</span><b style="font-size:34px;margin:4px 0">${g.toFixed(2)} ${gb(letter(g))}</b><span class="note">${t('gpa_meta',n,Math.round(cr*10)/10)}</span></div>`;
}

// exam calendar
function renderCal(){
  const L=exams().map((e,i)=>({...e,i,n:daysTo(e.d)})).sort((a,b)=>((a.n<0)-(b.n<0))||(a.n<0?b.n-a.n:a.n-b.n));
  $('caList').innerHTML=L.length?L.map(e=>{ const hot=e.n>=0&&e.n<=3;
    return `<div class="tile" style="cursor:default;margin-bottom:8px;${e.n<0?'opacity:.5':''}"><span><b>${esc(e.s)}</b><span class="note" style="display:block">${esc(fmtDate(e.d))}</span></span><span class="row" style="gap:4px;flex-wrap:nowrap"><span class="pill" style="${hot?'background:var(--badbg);color:var(--bad)':e.n>=0?'background:var(--acc2);color:var(--acc)':''}">${esc(leftLabel(e.n))}</span><button class="btn ghost small" data-del="${e.i}" aria-label="x">✕</button></span></div>` }).join('')
    :`<div class="empty">${t('cal_empty')}</div>`;
  $('caList').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ const L=exams(); L.splice(+b.dataset.del,1); store.set('sp_exams',L); renderCal() });
}

// pomodoro
const PM={mins:25,left:1500,run:false,end:0,iv:null};
function pmFmt(s){ return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0') }
function pomoToday(){ const p=store.get('sp_pomo',{}); return p.day===dayKey()?p.n:0 }
function renderPomo(){
  document.querySelectorAll('#pmMode button').forEach(b=>b.classList.toggle('on',+b.dataset.v===PM.mins));
  $('pmTime').textContent=pmFmt(PM.left); $('pmStart').textContent=PM.run?t('pomo_pause'):t('pomo_start');
  $('pmCount').textContent=t('pomo_done_n',pomoToday());
}
function pmTick(){ PM.left=Math.max(0,Math.round((PM.end-Date.now())/1000)); $('pmTime').textContent=pmFmt(PM.left); document.title=pmFmt(PM.left)+' · Sessiya+';
  if(!PM.left){ pmStop(); pmDone() } }
function pmStop(){ PM.run=false; clearInterval(PM.iv); renderPomo() }
function pmDone(){
  if(PM.mins===25) store.set('sp_pomo',{day:dayKey(),n:pomoToday()+1});
  beep(); try{ navigator.vibrate&&navigator.vibrate([300,150,300]) }catch(e){}
  document.title='⏰ '+t('pomo_end'); PM.left=PM.mins*60; renderPomo();
}
function beep(){ try{ const A=new (window.AudioContext||window.webkitAudioContext)();
  [0,.35,.7].forEach(d=>{ const o=A.createOscillator(), g=A.createGain(); o.frequency.value=880; o.connect(g); g.connect(A.destination);
    g.gain.setValueAtTime(.25,A.currentTime+d); g.gain.exponentialRampToValueAtTime(.001,A.currentTime+d+.3); o.start(A.currentTime+d); o.stop(A.currentTime+d+.32) }) }catch(e){} }

// ---------- share ----------
function siteUrl(h){ return location.origin+location.pathname+(h?'#'+h:'') }
async function shareText(text,url){
  if(navigator.share){ try{ await navigator.share({text,url}); return }catch(e){ if(e&&e.name==='AbortError') return } }
  window.open('https://wa.me/?text='+encodeURIComponent(text+'\n'+url),'_blank');
}
function bankLinkId(b){ return b.shared?b.id:b.sharedId }

// ---------- search inside a bank ----------
const FOLD={ı:'i',ə:'e',ş:'s',ç:'c',ğ:'g',ö:'o',ü:'u',ё:'е'};
function lowq(s){ return String(s||'').replace(/[İI]/g,'i').toLowerCase().replace(/[ıəşçğöüё]/g,c=>FOLD[c]) }
function hl(s,q){ const i=lowq(s).indexOf(q); if(i<0||lowq(s).length!==s.length) return esc(s); return esc(s.slice(0,i))+'<mark>'+esc(s.slice(i,i+q.length))+'</mark>'+esc(s.slice(i+q.length)) }
function renderSearch(){
  const q=lowq($('bkSearch').value.trim()), box=$('bkSearchRes');
  if(q.length<2||!curBank||!curBank.qs){ box.innerHTML=''; return }
  const W=curBank.type==='written', hits=[];
  curBank.qs.forEach((x,i)=>{ const a=W?getAns(curBank,i):x.o[x.a]; if(lowq(x.q).includes(q)||lowq(a).includes(q)) hits.push([x,a]) });
  box.innerHTML=hits.length?hits.slice(0,15).map(([x,a])=>`<div class="mistake"><b>${hl(x.q,q)}</b><div class="note c" style="margin-top:4px;white-space:pre-wrap">✓ ${a?hl(a,q):'—'}</div></div>`).join('')
    +(hits.length>15?`<div class="note" style="padding-top:8px">${t('search_more',hits.length-15)}</div>`:'')
    :`<div class="empty">${t('search_none')}</div>`;
}

function initTools(){
  document.querySelectorAll('#tlTabs button').forEach(b=>b.onclick=()=>go('tools-'+b.dataset.v));
  const cs=store.get('sp_calc',{}); $('clSem').value=cs.s||''; $('clExam').value=cs.e||'';
  $('clSem').oninput=renderCalc; $('clExam').oninput=renderCalc;
  $('gpAdd').onclick=()=>{ GP.push(blankRow()); store.set('sp_gpa',GP); renderGpa(); const ins=$('gpRows').querySelectorAll('input[data-k="n"]'); ins[ins.length-1].focus() };
  $('caAdd').onclick=()=>{ const s=$('caSubj').value.trim(), d=$('caDate').value; if(!s){ $('caSubj').focus(); return } if(!d){ $('caDate').focus(); return }
    const L=exams(); L.push({s,d}); store.set('sp_exams',L); $('caSubj').value=''; renderCal() };
  $('caSubj').onkeydown=e=>{ if(e.key==='Enter') $('caAdd').click() };
  $('pmStart').onclick=()=>{ if(PM.run){ PM.left=Math.max(0,Math.round((PM.end-Date.now())/1000)); pmStop(); return }
    PM.run=true; PM.end=Date.now()+PM.left*1000; clearInterval(PM.iv); PM.iv=setInterval(pmTick,500); renderPomo() };
  $('pmReset').onclick=()=>{ pmStop(); PM.left=PM.mins*60; renderPomo() };
  document.querySelectorAll('#pmMode button').forEach(b=>b.onclick=()=>{ pmStop(); PM.mins=+b.dataset.v; PM.left=PM.mins*60; renderPomo() });
  $('rsShare').onclick=()=>shareText(t('share_text',$('rsScore').textContent,curBank.name),siteUrl(bankLinkId(curBank)?'b-'+bankLinkId(curBank):''));
  $('bkShare').onclick=()=>shareText(t('share_bank_text',curBank.name),siteUrl('b-'+bankLinkId(curBank)));
  $('bkSearch').oninput=renderSearch;
}
