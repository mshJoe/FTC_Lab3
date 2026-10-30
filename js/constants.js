/* Demo feature flag — flip to false before embedding this page in the club website.
   Hides the test panel, the "بيانات تجريبية" chip and the demo-note tags. */
const DEMO_MODE = true;

/* ================= Constants ================= */
const STATUS={
  new:{label:'لم يُتواصل بعد'},
  sending:{label:'قيد الإرسال'},
  wait:{label:'بانتظار الرد'},
  yes:{label:'وافق'},
  booked:{label:'تم تحديد موعد'},
  done:{label:'تمت'},
  no:{label:'اعتذر'}
};
const ORDER=['new','sending','wait','yes','booked','done','no'];
const MANUAL_STATUSES=['new','wait','yes','no'];
const MEMBERS=['جود','ريم','عبدالله','رزان','فيصل'];
const CHANNEL_AR={whatsapp:'واتساب',gmail:'Gmail',linkedin:'LinkedIn'};
const TL_KIND={
  invitation_sending:'send',invitation_sent:'check',invitation_cancelled:'x',auto_reverted:'reset',
  reminder_sent:'bell',reply_logged:'check',status_changed:'info',owner_assigned:'user',
  session_scheduled:'cal',session_done:'check',session_cancelled:'x',note_added:'edit',
  imported:'download',migration:'reset',merged:'users',do_not_contact:'lock',restored:'reset',
  purged:'trash',contact:'user',contact_deadline:'clock'
};
const TEMPLATE_META={
  initial:{label:'دعوة أولية',vars:['الاسم','الجهة','المسؤول','النادي','اسم الفعالية','مدة الجلسة']},
  linkedin:{label:'دعوة لينكد إن (قصيرة)',vars:['الاسم','المسؤول','النادي','اسم الفعالية','مدة الجلسة']},
  reminder:{label:'تذكير',vars:['الاسم','المسؤول','النادي','اسم الفعالية']},
  booking:{label:'تأكيد موعد',vars:['الاسم','التاريخ','الوقت','المدة','اسم الفعالية','موضوع الجلسة','المسؤول','مكان/رابط']},
  thanks:{label:'شكر بعد الجلسة',vars:['الاسم','المسؤول','النادي','موضوع الجلسة']}
};
const DEFAULT_SETTINGS={warnFriday:true,hoursWindow:['16:00','22:00'],pendingTimeoutHours:24,reminderMax:2,reminderCooldownDays:3,trashRetentionDays:30,undoDepth:20};
const KEY='ftc-grads-v2', UIKEY='ftc-grads-v2-ui', OLDKEY='ftc-grads-proto-v2', VERKEY='ftc-grads-v2-ver';
/* bump when the seed logic changes so pure-demo browsers reseed on next load */
const SEED_VERSION=3;
const QP=(typeof location!=='undefined')?new URLSearchParams(location.search):{get:()=>null};
const _testParam=QP.get('test');
const IS_TEST=(DEMO_MODE&&_testParam!=='0')||_testParam==='1';
const IS_DEV=QP.get('dev')==='1';
const SCENARIOS_AR={full:'بيانات كاملة (افتراضي)',empty:'قاعدة فارغة',perf:'1000 خريج (اختبار الأداء)'};

/* ================= Template defaults (C2) ================= */
const DEFAULT_TEMPLATE_BODIES={
initial:`السلام عليكم {الاسم}،
معك {المسؤول} من {النادي} في جامعة الملك سعود.

يسعدنا نستضيفك في «{اسم الفعالية}»، وهي جلسة قصيرة تشارك فيها أعضاء النادي تجربتك من أيام الجامعة إلى عملك في {الجهة}. مدتها {مدة الجلسة}.

المطلوب منك بس:
١. تأكيد رغبتك بالمشاركة
٢. موعدين يناسبونك خلال الأسبوعين الجايين
٣. عنوان مبدئي للجلسة

وإذا الوقت ما يناسبك، لا عليك، بس علمنا.
شاكرين لك، وبانتظار ردك.`,
linkedin:`السلام عليكم {الاسم}، معك {المسؤول} من {النادي}. يسعدنا نستضيفك في «{اسم الفعالية}»، جلسة قصيرة تشارك فيها تجربتك من الجامعة للسوق. المطلوب بس تأكيد مشاركتك وموعدين يناسبونك وعنوان مبدئي. شاكرين لك!`,
reminder:`السلام عليكم {الاسم}، معك {المسؤول} من {النادي}. حبّينا نذكّرك بدعوتنا لك للمشاركة في «{اسم الفعالية}». يسعدنا تكون معنا، وإذا الوقت ما يناسبك لا عليك، بس علمنا عشان نرتّب. شاكرين لك.`,
booking:`السلام عليكم {الاسم}،
تم تأكيد موعد جلستك معنا يوم {التاريخ} الساعة {الوقت}، ومدتها {المدة}، ضمن «{اسم الفعالية}».

موضوع الجلسة: {موضوع الجلسة}
المكان/الرابط: {مكان/رابط}

إذا صار أي تغيير نعلمك قبل الموعد، ولو احتجت تغيّر شيء علمنا بدري. ننتظرك!`,
thanks:`السلام عليكم {الاسم}، الله يعطيك العافية على جلستك المميزة في «{موضوع الجلسة}» ووقتك مع أعضاء {النادي}. استفدنا واستفاد الأعضاء كثير من تجربتك، ونتمنى نشوفك معنا مرة ثانية. شاكرين لك من القلب.`
};
function freshTemplates(){
  const t={};
  for(const k of Object.keys(TEMPLATE_META))t[k]={versions:[{body:DEFAULT_TEMPLATE_BODIES[k],editedBy:'FTC',editedAt:nowISO()}]};
  return t;
}

/* ================= demo seed ================= */
/* T2: one readable row per alumnus; status/owner/ago are part of the row, and the
   states/invitations/timeline/sessions are built from the same rows (no field-stripping map). */
function seedScenario(name){
  if(name==='empty')return emptySeed();
  if(name==='perf')return perfSeed();
  return seedData();
}
function emptySeed(){
  const ev={id:'e1',name:'جلسة خريج',startedAt:riyadhToday(),closedAt:null,status:'open'};
  return {members:MEMBERS.map(m=>({id:m,name:m})),events:[ev],grads:[],states:{},invitations:[],timeline:[],
    sessions:[],templates:freshTemplates(),importBatches:[],suppressions:[],settings:{...DEFAULT_SETTINGS}};
}
function seedData(){
  const T=riyadhToday();
  const E=v=>({type:'email',value:v}),L=v=>({type:'linkedin',value:v}),P=v=>({type:'phone',value:v});
  /* one row per alumnus — keep every field; nothing gets stripped before building states */
  const rows=[
    {id:'g1',name:'نورة الشهري',year:2023,major:'هندسة البرمجيات',contacts:[E('nora.alshehri@gmail.com')],company:'سدايا',role:'مهندسة تعلم آلة',status:'booked',ago:1,owner:'جود'},
    {id:'g2',name:'محمد العتيبي',year:2021,major:'علوم الحاسب',contacts:[L('m-alotaibi-dev')],company:'أرامكو السعودية',role:'مطوّر برمجيات',status:'wait',ago:5,owner:'ريم',demoNote:'حالة اختبار: بانتظار رد من 5 أيام — التذكير متاح'},
    {id:'g3',name:'محمد العتيبي',year:2024,major:'هندسة البرمجيات',contacts:[P('0551234870')],company:'stc',role:'محلل بيانات',status:'new',ago:null,owner:null},
    {id:'g4',name:'ريما الدوسري',year:2022,major:'نظم المعلومات',contacts:[E('rema.dossary@gmail.com'),L('rema-aldossary')],company:'علم',role:'مديرة منتج',status:'booked',ago:1,owner:'جود'},
    {id:'g5',name:'عبدالرحمن الغامدي',year:2020,major:'علوم الحاسب',contacts:[L('abdulrahman-ghamdi')],company:'نيوم',role:'مهندس حوسبة سحابية',status:'no',ago:9,owner:'عبدالله',replyNote:'شكر الدعوة واعتذر مباشرة؛ مشغول حالياً ومستعد للمشاركة في الدفعات القادمة إذا دعوناه مجدداً.',demoNote:'حالة اختبار: عطنا رد اعتذار'},
    {id:'g6',name:'سارة القحطاني',year:2025,major:'علوم الحاسب',contacts:[E('sara.qht25@gmail.com')],company:'تمارا',role:'مطوّرة واجهات',status:'wait',ago:1,owner:'رزان'},
    {id:'g7',name:'سارة القحطاني',year:2019,major:'تقنية المعلومات',contacts:[P('0509876612')],company:'الهيئة الوطنية للأمن السيبراني',role:'أخصائية أمن سيبراني',status:'yes',ago:2,owner:'رزان'},
    {id:'g8',name:'فهد الحربي',year:2023,major:'هندسة الحاسب',contacts:[P('0534410098')],company:'لوسِد موتورز',role:'مهندس أنظمة مدمجة',status:'new',ago:null,owner:null},
    {id:'g9',name:'لمى المطيري',year:2024,major:'علوم الحاسب',contacts:[L('lama-almutairi')],company:'ثمانية',role:'مهندسة بيانات',status:'wait',ago:2,owner:'جود',reminders:2,remDays:[3,2],demoNote:'حالة اختبار: وصلنا حد التذكيرين'},
    {id:'g10',name:'خالد الزهراني',year:2021,major:'هندسة البرمجيات',contacts:[E('khalid.zahrani.dev@gmail.com')],company:'جاهز',role:'مطوّر أنظمة خلفية',status:'booked',ago:2,owner:'فيصل'},
    {id:'g11',name:'هيفاء العنزي',year:2022,major:'نظم المعلومات',contacts:[L('haifa-alanazi')],company:'KPMG',role:'مستشارة تحوّل رقمي',status:'no',ago:7,owner:'ريم'},
    {id:'g12',name:'يوسف السبيعي',year:2025,major:'علوم الحاسب',contacts:[P('0567002319')],company:'سطر (شركة ناشئة)',role:'مؤسس مشارك',status:'new',ago:null,owner:null},
    {id:'g13',name:'أمل الشمري',year:2020,major:'تقنية المعلومات',contacts:[E('amal.shammari@gmail.com')],company:'البنك الأهلي السعودي',role:'مهندسة DevOps',status:'new',ago:null,owner:'جود',demoNote:'حالة اختبار: منسّقة لعضو بدون تواصل'},
    {id:'g14',name:'تركي البقمي',year:2023,major:'علوم الحاسب',contacts:[L('turki-albuqami'),P('0543218876')],company:'سدايا',role:'باحث ذكاء اصطناعي',status:'wait',ago:1,owner:'عبدالله',reminders:1,remDays:[1],demoNote:'حالة اختبار: تذكير في فترة التهدئة'},
    {id:'g15',name:'دانة الرشيد',year:2026,major:'هندسة البرمجيات',contacts:[E('dana.alrasheed@gmail.com')],company:'كريم',role:'مطوّرة تطبيقات جوال',status:'new',ago:null,owner:null},
    {id:'g16',name:'بندر القرني',year:2019,major:'هندسة الحاسب',contacts:[P('0558890034')],company:'سابك',role:'مهندس أتمتة',status:'booked',ago:3,owner:'فيصل',demoNote:'حالة اختبار: جلسة فاتت وما تأكدت'},
    {id:'g17',name:'جواهر الأحمدي',year:2024,major:'نظم المعلومات',contacts:[L('jawaher-alahmadi')],company:'روشن',role:'محللة أعمال',status:'new',ago:null,owner:null},
    {id:'g18',name:'سلطان المالكي',year:2022,major:'علوم الحاسب',contacts:[E('sultan.malki@gmail.com')],company:'مايكروسوفت',role:'مهندس برمجيات',status:'no',ago:10,owner:'جود'},
    {id:'g19',name:'رهف الجهني',year:2025,major:'علوم الحاسب',contacts:[P('0591127745')],company:'الهيئة الوطنية للأمن السيبراني',role:'محللة مركز عمليات أمنية',status:'wait',ago:0,owner:'رزان'},
    {id:'g20',name:'ماجد الشهراني',year:2020,major:'هندسة البرمجيات',contacts:[L('majed-alshahrani')],company:'stc pay',role:'قائد فريق هندسي',status:'yes',ago:4,owner:'عبدالله'},
    {id:'g21',name:'شهد العمري',year:2023,major:'تقنية المعلومات',contacts:[E('shahad.alomari@gmail.com')],company:'علم',role:'مصممة تجربة مستخدم',status:'sending',ago:null,owner:null,prevState:'new',sendingHours:2,demoNote:'حالة اختبار: بانتظار تأكيد الإرسال'},
    {id:'g22',name:'نواف الحارثي',year:2021,major:'علوم الحاسب',contacts:[P('0502231190')],company:'Savvy Games',role:'مطوّر ألعاب',status:'new',ago:null,owner:'فيصل'},
    {id:'g23',name:'غادة السهلي',year:2026,major:'علوم الحاسب',contacts:[L('ghada-alsahli')],company:'كاوست',role:'باحثة ماجستير',status:'yes',ago:1,owner:'ريم'},
    {id:'g24',name:'عمر باوزير',year:2022,major:'هندسة الحاسب',contacts:[E('omar.bawazir@gmail.com'),P('0533345521')],company:'كوالكوم',role:'مهندس عتاد',status:'wait',ago:6,owner:'جود'},
    {id:'g25',name:'مشاعل الدوسري',year:2022,major:'هندسة البرمجيات',contacts:[E('mushael.dossary@gmail.com')],company:'مختبرات الاصطناعي',role:'مهندسة ذكاء اصطناعي',status:'done',ago:10,owner:'ريم'},
    {id:'g26',name:'أنس الفيفي',year:2021,major:'هندسة الحاسب',contacts:[P('0504448291')],company:'شركة موج',role:'مهندس شبكات وأمن',status:'done',ago:25,owner:'عبدالله'},
    {id:'g27',name:'وليد الصاعدي',year:2019,major:'علوم الحاسب',contacts:[L('walid-alsaadi')],company:'كلودك',role:'مهندس حوسبة سحابية',status:'new',ago:null,owner:null,dnc:'ما يبي يشارك',demoNote:'حالة اختبار: مضاف لقائمة عدم التواصل'},
    {id:'g28',name:'منار الغامدي',year:2024,major:'نظم المعلومات',contacts:[],company:'',role:'',status:'new',ago:null,owner:null,demoNote:'حالة اختبار: بدون وسيلة تواصل'},
    {id:'g29',name:'حمد السلمي',year:2023,major:'تقنية المعلومات',contacts:[P('0551234')],company:'',role:'',status:'new',ago:null,owner:null,demoNote:'حالة اختبار: رقم غير صالح'},
    {id:'g30',name:'عبدالله الشهري',year:2020,major:'تقنية المعلومات',contacts:[P('0509876612')],company:'الرياض للأمن السيبراني',role:'مهندس أمن',status:'new',ago:null,owner:null,demoNote:'حالة اختبار: رقمه نفس رقم سارة (2019) — جرّب الدمج'},
    {id:'g31',name:'جميل الزامل',year:2019,major:'هندسة البرمجيات',contacts:[E('jamil.zamil@gmail.com')],company:'نسما للتقنية',role:'مطوّر واجهات',status:'new',ago:null,owner:null,demoNote:'حالة اختبار: دُعي في فعالية سابقة'},
    {id:'g32',name:'ريان العسيري',year:2022,major:'علوم الحاسب',contacts:[P('0509998877')],company:'',role:'',status:'new',ago:null,owner:null,trash:2}
  ];
  const CH={phone:'whatsapp',email:'gmail',linkedin:'linkedin'};
  /* first usable contact channel per row (phone→whatsapp, email→gmail, linkedin→linkedin) */
  const firstChan=g=>{const c=(g.contacts||[]).find(c=>CH[c.type]);return c?CH[c.type]:'whatsapp'};
  const mark=nowISO();
  const stamp=day=>day+'T19:00:00.000Z';

  const grads=rows.map(g=>({
    id:g.id,name:g.name,year:g.year,major:g.major,contacts:g.contacts,company:g.company,role:g.role,
    doNotContact:!!g.dnc,dncReason:g.dnc||null,dncBy:g.dnc?'جود':null,dncAt:g.dnc?mark:null,
    demoNote:g.demoNote||null,
    createdFrom:'seed',createdAt:mark,deletedAt:g.trash?stamp(addDays(T,-g.trash)):null,mergedInto:null
  }));
  const g21=rows.find(x=>x.id==='g21');
  if(g21)grads.find(x=>x.id==='g21').lastVerified=riyadhToday();

  /* events: closed previous event (started ~150 days ago, closed ~120) + open current started 5 days ago */
  const e0={id:'e0',name:'جلسة خريج – الفصل السابق',startedAt:addDays(T,-150),closedAt:addDays(T,-120),status:'closed'};
  const e1={id:'e1',name:'جلسة خريج',startedAt:addDays(T,-5),closedAt:null,status:'open'};

  const states={},timeline=[],invitations=[];
  let tlN=0;
  const tl=(day,gradId,eventId,kind,text,refId,actorId)=>{
    timeline.push({id:uid('t')+(tlN++),gradId:eventId?gradId:null,eventId:eventId||null,ts:stamp(day),kind,actorId:actorId||null,text,refId:refId||null});
  };
  /* participant states for the open event */
  rows.forEach(r=>{
    states[r.id+'|'+e1.id]={gradId:r.id,eventId:e1.id,status:r.status,last:r.ago==null?null:addDays(T,-r.ago),owner:r.owner};
  });
  /* previous-event states: g31 invited and never replied — g5 declined back then too */
  states['g31|'+e0.id]={gradId:'g31',eventId:e0.id,status:'wait',last:addDays(T,-124),owner:'رزان'};
  states['g5|'+e0.id]={gradId:'g5',eventId:e0.id,status:'no',last:addDays(T,-130),owner:'عبدالله'};

  /* invitations: confirmed initial for every contacted alumnus + reminders for g9/g14 */
  rows.forEach(r=>{
    const st=states[r.id+'|'+e1.id];
    if(st.status==='sending'){
      /* g21: initial invite created 2 hours ago (real clock), never confirmed, state new before */
      invitations.push({id:uid('i')+'21',gradId:r.id,eventId:e1.id,kind:'initial',channel:CH[(r.contacts[0]||{}).type]||'whatsapp',
        senderId:'جود',createdAt:new Date(Date.now()-2*3600e3).toISOString(),confirmedAt:null,
        status:'sending',prevState:r.prevState||'new'});
      tl(riyadhToday(),r.id,e1.id,'invitation_sending','الدعوة بانتظار تأكيد الإرسال — عبر Gmail',(invitations[invitations.length-1].id),'جود');
      return;
    }
    if(st.status==='new')return;
    /* sent the day before the reply landed; g19 (ago=0) handled right below */
    const sentDay=r.ago==null?1:r.ago+1, replyDay=r.ago==null?1:r.ago;
    const inv={id:uid('i')+'_'+r.id,gradId:r.id,eventId:e1.id,kind:'initial',channel:firstChan(r),
      senderId:st.owner||'جود',createdAt:stamp(addDays(T,-sentDay)),confirmedAt:stamp(addDays(T,-replyDay)),
      status:'confirmed',prevState:'new'};
    /* g19 "sent today": confirmed today */
    if(r.ago===0){inv.createdAt=T+'T09:00:00.000Z';inv.confirmedAt=T+'T09:15:00.000Z'}
    invitations.push(inv);
    if(st.last==null)st.last=dayOfISO(inv.confirmedAt);
    /* timeline: invite up + owner assign + reel reply + session marks */
    tl(dayOfISO(inv.confirmedAt),r.id,e1.id,'invitation_sent',
      `${MEMBERS.includes(st.owner)?st.owner:'جود'} سجّلت إرسال الدعوة الأولية على ${CHANNEL_AR[inv.channel]} — الحالة صارت «بانتظار الرد»`,inv.id,st.owner||'جود');
    if(st.owner)tl(addDays(T,-1),r.id,e1.id,'owner_assigned',`أسندنا (${st.owner}) مسؤول التواصل تلقائياً`,null,st.owner);
    if(r.remDays&&r.remDays.length){
      r.remDays.forEach((d,ri)=>{
        const ri2={id:uid('i')+'_r'+r.id,gradId:r.id,eventId:e1.id,kind:'reminder',channel:inv.channel,senderId:st.owner||'جود',
          createdAt:stamp(addDays(T,-d)),confirmedAt:stamp(addDays(T,-d)),status:'confirmed',prevState:'wait'};
        invitations.push(ri2);st.last=addDays(T,-d);
        tl(addDays(T,-d),r.id,e1.id,'reminder_sent',`${st.owner} سجّلت إرسال التذكير على ${CHANNEL_AR[inv.channel]} (التذكير رقم ${ri+1})`,ri2.id,st.owner);
      });
    }
    if(st.status==='yes')tl(addDays(T,-replyDay),r.id,e1.id,'reply_logged','وصل رد إيجابي: مهتم/ة بالمشاركة وجاهز/ة للتنسيق',null,st.owner);
    if(st.status==='no')tl(addDays(T,-replyDay),r.id,e1.id,'reply_logged',r.replyNote||'وصل رد: اعتذار عن المشاركة هذه المرة',null,st.owner);
    if(st.status==='done')tl(addDays(T,-replyDay),r.id,e1.id,'session_done','اكتملت الجلسة وسجّلناها كمنجزة',null,st.owner);
  });
  /* previous-event invitations */
  invitations.push({id:uid('i')+'0_g31',gradId:'g31',eventId:e0.id,kind:'initial',channel:'gmail',
    senderId:'رزان',createdAt:stamp(addDays(T,-125)),confirmedAt:stamp(addDays(T,-124)),status:'confirmed',prevState:'new'});
  invitations.push({id:uid('i')+'0_g5',gradId:'g5',eventId:e0.id,kind:'initial',channel:'linkedin',
    senderId:'عبدالله',createdAt:stamp(addDays(T,-131)),confirmedAt:stamp(addDays(T,-130)),status:'confirmed',prevState:'new'});
  tl(addDays(T,-124),'g31',e0.id,'invitation_sent','رزان سجّلت إرسال الدعوة الأولية على Gmail',(invitations[invitations.length-2].id),'رزان');
  tl(addDays(T,-130),'g5',e0.id,'invitation_sent','عبدالله سجّل إرسال الدعوة الأولية على LinkedIn',(invitations[invitations.length-1].id),'عبدالله');
  tl(addDays(T,-127),'g5',e0.id,'reply_logged','اعتذر عن المشاركة في الفصل السابق',null,'عبدالله');

  /* sessions: s1..s4 keep their intent; + done sessions for g25/g26; no overlaps */
  const sessions=[
    {id:'s1',gradId:'g1',eventId:e1.id,date:addDays(T,1),start:'19:00',dur:60,topic:'تعلّم الآلة من المختبر إلى الإنتاج',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:null},
    {id:'s2',gradId:'g4',eventId:e1.id,date:addDays(T,4),start:'18:00',dur:45,topic:'كيف تصير مدير منتج بعد التخرج',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:null},
    {id:'s3',gradId:'g10',eventId:e1.id,date:addDays(T,9),start:'20:00',dur:60,topic:'بناء أنظمة تتحمل ملايين الطلبات',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:null},
    {id:'s4',gradId:'g16',eventId:e1.id,date:addDays(T,-3),start:'19:30',dur:60,topic:'الأتمتة الصناعية والبرمجة',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:null},
    {id:'s5',gradId:'g25',eventId:e1.id,date:addDays(T,-10),start:'19:00',dur:60,topic:'من البيانات إلى القرار: أدوات العمل اليومية',
      slidesUrl:'https://example.com/g25-slides',recordingUrl:'https://example.com/g25-recording',
      notes:'عطتنا أمثلة عملية من أدوات العمل اليومية في تحليل البيانات، والأعضاء تشاركوا بأسئلة كثيرة.',doneAt:addDays(T,-10),deletedAt:null},
    {id:'s6',gradId:'g26',eventId:e1.id,date:addDays(T,-25),start:'20:00',dur:90,topic:'شبكات المؤسسات والأمن',
      slidesUrl:'https://example.com/g26-slides',recordingUrl:'https://example.com/g26-recording',
      notes:'شرح واضح لأساسيات الشبكات والأمن، مع خطوات عملية نطبقها في مختبرات النادي.',doneAt:addDays(T,-25),deletedAt:null},
    /* g32's soft-deleted session (trash demo) */
    {id:'s7',gradId:'g32',eventId:e1.id,date:addDays(T,-1),start:'17:00',dur:30,topic:'',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:stamp(addDays(T,-2))}
  ];
  /* timeline session_scheduled entries */
  sessions.forEach(s=>{if(!s.deletedAt)tl(dayOfISO(s.doneAt||s.date),s.gradId,s.eventId,'session_scheduled',
    `جلسة «${s.topic||'بدون عنوان'}» يوم ${s.date} — ${s.start}`,s.id,states[s.gradId+'|'+e1.id]?states[s.gradId+'|'+e1.id].owner:null)});

  /* suppression record for g27 — hash keys (SHA-256 when the platform has WebCrypto, else fnv) */
  const sup=[];
  const g27=rows.find(x=>x.id==='g27');
  sup.push({id:uid('sc'),ts:mark,reason:g27.dnc,keys:[],gradId:'g27'});
  const supDeferred=async ()=>{
    const rec=sup[0];
    for(const c of g27.contacts)rec.keys.push({type:c.type,hash:await hashKey(c.type,c.value)});
  };
  return {seedComplete:supDeferred,members:MEMBERS.map(m=>({id:m,name:m})),events:[e0,e1],grads,states,invitations,timeline,
    sessions,templates:freshTemplates(),importBatches:[],suppressions:sup,settings:{...DEFAULT_SETTINGS}};
}

/* perf scenario: deterministic 1,000-alumnus dataset for render-responsiveness checks */
function perfSeed(){
  const T=riyadhToday();
  const ev={id:'e1',name:'جلسة خريج',startedAt:addDays(T,-5),closedAt:null,status:'open'};
  const FN=['نورة','محمد','ريما','عبدالرحمن','سارة','فهد','لمى','خالد','هيفاء','يوسف','أمل','تركي','دانة','بندر','جواهر','سلطان','رهف','ماجد','شهد','نواف','غادة','عمر','مشاعل','أنس','وليد','منار','حمد','عبدالله','جميل','ريان','شايع','بدر','مطير','حسن','سعد','صالح','طلال','رائد','حنين','جود'];
  const LN=['الشهري','العتيبي','الدوسري','الغامدي','القحطاني','الحربي','المطيري','الزهراني','العنزي','السبيعي','الشمري','البقمي','الرشيد','القرني','الأحمدي','المالكي','الجهني','الشهراني','العمري','الحارثي','السهلي','باوزير','الفيفي','الصاعدي','السلمي','العسيري','الزمان','العمودي','الجبس','المرزوقي'];
  const CO=['أرامكو السعودية','stc','علم','تمارا','سدايا','جاهز','KPMG','سابك','مايكروسوفت','كوالكوم','نيوم','ثمانية','روشن','كريم','Savvy Games','كاوست','stc pay','الهيئة الوطنية للأمن السيبراني'];
  const MJ=['علوم الحاسب','هندسة البرمجيات','نظم المعلومات','هندسة الحاسب','تقنية المعلومات'];
  const dist=[['new',400],['wait',220],['yes',140],['booked',90],['no',100],['done',45],['sending',5]];
  const grads=[],states={},invitations=[],timeline=[];
  const CH={phone:'whatsapp',email:'gmail',linkedin:'linkedin'};
  let n=0;
  for(const [stst,cnt] of dist){
    for(let i=0;i<cnt;i++){
      n++;
      const id='p'+n;
      const name=(FN[n%FN.length]+' '+LN[(n*7+n/40|0)%LN.length])+(n>40?` ${n}`:'');
      const ct=[['phone',String(5300000000+n)],['email','user'+n+'@example.com'],['linkedin','perf-'+n]][n%3];
      const contacts=[{type:ct[0],value:ct[1]}];
      if(n%4===0)contacts.push({type:'email',value:'user'+n+'@gmail.com'});
      grads.push({id,name,year:2024-(n%6),major:MJ[n%MJ.length],contacts,company:CO[n%CO.length],
        role:(n%2?'مطوّر':'مطوّرة')+' برمجيات',
        doNotContact:false,dncReason:null,dncBy:null,dncAt:null,demoNote:null,
        createdFrom:'seed',createdAt:nowISO(),deletedAt:null,mergedInto:null});
      const ago=(stst==='new'||stst==='sending')?null:(1+(n%9));
      states[id+'|'+ev.id]={gradId:id,eventId:ev.id,status:stst,last:ago==null?null:addDays(T,-ago),owner:MEMBERS[n%MEMBERS.length]};
      if(ago!=null){
        const inv={id:uid('i')+'_'+id,gradId:id,eventId:ev.id,kind:'initial',channel:CH[ct[0]]||'whatsapp',
          senderId:MEMBERS[n%MEMBERS.length],createdAt:stamp(addDays(T,-ago)),confirmedAt:stamp(addDays(T,-ago)),status:'confirmed',prevState:'new'};
        invitations.push(inv);
        timeline.push({id:uid('t')+'_'+id,gradId:id,eventId:ev.id,ts:inv.confirmedAt,kind:'invitation_sent',actorId:inv.senderId,
          text:'سجّلت إرسال الدعوة الأولية',refId:inv.id});
      }
      if(stst==='sending'){
        invitations.push({id:uid('i')+'_'+id+'s',gradId:id,eventId:ev.id,kind:'initial',channel:'gmail',senderId:'جود',
          createdAt:new Date(Date.now()-3600e3).toISOString(),confirmedAt:null,status:'sending',prevState:'new'});
        states[id+'|'+ev.id].status='sending';states[id+'|'+ev.id].owner=null;states[id+'|'+ev.id].last=null;
      }
    }
  }
  function stamp(day){return day+'T19:00:00.000Z'}
  return {members:MEMBERS.map(m=>({id:m,name:m})),events:[ev],grads,states,invitations,timeline,
    sessions:[],templates:freshTemplates(),importBatches:[],suppressions:[],settings:{...DEFAULT_SETTINGS}};
}

/* ================= legacy migration (non-destructive) ================= */
function migrateLegacy(S){
  const T=riyadhToday();
  const ev={id:'e1',name:(S.event&&S.event.name)||'جلسة خريج',startedAt:(S.event&&S.event.started)||T,closedAt:null,status:'open'};
  const grads=(S.grads||[]).map(g=>({
    id:g.id,name:g.name,year:+g.year||2024,major:g.major||'',company:g.company||'',role:g.role||'',
    contacts:(g.contacts||[]).map(c=>{const cl=cleanContact(c.type,c.value);return cl&&cl.ok?{type:c.type,value:cl.value}:{type:c.type,value:c.value}}),
    doNotContact:false,createdFrom:'seed',createdAt:nowISO(),deletedAt:null,mergedInto:null}));
  const states={};const timeline=[];
  grads.forEach(g=>{
    const st={gradId:g.id,eventId:ev.id,status:STATUS[g.status]?g.status:'new',last:g.last||null,owner:g.owner||null};
    states[g.id+'|'+ev.id]=st;
    if(st.status!=='new'||st.last)timeline.push({id:uid('t'),gradId:g.id,eventId:ev.id,ts:nowISO(),kind:'migration',actorId:'جود',text:'تم نقل الحالة من النموذج السابق',refId:null});
  });
  const sessions=(S.sessions||[]).map(s=>({id:s.id,gradId:s.gradId,eventId:ev.id,date:s.date,start:s.start,dur:s.dur||60,topic:s.topic||'',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:null}));
  return {members:MEMBERS.map(m=>({id:m,name:m})),events:[ev],grads,states,invitations:[],timeline,sessions,
    templates:freshTemplates(),importBatches:[],suppressions:[],settings:{...DEFAULT_SETTINGS}};
}
