// ---------- AI: Gemini через Firebase AI Logic (бесплатный тариф Spark, ключ не нужен) ----------
// Распознаёт структуру тестов из PDF/DOCX/фото, отмечает правильные ответы, пишет ответы к вопросам и делает варианты.
const AI_SDK='12.12.0';
const AI_MODELS=['gemini-3.5-flash-lite','gemini-3.6-flash','gemini-3.1-flash-lite'];
const AI_LIMIT={real:60,guest:15};             // запросов к ИИ в день на пользователя (админам без лимита)
const AI_APPCHECK_KEY='6LfjciouAAAAANhW9OWYhQLTRX1Ro9NGdSzxaLHc'; // reCAPTCHA v3 (сайт elmin-eyvazov.github.io)
const AI_APPCHECK_ON=false;                    // включить после того, как секретный ключ добавлен в Firebase → App Check
const AI_CHUNK=7000;                           // символов текста на один запрос
let _ai=null, _aiModel=0;
async function aiCore(){
  if(_ai) return _ai;
  const base='https://www.gstatic.com/firebasejs/'+AI_SDK+'/';
  const A=await import(base+'firebase-app.js'), M=await import(base+'firebase-ai.js');
  const app=A.getApps().find(a=>a.name==='ai')||A.initializeApp(FB_CONFIG,'ai');
  if(AI_APPCHECK_ON){ try{ const C=await import(base+'firebase-app-check.js'); C.initializeAppCheck(app,{provider:new C.ReCaptchaV3Provider(AI_APPCHECK_KEY),isTokenAutoRefreshEnabled:true}) }catch(e){} }
  _ai={M,ai:M.getAI(app,{backend:new M.GoogleAIBackend()})}; return _ai;
}
function aiUsage(){ const u=store.get('sp_ai',{}); return u.day===dayKey()?u.n:0 }
function aiLimit(){ return (typeof isAdmin==='function'&&isAdmin())?9999:(isReal(FB.user)?AI_LIMIT.real:AI_LIMIT.guest) }
function aiLeft(){ return Math.max(0,aiLimit()-aiUsage()) }
function aiSpend(n){ store.set('sp_ai',{day:dayKey(),n:aiUsage()+(n||1)}); if(typeof statInc==='function') statInc('ai',n||1) }
function aiErr(code){ const e=new Error(code); e.code=code; return e }
function jsonSalvage(s){
  try{ return JSON.parse(s) }catch(e){}
  let p=s.length;                                    // обрезанный ответ: отрезаем по последнему целому объекту и закрываем массив
  for(let k=0;k<300;k++){ p=s.lastIndexOf('}',p-1); if(p<0) return null; try{ return JSON.parse(s.slice(0,p+1)+']}') }catch(e){} }
  return null;
}
// один запрос к модели с перебором моделей при 404/429/перегрузке
async function aiCall(parts,schema,{temp=0}={}){
  if(aiLeft()<=0) throw aiErr('ai_limit');
  const {M,ai}=await aiCore(); let last=null;
  for(let k=0;k<AI_MODELS.length;k++){
    const name=AI_MODELS[(_aiModel+k)%AI_MODELS.length];
    try{
      const model=M.getGenerativeModel(ai,{model:name,generationConfig:{responseMimeType:'application/json',responseSchema:schema(M.Schema),temperature:temp}});
      const r=await model.generateContent(parts); aiSpend(1);
      const j=jsonSalvage(r.response.text()); if(!j) throw aiErr('ai_bad');
      _aiModel=(_aiModel+k)%AI_MODELS.length; return j;
    }catch(e){ last=e; const s=String(e&&e.message||e);
      if(e.code==='ai_bad'||/404|429|503|500|overloaded|not found|no longer|quota|RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(s)) continue;
      throw e; }
  }
  if(last&&/429|quota|RESOURCE_EXHAUSTED/i.test(String(last.message))) throw aiErr('ai_busy');
  throw last||aiErr('ai_fail');
}
async function aiPool(jobs,n,onDone){ const out=new Array(jobs.length); let i=0,done=0;
  await Promise.all(Array.from({length:Math.min(n,jobs.length)},async()=>{ while(i<jobs.length){ const k=i++; out[k]=await jobs[k](); done++; onDone&&onDone(done,jobs.length) } }));
  return out }
function aiChunks(text,size){
  const lines=String(text).replace(/\r/g,'').split('\n'), out=[]; let cur='';
  for(const l of lines){
    const startsQ=/^\s*(\d{1,4}\s*[\.\)]|sual\s*\d|вопрос\s*\d|question\s*\d|#\s*\d)/i.test(l);
    if(cur.length>size&&startsQ || cur.length>size*1.6){ out.push(cur); cur='' }
    cur+=l+'\n';
  }
  if(cur.trim()) out.push(cur); return out;
}
function b64(buf){ let s='',b=new Uint8Array(buf); for(let i=0;i<b.length;i+=0x8000) s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000)); return btoa(s) }

const AI_EXTRACT_RULES=`You convert a university exam question bank (Azerbaijan; Azerbaijani, Russian or English) into structured JSON.
The input may be messy: broken lines, page headers/footers, page numbers, titles, teacher names — ignore everything that is not a question.
Return EVERY question in the original order. Do not invent, merge, translate or summarize questions.
- q: the question text exactly as written; join broken line wraps; remove the leading number/label.
- o: the answer options WITHOUT their labels (A) a) 1. • - etc.) and WITHOUT correctness markers (√ * + » ** "(correct)" etc.); [] if the question has no options.
- a: 0-based index of the correct option. It can be marked by √ ✓ + * • » «))» ●, bold (**text**), underline, highlighting, "(düzgün)"/"(верно)", or given in an answer key ("1-B", "1) C", "Cavab: A", "Ответ: б", a table at the end). If nothing marks it use -1 — never guess.
- ans: for questions WITHOUT options — the answer/explanation if the document contains it, else "". For questions with options — "".`;
const aiQSchema=S=>S.object({properties:{questions:S.array({items:S.object({properties:{q:S.string(),o:S.array({items:S.string()}),a:S.integer(),ans:S.string()}})})}});

// Распознать структуру: из текста (кусками) или из самого файла (PDF/фото — модель видит жирный шрифт и разметку)
async function aiExtract(src,onProgress){
  let res=[];
  if(src.images&&src.images.length){                 // несколько фото страниц: по 4 фото на запрос
    const groups=[]; for(let i=0;i<src.images.length;i+=4) groups.push(src.images.slice(i,i+4));
    if(groups.length>aiLeft()) throw aiErr('ai_limit');
    const outs=await aiPool(groups.map(g=>async()=>aiCall([{text:AI_EXTRACT_RULES+'\n\nThe pages are attached as photos, in order.'},...await Promise.all(g.map(async im=>({inlineData:{mimeType:im.type||'image/jpeg',data:b64(await im.arrayBuffer())}})))],aiQSchema)),2,onProgress);
    for(const j of outs) res.push(...((j&&j.questions)||[]));
    return aiSplit(res);
  }
  const f=src.file, isPdf=f&&/\.pdf$/i.test(f.name), isImg=f&&/^image\//.test(f.type);
  const scanned=isPdf&&(src.text||'').trim().length<Math.max(300,(src.pages||1)*80);
  const useFile=isImg||isPdf&&f.size<18e6&&(scanned||(src.pages||99)<=12);
  if(useFile){
    onProgress&&onProgress(0,1);
    const mime=isPdf?'application/pdf':(f.type||'image/jpeg');
    const j=await aiCall([{text:AI_EXTRACT_RULES+'\n\nThe document is attached.'},{inlineData:{mimeType:mime,data:b64(await src.file.arrayBuffer())}}],aiQSchema);
    res=(j&&j.questions)||[]; onProgress&&onProgress(1,1);
  }else{
    const parts=aiChunks(src.text||'',AI_CHUNK).slice(0,40);
    if(!parts.length) throw aiErr('ai_empty');
    if(parts.length>aiLeft()) throw aiErr('ai_limit');
    const outs=await aiPool(parts.map(p=>()=>aiCall(AI_EXTRACT_RULES+'\n\nTEXT:\n'+p,aiQSchema).catch(e=>{ if(e.code==='ai_limit') throw e; return {questions:[]} })),3,onProgress);
    for(const j of outs) res.push(...((j&&j.questions)||[]));
  }
  return aiSplit(res);
}
function aiSplit(res){
  const mc=[],list=[],seen=new Set();
  for(const x of res){
    const q=String(x.q||'').trim(); if(!q) continue;
    const o=(x.o||[]).map(s=>String(s).trim()).filter(Boolean);
    const key=q.toLowerCase()+'|'+o.join('|').toLowerCase(); if(seen.has(key)) continue; seen.add(key);
    if(o.length>=2) mc.push({q,o,a:Number.isInteger(x.a)&&x.a>=0&&x.a<o.length?x.a:-1});
    else list.push({q,ans:String(x.ans||'').trim()});
  }
  if(!mc.length&&!list.length) throw aiErr('ai_empty');
  return {mc,list};
}
const LANG_NAME={az:'Azerbaijani',ru:'Russian',en:'English'};
// Отметить правильные ответы в тестах, где они не отмечены
async function aiSolve(items,onProgress){
  const idx=items.map((x,i)=>i).filter(i=>!(items[i].a>=0)); const batches=[]; for(let i=0;i<idx.length;i+=25) batches.push(idx.slice(i,i+25));
  if(batches.length>aiLeft()) throw aiErr('ai_limit');
  const sch=S=>S.object({properties:{answers:S.array({items:S.object({properties:{i:S.integer(),a:S.integer()}})})}});
  let n=0;
  await aiPool(batches.map(b=>async()=>{
    const body=b.map(i=>({i,q:items[i].q,o:items[i].o}));
    const j=await aiCall(`You are an expert university lecturer. For each multiple-choice question choose the correct option. Return i (as given) and a = 0-based index of the correct option.\n\n`+JSON.stringify(body),sch);
    for(const r of (j.answers||[])){ const it=items[r.i]; if(it&&b.includes(r.i)&&r.a>=0&&r.a<it.o.length){ it.a=r.a; it.ai=1; n++ } }
  }),3,onProgress);
  return n;
}
// Написать образцовые ответы к открытым вопросам
async function aiAnswers(list,lang,onProgress,all){
  const idx=list.map((x,i)=>i).filter(i=>all||!list[i].ans); const batches=[]; for(let i=0;i<idx.length;i+=12) batches.push(idx.slice(i,i+12));
  if(batches.length>aiLeft()) throw aiErr('ai_limit');
  const sch=S=>S.object({properties:{answers:S.array({items:S.object({properties:{i:S.integer(),ans:S.string()}})})}});
  let n=0;
  await aiPool(batches.map(b=>async()=>{
    const body=b.map(i=>({i,q:list[i].q}));
    const j=await aiCall(`You are an expert university lecturer preparing model answers for a written exam. Write the answer for each question in ${LANG_NAME[lang]||'the language of the question'}.
Each answer: 3–7 sentences, accurate, with the key definition, main points and terms (formula or example if relevant). Plain text, no markdown, no "Answer:" prefix. Return i as given.\n\n`+JSON.stringify(body),sch,{temp:0.3});
    for(const r of (j.answers||[])){ const it=list[r.i]; if(it&&b.includes(r.i)&&String(r.ans||'').trim()){ it.ans=String(r.ans).trim(); it.ai=1; n++ } }
  }),3,onProgress);
  return n;
}
// Превратить открытые вопросы в тест с 4 вариантами
async function aiOptions(list,lang,onProgress){
  const batches=[]; for(let i=0;i<list.length;i+=15) batches.push(list.slice(i,i+15).map((x,k)=>i+k));
  if(batches.length>aiLeft()) throw aiErr('ai_limit');
  const sch=S=>S.object({properties:{items:S.array({items:S.object({properties:{i:S.integer(),q:S.string(),o:S.array({items:S.string()}),a:S.integer()}})})}});
  const out=new Array(list.length);
  await aiPool(batches.map(b=>async()=>{
    const body=b.map(i=>({i,q:list[i].q,ref:list[i].ans||undefined}));
    const j=await aiCall(`Turn each exam question into a multiple-choice test question in ${LANG_NAME[lang]||'the language of the question'}.
Keep q close to the original (rephrase only if needed so it has one short correct answer). Give exactly 4 options: one correct (based on "ref" when given) and three plausible, similar-length distractors. Put the correct option at a random position; a = its 0-based index. No labels like "A)". Return i as given.\n\n`+JSON.stringify(body),sch,{temp:0.4});
    for(const r of (j.items||[])){ const o=(r.o||[]).map(s=>String(s).trim()).filter(Boolean); if(b.includes(r.i)&&o.length>=2&&r.a>=0&&r.a<o.length) out[r.i]={q:String(r.q||list[r.i].q).trim(),o,a:r.a,ai:1} }
  }),3,onProgress);
  return out.map((x,i)=>x||{q:list[i].q,o:['','','',''],a:-1});
}
function aiErrText(e){ const c=e&&e.code; return t(c==='ai_limit'?'ai_limit':c==='ai_busy'?'ai_busy':c==='ai_empty'?'ai_empty':'ai_fail') }
