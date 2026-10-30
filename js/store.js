/* ================= Store ================= */
let D=null,savedAt=null;
function loadUIState(){
  try{return Object.assign({activeMemberId:null,simDate:null,tab:'grads',scenario:'full'},JSON.parse(localStorage.getItem(UIKEY)||'null')||{})}
  catch(e){return{activeMemberId:null,simDate:null,tab:'grads',scenario:'full'}}
}
let U=loadUIState();
function saveUI(){try{localStorage.setItem(UIKEY,JSON.stringify({activeMemberId:U.activeMemberId,simDate:U.simDate,tab:U.tab,scenario:U.scenario}))}catch(e){}}
let saveT=null;
function saveNow(){
  savedAt=nowISO();
  try{localStorage.setItem(KEY,JSON.stringify({v:2,savedAt,seedVersion:SEED_VERSION,data:D}));localStorage.setItem(VERKEY,savedAt)}
  catch(e){console.warn('ftc save failed',e)}
}
const Store={
  save(){clearTimeout(saveT);saveT=setTimeout(saveNow,250)},
  syncFromStorage(){
    try{
      const env=JSON.parse(localStorage.getItem(KEY)||'null');
      if(env&&env.v===2&&env.savedAt&&savedAt&&env.savedAt>savedAt){savedAt=env.savedAt;D=env.data;Undo.stack.length=0;return true}
    }catch(e){}
    return false;
  }
};
/* T3: shared guard/repair — used at boot and before adopting an imported JSON snapshot */
function sanitizeData(D){
  if(!D||typeof D!=='object')return null;
  const fixes=[];
  D.settings=Object.assign({},DEFAULT_SETTINGS,D.settings||{});
  ['grads','sessions','invitations','timeline','events','suppressions','importBatches'].forEach(k=>{if(!Array.isArray(D[k])){D[k]=[];fixes.push(k)}});
  if(!D.states||typeof D.states!=='object'){D.states={};fixes.push('states')}
  if(!D.templates||typeof D.templates!=='object'){D.templates=freshTemplates();fixes.push('templates')}
  Object.keys(TEMPLATE_META).forEach(k=>{
    if(!D.templates[k]||!Array.isArray(D.templates[k].versions)||!D.templates[k].versions.length){D.templates[k]=freshTemplates()[k];fixes.push('tpl:'+k)}
  });
  if(!Array.isArray(D.members)||!D.members.length)D.members=MEMBERS.map(m=>({id:m,name:m}));
  const n0=D.grads.length;
  D.grads=D.grads.filter(g=>g&&g.id&&g.name);
  if(D.grads.length!==n0)fixes.push('grads');
  D.grads.forEach(g=>{
    if(!Array.isArray(g.contacts))g.contacts=[];
    g.doNotContact=!!g.doNotContact;
    if(g.deletedAt===undefined)g.deletedAt=null;
    if(g.mergedInto===undefined)g.mergedInto=null;
    if(g.createdFrom===undefined)g.createdFrom='imported';
    if(!g.createdAt)g.createdAt=nowISO();
    ['dncReason','dncBy','dncAt','demoNote','lastVerified'].forEach(f=>{if(g[f]===undefined)g[f]=null});
  });
  const ids=new Set(D.grads.map(g=>g.id));
  /* events must be repaired BEFORE sessions reference the open event */
  D.events=(Array.isArray(D.events)?D.events:[]).filter(e=>e&&e.id&&e.startedAt);
  if(!D.events.length){D.events=[{id:uid('e'),name:'جلسة خريج',startedAt:riyadhToday(),closedAt:null,status:'open'}];fixes.push('events')}
  const opens=D.events.filter(e=>e.status==='open');
  if(opens.length>1){opens.slice(1).forEach(e=>e.status='closed');fixes.push('events')}
  if(!opens.length&&D.events.length){D.events.sort((a,b)=>String(b.startedAt).localeCompare(String(a.startedAt)))[0].status='open';fixes.push('events')}
  const openEv=D.events.find(e=>e&&e.status==='open');
  const nS=D.sessions.length;
  D.sessions=D.sessions.filter(s=>s&&s.id&&s.gradId&&ids.has(s.gradId)&&s.date);
  if(D.sessions.length!==nS)fixes.push('sessions');
  D.sessions.forEach(s=>{
    if(!s.eventId)s.eventId=openEv?openEv.id:D.events[0].id;
    if(typeof s.dur!=='number'||!(s.dur>0))s.dur=60;
    s.topic=s.topic||'';s.notes=s.notes||'';
    /* R-03: only http(s) URLs survive a restore */
    s.slidesUrl=safeUrl(s.slidesUrl);
    s.recordingUrl=safeUrl(s.recordingUrl);
    if(s.doneAt===undefined)s.doneAt=null;
    if(s.deletedAt===undefined)s.deletedAt=null;
  });
  const nI=D.invitations.length;
  D.invitations=D.invitations.filter(i=>i&&i.id&&i.gradId&&ids.has(i.gradId)
    &&(!i.eventId||D.events.some(e=>e.id===i.eventId))&&(i.kind==='initial'||i.kind==='reminder'));
  if(D.invitations.length!==nI)fixes.push('invitations');
  D.invitations.forEach(i=>{
    if(!['confirmed','sending','cancelled'].includes(i.status))i.status='confirmed';
    if(!i.createdAt)i.createdAt=nowISO();
    if(i.confirmedAt===undefined)i.confirmedAt=null;
    i.senderId=i.senderId||null;
  });
  D.timeline=D.timeline.filter(t=>t&&t.ts&&!isNaN(Date.parse(t.ts))&&t.kind);
  Object.keys(D.states).forEach(k=>{
    if(!k.includes('|')){delete D.states[k];fixes.push('states');return}
    const st=D.states[k];
    if(!st||!st.gradId||!st.eventId){delete D.states[k];fixes.push('states');return}
    if(!STATUS[st.status]){st.status='new';fixes.push('states')}
    if('last'in st&&st.last&&isNaN(Date.parse(st.last)))st.last=null;
  });
  return fixes;
}
async function bootStore(){
  /* IS_TEST only: ?seed=empty|perf picks the demo scenario for one browsing session */
  const qseed=QP.get('seed');
  if(IS_TEST&&(qseed==='empty'||qseed==='perf')){U.scenario=qseed;saveUI()}
  let env=null;
  try{env=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){env=null}
  /* T1: one-shot forced reseed (test panel reset / scenario switch) */
  let force=false;
  try{if(sessionStorage.getItem('ftc-force-seed')==='1'){force=true;sessionStorage.removeItem('ftc-force-seed')}}catch(e){}
  if(force){try{if(env)localStorage.setItem('ftc-grads-v2-backup-'+Date.now(),JSON.stringify(env))}catch(e){}
    /* R-08: the flag REPLACES everything (including any legacy key) with the chosen scenario — never re-migrate */
    D=seedScenario(U.scenario||'full');
    if(D.seedComplete){await D.seedComplete();delete D.seedComplete}
    D.demo=(U.scenario||'full')!=='empty';
    saveNow();return {seed:true,forced:true};
  }
  if(env&&env.v===2&&env.data&&typeof env.seedVersion==='number'&&env.seedVersion<SEED_VERSION&&isPureDemo(env.data)){
    /* pure demo dataset from an older seed version — replace with the new one */
    env=null;
  }
  if(!env||!env.data||env.v!==2){
    /* quarantine malformed v2 blob */
    if(env)try{localStorage.setItem('ftc-grads-v2-backup-'+Date.now(),JSON.stringify(env))}catch(e){}
    /* migrate legacy or fresh demo seed */
    let old=null;
    try{old=JSON.parse(localStorage.getItem(OLDKEY)||'null')}catch(e){old=null}
    if(old&&Array.isArray(old.grads)){D=migrateLegacy(old);D.demo=false;saveNow();return {migrated:true}}
    D=seedScenario(U.scenario||'full');
    if(D.seedComplete){await D.seedComplete();delete D.seedComplete}
    D.demo=(U.scenario||'full')!=='empty';
    saveNow();return {seed:true};
  }
  D=env.data;savedAt=env.savedAt;
  /* guards */
  sanitizeData(D);
  return {seed:false,migrated:false};
}
/* R-14: auto-replace on seed bump applies ONLY to untouched generated demo data */
function isPureDemo(data){
  return data.demo===true&&(data.grads||[]).every(g=>!g||g.deletedAt||g.createdFrom==='seed');
}

/* ================= accessors ================= */
const gradById=id=>D.grads.find(g=>g.id===id);
const gById=gradById;
const sessionById=id=>D.sessions.find(s=>s.id===id);
/* safe name for a session's grad — survives purged/orphaned sessions */
const gNameSafe=s=>{const g=s&&gradById(s.gradId);return g?(g.name||PLACEHOLDER_NAME):'خريج محذوف'}
const invById=id=>D.invitations.find(i=>i.id===id);
const memberName=id=>(D.members.find(m=>m.id===id)||{}).name||id;
const settings=()=>D.settings;
const activeEvent=()=>D.events.find(e=>e.status==='open')||null;
function evStateOf(gid,eid){
  const k=gid+'|'+eid;
  if(!D.states[k]){
    const g=gradById(gid);
    if(!g||g.deletedAt)return null;
    D.states[k]={gradId:gid,eventId:eid,status:'new',last:null,owner:null};
  }
  return D.states[k];
}
function stateOf(gid){const e=activeEvent();return e?evStateOf(gid,e.id):null}
const me=()=>U.activeMemberId||'جود';
const liveGrads=()=>D.grads.filter(g=>!g.deletedAt&&!g.mergedInto);
const confirmedInitial=(gid,eid)=>D.invitations.find(i=>i.gradId===gid&&i.eventId===eid&&i.kind==='initial'&&i.status==='confirmed');
const pendingFor=(gid,eid)=>D.invitations.find(i=>i.gradId===gid&&i.eventId===eid&&i.status==='sending');
function remindersInfo(gid,eid){
  const list=D.invitations.filter(i=>i.gradId===gid&&i.eventId===eid&&i.kind==='reminder'&&i.status==='confirmed');
  const lastAll=D.invitations.filter(i=>i.gradId===gid&&i.eventId===eid&&i.status==='confirmed')
    .sort((a,b)=>String(b.confirmedAt||b.createdAt).localeCompare(String(a.confirmedAt||a.createdAt)))[0];
  return {count:list.length,lastAt:lastAll?lastAll.confirmedAt||lastAll.createdAt:null};
}
function upcomingFor(gid){
  const e=activeEvent();if(!e)return null;
  return D.sessions.find(s=>!s.deletedAt&&s.gradId===gid&&s.eventId===e.id&&diffDays(s.date,today())>=0);
}
function unconfPast(gid){
  const e=activeEvent();if(!e)return null;
  return D.sessions.find(s=>!s.deletedAt&&!s.doneAt&&s.gradId===gid&&s.eventId===e.id&&diffDays(s.date,today())<0);
}
function isStale(g){
  const st=stateOf(g.id);
  return !!(st&&st.status==='wait'&&st.last&&diffDays(today(),st.last)>=3);
}
const needsFollow=g=>isStale(g)||!!unconfPast(g.id);
function incomplete(g){
  if(g.name===PLACEHOLDER_NAME)return true;
  if(!(g.contacts||[]).length)return true;
  return !g.contacts.some(c=>cleanContact(c.type,c.value).ok);
}
const today=()=>U.simDate||riyadhToday();

