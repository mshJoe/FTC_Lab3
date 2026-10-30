/* ================= Quick add ================= */
$('qa-add').addEventListener('click',()=>{
  const v=$('qa-input').value.trim();
  if(!v)return;
  const f=Importer.extractFields(v);
  if(!f.name&&!(f.phones.length||f.emails.length||f.linkedins.length)){toast('اكتب اسم مع رقم، أو الصق سطر كامل مثل: فهد الحربي 0534410098');return}
  const cand={name:f.name||'',phones:f.phones,emails:f.emails,linkedins:f.linkedins,year:f.year||'',major:'',company:'',role:''};
  const dup=f.phones.length||f.emails.length||f.linkedins.length?findMatchByContacts(cand):null;
  if(dup){
    if(dup.doNotContact){toast(`«${(dup.name)}» مستثنى بناءً على طلبه — ما نضيف وسيلة تواصل له`);return}
    const have=new Set(dup.contacts.map(c=>compactKey(c.type,c.value)));
    const candCts=[...f.phones.map(p=>({type:'phone',value:p})),...f.emails.map(e=>({type:'email',value:e})),...f.linkedins.map(l=>({type:'linkedin',value:l}))];
    const adds=candCts.filter(c=>!have.has(compactKey(c.type,c.value)));
    const n=adds.length?Repo.addContacts(dup.id,adds):0;
    if(n)toast(`«${(dup.name)}» موجود مسبقاً — أضفنا ${n===1?'وسيلة تواصل':'وسيلتين'} جديدة لملفه`,{label:'فتح الملف',fn:()=>{openDrawer(dup.id);renderAll()}});
    else toast(`«${(dup.name)}» موجود مسبقاً ومعلوماته مطابقة — ما نضيفه ثاني`,{label:'فتح الملف',fn:()=>openDrawer(dup.id)});
    $('qa-input').value='';
    if(n)renderAll();
    return;
  }
  const g=Repo.addGrad({
    name:f.name,year:f.year||Number(riyadhToday().slice(0,4)),major:'',company:'',role:'',
    contacts:[...f.phones.map(p=>({type:'phone',value:p})),...f.emails.map(e=>({type:'email',value:e})),...f.linkedins.map(l=>({type:'linkedin',value:l}))]
  },'manual');
  if(f.emails.length||f.phones.length)touchVerified(g.id);
  $('qa-input').value='';
  toast(`أضفنا «${(g.name)}» — الدعوة جاهزة في صف الخريج`);
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
  if(e.target.closest('#bulk-me')){const n=sel.size;[...sel].forEach(id=>Repo.setOwner(id,me()));toast(`أسندنا ${n} خريج لـ ${(me())}`);sel.clear();renderList();return}  if(e.target.closest('#bulk-ass')&&$('bulk-owner').value){
    const who=$('bulk-owner').value;const n=sel.size;
    [...sel].forEach(id=>Repo.setOwner(id,who));
    toast(`أسندنا ${n} خريج لـ ${(memberName(who))}`);sel.clear();renderList();return;
  }
  if(e.target.closest('#bulk-apply')){
    const stt=$('bulk-status').value;const n=sel.size;
    let lastClear=0;
    [...sel].forEach(id=>{const st=stateOf(id);if(st&&st.last&&stt==='new')lastClear++;Repo.setState(id,stt)});
    toast(`حدّثنا ${n} خريج إلى «${STATUS[stt].label}»${lastClear?` (مسحنا آخر تواصل لـ ${lastClear})`:''}`);
    sel.clear();renderList();return;
  }
});

/* Q-04: names in the pending-strip (and reminder rows) must open the alumnus drawer */
['pend-host','reminders'].forEach(id=>{
  const el=$(id);if(!el)return;
  el.addEventListener('click',e=>{
    const b=e.target.closest('[data-drw]');if(b){openDrawer(b.dataset.drw);return}
  });
});

/* ================= Tabs & router ================= */
const TABS=['grads','sessions','trash','settings'];
function applyTabUI(tab){
  TABS.forEach(t=>{const p=$('page-'+t);p&&p.classList.toggle('on',t===tab)});
  const btns=[...$('tabbar').querySelectorAll('button')];
  btns.forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1});
  const act=btns.find(b=>b.dataset.tab===tab);
  if(act)act.scrollIntoView({inline:'nearest',block:'nearest'});
}
function switchTab(tab){
  if(!TABS.includes(tab))tab='grads';
  U.tab=tab;saveUI();
  applyTabUI(tab);
  renderAll();
}
/* Q-01: clicking a tab must switch pages */
$('tabbar').addEventListener('click',e=>{
  const b=e.target.closest('button[data-tab]');if(!b)return;
  switchTab(b.dataset.tab);
});
/* R-06: roving tabindex + RTL-aware arrows + Home/End on the functional tablist */
$('tabbar').addEventListener('keydown',e=>{
  const btns=[...$('tabbar').querySelectorAll('button')];
  const i=btns.indexOf(document.activeElement);
  if(i<0)return;
  let next=null;
  /* RTL: ArrowRight moves toward the LAST tab (visually right = later in RTL reading? visually left)...
     In an RTL bar the first (focused-edge) tab is on the right; ArrowRight shifts focus to the NEXT DECLARED tab (visually left). */
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
    const dir=e.key==='ArrowLeft'?-1:1;
    next=btns[(i+dir+btns.length)%btns.length];
  }
  else if(e.key==='Home')next=btns[0];
  else if(e.key==='End')next=btns[btns.length-1];
  else return;
  e.preventDefault();
  if(next){next.focus();next.click()}
});
/* bottom nav mirrors the FTC portal for visual identity — routes nothing */
$('nav').addEventListener('click',e=>{
  const b=e.target.closest('button[data-tab]');if(!b)return;
  toast('هذا الشريط مطابق شريط بوابة FTC — أقسام «اللابات، المهام، المجتمع» تعمل من بوابة النادي، والخريجين تعمل هنا');
});
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

/* ================= Test panel (?test=1) with seed scenarios ================= */
function initTestPanel(){
  const tb=$('testbox');
  if(!IS_TEST){tb.remove();return}
  tb.hidden=false;
  $('t-date').value=U.simDate||riyadhToday();
  $('t-date').addEventListener('change',e=>{U.simDate=e.target.value||null;saveUI();renderAll()});
  $('t-prev').onclick=()=>{U.simDate=addDays($('t-date').value||riyadhToday(),-1);$('t-date').value=U.simDate;saveUI();renderAll()};
  $('t-next').onclick=()=>{U.simDate=addDays($('t-date').value||riyadhToday(),1);$('t-date').value=U.simDate;saveUI();renderAll()};
  $('t-real').onclick=()=>{U.simDate=null;$('t-date').value=riyadhToday();saveUI();renderAll()};
  /* scenario select + one-shot forced reseed */
  const sc=Object.entries(SCENARIOS_AR).map(([k,v])=>`<option value="${k}"${(U.scenario||'full')===k?' selected':''}>${v}</option>`).join('');
  $('t-scenario').innerHTML=sc;
  $('t-scenario').value=U.scenario||'full';
  $('t-scenario').addEventListener('change',e=>{U.scenario=e.target.value||'full';saveUI()});
  $('t-reset').onclick=()=>{
    openModal(`<h3>${ic('reset')} إعادة البيانات التجريبية</h3><p class="sub">بنمسح البيانات الحالية ونرجّع بيانات العرض التجريبي حسب السيناريو المختار (${esc(SCENARIOS_AR[$('t-scenario').value]||SCENARIOS_AR.full)}). هل أنت متأكد؟</p>
      <div class="mrow" style="justify-content:flex-end;margin-top:10px"><button class="btn" data-mclose="1">إلغاء</button><button class="btn danger" id="tr-go">نعم، أعد التهيئة</button></div>`);
    $('tr-go').onclick=()=>{
      U.scenario=$('t-scenario').value||'full';saveUI();
      /* R-08: clear the current store (never the legacy key) + one-shot flag so bootStore seeds the chosen scenario */
      try{localStorage.removeItem(KEY);localStorage.removeItem(VERKEY)}catch(err){}
      try{sessionStorage.setItem('ftc-force-seed','1')}catch(err){}
      location.reload();
    };
  };
  if(IS_DEV){const r=$('t-run');r.hidden=false;r.onclick=runDevTests;if(QP.get('autorun')==='1')runDevTests()}
}

/* ================= Background waves (portal look — restored from ftc-graduates-v2.html) ================= */
function wavesCanvas(){
  const c=$('waves');if(!c)return;
  const cx=c.getContext('2d');
  if(!cx)return;
  function drawWaves(){
    const dpr=Math.min((typeof devicePixelRatio==='undefined'?1:devicePixelRatio)||1,2),W=innerWidth,H=innerHeight;
    c.width=W*dpr;c.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,W,H);
    cx.lineWidth=1.1;cx.strokeStyle='rgba(176,140,255,0.075)';
    const mid=H*0.42,gap=40,n=Math.ceil(H/gap)+2;
    for(let k=0;k<n;k++){
      const y0=k*gap-10;const side=y0<mid?-1:1;const strength=Math.max(0,1-Math.abs(y0-mid)/(H*0.9));
      cx.beginPath();
      for(let x=0;x<=W;x+=6){
        const t=(x-W/2)/(W*0.32);const bump=Math.exp(-t*t);
        let y=y0+side*bump*34*strength;
        if(k%3===1){[0.42,0.5,0.58].forEach(p=>{const nx=W*p;y+=Math.max(0,1-Math.abs(x-nx)/12)*9*bump})}
        x===0?cx.moveTo(x,y):cx.lineTo(x,y);
      }
      cx.stroke();
    }
  }
  let rz;
  addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(drawWaves,120)});
  drawWaves();
}

/* ================= Boot ================= */
async function init(){
  await bootStore();
  const swept=sweepPending();
  const sweptTrash=trashSweep();
  batchGC();
  if(swept||sweptTrash)Store.save();
  if(!D.members.some(m=>m.id===me())||!me())U.activeMemberId=D.members[0].id;
  renderAll();
  switchTab(U.tab||'grads');
  initWizard('grads');
  initTestPanel();
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
      if(Store.syncFromStorage()){renderAll();return}
      const c=sweepPending();
      if(c){Store.save();toast('ألغينا الإرسالات اللي مضت عليها مهلة التأكيد — رجعنا الحالات كما كانت');renderAll()}
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
  saveNow:saveNow,
  safeUrl:safeUrl,validateBackup:validateBackup,csvSafe:csvSafe
};
async function runDevTests(){
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
  const liCases=[['https://www.linkedin.com/in/ahmad-z/',1],['linkedin.com/in/ahmad-z',1],['@ahmad-z',1],['ahmad',1],['أحمد',0],['',0]];
  liCases.forEach(([inp,okk])=>{
    const cl=cleanContact('linkedin',inp);
    t('linkedin '+inp,(!!(cl&&cl.ok))===!!okk,cl&&cl.value);
  });

  /* --- highlight --- */
  t('highlight يميّز الطابق التشكيلي',highlight('نورَةُ الشَّهريّ','نوره الشهري').includes('<mark>'),'');
  t('highlight أحلى من نفس الادحاء',!highlight('نورة','سارة').includes('<mark>'),'');

  /* --- schedCheck pure (out-of-window is a WARN, not an error) --- */
  const T='2026-03-03';
  [
    [{time:'19:00',dur:60,nowMin:600,w:false},0,0,'وقت سليم'],
    [{time:'15:00',dur:60,nowMin:600,w:false},0,1,'خارج النطاق قبل'],
    [{time:'21:30',dur:60,nowMin:600,w:false},0,1,'تتجاوز النطاق بعد'],
    [{time:'12:00',dur:60,nowMin:740,w:false},1,1,'وقت فات اليوم'],
    [{time:'12:00',dur:60,nowMin:700,w:false},0,1,'قبل الموعد بقليل'],
  ].forEach(([caseObj,expErr,expWarn,label])=>{
    const r=schedCheck({date:T,time:caseObj.time,dur:caseObj.dur,nowMin:caseObj.nowMin,todayIso:T,warnFriday:caseObj.w,window:['16:00','22:00']});
    t('schedCheck '+label,r.errors.length===expErr&&r.warns.length===expWarn,'e:'+r.errors.join('|')+' w:'+r.warns.length);
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
  t('extractFields سطر حر',ef.name.includes('فهد')&&ef.phones[0]==='0534410098'&&ef.emails[0]==='fahad@x.com'&&ef.year==='2023',JSON.stringify([ef.name,ef.phones,ef.emails,ef.year]));

  /* --- Tmpl (T7) --- */
  const v=Tmpl.renderPlain('initial',templateVarsFor(gradById('g1')||{},null));
  t('renderPlain يزيّل المتغيرات الناقصة',!/\{[^{}]+\}/.test(v.out),v.out);
  const v28=Tmpl.renderPlain('initial',{...templateVarsFor(gradById('g28')||{},null)});
  t('الجهة fallback لخريج بدون جهة',v28.out.includes('عملك الحالي'),v28.out.slice(0,120));
  const th=Tmpl.renderPlain('thanks',templateVarsFor(gradById('g28')||{},null,'thanks')).out;
  t('thanks موضوع fallback «الجلسة»',th.includes('الجلسة')&&th.includes('{موضوع الجلسة}')===false,th.slice(0,80));
  const bk=Tmpl.renderPlain('booking',{'التاريخ':'خ','الوقت':'خ','المدة':'خ','اسم الفعالية':'خ','موضوع الجلسة':'خ','المسؤول':'خ','مكان/رابط':'خ','الاسم':'خ'});
  t('booking يرمق كل متغيراته',bk.out.includes('خ'),bk.out.slice(0,80));

  /* --- T5: sanitizeData repairs a broken blob --- */
  let orig=null;
  try{
    const broken={v:2,data:{grads:[{id:'x1',name:'تجربة'}],sessions:[{id:'sx',gradId:'ghost',date:'2026-01-01'}],
      states:{'x1|e9':{gradId:'x1',eventId:'e9',status:'مجهول',last:null,owner:null},'badkey':1},
      timeline:[{ts:'not-a-date',kind:'x'}],events:[],invitations:[{id:'i1',gradId:'x1',eventId:'e-no',kind:'initial',status:'?!',createdAt:''}]},savedAt:'2026-01-01T00:00:00Z'};
    const fixes=sanitizeData(broken.data);
    t('sanitize يعالج الحالات المجهولة',(broken.data.states['x1|e9']||{}).status==='new');
    t('sanitize ينظف مفاتيح الحالات المكسورة',!('badkey'in broken.data.states));
    t('sanitize يصنع فعالية مفتوحة',broken.data.events.some(e=>e.status==='open'));
    t('sanitize يسقط دعوة لحدث غير موجود',broken.data.invitations.length===0);
    t('sanitize يبلّغ عن الإصلاحات',Array.isArray(fixes)&&fixes.length>0);
  }catch(e){t('sanitize بدون انفجار',false,e&&e.message||e)}

  /* --- T9: key-based snapshots survive array reassignment --- */
  try{
    const before=D.grads.slice(),snap=snapArr('grads');
    const moved=before.slice(1);D.grads=moved;
    snap.undo();
    t('snapArr يرجّع المصفوفة بعد إسناد جديد',D.grads.length===before.length&&D.grads[0].id===before[0].id);
    D.grads=before;
  }catch(e){t('snapArr بدون انفجار',false,e&&e.message||e)}

  /* --- T8: prevEventHint --- */
  try{
    const g31=gradById('g31')||liveGrads().find(g=>g.id==='g31');
    const g1=gradById('g1')||liveGrads()[0];
    if(g31)t('g31 تلميح فعالية سابقة',typeof prevEventHint(g31)==='string'&&prevEventHint(g31).includes('فعالية سابقة'));
    if(g1)t('g1 بلا تلميح (دُعيت في الحالية فقط)',prevEventHint(g1)===null);
  }catch(e){t('prevEventHint بدون انفجار',false,e&&e.message||e)}

  /* --- demo reminders: g9 count 2, g14 cooldown --- */
  try{
    const ev=activeEvent();
    if(ev){
      const i9=remindersInfo('g9',ev.id),i14=remindersInfo('g14',ev.id);
      t('g9 تذكيرين',i9.count===2,'count='+i9.count);
      t('g14 تذكير واحد وبتهدئة',i14.count===1&&diffDays(today(),dayOfISO(i14.lastAt))<3,'count='+i14.count);
    }
  }catch(e){t('remindersInfo بدون انفجار',false,e&&e.message||e)}

  /* --- T5: csvSafe --- */
  t('csvSafe يعزل صيغ الجداول',csvSafe('=cmd|ا').startsWith('"\'=')&&csvSafe('عادي')=='"عادي"',csvSafe('=True'));

  /* --- retention --- */
  const R=settings().trashRetentionDays;
  t('retentionLevel keep',retentionLevel(addDays(addDays(today(),0),-(R-10)),today())==='keep');
  t('retentionLevel purge',retentionLevel(addDays(today(),-(R+1)),today())==='purge');

  /* --- repo invariants --- */
  try{
    const gg=liveGrads().find(g=>{const s=stateOf(g.id);return s&&s.status==='new'&&confirmedInitial(g.id,(activeEvent()||{}).id)==null})||liveGrads()[0];
    const st0=stateOf(gg.id).status;
    Repo.setState(gg.id,'wait');
    t('Repo.setState يكتب الحالة',stateOf(gg.id).status==='wait');
    Repo.setState(gg.id,st0);
    const iv0=Repo.invite(gg.id,'initial','whatsapp');
    t('Repo.invite يصنع sending',iv0.ok&&iv0.inv&&iv0.inv.status==='sending',iv0.ok?'':'reason='+(iv0.reason||'?'));
    const stMid=stateOf(gg.id).status;
    Repo.inviteCancel(iv0.inv.id,false);
    t('cancel يعيد الحالة السابقة للدعوة',invById(iv0.inv.id).status==='cancelled'&&stateOf(gg.id).status===st0&&stMid==='sending',
      'inv='+invById(iv0.inv.id).status+' st='+stateOf(gg.id).status);
    const iv=Repo.invite(gg.id,'initial','whatsapp');
    t('ياخذ دعوة ثانية بعد الإلغاء',iv.ok,'reason='+(iv.reason||'?'));
    Repo.inviteConfirm(iv.inv.id);
    t('Repo.inviteConfirm',invById(iv.inv.id).status==='confirmed'&&stateOf(gg.id).status==='wait');
  }catch(e){t('repo flow يشدّ بدون رمي',(false),(e&&e.message||e))}

  /* --- undo stack --- */
  t('Undo stack بحد أقصى',Undo.stack.length<=20+1);

  /* ============ Fix-pass tests (R items + N-01) ============ */
  /* R-02: XSS toast */
  try{
    toast('<img src=x onerror=window.__xss=1>');
    const tEl=$('toast');
    t('toast يرفض HTML',!tEl.querySelector('img')&&tEl.textContent.includes('<img src=x'),tEl.textContent.slice(0,50));
  }catch(e){t('toast بالاسم الفاسد بدون انفجار',false,e&&e.message||e)}

  /* R-03: safeUrl */
  t('safeUrl يرفض javascript:',safeUrl('  javascript:alert(1)')==='',safeUrl('javascript:alert(1)'));
  t('safeUrl يرفض data:',safeUrl('data:text/html;base64,xxx')==='');
  t('safeUrl يمرر https',safeUrl('https://example.com/a.pdf')==='https://example.com/a.pdf');
  t('safeUrl يمرر http',safeUrl('http://example.com')==='http://example.com');

  /* R-04/R-16: invite, undo, re-invite — on a runtime-created victim so demo data stays intact */
  let victim=null;
  try{
    victim=Repo.addGrad({name:'اختبار مؤقت: ضحية الفحوص',year:2026,contacts:[{type:'phone',value:'0551112223'}]},'manual');
    const stBefore=stateOf(victim.id).status;
    const iv=Repo.invite(victim.id,'initial','whatsapp');
    t('دعوة لخريج جديد تنجح',iv.ok===true,'');
    t('الحالة صارت sending',stateOf(victim.id).status==='sending');
    const lastU=Undo.stack[Undo.stack.length-1];
    lastU.fn();
    t('تراجع الدعوة يرجع الحالة الأصلية',stateOf(victim.id).status===stBefore,'st='+stateOf(victim.id).status);
    t('تراجع الدعوة يمسح الدعوة المعوقة',!invById(iv.inv.id)||invById(iv.inv.id).status!=='sending');
    const iv2=Repo.invite(victim.id,'initial','whatsapp');
    t('ممكن دعوة جديدة بعد التراجع',iv2.ok===true,'reason='+(iv2.ok?'':iv2.reason));
    /* R-16 defense: while pending, a second invite (initial or reminder) is refused */
    const iv3=Repo.invite(victim.id,'reminder','whatsapp');
    t('ما تعطي تذكير والدعوة معوقة',iv3.ok===false&&iv3.reason==='pending','reason='+(iv3.reason||'?'));
    /* auto owner assignment never overrides an existing owner */
    Repo.inviteConfirm(iv2.inv.id);
    const autoOwner=stateOf(victim.id).owner;
    t('الإسناد التلقائي يعمل على فاضي',!!autoOwner,'owner='+autoOwner);
    Repo.setOwner(victim.id,'ريم');
    Repo.setState(victim.id,'no',{quiet:true});
    t('الإسناد التلقائي ما يكتب فوق مسؤول موجود',stateOf(victim.id).owner==='ريم','owner='+stateOf(victim.id).owner);
  }catch(e){t('تدفق الدعوة/التراجع بدون انفجار',false,e&&e.message||e)}

  /* R-11: reminder rules */
  try{
    const r1=Repo.invite('g7','reminder','whatsapp');/* g7 = وافق */
    t('تذكير ممنوع لغير بانتظار الرد',!r1.ok&&r1.reason==='state','reason='+(r1.reason||'?'));
    const r2=Repo.invite('g9','reminder','whatsapp');/* 2 reminders already */
    t('لمى ممنوعة بالحد',!r2.ok&&r2.reason==='limit','reason='+(r2.reason||'?'));
    const r3=Repo.invite('g14','reminder','whatsapp');/* reminder 1 day ago */
    t('تركي ممنوع بالتهدئة',!r3.ok&&r3.reason==='cooldown','reason='+(r3.reason||'?'));
    const rr=liveGrads().find(g=>g.id==='g2');/* 5 days in wait, 0 reminders → allowed */
    const r4=Repo.invite('g2','reminder','whatsapp');
    t('محمد العتيبي (5 أيام انتظار) يستلم تذكير',r4.ok===true,'reason='+(r4.ok?'':r4.reason));
    if(r4.ok)Repo.inviteCancel(r4.inv.id,false);
  }catch(e){t('فحوص التذكير بدون انفجار',false,e&&e.message||e)}

  /* R-10: DNC scheduling refusal */
  try{t('جدولة مستثنى مرفوضة',Repo.addSession({gradId:'g27',date:addDays(today(),3),start:'19:00',dur:45,topic:''})===null)}
  catch(e){t('R10 بدون انفجار',false,e&&e.message||e)}

  /* purge-then-undo restores everything (R-04-family / T9) */
  try{
    const g=Repo.addGrad({name:'اختبار مؤقت: محذوف الفحوص',contacts:[{type:'email',value:'purgedx@example.com'}]},'manual');
    Repo.setState(g.id,'yes',{quiet:true});
    const evId=(activeEvent()||{}).id;
    Repo.purgeGrad(g.id);
    t('الحذف النهائي شال السجل',!gradById(g.id));
    const lastU2=Undo.stack[Undo.stack.length-1];
    lastU2.fn();
    const back=gradById(g.id);
    t('تراجع الحذف النهائي رجّع الخريج',!!back&&back.name==='اختبار مؤقت: محذوف الفحوص');
    t('تراجع الحذف رجّع حالته',!!back&&(D.states[g.id+'|'+evId]||{}).status==='yes','group');
    /* cleanup the victim records (silent) so the demo set stays 32 */
    Repo.purgeGradSilent(g.id);saveNow();
  }catch(e){t('purge-then-undo بدون انفجار',false,e&&e.message||e)}
  if(victim)try{Repo.purgeGradSilent(victim.id);saveNow()}catch(e2){}

  /* R-12: validateBackup */
  try{
    t('validateBackup يرفض كائناً فارغاً',!validateBackup({v:2,data:{}}).ok,'errors='+JSON.stringify(validateBackup({v:2,data:{}}).errors.slice(0,3)));
    t('validateBackup يتقبل نسخة حقيقية',validateBackup({v:2,savedAt:nowISO(),data:JSON.parse(JSON.stringify(D))}).ok);
    t('validateBackup يرفض إصدار غلط',!validateBackup({v:9,data:JSON.parse(JSON.stringify(D))}).ok);
  }catch(e){t('validateBackup بدون انفجار',false,e&&e.message||e)}

  /* R-08: one-shot flag skips legacy migration (in-page: real storage available) */
  try{
    const savedEnv=localStorage.getItem(KEY);
    const backupsBefore=[];Object.keys(localStorage).filter(k=>k.startsWith('ftc-grads-v2-backup-')).forEach(k=>backupsBefore.push(k));
    sessionStorage.setItem('ftc-force-seed','1');
    await bootStore();
    t('الراية أحادية الاستخدام تنمسح',sessionStorage.getItem('ftc-force-seed')===null);
    t('إعادة التهيئة مزّعت سيناريو كامل (32 خريجاً)',D.grads.length===32&&D.demo===true,'n='+D.grads.length);
    t('إعادة التهيئة ما استدعت الترحيل القديم',D.events.length===2&&D.events[0].id==='e0'&&D.events[0].status==='closed');
    /* restore the pre-test working set */
    if(savedEnv){const env=JSON.parse(savedEnv);D=env.data;savedAt=env.savedAt;sanitizeData(D)}
    Object.keys(localStorage).forEach(k=>{if(k.startsWith('ftc-grads-v2-backup-')&&!backupsBefore.includes(k))localStorage.removeItem(k)});
  }catch(e){t('رايه أحادية بدون انفجار',false,e&&e.message||e)}

  /* N-01: drawer invitation pills say «تم التواصل», never participation */
  try{
    const sG5=String(drawerInvites(gradById('g5')));
    t('N-01 صيغة تم التواصل ظاهرة',sG5.includes('تم التواصل'),sG5.slice(0,80));
    t('N-01 لا نص تأكيد مشاركة',!sG5.includes('أكد المشاركة'));
    const sG7=String(drawerInvites(gradById('g7')));
    t('N-01 لون confirmed برتقالي (بانتظار الرد)',sG7.includes('--c:var(--s-wait)'));
  }catch(e){t('N-01 بدون انفجار',false,e&&e.message||e)}

  /* R-05: timeline entries carry ts + kind + actor */
  try{
    const tl5=(D.timeline||[]).filter(x=>x.gradId==='g5');
    t('السجل الزمني لـ g5 موثق',tl5.length>0&&tl5.every(x=>x.ts&&!isNaN(Date.parse(x.ts))&&TL_KIND[x.kind]),'n='+tl5.length);
    t('بعض القيود فيها المسؤول',tl5.some(x=>x.actorId&&memberName(x.actorId)));
  }catch(e){t('فحص السجل الزمني بدون انفجار',false,e&&e.message||e)}

  /* no NaN/undefined may ever leak from status counting */
  try{
    const c=statusCounts();
    t('عدادات الحالات كاملة بلا فراغات',ORDER.every(s=>typeof c[s]==='number'&&isFinite(c[s])),JSON.stringify(c));
  }catch(e){t('statusCounts بدون انفجار',false,e&&e.message||e)}

  const boxHost=$('testbox')||document.body;
  box.id='dev-results';
  box.style.cssText='padding:12px;display:flex;flex-direction:column;gap:6px;max-height:340px;overflow:auto';
  box.innerHTML=`<div class="lbl"><b>فحوص آلية: ${pass} ناجح، ${fail} فاشل</b></div>`+out.join('');
  boxHost.after(box);
}

