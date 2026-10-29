/* ================= UI state ================= */
const F={q:'',statuses:new Set(),year:'',ct:'',owner:'',follow:false,miss:false,sort:{key:'name',dir:1}};
const sel=new Set();
let confirmMode=null,pendingDel=null,flashId=null,purgeConfirm=null;
const sched={gradId:null};
let drawerId=null,drawerEditMode=false,drawerCap=100,drawerNoteOpen=false;
let modalHtml=null;
const MQ=matchMedia('(max-width:759px)');
MQ.addEventListener?.('change',()=>renderAll());
let archF={q:''};
let tplEdit=null,wizState=null;

/* ================= Toast ================= */
let toastT;
function toast(msg,action){
  const t=$('toast');
  t.innerHTML=`${ic('check')}<span>${msg}</span>${action?`<button class="btn sm" id="toast-act">${esc(action.label)}</button>`:''}`;
  t.classList.add('show');
  if(action)$('toast-act').onclick=()=>{action.fn();t.classList.remove('show')};
  clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),action?6500:3600);
}
function copyText(text,okMsg,action){
  const fallback=()=>{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}ta.remove();toast(ok?okMsg:'ما قدرنا ننسخ تلقائياً. حدّد النص وانسخه يدوياً.',ok?action:null)};
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(()=>toast(okMsg,action),fallback)}
    else fallback();
  }catch(e){fallback()}
}

/* ================= Member picker ================= */
let mpBound=false;
function renderMemberPicker(){
  const host=$('mpicker-host');
  host.innerHTML=`<span class="chip ghost"><button id="mp-btn" aria-haspopup="menu" aria-expanded="false" title="الهوية الحالية (متصفحك فقط)">مسجّل كـ: ${esc(me())} ${ic('down')}</button></span>`;
  $('mp-btn').onclick=e=>{
    e.stopPropagation();
    closeMp();
    const m=document.createElement('div');
    m.className='mp-menu';m.setAttribute('role','menu');m.id='mp-menu';
    m.innerHTML=D.members.map(mm=>`<button role="menuitem" class="${mm.id===me()?'on':''}" data-mp="${esc(mm.id)}">${mm.id===me()?ic('check'):'<span style="width:18px"></span>'}${esc(mm.name)}</button>`).join('');
    host.appendChild(m);
    $('mp-btn').setAttribute('aria-expanded','true');
    document.addEventListener('click',mpCloser,{once:true});
  };
  function mpCloser(ev){if(!ev.target.closest('#mp-menu'))closeMp();else{document.addEventListener('click',mpCloser,{once:true})}}
  function closeMp(){const mm=$('mp-menu');if(mm)mm.remove();const b=$('mp-btn');if(b)b.setAttribute('aria-expanded','false')}
  if(!mpBound){
    mpBound=true;
    host.addEventListener('click',e=>{
      if(e.target.closest('#mp-btn'))return;
      const b=e.target.closest('[data-mp]');if(!b)return;
      U.activeMemberId=b.dataset.mp;saveUI();
      toast(`قلنا إنك ${esc(me())} — كل إسناد ورسالة بصفتك عليه`);
      renderAll();
    });
  }
}

/* ================= Header stats ================= */
function statusCounts(){
  const c={};ORDER.forEach(s=>c[s]=0);
  liveGrads().forEach(g=>{const st=stateOf(g.id);c[st?st.status:'new']++});
  return c;
}
function renderStats(){
  const c=statusCounts();
  $('stats').innerHTML=ORDER.map(s=>`<button class="stat ${F.statuses.has(s)?'on':''}" data-stat="${s}" style="--c:var(--s-${s})" aria-pressed="${F.statuses.has(s)}" title="${STATUS[s].label}">
    <span class="stat-n">${c[s]}</span><span class="stat-l"><i class="dot"></i>${STATUS[s].label}</span></button>`).join('');
  const sc=$('sim-chip');
  if(U.simDate&&U.simDate!==riyadhToday()){sc.hidden=false;sc.textContent='تاريخ محاكى: '+new Intl.DateTimeFormat(LOC,{weekday:'long',day:'numeric',month:'long'}).format(parseISO(U.simDate))}else sc.hidden=true;
  $('demo-chip').hidden=!IS_TEST;
  const td=$('trash-dot');
  const trN=D.grads.filter(g=>g.deletedAt).length+D.sessions.filter(s=>s.deletedAt).length;
  td.hidden=!trN;td.textContent=trN;
}

/* ================= Event bar ================= */
function monthsPhrase(days){
  if(days<30)return `قبل ${daysWord(days)}`;
  const m=Math.round(days/30);
  return `قبل ${m===1?'شهر':m===2?'شهرين':m+' أشهر'}`;
}
function prevEventHint(g){
  const e=activeEvent();
  const inv=lastInitialAnyEvent(g.id);
  if(!inv||!e)return null;
  const d=diffDays(riyadhToday(),dayOfISO(inv.confirmedAt||inv.createdAt));
  if(d<=0)return null;
  return `دُعي في فعالية سابقة ${monthsPhrase(d)}`;
}
function renderEvent(){
  const e=activeEvent();
  const c=statusCounts();
  const n=liveGrads().length;
  let h='';
  if(e){
    const contacted=n-c.new;
    const upcoming=D.sessions.filter(s=>!s.deletedAt&&diffDays(s.date,today())>=0).length;
    h=`<div class="ev-main">
        <div class="ev-label">الفعالية الحالية</div>
        <div class="ev-name">${esc(e.name)}</div>
        <div class="ev-meta num">بدأت ${esc(e.startedAt)} · ${upcoming} جلسات قادمة</div>
      </div>
      <div class="ev-progress">
        <div class="txt"><span>تم التواصل مع <b class="num">${contacted}</b> من <b class="num">${n}</b></span><span>وافق/مجدول <b class="num">${c.yes+c.booked}</b> · اعتذر <b class="num">${c.no}</b> · تمت <b class="num">${c.done}</b></span></div>
        <div class="bar" aria-hidden="true">${['booked','done','yes','wait','sending','no','new'].map(s=>c[s]?`<span style="flex:${c[s]};background:var(--s-${s})" title="${STATUS[s].label}: ${c[s]}"></span>`:'').join('')}</div>
      </div>
      <div class="ev-actions"><button class="btn danger" id="ev-close">${ic('reset')}إغلاق الفعالية</button></div>`;
    if(confirmMode==='close')h+=`<div class="confirm"><p>بتقفل فعالية «${esc(e.name)}». كل الحالات والتواريخ والتسجيلات تبقى محفوظة — ما ينحذف شيء. الرسائل والدعوات تنفصل عن الفعاليات الجاية.</p>
      <button class="btn danger" id="ev-close-yes">نعم، اقفلها</button><button class="btn" id="ev-cancel">إلغاء</button></div>`;
  }else{
    h=`<div class="ev-main">
        <div class="ev-label">الفعالية الحالية</div>
        <div class="ev-name">ما فيه فعالية حالياً</div>
        <div class="ev-meta">ابدأ فعالية جديدة عشان تبدأون التواصل مع الخريجين من جديد — بيانات الفعاليات السابقة تبقى محفوظة.</div>
      </div>
      <div class="ev-actions"><button class="btn primary" id="ev-start">${ic('play')}فعالية جديدة</button></div>`;
    if(confirmMode==='start')h+=`<div class="confirm neutral"><input id="ev-name" placeholder="اسم الفعالية، مثال: جلسة خريج – الفصل الثاني" value="جلسة خريج">
      <button class="btn primary" id="ev-start-yes">بدء الفعالية</button><button class="btn" id="ev-cancel">إلغاء</button></div>`;
  }
  $('event').innerHTML=h;
  if(confirmMode==='start'){const i=$('ev-name');i&&i.focus();i&&i.select()}
}
$('event').addEventListener('click',e=>{
  const id=e.target.closest('button')?.id;if(!id)return;
  if(id==='ev-close')confirmMode='close';
  else if(id==='ev-start')confirmMode='start';
  else if(id==='ev-cancel'){confirmMode=null;renderEvent();return}
  else if(id==='ev-close-yes'){
    confirmMode=null;Repo.closeEvent();
    toast(`قفلت الفعالية — كل السجلات محفوظة وبتلقاها في الإعدادات`);renderAll();return;
  }else if(id==='ev-start-yes'){
    const name=($('ev-name').value||'').trim()||'فعالية جديدة';
    confirmMode=null;Repo.openEvent(name);
    toast(`بدأت فعالية «${esc(name)}» — كل الخريجين رجعوا «لم يُتواصل بعد» لهذه الفعالية`);
    renderAll();return;
  }
  renderEvent();
});

