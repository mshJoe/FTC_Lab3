/* ================= Scheduler (D1) ================= */
function schedCheck(o){
  /* pure — used by unit tests. errCodes: ['midnight','past_date','past_time'] */
  const res={errors:[],warns:[],errCodes:[]};
  const st=toMin(o.time),en=st+o.dur;
  if(en>24*60){res.errors.push('الجلسة تتعدى منتصف الليل. اختر وقت أبكر أو مدة أقصر.');res.errCodes.push('midnight')}
  if(o.date<o.todayIso){res.errors.push(`تاريخ ${fmtLong(o.date)} فات. اختر تاريخ من اليوم وطالع.`);res.errCodes.push('past_date')}
  else if(o.date===o.todayIso&&st<o.nowMin-10){res.errors.push(`هذا الوقت فات اليوم (الساعة الحالية في الرياض ${fmtTime(o.nowMin)}). اختر وقت لاحق.`);res.errCodes.push('past_time')}
  if(o.date&&o.warnFriday&&parseISO(o.date).getDay()===5)res.warns.push('يوم الجمعة غالباً غير مناسب للجلسات — تأكد إن الخريج موافق على وقت الجمعة.');
  const ws=toMin(o.window[0]),we=toMin(o.window[1]);
  if(o.date&&(st<ws||en>we))res.warns.push(`الوقت خارج المواعيد المعتادة للنادي (${o.window[0]} – ${o.window[1]}). عادي، بس تأكد إنه يناسب اللي بيسمعون الجلسة.`);
  return res;
}
const gInput=$('g-input'),gList=$('g-list');
let gRes=[],gAct=0;
function scheduledAny(gid){return D.sessions.some(s=>!s.deletedAt&&s.gradId===gid&&diffDays(s.date,today())>=0)}
function isBookable(g){
  if(g.doNotContact)return false;
  const st=stateOf(g.id);
  if(!st)return false;
  if(st.status==='booked')return false;
  return st.status!=='no';
}
function prevEventChip(g){
  const p=prevEventHint(g);
  return p?`<span class="twin">${esc(p)}</span>`:'';
}
function openList(){
  const raw=gInput.value.trim();const q=norm(raw);
  let head='';
  if(!q){
    gRes=liveGrads().filter(g=>isBookable(g)&&stateOf(g.id)&&stateOf(g.id).status==='yes'&&!scheduledAny(g.id));
    head=gRes.length?`<li class="g-head">ردّوا ولم تُجدول جلساتهم بعد</li>`:'';
    if(!gRes.length){closeList();return}
  }else{
    gRes=liveGrads().filter(g=>norm(g.name).includes(q)).sort((a,b)=>(a.name.localeCompare(b.name,'ar'))||b.year-a.year);
  }
  gRes=gRes.slice(0,8);gAct=0;
  const cands=gRes.map(g=>g.id);
  const cks=new Set();
  let ctDup=false;
  gRes.forEach(g=>{
    (g.contacts||[]).forEach(c=>{const k=compactKey(c.type,c.value);if(cks.has(k))ctDup=true;cks.add(k)});
  });
  const dupNames=new Set();
  {
    const nm={};gRes.forEach(g=>{const n=norm(g.name);nm[n]=(nm[n]||0)+1;if(nm[n]>1)dupNames.add(n)});
  }
  let prefix=head;
  if(dupNames.size)prefix+=`<li class="g-note">${ic('info')}نفس الاسم — تحقّق من التخصص وسنة التخرج قبل الاختيار.</li>`;
  if(ctDup)prefix+=`<li class="g-note">${ic('info')}فيه خريجين بنفس وسيلة التواصل — قد يكونن نفس الشخص.</li>`;
  paintList(prefix);
}
function paintList(prefix){
  if(prefix===undefined)prefix=gList.dataset.prefix||'';gList.dataset.prefix=prefix;
  gList.innerHTML=prefix+(gRes.length?gRes.map((g,i)=>{
    const raw=gInput.value.trim();
    const nm=highlight(g.name,raw);
    const st=stateOf(g.id);
    return `<li role="option" data-gid="${g.id}" class="${i===gAct?'act':''}" aria-selected="${i===gAct}">
      <div class="g-top"><b>${nm}</b><span class="pill" style="--c:var(--s-${st?st.status:'new'})">${STATUS[st?st.status:'new'].label}</span>${g.doNotContact?'<span class="pill" style="--c:var(--s-no)">مستثنى</span>':''}${scheduledAny(g.id)?'<span class="tag">مجدول</span>':''}${prevEventChip(g)}</div>
      <div class="g-meta">${esc(g.major)} · دفعة <span class="num">${g.year}</span> · ${esc(g.company)}</div></li>`}).join(''):`<li class="g-empty">ما لقينا خريج بهذا الاسم</li>`);
  gList.hidden=false;gInput.setAttribute('aria-expanded','true');
}
function closeList(){gList.hidden=true;gInput.setAttribute('aria-expanded','false')}
gInput.addEventListener('input',openList);
gInput.addEventListener('focus',openList);
gInput.addEventListener('blur',()=>setTimeout(closeList,150));
gInput.addEventListener('keydown',e=>{
  if(gList.hidden)return;
  if(e.key==='ArrowDown'){gAct=Math.min(gAct+1,gRes.length-1);paintList();e.preventDefault()}
  else if(e.key==='ArrowUp'){gAct=Math.max(gAct-1,0);paintList();e.preventDefault()}
  else if(e.key==='Enter'){if(gRes[gAct])pickGrad(gRes[gAct].id);e.preventDefault()}
  else if(e.key==='Escape'){closeList()}
});
gList.addEventListener('mousedown',e=>{const li=e.target.closest('[data-gid]');if(!li)return;e.preventDefault();pickGrad(li.dataset.gid)});
function pickGrad(id){
  const g=gradById(id);
  if(!g)return;
  if(g.doNotContact){toast('هذا الخريج مستثنى من التواصل بناءً على طلبه — ما نقدر نجدول له جلسة.');return}
  sched.gradId=id;closeList();gInput.value='';
  $('combo').hidden=true;$('g-chip').hidden=false;
  $('g-chip').innerHTML=`<span class="av">${esc(g.name.trim()[0])}</span><span class="info"><b>${esc(g.name)}</b><span>${esc(g.major)} · دفعة ${g.year} · ${esc(g.contacts.map(x=>x.type==='phone'?fmtPhone(x.value):x.value).join(' / '))}</span></span><button id="g-clear" aria-label="تغيير الخريج">${ic('x')}</button>`;
  $('g-clear').onclick=clearGrad;
  validate();
  if(!$('s-date').value)$('s-date').focus();
}
function clearGrad(){sched.gradId=null;$('g-chip').hidden=true;$('combo').hidden=false;gInput.focus();validate()}
['s-date','s-time','s-dur'].forEach(id=>$(id).addEventListener('input',()=>{validate();renderStrip()}));
function conflictsOn(date,start,end){return D.sessions.filter(s=>!s.deletedAt&&s.date===date).filter(s=>{const a=toMin(s.start),b=a+s.dur;return start<b&&a<end})}
function nextFree(date,start,dur){
  const win=settings().hoursWindow;
  const ws=toMin(win[0]),we=toMin(win[1]);
  let t=Math.max(start,ws);
  if(t<start)t=start;
  for(let i=0;i<40;i++){
    const c=conflictsOn(date,t,t+dur);
    if(!c.length)return (t+dur<=Math.min(we,24*60))?t:null;
    t=Math.max(...c.map(s=>toMin(s.start)+s.dur));
    if(t+dur>Math.min(we,24*60))return null;
  }
  return null;
}
let V={ok:false};
function validate(){
  const msgs=[];const date=$('s-date').value;const time=$('s-time').value;const dur=+$('s-dur').value;
  const g=sched.gradId?gById(sched.gradId):null;
  let ok=true;
  if(!g){ok=false;msgs.push(['info','info','ابدأ بكتابة اسم الخريج واختره من القائمة.'])}
  else{
    const up=upcomingFor(g.id);
    if(up){ok=false;msgs.push(['error','alert',`فيه جلسة مجدولة مع ${esc(g.name)} يوم ${fmtLong(up.date)} الساعة ${fmtTime(toMin(up.start))}. احذفها من الجدول تحت لو تبي تغيّر الموعد.`])}
    else{
      const st=stateOf(g.id);
      if(g.doNotContact){ok=false;msgs.push(['error','alert','هذا الخريج مستثنى من التواصل بناءً على طلبه.'])}
      else if(st&&st.status!=='yes')msgs.push(['warn','info',`الحالة الحالية لـ ${esc(g.name)} «${STATUS[st.status].label}». بتتحدث تلقائياً إلى «تم تحديد موعد» عند تأكيد الموعد.`]);
      if(unconfPast(g.id))msgs.push(['warn','cal','عنده جلسة سابقة ما تأكدت بعد — أكّدها من قسم الجلسات تحت.']);
    }
  }
  if(!date){ok=false;if(g)msgs.push(['info','cal','حدّد تاريخ الجلسة، أو اضغط على يوم من الشريط تحت.'])}
  if(!time){ok=false;if(date)msgs.push(['info','clock','حدّد وقت البداية.'])}
  if(date&&time){
    const base=schedCheck({date,time,dur,nowMin:nowRiyadhMin(),todayIso:today(),warnFriday:settings().warnFriday,window:settings().hoursWindow});
    if(date<today())ok=false;
    if(date===today()&&toMin(time)<nowRiyadhMin()-10)ok=false;
    if(base.errors.some((x,i)=>base.errCodes[i]==='midnight'))ok=false;
    const st=toMin(time),en=st+dur;
    if(!base.errCodes.includes('midnight')){
      const c=conflictsOn(date,st,en);
      if(c.length){
        ok=false;
        const desc=c.map(s2=>`${esc(gNameSafe(s2))} (${fmtTime(toMin(s2.start))} – ${fmtTime(toMin(s2.start)+s2.dur)})`).join('، ');
        const nf=nextFree(date,st,dur);
        msgs.push(['error','alert',`الموعد يتعارض مع جلسة ${desc}.`,nf!=null?{label:`استخدم أقرب وقت متاح: ${fmtTime(nf)}`,val:nf}:null]);
      }else if(g&&ok&&base.errors.length===0){
        base.warns.forEach(w=>msgs.push(['warn','alert',w]));
        if(base.errors.length===0){
          msgs.push(['ok','check',`الموعد متاح: ${fmtLong(date)} من ${fmtTime(st)} إلى ${fmtTime(en)}${diffDays(date,today())===1?' (بكرة)':''}.`]);
        }
      }else{
        base.errors.forEach(x=>msgs.push(['error','alert',x]));
        base.warns.forEach(w=>msgs.push(['warn','alert',w]));
      }
    }else{
      base.errors.forEach(x=>msgs.push(['error','alert',x]));
    }
  }
  V={ok:ok&&!!g&&!!date&&!!time};
  $('s-submit').disabled=!V.ok;
  $('s-msgs').innerHTML=msgs.map(([k,i,t,a])=>`<div class="msg ${k}">${ic(i)}<span class="t">${t}</span>${a?`<button class="btn sm" data-nf="${a.val}">${a.label}</button>`:''}</div>`).join('');
}
$('s-msgs').addEventListener('click',e=>{const b=e.target.closest('[data-nf]');if(!b)return;const m=+b.dataset.nf;$('s-time').value=`${pad(Math.floor(m/60))}:${pad(m%60)}`;validate();renderStrip()});
$('s-submit').addEventListener('click',()=>{
  validate();if(!V.ok)return;
  const g=gById(sched.gradId);
  const s=Repo.addSession({gradId:g.id,date:$('s-date').value,start:$('s-time').value,dur:+$('s-dur').value,topic:$('s-topic').value.trim()});
  /* R-10: scheduling was refused (do-not-contact) — say so */
  if(!s){if(g.doNotContact)toast('هذا الخريج مستثنى من التواصل بناءً على طلبه — ما نقدر نجدول له جلسة.');return}
  flashId=s.id;
  const bmsg=Tmpl.renderPlain('booking',templateVarsFor(g,s));
  toast(`تمت جدولة جلسة ${(g.name)} · ${fmtLong(s.date)} ${fmtTime(toMin(s.start))}`,{label:'إرسال تأكيد الموعد',fn:()=>openMsgMenu(g,'booking',bmsg.out)});
  $('s-topic').value='';sched.gradId=null;$('g-chip').hidden=true;$('combo').hidden=false;
  renderAll();
});

/* send-only message menu (booking/thanks) — no invitation records */
function openMsgMenu(g,tplKey,msg0,btn){
  closeInvite();
  const chs=channelsFor(g);
  if(!chs.length){toast(`ما فيه وسيلة تواصل صحيحة لـ ${(g.name)}`);return}
  let out;
  if(msg0){out=msg0}
  else if(tplKey==='thanks'){
    const sess=D.sessions.filter(s=>s.gradId===g.id&&!s.deletedAt&&s.doneAt).sort((a,b)=>String(b.doneAt).localeCompare(String(a.doneAt)))[0];
    out=Tmpl.renderPlain('thanks',templateVarsFor(g,sess,'thanks')).out;
  }else{
    const sess=D.sessions.filter(s=>s.gradId===g.id&&!s.deletedAt&&!s.doneAt&&diffDays(s.date,today())>=0)[0];
    out=Tmpl.renderPlain('booking',templateVarsFor(g,sess)).out;
  }
  const m=document.createElement('div');
  m.className='inv-menu';m.setAttribute('role','menu');
  m.innerHTML=chs.map(c=>`<button class="it it-${c.kind}" role="menuitem" data-ch="${c.kind}">${ic(c.icon)}<span>${c.label}<small>${esc(c.sub)}</small></span></button>`).join('');
  document.body.appendChild(m);invMenu=m;
  if(btn){
    const r=btn.getBoundingClientRect(),h=m.offsetHeight;
    m.style.left=Math.max(10,Math.min(r.right-m.offsetWidth,innerWidth-10-m.offsetWidth))+'px';
    m.style.top=(r.bottom+6+h>innerHeight?Math.max(10,r.top-6-h):r.bottom+6)+'px';
  }
  m.addEventListener('click',e=>{
    const it=e.target.closest('[data-ch]');if(!it)return;
    const ch=chs.find(c=>c.kind===it.dataset.ch);closeInvite();
    /* R-28: build only from canonical values — refuse instead of launching */
    const href=channelHref(g,ch,out);
    if(!href){toast('وسيلة التواصل غير صالحة — ما نقدر نفتح التطبيق.');return}
    if(ch.kind==='linkedin')copyText(out,'تم نسخ الرسالة — الصقها في LinkedIn مع الخريج');
    try{window.open(href,'_blank','noopener')}catch(e2){}
  });
  m.querySelector('.it')&&m.querySelector('.it').focus();
}

/* ================= 14-day strip ================= */
function renderStrip(){
  const t=today();const picked=$('s-date').value;
  let h='';
  for(let i=0;i<14;i++){
    const iso=addDays(t,i);const d=parseISO(iso);
    const ss=D.sessions.filter(s=>!s.deletedAt&&gById(s.gradId)&&s.date===iso).sort((a,b)=>toMin(a.start)-toMin(b.start));
    const cls=['day',i===0?'today':'',i===1?'tomorrow':'',iso===picked?'picked':'',d.getDay()===5?'fri':''].join(' ');
    h+=`<button class="${cls}" data-day="${iso}" aria-label="${fmtLong(iso)}${ss.length?` · ${ss.length} جلسة`:''}">
      <span class="wd">${i===0?'اليوم':i===1?'بكرة':WD[d.getDay()]}</span>
      <span class="dn">${d.getDate()}<small>${MO[d.getMonth()]}</small></span>
      ${ss.map(s2=>`<span class="slot" title="${esc(gNameSafe(s2))} ${fmtTime(toMin(s2.start))}">${fmtTime(toMin(s2.start)).replace(':00','')} · ${esc(gNameSafe(s2).split(' ')[0])}</span>`).join('')}
    </button>`;
  }
  $('strip').innerHTML=h;
}
$('strip').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(!b)return;$('s-date').value=b.dataset.day;validate();renderStrip();if(!sched.gradId)gInput.focus();else $('s-time').focus()});

/* ================= Reminders (tomorrow) ================= */
function renderReminders(){
  const tm=addDays(today(),1);
  const list=D.sessions.filter(s=>!s.deletedAt&&gById(s.gradId)&&s.date===tm).sort((a,b)=>toMin(a.start)-toMin(b.start));
  $('reminders').innerHTML=list.map(s=>{const g=gById(s.gradId);return `<div class="reminder" role="alert">
    <span class="bell">${ic('bell')}</span>
    <div class="rt"><b>تذكير: بكرة جلسة مع ${esc(g.name)} الساعة ${fmtTime(toMin(s.start))}</b>
    <div>${s.topic?esc(s.topic)+' · ':''}${fmtLong(s.date)} · المدة ${s.dur} دقيقة${(()=>{const st=stateOf(g.id);return st&&st.owner?` · المسؤول: ${esc(memberName(st.owner))}`:''})()}</div></div>
    ${g.contacts[0]?`<button class="btn sm" data-copy="${esc(g.contacts[0].value)}">${ic('copy')}نسخ ${g.contacts[0].type==='phone'?'الرقم':g.contacts[0].type==='email'?'الإيميل':'حساب LinkedIn'} للتأكيد</button>`:''}
  </div>`}).join('');
}
$('reminders').addEventListener('click',e=>{const b=e.target.closest('[data-copy]');if(b)copyText(b.dataset.copy,'تم النسخ')});

/* ================= Sessions table (upcoming + confirm) ================= */
function renderSessions(){
  const t=today();
  const list=D.sessions.filter(s=>!s.deletedAt&&gById(s.gradId)).sort((a,b)=>{const da=diffDays(a.date,t),db=diffDays(b.date,t);const pa=da<0,pb=db<0;if(pa!==pb)return pa?1:-1;return (pa?-1:1)*(a.date.localeCompare(b.date)||toMin(a.start)-toMin(b.start))});
  const upcoming=list.filter(s=>diffDays(s.date,t)>=0).length;
  $('sess-count').textContent=`${upcoming} قادمة · ${list.length-upcoming} منتهية (الأرشيف تحت)`;
  const up=list.filter(s=>diffDays(s.date,t)>=0);
  if(!up.length){$('sess-host').innerHTML=`<div class="empty-state"><p>ما فيه جلسات مجدولة. أول ما يوافق خريج، سجّل موعده من النموذج فوق.</p></div>`;renderArchive();return}
  $('sess-host').innerHTML=`<div class="tbl-wrap"><table class="sess"><thead><tr>
    <th>الخريج</th><th>عنوان الجلسة</th><th>التاريخ</th><th>الوقت</th><th>المدة</th><th>الموعد</th><th>التواصل</th><th></th></tr></thead>
    <tbody>${up.map(s=>{
      const g=gById(s.gradId);const n=diffDays(s.date,t);const st=toMin(s.start);
      const cls=[n<0?'past':'',n===1?'is-tomorrow':'',s.id===flashId?'flash':''].join(' ');
      const when=n<0?`<span class="when">انتهت</span>`:`<span class="when ${n===1?'tm':n===0?'td':''}">${relFuture(n)}</span>`;
      return `<tr class="${cls}">
        <td><div class="nm"><button class="link" data-drw="${g.id}">${esc(g.name)}</button></div><div class="sub">دفعة <span class="num">${g.year}</span> · ${esc(g.company)}</div></td>
        <td>${s.topic?esc(s.topic):'<span class="sub">بدون عنوان</span>'}</td>
        <td><div>${fmtLong(s.date)}</div><div class="sub num">${s.date}</div></td>
        <td class="num" style="white-space:nowrap">${fmtTime(st)} – ${fmtTime(st+s.dur)}</td>
        <td class="num">${s.dur} د</td>
        <td>${when}</td>
        <td><div class="contacts">${g.contacts.map(contactChip).join('')}</div></td>
        <td>${pendingDel===s.id?`<span class="del-confirm">حذف الجلسة؟ <button class="btn danger sm" data-del-yes="${s.id}">حذف</button><button class="btn sm" data-del-no="1">لا</button></span>`:`<button class="icon-btn" data-del="${s.id}" aria-label="حذف جلسة ${esc(g.name)}" title="حذف">${ic('trash')}</button>`}</td>
      </tr>`}).join('')}</tbody></table></div>`;
  flashId=null;
  renderArchive();
}
$('sess-host').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.drw){openDrawer(b.dataset.drw);return}
  if(b.dataset.copy){copyText(b.dataset.copy,'تم النسخ');return}
  if(b.dataset.del){pendingDel=b.dataset.del;renderSessions();return}
  if(b.dataset.delNo){pendingDel=null;renderSessions();return}
  if(b.dataset.delYes){const s=sessionById(b.dataset.delYes);Repo.removeSession(b.dataset.delYes);pendingDel=null;toast(`تم حذف جلسة ${(gNameSafe(s))} — تنقلت للمهملات لو تبي ترجعها`);renderAll()}
});

/* ================= Archive (D4) ================= */
Repo.editSession=function(sid,f){
  const s=sessionById(sid);if(!s)return;
  const snaps=[snapObj(s)];
  Object.assign(s,f);
  TLwrite(s.gradId,s.eventId,'imported',`حدّثنا تفاصيل جلسة «${s.topic||'بدون عنوان'}»`);
  commitUndo('تعديل جلسة',snaps);
  Store.save();
};
function renderArchive(){
  const host=$('arch-host');
  const q=norm(archF.q.trim());
  const past=D.sessions.filter(s=>!s.deletedAt&&gById(s.gradId)&&(diffDays(s.date,today())<0||s.doneAt))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))||toMin(b.start)-toMin(a.start));
  const rows=past.filter(s=>{
    if(!q)return true;
    const g=gById(s.gradId);
    return norm(s.topic||'').includes(q)||norm(gNameSafe(s)).includes(q)||String(g?g.year:'').includes(q.replace(/\s/g,''));
  });
  $('arch-count').textContent=`${D.sessions.filter(s=>!s.deletedAt&&gById(s.gradId)&&(diffDays(s.date,today())<0||s.doneAt)).length} جلسة منتهية`;
  if(!rows.length){host.innerHTML=`<div class="empty-state"><p>ما فيه جلسات منتهية بعد.</p></div>`;return}
  host.innerHTML=`<div class="tbl-wrap"><table class="arch"><thead><tr>
    <th>الخريج</th><th>عنوان الجلسة</th><th>التاريخ</th><th>المدة</th><th>روابط وملاحظات</th><th>الحالة</th><th></th></tr></thead>
    <tbody>${rows.map(s=>{
      const g=gById(s.gradId);
      /* R-03: only http(s) links become clickable */
      const su=safeUrl(s.slidesUrl),ru=safeUrl(s.recordingUrl);
      const links=[su?`<a class="ct-v" dir="ltr" href="${esc(su)}" target="_blank" rel="noopener noreferrer">${ic('eye')} العرض</a>`:'',
        ru?`<a class="ct-v" dir="ltr" href="${esc(ru)}" target="_blank" rel="noopener noreferrer">${ic('play')} التسجيل</a>`:''].filter(Boolean);
      return `<tr class="${s.doneAt?'':'wait-done'}">
        <td><div class="nm">${esc(g.name)}</div><div class="sub">دفعة <span class="num">${g.year}</span></div></td>
        <td>${s.topic?esc(s.topic):'<span class="sub">بدون عنوان</span>'}</td>
        <td><div>${fmtLong(s.date)}</div><div class="sub num">${s.date}</div></td>
        <td class="num">${s.dur} د</td>
        <td><div class="contacts">${links.filter(Boolean).join('')||''}</div>${s.notes?`<div class="sub">${esc(s.notes)}</div>`:''}</td>
        <td>${s.doneAt?`<span class="when done">تمت</span>`:`<span class="when">ما تمت</span>`}</td>
        <td><button class="icon-btn edit" data-sedit="${s.id}" aria-label="تعديل جلسة" title="تعديل الروابط والملاحظات">${ic('edit')}</button></td>
      </tr>`}).join('')}</tbody></table></div>`;
}
$('arch-q').addEventListener('input',e=>{archF.q=e.target.value;renderArchive()});
$('arch-host').addEventListener('click',e=>{
  const b=e.target.closest('[data-sedit]');if(!b)return;
  const s=sessionById(b.dataset.sedit);if(!s)return;
  const g=gById(s.gradId);
  openModal(`<h3>${ic('edit')} تفاصيل جلسة ${esc(g.name)}</h3>
    <div class="mrow"><span class="sub">${s.topic?esc(s.topic)+' · ':''}${fmtLong(s.date)} · ${fmtTime(toMin(s.start))}</span></div>
    <label class="dfield" style="margin-block:10px">عنوان الجلسة<input id="mse-topic" value="${esc(s.topic||'')}"></label>
    <div class="dgridded" style="margin-block:10px">
      <label class="dfield">رابط العرض<input id="mse-slides" dir="ltr" placeholder="https://…" value="${esc(s.slidesUrl||'')}"></label>
      <label class="dfield">رابط التسجيل<input id="mse-rec" dir="ltr" placeholder="https://…" value="${esc(s.recordingUrl||'')}"></label>
    </div>
    <label class="dfield">ملاحظات<textarea id="mse-notes" rows="3">${esc(s.notes||'')}</textarea></label>
    <div class="mrow" style="justify-content:flex-end;margin-top:14px">
      <button class="btn" data-mclose="1">إلغاء</button>
      <button class="btn primary" data-msave="${s.id}">حفظ</button>
    </div>`);
});
$('modal').addEventListener('click',e=>{
  if(e.target.closest('[data-mclose]')){closeModal();return}
  const b=e.target.closest('[data-msave]');if(!b)return;
  const s=sessionById(b.dataset.msave);
  const u=v=>String(v||'').trim();
  const slides=u($('mse-slides').value),rec=u($('mse-rec').value);
  const bad=[['mse-slides',slides],['mse-rec',rec]].filter(([id,v])=>v&&!/^https?:\/\/\S+\.\S+/.test(v));
  if(bad.length){toast('الرابط ما يبدو رابط صحيح — لازم يبدأ https://');return}
  Repo.editSession(s.id,{topic:u($('mse-topic').value),slidesUrl:slides,recordingUrl:rec,notes:u($('mse-notes').value)});
  closeModal();toast('حفظنا تفاصيل الجلسة');renderAll();
});

