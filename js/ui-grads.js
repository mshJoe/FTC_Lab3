/* ================= Toolbar & filters ================= */
function initToolbar(){
  const years=[...new Set(liveGrads().map(g=>g.year))].sort((a,b)=>b-a);
  const myEl=$('f-year');
  myEl.innerHTML=`<option value="">كل الدفعات</option>`+years.map(y=>`<option value="${y}">دفعة ${y}</option>`).join('');
  myEl.value=F.year;
  const meOpts=D.members.filter(m=>m.id!==me()).map(m=>`<option value="${esc(m.id)}"${F.owner===m.id?' selected':''}>${esc(m.name)}</option>`).join('');
  $('f-owner').innerHTML=`<option value="">كل المسؤولين</option><option value="__me">المسندين لي (${esc(me())})</option><option value="__none">بدون مسؤول</option>`+meOpts;
}
$('q').addEventListener('input',e=>{F.q=e.target.value;renderList();renderFilters()});
$('f-year').addEventListener('change',e=>{F.year=e.target.value;renderList();renderFilters()});
$('f-ct').addEventListener('change',e=>{F.ct=e.target.value;renderList();renderFilters()});
$('f-owner').addEventListener('change',e=>{F.owner=e.target.value;renderList();renderFilters()});

const anyFilter=()=>F.q||F.statuses.size||F.year||F.ct||F.owner||F.follow||F.miss;
function renderFilters(){
  const c=statusCounts();
  const staleN=liveGrads().filter(needsFollow).length;
  const missN=liveGrads().filter(incomplete).length;
  const vis=visible().length;
  $('filter-row').innerHTML=`<span class="sub">الحالة:</span>`+
    ORDER.map(s=>`<button class="fchip ${F.statuses.has(s)?'on':''}" data-f="${s}" style="--c:var(--s-${s})"><i class="dot"></i>${STATUS[s].label}<span class="n">${c[s]}</span></button>`).join('')+
    `<button class="fchip stale ${F.follow?'on':''}" data-f="__follow">${ic('alert')}يحتاج متابعة<span class="n">${staleN}</span></button>`+
    `<button class="fchip miss ${F.miss?'on':''}" data-f="__miss">${ic('info')}ناقصة البيانات<span class="n">${missN}</span></button>`+
    `<span class="result-count"><span class="num">يعرض ${vis} من ${liveGrads().length}</span>${anyFilter()?'<button class="link" id="clear-f">مسح الفلاتر</button>':''}</span>`;
}
$('filter-row').addEventListener('click',e=>{
  if(e.target.closest('#clear-f')){clearFilters();return}
  const b=e.target.closest('[data-f]');if(!b)return;const s=b.dataset.f;
  if(s==='__follow')F.follow=!F.follow;
  else if(s==='__miss')F.miss=!F.miss;
  else F.statuses.has(s)?F.statuses.delete(s):F.statuses.add(s);
  renderStats();renderFilters();renderList();
});
function clearFilters(){F.q='';F.statuses.clear();F.year='';F.ct='';F.owner='';F.follow=false;F.miss=false;$('q').value='';initToolbar();renderStats();renderFilters();renderList()}

function visible(){
  const q=norm(F.q.trim());
  let r=liveGrads().filter(g=>{
    const st=stateOf(g.id);
    const status=st?st.status:'new';
    if(F.statuses.size&&!F.statuses.has(status))return false;
    if(F.year&&String(g.year)!==F.year)return false;
    if(F.ct&&!g.contacts.some(c=>c.type===F.ct&&cleanContact(c.type,c.value).ok))return false;
    if(F.owner==='__me'){if(!st||st.owner!==me())return false}
    else if(F.owner==='__none'){if(st&&st.owner)return false}
    else if(F.owner&&!F.owner.startsWith('__')&&(!st||st.owner!==F.owner))return false;
    if(F.follow&&!needsFollow(g))return false;
    if(F.miss&&!incomplete(g))return false;
    if(q&&!(norm(g.name).includes(q)||norm(g.company).includes(q)||norm(g.major).includes(q)||g.contacts.some(cc=>norm(cc.value).includes(q.replace(/\s/g,'')))))return false;
    return true;
  });
  const {key,dir}=F.sort;
  r.sort((a,b)=>{
    let v=0;
    if(key==='name')v=a.name.localeCompare(b.name,'ar')||a.year-b.year;
    else if(key==='year')v=a.year-b.year||a.name.localeCompare(b.name,'ar');
    else if(key==='status'){const sa=stateOf(a.id),sb=stateOf(b.id);v=ORDER.indexOf(sa?sa.status:'new')-ORDER.indexOf(sb?sb.status:'new')}
    else if(key==='last'){const la=stateOf(a.id),lb=stateOf(b.id);const x=la&&la.last?parseISO(la.last).getTime():0,y=lb&&lb.last?parseISO(lb.last).getTime():0;v=x-y}
    return v*dir;
  });
  return r;
}

/* ================= Graduates list ================= */
function hl(name,q){return highlight(name,q||F.q)}
function contactChip(c){
  const icon=c.type==='email'?'mail':c.type==='phone'?'phone':'linkedin';
  const cl=cleanContact(c.type,c.value);
  const isValid=cl&&cl.ok;
  const shown=c.type==='phone'?fmtPhone(c.value):c.type==='linkedin'?'in/'+liHandle(c.value):c.value;
  const label=c.type==='email'?'نسخ الإيميل':c.type==='phone'?'نسخ الرقم':'نسخ حساب LinkedIn';
  const copyVal=c.type==='linkedin'?`https://www.linkedin.com/in/${liHandle(c.value)}/`:c.value;
  const hrefVal=safeUrl(copyVal);/* R-03: only http(s) becomes an href */
  const lk=c.type==='linkedin'&&isValid&&hrefVal;
  return `<span class="ct ct-${c.type}" ${isValid?'':'title="وسيلة تواصل مش صالحة — وصلتها «بيانات ناقصة»"'}>
    ${ic(icon)}${lk?`<a class="ct-v" dir="ltr" href="${esc(hrefVal)}" target="_blank" rel="noopener noreferrer" title="فتح حساب LinkedIn">${esc(shown)}</a>`:`<span class="ct-v" dir="ltr">${esc(shown)}</span>`}
    <button class="copy" data-copy="${esc(copyVal)}" aria-label="${label}" title="${label}">${ic('copy')}</button></span>`;
}
function sortTh(key,label){
  const act=F.sort.key===key;const ar=act?(F.sort.dir===1?'↑':'↓'):'↕';
  return `<button class="sort ${act?'act':''}" data-sort="${key}">${label}<span class="ar">${ar}</span></button>`;
}
function dupInfo(rows){
  /* build key→[gids] and normalized-name groups */
  const kmap={},nmap={};
  rows.forEach(g=>{
    (g.contacts||[]).forEach(c=>{const k=compactKey(c.type,c.value);(kmap[k]=kmap[k]||[]).push(g.id)});
    const n=norm(g.name);(nmap[n]=nmap[n]||[]).push(g.id);
  });
  return {
    sameContact:g=>{const hit=(g.contacts||[]).find(c=>kmap[compactKey(c.type,c.value)]&&kmap[compactKey(c.type,c.value)].length>1);return !!hit},
    sameName:g=>{const ids=nmap[norm(g.name)];return ids&&ids.length>1&&!((g.contacts||[]).some(c=>kmap[compactKey(c.type,c.value)]&&kmap[compactKey(c.type,c.value)].length>1))},
    contactPeers:g=>{const ids=new Set();(g.contacts||[]).forEach(c=>{const arr=kmap[compactKey(c.type,c.value)];if(arr)arr.forEach(x=>x!==g.id&&ids.add(x))});return [...ids]},
    namePeers:g=>{const ids=nmap[norm(g.name)]||[];return ids.filter(x=>x!==g.id)}
  };
}
function statusCell(g){
  const st=stateOf(g.id);const s=st?st.status:'new';
  if(st&&(s==='booked'||s==='done'||s==='sending')){
    return `<div class="selpills"><span class="pill" style="--c:var(--s-${s})">${STATUS[s].label}</span><span class="sub" style="font-size:10.5px">حالة آلية</span></div>`;
  }
  return `<select class="status-sel" data-status="${g.id}" style="--c:var(--s-${s})" aria-label="حالة ${esc(g.name)}">
    <option value="" hidden disabled>—</option>
    ${MANUAL_STATUSES.map(x=>`<option value="${x}" ${s===x?'selected':''}>${STATUS[x].label}</option>`).join('')}</select>`;
}
function inviteCellHTML(g){
  const e=activeEvent();
  if(!e)return '<span class="sub">بدون فعالية</span>';
  if(g.doNotContact)return `<span class="pill" style="--c:var(--s-no)" title="مستثنى بناءً على طلبه">${ic('lock')}لا تتواصل</span>`;
  const pend=pendingFor(g.id,e.id);
  if(pend)return `<span class="cfcard"><span class="cfcard-disp">${ic('send')}بانتظار تأكيدك</span>
    <button class="btn sm" data-cf="${pend.id}">صارت إرسال فعلًا؟</button></span>`;
  const initE=confirmedInitial(g.id,e.id);
  const st=stateOf(g.id);
  if(!initE)return `<button class="invite" data-invite="${g.id}" title="يفتح واتساب أو Gmail أو LinkedIn والدعوة جاهزة">${ic('send')}إرسال الدعوة</button>`;
  const info=remindersInfo(g.id,e.id);
  const senderName=memberName(initE.senderId);
  const lastDays=initE.confirmedAt?diffDays(today(),dayOfISO(initE.confirmedAt)):null;
  const tip=lastDays!=null?`أرسلها ${esc(senderName)} ${relFuture(-lastDays)}`:'';
  if(st&&(st.status==='done'||st.status==='no')){
    if(st.status==='done')return `<button class="invite" data-thanks="${g.id}" title="نسخ رسالة الشكر وفتح القناة">${ic('bell')}إرسال الشكر</button>`;
    return `<span class="sub">اعتذر من المشاركة</span>`;
  }
  if(st&&st.status!=='wait'){
    /* R-11: reminders belong only to «بانتظار الرد» */
    return `<button class="invite ghost" disabled title="التذكير متاح فقط لمن ينتظر الرد">${ic('clock')}التذكير متاح لمن ينتظر الرد</button>`;
  }
  if(info.count>=settings().reminderMax){
    return `<button class="invite ghost" disabled title="وصلنا الحد (${settings().reminderMax} تذكيرات). الحين الخطوة يدوية: تابع الرد أو سجّل النتيجة.">${ic('check')}وصلنا الحد</button>`;
  }
  if(info.lastAt&&diffDays(today(),dayOfISO(info.lastAt))<settings().reminderCooldownDays){
    return `<button class="invite ghost" disabled title="فترة التهدئة: ${settings().reminderCooldownDays} أيام بين التذكيرات — آخر رسالة ${relFuture(-diffDays(today(),dayOfISO(info.lastAt)))}">${ic('clock')}فترة التهدئة</button>`;
  }
  return `<button class="invite ghost" data-invite="${g.id}" title="تذكير · ${tip}">${ic('send')}إرسال تذكير</button>`;
}
function lastCell(g){
  const st=stateOf(g.id);
  const d=st&&st.last?diffDays(today(),st.last):null;
  const lastTxt=st&&st.last?(d>=0?relFuture(-d):st.last):'—';
  const un=unconfPast(g.id);
  return `<div class="last"><span class="num" title="${st&&st.last?esc(st.last):''}">${lastTxt}</span>${isStale(g)?`<span class="stale-tag">${ic('clock')}معلّق ${daysWord(d)}</span>`:''}${un?`<span class="stale-tag">${ic('cal')}بانتظار تأكيد الجلسة</span>`:''}</div>`;
}
function nameCell(g,di,q){
  const sess=upcomingFor(g.id);
  return `${hl(g.name,q)
    }${di.sameName(g)?`<span class="twin" title="نفس الاسم بدون تطابق تواصل — تحقّق قبل الإضافة">نفس الاسم — تحقّق</span>`
    :''}${di.sameContact(g)?`<button class="samect" data-samk="${g.id}" title="يوجد خريج بنفس وسيلة التواصل — افتح الدمج">نفس وسيلة التواصل</button>`
    :''}${incomplete(g)?`<span class="miss-tag" title="ما فيه وسيلة تواصل صالحة">${ic('info')}بيانات ناقصة</span>`
    :''}${(()=>{const pe=prevEventHint(g);return pe?`<span class="twin" title="تنبيه فقط — ما يمنع الإرسال">${ic('info')}${esc(pe)}</span>`:''})()
    }${DEMO_MODE&&g.demoNote?`<span class="demo-note-tag" title="ملاحظة من بيانات العرض التجريبي">${esc(g.demoNote)}</span>`:''}
    ${sess?`<span class="pill" style="--c:var(--accent-2)" title="جلسة ${fmtLong(sess.date)}">${ic('cal')}${relFuture(diffDays(sess.date,today()))}</span>`:''}`;
}
function renderTable(rows,di){
  const host=$('tbl-host');
  if(!rows.length){
    host.innerHTML=`<div class="empty-state"><p>ما فيه خريجين يطابقون البحث أو الفلاتر الحالية.</p><button class="btn sm" id="clear-f2">مسح الفلاتر</button></div>`;
    renderBulk();return;
  }
  const allSel=rows.every(g=>sel.has(g.id));
  host.innerHTML=`<div class="tbl-wrap"><table>
    <thead><tr>
      <th class="c-check"><input type="checkbox" id="sel-all" ${allSel?'checked':''} aria-label="تحديد الكل"></th>
      <th>${sortTh('name','الخريج')}</th>
      <th>${sortTh('year','سنة التخرج')}</th>
      <th>وسيلة التواصل</th>
      <th>جهة العمل الحالية</th>
      <th>مسؤول التواصل</th>
      <th>${sortTh('last','آخر تواصل')}</th>
      <th>${sortTh('status','الحالة')}</th>
      <th>الدعوة</th>
      <th></th>
    </tr></thead>
    <tbody>${rows.map(g=>{
      const st=stateOf(g.id);
      return `<tr class="${sel.has(g.id)?'is-sel':''}">
        <td class="c-check"><input type="checkbox" data-sel="${g.id}" ${sel.has(g.id)?'checked':''} aria-label="تحديد ${esc(g.name)}"></td>
        <td><div class="nm">${nameCell(g,di,F.q)}</div><div class="sub">${esc(g.major)}</div></td>
        <td><span class="yr num">${g.year}</span></td>
        <td><div class="contacts">${g.contacts.map(contactChip).join('')}</div></td>
        <td><div>${esc(g.company)}</div><div class="sub">${esc(g.role)}</div></td>
        <td><select class="mini-sel ${st&&st.owner?'':'empty'}" data-owner="${g.id}" aria-label="مسؤول التواصل مع ${esc(g.name)}">
          <option value="">غير مسند</option>${D.members.map(m=>`<option value="${esc(m.id)}"${st&&st.owner===m.id?' selected':''}>${esc(m.name)}${m.id===me()?' (أنت)':''}</option>`).join('')}</select></td>
        <td>${lastCell(g)}</td>
        <td>${statusCell(g)}</td>
        <td>${inviteCellHTML(g)}</td>
        <td><button class="icon-btn" data-drw="${g.id}" aria-label="سجل ${esc(g.name)}" title="سجل الخريج">${ic('eye')}</button></td>
      </tr>`}).join('')}</tbody></table></div>`;
  renderBulk();
}
function renderCards(rows,di){
  const host=$('cards-host');
  if(!rows.length){host.innerHTML='';return}
  const allSel=rows.every(g=>sel.has(g.id));
  host.innerHTML=`<button type="button" class="fchip selall-chip ${allSel?'on':''}" id="sel-all-m" aria-pressed="${allSel}"><i class="dot" style="background:var(--accent-2)"></i>تحديد كل الظاهرين (${rows.length})</button>`+
    rows.map(g=>{
      const st=stateOf(g.id);
      const s=st?st.status:'new';
      const sess=upcomingFor(g.id);
      return `<div class="gcard ${sel.has(g.id)?'is-sel':''}" data-grow="${g.id}">
        <div class="gc-top">
          <input type="checkbox" data-sel="${g.id}" ${sel.has(g.id)?'checked':''} aria-label="تحديد ${esc(g.name)}">
          <div style="flex:1;min-width:0"><div class="gc-name">${nameCell(g,di,F.q)}</div>
          <div class="gc-meta">${esc(g.role||g.major)}${g.company?' · '+esc(g.company):''} · دفعة <span class="num">${g.year}</span></div></div>
        </div>
        <div class="gc-ct">${g.contacts.map(contactChip).join('')}</div>
        <div class="status-bar-cards"><span class="pill" style="--c:var(--s-${s})">${STATUS[s].label}</span><span class="sub">${lastCell(g)}</span></div>
        <div class="gc-foot">${inviteCellHTML(g)}
          <select class="mini-sel" data-owner="${g.id}" aria-label="مسؤول التواصل">
            <option value="">إسناد</option>${D.members.map(m=>`<option value="${esc(m.id)}"${st&&st.owner===m.id?' selected':''}>${esc(m.name)}</option>`).join('')}</select>
          <button class="icon-btn" data-drw="${g.id}" aria-label="سجل ${esc(g.name)}" title="سجل الخريج">${ic('eye')}</button>
        </div>
      </div>`}).join('');
  renderBulk();
}
function renderBulk(){
  const b=$('bulk');
  if(!sel.size){b.hidden=true;b.innerHTML='';return}
  b.hidden=false;
  b.innerHTML=`<b class="num">محدد: ${sel.size}</b><span class="sub">غيّر الحالة إلى</span>
    <select class="sel" id="bulk-status" title="نقل إلى «لم يُتواصل بعد» يمسح تاريخ آخر تواصل فقط — الدعوات المسجلة تبقى في السجل">${MANUAL_STATUSES.map(s=>`<option value="${s}">${STATUS[s].label}</option>`).join('')}</select>
    <button class="btn primary sm" id="bulk-apply">تطبيق</button>
    <select class="sel" id="bulk-owner"><option value="">إسناد عضو…</option>${D.members.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</select>
    <button class="btn primary sm" id="bulk-ass">إسناد</button>
    <button class="btn sm" id="bulk-me">أسنده لي</button>
    <button class="link" id="bulk-clear">إلغاء التحديد</button>`;
}

/* ================= Invite send flow (A3) ================= */
let invMenu=null;
function closeInvite(){if(invMenu){invMenu.remove();invMenu=null}}
function rejectToast(g,reason){
  if(reason==='exists')toast(`سبق التواصل مع هذا الخريج في هذه الفعالية — شوف السجل بتفاصيله.`,{label:'عرض السجل',fn:()=>openDrawer(g.id)});
  else if(reason==='limit')toast(`وصلنا الحد (${settings().reminderMax===2?'تذكيرين':'تذكير '+settings().reminderMax}). الحين الخطوة يدوية: تابع الرد أو سجّل النتيجة.`);
  else if(reason==='cooldown')toast(`التذكير متاح بعد فترة التهدئة (${settings().reminderCooldownDays} أيام من آخر رسالة). تابع الرد أو سجّل النتيجة.`);
  else if(reason==='state')toast('التذكير متاح فقط لمن ينتظر الرد.');
  else if(reason==='dnc')toast('هذا الخريج مستثنى من التواصل بناءً على طلبه.');
  else if(reason==='pending')toast('فيه رسالة لهذا الخريج بانتظار تسجيلك للإرسال الحين.');
  else toast('ما نقدر نرسل الحين — راجع حالة الخريج.');
}
const sendInFlight=new Set();/* R-16: re-entrancy guard — one send at a time per alumnus */
function sendVia(g,ch,kind){
  if(g.doNotContact){rejectToast(g,'dnc');return}
  if(sendInFlight.has(g.id))return;
  sendInFlight.add(g.id);
  try{
    const r=Repo.invite(g.id,kind,ch.kind==='wa'?'whatsapp':ch.kind);
    if(!r.ok){rejectToast(g,r.reason);return}
    const msg=Tmpl.renderPlain(ch.template,templateVarsFor(g,null));
    if(msg.missing.length)setTimeout(()=>toast(`ملاحظة: متغيرات ناقصة في الرسالة: ${(msg.missing.join('، '))}`),700);
    const href=channelHref(g,ch,msg.out);/* R-28: canonical values asserted inside */
    if(!href){toast('وسيلة التواصل غير صالحة — ما نقدر نفتح التطبيق.');return}
    if(ch.kind==='linkedin'){copyText(msg.out,'تم نسخ رسالة LinkedIn — الصقها في التواصل مع الخريج')}
    window.open(href,'_blank','noopener');
    toast('سجلنا الدعوة بوضع «قيد الإرسال» — سجّل الإرسال لما ترجع من التطبيق.');
  }finally{
    sendInFlight.delete(g.id);
    renderAll();
  }
}
function openInvite(g,btn,kind){
  kind=kind||(confirmedInitial(g.id,activeEvent()?activeEvent().id:'')?'reminder':'initial');
  closeInvite();
  const chs=channelsFor(g,kind);
  if(!chs.length){toast(`ما فيه وسيلة تواصل صحيحة لـ ${(g.name)}`);return}
  if(chs.length===1){sendVia(g,chs[0],kind);return}
  const m=document.createElement('div');
  m.className='inv-menu';m.setAttribute('role','menu');
  m.innerHTML=chs.map(c=>`<button class="it it-${c.kind}" role="menuitem" data-ch="${c.kind}">${ic(c.icon)}<span>${c.label}<small>${esc(c.sub)}</small></span></button>`).join('');
  document.body.appendChild(m);invMenu=m;
  const r=btn.getBoundingClientRect(),h=m.offsetHeight;
  m.style.left=Math.max(10,Math.min(r.right-m.offsetWidth,innerWidth-10-m.offsetWidth))+'px';
  m.style.top=(r.bottom+6+h>innerHeight?Math.max(10,r.top-6-h):r.bottom+6)+'px';
  m.addEventListener('click',e=>{const it=e.target.closest('[data-ch]');if(!it)return;const ch=chs.find(c=>c.kind===it.dataset.ch);closeInvite();sendVia(g,ch,kind)});
  m.querySelector('.it').focus();
}
document.addEventListener('click',e=>{if(invMenu&&!invMenu.contains(e.target)&&!e.target.closest('[data-invite]')&&!e.target.closest('#toast')&&!e.target.closest('.modal'))closeInvite()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeInvite()});
addEventListener('scroll',closeInvite,true);addEventListener('resize',closeInvite);

/* pending confirm strip (multiple sends awaiting confirmation) */
function pendingList(){
  const e=activeEvent();if(!e)return [];
  return D.invitations.filter(i=>i.status==='sending'&&i.eventId===e.id);
}
function renderPend(){
  const host=$('pend-host');
  const list=pendingList();
  if(!list.length){host.innerHTML='';return}
  host.innerHTML=`<div class="pendstrip" role="alert">${ic('send')}<b>عندك <span class="num">${list.length}</span> ${list.length>1?'دعوات بتنتظر تأكيدك':'دعوة بتنتظر تأكيدك'}</b>
    — راجعها قبل ما تمشي: ${list.slice(0,5).map(i=>{const g=gradById(i.gradId);return `<button class="link" data-drw="${i.gradId}">${g?esc(g.name):'؟'}</button>`}).join(' · ')}
    ${list.length>5?`<span class="sub">و${list.length-5} كمان…</span>`:''}</div>`;
}

