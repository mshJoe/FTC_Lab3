/* ================= Timeline ================= */
function TLwrite(gradId,eventId,kind,text,refId,actorId){
  D.timeline.push({id:uid('t'),gradId,eventId:eventId||null,ts:nowISO(),kind,actorId:actorId||me(),text,refId:refId||null});
}

/* ================= Undo ================= */
const Undo={stack:[]};
function snapArr(arr){const j=JSON.stringify(arr);return{undo(){arr.length=0;JSON.parse(j).forEach(x=>arr.push(x))}}}
function snapObj(o){const j=JSON.stringify(o);return{undo(){const nu=JSON.parse(j);Object.keys(o).forEach(k=>delete o[k]);Object.assign(o,nu)}}}
function snapMap(map){const j=JSON.stringify(map);return{undo(){Object.keys(map).forEach(k=>delete map[k]);Object.assign(map,JSON.parse(j))}}}
function pushUndo(label,fn){
  Undo.stack.push({label,fn,ts:Date.now()});
  while(Undo.stack.length>(D.settings.undoDepth||20))Undo.stack.shift();
}
function commitUndo(label,snaps){
  pushUndo(label,()=>{
    [...snaps].reverse().forEach(s=>s.undo&&s.undo());
    saveNow();renderAll();toast('تم التراجع: '+label);
  });
}

/* ================= Repo — all mutations live here ================= */
const Repo={};
/* F1: central state mutation (booked/done derived — set by scheduler/session flow only) */
Repo.setState=function(gid,s,opts={}){
  const g=gradById(gid);if(!g)return;
  const e=activeEvent();if(!e)return;
  if((s==='booked'||s==='done')&&!opts.force)return;
  const st=evStateOf(gid,e.id);if(!st)return;
  const snaps=[snapObj(st)];
  if(st.status===s)return;
  const prev=st.status;
  st.status=s;
  if(s==='new'){
    st.last=null;
    D.invitations.filter(i=>i.gradId===gid&&i.eventId===e.id&&i.status==='sending').forEach(i=>{
      i.status='cancelled';
      TLwrite(gid,e.id,'invitation_cancelled','أُلغي إرسال الدعوة (الحالة رجعت «لم يُتواصل بعد»)',i.id,i.senderId);
    });
  }else if(s!=='sending'){
    st.last=today();
    if(!st.owner&&opts.autofillOwner!==false){
      st.owner=me();
      TLwrite(gid,e.id,'owner_assigned',`أسندنا (${memberName(me())}) مسؤول التواصل تلقائياً`);
      if(!opts.quiet)setTimeout(()=>toast(`أسندناها لك (${memberName(me())}) — تغيّرها من القائمة لو تبي`),450);
    }
  }
  if(prev!==s)TLwrite(gid,e.id,'status_changed',`صارت الحالة «${STATUS[s].label}»`);
  if(!opts.quiet)toast(`حالة ${esc(g.name)} صارت «${STATUS[s].label}»`);
  commitUndo('حالة '+g.name,snaps);
  Store.save();
};

/* == invitations (A1-A3) == */
Repo.invite=function(gid,kind,channel){
  Store.syncFromStorage();
  const g=gradById(gid),e=activeEvent();
  if(!g||!e)return{ok:false,reason:'noevent'};
  if(g.doNotContact)return{ok:false,reason:'dnc'};
  if(kind==='initial'&&confirmedInitial(gid,e.id))return{ok:false,reason:'exists'};
  if(kind==='initial'&&pendingFor(gid,e.id))return{ok:false,reason:'pending'};
  if(kind==='reminder'){
    const info=remindersInfo(gid,e.id);
    const st=stateOf(gid);
    if(info.count>=settings().reminderMax&&st&&st.status==='wait')return{ok:false,reason:'limit'};
    if(info.lastAt){
      const days=diffDays(today(),dayOfISO(info.lastAt));
      if(days<settings().reminderCooldownDays)return{ok:false,reason:'cooldown',days};
    }
  }
  const st=stateOf(gid);
  const inv={id:uid('i'),gradId:gid,eventId:e.id,kind,channel,senderId:me(),createdAt:nowISO(),confirmedAt:null,status:'sending',
    prevState:kind==='initial'&&st?st.status:null};
  const snaps=[snapArr(D.invitations)];
  D.invitations.push(inv);
  if(kind==='initial'&&st)st.status='sending';
  TLwrite(gid,e.id,kind==='reminder'?'reminder_sent':'invitation_sending',
    kind==='initial'?`الدعوة بانتظار تأكيد الإرسال — عبر ${CHANNEL_AR[channel]}`:`التذكير بانتظار تأكيد الإرسال — عبر ${CHANNEL_AR[channel]} (التذكير رقم ${remindersInfo(gid,e.id).count||1})`,
    inv.id);
  commitUndo(kind==='initial'?'دعوة '+g.name:'تذكير '+g.name,snaps);
  Store.save();
  return{ok:true,inv};
};
Repo.inviteConfirm=function(invid){
  const inv=invById(invid);if(!inv||inv.status!=='sending')return;
  const g=gradById(inv.gradId);
  const snaps=[snapObj(inv)];
  const st=D.states[inv.gradId+'|'+inv.eventId];
  if(st)snaps.push(snapObj(st));
  inv.status='confirmed';inv.confirmedAt=nowISO();
  if(g&&st&&inv.kind==='initial'){
    st.status='wait';st.last=today();
    if(!st.owner){st.owner=me();TLwrite(inv.gradId,inv.eventId,'owner_assigned',`أسندنا (${memberName(me())}) مسؤول التواصل تلقائياً`)}
  }
  TLwrite(inv.gradId,inv.eventId,'invitation_sent',
    `${memberName(inv.senderId)} أكدت إرسال ${inv.kind==='reminder'?'التذكير':'الدعوة الأولية'} على ${CHANNEL_AR[inv.channel]}`,inv.id,inv.senderId);
  if(g)toast(`تم إرسال الدعوة لـ ${esc(g.name)} عبر ${CHANNEL_AR[inv.channel]}`);
  commitUndo('تأكيد الإرسال',snaps);
  Store.save();
};
Repo.inviteCancel=function(invid,auto){
  const inv=invById(invid);if(!inv||inv.status!=='sending')return;
  const g=gradById(inv.gradId);
  const snaps=[snapObj(inv)];
  const st=D.states[inv.gradId+'|'+inv.eventId];
  if(st&&inv.kind==='initial')snaps.push(snapObj(st));
  inv.status='cancelled';
  if(inv.kind==='initial'&&st)st.status=inv.prevState||'new';
  TLwrite(inv.gradId,inv.eventId,'invitation_cancelled',
    auto?'تم إلغاء التأكيد تلقائياً (ما وصل تأكيد خلال ٢٤ ساعة)':'أُلغي إرسال الدعوة',inv.id,inv.senderId);
  commitUndo('إلغاء الإرسال',snaps);
  Store.save();
};
/* sweep on load/focus: auto-cancel unconfirmed sends older than 24h (real clock) */
function sweepPending(){
  const now=Date.now(),hours=settings().pendingTimeoutHours;
  let changed=false;
  D.invitations.filter(i=>i.status==='sending'&&(now-new Date(i.createdAt).getTime())>hours*3600e3).forEach(i=>{
    i.status='cancelled';
    const st=D.states[i.gradId+'|'+i.eventId];
    if(st&&i.kind==='initial'&&st.status==='sending')st.status=i.prevState||'new';
    D.timeline.push({id:uid('t'),gradId:i.gradId,eventId:i.eventId,ts:nowISO(),kind:'auto_reverted',actorId:null,
      text:'تم إلغاء التأكيد تلقائياً (ما وصل تأكيد خلال ٢٤ ساعة)',refId:i.id});
    changed=true;
  });
  return changed;
}

/* == events (A4) == */
Repo.openEvent=function(name){
  if(activeEvent())return null;
  const ev={id:uid('e'),name,startedAt:riyadhToday(),closedAt:null,status:'open'};
  const snaps=[snapArr(D.events)];
  D.events.push(ev);
  liveGrads().forEach(g=>{if(!g.doNotContact)evStateOf(g.id,ev.id)});
  TLwrite(null,ev.id,'migration',`بدأت فعالية «${name}» — الحالات الجديدة انفصلت عن الفعاليات السابقة`);
  commitUndo('بدء فعالية',snaps);
  Store.save();
  return ev;
};
Repo.closeEvent=function(){
  const e=activeEvent();if(!e)return;
  const snaps=[snapObj(e)];
  e.closedAt=riyadhToday();e.status='closed';
  TLwrite(null,e.id,'migration',`أقفلت فعالية «${e.name}» — كل الحالات والتواريخ والتسجيلات محفوظة`);
  commitUndo('إغلاق فعالية',snaps);
  Store.save();
};

/* == sessions (D2/D3) == */
Repo.addSession=function(f){
  const g=gradById(f.gradId),e=activeEvent();
  if(!g||!e)return null;
  const s={id:uid('s'),gradId:g.id,eventId:e.id,date:f.date,start:f.start,dur:f.dur,topic:f.topic||'',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:null};
  const snaps=[snapArr(D.sessions)];
  D.sessions.push(s);
  const st=evStateOf(g.id,e.id);
  if(st){
    snaps.push(snapObj(st));
    if(st.status!=='no')st.status='booked';
    st.last=today();
    if(!st.owner){st.owner=me();TLwrite(g.id,e.id,'owner_assigned',`أسندنا (${memberName(me())}) مسؤول التواصل تلقائياً`)}
  }
  TLwrite(g.id,e.id,'session_scheduled',`جلسة «${s.topic||'بدون عنوان'}» يوم ${fmtLong(s.date)} — ${fmtTime(toMin(s.start))}`,s.id);
  commitUndo('جدولة جلسة',snaps);
  Store.save();
  return s;
};
Repo.removeSession=function(sid){
  const s=sessionById(sid);if(!s)return;
  const g=gradById(s.gradId);
  const snaps=[snapObj(s)];
  const st=D.states[s.gradId+'|'+s.eventId];
  if(g)snaps.push(snapObj(g));
  if(st)snaps.push(snapObj(st));
  s.deletedAt=nowISO();
  /* D3 item 3: only flip booked→yes; never touch manual states */
  if(st&&st.status==='booked'&&!upcomingFor(s.gradId))st.status='yes';
  TLwrite(s.gradId,s.eventId,'session_cancelled',`حذفت جلسة «${s.topic||'بدون عنوان'}» يوم ${fmtLong(s.date)}`,s.id);
  commitUndo('حذف جلسة',snaps);
  Store.save();
};
Repo.restoreSession=function(sid){
  const s=sessionById(sid);if(!s)return;
  const snaps=[snapObj(s)];
  s.deletedAt=null;
  TLwrite(s.gradId,s.eventId,'restored',`استرجعت جلسة «${s.topic||'بدون عنوان'}» من المهملات`,s.id);
  commitUndo('استرجاع جلسة',snaps);
  Store.save();
};
Repo.purgeSessionSilent=function(sid){
  D.sessions=D.sessions.filter(x=>x.id!==sid);
  D.timeline=D.timeline.filter(t=>t.refId!==sid);
};
Repo.purgeSession=function(sid){
  const s=sessionById(sid);if(!s)return;
  const snaps=[snapArr(D.sessions),snapArr(D.timeline)];
  Repo.purgeSessionSilent(sid);
  commitUndo('حذف نهائي لجلسة',snaps);
  Store.save();
};
Repo.doneSession=function(sid){
  const s=sessionById(sid);if(!s)return;
  const snaps=[snapObj(s)];
  const st=D.states[s.gradId+'|'+s.eventId];
  if(st)snaps.push(snapObj(st));
  s.doneAt=riyadhToday();
  if(st&&st.status!=='no')st.status='done';
  TLwrite(s.gradId,s.eventId,'session_done',`اكتملت جلسة «${s.topic||'بدون عنوان'}»`,s.id);
  commitUndo('تأكيد تمت الجلسة',snaps);
  Store.save();
};
Repo.reschedSession=function(sid){
  const s=sessionById(sid);if(!s)return;
  const snaps=[snapObj(s)];
  const st=D.states[s.gradId+'|'+s.eventId];
  if(st)snaps.push(snapObj(st));
  s.deletedAt=nowISO();
  if(st&&st.status!=='no')st.status='yes';
  TLwrite(s.gradId,s.eventId,'session_cancelled','أُعيد فتح الباب للجدولة بعد ما الجلسة ما تمت',s.id);
  commitUndo('إعادة جدولة',snaps);
  Store.save();
};

/* == graduates == */
Repo.addGrad=function(f,source){
  const g={id:uid('g'),name:f.name||PLACEHOLDER_NAME,year:+f.year||2024,major:f.major||'',company:f.company||'',
    role:f.role||'',contacts:f.contacts||[],doNotContact:false,createdFrom:source||'manual',createdAt:nowISO(),deletedAt:null,mergedInto:null};
  const e=activeEvent();
  const snaps=[snapArr(D.grads)];
  D.grads.push(g);
  if(e&&!g.doNotContact)evStateOf(g.id,e.id);
  TLwrite(g.id,e?e.id:null,'imported',`أُضيف الخريج ${g.name} (${source==='manual'?'إضافة يدوية':'إضافة جديدة'})`);
  commitUndo('إضافة خريج',snaps);
  Store.save();
  return g;
};
Repo.updateGrad=function(gid,f){
  const g=gradById(gid);if(!g)return;
  const snaps=[snapObj(g)];
  Object.assign(g,f);
  TLwrite(gid,null,'imported',`عدّلنا بيانات الخريج ${g.name}`);
  commitUndo('تعديل بيانات',snaps);
  Store.save();
};
Repo.setOwner=function(gid,owner){
  const g=gradById(gid);if(!g)return;
  const e=activeEvent();const st=e?evStateOf(gid,e.id):null;if(!st)return;
  const snaps=[snapObj(st)];
  st.owner=owner||null;
  TLwrite(gid,e?e.id:null,'owner_assigned',owner?`صار ${memberName(owner)} مسؤول التواصل`:'تمت إزالة المسؤول');
  commitUndo('إسناد مسؤول',snaps);
  Store.save();
};

/* == trash (E1/A5) == */
Repo.trashGrad=function(gid,reason){
  const g=gradById(gid);if(!g)return;
  const snaps=[snapObj(g)];
  g.deletedAt=nowISO();
  TLwrite(gid,null,'do_not_contact',reason==='do_not_contact'?'حذف بناءً على طلب الخريج':'نُقل إلى المهملات');
  commitUndo('نقل للمهملات',snaps);
  Store.save();
};
Repo.restoreGrad=function(gid){
  const g=gradById(gid);if(!g)return;
  const snaps=[snapObj(g)];
  g.deletedAt=null;
  TLwrite(gid,null,'restored',`استُرجع ${g.name} من المهملات`);
  commitUndo('استرجاع خريج',snaps);
  Store.save();
};
Repo.purgeGradSilent=function(gid){
  D.grads=D.grads.filter(x=>x.id!==gid);
  D.timeline=D.timeline.filter(t=>t.gradId!==gid);
  Object.keys(D.states).forEach(k=>{if(k.split('|')[0]===gid)delete D.states[k]});
  D.sessions=D.sessions.filter(s=>s.gradId!==gid);
  D.invitations=D.invitations.filter(i=>i.gradId!==gid);
  D.suppressions=D.suppressions.filter(s=>s.gradId!==gid);
};
Repo.purgeGrad=function(gid){
  const g=gradById(gid);if(!g)return;
  const snaps=[snapArr(D.grads),snapArr(D.timeline),snapMap(D.states)];
  const name=g.name;
  Repo.purgeGradSilent(gid);
  commitUndo('حذف نهائي',snaps);
  Store.save();
  return name;
};
function trashSweep(){
  const cut=addDays(riyadhToday(),-settings().trashRetentionDays);
  const expiredG=D.grads.filter(g=>g.deletedAt&&dayOfISO(g.deletedAt)<cut).map(g=>g.id);
  const expiredS=D.sessions.filter(s=>s.deletedAt&&dayOfISO(s.deletedAt)<cut).map(s=>s.id);
  expiredG.forEach(Repo.purgeGradSilent);
  expiredS.forEach(Repo.purgeSessionSilent);
  return expiredG.length+expiredS.length;
}
function retentionLevel(deletedAt,now){
  if(!deletedAt)return 'keep';
  const days=diffDays(now,dayOfISO(deletedAt));
  if(days>=settings().trashRetentionDays)return 'purge';
  if(days>=settings().trashRetentionDays-5)return 'warn';
  return 'keep';
}

/* == do-not-contact (A5) == */
function fnv1a(str){
  let h=0x811c9dc5;
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}
  return ('00000000'+h.toString(16)).slice(-8)+('00000000'+(Math.imul(h,0x85ebca6b)>>>0).toString(16)).slice(-8);
}
async function hashKey(type,value){
  const s=type+'|'+value;
  try{
    if(crypto&&crypto.subtle&&typeof crypto.subtle.digest==='function'){
      const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
  }catch(e){}
  return 'fnv:'+fnv1a(s);
}
async function setFlag(gid,reason,elapsedToast){
  const g=gradById(gid);if(!g)return;
  const e=activeEvent();
  const snaps=[snapObj(g),snapArr(D.suppressions)];
  g.doNotContact=true;g.dncReason=reason;g.dncBy=me();g.dncAt=nowISO();
  const keys=[];
  for(const c of (g.contacts||[]))keys.push({type:c.type,hash:await hashKey(c.type,c.value)});
  D.suppressions.push({id:uid('sc'),ts:nowISO(),reason,keys,gradId:gid});
  if(e)D.invitations.filter(i=>i.gradId===gid&&i.eventId===e.id&&i.status==='sending').forEach(i=>Repo.inviteCancel(i.id,false));
  TLwrite(gid,e?e.id:null,'do_not_contact',`لا تتواصل: ${reason}`);
  commitUndo('تعليم «لا تتواصل»',snaps);
  Store.save();
}
async function toggleFlagBack(gid,resume){
  const g=gradById(gid);if(!g)return;
  const snaps=[snapObj(g),snapArr(D.suppressions)];
  g.doNotContact=!resume;
  if(resume){D.suppressions=D.suppressions.filter(s=>s.gradId!==gid);g.dncReason=null;g.dncBy=null;g.dncAt=null}
  TLwrite(gid,null,'do_not_contact',resume?'أعدنا فتح باب التواصل بناءً على اختيار العضو':'لا تتواصل (تكرار)');
  commitUndo('تغيير حالة التواصل',snaps);
  Store.save();
}

/* == merge (B3) == */
Repo.addContacts=function(gid,contacts){
  const g=gradById(gid);if(!g||!(contacts||[]).length)return 0;
  const keys=new Set((g.contacts||[]).map(c=>compactKey(c.type,c.value)));
  const adds=contacts.filter(c=>c&&c.type&&c.value&&!keys.has(compactKey(c.type,c.value)));
  if(!adds.length)return 0;
  const snaps=[snapObj(g)];
  adds.forEach(c=>g.contacts.push(c));
  touchVerified(gid);
  TLwrite(gid,null,'contact',`أضفنا ${adds.length===1?'وسيلة تواصل':'وسيلتي تواصل'} من الإضافة السريعة`);
  commitUndo('إضافة وسيلة تواصل',snaps);
  Store.save();
  return adds.length;
};
/* == merge (B3) ==
   srcIds may be one id or an array; fillFields entries are
   'field' (back-compat: fill-if-empty) or {k,from} (user pick: value overrides). */
Repo.merge=function(srcIds,dstId,fillFields,extraContacts){
  const dst=gradById(dstId);if(!dst)return;
  const list=(Array.isArray(srcIds)?srcIds:[srcIds]).map(gradById).filter(Boolean).filter(x=>x.id!==dstId);
  const fills=(fillFields||[]).filter(f=>{
    const k=typeof f==='string'?f:f.k;
    const from=(f&&f.from)?gradById(f.from):list[0];
    if(!from)return false;
    const v=from[k];
    if(!v||v===PLACEHOLDER_NAME||dst[k]===v)return false;
    if(!dst[k])return true;             /* dst empty — always fill */
    return typeof f==='object'&&f.from; /* user explicitly picked this value */
  });
  const dkeys=new Set((dst.contacts||[]).map(c=>compactKey(c.type,c.value)));
  const ext=(extraContacts||[]).filter(c=>c&&c.type&&c.value&&!dkeys.has(compactKey(c.type,c.value)));
  if(!list.length&&!fills.length&&!ext.length)return;
  const snaps=[...list.map(snapObj),snapObj(dst),snapArr(D.sessions)];
  fills.forEach(f=>{
    const k=typeof f==='string'?f:f.k;
    const from=(f&&f.from)?gradById(f.from):list[0];
    dst[k]=from[k];
  });
  ext.forEach(c=>dst.contacts.push(c));
  list.forEach(src=>{
    src.mergedInto=dstId;src.deletedAt=null;
    D.sessions.filter(s=>s.gradId===src.id).forEach(s=>s.gradId=dstId);
    TLwrite(src.id,null,'merged',`أصبحت بيانات هذا الخريج مدموجة مع «${dst.name}»`);
  });
  if(list.length)TLwrite(dstId,null,'merged',`دمجنا بيانات ${list.length>1?list.length+' سجلات':'«'+list[0].name+'»'} مع «${dst.name}»`);
  touchVerified(dstId);
  commitUndo('دمج خريجين',snaps);
  Store.save();
};

/* == import batches (B5) == */
Repo.batchUndo=function(batchId){
  const b=D.importBatches.find(x=>x.id===batchId);
  if(!b||!b.snapshot)return false;
  b.snapshot.addedIds.forEach(gid=>{
    D.grads=D.grads.filter(x=>x.id!==gid);
    D.timeline=D.timeline.filter(t=>t.gradId!==gid);
    Object.keys(D.states).forEach(k=>{if(k.split('|')[0]===gid)delete D.states[k]});
  });
  if(typeof b.snapshot.tlLen==='number')D.timeline=D.timeline.slice(0,b.snapshot.tlLen);
  Object.entries(b.snapshot.prev).forEach(([gid,prev])=>{
    const g=gradById(gid);
    if(prev&&g){Object.keys(g).forEach(k=>delete g[k]);Object.assign(g,prev)}
  });
  b.snapshot=null;
  saveNow();
  return true;
};

function batchGC(){
  D.importBatches.forEach(b=>{if(b.snapshot&&b.purgeAt&&Date.now()>b.purgeAt)b.snapshot=null});
}

