/* ================= Trash page ================= */
function renderTrashPage(){
  const host=$('trash-card');
  const R=settings().trashRetentionDays;
  const delG=D.grads.filter(g=>g.deletedAt),
        delS=D.sessions.filter(s=>s.deletedAt);
  let h=`<div class="sec-head"><div><h2>${ic('trash')} المهملات</h2>
    <div class="sub">اللي تحذفه يقعد هنا ${R} يوم قبل ما ينمسح تلقائياً. الخريج المحذوف تنشيله سجلاته كامل، والجلسة تنرجع مربوطة بأصلها لو استرجعتها قبل البيع.</div></div></div>`;
  if(!delG.length&&!delS.length){h+=`<div class="empty-state"><p>المهملات فاضية.</p></div>`;host.innerHTML=h;return}
  const items=[
    ...delG.map(g=>({it:g,kind:'خريج',name:g.name||PLACEHOLDER_NAME,id:g.id})),
    ...delS.map(s=>({it:s,kind:'جلسة',name:`${s.topic||'بدون عنوان'} — ${(gradById(s.gradId)||{name:'؟'}).name}`,id:s.id}))
  ];
  const warn=items.some(x=>retentionLevel(x.it.deletedAt,today())==='warn');
  if(warn)h+=`<div class="banner-warn" role="status"><b>معلومة:</b> فيه عناصر باقي عليها ${R-5} أيام أو أقل قبل المسح التلقائي — هذا آخر فرصة ترويها أو تسترجعها.</div>`;
  h+=`<div class="tbl-wrap keep"><table><thead><tr><th>الاسم</th><th>النوع</th><th>تاريخ الحذف</th><th>الاحتفاظ</th><th>إجراء</th></tr></thead><tbody>
    ${items.map(x=>{const lv=retentionLevel(x.it.deletedAt,today());
    const left=Math.max(0,diffDays(addDays(dayOfISO(x.it.deletedAt),R),today()));
    const keepTxt=lv==='purge'?`ينمسح تلقائياً بعد ${left} يوم أو أقل`:left===0?'مسح اليوم':left===1?'بقي يوم':left===2?'بقي يومين':`بقي ${left} أيام`;
    return `<tr class="${lv==='purge'?'row-warn':''}">
      <td>${esc(x.name)}</td><td>${x.kind}</td>
      <td class="num">${fmtLong(dayOfISO(x.it.deletedAt))}</td>
      <td><span class="when">${keepTxt}</span></td>
      <td class="dact-row">${x.kind==='خريج'?`
        <button class="btn sm" data-restore-g="${x.id}">${ic('reset')}استرجاع</button>
        <button class="btn sm danger" data-purge-g="${x.id}" title="حذف نهائي يتطلب تأكيد كتابة اسم الخريج">${ic('trash')}حذف نهائي</button>`:
        `<button class="btn sm" data-restore-s="${x.id}">${ic('reset')}استرجاع الجلسة</button>`}</td>
    </tr>`}).join('')}
  </tbody></table></div>`;
  host.innerHTML=h;
}
$('trash-card').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.restoreG){Repo.restoreGrad(b.dataset.restoreG);toast('رجعنا الخريج للسجل — بيبان عادي في القائمة');renderAll();return}
  if(b.dataset.restoreS){Repo.restoreSession(b.dataset.restoreS);toast('رجعنا الجلسة وبرجع موعدها للجدول');pendingDel=null;renderAll();return}
  if(b.dataset.purgeG){
    const gid=b.dataset.purgeG;const g=gradById(gid);
    openModal(`<h3>${ic('trash')} حذف نهائي</h3>
      <p class="sub">بنحذف «${esc(g.name||PLACEHOLDER_NAME)}» من السجلات نهائياً — بياناته، سجل تواصله، وحالاته. هذا الإجراء ما ينتراجع فيه.</p>
      <label class="dfield">اكتب اسم الخريج للتأكيد: ${esc(g.name||PLACEHOLDER_NAME)}<input id="purge-verify" autocomplete="off"></label>
      <div class="mrow" style="justify-content:flex-end;margin-top:14px">
        <button class="btn" data-mclose="1">إلغاء</button>
        <button class="btn danger" data-purge-ok="${gid}">حذف نهائي</button>
      </div>`);
  }
});
$('modal').addEventListener('click',e=>{
  const b=e.target.closest('[data-purge-ok]');if(!b)return;
  const gid=b.dataset.purgeOk;
  const g=gradById(gid);
  const typed=norm(($('purge-verify')||{value:''}).value.trim());
  if(typed!==norm(g.name||PLACEHOLDER_NAME).trim()){toast('الاسم اللي كتبته ما يطابق — اكتب اسم الخريج كامل');return}
  const name=Repo.purgeGrad(gid);
  if(drawerId===gid)closeDrawer();
  closeModal();
  toast(`حذفنا سجل «${esc(name)}» نهائياً من التطبيق`);
  renderAll();
});

/* ================= Settings page ================= */
function renderSettingsPage(){
  const host=$('settings-card');
  const s=settings();
  const prev=D.events.filter(e=>e.status==='closed');
  let h=`<div class="sec-head"><div><h2>${ic('gear')} الإعدادات</h2>
    <div class="sub">كل شيء محفوظ في متصفحك الحالي (localStorage). بتعديل الأعضاء/القوالب/الإعدادات — نسخة JSON تبقى خيارك للحفظ الخارجي.</div></div></div>`;
  h+=`<div class="dgridded">${[
    `<div class="tcard"><span class="stat-l">الحفظ</span><b>تلقائي + نسخ JSON يدوي</b><span class="sub">${savedAt?`آخر حفظ ${esc(fmtShort(savedAt))}`:'بعد أول تعديل'} · نسخة ${esc(fmtShort(savedAt||''))}</span></div>`,
    `<div class="tcard"><label class="dfield" for="setme">مسجّل كـ (للمراسلات والردود)<select id="setme" class="inp sel">${D.members.map(m=>`<option value="${esc(m.id)}"${m.id===me()?' selected':''}>${esc(m.name)}</option>`).join('')}</select></label></div>`
  ].join('')}</div>`;

  h+=`<div class="dsec"><h4>${ic('cal')} فعليات سابقة</h4>`;
  h+=prev.length?`<div class="dgridded">${prev.slice().reverse().slice(0,12).map(e=>{
    const cnt={};ORDER.forEach(k=>cnt[k]=0);
    D.grads.filter(g=>!g.deletedAt&&g.mergedInto===null).forEach(g=>{const st=D.states[g.id+'|'+e.id];if(st)cnt[st.status]++;else cnt.new++});
    return `<div class="tcard"><b>${esc(e.name)}</b>
      <span class="sub">${fmtLong(e.startedAt)}${e.closedAt?' → '+fmtLong(e.closedAt):''}</span>
      <span class="sub">تواصل: <span class="num">${cnt.yes+cnt.booked+cnt.done}</span> · بانتظار: <span class="num">${cnt.wait+cnt.sending}</span> · اعتذر: <span class="num">${cnt.no}</span> · تمت: <span class="num">${cnt.done}</span></span>
      <button class="btn sm" data-prev-ev="${e.id}">${ic('eye')}تفاصيل الفعالية</button></div>`}).join('')}</div>`
    :`<div class="sub">ما فيه فعاليات مقفلة بعد.</div>`;
  h+=`</div>`;

  h+=`<div class="dsec"><h4>${ic('download')} النسخ والاستيراد</h4>
    <div class="dact-row">
      <button class="btn" data-export-csv="1">${ic('download')}تصدير الخريجين CSV</button>
      <button class="btn" data-export-json="1">${ic('download')}نسخة كاملة (JSON): انسخ التنسيق</button>
    </div>
    <details class="card" style="background:transparent;border:0;padding:0;margin-top:8px"><summary><button class="btn">استيراد من لصق أو ملف CSV</button></summary>
      <div class="wz-body">
        <textarea id="wiz-text-s" spellcheck="false" placeholder="الصق جدول (سطر: الاسم، الجوال، الإيميل، لينكد إن…)"></textarea>
        <div class="wz-tools">
          <label class="btn" for="wiz-file-s">اختيار ملف CSV</label>
          <input id="wiz-file-s" type="file" accept=".csv,text/csv" style="position:absolute;width:1px;height:1px;opacity:0" tabindex="-1">
          <button class="btn primary" id="wiz-review-s">تحقق واستعرض</button>
          <span class="sub" id="wiz-note-s"></span>
        </div>
        <div id="wiz-preview-s"></div>
      </div>
    </details>
  </div>`;

  h+=`<div class="dsec"><h4>${ic('mail')} قوالب الرسائل</h4>
    <div class="sub">عدّل نص القوالب الجاهزة (دعوة أولية ولينكد إن وتذكير وتأكيد موعد وشكر). كل حفظ وأشمل نسخة جديدة وعد كيست عشرون نسخة، والإد يجيب التاريخ.</div>
    <div class="tpl-list">${Object.entries(D.templates).map(([k,t])=>`<div class="tpl-item">
      <div class="tpl-head"><span>${esc(TEMPLATE_META[k].label)}</span>
        <span class="sub">${t.versions.length} نسخة · آخر تعديل ${fmtShort(t.versions[t.versions.length-1].editedAt)}</span></div>
      <div class="dact-row"><button class="btn sm" data-tedit="${k}">${ic('edit')}تعديل</button>
        <button class="btn sm" data-ttest="${k}">${ic('eye')}معاينة</button></div>
    </div>`).join('')}</div>
    <div id="tpl-editor" hidden></div>
  </div>`;

  h+=`<div class="dsec"><h4>${ic('gear')} إعدادات النظام</h4>
    <div class="dgridded">
      <label class="dfield">تحذير الجمعة<label class="ckrow"><input type="checkbox" id="st-friday" ${s.warnFriday?'checked':''}>فتح تحذير نهاية الأسبوع</label></label>
      <label class="dfield">مواعيد نهارية أصلي (HH:MM)<div class="dgridded"><input id="st-from" class="inp" dir="ltr" value="${esc(s.hoursWindow[0])}"><input id="st-to" class="inp" dir="ltr" value="${esc(s.hoursWindow[1])}"></div></label>
      <label class="dfield">أقصى عدد تذكيرات للفعالية<input id="st-rmax" class="inp num" value="${s.reminderMax}"></label>
      <label class="dfield">فترة برود التذكير (يوم)<input id="st-rcool" class="inp num" value="${s.reminderCooldownDays}"></label>
      <label class="dfield">مهلة تأكيد الإرسال (ساعة)<input id="st-ptime" class="inp num" value="${s.pendingTimeoutHours}"></label>
      <label class="dfield">الاحتفاظ بالمهملات (يوم)<input id="st-trash" class="inp num" value="${s.trashRetentionDays}"></label>
    </div>
    <div class="dact-row"><button class="btn primary" id="st-save">حفظ الإعدادات</button></div>
  </div>`;

  h+=`<div class="dsec"><h4>${ic('alert')} منطقة الخطر</h4>
    <div class="dact-row"><button class="btn danger" data-reset-all="1">${ic('reset')}إعادة ضبط النظام (مسح الكل)</button></div>
    <div class="sub">تحذير — قبل ما تعملها، صدر نسخة JSON ليك (زر فوق). الحذف ما ينرجع.</div>
  </div>`;
  host.innerHTML=h;
  const sme=$('setme');if(sme)sme.addEventListener('change',()=>{U.activeMemberId=sme.value;saveUI();renderAll()});
  $('st-save').onclick=saveSettings;
  $('settings-card').querySelectorAll('[data-tedit]').forEach(b=>b.onclick=()=>openTplEditor(b.dataset.tedit));
  $('settings-card').querySelectorAll('[data-ttest]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.ttest;
    const g=liveGrads()[0];const v=templateVarsFor(g,null);const r=Tmpl.renderPlain(k,v);
    openModal(`<h3>${ic('eye')} معاينة «${esc(TEMPLATE_META[k].label)}»</h3>
      <pre style="white-space:pre-wrap;background:rgba(0,0,0,.3);padding:12px;border-radius:10px;font-size:13px">${esc(r.out)}</pre>
      ${r.missing.length?`<div class="sub">${ic('info')} متغيرات ناقصة: ${esc(r.missing.join('، '))}</div>`:''}
      <div class="mrow" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-mclose="1">إغلاق</button></div>`);
  });
}
function saveSettings(){
  const s=settings();
  const j=/^\d{1,2}:\d{2}$/;
  const f=$('st-from').value.trim(),t=$('st-to').value.trim();
  if((f||t)&&(!(j.test(f)&&j.test(t))||toMin(f)>=toMin(t))){toast('النطاق الزمني لازم HH:MM وبداية قبل النهاية');return}
  s.warnFriday=$('st-friday').checked;
  if(f&&t)s.hoursWindow=[f,t];
  s.reminderMax=Math.max(0,+$('st-rmax').value||0);
  s.reminderCooldownDays=Math.max(0,+$('st-rcool').value||0);
  s.pendingTimeoutHours=Math.max(1,+$('st-ptime').value||24);
  s.trashRetentionDays=Math.max(7,+$('st-trash').value||30);
  Store.save();toast('حفظنا الإعدادات');renderSettingsPage();renderAll();
}
$('settings-card').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.prevEv){openModal(prevEventModal(b.dataset.prevEv));return}
  if(b.dataset.resetAll){
    openModal(`<h3>${ic('alert')} إعادة ضبط</h3><p class="sub">بنمسح كل البيانات المحفوظة ونرجع بيانات تجريبية جديدة. هل أنت متأكد؟</p>
      <div class="mrow" style="justify-content:flex-end;margin-top:10px">
      <button class="btn" data-mclose="1">إلغاء</button><button class="btn danger" id="reset-go">نعم، إعادة ضبط</button></div>`);
    $('reset-go').onclick=()=>{try{localStorage.removeItem(KEY);localStorage.removeItem(VERKEY);}catch(err){}location.reload()};
    return;
  }
  if(b.dataset.exportJson){
    const txt=`{ "v": 2, "savedAt": ${JSON.stringify(nowISO())}, "data": ${JSON.stringify(D)} }`;
    copyText(txt,'نسخنا بصمة JSON كاملة — الصقها في ملف .json واحفظه');
    return;
  }
  if(b.dataset.exportCsv){
    const rows=[[ 'الاسم','الدفعة','التخصص','جهة العمل','المسمى','الجوال','الإيميل','لينكدإن' ].join(',')];
    liveGrads().forEach(g=>{
      const ph=g.contacts.filter(c=>c.type==='phone').map(c=>c.value);
      const em=g.contacts.filter(c=>c.type==='email').map(c=>c.value);
      const li=g.contacts.filter(c=>c.type==='linkedin').map(c=>c.value);
      rows.push([g.name,g.year,g.major,g.company,g.role,ph.join(' | '),em.join(' | '),li.join(' | ')].map(x=>`"${String(x==null?'':x).replace(/"/g,'""')}"`).join(','));
    });
    copyText(rows.join('\n'),'نسخنا جدول الخريجين (CSV) — الصقه في ملف .csv');
    return;
  }
});
function prevEventModal(eid){
  const e=D.events.find(x=>x.id===eid);if(!e)return '<h3>؟</h3>';
  const invs=D.invitations.filter(i=>i.eventId===eid);
  const cnt={};ORDER.forEach(k=>cnt[k]=0);
  D.grads.filter(g=>!g.deletedAt&&g.mergedInto===null).forEach(g=>{const st=D.states[g.id+'|'+eid];if(st)cnt[st.status]++;else cnt.new++});
  return `<h3>${ic('cal')} تفاصيل فعالية «${esc(e.name)}»</h3>
    <div class="mrow"><span class="sub">${fmtLong(e.startedAt)}${e.closedAt?' → '+fmtLong(e.closedAt):' (جارية)'}</span></div>
    <div class="dgridded">${ORDER.filter(k=>cnt[k]).map(k=>`<div class="tcard"><span class="pill" style="--c:var(--s-${k})">${STATUS[k].label}</span><span class="num">${cnt[k]}</span></div>`).join('')}</div>
    <div class="mrow" style="margin-top:10px"><span class="sub">دعوات: <b class="num">${invs.length}</b> · أكدها: <b class="num">${invs.filter(i=>i.status==='confirmed').length}</b> · ألغيت: <b class="num">${invs.filter(i=>i.status==='cancelled').length}</b></span></div>
    <div class="mrow" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-mclose="1">إغلاق</button></div>`;
}

/* ================= Template editor ================= */
function openTplEditor(key){
  const t=D.templates[key];const meta=TEMPLATE_META[key];if(!t)return;
  const h=$('tpl-editor');
  h.hidden=false;
  const body=t.versions[t.versions.length-1].body;
  h.innerHTML=`<div class="teditor">
    <div class="mrow"><b>تعديل «${esc(meta.label)}»</b><span class="sub">اضغط أي متغير تحطه بالنص:</span></div>
    <div class="vchips">${meta.vars.map(v=>`<button class="fchip" data-vchip="${esc(v)}">${esc(v)}</button>`).join('')}</div>
    <textarea id="tpl-body" rows="6">${esc(body)}</textarea>
    ${key==='linkedin'?`<div class="sub" id="tpl-count"></div>`:''}
    <div class="dact-row"><button class="btn primary" data-tsave="${key}">حفظ كنسخة جديدة</button><button class="btn" data-tcancel="1">إغلاق</button></div>
    <div class="sub">النسخ السابقة — اضغط لأي واحدة لعرض نصها (الحفظ يثبتها كنسخة جديدة):</div>
    <div class="vchips">${t.versions.length>1?t.versions.map((v,i)=>`<button class="fchip" data-tver="${i}" title="${esc(fmtShort(v.editedAt))} بواسطة ${esc(v.editedBy)}">${esc(v.editedBy)} · ${fmtShort(v.editedAt)}</button>`).join(''):'<span class="sub">النسخة الأولى</span>'}</div>
  </div>`;
  const ta=$('tpl-body');
  const upd=()=>{
    const c=$('tpl-count');
    if(!c)return;
    const n=ta.value.length;
    c.textContent=`الطول: ${n} حرف ${n>300?'— فوق حد الرسالة الواحدة (واتساب يتفرع)':n>200?'— فوق الـ 200 · LinkedIn ينشطره':'— ينفّذ LinkedIn إنبوكس كامل'}`;
  };
  upd();
  ta.addEventListener('input',upd);
  h.onclick=e2=>{
    const b=e2.target.closest('button');if(!b)return;
    if(b.dataset.vchip!==undefined&&b.dataset.vchip!==''){
      const i=ta.selectionStart==null?ta.value.length:ta.selectionStart;
      const ee=ta.selectionEnd==null?i:ta.selectionEnd;
      ta.value=ta.value.slice(0,i)+`{${b.dataset.vchip}}`+ta.value.slice(ee);
      upd();return;
    }
    if(b.dataset.tver!==undefined&&b.dataset.tver!==''){
      const v=t.versions[+b.dataset.tver];if(!v)return;
      ta.value=v.body;upd();
      toast('عرضنا نص النسخة القديمة — اضغط «حفظ كنسخة جديدة» إذا عجبك');
      return;
    }
    if(b.dataset.tsave){Tmpl.save(key,ta.value);toast('حفظنا نسخة جديدة من القالب');openTplEditor(key);return}
    if(b.dataset.tcancel!==undefined){h.hidden=true;}
  };
}

