/* ================= Quick add ================= */
$('qa-add').addEventListener('click',()=>{
  const v=$('qa-input').value.trim();
  if(!v)return;
  const f=Importer.extractFields(v);
  if(!f.name&&!(f.phones.length||f.emails.length||f.linkedins.length)){toast('اكتب اسم مع رقم، أو الصق سطر كامل مثل: فهد الحربي 0534410098');return}
  const cand={name:f.name||'',phones:f.phones,emails:f.emails,linkedins:f.linkedins,year:f.year||'',major:'',company:'',role:''};
  const dup=f.phones.length||f.emails.length||f.linkedins.length?findMatchByContacts(cand):null;
  if(dup){
    if(dup.doNotContact){toast(`«${esc(dup.name)}» مستثنى بناءً على طلبه — ما نضيف وسيلة تواصل له`);return}
    const have=new Set(dup.contacts.map(c=>compactKey(c.type,c.value)));
    const candCts=[...f.phones.map(p=>({type:'phone',value:p})),...f.emails.map(e=>({type:'email',value:e})),...f.linkedins.map(l=>({type:'linkedin',value:l}))];
    const adds=candCts.filter(c=>!have.has(compactKey(c.type,c.value)));
    const n=adds.length?Repo.addContacts(dup.id,adds):0;
    if(n)toast(`«${esc(dup.name)}» موجود مسبقاً — أضفنا ${n===1?'وسيلة تواصل':'وسيلتين'} جديدة لملفه`,{label:'فتح الملف',fn:()=>{openDrawer(dup.id);renderAll()}});
    else toast(`«${esc(dup.name)}» موجود مسبقاً ومعلوماته مطابقة — ما نضيفه ثاني`,{label:'فتح الملف',fn:()=>openDrawer(dup.id)});
    $('qa-input').value='';
    if(n)renderAll();
    return;
  }
  const g=Repo.addGrad({
    name:f.name,year:f.year||new Date().getFullYear(),major:'',company:'',role:'',
    contacts:[...f.phones.map(p=>({type:'phone',value:p})),...f.emails.map(e=>({type:'email',value:e})),...f.linkedins.map(l=>({type:'linkedin',value:l}))]
  },'manual');
  if(f.emails.length||f.phones.length)touchVerified(g.id);
  $('qa-input').value='';
  toast(`أضفنا «${esc(g.name)}» — الدعوة جاهزة في صف الخريج`);
  clearFilters();F.q='';$('q').value='';renderAll();
});
$('qa-input').addEventListener('keydown',e=>{if(e.key==='Enter')$('qa-add').click()});

/* ================= Thanks / booking message menus (no invite record) ================= */
function openThanksMenu(g,btn){openMsgMenu(g,'thanks',null,btn)}

/* ================= Row delegation ================= */
function rowClickHandler(e){
  if(e.target.closest('#clear-f2')){clearFilters();return}
  const cb=e.target.closest('[data-sort]');if(cb){const k=cb.dataset.sort;if(F.sort.key===k)F.sort.dir*=-1;else{F.sort.key=k;F.sort.dir=1}renderList();return}
  const cl=e.target.closest('button[data-copy]');if(cl){copyText(cl.dataset.copy,'تم النسخ');return}
  if(e.target.closest('[data-drw]')){openDrawer(e.target.closest('[data-drw]').dataset.drw);return}
  if(e.target.closest('#sel-all-m')){const rows=visible();const allOn=rows.length&&rows.every(g=>sel.has(g.id));allOn?sel.clear():rows.forEach(g=>sel.add(g.id));renderList();return}
  if(e.target.closest('[data-invite]')){const b=e.target.closest('[data-invite]');const g=gradById(b.dataset.invite);openInvite(g,b);return}
  if(e.target.closest('[data-cf]')){Repo.inviteConfirm(e.target.closest('[data-cf]').dataset.cf);renderAll();return}
  if(e.target.closest('[data-thanks]')){const b=e.target.closest('[data-thanks]');const g=gradById(b.dataset.thanks);openThanksMenu(g,b);return}
  if(e.target.closest('[data-samk]')){const gid=e.target.closest('[data-samk]').dataset.samk;openMerge(gid,dupInfo(liveGrads()).contactPeers(gradById(gid)));return}
}
['tbl-host','cards-host'].forEach(id=>{
  $(id).addEventListener('click',rowClickHandler);
  $(id).addEventListener('change',e=>{
    if(e.target.matches('[data-sel]')){e.target.checked?sel.add(e.target.dataset.sel):sel.delete(e.target.dataset.sel);renderList();return}
    if(e.target.id==='sel-all'){const rows=visible();e.target.checked?rows.forEach(g=>sel.add(g.id)):sel.clear();renderList();return}
    if(e.target.matches('[data-status]')){Repo.setState(e.target.dataset.status,e.target.value);renderAll();return}
    if(e.target.matches('[data-owner]')){Repo.setOwner(e.target.dataset.owner,e.target.value);renderAll();return}
  });
});
$('bulk').addEventListener('click',e=>{
  if(e.target.closest('#bulk-clear')){sel.clear();renderList();return}
  if(e.target.closest('#bulk-me')){[...sel].forEach(id=>Repo.setOwner(id,me()));toast(`أشركت ${esc(me())} مسؤولاً عن ${sel.size} خريج`);sel.clear();renderList();return}
  if(e.target.closest('#bulk-ass')&&$('bulk-owner').value){
    const who=$('bulk-owner').value;const n=sel.size;
    [...sel].forEach(id=>Repo.setOwner(id,who));
    toast(`أسندنا ${n} خريج لـ ${esc(memberName(who))}`);sel.clear();renderList();return;
  }
  if(e.target.closest('#bulk-apply')){
    const stt=$('bulk-status').value;const n=sel.size;
    let lastClear=0;
    [...sel].forEach(id=>{const st=stateOf(id);if(st&&st.last&&stt==='new')lastClear++;Repo.setState(id,stt)});
    toast(`حدّثنا ${n} خريج إلى «${STATUS[stt].label}»${lastClear?` (مسحنا آخر تواصل لـ ${lastClear})`:''}`);
    sel.clear();renderList();return;
  }
});

/* ================= Tabs & router ================= */
const TABS=['grads','sessions','trash','settings'];
function switchTab(tab){
  if(!TABS.includes(tab))tab='grads';
  U.tab=tab;saveUI();
  TABS.forEach(t=>{const p=$('page-'+t);p&&p.classList.toggle('on',t===tab)});
  $('nav').querySelectorAll('button').forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle('on',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});
  renderAll();
}
$('nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)switchTab(b.dataset.tab)});
$('backdrop').addEventListener('click',()=>{closeDrawer();closeModal()});

/* ================= renderAll ================= */
function renderList(){
  const rows=visible(),di=dupInfo(rows);
  if(MQ.matches){$('tbl-host').innerHTML='';renderCards(rows,di)}
  else{$('cards-host').innerHTML='';renderTable(rows,di)}
}
function renderAll(){
  if(sweepPending())Store.save();
  initToolbar();
  renderStats();
  renderEvent();
  renderMemberPicker();
  renderFilters();
  renderList();
  renderPend();
  renderStrip();
  renderReminders();
  renderSessions();
  renderTrashPage();
  renderSettingsPage();
}

/* ================= Test panel (?test=1) ================= */
function initTestPanel(){
  const tb=$('testbox');
  if(!IS_TEST){tb.remove();return}
  tb.hidden=false;
  $('t-date').value=U.simDate||riyadhToday();
  $('t-date').addEventListener('change',e=>{U.simDate=e.target.value||null;saveUI();renderAll()});
  $('t-prev').onclick=()=>{U.simDate=addDays($('t-date').value||riyadhToday(),-1);$('t-date').value=U.simDate;saveUI();renderAll()};
  $('t-next').onclick=()=>{U.simDate=addDays($('t-date').value||riyadhToday(),1);$('t-date').value=U.simDate;saveUI();renderAll()};
  $('t-real').onclick=()=>{U.simDate=null;$('t-date').value=riyadhToday();saveUI();renderAll()};
  $('t-reset').onclick=()=>{
    openModal(`<h3>إعادة البيانات التجريبية</h3><p class="sub">بنمسح ما عدّلته ونرجع العرض التجريبي الأصلي.</p>
      <div class="mrow" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-mclose="1">إلغاء</button><button class="btn danger" id="tr-go">نعم</button></div>`);
    $('tr-go').onclick=()=>{try{localStorage.removeItem(KEY);localStorage.removeItem(VERKEY);}catch(err){}location.reload()};
  };
  if(IS_DEV){const r=$('t-run');r.hidden=false;r.onclick=runDevTests}
}

/* ================= Waves canvas ================= */
function wavesCanvas(){
  const c=$('waves');if(!c)return;
  const resize=()=>{c.width=innerWidth;c.height=innerHeight};
  resize();
  addEventListener('resize',resize);
}

/* ================= Boot ================= */
function init(){
  bootStore();
  const swept=sweepPending();
  const sweptTrash=trashSweep();
  batchGC();
  if(swept||sweptTrash)Store.save();
  if(!D.members.some(m=>m.id===me())||!me())U.activeMemberId=D.members[0].id;
  renderAll();
  switchTab(U.tab||'grads');
  initWizard('grads');
  initWizard('settings');
  initTestPanel();
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
      if(Store.syncFromStorage()){renderAll();return}
      const c=sweepPending();
      if(c){Store.save();toast('ألغينا إرسالات «قيد الإرسال» مضت عليها المهلة — عدنا للحالة السابقة');renderAll()}
    }
  });
  addEventListener('focus',()=>{if(Store.syncFromStorage()){renderAll();return}const c=sweepPending();if(c){Store.save();renderAll()}});
  addEventListener('pageshow',()=>{if(Store.syncFromStorage()){renderAll();return}const c=sweepPending();if(c){Store.save();renderAll()}});
  addEventListener('beforeunload',()=>{clearTimeout(saveT);saveNow()});
  wavesCanvas();
  document.querySelectorAll('[data-ic]').forEach(el=>{el.innerHTML=ICONS[el.dataset.ic]||''});
}

init();

/* ================= window export + dev harness (?dev=1) ================= */
window.FTC={
  data:()=>D,
  norm:norm,highlight:highlight,
  phoneCanonical:phoneCanonical,emailCanonical:emailCanonical,linkedinCanonical:linkedinCanonical,cleanContact:cleanContact,
  schedCheck:schedCheck,conflictsOn:conflictsOn,nextFree:nextFree,
  Importer:Importer,Tmpl:Tmpl,repo:Repo,
  retentionLevel:retentionLevel,
  saveNow:saveNow
};
function runDevTests(){
  const box=document.createElement('div');
  const out=[];let pass=0,fail=0;
  const t=(name,cond,extra)=>{
    if(cond){pass++;out.push(`<div class="msg ok">${ic('check')}<span>✓ ${esc(name)}</span></div>`)}
    else{fail++;out.push(`<div class="msg error">${ic('alert')}<span>✗ ${esc(name)}</span><span class="sub">${esc(extra||'')}</span></div>`)}
  };
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

  /* --- norm --- */
  const nm=norm('نورَةُ الشَّهريّ');t('norm يطيّح التشكيل',nm==='نوره الشهري',nm);
  t('norm يوحّد الأرقام',norm('٠٥٥')==='055',norm('٠٥٥'));
  t('دمج المسافات',norm('سارة  القحطاني ')==='ساره القحطاني');

  /* --- cleanliness tables --- */
  const phoneCases=[['0551234870','0551234870'],['+966551234870','0551234870'],['05 51 234 870','0551234870'],['٠٥٥١٢٣٤٨٧٠','0551234870'],['+96 6551234870','0551234870'],['0551234',''],];
  phoneCases.forEach(([inp,exp])=>{
    const r=phoneCanonical(inp);
    t('phone '+inp,((r||'')===exp)&&(!exp||r&&cleanContact('phone',inp).ok),'got '+r);
  });
  const emailCases=[['a@b.com',1],['a@ب Privatization.com',0],['a..b@gmail.com',1],['A@Gmail.Com',1],['a@gmail,com',0]];
  emailCases.forEach(([inp,okk])=>{
    const cl=cleanContact('email',inp);
    t('email '+inp,(!!(cl&&cl.ok))===!!okk,cl&&cl.value);
  });
  const liCases=[['https://www.linkedin.com/in/ahmad-z/',1],['linkedin.com/in/ahmad-z',1],['@ahmad-z',1],['ahmad',0]];
  liCases.forEach(([inp,okk])=>{
    const cl=cleanContact('linkedin',inp);
    t('linkedin '+inp,(!!(cl&&cl.ok))===!!okk,cl&&cl.value);
  });

  /* --- highlight --- */
  t('highlight يميّز الطابق التشكيلي',highlight('نورَةُ الشَّهريّ','نوره الشهري').includes('<mark>'),'');
  t('highlight أحلى من نفس الادحاء',!highlight('نورة','سارة').includes('<mark>'),'');

  /* --- schedCheck pure --- */
  const T='2026-03-03';
  [
    [{o:{date:T,time:'19:00',dur:60},nowMin:600,today:T,w:false,win:['16:00','22:00']},0,'وقت سليم'],
    [{o:{date:T,time:'15:00',dur:60},nowMin:600,today:T,w:false,win:['16:00','22:00']},1,'خارج النطاق قبل'],
    [{o:{date:T,time:'21:30',dur:60},nowMin:600,today:T,w:false,win:['16:00','22:00']},1,'تتجاوز النطاق بعد'],
    [{o:{date:T,time:'12:00',dur:60},nowMin:721,today:T,w:false,win:['16:00','22:00']},1,'وقت فات اليوم'],
    [{o:{date:T,time:'12:00',dur:60},nowMin:700,today:T,w:false,win:['16:00','22:00']},0,'قبل 20 دقيقة يرحم'],
  ].forEach(([caseObj,expErr,label])=>{
    const c=caseObj.o;
    const r=schedCheck({date:c.date,time:c.time,dur:c.dur,nowMin:caseObj.nowMin,todayIso:caseObj.today,warnFriday:caseObj.w,window:caseObj.win});
    t('schedCheck '+label,r.errors.length===expErr,'errors:'+r.errors.join('|'));
  });

  /* --- conflictsOn / nextFree --- */
  const before=D.sessions.slice();
  const g0=liveGrads()[0];
  D.sessions=[{id:'t1',gradId:g0.id,eventId:'e1',date:T,start:'19:00',dur:60,topic:'',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:null}];
  t('conflictsOn يلمس التعارض',conflictsOn(T,toMin('19:30'),toMin('20:30')).length===1);
  const nf=nextFree(T,toMin('19:30'),60);
  t('nextFree يقفز بعد الجلسة إلى 20:00',nf===20*60,'got '+nf);
  D.sessions=before;

  /* --- Importer parse --- */
  const sl=Importer.splitLine('فهد الحربي\t0534410098\tfahad@x.com');
  t('splitLine تاب',sl.cells.length===3,JSON.stringify(sl.cells));
  const sl2=Importer.splitLine('دُعت "التقنية، للنادي"');
  t('splitLine ينمي النص',true);
  const hd=Importer.guessHeader([{cells:['الاسم','الجوال','الإيميل']},{cells:['فهد','0534410098','f@x.com']}]);
  t('guessHeader يعرف العناوين',!!hd&&hd.map&&hd.map['0']==='name'&&hd.map['1']==='phone',JSON.stringify(hd&&hd.map));
  const mp=Importer.guessDefaultMap(['name','phone','email']);
  t('guessDefaultMap',mp[0]==='name'&&mp[1]==='phone');
  t('yearClean هجري/مغربي',Importer.yearClean('١٤٤٧')===1447||Importer.yearClean('1447')===1447);
  const ef=Importer.extractFields('فهد الحربي 0534410098 fahad@x.com 2023');
  t('extractFields سطر حر',ef.name.includes('فهد')&&ef.phones[0]==='0551234870'&&ef.emails[0]=='fahad@x.com'&&ef.year==='2023');

  /* --- Tmpl --- */
  const v=Tmpl.renderPlain('initial',templateVarsFor(gradById('g1')||{},null));
  t('renderPlain يزيّل المتغيرات Nاقصى الصياغة',!/\{[^{}]+\}/.test(v.out),v.out);
  t('renderTempl يرمق المتغيرات',renderTemplate('booking',{'التاريخ':'خ', 'الوقت':'خ','المدة':'خ','اسم الفعالية':'خ','موضوع الجلسة':'خ','مكان/رابط':'خ','الاسم':'خ'}).out.includes('خ'));

  /* --- retention --- */
  const R=settings().trashRetentionDays;
  t('retentionLevel keep',retentionLevel(addDays(addDays(today(),0),-(R-10)),today())==='keep');
  t('retentionLevel purge',retentionLevel(addDays(today(),-(R+1)),today())==='purge');

  /* --- repo invariants --- */
  try{
    const gg=liveGrads()[0];
    const st0=stateOf(gg.id).status;
    Repo.setState(gg.id,'wait');
    t('Repo.setState يكتب الحالة',stateOf(gg.id).status==='wait');
    Repo.setState(gg.id,st0);
    const its=Date.now();
    const iv=Repo.invite(gg.id,'initial','whatsapp');
    t('Repo.invite يصنع sending',iv.ok&&iv.inv.status==='sending');
    Repo.inviteConfirm(iv.inv.id);
    t('Repo.inviteConfirm',invById(iv.inv.id).status==='confirmed');
    const st1=stateOf(gg.id);
    Repo.inviteCancel(iv.inv.id,false);
    t('cancel يعيد الحالة السابقة',invById(iv.inv.id).status==='cancelled'&&stateOf(gg.id).status===st1);
  }catch(e){t('repo flow يشدّ بدون رمي',(false),(e&&e.message||e))}

  /* --- undo stack --- */
  t('Undo stack بحد أقصى',Undo.stack.length<=20+1);

  const boxHost=$('testbox')||document.body;
  box.id='dev-results';
  box.style.cssText='padding:12px;display:flex;flex-direction:column;gap:6px;max-height:340px;overflow:auto';
  box.innerHTML=`<div class="lbl"><b>فحوص آلية: ${pass} ناجح، ${fail} فاشل</b></div>`+out.join('');
  boxHost.after(box);
}

