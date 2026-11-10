// Test-bank text parser. Input: plain text (lines). Output: [{q, o:[...], a}]
function normLine(s){
  return s.replace(/ /g,' ').replace(/[ \t]+/g,' ').replace(/ә/g,'ə').replace(/Ә/g,'Ə').trim();
}
const QNUM=/^(\d{1,4})\s*[.)]\s*(?:Sual\s*:\s*)?(.*)$/i;
const MARK_OPT=/^([•●▪◦\-–√✓✔+])\s*(.*)$/;          // "• text" / "√ text"
const LETTER_OPT=/^([A-EА-Е])\s*(\)\)|\)|\.)\s*(.*)$/; // "A) text" / "C)) text"
const CORRECT_MARK=/[√✓✔+]/;

function parseBank(text){
  const raw=text.split(/\r?\n/).map(normLine).filter(l=>l.length);
  // drop page furniture
  const pre=raw.filter(l=>!/^\d{1,2}[./]\d{1,2}[./]\d{2,4}$/.test(l) && !/^\d+\/\d+$/.test(l));
  // drop runs (>=3) of consecutive integers (row-number columns from PDF tables)
  const drop=new Set();
  for(let i=0;i<pre.length;){
    let j=i; while(j+1<pre.length && /^\d{1,4}$/.test(pre[j]) && /^\d{1,4}$/.test(pre[j+1]) && +pre[j+1]===+pre[j]+1) j++;
    if(j-i>=2){ for(let k=i;k<=j;k++) drop.add(k); i=j+1; } else i++;
  }
  const lines=pre.filter((_,k)=>!drop.has(k));
  let out=[];
  out=parseMarked(lines); if(out.length>=3) return dedupe(out);
  out=parseLetter(lines); if(out.length>=3) return dedupe(out);
  out=parseTrailingBullet(lines);
  return dedupe(out);
}

// Format 1: "12. Question" + option lines starting with • (wrong) or √ (correct)
function parseMarked(lines){
  const res=[]; let cur=null;
  const flush=()=>{ if(cur && cur.o.length>=2 && cur.a>=0) res.push(cur); cur=null; };
  for(const l of lines){
    let m=l.match(MARK_OPT);
    if(m && cur){
      const isC=CORRECT_MARK.test(m[1]);
      if(m[2]==='' ){ cur.pending=isC; continue; }
      if(isC||cur.pending){ cur.a=cur.o.length; cur.pending=false; }
      cur.o.push(m[2]); cur.lastOpt=true; continue;
    }
    if(m && !cur) continue;
    const q=l.match(QNUM);
    if(q && q[2]){ flush(); cur={q:q[2],o:[],a:-1}; continue; }
    if(cur){
      if(cur.o.length===0) cur.q+=' '+l;            // question continues
      else if(cur.pending!==undefined && cur.o.length) cur.o[cur.o.length-1]+=' '+l; // option continues
    }
  }
  flush(); return res.map(clean);
}

// Format 2: "1) Sual: text" + "A) ..." options; correct marked as "C))" or option starting with + / √
function parseLetter(lines){
  const res=[]; let cur=null;
  const flush=()=>{ if(cur && cur.o.length>=2 && cur.a>=0) res.push(cur); cur=null; };
  for(const l of lines){
    const q=l.match(QNUM);
    const lo=l.match(LETTER_OPT);
    if(lo && cur && !(q && !lo)){
      let t=lo[3]; let isC=lo[2]==='))';
      if(/^[√✓✔+]\s*/.test(t)){ isC=true; t=t.replace(/^[√✓✔+]\s*/,''); }
      if(/\s*[•√✓✔]$/.test(t)){ isC=true; t=t.replace(/\s*[•√✓✔]$/,''); }
      if(isC) cur.a=cur.o.length;
      cur.o.push(t); continue;
    }
    if(q && q[2]){ flush(); cur={q:q[2],o:[],a:-1}; continue; }
    if(cur){ if(cur.o.length===0) cur.q+=' '+l; else cur.o[cur.o.length-1]+=' '+l; }
  }
  flush(); return res.map(clean);
}

// Format 3: question line(s) followed by option lines, exactly one ends with "•"
function isQ(l){ return /[?:]$/.test(l) || /^Sual\s*:/i.test(l); }
function parseTrailingBullet(lines){
  const res=[]; let i=0; let qbuf=[];
  const hasQ=lines.filter(isQ).length>=3;
  if(hasQ){
    while(i<lines.length){
      if(isQ(lines[i])){
        const q=lines[i].replace(QNUM,'$2'); const o=[]; let j=i+1;
        while(j<lines.length && !isQ(lines[j]) && o.length<8){ o.push(lines[j]); j++; }
        const marked=o.filter(x=>/•$/.test(x));
        // drop leading continuation lines of the question (question may wrap): keep last 6 options max
        if(marked.length===1 && o.length>=2){
          const opts=o.slice(-Math.min(o.length,6));
          const a=opts.findIndex(x=>/•$/.test(x));
          if(a>=0) res.push(clean({q, o:opts.map(x=>x.replace(/\s*•$/,'')), a}));
        }
        i=j; continue;
      }
      i++;
    }
    return res;
  }
  while(i<lines.length){
    let best=null;
    for(const k of [5,4,3,6]){
      const grp=lines.slice(i,i+k); if(grp.length<k) continue;
      if(grp.filter(x=>/•$/.test(x)).length===1 && !grp.some(isQ) && grp.every(x=>x.length<=160)){ best=grp; break; }
    }
    if(best && qbuf.length){
      res.push(clean({q:qbuf.join(' ').replace(QNUM,'$2'),o:best.map(x=>x.replace(/\s*•$/,'')),a:best.findIndex(x=>/•$/.test(x))}));
      qbuf=[]; i+=best.length; continue;
    }
    qbuf.push(lines[i]); if(qbuf.length>3) qbuf.shift(); i++;
  }
  return res;
}

function clean(x){
  return {q:x.q.replace(/\s+/g,' ').trim(), o:x.o.map(s=>s.replace(/\s+/g,' ').trim()), a:x.a};
}
function dedupe(arr){
  const seen=new Set(); return arr.filter(x=>{const k=x.q+'|'+x.o.join('|'); if(seen.has(k)) return false; seen.add(k); return x.q.length>2;});
}
if(typeof module!=='undefined') module.exports={parseBank};
