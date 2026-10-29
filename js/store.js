/* ================= Store ================= */
let D=null,savedAt=null;
function loadUIState(){
  try{return Object.assign({activeMemberId:null,simDate:null,tab:'grads'},JSON.parse(localStorage.getItem(UIKEY)||'null')||{})}
  catch(e){return{activeMemberId:null,simDate:null,tab:'grads'}}
}
let U=loadUIState();
function saveUI(){try{localStorage.setItem(UIKEY,JSON.stringify({activeMemberId:U.activeMemberId,simDate:U.simDate,tab:U.tab}))}catch(e){}}
let saveT=null;
function saveNow(){
  savedAt=nowISO();
  try{localStorage.setItem(KEY,JSON.stringify({v:2,savedAt,data:D}));localStorage.setItem(VERKEY,savedAt)}
  catch(e){console.warn('ftc save failed',e)}
}
const Store={
  save(){clearTimeout(saveT);saveT=setTimeout(saveNow,250)},
  syncFromStorage(){
    try{
      const env=JSON.parse(localStorage.getItem(KEY)||'null');
      if(env&&env.v===2&&env.savedAt&&savedAt&&env.savedAt>savedAt){savedAt=env.savedAt;D=env.data;return true}
    }catch(e){}
    return false;
  }
};
function bootStore(){
  let env=null;
  try{env=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){env=null}
  if(!env||!env.data){
    /* quarantine malformed v2 blob */
    if(env&&env.v!==2){try{localStorage.setItem('ftc-grads-v2-backup-'+Date.now(),JSON.stringify(env))}catch(e){}}
    /* migrate legacy or fresh demo seed */
    let old=null;
    try{old=JSON.parse(localStorage.getItem(OLDKEY)||'null')}catch(e){old=null}
    if(old&&Array.isArray(old.grads)){D=migrateLegacy(old);saveNow();return {migrated:true}}
    D=seedData();saveNow();return {seed:true};
  }
  D=env.data;savedAt=env.savedAt;
  /* guards */
  D.settings=Object.assign({},DEFAULT_SETTINGS,D.settings||{});
  ['grads','sessions','invitations','timeline','events','suppressions','importBatches'].forEach(k=>{if(!Array.isArray(D[k]))D[k]=[]});
  if(!D.states)D.states={};
  if(!D.templates)D.templates=freshTemplates();
  if(!D.members)D.members=MEMBERS.map(m=>({id:m,name:m}));
  return {seed:false,migrated:false};
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
function lastInitialAnyEvent(gid){
  return D.invitations.filter(i=>i.gradId===gid&&i.kind==='initial'&&i.status==='confirmed')
    .sort((a,b)=>String(b.confirmedAt||b.createdAt).localeCompare(String(a.confirmedAt||a.createdAt)))[0]||null;
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

