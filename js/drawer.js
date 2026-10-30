/* ================= Drawer (alumnus record) ================= */
let lastDrawerOpener=null,lastModalOpener=null;
const FOCUSABLE='button:not([hidden]),input:not([hidden]),select:not([hidden]),textarea:not([hidden]),a[href],[tabindex]:not([tabindex="-1"])';
function trapFocus(container,e){
  const items=[...(container||document).querySelectorAll(FOCUSABLE)].filter(el=>el.offsetParent!==null||el===document.activeElement);
  if(!items.length)return;
  const first=items[0],last=items[items.length-1];
  if(!container.contains(document.activeElement)){first.focus();e.preventDefault();return}
  if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault()}
  else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault()}
}
function openDrawer(gid,trigger){
  lastDrawerOpener=trigger||(document.activeElement instanceof HTMLElement?document.activeElement:null)||lastDrawerOpener;
  drawerId=gid;drawerEditMode=false;drawerNoteOpen=false;
  renderDrawer();
  $('drawer').classList.add('on');
  $('backdrop').hidden=false;
  requestAnimationFrame(()=>$('backdrop').classList.add('on'));
  document.body.style.overflow='hidden';
  const dc=$('drawer').querySelector('[data-dclose]');
  if(dc)dc.focus();
}
function closeDrawer(){
  drawerId=null;drawerEditMode=false;drawerNoteOpen=false;
  $('drawer').classList.remove('on');
  $('backdrop').classList.remove('on');
  setTimeout(()=>{if(drawerId===null)$('backdrop').hidden=true},260);
  document.body.style.overflow='';
  /* R-30: give focus back to whoever opened it */
  if(lastDrawerOpener&&document.contains(lastDrawerOpener)){lastDrawerOpener.focus();lastDrawerOpener=null}
}
function renderDrawer(){
  const g=drawerId?gradById(drawerId):null;
  const d=$('drawer');
  if(!g){if(drawerId!==null)closeDrawer();return}
  const st=stateOf(g.id);
  d.innerHTML=`
  <div class="drawer-head">
    <div style="flex:1;min-width:0">
      <div class="dh-name">${esc(g.name)} ${g.doNotContact?`<span class="pill" style="--c:var(--s-no)">${ic('lock')}لا تتواصل</span>`:''}${DEMO_MODE&&g.demoNote?`<span class="demo-note-tag" title="ملاحظة من بيانات العرض التجريبي">${esc(g.demoNote)}</span>`:''}</div>
      <div class="sub">${esc(g.major)}${g.role?' · '+esc(g.role):''}${g.company?' · '+esc(g.company):''} · دفعة <span class="num">${g.year}</span></div>
    </div>
    <button class="icon-btn" data-dclose aria-label="إغلاق السجل">${ic('x')}</button>
  </div>
  <div class="drawer-body">
    <div class="dsec"><h4>${ic('user')} وسائل التواصل</h4>
      <div class="contacts">${g.contacts.length?g.contacts.map(contactChip).join(''):'<span class="sub">ما فيه وسيلة تواصل مسجلة</span>'}</div>
      <div class="sub">آخر تحديث للتواصل ${fmtShort(g.lastVerified)}</div>
    </div>
    <div class="dsec"><h4>${ic('flag')} إجراءات</h4>
      <div class="dact-row">
        <button class="btn ${st&&st.owner===me()?'primary':''}" data-dme="${g.id}">${st&&st.owner===me()?ic('check')+'مسؤول التواصل: أنا':ic('user')+'أسنده لي'}</button>
        ${!g.doNotContact&&st&&(st.status==='wait'||st.status==='new')&&st.last?`<button class="btn" data-dclear="${g.id}">${ic('reset')}تصفير الحالة إلى «خريج جديد»</button>`:''}
        ${!g.deletedAt?`<button class="btn danger" data-dtrash="${g.id}">${ic('trash')}نقل للمهملات</button>`:''}
      </div>
      ${st&&st.owner&&st.owner!==me()?`<div class="sub">مسؤول التواصل الحالي: ${esc(memberName(st.owner))} — التطبيق بصفتك ${esc(me())}.</div>`:''}
    </div>
    <div class="dsec"><h4>${ic('send')} الدعوات وردود الخريج</h4>
      ${drawerInvites(g)}
      <div class="dact-row">
        <button class="btn sm" data-dnote="${g.id}">${ic('edit')}تسجيل رد / ملاحظة</button>
      </div>
      <div id="d-note-form" ${drawerNoteOpen?'':'hidden'}>
        <textarea id="d-note-text" rows="2" placeholder="شو صار في الرد أو المحادثة؟ (ينكتب في سجل الخريج)"></textarea>
        <div class="dact-row"><button class="btn primary sm" data-dnote-save="${g.id}">تسجيل</button><button class="btn sm" data-dnote-x="1">إلغاء</button></div>
      </div>
    </div>
    <div class="dsec"><h4>${ic('edit')} تعديل البيانات</h4>
      ${drawerEditMode?`
      <label class="dfield">الاسم<input id="de-name" value="${esc(g.name)}"></label>
      <div class="dgridded">
        <label class="dfield">التخصص<input id="de-major" value="${esc(g.major||'')}"></label>
        <label class="dfield">الدور<input id="de-role" value="${esc(g.role||'')}"></label>
      </div>
      <div class="dgridded">
        <label class="dfield">جهة العمل<input id="de-comp" value="${esc(g.company||'')}"></label>
        <label class="dfield">سنة التخرج<input id="de-year" value="${esc(g.year||'')}"></label>
      </div>
      <div class="dgridded">
        <label class="dfield">نوع وسيلة تواصل جديدة<select id="de-ct-type" class="inp sel"><option value="phone">جوال</option><option value="email">إيميل</option><option value="linkedin">LinkedIn</option></select></label>
        <label class="dfield">القيمة<input id="de-ct-val" dir="ltr"></label>
      </div>
      <div class="dact-row"><button class="btn primary" data-dsave="${g.id}">حفظ التعديلات</button><button class="btn" data-dedit="0">إلغاء</button></div>`
      :`<div class="dact-row"><button class="btn" data-dedit="1">${ic('edit')}تعديل البيانات وسائل التواصل</button></div>`}
    </div>
    <div class="dsec"><h4>${ic('lock')} الاستثناء من التواصل</h4>
      ${g.doNotContact?`
      <div class="sub">السبب: ${esc(g.dncReason||'بناءً على طلبه')}${g.dncBy?` · سجّلها ${esc(memberName(g.dncBy))}`:''}${g.dncAt?` · ${fmtShort(g.dncAt)}`:''}</div>
      <div class="dact-row"><button class="btn" data-dresume="${g.id}">${ic('reset')}أعد فتح التواصل (أزل الاستثناء)</button></div>`
      :`<div class="dact-row"><button class="btn danger" data-dnc="${g.id}">${ic('lock')}لا تتواصل — استثناء بطلبه</button></div>`}
    </div>
    <div class="dsec"><h4>${ic('clock')} سجل الخريج</h4>
      ${(D.timeline||[]).filter(t2=>t2.gradId===g.id&&t2.text).slice().reverse().slice(0,drawerCap).map(t2=>`<div class="tl-entry">
        <span class="tic">${ic(TL_KIND[t2.kind]||'clock')}</span>
        <div class="ttxt"><span>${esc(t2.text)}</span><small><time class="airabic">${fmtShort(t2.ts)}</time>${t2.actorId?` · بواسطة ${esc(memberName(t2.actorId))}`:''}</small></div>
      </div>`).join('')||'<span class="sub">ما فيه نشاط مسجل بعد.</span>'}
      ${(D.timeline||[]).filter(t2=>t2.gradId===g.id).length>drawerCap?`<button class="link" data-dcap="1">عرض المزيد (${(D.timeline||[]).filter(t2=>t2.gradId===g.id).length-drawerCap})</button>`:''}
    </div>
  </div>`;
}
function drawerInvites(g){
  const ev=activeEvent();
  const all=(g.invitations||D.invitations||[]).filter(i=>i.gradId===g.id);
  const cur=ev?all.filter(i=>i.eventId===ev.id):all;
  const sess=D.sessions.filter(s=>s.gradId===g.id&&!s.deletedAt);
  let h='';
  if(!ev&&!all.length&&!sess.length)return '<span class="sub">ما فيه فعالية حالياً ولا دعوات سابقة.</span>';
  if(cur.length)h+=cur.slice().reverse().slice(0,8).map(i=>{
    /* N-01: فقط حنا سجّلنا الإرسال — ما تثبت مشاركة الخريج */
    const p=i.status==='confirmed'?{t:'تم التواصل',c:'wait'}:i.status==='cancelled'?{t:'أُلغيت',c:'no'}:{t:'قيد الإرسال',c:'sending'};
    const when=i.status==='confirmed'&&i.confirmedAt?fmtShort(i.confirmedAt):'بدأ الإرسال '+fmtShort(i.createdAt);
    return `<div class="ckrow">
    <span class="pill" style="--c:var(--s-${p.c})">${p.t}</span>
    <span class="sub">${i.kind==='reminder'?'تذكير':'دعوة أولى'} · ${CHANNEL_AR[i.channel]||i.channel} · ${esc(memberName(i.senderId)||'')} · ${when}</span>
    ${i.status==='sending'?`<span class="dact-row"><button class="btn sm" data-ivok="${i.id}">${ic('check')}سجّل الإرسال</button><button class="btn sm" data-ivcx="${i.id}">${ic('x')}إلغاء</button></span>`:''}
  </div>`}).join('');
  else h+=`<div class="sub">${ev?'ما فيه دعوات في هذه الفعالية بعد.':'ما فيه دعوات سابقة.'}</div>`;
  if(sess.length)h+=sess.map(s=>`<div class="ckrow"><span class="pill" style="--c:var(--s-${s.doneAt?'done':'booked'})">${s.doneAt?'تمت':'مجدولة'}</span>
    <span class="sub">${s.topic?esc(s.topic)+' · ':''}${fmtLong(s.date)} · ${fmtTime(toMin(s.start))}${s.notes?' · '+esc(s.notes):''}</span></div>`).join('');
  return h;
}

/* ================= Modal ================= */
function openModal(html){
  lastModalOpener=document.activeElement instanceof HTMLElement?document.activeElement:lastModalOpener;
  modalHtml=html;
  const m=$('modal');
  m.innerHTML=html;
  m.hidden=false;m.classList.add('on');
  document.body.style.overflow='hidden';
  const f=m.querySelector(FOCUSABLE);if(f)f.focus();
}
function closeModal(){
  modalHtml=null;
  const m=$('modal');
  m.classList.remove('on');
  document.body.style.overflow='';
  setTimeout(()=>{if(modalHtml===null)m.hidden=true},200);
  /* R-30 */
  if(lastModalOpener&&document.contains(lastModalOpener)){lastModalOpener.focus();lastModalOpener=null}
}
/* R-30: Tab trapping + Escape ordering (invite menu → modal/drawer) */
document.addEventListener('keydown',e=>{
  if(e.key==='Tab'){
    const m=$('modal');
    if(!m.hidden&&modalHtml){trapFocus(m,e);return}
    const d=$('drawer');
    if(d.classList.contains('on')){trapFocus(d,e);return}
  }
  if(e.key==='Escape'){
    if(invMenu){closeInvite();return}/* sendMessage menu first */
    if(modalHtml){closeModal();return}
    if(drawerId){closeDrawer();return}
  }
});

/* ================= Drawer actions ================= */
function touchVerified(gid){const g=gradById(gid);if(g)g.lastVerified=riyadhToday()}
$('drawer').addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(!b){if(e.target.closest('[data-dclose]'))closeDrawer();return}
  if(b.hasAttribute('data-dclose')){closeDrawer();return}
  const gid=drawerId;
  if(!gid)return;
  if(b.dataset.dme){Repo.setOwner(gid,me());toast(`${(memberName(me()))} صار مسؤول التواصل مع ${(gradById(gid).name)}`);renderAll();return}
  if(b.dataset.dclear){Repo.setState(gid,'new',{force:true,quiet:false});renderAll();return}
  if(b.dataset.dtrash){const g=gradById(gid);closeDrawer();Repo.trashGrad(gid);toast(`نقلنا «${(g.name)}» للمهملات`);renderAll();return}
  if(b.dataset.dedit!==undefined){drawerEditMode=b.dataset.dedit==='1';renderDrawer();return}
  if(b.dataset.dsave){
    const v=id=>($(id)||{value:''}).value.trim();
    const g=gradById(gid);
    const name=v('de-name');
    const f={major:v('de-major'),role:v('de-role'),company:v('de-comp'),year:+v('de-year')||g.year};
    if(name)f.name=name;
    const ctType=$('de-ct-type').value,ctVal=v('de-ct-val');
    if(ctType&&ctVal){
      const cl=cleanContact(ctType,ctVal);
      if(cl&&cl.ok){f.contacts=[...g.contacts.filter(c=>compactKey(c.type,c.value)!==compactKey(cl.type,cl.value)),{type:cl.type,value:cl.value}];touchVerified(gid)}
      else toast('القيمة المدخلة مش صالحة كوسيلة تواصل — ما نضيفها، راجع الصيغة');
    }
    Repo.updateGrad(gid,f);
    toast('حفظنا التعديلات');drawerEditMode=false;renderAll();
    return;
  }
  if(b.dataset.dnc){openDnc(gid);return}
  if(b.dataset.dresume){
    toggleFlagBack(gid,true).then(()=>{toast('أعدنا فتح باب التواصل مع الخريج');renderAll()});
    return;
  }
  if(b.dataset.ivok){Repo.inviteConfirm(b.dataset.ivok);renderAll();return}
  if(b.dataset.ivcx){Repo.inviteCancel(b.dataset.ivcx,false);toast('ألغينا «قيد الإرسال» — الحالة رجعت زي ما كانت');renderAll();return}
  if(b.dataset.dnote){drawerNoteOpen=!drawerNoteOpen;renderDrawer();if(drawerNoteOpen)$('d-note-text').focus();return}
  if(b.dataset.dnoteSave){
    const txt=($('d-note-text')||{value:''}).value.trim();
    if(txt){TLwrite(gid,activeEvent()?activeEvent().id:null,'note_added',txt);Store.save();toast('سجلنا النتيجة في سجل الخريج')}
    drawerNoteOpen=false;renderDrawer();return;
  }
  if(b.dataset.dcap){drawerCap+=100;renderDrawer();return}
});

/* ================= DNC flow ================= */
function openDnc(gid){
  const g=gradById(gid);if(!g)return;
  const reasons=['ما يبي يشارك','تجاهل بعد التذكيرين','طلب الإدارة والمشرفين','تواصل لاحقاً — مؤقت'];
  openModal(`<h3>${ic('lock')} استثناء ${esc(g.name)} من التواصل</h3>
    <p class="sub">الاستثناء بيتطبق بطلبه أو بقرار الإدارة. بنوقف أي إجراء جديد، وبنلغي أي إرسال «قيد الإرسال» لسه ما سجّلنا الإرسال، وبنضيف وسائل تواصله لسجل المنع.</p>
    <div class="dgridded">${reasons.map(r=>`<button class="btn" data-dncr="${esc(r)}">${esc(r)}</button>`).join('')}</div>
    <label class="dfield" style="margin-top:10px">سبب آخر<input id="dnc-free"></label>
    <div class="mrow" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-mclose="1">إلغاء</button></div>`);
  $('modal').querySelectorAll('[data-dncr]').forEach(btn=>{
    btn.onclick=()=>{setFlag(gid,btn.dataset.dncr).then(()=>{closeModal();toast(`وقفنا التواصل مع ${(modifyName(gid))} — بيبان «لا تتواصل» في القوائم`);renderAll()})};
  });
  const f=$('dnc-free');
  const kb=document.createElement('div');
  kb.className='mrow';kb.style.cssText='justify-content:flex-end;margin-top:14px';
  kb.innerHTML=`<button class="btn danger" id="dnc-ok">تثبيت الاستثناء</button>`;
  f&&f.after(kb);
  const ok=()=>{const vv=(f.value||'').trim();if(!vv){toast('اختر سبب أو اكتبه');return}setFlag(gid,vv).then(()=>{closeModal();toast('بيانات التواصل صارت محجوبة في الاستيراد — الحالة «لا تتواصل»');renderAll()})};
  f&&f.addEventListener('keydown',e=>{if(e.key==='Enter')ok()});
  const b2=$('dnc-ok');if(b2)b2.onclick=ok;
}
function modifyName(gid){const g=gradById(gid);return g?(g.name===PLACEHOLDER_NAME?'الخريج بدون اسم':g.name):'الخريج'}

/* ================= Merge dialog (B3) ================= */
function openMerge(gid,peerIds){
  const g=gradById(gid);const peers=(peerIds||[]).map(gradById).filter(Boolean).filter(p=>p.id!==gid);
  if(!g||!peers.length){toast('ما فيه سجل بنفس وسيلة التواصل الحين');return}
  const others=[g,...peers].slice(0,3);
  const dst=((g.contacts||[]).some(c=>cleanContact(c.type,c.value)&&cleanContact(c.type,c.value).ok)||g.name&&g.name!==PLACEHOLDER_NAME)?g:(peers.find(p=>(p.contacts||[]).length)||g);
  const fields=['name','year','major','company','role'];
  const rows=fields.map(k=>`<div class="mrg-row"><span class="mrg-k">${esc({name:'الاسم',year:'سنة التخرج',major:'التخصص',company:'جهة العمل',role:'المسمى'}[k])}</span>
    ${others.map(o=>`<label><input type="radio" name="m-f-${k}" value="${o.id}" ${o[k]?'':'disabled'} ${o.id===g.id&&g[k]?'checked':(o[k]&&!(g[k])?'checked':'')}>${esc(String(o[k]||'—'))}</label>`).join('')}</div>`).join('');
  const ctRows=['phone','email','linkedin'].map(t=>{
    const items=others.filter(o=>(o.contacts||[]).some(c=>c.type===t));
    if(!items.length)return '';
    return `<div class="mrg-row"><span class="mrg-k">${esc({phone:'الجوالات',email:'الإيميلات',linkedin:'LinkedIn'}[t])}</span>
      ${items.map(o=>(o.contacts||[]).filter(c=>c.type===t).map(c=>`<label><input type="checkbox" name="m-ct-${o.id}-${compactKey(t,c.value)}" checked>${esc(t==='phone'?fmtPhone(c.value):t==='email'?c.value:fmtLinkedin(c.value))}</label>`).join('')).join('')}</div>`;
  }).join('');
  openModal(`<h3>${ic('users')} دمج سجلات</h3>
    <p class="sub">نبقي سجل واحد نختار له البيانات والوسائل، والباقي يُحفظ كسجلات مدموجة (تختفي من القوائم وتبقى في السجل). اختر أي بيانات ووسائل تبيها في السجل المدموج.</p>
    <div class="merge-grid">${others.map(o=>`<div class="tcard"><b>${esc(o.name||PLACEHOLDER_NAME)}</b><span class="sub">${esc(o.major)} · دفعة ${o.year}</span></div>`).join('')}</div>
    <div style="margin-top:10px">${rows}${ctRows}</div>
    <div class="mrow" style="justify-content:flex-end;margin-top:14px">
      <button class="btn" data-mclose="1">إلغاء</button>
      <button class="btn primary" id="mrg-go">دمج في «${esc(dst.name||PLACEHOLDER_NAME)}»</button>
    </div>`);
  $('mrg-go').onclick=()=>{
    const fill=[];
    fields.forEach(k=>{const r=$('modal').querySelector(`input[name="m-f-${k}"]:checked`);if(r&&r.value!==dst.id)fill.push({k,from:r.value})});
    const extras=[];
    others.filter(o=>o!==dst).forEach(o=>{
      (o.contacts||[]).forEach(c=>{
        const cb=$('modal').querySelector(`input[name="m-ct-${o.id}-${compactKey(c.type,c.value)}"]`);
        if(cb&&cb.checked&&!dst.contacts.some(x=>compactKey(x.type,x.value)===compactKey(c.type,c.value)))extras.push({type:c.type,value:c.value});
      });
    });
    if(dst.name===PLACEHOLDER_NAME&&!fill.some(f=>f.k==='name')){
      const withName=others.find(o=>o.name&&o.name!==PLACEHOLDER_NAME);
      if(withName)fill.push({k:'name',from:withName.id});
    }
    const mergedNames=others.filter(o=>o!==dst).map(o=>o.name||PLACEHOLDER_NAME);
    Repo.merge(others.filter(o=>o!==dst).map(o=>o.id),dst.id,fill,extras);
    closeModal();
    toast(`دمجنا ${mergedNames.length>1?mergedNames.length+' سجلات':'«'+(mergedNames[0]||'السجل')+'»'} في «${(dst.name||PLACEHOLDER_NAME)}» — التعديلات محفوظة`);
    if(drawerId){drawerId=dst.id;renderDrawer()}
    renderAll();
  };
}
function fmtLinkedin(v){const l=cleanContact('linkedin',v);return l&&l.ok?'in/'+l.value:String(v||'')}

