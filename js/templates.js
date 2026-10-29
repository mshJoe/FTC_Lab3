/* ================= Templates module (C2) ================= */
function currentTemplate(key){
  const t=D.templates[key];if(!t)return DEFAULT_TEMPLATE_BODIES[key]||'';
  return t.versions[t.versions.length-1].body;
}
function templateVarsFor(grad,session){
  const ev=activeEvent();
  const st=grad?D.states[grad.id+'|'+(ev?ev.id:'')]:null;
  return {
    'الاسم':grad?grad.name:'نورة الحربي',
    'الجهة':grad?grad.company:'جهة عمل الخريج',
    'المسؤول':grad?(memberName((st&&st.owner)||me())):'جود',
    'النادي':'نادي تقنية المستقبل (FTC)',
    'اسم الفعالية':ev?ev.name:'جلسة خريج',
    'مدة الجلسة':session?`${session.dur} دقيقة`:'45 إلى 60 دقيقة',
    'التاريخ':session?fmtLong(session.date):'اليوم',
    'الوقت':session?fmtTime(toMin(session.start)):'٨ مساءً',
    'موضوع الجلسة':(session&&session.topic)||'موضوع الجلسة',
    'مكان/رابط':'الرابط/المكان يأتي من الاتفاق'
  };
}
function renderTemplate(key,vars){
  const body=currentTemplate(key);
  const missing=[];
  const out=String(body||'').replace(/\{([^{}]+)\}/g,(m,k)=>{
    const v=vars[k];
    if(v==null||String(v)===''){missing.push(k);return '{'+k+'}'}
    return String(v);
  });
  return {out,missing};
}
const Tmpl={
  render:renderTemplate,
  current:currentTemplate,
  countChars:s=>String(s||'').length,
  /* used at real send time: unresolved vars left out + warn */
  renderPlain(key,vars){
    const r=renderTemplate(key,vars);
    const out=r.out.replace(/\{[^{}]+\}/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
    return {out,missing:r.missing};
  },
  save(key,body){
    const t=D.templates[key];if(!t)return;
    const snaps=[snapObj(t)];
    t.versions.push({body:String(body),editedBy:me(),editedAt:nowISO()});
    if(t.versions.length>20)t.versions=t.versions.slice(-20);
    commitUndo('تعديل رسالة جاهزة',snaps);
    Store.save();
    return t;
  },
  restore(key,versionIdx){
    const t=D.templates[key];if(!t||!t.versions[versionIdx])return;
    const snaps=[snapObj(t)];
    const v=t.versions[versionIdx];
    t.versions.push({body:v.body,editedBy:me(),editedAt:nowISO()});
    if(t.versions.length>20)t.versions=t.versions.slice(-20);
    commitUndo('استرجاع نسخة رسالة',snaps);
    Store.save();
  }
};

